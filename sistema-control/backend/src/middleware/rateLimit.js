'use strict';

const rateLimit = require('express-rate-limit');

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
});

module.exports = { loginLimiter, submissionLimiter };
