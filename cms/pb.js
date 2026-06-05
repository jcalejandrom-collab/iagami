'use strict';

const CMSDB = (function () {
  const PB_URL = 'http://127.0.0.1:8090';

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
        const res = await fetch(
          `${PB_URL}/api/collections/${coleccion}/records?page=${page}&perPage=${perPage}&sort=-created`
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
      const res = await fetch(
        `${PB_URL}/api/collections/${coleccion}/records/${id}`,
        { method: 'DELETE' }
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
      const res = await fetch(
        `${PB_URL}/api/collections/${coleccion}/records/${id}`
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

  /* ─── HELPERS (compatibilidad con código que los usa) ─── */
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  function now() { return new Date().toISOString(); }

  /* ─── AUDITORÍA ─── */
  async function logAudit(accion, modulo, detalle = '', nivel = 'info') {
    try {
      const token = typeof getToken === 'function' ? getToken() : null;
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

  return { getAll, save, deleteRecord, remove, getOne, clearCache, ping, uid, now, logAudit };
})();
