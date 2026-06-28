const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
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

// ─── Upload directory ─────────────────────────────────────────────────────────

const UPLOAD_BASE = process.env.UPLOAD_DIR || path.resolve(__dirname, '..', 'uploads');
const EVIDENCES_DIR = path.join(UPLOAD_BASE, 'evidences');
if (!fs.existsSync(EVIDENCES_DIR)) {
  fs.mkdirSync(EVIDENCES_DIR, { recursive: true });
}

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

// diskStorage: cada archivo se escribe en EVIDENCES_DIR con nombre UUID.
// file.filename y file.path quedan disponibles para el controller y para
// la verificación por magic-bytes.
const evidenceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, EVIDENCES_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage: evidenceStorage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 10 },
  fileFilter,
});

// Multer error handler wrapper
const handleUpload = (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Clean up any files already written to disk before responding
      if (req.files) req.files.forEach((f) => { try { fs.unlinkSync(f.path); } catch (_) {} });
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
      if (req.files) req.files.forEach((f) => { try { fs.unlinkSync(f.path); } catch (_) {} });
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
   el filtro y quede servido públicamente desde /uploads. Se leen los
   primeros 12 bytes del archivo ya guardado en disco y, si no coinciden
   con la firma esperada para su mimetype declarado, se eliminan todos
   los archivos del request y se rechaza la solicitud completa. */
const verifyFileSignatures = (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  const unlinkAll = () => {
    req.files.forEach((f) => { try { fs.unlinkSync(f.path); } catch (_) {} });
  };

  for (const file of req.files) {
    const buf = Buffer.alloc(12);
    const fd = fs.openSync(file.path, 'r');
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    if (!isValidFileSignature(buf, file.mimetype)) {
      unlinkAll();
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
