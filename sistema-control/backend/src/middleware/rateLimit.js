'use strict';

const rateLimit = require('express-rate-limit');
const { recordAuditLog } = require('../utils/auditLog');

/* Límite de intentos de login: 10 por IP por minuto.
   Mitiga fuerza bruta de credenciales sin bloquear el uso normal. */
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos',
    message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en un minuto.',
  },
  handler: async (req, res, next, options) => {
    await recordAuditLog(req, 'rate_limit_hit', {
      detail: `login rate limit exceeded from ${req.ip}`,
      severity: 'CRITICAL',
    });
    res.status(options.statusCode).json(options.message);
  },
});

/* Límite de envíos públicos (denuncias / reportes / formularios): 5 por IP
   cada 5 minutos. Evita saturar la base de datos y el almacenamiento de
   evidencias mediante envíos automatizados masivos. */
const submissionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Ha alcanzado el límite de envíos. Intente nuevamente en unos minutos.',
  },
  handler: async (req, res, next, options) => {
    await recordAuditLog(req, 'rate_limit_hit', {
      detail: `submission rate limit exceeded from ${req.ip}`,
      severity: 'CRITICAL',
    });
    res.status(options.statusCode).json(options.message);
  },
});

/* Límite de subida de evidencias: 10 archivos por IP por hora.
   Ventana amplia (1h) con techo bajo para bloquear DoS por agotamiento
   de disco sin impactar el uso legítimo de un ciudadano que sube
   múltiples evidencias para una sola denuncia. */
const evidenceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Límite de subida excedido',
    message: 'Ha alcanzado el límite de subida de archivos. Intente nuevamente en una hora.',
  },
  handler: async (req, res, next, options) => {
    await recordAuditLog(req, 'rate_limit_hit', {
      detail: `evidence upload rate limit exceeded from ${req.ip}`,
      severity: 'CRITICAL',
    });
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = { loginLimiter, submissionLimiter, evidenceLimiter };
