'use strict';

const path = require('path');
const fs = require('fs');

const db = require('../config/db');
const { recordAuditLog } = require('../utils/auditLog');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Delete a file from disk if it exists. Expects a URL path like
 * /uploads/revistas/portadas/filename.jpg — strips the leading /uploads/
 * and resolves against UPLOAD_DIR.
 */
function deleteFile(fileUrl) {
  if (!fileUrl) return;
  try {
    const UPLOAD_BASE = process.env.UPLOAD_DIR || path.resolve(__dirname, '..', 'uploads');
    const relative = fileUrl.replace(/^\/uploads\//, '');
    const safePath = path.normalize(path.join(UPLOAD_BASE, relative));
    if (!safePath.startsWith(path.normalize(UPLOAD_BASE) + path.sep) &&
        safePath !== path.normalize(UPLOAD_BASE)) return;
    if (fs.existsSync(safePath)) {
      fs.unlinkSync(safePath);
    }
  } catch (err) {
    console.error('[revistaController] deleteFile error:', err.message);
  }
}

// ─── PUBLIC ───────────────────────────────────────────────────────────────────

/**
 * GET /api/revistas
 * Returns publicadas revistas. Query: q, categoria, anio, numero_edicion.
 */
async function getRevistasPublicas(req, res) {
  try {
    const { q, categoria, anio, numero_edicion } = req.query;

    const params = [];
    const conditions = ["r.estado = 'publicada'"];

    if (q) {
      params.push(`%${q}%`);
      const qIdx = params.length;
      conditions.push(`(r.titulo ILIKE $${qIdx} OR r.descripcion ILIKE $${qIdx})`);
    }

    if (categoria) {
      params.push(categoria);
      conditions.push(`r.categoria = $${params.length}`);
    }

    if (anio) {
      params.push(parseInt(anio, 10));
      conditions.push(`EXTRACT(YEAR FROM r.fecha_publicacion) = $${params.length}`);
    }

    if (numero_edicion) {
      params.push(numero_edicion);
      conditions.push(`r.numero_edicion = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        id, titulo, descripcion, numero_edicion, categoria,
        fecha_publicacion, portada_url, pdf_url,
        visualizaciones, descargas, destacada, estado,
        created_at, updated_at
      FROM revistas r
      ${where}
      ORDER BY r.destacada DESC, r.fecha_publicacion DESC
    `;

    const { rows } = await db.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('[revistaController] getRevistasPublicas:', err);
    return res.status(500).json({ error: 'Error al obtener revistas' });
  }
}

/**
 * GET /api/revistas/:id
 * Returns a single publicada revista and increments visualizaciones.
 */
async function getRevistaPublica(req, res) {
  try {
    const { id } = req.params;

    const check = await db.query(
      "SELECT id FROM revistas WHERE id = $1 AND estado = 'publicada'",
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Revista no encontrada' });
    }

    const { rows } = await db.query(
      `UPDATE revistas
       SET visualizaciones = visualizaciones + 1
       WHERE id = $1
       RETURNING
         id, titulo, descripcion, numero_edicion, categoria,
         fecha_publicacion, portada_url, pdf_url,
         visualizaciones, descargas, destacada, estado,
         created_at, updated_at`,
      [id]
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error('[revistaController] getRevistaPublica:', err);
    return res.status(500).json({ error: 'Error al obtener la revista' });
  }
}

/**
 * GET /api/revistas/:id/descargar
 * Increments descargas and returns {pdf_url, filename, titulo}.
 */
async function descargarRevista(req, res) {
  try {
    const { id } = req.params;

    const check = await db.query(
      "SELECT id FROM revistas WHERE id = $1 AND estado = 'publicada'",
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Revista no encontrada' });
    }

    const { rows } = await db.query(
      `UPDATE revistas
       SET descargas = descargas + 1
       WHERE id = $1
       RETURNING id, titulo, pdf_url`,
      [id]
    );

    const revista = rows[0];

    if (!revista.pdf_url) {
      return res.status(400).json({ error: 'Esta revista no tiene PDF disponible' });
    }

    // Build a safe filename from the title
    const filename = `${revista.titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;

    return res.json({
      pdf_url: revista.pdf_url,
      filename,
      titulo: revista.titulo,
    });
  } catch (err) {
    console.error('[revistaController] descargarRevista:', err);
    return res.status(500).json({ error: 'Error al procesar la descarga' });
  }
}

/**
 * GET /api/revistas/categorias
 * Returns distinct categorias from publicadas revistas.
 */
async function getCategorias(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT DISTINCT categoria
       FROM revistas
       WHERE estado = 'publicada' AND categoria IS NOT NULL
       ORDER BY categoria ASC`
    );
    return res.json(rows.map((r) => r.categoria));
  } catch (err) {
    console.error('[revistaController] getCategorias:', err);
    return res.status(500).json({ error: 'Error al obtener categorías' });
  }
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────

/**
 * GET /api/revistas/admin/todas
 * Returns ALL revistas. Query: estado, categoria, q.
 */
async function getRevistasAdmin(req, res) {
  try {
    const { estado, categoria, q } = req.query;

    const params = [];
    const conditions = [];

    if (estado) {
      params.push(estado);
      conditions.push(`r.estado = $${params.length}`);
    }

    if (categoria) {
      params.push(categoria);
      conditions.push(`r.categoria = $${params.length}`);
    }

    if (q) {
      params.push(`%${q}%`);
      const qIdx = params.length;
      conditions.push(`(r.titulo ILIKE $${qIdx} OR r.descripcion ILIKE $${qIdx})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        r.id, r.titulo, r.descripcion, r.numero_edicion, r.categoria,
        r.fecha_publicacion, r.portada_url, r.pdf_url,
        r.visualizaciones, r.descargas, r.destacada, r.estado,
        r.created_by, r.created_at, r.updated_at
      FROM revistas r
      ${where}
      ORDER BY r.created_at DESC
    `;

    const { rows } = await db.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('[revistaController] getRevistasAdmin:', err);
    return res.status(500).json({ error: 'Error al obtener revistas' });
  }
}

/**
 * POST /api/revistas/admin
 * Creates a new revista.
 */
async function createRevista(req, res) {
  try {
    const {
      titulo,
      descripcion,
      numero_edicion,
      categoria,
      fecha_publicacion,
      destacada,
      estado,
    } = req.body;

    if (!titulo || !numero_edicion || !fecha_publicacion) {
      return res.status(400).json({
        error: 'Campos requeridos: titulo, numero_edicion, fecha_publicacion',
      });
    }

    const uploadedFiles = req.uploadedFiles || {};
    const portada_url = uploadedFiles.portada_url || null;
    const pdf_url = uploadedFiles.pdf_url || null;

    const { rows } = await db.query(
      `INSERT INTO revistas
         (titulo, descripcion, numero_edicion, categoria, fecha_publicacion,
          portada_url, pdf_url, destacada, estado, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        titulo,
        descripcion || null,
        numero_edicion,
        categoria || 'General',
        fecha_publicacion,
        portada_url,
        pdf_url,
        destacada === true || destacada === 'true' ? true : false,
        estado || 'borrador',
        req.user.id,
      ]
    );

    await recordAuditLog(req, 'revista_created', {
      userId: req.user.id, email: req.user.email, role: req.user.role,
      detail: `id=${rows[0].id} titulo="${titulo}"`,
    });

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[revistaController] createRevista:', err);
    return res.status(500).json({ error: 'Error al crear la revista' });
  }
}

/**
 * PUT /api/revistas/admin/:id
 * Updates an existing revista.
 */
async function updateRevista(req, res) {
  try {
    const { id } = req.params;

    const existing = await db.query('SELECT * FROM revistas WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Revista no encontrada' });
    }

    const current = existing.rows[0];

    const {
      titulo,
      descripcion,
      numero_edicion,
      categoria,
      fecha_publicacion,
      destacada,
      estado,
    } = req.body;

    const uploadedFiles = req.uploadedFiles || {};

    const portada_url =
      uploadedFiles.portada_url !== undefined
        ? uploadedFiles.portada_url
        : current.portada_url;

    const pdf_url =
      uploadedFiles.pdf_url !== undefined
        ? uploadedFiles.pdf_url
        : current.pdf_url;

    const { rows } = await db.query(
      `UPDATE revistas SET
         titulo            = COALESCE($1, titulo),
         descripcion       = COALESCE($2, descripcion),
         numero_edicion    = COALESCE($3, numero_edicion),
         categoria         = COALESCE($4, categoria),
         fecha_publicacion = COALESCE($5, fecha_publicacion),
         destacada         = COALESCE($6, destacada),
         estado            = COALESCE($7, estado),
         portada_url       = $8,
         pdf_url           = $9
       WHERE id = $10
       RETURNING *`,
      [
        titulo || null,
        descripcion !== undefined ? descripcion : null,
        numero_edicion || null,
        categoria || null,
        fecha_publicacion || null,
        destacada !== undefined
          ? destacada === true || destacada === 'true'
            ? true
            : false
          : null,
        estado || null,
        portada_url,
        pdf_url,
        id,
      ]
    );

    // Delete old files only after DB update succeeds to avoid orphaning data
    if (uploadedFiles.portada_url !== undefined && current.portada_url) {
      deleteFile(current.portada_url);
    }
    if (uploadedFiles.pdf_url !== undefined && current.pdf_url) {
      deleteFile(current.pdf_url);
    }

    await recordAuditLog(req, 'revista_updated', {
      userId: req.user.id, email: req.user.email, role: req.user.role,
      detail: `id=${id} titulo="${rows[0].titulo}"`,
    });

    return res.json(rows[0]);
  } catch (err) {
    console.error('[revistaController] updateRevista:', err);
    return res.status(500).json({ error: 'Error al actualizar la revista' });
  }
}

/**
 * DELETE /api/revistas/admin/:id
 * Deletes revista and its physical files.
 */
async function deleteRevista(req, res) {
  try {
    const { id } = req.params;

    const existing = await db.query('SELECT * FROM revistas WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Revista no encontrada' });
    }

    const revista = existing.rows[0];

    await db.query('DELETE FROM revistas WHERE id = $1', [id]);

    // Delete physical files only after DB row is gone to avoid data/file mismatch on DB error
    deleteFile(revista.portada_url);
    deleteFile(revista.pdf_url);

    await recordAuditLog(req, 'revista_deleted', {
      userId: req.user.id, email: req.user.email, role: req.user.role,
      detail: `id=${id} titulo="${revista.titulo}"`, severity: 'CRITICAL',
    });

    return res.json({ message: 'Revista eliminada' });
  } catch (err) {
    console.error('[revistaController] deleteRevista:', err);
    return res.status(500).json({ error: 'Error al eliminar la revista' });
  }
}

/**
 * PATCH /api/revistas/admin/:id/estado
 * Toggles estado between 'borrador' and 'publicada'.
 */
async function toggleEstado(req, res) {
  try {
    const { id } = req.params;

    const existing = await db.query(
      'SELECT id, estado FROM revistas WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Revista no encontrada' });
    }

    const current = existing.rows[0];
    const nuevoEstado = current.estado === 'publicada' ? 'borrador' : 'publicada';

    const { rows } = await db.query(
      'UPDATE revistas SET estado = $1 WHERE id = $2 RETURNING *',
      [nuevoEstado, id]
    );

    await recordAuditLog(req, 'revista_estado_changed', {
      userId: req.user.id, email: req.user.email, role: req.user.role,
      detail: `id=${id} estado=${current.estado}→${nuevoEstado}`,
    });

    return res.json(rows[0]);
  } catch (err) {
    console.error('[revistaController] toggleEstado:', err);
    return res.status(500).json({ error: 'Error al cambiar el estado' });
  }
}

/**
 * PATCH /api/revistas/admin/:id/destacada
 * Toggles destacada boolean.
 */
async function toggleDestacada(req, res) {
  try {
    const { id } = req.params;

    const existing = await db.query(
      'SELECT id, destacada FROM revistas WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Revista no encontrada' });
    }

    const current = existing.rows[0];

    const { rows } = await db.query(
      'UPDATE revistas SET destacada = $1 WHERE id = $2 RETURNING *',
      [!current.destacada, id]
    );

    await recordAuditLog(req, 'revista_destacada_changed', {
      userId: req.user.id, email: req.user.email, role: req.user.role,
      detail: `id=${id} destacada=${current.destacada}→${!current.destacada}`,
    });

    return res.json(rows[0]);
  } catch (err) {
    console.error('[revistaController] toggleDestacada:', err);
    return res.status(500).json({ error: 'Error al cambiar destacada' });
  }
}

/**
 * GET /api/revistas/admin/estadisticas
 * Returns aggregate stats.
 */
async function getEstadisticas(req, res) {
  try {
    const totalesQuery = db.query(`
      SELECT
        COUNT(*)                                      AS total,
        COUNT(*) FILTER (WHERE estado = 'publicada') AS publicadas,
        COUNT(*) FILTER (WHERE estado = 'borrador')  AS borradores,
        COALESCE(SUM(visualizaciones), 0)             AS "totalVisualizaciones",
        COALESCE(SUM(descargas), 0)                   AS "totalDescargas"
      FROM revistas
    `);

    const topQuery = db.query(`
      SELECT id, titulo, visualizaciones, descargas, estado, fecha_publicacion
      FROM revistas
      ORDER BY visualizaciones DESC
      LIMIT 5
    `);

    const [totalesResult, topResult] = await Promise.all([totalesQuery, topQuery]);

    const t = totalesResult.rows[0];

    return res.json({
      total: parseInt(t.total, 10),
      publicadas: parseInt(t.publicadas, 10),
      borradores: parseInt(t.borradores, 10),
      totalVisualizaciones: parseInt(t.totalVisualizaciones, 10),
      totalDescargas: parseInt(t.totalDescargas, 10),
      topRevistas: topResult.rows,
    });
  } catch (err) {
    console.error('[revistaController] getEstadisticas:', err);
    return res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // Public
  getRevistasPublicas,
  getRevistaPublica,
  descargarRevista,
  getCategorias,
  // Admin
  getRevistasAdmin,
  createRevista,
  updateRevista,
  deleteRevista,
  toggleEstado,
  toggleDestacada,
  getEstadisticas,
};
