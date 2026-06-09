const { body, param, validationResult } = require('express-validator');
const { pool, query } = require('../config/db');
const { recordAuditLog } = require('../utils/auditLog');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Datos inválidos', details: errors.array() });
    return true;
  }
  return false;
};

/**
 * Insert an array of activity objects linked to a submission.
 * @param {string} submissionId
 * @param {Array<{descripcion, dia?, hora?, completada?, orden?}>} activities
 * @param {object} client - pg pool or client with .query()
 */
const insertActivities = async (submissionId, activities, client) => {
  if (!Array.isArray(activities) || activities.length === 0) return;

  const insertPromises = activities.map((act, index) =>
    client.query(
      `INSERT INTO activities (submission_id, descripcion, dia, hora, completada, orden)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        submissionId,
        act.descripcion || '',
        act.dia || null,
        act.hora || null,
        act.completada === true || act.completada === 'true' ? true : false,
        act.orden !== undefined ? Number(act.orden) : index,
      ]
    )
  );

  await Promise.all(insertPromises);
};

// ─── Validation rules ─────────────────────────────────────────────────────────

const reporteDiarioValidation = [
  body('responsable').trim().notEmpty().withMessage('El campo responsable es requerido.'),
  body('fecha').notEmpty().withMessage('El campo fecha es requerido.').isDate().withMessage('La fecha no tiene un formato válido (YYYY-MM-DD).'),
  body('institucion').trim().notEmpty().withMessage('El campo institución es requerido.'),
  body('actividades').optional().isArray().withMessage('Las actividades deben ser un arreglo.'),
  body('actividades.*.descripcion').if(body('actividades').exists()).notEmpty().withMessage('Cada actividad debe tener descripción.'),
];

const planificacionValidation = [
  body('responsable').trim().notEmpty().withMessage('El campo responsable es requerido.'),
  body('semana').trim().notEmpty().withMessage('El campo semana es requerido.'),
  body('institucion').trim().notEmpty().withMessage('El campo institución es requerido.'),
  body('actividades').optional().isArray().withMessage('Las actividades deben ser un arreglo.'),
  body('actividades.*.descripcion').if(body('actividades').exists()).notEmpty().withMessage('Cada actividad debe tener descripción.'),
];

const updateStatusValidation = [
  param('id').isUUID().withMessage('El ID de la entrega no es válido.'),
  body('estado')
    .notEmpty().withMessage('El campo estado es requerido.')
    .isIn(['enviado', 'revisado', 'aprobado', 'rechazado'])
    .withMessage('Estado no válido. Debe ser: enviado, revisado, aprobado o rechazado.'),
  body('notas_admin').optional().isString(),
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/submissions/reporte-diario  (public)
 */
const createReporteDiario = async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  const {
    responsable,
    fecha,
    institucion,
    hora_inicio,
    hora_fin,
    observaciones,
    actividades,
    form_id,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO form_submissions
         (form_id, form_type, institucion, responsable, fecha, hora_inicio, hora_fin, observaciones)
       VALUES ($1, 'reporte_diario', $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        form_id || null,
        institucion,
        responsable,
        fecha,
        hora_inicio || null,
        hora_fin || null,
        observaciones || null,
      ]
    );

    const submissionId = result.rows[0].id;

    if (actividades && actividades.length > 0) {
      await insertActivities(submissionId, actividades, client);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      id: submissionId,
      message: 'Reporte diario enviado exitosamente.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[submissionController.createReporteDiario]', err);
    return res.status(500).json({
      error: 'Error interno',
      message: 'No se pudo guardar el reporte diario.',
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/submissions/planificacion-semanal  (public)
 */
const createPlanificacion = async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  const {
    responsable,
    semana,
    institucion,
    observaciones,
    actividades,
    form_id,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO form_submissions
         (form_id, form_type, institucion, responsable, semana, observaciones)
       VALUES ($1, 'planificacion_semanal', $2, $3, $4, $5)
       RETURNING id`,
      [
        form_id || null,
        institucion,
        responsable,
        semana,
        observaciones || null,
      ]
    );

    const submissionId = result.rows[0].id;

    if (actividades && actividades.length > 0) {
      await insertActivities(submissionId, actividades, client);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      id: submissionId,
      message: 'Planificación semanal enviada exitosamente.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[submissionController.createPlanificacion]', err);
    return res.status(500).json({
      error: 'Error interno',
      message: 'No se pudo guardar la planificación semanal.',
    });
  } finally {
    client.release();
  }
};

/**
 * GET /api/submissions  (admin)
 * Supports filters: form_type, estado, responsable, fecha_inicio, fecha_fin
 * Supports pagination: page (default 1), limit (default 20)
 */
const getSubmissions = async (req, res) => {
  const {
    form_type,
    estado,
    responsable,
    fecha_inicio,
    fecha_fin,
    page = 1,
    limit = 20,
  } = req.query;

  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (form_type) {
    conditions.push(`s.form_type = $${paramIndex++}`);
    params.push(form_type);
  }
  if (estado) {
    conditions.push(`s.estado = $${paramIndex++}`);
    params.push(estado);
  }
  if (responsable) {
    conditions.push(`s.responsable ILIKE $${paramIndex++}`);
    params.push(`%${responsable}%`);
  }
  if (fecha_inicio) {
    conditions.push(`s.submitted_at >= $${paramIndex++}`);
    params.push(fecha_inicio);
  }
  if (fecha_fin) {
    conditions.push(`s.submitted_at <= $${paramIndex++}`);
    params.push(`${fecha_fin} 23:59:59`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  try {
    // Total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) AS total FROM form_submissions s ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Main query with activity count
    const dataParams = [...params, limitNum, offset];
    const dataResult = await query(
      `SELECT
         s.id,
         s.form_type,
         s.institucion,
         s.responsable,
         s.fecha,
         s.semana,
         s.hora_inicio,
         s.hora_fin,
         s.observaciones,
         s.estado,
         s.notas_admin,
         s.submitted_at,
         s.reviewed_at,
         s.reviewed_by,
         u.name AS reviewed_by_name,
         COUNT(a.id)::int AS actividades_count
       FROM form_submissions s
       LEFT JOIN users u ON u.id = s.reviewed_by
       LEFT JOIN activities a ON a.submission_id = s.id
       ${whereClause}
       GROUP BY s.id, u.name
       ORDER BY s.submitted_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      dataParams
    );

    return res.status(200).json({
      data: dataResult.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[submissionController.getSubmissions]', err);
    return res.status(500).json({
      error: 'Error interno',
      message: 'No se pudieron obtener las entregas.',
    });
  }
};

/**
 * GET /api/submissions/:id  (admin)
 * Returns the full submission with all activities and evidences.
 */
const getSubmission = async (req, res) => {
  const { id } = req.params;

  try {
    const submissionResult = await query(
      `SELECT
         s.*,
         u.name AS reviewed_by_name
       FROM form_submissions s
       LEFT JOIN users u ON u.id = s.reviewed_by
       WHERE s.id = $1`,
      [id]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'No se encontró la entrega solicitada.',
      });
    }

    const submission = submissionResult.rows[0];

    // Fetch activities
    const activitiesResult = await query(
      `SELECT id, descripcion, dia, hora, completada, orden
       FROM activities
       WHERE submission_id = $1
       ORDER BY orden ASC, id ASC`,
      [id]
    );

    // Fetch evidences
    const evidencesResult = await query(
      `SELECT id, filename, original_name, mimetype, size_bytes, uploaded_at
       FROM evidences
       WHERE submission_id = $1
       ORDER BY uploaded_at ASC`,
      [id]
    );

    return res.status(200).json({
      ...submission,
      actividades: activitiesResult.rows,
      evidencias: evidencesResult.rows,
    });
  } catch (err) {
    console.error('[submissionController.getSubmission]', err);
    return res.status(500).json({
      error: 'Error interno',
      message: 'No se pudo obtener la entrega.',
    });
  }
};

/**
 * PATCH /api/submissions/:id/status  (admin)
 * Update estado, notas_admin, reviewed_at, reviewed_by.
 */
const updateStatus = async (req, res) => {
  if (handleValidationErrors(req, res)) return;

  const { id } = req.params;
  const { estado, notas_admin } = req.body;
  const reviewedBy = req.user.id;

  try {
    const result = await query(
      `UPDATE form_submissions
       SET estado       = $1,
           notas_admin  = $2,
           reviewed_at  = NOW(),
           reviewed_by  = $3
       WHERE id = $4
       RETURNING id, estado, notas_admin, reviewed_at, reviewed_by`,
      [estado, notas_admin || null, reviewedBy, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'No se encontró la entrega solicitada.',
      });
    }

    await recordAuditLog(req, 'submission_status_changed', {
      userId: req.user.id, email: req.user.email, role: req.user.role,
      detail: `id=${id} estado→${estado}`,
      severity: estado === 'rechazado' ? 'WARNING' : 'INFO',
    });

    return res.status(200).json({
      message: 'Estado actualizado correctamente.',
      submission: result.rows[0],
    });
  } catch (err) {
    console.error('[submissionController.updateStatus]', err);
    return res.status(500).json({
      error: 'Error interno',
      message: 'No se pudo actualizar el estado.',
    });
  }
};

/**
 * POST /api/submissions/:id/evidences  (public, multer already applied in route)
 * Save uploaded file metadata into the evidences table.
 */
const uploadEvidences = async (req, res) => {
  const { id } = req.params;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      error: 'Sin archivos',
      message: 'No se recibió ningún archivo.',
    });
  }

  try {
    // Verify submission exists
    const check = await query('SELECT id FROM form_submissions WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'La entrega asociada no existe.',
      });
    }

    const inserted = [];

    for (const file of req.files) {
      const result = await query(
        `INSERT INTO evidences (submission_id, filename, original_name, mimetype, size_bytes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, filename, original_name, mimetype, size_bytes, uploaded_at`,
        [id, file.filename, file.originalname, file.mimetype, file.size]
      );
      inserted.push(result.rows[0]);
    }

    return res.status(201).json({
      message: `${inserted.length} archivo(s) subido(s) exitosamente.`,
      files: inserted,
    });
  } catch (err) {
    console.error('[submissionController.uploadEvidences]', err);
    return res.status(500).json({
      error: 'Error interno',
      message: 'No se pudieron guardar los archivos.',
    });
  }
};

/**
 * GET /api/submissions/stats  (admin)
 * Returns counts by estado, by form_type, and submissions in last 7 days.
 */
const getStats = async (req, res) => {
  try {
    const [byEstado, byType, last7Days, total] = await Promise.all([
      query(
        `SELECT estado, COUNT(*)::int AS count
         FROM form_submissions
         GROUP BY estado
         ORDER BY estado`
      ),
      query(
        `SELECT form_type, COUNT(*)::int AS count
         FROM form_submissions
         GROUP BY form_type
         ORDER BY form_type`
      ),
      query(
        `SELECT DATE(submitted_at) AS fecha, COUNT(*)::int AS count
         FROM form_submissions
         WHERE submitted_at >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(submitted_at)
         ORDER BY fecha ASC`
      ),
      query('SELECT COUNT(*)::int AS count FROM form_submissions'),
    ]);

    return res.status(200).json({
      total: total.rows[0].count,
      por_estado: byEstado.rows,
      por_tipo: byType.rows,
      ultimos_7_dias: last7Days.rows,
    });
  } catch (err) {
    console.error('[submissionController.getStats]', err);
    return res.status(500).json({
      error: 'Error interno',
      message: 'No se pudieron obtener las estadísticas.',
    });
  }
};

module.exports = {
  createReporteDiario,
  createPlanificacion,
  getSubmissions,
  getSubmission,
  updateStatus,
  uploadEvidences,
  getStats,
  // Validation middleware arrays
  reporteDiarioValidation,
  planificacionValidation,
  updateStatusValidation,
};
