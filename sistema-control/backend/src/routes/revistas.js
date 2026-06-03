'use strict';

const path = require('path');
const fs = require('fs');

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getRevistasPublicas,
  getRevistaPublica,
  descargarRevista,
  getCategorias,
  getRevistasAdmin,
  createRevista,
  updateRevista,
  deleteRevista,
  toggleEstado,
  toggleDestacada,
  getEstadisticas,
} = require('../controllers/revistaController');

const router = express.Router();

// ─── Upload directories ───────────────────────────────────────────────────────

const UPLOAD_BASE = process.env.UPLOAD_DIR || path.resolve(__dirname, '..', 'uploads');
const PORTADAS_DIR = path.join(UPLOAD_BASE, 'revistas', 'portadas');
const PDFS_DIR = path.join(UPLOAD_BASE, 'revistas', 'pdfs');

// Ensure directories exist at startup
[PORTADAS_DIR, PDFS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ─── Multer storage engines ───────────────────────────────────────────────────

function makeStorage(dest) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

const portadaStorage = makeStorage(PORTADAS_DIR);
const pdfStorage = makeStorage(PDFS_DIR);

// multer.fields requires a single storage; we use a combined diskStorage that
// routes to the correct directory based on the field name.
const combinedStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === 'portada') {
      cb(null, PORTADAS_DIR);
    } else if (file.fieldname === 'pdf') {
      cb(null, PDFS_DIR);
    } else {
      cb(new Error(`Campo de archivo no reconocido: ${file.fieldname}`));
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.fieldname === 'portada') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('La portada debe ser una imagen'), false);
    }
  } else if (file.fieldname === 'pdf') {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('El archivo debe ser un PDF'), false);
    }
  } else {
    cb(new Error(`Campo de archivo no reconocido: ${file.fieldname}`), false);
  }
};

const upload = multer({
  storage: combinedStorage,
  fileFilter,
  limits: {
    // multer.fields applies limits per-field via the field config; we set
    // a generous overall file size and rely on field-level maxCount.
    // Per-field size limits are enforced below via custom middleware.
    fileSize: 50 * 1024 * 1024, // 50 MB (max for PDF)
  },
});

// ─── parseRevistaFiles middleware ─────────────────────────────────────────────
// Runs multer.fields then populates req.uploadedFiles with URL paths for any
// files that were actually uploaded. Fields not uploaded are omitted so that
// update handlers can preserve existing values.

const parseRevistaFiles = [
  (req, res, next) => {
    const uploadFields = upload.fields([
      { name: 'portada', maxCount: 1 },
      { name: 'pdf', maxCount: 1 },
    ]);

    uploadFields(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ error: `Error de archivo: ${err.message}` });
        }
        return res.status(400).json({ error: err.message || 'Error al subir archivos' });
      }
      next();
    });
  },
  (req, _res, next) => {
    req.uploadedFiles = {};

    if (req.files) {
      if (req.files.portada && req.files.portada[0]) {
        const file = req.files.portada[0];
        // Enforce 5 MB limit for portada
        if (file.size > 5 * 1024 * 1024) {
          // Delete the uploaded file and reject
          try { fs.unlinkSync(file.path); } catch (_) {}
          return _res.status(400).json({ error: 'La portada no debe superar 5 MB' });
        }
        // Build URL relative to /uploads
        const relative = path.relative(UPLOAD_BASE, file.path).replace(/\\/g, '/');
        req.uploadedFiles.portada_url = `/uploads/${relative}`;
      }

      if (req.files.pdf && req.files.pdf[0]) {
        const file = req.files.pdf[0];
        // 50 MB already enforced by multer limits; just build URL
        const relative = path.relative(UPLOAD_BASE, file.path).replace(/\\/g, '/');
        req.uploadedFiles.pdf_url = `/uploads/${relative}`;
      }
    }

    next();
  },
];

// ─── PUBLIC routes ────────────────────────────────────────────────────────────

// NOTE: Static-looking routes (/categorias, /admin/*) must be registered
// BEFORE the parameterized /:id route to avoid being swallowed by it.

router.get('/categorias', getCategorias);

// ─── ADMIN routes ─────────────────────────────────────────────────────────────

router.get('/admin/estadisticas', requireAuth, requireAdmin, getEstadisticas);
router.get('/admin/todas', requireAuth, requireAdmin, getRevistasAdmin);
router.post('/admin', requireAuth, requireAdmin, parseRevistaFiles, createRevista);
router.put('/admin/:id', requireAuth, requireAdmin, parseRevistaFiles, updateRevista);
router.delete('/admin/:id', requireAuth, requireAdmin, deleteRevista);
router.patch('/admin/:id/estado', requireAuth, requireAdmin, toggleEstado);
router.patch('/admin/:id/destacada', requireAuth, requireAdmin, toggleDestacada);

// ─── PUBLIC parameterized routes (must come after static paths) ───────────────

router.get('/', getRevistasPublicas);
router.get('/:id/descargar', descargarRevista);
router.get('/:id', getRevistaPublica);

module.exports = router;
