'use strict';

const { query } = require('../config/db');

/**
 * Registra un evento de seguridad server-side (login, logout, denegación
 * de permiso, etc.). Es la fuente de verdad de auditoría: a diferencia del
 * log del frontend, no puede ser desactivado ni falsificado por el cliente.
 * Nunca debe interrumpir el flujo principal si la escritura falla.
 */
async function recordAuditLog(req, action, { userId = null, email = null, role = null, detail = '' } = {}) {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
    const userAgent = (req.headers['user-agent'] || '').slice(0, 512);

    await query(
      `INSERT INTO audit_logs (action, user_id, email, role, ip, user_agent, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [action, userId, email, role, ip, userAgent, String(detail).slice(0, 500)]
    );
  } catch (err) {
    console.error('[auditLog] No se pudo registrar el evento:', err.message);
  }
}

module.exports = { recordAuditLog };
