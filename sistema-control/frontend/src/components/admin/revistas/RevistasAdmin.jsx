import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.jsx';
import { revistas as revistasApi } from '../../../services/api.js';
import { useToast } from '../../../App.jsx';

/* ============================================================
   Helpers
   ============================================================ */
function fmtDate(str) {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return str; }
}

function fmtNum(n) {
  if (n === undefined || n === null) return '0';
  return Number(n).toLocaleString('es-ES');
}

/* ============================================================
   Stat Card
   ============================================================ */
function StatCard({ icon, value, label, bg, color }) {
  return (
    <div className="stat-card">
      <div className="stat-card__icon" style={{ background: bg, color }}>
        {icon}
      </div>
      <div className="stat-card__value">{value ?? '—'}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}

/* ============================================================
   Confirm modal
   ============================================================ */
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff', borderRadius: '14px', padding: '2rem',
          maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '1rem' }}>⚠️</div>
        <p style={{ textAlign: 'center', color: '#333', fontSize: '.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '.7rem', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '.5rem 1.4rem', borderRadius: '8px', border: '1.5px solid #ddd',
              background: '#fff', color: '#555', cursor: 'pointer', fontWeight: 600, fontSize: '.88rem',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '.5rem 1.4rem', borderRadius: '8px', border: 'none',
              background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '.88rem',
            }}
          >
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Main component
   ============================================================ */
export default function RevistasAdmin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Stats
  const [stats, setStats]         = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // List
  const [revistas, setRevistas]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);

  // Filters
  const [search, setSearch]       = useState('');
  const [estado, setEstado]       = useState('');
  const [categoria, setCategoria] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});

  // Confirm dialog
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Action loading
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch stats
  useEffect(() => {
    revistasApi.getEstadisticas().then(({ data }) => {
      if (data) setStats(data);
      setLoadingStats(false);
    });
  }, []);

  // Fetch list
  const fetchList = useCallback(async (filters) => {
    setLoading(true);
    const { data, error } = await revistasApi.getAllAdmin(filters);
    setLoading(false);
    if (error) {
      addToast('Error al cargar revistas: ' + error, 'error');
      return;
    }
    const list = Array.isArray(data) ? data : (data?.revistas || data?.items || data?.data || []);
    const tot  = data?.total ?? data?.count ?? list.length;
    setRevistas(list);
    setTotal(tot);
  }, [addToast]);

  useEffect(() => {
    fetchList(appliedFilters);
  }, [appliedFilters, fetchList]);

  function handleFilter() {
    const f = {};
    if (search.trim())  f.search    = search.trim();
    if (estado)         f.estado    = estado;
    if (categoria)      f.categoria = categoria;
    setAppliedFilters(f);
  }

  function handleClearFilters() {
    setSearch(''); setEstado(''); setCategoria('');
    setAppliedFilters({});
  }

  async function handleToggleEstado(id) {
    setActionLoading(`estado-${id}`);
    const { data, error } = await revistasApi.toggleEstado(id);
    setActionLoading(null);
    if (error) { addToast('Error al cambiar estado: ' + error, 'error'); return; }
    addToast('Estado actualizado.', 'success');
    fetchList(appliedFilters);
  }

  async function handleToggleDestacada(id) {
    setActionLoading(`dest-${id}`);
    const { data, error } = await revistasApi.toggleDestacada(id);
    setActionLoading(null);
    if (error) { addToast('Error al cambiar destacada: ' + error, 'error'); return; }
    addToast('Actualizado.', 'success');
    fetchList(appliedFilters);
  }

  function confirmDelete(revista) {
    setDeleteTarget(revista);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(`del-${deleteTarget.id}`);
    const { error } = await revistasApi.delete(deleteTarget.id);
    setActionLoading(null);
    setDeleteTarget(null);
    if (error) { addToast('Error al eliminar: ' + error, 'error'); return; }
    addToast(`"${deleteTarget.titulo}" eliminada.`, 'success');
    fetchList(appliedFilters);
    // Refresh stats
    revistasApi.getEstadisticas().then(({ data }) => { if (data) setStats(data); });
  }

  function handleLogout() {
    logout();
    navigate('/admin/login', { replace: true });
  }

  const sidebarNavItem = {
    display: 'flex', alignItems: 'center', gap: '.6rem',
    padding: '.6rem .8rem', borderRadius: '8px',
    color: 'rgba(255,255,255,.75)', textDecoration: 'none',
    fontSize: '.88rem', fontWeight: 500, transition: 'background .15s',
  };
  const sidebarNavItemActive = {
    ...sidebarNavItem,
    background: 'rgba(255,255,255,.12)',
    color: '#fff',
  };

  const btnPrimary = {
    display: 'inline-flex', alignItems: 'center', gap: '.4rem',
    padding: '.5rem 1.1rem', background: '#1d6b3e', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '.85rem',
    fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
    transition: 'background .2s', whiteSpace: 'nowrap',
  };
  const btnGhost = {
    display: 'inline-flex', alignItems: 'center', gap: '.35rem',
    padding: '.35rem .7rem', background: 'transparent', color: '#666',
    border: '1px solid #ddd', borderRadius: '7px', fontSize: '.8rem',
    fontWeight: 500, cursor: 'pointer', transition: 'border-color .15s, color .15s',
  };
  const btnIcon = (color = '#1d6b3e') => ({
    width: '32px', height: '32px', borderRadius: '7px', border: `1.5px solid ${color}22`,
    background: `${color}11`, color, fontSize: '.9rem',
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background .15s',
  });

  const estadoBadgeStyle = (e) => ({
    display: 'inline-flex', alignItems: 'center',
    padding: '.18rem .55rem', borderRadius: '20px',
    fontSize: '.72rem', fontWeight: 700, letterSpacing: '.3px',
    ...(e === 'publicada'
      ? { background: '#d0eadb', color: '#1d6b3e' }
      : { background: '#f0f0f0', color: '#666' }),
  });

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand__icon">🌿</span>
          <div>
            <p className="sidebar-brand__name">IAGAMI</p>
            <p className="sidebar-brand__sub">Panel Admin</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link to="/admin" style={sidebarNavItem}>
            <span>🏠</span> Dashboard
          </Link>
          <Link to="/admin/submissions" style={sidebarNavItem}>
            <span>📋</span> Todos los Envíos
          </Link>
          <Link to="/admin/submissions/reportes" style={sidebarNavItem}>
            <span>📄</span> Reportes Diarios
          </Link>
          <Link to="/admin/submissions/planificaciones" style={sidebarNavItem}>
            <span>📅</span> Planificaciones
          </Link>
          <Link to="/admin/revistas" style={sidebarNavItemActive}>
            <span>📰</span> Revista Digital
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user__avatar">
              {user?.nombre?.charAt(0) || user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
            </div>
            <div className="sidebar-user__info">
              <p className="sidebar-user__name">{user?.nombre || user?.name || 'Administrador'}</p>
              <p className="sidebar-user__email">{user?.email || ''}</p>
            </div>
          </div>
          <button className="btn-ghost btn-sm sidebar-logout" onClick={handleLogout}>
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar__title">📰 Revista Digital IAGAMI</h1>
            <p className="admin-topbar__sub">Gestión de publicaciones y ediciones</p>
          </div>
          <Link to="/admin/revistas/nueva" style={btnPrimary}>
            + Nueva Revista
          </Link>
        </header>

        <div className="admin-content">
          {/* Stats */}
          {loadingStats ? (
            <div className="stat-grid">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="stat-card skeleton" style={{ height: '110px' }} />
              ))}
            </div>
          ) : (
            <div className="stat-grid">
              <StatCard icon="📰" value={fmtNum(stats?.total)}              label="Total Revistas"       bg="#e8f5ee" color="#1d6b3e" />
              <StatCard icon="✅" value={fmtNum(stats?.publicadas)}         label="Publicadas"           bg="#d1fae5" color="#16613a" />
              <StatCard icon="📝" value={fmtNum(stats?.borradores)}         label="Borradores"           bg="#f0f0f0" color="#555"    />
              <StatCard icon="👁" value={fmtNum(stats?.totalVisualizaciones ?? stats?.total_visualizaciones)} label="Visualizaciones"   bg="#eff6ff" color="#1d4ed8" />
              <StatCard icon="⬇" value={fmtNum(stats?.totalDescargas ?? stats?.total_descargas)}    label="Descargas"            bg="#fef9c3" color="#713f12" />
            </div>
          )}

          {/* Filters */}
          <div
            style={{
              background: '#fff', borderRadius: '12px', padding: '1.2rem 1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,.05)', marginBottom: '1.5rem',
              display: 'flex', flexWrap: 'wrap', gap: '.7rem', alignItems: 'flex-end',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', flex: 2, minWidth: '180px' }}>
              <label style={{ fontSize: '.72rem', fontWeight: 600, color: '#777', textTransform: 'uppercase', letterSpacing: '.4px' }}>Buscar</label>
              <input
                type="text"
                placeholder="Título, edición…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                style={{ padding: '.5rem .8rem', border: '1.5px solid #e0e0e0', borderRadius: '7px', fontSize: '.88rem', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', minWidth: '150px' }}>
              <label style={{ fontSize: '.72rem', fontWeight: 600, color: '#777', textTransform: 'uppercase', letterSpacing: '.4px' }}>Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                style={{ padding: '.5rem .8rem', border: '1.5px solid #e0e0e0', borderRadius: '7px', fontSize: '.88rem', outline: 'none' }}
              >
                <option value="">Todos</option>
                <option value="publicada">Publicada</option>
                <option value="borrador">Borrador</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', minWidth: '160px' }}>
              <label style={{ fontSize: '.72rem', fontWeight: 600, color: '#777', textTransform: 'uppercase', letterSpacing: '.4px' }}>Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                style={{ padding: '.5rem .8rem', border: '1.5px solid #e0e0e0', borderRadius: '7px', fontSize: '.88rem', outline: 'none' }}
              >
                <option value="">Todas</option>
                {['Ambiental','Institucional','Educativa','Técnica','Informativa'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button style={{ ...btnPrimary, alignSelf: 'flex-end' }} onClick={handleFilter}>
              Filtrar
            </button>
            {Object.keys(appliedFilters).length > 0 && (
              <button style={{ ...btnGhost, alignSelf: 'flex-end' }} onClick={handleClearFilters}>
                ✕ Limpiar
              </button>
            )}
          </div>

          {/* Table */}
          <div
            style={{
              background: '#fff', borderRadius: '14px',
              boxShadow: '0 2px 10px rgba(0,0,0,.06)', overflow: 'hidden',
            }}
          >
            {/* Table header */}
            <div
              style={{
                padding: '1rem 1.5rem', borderBottom: '1px solid #edf4ef',
                display: 'flex', alignItems: 'center', gap: '.5rem',
              }}
            >
              <span style={{ fontSize: '.85rem', color: '#888' }}>
                {loading ? 'Cargando…' : `${total} revista${total !== 1 ? 's' : ''}`}
              </span>
              {loading && (
                <span
                  style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    border: '2px solid #d0eadb', borderTopColor: '#1d6b3e',
                    animation: 'spin .75s linear infinite', display: 'inline-block',
                  }}
                />
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>

            {loading ? (
              <div style={{ padding: '2rem' }}>
                {[1,2,3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: '64px', borderRadius: '8px', marginBottom: '.8rem',
                      background: 'linear-gradient(90deg,#e8f0ea 25%,#f4f9f5 50%,#e8f0ea 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.4s infinite',
                    }}
                  />
                ))}
                <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
              </div>
            ) : revistas.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#888' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <p style={{ fontWeight: 600, color: '#555', marginBottom: '.4rem' }}>
                  No hay revistas
                </p>
                <p style={{ fontSize: '.85rem', marginBottom: '1.2rem' }}>
                  {Object.keys(appliedFilters).length > 0
                    ? 'Ninguna revista coincide con los filtros.'
                    : 'Comienza creando la primera edición.'}
                </p>
                <Link to="/admin/revistas/nueva" style={btnPrimary}>
                  + Nueva Revista
                </Link>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%', borderCollapse: 'collapse',
                    fontSize: '.85rem', minWidth: '800px',
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f9fdf9', borderBottom: '1px solid #edf4ef' }}>
                      {['Portada','Título','Edición','Categoría','Estado','Visualiz.','Descargas','Dest.','Acciones'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '.7rem 1rem', textAlign: 'left',
                            color: '#666', fontWeight: 600,
                            fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.4px',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {revistas.map((rv, idx) => (
                      <tr
                        key={rv.id}
                        style={{
                          borderBottom: '1px solid #f0f4f0',
                          background: idx % 2 === 0 ? '#fff' : '#fafcfa',
                          transition: 'background .15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f0f8f3'}
                        onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafcfa'}
                      >
                        {/* Portada */}
                        <td style={{ padding: '.6rem 1rem' }}>
                          <div
                            style={{
                              width: '45px', height: '60px', borderRadius: '6px', overflow: 'hidden',
                              background: 'linear-gradient(135deg,#e8f3ec,#d0eadb)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {rv.portada_url ? (
                              <img
                                src={rv.portada_url}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'block';
                                }}
                              />
                            ) : null}
                            <span style={{ display: rv.portada_url ? 'none' : 'block', fontSize: '1.5rem' }}>📰</span>
                          </div>
                        </td>

                        {/* Título */}
                        <td style={{ padding: '.6rem 1rem', maxWidth: '220px' }}>
                          <div
                            style={{
                              fontWeight: 600, color: '#1a1a1a',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}
                          >
                            {rv.titulo}
                          </div>
                          <div style={{ fontSize: '.75rem', color: '#888', marginTop: '2px' }}>
                            {fmtDate(rv.fecha_publicacion)}
                          </div>
                        </td>

                        {/* Edición */}
                        <td style={{ padding: '.6rem 1rem', whiteSpace: 'nowrap', color: '#555' }}>
                          {rv.numero_edicion ? `#${rv.numero_edicion}` : '—'}
                        </td>

                        {/* Categoría */}
                        <td style={{ padding: '.6rem 1rem' }}>
                          {rv.categoria ? (
                            <span
                              style={{
                                background: '#d0eadb', color: '#1d6b3e',
                                padding: '.18rem .55rem', borderRadius: '20px',
                                fontSize: '.72rem', fontWeight: 600,
                              }}
                            >
                              {rv.categoria}
                            </span>
                          ) : '—'}
                        </td>

                        {/* Estado */}
                        <td style={{ padding: '.6rem 1rem' }}>
                          <span style={estadoBadgeStyle(rv.estado)}>
                            {rv.estado === 'publicada' ? '✅ Publicada' : '📝 Borrador'}
                          </span>
                        </td>

                        {/* Visualizaciones */}
                        <td style={{ padding: '.6rem 1rem', color: '#555', textAlign: 'right' }}>
                          {fmtNum(rv.total_visualizaciones)}
                        </td>

                        {/* Descargas */}
                        <td style={{ padding: '.6rem 1rem', color: '#555', textAlign: 'right' }}>
                          {fmtNum(rv.total_descargas)}
                        </td>

                        {/* Destacada */}
                        <td style={{ padding: '.6rem 1rem', textAlign: 'center' }}>
                          <button
                            title={rv.destacada ? 'Quitar destacada' : 'Marcar como destacada'}
                            disabled={actionLoading === `dest-${rv.id}`}
                            onClick={() => handleToggleDestacada(rv.id)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: '1.2rem', opacity: rv.destacada ? 1 : .3,
                              transition: 'opacity .2s, transform .15s',
                              padding: '.25rem',
                            }}
                          >
                            ⭐
                          </button>
                        </td>

                        {/* Acciones */}
                        <td style={{ padding: '.6rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'nowrap' }}>
                            {/* Ver */}
                            <button
                              title="Ver revista pública"
                              style={btnIcon('#1d6b3e')}
                              onClick={() => window.open(`/revista/${rv.id}`, '_blank')}
                            >
                              👁
                            </button>
                            {/* Editar */}
                            <button
                              title="Editar"
                              style={btnIcon('#1d4ed8')}
                              onClick={() => navigate(`/admin/revistas/editar/${rv.id}`)}
                            >
                              ✏️
                            </button>
                            {/* Publicar/Despublicar */}
                            <button
                              title={rv.estado === 'publicada' ? 'Pasar a borrador' : 'Publicar'}
                              disabled={actionLoading === `estado-${rv.id}`}
                              style={btnIcon(rv.estado === 'publicada' ? '#b07d00' : '#16a34a')}
                              onClick={() => handleToggleEstado(rv.id)}
                            >
                              {actionLoading === `estado-${rv.id}` ? '⏳' : rv.estado === 'publicada' ? '🔒' : '🚀'}
                            </button>
                            {/* Eliminar */}
                            <button
                              title="Eliminar"
                              style={btnIcon('#dc2626')}
                              onClick={() => confirmDelete(rv)}
                              disabled={actionLoading === `del-${rv.id}`}
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Confirm delete modal */}
      {deleteTarget && (
        <ConfirmModal
          message={`¿Estás seguro de que deseas eliminar "${deleteTarget.titulo}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
