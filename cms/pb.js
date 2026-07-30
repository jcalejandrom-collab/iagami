'use strict';

const CMSDB = (function () {
  const PB_URL = (typeof window !== 'undefined' && window.__IAGAMI_CONFIG__ && window.__IAGAMI_CONFIG__.PB_URL)
    || 'http://127.0.0.1:8090';

  /* ─── CACHÉ EN MEMORIA con TTL de 2 minutos ─── */
  const _cache = {};
  const _cacheTTL = 2 * 60 * 1000;

  function clearCache(coleccion) {
    if (coleccion) {
      delete _cache[coleccion];
    } else {
      Object.keys(_cache).forEach(k => delete _cache[k]);
    }
  }

  function _cacheGet(key) {
    const entry = _cache[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > _cacheTTL) { delete _cache[key]; return null; }
    return entry.data;
  }

  function _cacheSet(key, data) {
    _cache[key] = { data, ts: Date.now() };
  }

  /* ─── AbortController con timeout y clearTimeout automático ─── */
  function _makeCtrl(timeoutMs = 10000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    return { signal: ctrl.signal, cancel: () => clearTimeout(t) };
  }

  /* ─── AbortController por clave (para getAll) ─── */
  const _controllers = {};

  function _abort(key, timeoutMs = 10000) {
    if (_controllers[key]) {
      _controllers[key].ctrl.abort();
      clearTimeout(_controllers[key].t);
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    _controllers[key] = { ctrl, t };
    return ctrl.signal;
  }

  function _abortDone(key) {
    if (_controllers[key]) {
      clearTimeout(_controllers[key].t);
      delete _controllers[key];
    }
  }

  /* ─── Promesas en vuelo para deduplicar peticiones concurrentes ─── */
  const _inflight = {};

  /* ─── Interceptor global de errores de auth ─── */
  function _handleAuthError(status) {
    if (status === 401 && getToken()) {
      window.dispatchEvent(new CustomEvent('sigap:session-expired'));
      logout();
    }
    if (status === 403) {
      window.dispatchEvent(new CustomEvent('sigap:access-denied'));
    }
  }

  /* ─── GET ALL (con paginación automática y deduplicación) ─── */
  async function getAll(coleccion) {
    const cached = _cacheGet(coleccion);
    if (cached) return cached;

    if (_inflight[coleccion]) return _inflight[coleccion];

    const _key = 'getAll_' + coleccion;
    const signal = _abort(_key);

    _inflight[coleccion] = (async () => {
      try {
        let page = 1;
        const perPage = 200;
        const MAX_ITEMS = 1000;
        let allItems = [];
        let totalPages = 1;
        const noSortCollections = ['comunas'];
        const sortCandidates = noSortCollections.includes(coleccion) ? [''] : ['-created', 'id', ''];
        let workingSort = null;

        do {
          const token = getToken();
          const headers = { 'ngrok-skip-browser-warning': '1' };
          if (token) headers['Authorization'] = token;

          let res = null;
          const sortsToTry = workingSort !== null ? [workingSort] : sortCandidates;
          for (const sort of sortsToTry) {
            const url = sort
              ? `${PB_URL}/api/collections/${coleccion}/records?page=${page}&perPage=${perPage}&sort=${sort}`
              : `${PB_URL}/api/collections/${coleccion}/records?page=${page}&perPage=${perPage}`;
            res = await fetch(url, { headers, signal });
            if (res.status !== 400) { workingSort = sort; break; }
            const errBody = await res.clone().json().catch(() => ({}));
            console.error(`[SIGAP] ${coleccion} sort="${sort}" → 400:`, errBody.message || JSON.stringify(errBody));
          }

          if (res.status === 404) {
            console.warn(`[SIGAP] Colección "${coleccion}" no existe en PocketBase`);
            return [];
          }
          if (res.status === 403) {
            console.warn(`[SIGAP] Acceso denegado a "${coleccion}". Verifica API Rules en PocketBase.`);
            window.dispatchEvent(new CustomEvent('sigap:access-denied', { detail: { coleccion } }));
            return [];
          }
          _handleAuthError(res.status);
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(`HTTP ${res.status}: ${body.message || JSON.stringify(body)}`);
          }

          const data = await res.json();
          allItems = allItems.concat(data.items || []);
          totalPages = data.totalPages || 1;
          page++;
          if (allItems.length >= MAX_ITEMS) break;
        } while (page <= totalPages);

        _cacheSet(coleccion, allItems);
        return allItems;

      } catch (err) {
        if (err.name === 'AbortError') return [];
        console.error(`[SIGAP] getAll("${coleccion}") falló:`, err.message);
        window.dispatchEvent(new CustomEvent('sigap:collection-error', { detail: { coleccion, error: err.message } }));
        return [];
      } finally {
        _abortDone(_key);
        delete _inflight[coleccion];
      }
    })();

    return _inflight[coleccion];
  }

  /* ─── GET FILTERED ─── */
  async function count(coleccion, filtro = '') {
    const { signal, cancel } = _makeCtrl(10000);
    try {
      const token = getToken();
      const headers = { 'ngrok-skip-browser-warning': '1' };
      if (token) headers['Authorization'] = token;
      let url = `${PB_URL}/api/collections/${coleccion}/records?page=1&perPage=1`;
      if (filtro) url += `&filter=${encodeURIComponent(filtro)}`;
      const res = await fetch(url, { headers, signal });
      if (!res.ok) return 0;
      const json = await res.json();
      return json.totalItems || 0;
    } catch { return 0; }
    finally { cancel(); }
  }

  async function getFiltered(coleccion, filtro, opciones = {}) {
    const { signal, cancel } = _makeCtrl(10000);
    try {
      const token = getToken();
      const headers = { 'ngrok-skip-browser-warning': '1' };
      if (token) headers['Authorization'] = token;

      const perPage = opciones.perPage || 50;
      const page = opciones.page || 1;
      const sort = opciones.sort !== undefined ? opciones.sort : '-created';

      const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (sort) params.set('sort', sort);
      if (filtro) params.set('filter', filtro);
      if (opciones.params) {
        Object.entries(opciones.params).forEach(([k, v]) => params.set(k, v));
      }

      const res = await fetch(
        `${PB_URL}/api/collections/${coleccion}/records?${params.toString()}`,
        { headers, signal }
      );

      if (res.status === 404) {
        console.warn(`[SIGAP] Colección "${coleccion}" no existe en PocketBase`);
        return [];
      }
      if (res.status === 403) {
        console.warn(`[SIGAP] Acceso denegado a "${coleccion}" (API Rules)`);
        window.dispatchEvent(new CustomEvent('sigap:access-denied', { detail: { coleccion } }));
        return [];
      }
      if (res.status === 401) {
        _handleAuthError(res.status);
        return [];
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      return data.items || [];

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(`[SIGAP] getFiltered("${coleccion}") falló:`, err.message);
      }
      return [];
    } finally {
      cancel();
    }
  }

  /* ─── SAVE (POST / PATCH) ─── */
  async function save(coleccion, item) {
    const { signal, cancel } = _makeCtrl(10000);
    try {
      const isUpdate = !!item.id;
      const endpoint = isUpdate
        ? `${PB_URL}/api/collections/${coleccion}/records/${item.id}`
        : `${PB_URL}/api/collections/${coleccion}/records`;

      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      const tieneArchivos = Object.values(item).some(
        v => v instanceof File || v instanceof Blob ||
          (Array.isArray(v) && v.some(f => f instanceof File || f instanceof Blob))
      );

      let body, headers = { 'ngrok-skip-browser-warning': '1' };
      const token = getToken();
      if (token) headers['Authorization'] = token;

      const PB_READONLY = new Set(['id', 'created', 'updated', 'collectionId', 'collectionName', 'expand']);

      if (tieneArchivos) {
        const fd = new FormData();
        Object.entries(item).forEach(([key, val]) => {
          if (isUpdate && PB_READONLY.has(key)) return;
          if (Array.isArray(val)) {
            val.forEach(v => {
              if ((v instanceof File || v instanceof Blob) && v.size > MAX_FILE_SIZE)
                throw new Error(`Archivo demasiado grande (máx 10 MB): ${v.name || key}`);
              fd.append(key, v);
            });
          } else if (val !== undefined && val !== null) {
            if ((val instanceof File || val instanceof Blob) && val.size > MAX_FILE_SIZE)
              throw new Error(`Archivo demasiado grande (máx 10 MB): ${val.name || key}`);
            fd.append(key, val instanceof File || val instanceof Blob
              ? val
              : val instanceof Date ? val.toISOString()
              : typeof val === 'object' ? JSON.stringify(val) : String(val)
            );
          }
        });
        body = fd;
      } else {
        const payload = { ...item };
        if (isUpdate) PB_READONLY.forEach(k => delete payload[k]);
        Object.keys(payload).forEach(k => {
          const v = payload[k];
          if (v instanceof Date) payload[k] = v.toISOString();
          else if (typeof v === 'object' && v !== null && !(v instanceof File) && !(v instanceof Blob))
            payload[k] = JSON.stringify(v);
        });
        body = JSON.stringify(payload);
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(endpoint, { method: isUpdate ? 'PATCH' : 'POST', headers, body, signal });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('[SIGAP] PocketBase error data:', JSON.stringify(errData));
        throw new Error(`HTTP ${res.status}: ${errData.message || JSON.stringify(errData.data || {})}`);
      }

      clearCache(coleccion);
      return await res.json();

    } catch (err) {
      console.error(`[SIGAP] save("${coleccion}") falló:`, err.message);
      throw err;
    } finally {
      cancel();
    }
  }

  /* ─── DELETE ─── */
  async function deleteRecord(coleccion, id) {
    const { signal, cancel } = _makeCtrl(10000);
    try {
      const token = getToken();
      const headers = { 'ngrok-skip-browser-warning': '1' };
      if (token) headers['Authorization'] = token;
      const res = await fetch(
        `${PB_URL}/api/collections/${coleccion}/records/${id}`,
        { method: 'DELETE', headers, signal }
      );
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      clearCache(coleccion);
      return true;
    } catch (err) {
      console.error(`[SIGAP] deleteRecord("${coleccion}", "${id}") falló:`, err.message);
      throw err;
    } finally {
      cancel();
    }
  }

  async function remove(coleccion, id) {
    return deleteRecord(coleccion, id);
  }

  /* ─── GET ONE ─── */
  async function getOne(coleccion, id) {
    const { signal, cancel } = _makeCtrl(10000);
    try {
      const token = getToken();
      const headers = { 'ngrok-skip-browser-warning': '1' };
      if (token) headers['Authorization'] = token;
      const res = await fetch(
        `${PB_URL}/api/collections/${coleccion}/records/${id}`,
        { headers, signal }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`[SIGAP] getOne("${coleccion}", "${id}") falló:`, err.message);
      return null;
    } finally {
      cancel();
    }
  }

  /* ─── HEALTH CHECK ─── */
  async function ping() {
    const { signal, cancel } = _makeCtrl(3000);
    try {
      const res = await fetch(`${PB_URL}/api/health`, { signal });
      return res.ok;
    } catch {
      return false;
    } finally {
      cancel();
    }
  }

  /* ─── AUTH ─── */
  async function login(email, password) {
    const { signal, cancel } = _makeCtrl(10000);
    try {
      const res = await fetch(`${PB_URL}/api/collections/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
        body: JSON.stringify({ identity: email, password }),
        signal
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      sessionStorage.setItem('pb_token', data.token);
      sessionStorage.setItem('pb_user', JSON.stringify(data.record || {}));
      return data;
    } catch (err) {
      console.error('[SIGAP] login falló:', err.message);
      throw err;
    } finally {
      cancel();
    }
  }

  function logout() {
    sessionStorage.removeItem('pb_token');
    sessionStorage.removeItem('pb_user');
    clearCache();
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

  function hasRole(...roles) {
    const user = getCurrentUser();
    return !!user && roles.includes(user.role);
  }

  /* ─── verifyToken con reintentos exponenciales y detección offline ─── */
  let _refreshPromise = null;
  async function verifyToken() {
    const token = getToken();
    if (!token) return false;
    if (_refreshPromise) return _refreshPromise;

    _refreshPromise = (async () => {
      const MAX_RETRIES = 3;
      let lastIsNetworkError = false;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
          window.dispatchEvent(new CustomEvent('sigap:reconnecting', { detail: { attempt, delay } }));
          await new Promise(r => setTimeout(r, delay));
        }

        const { signal, cancel } = _makeCtrl(10000);
        try {
          const res = await fetch(`${PB_URL}/api/collections/admins/auth-refresh`, {
            method: 'POST',
            headers: { 'Authorization': token, 'ngrok-skip-browser-warning': '1' },
            signal
          });
          cancel();
          lastIsNetworkError = false;

          if (res.status === 401) {
            // Token explícitamente rechazado por el servidor
            logout();
            return false;
          }
          if (!res.ok) {
            // Otro error HTTP — no cerrar sesión, podría ser temporal
            throw new Error(`HTTP ${res.status}`);
          }

          const data = await res.json();
          sessionStorage.setItem('pb_token', data.token);
          window.dispatchEvent(new CustomEvent('sigap:online'));
          return true;

        } catch (err) {
          cancel();
          const isNetworkError = err.name === 'AbortError' || err instanceof TypeError;
          lastIsNetworkError = isNetworkError;
          if (!isNetworkError) break; // Error no de red → no reintentar
        }
      }

      if (lastIsNetworkError) {
        // Sin internet pero token localmente presente → mantener sesión
        window.dispatchEvent(new CustomEvent('sigap:offline'));
        return true;
      }

      logout();
      return false;
    })().finally(() => { _refreshPromise = null; });

    return _refreshPromise;
  }

  /* ─── HELPERS ─── */
  function uid() { return crypto.randomUUID(); }
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
          detalle: String(detalle).replace(/[<>"'&]/g, '').slice(0, 500),
          usuario: userData.email || 'anonimo',
          nivel,
          ip: '',
          fecha: new Date().toISOString()
        })
      });
    } catch (err) {
      console.error('[SIGAP] logAudit falló:', err.message);
    }
  }

  return {
    getAll, getFiltered, count, save, deleteRecord, remove, getOne,
    clearCache, ping, uid, now,
    login, logout, getToken, isAuthenticated, getCurrentUser, hasRole, verifyToken,
    logAudit
  };
})();
