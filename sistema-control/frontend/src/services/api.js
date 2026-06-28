/* ============================================================
   IAGAMI · API Service
   ============================================================ */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Build headers. Includes Authorization if a token is stored.
 */
function getHeaders() {
  const token = sessionStorage.getItem('iagami_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Core fetch wrapper.
 * Returns { data, error } — never throws.
 */
async function request(method, path, body = undefined) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: getHeaders(),
  };

  if (body !== undefined && body !== null) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    let data = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const message =
        (data && (data.message || data.error || data.detail)) ||
        `Error ${response.status}: ${response.statusText}`;
      return { data: null, error: message, status: response.status };
    }

    return { data, error: null, status: response.status };
  } catch (err) {
    const message =
      err.message === 'Failed to fetch'
        ? 'No se pudo conectar con el servidor. Verifique su conexión.'
        : err.message || 'Error de red inesperado.';
    return { data: null, error: message, status: 0 };
  }
}

/**
 * Build query string from params object, filtering out empty values.
 */
function buildQuery(params) {
  if (!params) return '';
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return q ? '?' + q : '';
}

/* ---- Auth ---- */
export const auth = {
  /**
   * POST /auth/login
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{data, error}>}
   */
  login(email, password) {
    return request('POST', '/auth/login', { email, password });
  },

  /**
   * GET /auth/me — fetch current user profile
   */
  me() {
    return request('GET', '/auth/me');
  },
};

/* ---- Submissions ---- */
export const submissions = {
  /**
   * POST /submissions/reporte-diario
   */
  createReporte(data) {
    return request('POST', '/submissions/reporte-diario', data);
  },

  /**
   * POST /submissions/planificacion-semanal
   */
  createPlanificacion(data) {
    return request('POST', '/submissions/planificacion-semanal', data);
  },

  /**
   * POST /submissions/:id/evidences
   * Sends FormData (multipart) — does NOT use JSON headers.
   */
  async uploadEvidences(submissionId, formData) {
    const token = sessionStorage.getItem('iagami_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // NOTE: Do NOT set Content-Type — browser sets it with boundary automatically.

    try {
      const response = await fetch(
        `${BASE_URL}/submissions/${submissionId}/evidences`,
        { method: 'POST', headers, body: formData }
      );

      let data = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const message =
          (data && (data.message || data.error)) ||
          `Error ${response.status}: ${response.statusText}`;
        return { data: null, error: message, status: response.status };
      }

      return { data, error: null, status: response.status };
    } catch (err) {
      return { data: null, error: err.message || 'Error al subir archivos.', status: 0 };
    }
  },

  /**
   * GET /submissions
   * @param {Object} filters - { page, limit, responsable, fecha_inicio, fecha_fin, estado, form_type }
   */
  getAll(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value);
      }
    });
    const qs = params.toString();
    return request('GET', `/submissions${qs ? `?${qs}` : ''}`);
  },

  /**
   * GET /submissions/:id
   */
  getOne(id) {
    return request('GET', `/submissions/${id}`);
  },

  /**
   * PATCH /submissions/:id/status
   * @param {string|number} id
   * @param {string} estado
   * @param {string} notas
   */
  updateStatus(id, estado, notas = '') {
    return request('PATCH', `/submissions/${id}/status`, { estado, notas_admin: notas });
  },

  /**
   * GET /submissions/stats
   */
  getStats() {
    return request('GET', '/submissions/stats');
  },
};

/* ── REVISTAS (public) ── */
export const revistas = {
  /** GET /revistas?... — list published magazines */
  getAll: (params) => request('GET', '/revistas' + buildQuery(params)),

  /** GET /revistas/:id — get single magazine (increments view count) */
  getOne: (id) => request('GET', `/revistas/${id}`),

  /** GET /revistas/:id/descargar — get download URL (increments download count) */
  descargar: (id) => request('GET', `/revistas/${id}/descargar`),

  /** GET /revistas/categorias — list available categories */
  getCategorias: () => request('GET', '/revistas/categorias'),

  // ── Admin ──

  /** GET /revistas/admin/todas?... — list all magazines (admin) */
  getAllAdmin: (params) => request('GET', '/revistas/admin/todas' + buildQuery(params)),

  /** GET /revistas/admin/estadisticas — aggregate stats */
  getEstadisticas: () => request('GET', '/revistas/admin/estadisticas'),

  /** POST /revistas/admin — create magazine with multipart FormData */
  create: (formData) => {
    const token = sessionStorage.getItem('iagami_token');
    return fetch(`${BASE_URL}/revistas/admin`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData, // FormData for multipart
    }).then(async (r) => {
      const contentType = r.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await r.json() : await r.text();
      if (!r.ok) {
        const message = (data && (data.message || data.error)) || `Error ${r.status}`;
        return { data: null, error: message, status: r.status };
      }
      return { data, error: null, status: r.status };
    }).catch(() => ({ data: null, error: 'Error de conexión. Intenta de nuevo.', status: 0 }));
  },

  /** PUT /revistas/admin/:id — update magazine with multipart FormData */
  update: (id, formData) => {
    const token = sessionStorage.getItem('iagami_token');
    return fetch(`${BASE_URL}/revistas/admin/${id}`, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async (r) => {
      const contentType = r.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await r.json() : await r.text();
      if (!r.ok) {
        const message = (data && (data.message || data.error)) || `Error ${r.status}`;
        return { data: null, error: message, status: r.status };
      }
      return { data, error: null, status: r.status };
    }).catch(() => ({ data: null, error: 'Error de conexión. Intenta de nuevo.', status: 0 }));
  },

  /** DELETE /revistas/admin/:id */
  delete: (id) => request('DELETE', `/revistas/admin/${id}`),

  /** PATCH /revistas/admin/:id/estado — toggle publicada/borrador */
  toggleEstado: (id) => request('PATCH', `/revistas/admin/${id}/estado`),

  /** PATCH /revistas/admin/:id/destacada — toggle destacada flag */
  toggleDestacada: (id) => request('PATCH', `/revistas/admin/${id}/destacada`),
};

/* Default export for convenience */
export default { auth, submissions, revistas };
