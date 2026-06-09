const { Router } = require('express');
const path = require('path');
const multer = require('multer');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { submissionLimiter, evidenceLimiter } = require('../middleware/rateLimit');
const { isValidFileSignature } = require('../utils/fileSignature');
const {
  createReporteDiario,
  createPlanificacion,
  getSubmissions,
  getSubmission,
  updateStatus,
  uploadEvidences,
  getStats,
  reporteDiarioValidation,
  planificacionValidation,
  updateStatusValidation,
} = require('../controllers/submissionController');

const router = Router();

// ─── Multer configuration ─────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5) * 1024 * 1024;

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `Tipo de archivo no permitido: ${file.mimetype}. Solo se aceptan imágenes y PDF.`
      ),
      false
    );
  }
};

// memoryStorage: los archivos viven en Buffer en RAM, sin escritura a disco.
// Compatible con Vercel serverless y con PC fija.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});

// Multer error handler wrapper
const handleUpload = (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'Archivo demasiado grande',
          message: `El tamaño máximo permitido es ${process.env.MAX_FILE_SIZE_MB || 5} MB.`,
        });
      }
      return res.status(400).json({
        error: 'Error al subir archivo',
        message: err.message,
      });
    }
    if (err) {
      return res.status(400).json({
        error: 'Error al subir archivo',
        message: err.message,
      });
    }
    next();
  });
};

/* Verificación post-upload por magic-bytes: el `mimetype` que llega en
   `req.files` es el que el navegador/cliente DECLARÓ, no lo que el
   archivo realmente contiene. Sin esto, basta con renombrar/etiquetar
   un .html o .svg con script embebido como "image/png" para que pase
   el filtro y quede servido públicamente desde /uploads. Se lee la
   cabecera binaria real de cada archivo guardado y, si no coincide con
   la firma esperada para su mimetype declarado, se borra y se rechaza
   toda la solicitud. */
// Con memoryStorage los bytes están en file.buffer — sin lectura de disco.
const verifyFileSignatures = (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  for (const file of req.files) {
    const header = file.buffer.slice(0, 12);
    if (!isValidFileSignature(header, file.mimetype)) {
      return res.status(400).json({
        error: 'Archivo inválido',
        message: `El contenido de "${file.originalname}" no coincide con el tipo de archivo declarado.`,
      });
    }
  }

  next();
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// Public routes — no authentication required

/**
 * POST /api/submissions/reporte-diario
 * Submit a daily activity report.
 * Rate limited: 5 envíos por IP cada 5 minutos.
 */
router.post('/reporte-diario', submissionLimiter, reporteDiarioValidation, createReporteDiario);

/**
 * POST /api/submissions/planificacion-semanal
 * Submit a weekly planning form.
 * Rate limited: 5 envíos por IP cada 5 minutos.
 */
router.post('/planificacion-semanal', submissionLimiter, planificacionValidation, createPlanificacion);

/**
 * POST /api/submissions/:id/evidences
 * Upload evidence files for an existing submission.
 * Accepts: images (jpeg, png, gif, webp) and PDF. Max 5 MB per file, up to 10 files.
 * Rate limited: submissionLimiter (5/5min) + evidenceLimiter (10/1h).
 * Doble capa: submissionLimiter bloquea ráfagas cortas, evidenceLimiter
 * bloquea agotamiento de disco sostenido. Magic-bytes valida el contenido
 * binario real (no el MIME declarado por el cliente, trivialmente falsificable).
 */
router.post('/:id/evidences', submissionLimiter, evidenceLimiter, handleUpload, verifyFileSignatures, uploadEvidences);

// Admin-protected routes

/**
 * GET /api/submissions/stats
 * Dashboard statistics (must be before /:id to avoid conflict).
 */
router.get('/stats', requireAuth, requireAdmin, getStats);

/**
 * GET /api/submissions
 * List all submissions with optional filters and pagination.
 */
router.get('/', requireAuth, requireAdmin, getSubmissions);

/**
 * GET /api/submissions/:id
 * Get a single submission with all its activities and evidences.
 */
router.get('/:id', requireAuth, requireAdmin, getSubmission);

/**
 * PATCH /api/submissions/:id/status
 * Update the review status of a submission.
 */
router.patch('/:id/status', requireAuth, requireAdmin, updateStatusValidation, updateStatus);

module.exports = router;
