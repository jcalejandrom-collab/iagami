const { Pool } = require('pg');
require('dotenv').config();

/* `rejectUnauthorized: false` aceptaría cualquier certificado TLS del
   servidor PostgreSQL —incluido el de un atacante en posición MITM—
   anulando la protección que SSL debería ofrecer. Se exige verificación
   real por defecto; solo puede desactivarse explícitamente vía
   DB_SSL_REJECT_UNAUTHORIZED=false para entornos de desarrollo con
   certificados autofirmados conocidos. */
const sslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: sslRejectUnauthorized } : false,
});

pool.on('connect', () => {
  console.log('[DB] Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
  process.exit(-1);
});

/**
 * Execute a parameterized query against the pool.
 * @param {string} text - SQL query string
 * @param {Array} [params] - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Verify the database connection on startup.
 */
const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    console.log(`[DB] Connection verified at ${result.rows[0].now}`);
  } catch (err) {
    console.error('[DB] Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }
};

module.exports = { pool, query, testConnection };
