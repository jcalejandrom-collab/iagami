const jwt = require('jsonwebtoken');
const { recordAuditLog } = require('../utils/auditLog');

/**
 * requireAuth
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches the decoded payload to req.user.
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'No autorizado',
      message: 'Se requiere un token de autenticación válido.',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'No autorizado',
      message: 'Token no proporcionado.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        message: 'La sesión ha expirado. Por favor, inicie sesión nuevamente.',
      });
    }
    return res.status(401).json({
      error: 'Token inválido',
      message: 'El token de autenticación no es válido.',
    });
  }
};

/**
 * requireAdmin
 * Must be used after requireAuth.
 * Checks that req.user.role === 'admin'.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    recordAuditLog(req, 'permission_denied', {
      userId: req.user?.id ?? null,
      email: req.user?.email ?? null,
      role: req.user?.role ?? null,
      detail: `${req.method} ${req.originalUrl}`,
    });
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'Se requieren permisos de administrador para realizar esta acción.',
    });
  }
  next();
};

module.exports = { requireAuth, requireAdmin };
