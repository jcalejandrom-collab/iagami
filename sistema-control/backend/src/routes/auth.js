const { Router } = require('express');
const { login, me, loginValidation } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate with email + password. Returns JWT token and user info.
 */
router.post('/login', loginValidation, login);

/**
 * GET /api/auth/me
 * Returns the current authenticated user's payload.
 * Requires: Bearer token
 */
router.get('/me', requireAuth, me);

module.exports = router;
