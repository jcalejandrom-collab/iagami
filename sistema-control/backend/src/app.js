'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { testConnection } = require('./config/db');
const authRouter = require('./routes/auth');
const submissionsRouter = require('./routes/submissions');
const revistasRouter = require('./routes/revistas');

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();

// Trust the first proxy hop so req.ip reflects the real client IP behind
// a reverse-proxy / load-balancer (required for rate-limit accuracy).
app.set('trust proxy', 1);

// ─── CORS ─────────────────────────────────────────────────────────────────────

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, mobile apps, same-origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: Origin '${origin}' not allowed.`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ─── Security headers ─────────────────────────────────────────────────────────
// Estas cabeceras solo protegen lo que sirve ESTE backend (API + /uploads);
// el frontend estático en GitHub Pages no puede recibir cabeceras HTTP
// personalizadas y necesitaría su propia infraestructura (proxy/CDN) para
// CSP/HSTS reales.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'"
  );
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
});

// ─── Body parsers ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static files (uploads) ───────────────────────────────────────────────────

const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'src/uploads');
app.use('/uploads', express.static(uploadDir));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/revistas', revistasRouter);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'IAGAMI Forms Backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: 'El endpoint solicitado no existe.',
  });
});

// ─── Global error handler ─────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[App] Unhandled error:', err);

  // CORS errors
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({
      error: 'CORS',
      message: err.message,
    });
  }

  // JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'JSON inválido',
      message: 'El cuerpo de la solicitud no es JSON válido.',
    });
  }

  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    error: 'Error interno del servidor',
    message:
      process.env.NODE_ENV === 'production'
        ? 'Ocurrió un error inesperado. Por favor, intente más tarde.'
        : err.message || 'Error desconocido.',
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT, 10) || 4000;

const start = async () => {
  // Verify database connection before accepting traffic
  await testConnection();

  app.listen(PORT, () => {
    console.log(`[App] IAGAMI Forms Backend running on port ${PORT}`);
    console.log(`[App] Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`[App] Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log(`[App] Upload dir  : ${uploadDir}`);
  });
};

start().catch((err) => {
  console.error('[App] Failed to start server:', err.message);
  process.exit(1);
});

module.exports = app;
