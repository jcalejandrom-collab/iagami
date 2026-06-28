/* ═══════════════════════════════════════════════════
   SIGA-IAGAMI — Auth & utilidades compartidas
   Trabaja con la colección `trabajadores` (Auth type)
   de PocketBase. El token se guarda en sessionStorage
   con clave 'siga_token' para no colisionar con el
   token del panel admin ('pb_token').
═══════════════════════════════════════════════════ */
(function(w){

  const PB = () => w.__SIGACFG_URL || document.querySelector('meta[name="pb-url"]')?.content?.trim() || 'https://api.iagami.online';

  const KEY_TOKEN = 'siga_token';
  const KEY_USER  = 'siga_user';

  /* ─── Token helpers ─── */
  const setSession = (token, user) => {
    sessionStorage.setItem(KEY_TOKEN, token);
    sessionStorage.setItem(KEY_USER, JSON.stringify(user || {}));
  };
  const clearSession = () => {
    sessionStorage.removeItem(KEY_TOKEN);
    sessionStorage.removeItem(KEY_USER);
  };
  const getToken   = () => sessionStorage.getItem(KEY_TOKEN);
  const getUser    = () => { try{ return JSON.parse(sessionStorage.getItem(KEY_USER)||'{}'); }catch{ return {}; } };
  const isAuth     = () => !!getToken();
  const getRole    = () => String(getUser().rol || '').toUpperCase();

  /* ─── Login contra colección trabajadores ─── */
  async function login(email, password) {
    const res = await fetch(`${PB()}/api/collections/trabajadores/auth-with-password`, {
      method:'POST',
      headers:{'Content-Type':'application/json','ngrok-skip-browser-warning':'1'},
      body: JSON.stringify({ identity: email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    setSession(data.token, data.record || {});
    return data;
  }

  /* ─── Logout ─── */
  function logout() {
    clearSession();
    window.location.href = '/siga-iagami/login.html';
  }

  /* ─── Guard: redirige al login si no hay sesión ─── */
  function requireAuth(allowedRoles) {
    if (!isAuth()) { window.location.href = '/siga-iagami/login.html'; return false; }
    if (allowedRoles && allowedRoles.length) {
      const role = getRole();
      if (!allowedRoles.includes(role)) {
        alert('No tienes permiso para acceder a esta sección.');
        window.location.href = '/siga-iagami/index.html';
        return false;
      }
    }
    return true;
  }

  /* ─── Fetch autenticado a PocketBase ─── */
  async function apiFetch(path, opts = {}) {
    const token = getToken();
    const headers = { 'ngrok-skip-browser-warning':'1', ...( opts.headers || {} ) };
    if (token) headers['Authorization'] = token;
    if (opts.json) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.json);
      delete opts.json;
    }
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`${PB()}/api/collections/${path}`, { ...opts, headers, signal: ctrl.signal });
      clearTimeout(tid);
      if (res.status === 401 || res.status === 403) { logout(); return null; }
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.message || `HTTP ${res.status}`); }
      return res.status === 204 ? null : res.json();
    } catch(e) { clearTimeout(tid); throw e; }
  }

  /* ─── CRUD helpers ─── */
  async function list(col, filter='', perPage=200, page=1, sort='', expand='') {
    const p = new URLSearchParams({ page, perPage });
    if (sort) p.set('sort', sort);
    if (filter) p.set('filter', filter);
    if (expand) p.set('expand', expand);
    return apiFetch(`${col}/records?${p}`).then(d => d?.items || []);
  }
  async function getOne(col, id) {
    return apiFetch(`${col}/records/${id}`);
  }
  async function create(col, data) {
    return apiFetch(`${col}/records`, { method:'POST', json: data });
  }
  async function update(col, id, data) {
    return apiFetch(`${col}/records/${id}`, { method:'PATCH', json: data });
  }
  async function remove(col, id) {
    return apiFetch(`${col}/records/${id}`, { method:'DELETE' });
  }

  /* ─── Render topbar user chip ─── */
  function renderUserChip() {
    const u = getUser();
    const chip = document.getElementById('siga-user-chip');
    if (!chip) return;
    const initials = ((u.nombres||'').charAt(0) + (u.apellidos||'').charAt(0)).toUpperCase() || 'U';
    chip.innerHTML = `
      <div class="uc-av">${initials}</div>
      <div class="uc-info">
        <div class="uc-name">${escSiga(u.nombres||'')} ${escSiga(u.apellidos||'')}</div>
        <div class="uc-role">${escSiga(u.rol||'TRABAJADOR')}</div>
      </div>
      <div class="uc-dot"></div>`;
  }

  /* ─── Sidebar navigation ─── */
  function buildSidebar(items, activeId) {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    nav.innerHTML = items.map(it => {
      if (it.section) return `<div class="sidebar-section">${escSiga(it.section)}</div>`;
      return `<button class="nav-item${it.id===activeId?' active':''}" onclick="sigaNav('${it.id}')" title="${escSiga(it.label)}">
        <span class="nav-icon">${it.icon}</span>${escSiga(it.label)}</button>`;
    }).join('');
  }

  /* ─── Toast ─── */
  function toast(msg, type='success') {
    let tc = document.getElementById('toast-container');
    if (!tc) { tc = document.createElement('div'); tc.id='toast-container'; document.body.appendChild(tc); }
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    tc.appendChild(t);
    setTimeout(() => { t.style.animation='toastOut .3s ease forwards'; setTimeout(()=>t.remove(),300); }, 3200);
  }

  /* ─── Sidebar toggle ─── */
  function toggleSidebar() {
    const s = document.getElementById('sidebar');
    const o = document.getElementById('overlay');
    s?.classList.toggle('open');
    o?.classList.toggle('show');
  }

  /* ─── Escape HTML ─── */
  function escSiga(s) {
    return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ─── Formato fecha ─── */
  function fmtFecha(s) {
    if (!s) return '—';
    const d = new Date(s);
    return isNaN(d) ? s : d.toLocaleDateString('es-VE',{day:'2-digit',month:'short',year:'numeric'});
  }
  function fmtFechaHora(s) {
    if (!s) return '—';
    const d = new Date(s);
    return isNaN(d) ? s : d.toLocaleString('es-VE',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  }

  /* ─── Roles ─── */
  const ROLES = ['PRESIDENTE','DIRECTOR','COORDINADOR','RRHH','TECNOLOGIA','SUPERVISOR','TRABAJADOR'];
  const ROLE_LABELS = { PRESIDENTE:'Presidente', DIRECTOR:'Director', COORDINADOR:'Coordinador',
    RRHH:'Recursos Humanos', TECNOLOGIA:'Tecnología', SUPERVISOR:'Supervisor', TRABAJADOR:'Trabajador' };

  /* ─── Export ─── */
  w.SIGA = { login, logout, isAuth, getUser, getRole, requireAuth,
    list, getOne, create, update, remove,
    toast, toggleSidebar, buildSidebar, renderUserChip,
    escSiga, fmtFecha, fmtFechaHora, ROLES, ROLE_LABELS };

})(window);
