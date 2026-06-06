const { Router } = require('express');
const { login, me, loginValidation } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate with email + password. Returns JWT token and user info.
 * Rate limited: 10 intentos por IP por minuto (mitiga fuerza bruta).
 */
router.post('/login', loginLimiter, loginValidation, login);

/**
 * GET /api/auth/me
 * Returns the current authenticated user's payload.
 * Requires: Bearer token
 */
router.get('/me', requireAuth, me);

module.exports = router;
