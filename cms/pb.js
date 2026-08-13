'use strict';

/* exported CMSDB */
/* ════════════════════════════════════════════════════════════════════
   CMSDB — Cliente PocketBase para SIGAP / IAGAMI
   Versión robusta: Circuit Breaker · Event Bus · Request Manager
                    Structured Logger · Offline Queue · CSP-safe
   ════════════════════════════════════════════════════════════════════ */

const CMSDB = (function () {

  /* ─── Configuración ─── */
  const PB_URL = (typeof window !== 'undefined' &&
    window.__IAGAMI_CONFIG__ && window.__IAGAMI_CONFIG__.PB_URL)
    || 'http://127.0.0.1:8090';

  const CFG = {
    cacheTTL:       2 * 60 * 1000,   // 2 min
    fetchTimeout:   10_000,           // 10 s
    pingTimeout:    3_000,
    maxRetries:     3,
    retryBaseMs:    1_000,            // backoff: 1 s × 2^attempt
    cbThreshold:    3,                // fallos para abrir circuit
    cbResetMs:      30_000,           // tiempo antes de half-open
    maxItems:       1_000,
    perPage:        200,
    maxFileSize:    10 * 1024 * 1024, // 10 MB
  };

  /* ══════════════════════════════════════════════════════════════════
     LOGGER ESTRUCTURADO
     ══════════════════════════════════════════════════════════════════ */
  const Logger = {
    _fmt: (lvl, mod, msg, meta) =>
      `[SIGAP:${lvl}] ${mod}: ${msg}` + (meta ? ' ' + JSON.stringify(meta) : ''),
    info:     (mod, msg, meta) => console.info(Logger._fmt('INFO', mod, msg, meta)),
    warn:     (mod, msg, meta) => console.warn(Logger._fmt('WARN', mod, msg, meta)),
    error:    (mod, msg, meta) => console.error(Logger._fmt('ERROR', mod, msg, meta)),
    critical: (mod, msg, meta) => {
      console.error(Logger._fmt('CRITICAL', mod, msg, meta));
      Bus.emit('sigap:critical-error', { mod, msg, meta });
    },
  };

  /* ══════════════════════════════════════════════════════════════════
     EVENT BUS — pub/sub centralizado sin estado global
     ══════════════════════════════════════════════════════════════════ */
  const Bus = {
    emit: (name, detail = {}) =>
      window.dispatchEvent(new CustomEvent(name, { detail, bubbles: false })),
    on: (name, fn, opts) =>
      window.addEventListener(name, fn, opts),
    off: (name, fn) =>
      window.removeEventListener(name, fn),
  };

  /* ══════════════════════════════════════════════════════════════════
     CIRCUIT BREAKER
     Estados: closed → open (tras N fallos) → half-open (tras reset) → closed
     ══════════════════════════════════════════════════════════════════ */
  const _cb = { failures: 0, state: 'closed', openedAt: 0 };

  function _cbRecord(ok) {
    if (ok) {
      _cb.failures = 0;
      _cb.state = 'closed';
    } else {
      _cb.failures++;
      if (_cb.failures >= CFG.cbThreshold) {
        _cb.state = 'open';
        _cb.openedAt = Date.now();
        Logger.warn('CircuitBreaker', 'Circuito abierto por fallos repetidos');
        Bus.emit('sigap:circuit-open');
      }
    }
  }

  function _cbAllow() {
    if (_cb.state === 'closed') {return true;}
    if (_cb.state === 'open') {
      if (Date.now() - _cb.openedAt >= CFG.cbResetMs) {
        _cb.state = 'half-open';
        Logger.info('CircuitBreaker', 'Half-open — probando reconexión');
        return true;
      }
      return false;
    }
    return true; // half-open: permite un intento
  }

  /* ══════════════════════════════════════════════════════════════════
     HELPER AbortController + clearTimeout automático
     ══════════════════════════════════════════════════════════════════ */
  function _makeCtrl(ms = CFG.fetchTimeout) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return { signal: ctrl.signal, cancel: () => clearTimeout(t) };
  }

  /* ──────────────────────────────────────────────────────────────────
     AbortController por clave (para getAll multi-página)
     ────────────────────────────────────────────────────────────────── */
  const _ctrlMap = {};
  function _abortKey(key, ms = CFG.fetchTimeout) {
    /* eslint-disable security/detect-object-injection */
    const prev = _ctrlMap[key];
    if (prev) { prev.ctrl.abort(); clearTimeout(prev.t); }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    _ctrlMap[key] = { ctrl, t };
    /* eslint-enable security/detect-object-injection */
    return ctrl.signal;
  }
  function _abortKeyDone(key) {
    /* eslint-disable security/detect-object-injection */
    const prev = _ctrlMap[key];
    if (prev) { clearTimeout(prev.t); delete _ctrlMap[key]; }
    /* eslint-enable security/detect-object-injection */
  }

  /* ══════════════════════════════════════════════════════════════════
     CACHÉ con TTL y stale-while-revalidate
     ══════════════════════════════════════════════════════════════════ */
  const _cache = {};

  function clearCache(col) {
    /* eslint-disable security/detect-object-injection */
    if (col) { delete _cache[col]; }
    else { Object.keys(_cache).forEach(k => delete _cache[k]); }
    /* eslint-enable security/detect-object-injection */
  }

  function _cacheGet(key) {
    /* eslint-disable security/detect-object-injection */
    const e = _cache[key];
    if (!e) { return { data: null, stale: false }; }
    const age = Date.now() - e.ts;
    if (age <= CFG.cacheTTL) { return { data: e.data, stale: false }; }
    if (age <= CFG.cacheTTL * 3) { return { data: e.data, stale: true }; }
    delete _cache[key];
    /* eslint-enable security/detect-object-injection */
    return { data: null, stale: false };
  }

  function _cacheSet(key, data) {
    // eslint-disable-next-line security/detect-object-injection
    _cache[key] = { data, ts: Date.now() };
  }

  /* ══════════════════════════════════════════════════════════════════
     REQUEST MANAGER — deduplicación y Promise Lock por clave
     ══════════════════════════════════════════════════════════════════ */
  const _inflight = {};

  function _dedupe(key, fn) {
    /* eslint-disable security/detect-object-injection */
    if (_inflight[key]) { return _inflight[key]; }
    _inflight[key] = fn().finally(() => delete _inflight[key]);
    return _inflight[key];
    /* eslint-enable security/detect-object-injection */
  }

  /* ══════════════════════════════════════════════════════════════════
     SANITIZACIÓN CENTRALIZADA (CSP-safe, sin innerHTML inseguro)
     ══════════════════════════════════════════════════════════════════ */
  function escapeHTML(s) {
    if (s == null) {return '';}
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /* ══════════════════════════════════════════════════════════════════
     MANEJADOR DE ERRORES HTTP DIFERENCIADO
     ══════════════════════════════════════════════════════════════════ */
  function _handleHttpError(status, coleccion, context = '') {
    const meta = { coleccion, context, ts: new Date().toISOString() };
    switch (status) {
      case 401:
        if (getToken()) {
          Logger.warn('Auth', 'Token rechazado por el servidor — cerrando sesión', meta);
          Bus.emit('sigap:session-expired', meta);
          logout();
        }
        break;
      case 403:
        Logger.warn('Auth', 'Acceso denegado (403)', meta);
        Bus.emit('sigap:access-denied', { ...meta, message: 'Sin permisos para acceder a este recurso.' });
        break;
      case 404:
        Logger.warn('PocketBase', `Colección "${coleccion}" no encontrada`, meta);
        Bus.emit('sigap:not-found', meta);
        break;
      case 500:
      case 502:
      case 503:
        Logger.critical('PocketBase', `Error de servidor (${status})`, meta);
        Bus.emit('sigap:server-error', { ...meta, status });
        break;
      default:
        Logger.error('PocketBase', `Error HTTP ${status}`, meta);
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     OFFLINE LOGOUT QUEUE
     ══════════════════════════════════════════════════════════════════ */
  const _logoutQueue = [];

  function _flushLogoutQueue() {
    if (!_logoutQueue.length) {return;}
    const token = _logoutQueue.shift();
    if (!token) {return;}
    fetch(`${PB_URL}/api/collections/admins/auth-refresh`, {
      method: 'POST',
      headers: { 'Authorization': token, 'ngrok-skip-browser-warning': '1' }
    }).catch(() => {});
  }

  function _onOnline() {
    Bus.emit('sigap:online');
    _flushLogoutQueue();
  }
  window.addEventListener('online', _onOnline);

  /* ══════════════════════════════════════════════════════════════════
     GET ALL (paginación, deduplicación, stale-while-revalidate)
     ══════════════════════════════════════════════════════════════════ */
  async function getAll(coleccion) {
    const { data: cached, stale } = _cacheGet(coleccion);
    if (cached && !stale) {return cached;}

    const fetcher = async () => {
      if (!_cbAllow()) {
        Logger.warn('CircuitBreaker', 'Petición bloqueada — circuito abierto', { coleccion });
        return cached || [];
      }

      const _key = 'getAll_' + coleccion;
      const signal = _abortKey(_key);
      try {
        const noSortCols = ['comunas'];
        const idSortCols = ['trabajadores','solicitudes_rrhh','capacitaciones','evaluaciones_desempeno','asistencia','actividades','inspecciones_empresas'];
        const sortCandidates = noSortCols.includes(coleccion) ? [''] : idSortCols.includes(coleccion) ? ['id',''] : ['-created','id',''];
        let workingSort = null, page = 1, allItems = [], totalPages = 1;

        do {
          const token = getToken();
          const headers = { 'ngrok-skip-browser-warning': '1' };
          if (token) {headers['Authorization'] = token;}

          let res = null;
          for (const sort of (workingSort !== null ? [workingSort] : sortCandidates)) {
            const qs = sort ? `sort=${sort}&` : '';
            res = await fetch(
              `${PB_URL}/api/collections/${coleccion}/records?${qs}page=${page}&perPage=${CFG.perPage}`,
              { headers, signal }
            );
            if (res.status !== 400) { workingSort = sort; break; }
            const eb = await res.clone().json().catch(() => ({}));
            Logger.warn('getAll', `sort="${sort}" → 400`, { coleccion, msg: eb.message });
          }

          if (!res || res.status === 404 || res.status === 403) {
            _handleHttpError(res?.status || 0, coleccion, 'getAll');
            _cbRecord(false);
            return cached || [];
          }
          if (!res.ok) {
            _handleHttpError(res.status, coleccion, 'getAll');
            _cbRecord(false);
            return cached || [];
          }

          const data = await res.json();
          allItems = allItems.concat(data.items || []);
          totalPages = data.totalPages || 1;
          page++;
          if (allItems.length >= CFG.maxItems) {break;}
        } while (page <= totalPages);

        _cbRecord(true);
        _cacheSet(coleccion, allItems);
        return allItems;

      } catch (err) {
        _abortKeyDone(_key);
        if (err.name === 'AbortError') {return cached || [];}
        Logger.error('getAll', err.message, { coleccion });
        Bus.emit('sigap:collection-error', { coleccion, error: err.message, ts: new Date().toISOString() });
        _cbRecord(false);
        return cached || [];
      } finally {
        _abortKeyDone(_key);
      }
    };

    if (cached && stale) {
      // Devuelve caché stale inmediatamente y revalida en background
      _dedupe('getAll_' + coleccion, fetcher);
      return cached;
    }

    return _dedupe('getAll_' + coleccion, fetcher);
  }

  /* ══════════════════════════════════════════════════════════════════
     COUNT
     ══════════════════════════════════════════════════════════════════ */
  async function count(coleccion, filtro = '') {
    const { signal, cancel } = _makeCtrl();
    try {
      const token = getToken();
      const headers = { 'ngrok-skip-browser-warning': '1' };
      if (token) {headers['Authorization'] = token;}
      let url = `${PB_URL}/api/collections/${coleccion}/records?page=1&perPage=1`;
      if (filtro) {url += `&filter=${encodeURIComponent(filtro)}`;}
      const res = await fetch(url, { headers, signal });
      if (!res.ok) {return 0;}
      const json = await res.json();
      return json.totalItems || 0;
    } catch { return 0; }
    finally { cancel(); }
  }

  /* ══════════════════════════════════════════════════════════════════
     GET FILTERED
     ══════════════════════════════════════════════════════════════════ */
  async function getFiltered(coleccion, filtro, opciones = {}) {
    const { signal, cancel } = _makeCtrl();
    try {
      const token = getToken();
      const headers = { 'ngrok-skip-browser-warning': '1' };
      if (token) {headers['Authorization'] = token;}

      const perPage = opciones.perPage || 50;
      const page    = opciones.page    || 1;
      const sort    = opciones.sort !== undefined ? opciones.sort : '-created';

      const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (sort)           {params.set('sort', sort);}
      if (filtro)         {params.set('filter', filtro);}
      if (opciones.params)
        {Object.entries(opciones.params).forEach(([k, v]) => params.set(k, v));}

      const res = await fetch(
        `${PB_URL}/api/collections/${coleccion}/records?${params}`,
        { headers, signal }
      );

      if (!res.ok) {
        _handleHttpError(res.status, coleccion, 'getFiltered');
        return [];
      }
      const data = await res.json();
      return data.items || [];

    } catch (err) {
      if (err.name !== 'AbortError')
        {Logger.error('getFiltered', err.message, { coleccion });}
      return [];
    } finally { cancel(); }
  }

  /* ══════════════════════════════════════════════════════════════════
     SAVE (POST / PATCH)
     ══════════════════════════════════════════════════════════════════ */
  async function save(coleccion, item) {
    const { signal, cancel } = _makeCtrl();
    try {
      const isUpdate = !!item.id;
      const endpoint = isUpdate
        ? `${PB_URL}/api/collections/${coleccion}/records/${item.id}`
        : `${PB_URL}/api/collections/${coleccion}/records`;

      const tieneArchivos = Object.values(item).some(
        v => v instanceof File || v instanceof Blob ||
          (Array.isArray(v) && v.some(f => f instanceof File || f instanceof Blob))
      );

      let body;
      const headers = { 'ngrok-skip-browser-warning': '1' };
      const token = getToken();
      if (token) {headers['Authorization'] = token;}

      const RO = new Set(['id', 'created', 'updated', 'collectionId', 'collectionName', 'expand']);

      if (tieneArchivos) {
        const fd = new FormData();
        Object.entries(item).forEach(([key, val]) => {
          if (isUpdate && RO.has(key)) {return;}
          if (Array.isArray(val)) {
            val.forEach(v => {
              if ((v instanceof File || v instanceof Blob) && v.size > CFG.maxFileSize)
                {throw new Error(`Archivo demasiado grande (máx 10 MB): ${v.name || key}`);}
              fd.append(key, v);
            });
          } else if (val !== undefined && val !== null) {
            if ((val instanceof File || val instanceof Blob) && val.size > CFG.maxFileSize)
              {throw new Error(`Archivo demasiado grande (máx 10 MB): ${val.name || key}`);}
            let appendVal;
            if (val instanceof File || val instanceof Blob) { appendVal = val; }
            else if (val instanceof Date) { appendVal = val.toISOString(); }
            else if (typeof val === 'object') { appendVal = JSON.stringify(val); }
            else { appendVal = String(val); }
            fd.append(key, appendVal);
          }
        });
        body = fd;
      } else {
        const payload = { ...item };
        // eslint-disable-next-line security/detect-object-injection
        if (isUpdate) { RO.forEach(k => delete payload[k]); }
        Object.keys(payload).forEach(k => {
          /* eslint-disable security/detect-object-injection */
          const v = payload[k];
          if (v instanceof Date) { payload[k] = v.toISOString(); }
          else if (typeof v === 'object' && v !== null && !(v instanceof File) && !(v instanceof Blob)) {
            payload[k] = JSON.stringify(v);
          }
          /* eslint-enable security/detect-object-injection */
        });
        body = JSON.stringify(payload);
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(endpoint, { method: isUpdate ? 'PATCH' : 'POST', headers, body, signal });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Logger.error('save', `HTTP ${res.status}`, { coleccion, data: err });
        throw new Error(`HTTP ${res.status}: ${err.message || JSON.stringify(err.data || {})}`);
      }
      clearCache(coleccion);
      return await res.json();

    } catch (err) {
      Logger.error('save', err.message, { coleccion });
      throw err;
    } finally { cancel(); }
  }

  /* ══════════════════════════════════════════════════════════════════
     DELETE
     ══════════════════════════════════════════════════════════════════ */
  async function deleteRecord(coleccion, id) {
    const { signal, cancel } = _makeCtrl();
    try {
      const token = getToken();
      const headers = { 'ngrok-skip-browser-warning': '1' };
      if (token) {headers['Authorization'] = token;}
      const res = await fetch(
        `${PB_URL}/api/collections/${coleccion}/records/${id}`,
        { method: 'DELETE', headers, signal }
      );
      if (!res.ok && res.status !== 204) {throw new Error(`HTTP ${res.status}`);}
      clearCache(coleccion);
      return true;
    } catch (err) {
      Logger.error('deleteRecord', err.message, { coleccion, id });
      throw err;
    } finally { cancel(); }
  }

  async function remove(coleccion, id) { return deleteRecord(coleccion, id); }

  /* ══════════════════════════════════════════════════════════════════
     GET ONE
     ══════════════════════════════════════════════════════════════════ */
  async function getOne(coleccion, id) {
    const { signal, cancel } = _makeCtrl();
    try {
      const token = getToken();
      const headers = { 'ngrok-skip-browser-warning': '1' };
      if (token) {headers['Authorization'] = token;}
      const res = await fetch(
        `${PB_URL}/api/collections/${coleccion}/records/${id}`,
        { headers, signal }
      );
      if (!res.ok) { _handleHttpError(res.status, coleccion, 'getOne'); return null; }
      return await res.json();
    } catch (err) {
      Logger.error('getOne', err.message, { coleccion, id });
      return null;
    } finally { cancel(); }
  }

  /* ══════════════════════════════════════════════════════════════════
     HEALTH CHECK
     ══════════════════════════════════════════════════════════════════ */
  async function ping() {
    const { signal, cancel } = _makeCtrl(CFG.pingTimeout);
    try {
      const res = await fetch(`${PB_URL}/api/health`, { signal });
      return res.ok;
    } catch { return false; }
    finally { cancel(); }
  }

  /* ══════════════════════════════════════════════════════════════════
     AUTH — login
     ══════════════════════════════════════════════════════════════════ */
  async function login(email, password) {
    const { signal, cancel } = _makeCtrl();
    try {
      const res = await fetch(`${PB_URL}/api/collections/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
        body: JSON.stringify({ identity: email, password }),
        signal
      });
      if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
      const data = await res.json();
      sessionStorage.setItem('pb_token', data.token);
      sessionStorage.setItem('pb_user', JSON.stringify(data.record || {}));
      _cbRecord(true);
      return data;
    } catch (err) {
      Logger.error('login', err.message);
      throw err;
    } finally { cancel(); }
  }

  /* ══════════════════════════════════════════════════════════════════
     AUTH — logout (cierre local inmediato + cola offline para remoto)
     ══════════════════════════════════════════════════════════════════ */
  function logout() {
    const token = getToken();
    if (token) {_logoutQueue.push(token);} // intento remoto en background
    sessionStorage.removeItem('pb_token');
    sessionStorage.removeItem('pb_user');
    clearCache();
    if (navigator.onLine) {_flushLogoutQueue();}
  }

  function getToken()       { return sessionStorage.getItem('pb_token'); }
  function isAuthenticated(){ return !!getToken(); }

  function getCurrentUser() {
    try { return JSON.parse(sessionStorage.getItem('pb_user') || 'null'); }
    catch { return null; }
  }

  function hasRole(...roles) {
    const u = getCurrentUser();
    return !!u && roles.includes(u.role);
  }

  /* ══════════════════════════════════════════════════════════════════
     verifyToken — Circuit Breaker + reintentos + offline
     ══════════════════════════════════════════════════════════════════ */
  let _refreshPromise = null;
  async function verifyToken() {
    const token = getToken();
    if (!token) {return false;}
    if (_refreshPromise) {return _refreshPromise;}

    _refreshPromise = (async () => {
      for (let attempt = 0; attempt < CFG.maxRetries; attempt++) {
        if (attempt > 0) {
          const delay = CFG.retryBaseMs * Math.pow(2, attempt);
          Bus.emit('sigap:reconnecting', { attempt, delay });
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        if (!_cbAllow()) {
          Bus.emit('sigap:offline');
          return true; // mantener sesión — circuit abierto
        }

        const { signal, cancel } = _makeCtrl();
        try {
          const res = await fetch(`${PB_URL}/api/collections/admins/auth-refresh`, {
            method: 'POST',
            headers: { 'Authorization': token, 'ngrok-skip-browser-warning': '1' },
            signal
          });
          cancel();

          if (res.status === 401) {
            _cbRecord(false);
            logout();
            return false; // Token inválido confirmado
          }
          if (!res.ok) {
            _cbRecord(false);
            throw new Error(`HTTP ${res.status}`);
          }

          const data = await res.json();
          if (!data.token) {
            Logger.error('verifyToken', 'Respuesta de autenticación sin token', data);
            Bus.emit('sigap:auth-error', { reason: 'missing-token' });
            return false;
          }
          sessionStorage.setItem('pb_token', data.token);
          _cbRecord(true);
          Bus.emit('sigap:online');
          return true;

        } catch (err) {
          cancel();
          const isNet = err.name === 'AbortError' || err instanceof TypeError;
          _cbRecord(false);
          if (!isNet) {break;} // error no de red → no reintentar
          Logger.warn('verifyToken', `Error de red (intento ${attempt + 1})`, { err: err.message });
        }
      }

      // Agotados los reintentos por error de red → mantener sesión
      Bus.emit('sigap:offline');
      Logger.warn('verifyToken', 'Sin conexión — sesión mantenida localmente');
      return true;

    })().finally(() => { _refreshPromise = null; });

    return _refreshPromise;
  }

  /* ══════════════════════════════════════════════════════════════════
     HELPERS
     ══════════════════════════════════════════════════════════════════ */
  function uid() { return crypto.randomUUID(); }
  function now() { return new Date().toISOString(); }

  /* ══════════════════════════════════════════════════════════════════
     AUDITORÍA ESTRUCTURADA
     ══════════════════════════════════════════════════════════════════ */
  async function logAudit(accion, modulo, detalle = '', nivel = 'info') {
    try {
      const token = getToken();
      const userData = getCurrentUser() || {};
      const { signal, cancel } = _makeCtrl(5000);
      await fetch(`${PB_URL}/api/collections/iagami_sys_logs/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': token } : {})
        },
        body: JSON.stringify({
          accion,
          modulo,
          detalle: escapeHTML(String(detalle)).slice(0, 500),
          usuario: userData.email || 'anonimo',
          nivel,
          ip: '',
          fecha: new Date().toISOString()
        }),
        signal
      });
      cancel();
    } catch (err) {
      Logger.warn('logAudit', err.message);
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     API PÚBLICA
     ══════════════════════════════════════════════════════════════════ */
  return {
    // Datos
    getAll, getFiltered, count, save, deleteRecord, remove, getOne, clearCache, ping,
    // Auth
    login, logout, getToken, isAuthenticated, getCurrentUser, hasRole, verifyToken,
    // Utilidades
    uid, now, escapeHTML, logAudit,
    // Internos expuestos para módulos que los necesiten
    Bus, Logger,
    // Limpieza de recursos (útil en tests y recarga SPA)
    destroy() { window.removeEventListener('online', _onOnline); },
  };
})();

// Exposición global para compatibilidad con módulos legacy y pruebas automatizadas con jsdom
if (typeof window !== 'undefined' && !window.CMSDB) { window.CMSDB = CMSDB; }
