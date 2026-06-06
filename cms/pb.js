'use strict';

const CMSDB = (function () {
  /* La URL de PocketBase se inyecta desde el HTML mediante
     window.__IAGAMI_CONFIG__ (ver ejemplo abajo) para permitir distintos
     valores por entorno (local / staging / producción) sin tocar este
     archivo ni hardcodear endpoints en el bundle público:

       <script>window.__IAGAMI_CONFIG__ = { PB_URL: 'https://pb.iagami.gob.ve' };</script>
       <script src="cms/pb.js"></script>

     El valor por defecto solo aplica para desarrollo local. */
  const PB_URL = (typeof window !== 'undefined' && window.__IAGAMI_CONFIG__ && window.__IAGAMI_CONFIG__.PB_URL)
    || 'http://127.0.0.1:8090';

  /* ─── CACHÉ EN MEMORIA ─── */
  const _cache = {};

  function clearCache(coleccion) {
    if (coleccion) {
      delete _cache[coleccion];
    } else {
      Object.keys(_cache).forEach(k => delete _cache[k]);
    }
  }

  /* ─── GET ALL (con paginación automática) ─── */
  async function getAll(coleccion) {
    if (_cache[coleccion]) return _cache[coleccion];

    try {
      let page = 1;
      const perPage = 200;
      let allItems = [];
      let totalPages = 1;

      do {
        const token = getToken();
        const headers = {};
        if (token) headers['Authorization'] = token;

        const res = await fetch(
          `${PB_URL}/api/collections/${coleccion}/records?page=${page}&perPage=${perPage}&sort=-created`,
          { headers }
        );

        if (res.status === 404) {
          console.warn(`[SIGAP] Colección "${coleccion}" no existe en PocketBase`);
          return [];
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        allItems = allItems.concat(data.items || []);
        totalPages = data.totalPages || 1;
        page++;
      } while (page <= totalPages);

      _cache[coleccion] = allItems;
      return allItems;

    } catch (err) {
      console.error(`[SIGAP] getAll("${coleccion}") falló:`, err.message);
      return [];
    }
  }

  /* ─── GET FILTERED (consulta server-side, sin descargar la colección completa) ─── */
  async function getFiltered(coleccion, filtro, opciones = {}) {
    try {
      const token = getToken();
      const headers = {};
      if (token) headers['Authorization'] = token;

      const perPage = opciones.perPage || 50;
      const page = opciones.page || 1;
      const sort = opciones.sort || '-created';

      const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
        sort
      });
      if (filtro) params.set('filter', filtro);

      // Parámetros adicionales que algunas API Rules necesitan referenciar
      // explícitamente (ej. ?token=... evaluado vía @request.query.token en
      // la regla, para validar consultas públicas por token sin exponer
      // listados — ver listRule de `multas`/`denuncias`).
      if (opciones.params) {
        Object.entries(opciones.params).forEach(([k, v]) => params.set(k, v));
      }

      const res = await fetch(
        `${PB_URL}/api/collections/${coleccion}/records?${params.toString()}`,
        { headers }
      );

      if (res.status === 404) {
        console.warn(`[SIGAP] Colección "${coleccion}" no existe en PocketBase`);
        return [];
      }
      if (res.status === 401 || res.status === 403) {
        // No se interpola el filtro: puede contener tokens (TUC), números
        // de caso u otros valores ingresados por el usuario que no deben
        // quedar visibles en la consola del navegador.
        console.warn(`[SIGAP] Acceso denegado a "${coleccion}" (consulta rechazada por API Rules)`);
        return [];
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      return data.items || [];

    } catch (err) {
      console.error(`[SIGAP] getFiltered("${coleccion}") falló:`, err.message);
      return [];
    }
  }

  /* ─── SAVE (POST / PATCH — JSON o multipart) ─── */
  async function save(coleccion, item) {
    try {
      const isUpdate = !!item.id;
      const endpoint = isUpdate
        ? `${PB_URL}/api/collections/${coleccion}/records/${item.id}`
        : `${PB_URL}/api/collections/${coleccion}/records`;

      /* Detectar si hay archivos File/Blob en el item */
      const tieneArchivos = Object.values(item).some(
        v => v instanceof File || v instanceof Blob ||
          (Array.isArray(v) && v.some(f => f instanceof File || f instanceof Blob))
      );

      let body, headers = {};
      const token = getToken();
      if (token) headers['Authorization'] = token;

      if (tieneArchivos) {
        const fd = new FormData();
        Object.entries(item).forEach(([key, val]) => {
          if (Array.isArray(val)) {
            val.forEach(v => fd.append(key, v));
          } else if (val !== undefined && val !== null) {
            fd.append(key, val instanceof File || val instanceof Blob
              ? val
              : typeof val === 'object' ? JSON.stringify(val) : String(val)
            );
          }
        });
        body = fd;
      } else {
        const payload = { ...item };
        ['historial', 'adjuntos', 'requisitos', 'pasos', 'hitos',
          'contenido_bloques'].forEach(k => {
          if (payload[k] && typeof payload[k] !== 'string') {
            payload[k] = JSON.stringify(payload[k]);
          }
        });
        body = JSON.stringify(payload);
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(endpoint, {
        method: isUpdate ? 'PATCH' : 'POST',
        headers,
        body
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          `HTTP ${res.status}: ${errData.message || JSON.stringify(errData.data || {})}`
        );
      }

      clearCache(coleccion);
      return await res.json();

    } catch (err) {
      console.error(`[SIGAP] save("${coleccion}") falló:`, err.message);
      throw err;
    }
  }

  /* ─── DELETE ─── */
  async function deleteRecord(coleccion, id) {
    try {
      const token = getToken();
      const headers = {};
      if (token) headers['Authorization'] = token;
      const res = await fetch(
        `${PB_URL}/api/collections/${coleccion}/records/${id}`,
        { method: 'DELETE', headers }
      );
      if (!res.ok && res.status !== 204)
        throw new Error(`HTTP ${res.status}`);
      clearCache(coleccion);
      return true;
    } catch (err) {
      console.error(`[SIGAP] deleteRecord("${coleccion}", "${id}") falló:`, err.message);
      throw err;
    }
  }

  /* Alias para compatibilidad con código existente que usa CMSDB.remove() */
  async function remove(coleccion, id) {
    return deleteRecord(coleccion, id);
  }

  /* ─── GET ONE ─── */
  async function getOne(coleccion, id) {
    try {
      const token = getToken();
      const headers = {};
      if (token) headers['Authorization'] = token;
      const res = await fetch(
        `${PB_URL}/api/collections/${coleccion}/records/${id}`,
        { headers }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`[SIGAP] getOne("${coleccion}", "${id}") falló:`, err.message);
      return null;
    }
  }

  /* ─── HEALTH CHECK ─── */
  async function ping() {
    try {
      const res = await fetch(`${PB_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  /* ─── AUTH ───
     Se autentica contra la colección `admins` (auth collection dedicada
     para el panel institucional), NO contra `_superusers`. Un token de
     _superusers ignora TODAS las API Rules del resto de colecciones, así
     que usarlo desde el frontend público convierte cualquier fuga de ese
     token en acceso administrativo total a la base de datos completa.
     `admins` es una colección de autenticación normal: sus tokens solo
     dan los permisos que las API Rules de cada colección le concedan
     explícitamente a `@request.auth.collectionName = "admins"` (o por
     campo `role`), permitiendo RBAC mínimo sin exponer el superusuario. */
  async function login(email, password) {
    try {
      const res = await fetch(`${PB_URL}/api/collections/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      sessionStorage.setItem('pb_token', data.token);
      sessionStorage.setItem('pb_user', JSON.stringify(data.record || {}));
      return data;
    } catch (err) {
      console.error('[SIGAP] login falló:', err.message);
      throw err;
    }
  }

  function logout() {
    sessionStorage.removeItem('pb_token');
    sessionStorage.removeItem('pb_user');
  }

  function getToken() {
    return sessionStorage.getItem('pb_token');
  }

  function isAuthenticated() {
    return !!sessionStorage.getItem('pb_token');
  }

  function getCurrentUser() {
    try {
      return JSON.parse(sessionStorage.getItem('pb_user') || 'null');
    } catch {
      return null;
    }
  }

  /* RBAC mínimo: la colección `admins` debe tener un campo `role`
     (ej. "superadmin", "editor", "soporte"). Las vistas del panel
     consultan hasRole() para mostrar/ocultar acciones; la autorización
     real sigue residiendo en las API Rules de PocketBase. */
  function hasRole(...roles) {
    const user = getCurrentUser();
    return !!user && roles.includes(user.role);
  }

  async function verifyToken() {
    const token = getToken();
    if (!token) return false;
    try {
      const res = await fetch(`${PB_URL}/api/collections/admins/auth-refresh`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
      if (!res.ok) {
        logout();
        return false;
      }
      const data = await res.json();
      sessionStorage.setItem('pb_token', data.token);
      return true;
    } catch {
      logout();
      return false;
    }
  }

  /* ─── HELPERS (compatibilidad con código que los usa) ─── */
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  function now() { return new Date().toISOString(); }

  /* ─── AUDITORÍA ─── */
  async function logAudit(accion, modulo, detalle = '', nivel = 'info') {
    try {
      const token = getToken();
      const user = sessionStorage.getItem('pb_user');
      const userData = user ? JSON.parse(user) : {};
      await fetch(`${PB_URL}/api/collections/iagami_sys_logs/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': token } : {})
        },
        body: JSON.stringify({
          accion,
          modulo,
          detalle: String(detalle).slice(0, 500),
          usuario: userData.email || 'anonimo',
          nivel,
          ip: '',
          fecha: new Date().toISOString()
        })
      });
    } catch {
      // El log nunca debe romper el flujo principal
    }
  }

  return { getAll, getFiltered, save, deleteRecord, remove, getOne, clearCache, ping, uid, now, login, logout, getToken, isAuthenticated, getCurrentUser, hasRole, verifyToken, logAudit };
})();
