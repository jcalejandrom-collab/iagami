const jwt = require('jsonwebtoken');
const { recordAuditLog } = require('../utils/auditLog');

/**
 * requireAuth
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches the decoded payload to req.user.
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  // Strict format check: must be exactly "Bearer <token>" with a single space
  if (!authHeader || !/^Bearer [^\s]+$/.test(authHeader)) {
    return res.status(401).json({
      error: 'No autorizado',
      message: 'Se requiere un token de autenticación válido.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    await recordAuditLog(req, 'auth_failed', {
      detail: `${err.name}: ${err.message}`,
      severity: 'WARNING',
    });
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      error: isExpired ? 'Token expirado' : 'Token inválido',
      message: isExpired
        ? 'La sesión ha expirado. Por favor, inicie sesión nuevamente.'
        : 'El token de autenticación no es válido.',
    });
  }
};

/**
 * requireAdmin
 * Must be used after requireAuth.
 * Checks that req.user.role === 'admin'.
 */
const requireAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    await recordAuditLog(req, 'permission_denied', {
      userId: req.user?.id ?? null,
      email: req.user?.email ?? null,
      role: req.user?.role ?? null,
      detail: `${req.method} ${req.originalUrl}`,
      severity: 'CRITICAL',
    });
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'Se requieren permisos de administrador para realizar esta acción.',
    });
  }
  return next();
};

module.exports = { requireAuth, requireAdmin };
