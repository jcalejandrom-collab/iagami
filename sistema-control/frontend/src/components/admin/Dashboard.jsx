import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { submissions as submissionsApi } from '../../services/api.js';

/* ============================================================
   Dashboard — Admin main page
   ============================================================ */

function StatCard({ icon, value, label, color, bg }) {
  return (
    <div className="stat-card">
      <div
        className="stat-card__icon"
        style={{ background: bg, color: color }}
      >
        {icon}
      </div>
      <div className="stat-card__value">{value ?? '—'}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}

function StatusBadge({ estado }) {
  const map = {
    enviado:    'badge-enviado',
    revisado:   'badge-revisado',
    aprobado:   'badge-aprobado',
    rechazado:  'badge-rechazado',
  };
  return (
    <span className={`badge ${map[estado] || 'badge-enviado'}`}>
      {estado || 'enviado'}
    </span>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats]         = useState(null);
  const [recent, setRecent]       = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    let cancelled = false;
    submissionsApi.getStats().then(({ data }) => {
      if (cancelled) return;
      if (data) setStats(data);
      setLoadingStats(false);
    });
    submissionsApi.getAll({ limit: 5, page: 1 }).then(({ data }) => {
      if (cancelled) return;
      if (data) {
        const list = Array.isArray(data) ? data : (data.submissions || data.data || []);
        setRecent(list.slice(0, 5));
      }
      setLoadingRecent(false);
    });
    return () => { cancelled = true; };
  }, []);

  function handleLogout() {
    logout();
    navigate('/admin/login', { replace: true });
  }

  function formatDate(str) {
    if (!str) return '—';
    try {
      return new Date(str).toLocaleDateString('es-VE', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch {
      return str;
    }
  }

  function formatType(type) {
    if (!type) return '—';
    if (type === 'reporte_diario')          return 'Reporte Diario';
    if (type === 'planificacion_semanal')   return 'Planificación';
    return type;
  }

  function shortId(id) {
    if (!id) return '—';
    const s = String(id);
    return s.length > 8 ? `…${s.slice(-8)}` : s;
  }

  const _byEstado = Array.isArray(stats?.por_estado)
    ? stats.por_estado.reduce((acc, r) => ({ ...acc, [r.estado]: r.count }), {})
    : (stats?.por_estado || {});
  const totalEnviados   = _byEstado.enviado    ?? stats?.enviados    ?? 0;
  const totalRevisados  = _byEstado.revisado   ?? stats?.revisados   ?? 0;
  const totalAprobados  = _byEstado.aprobado   ?? stats?.aprobados   ?? 0;
  const totalRechazados = _byEstado.rechazado  ?? stats?.rechazados  ?? 0;
  const totalGeneral    = stats?.total ?? (totalEnviados + totalRevisados + totalAprobados + totalRechazados);

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
          <Link to="/admin" className="sidebar-nav__item sidebar-nav__item--active">
            <span className="sidebar-nav__icon">🏠</span> Dashboard
          </Link>
          <Link to="/admin/submissions" className="sidebar-nav__item">
            <span className="sidebar-nav__icon">📋</span> Todos los Envíos
          </Link>
          <Link to="/admin/submissions/reportes" className="sidebar-nav__item">
            <span className="sidebar-nav__icon">📄</span> Reportes Diarios
          </Link>
          <Link to="/admin/submissions/planificaciones" className="sidebar-nav__item">
            <span className="sidebar-nav__icon">📅</span> Planificaciones
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

      {/* Main content */}
      <main className="admin-main">
        {/* Top bar */}
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar__title">Dashboard</h1>
            <p className="admin-topbar__sub">
              Bienvenido, {user?.nombre || user?.name || 'Administrador'} · {new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button className="btn-secondary btn-sm admin-topbar__logout-mobile" onClick={handleLogout}>
            🚪 Salir
          </button>
        </header>

        <div className="admin-content">
          {/* Stat cards */}
          <section aria-label="Estadísticas">
            {loadingStats ? (
              <div className="stat-grid">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="stat-card skeleton" style={{ height: '130px' }} />
                ))}
              </div>
            ) : (
              <div className="stat-grid">
                <StatCard
                  icon="📬"
                  value={totalGeneral}
                  label="Total Enviados"
                  bg="#e8f5ee"
                  color="#1d6b3e"
                />
                <StatCard
                  icon="🔍"
                  value={totalRevisados}
                  label="En Revisión"
                  bg="#fffbeb"
                  color="#b07d00"
                />
                <StatCard
                  icon="✅"
                  value={totalAprobados}
                  label="Aprobados"
                  bg="#d1fae5"
                  color="#16613a"
                />
                <StatCard
                  icon="❌"
                  value={totalRechazados}
                  label="Rechazados"
                  bg="#fdf0ee"
                  color="#c0392b"
                />
              </div>
            )}
          </section>

          {/* Quick actions */}
          <section className="dashboard-actions" aria-label="Acciones rápidas">
            <h2 className="dashboard-section-title">Acceso Rápido</h2>
            <div className="dashboard-actions__grid">
              <Link to="/admin/submissions/reportes" className="dashboard-action-card">
                <span className="dashboard-action-card__icon">📄</span>
                <div>
                  <p className="dashboard-action-card__title">Reportes Diarios</p>
                  <p className="dashboard-action-card__sub">Ver y gestionar reportes de actividades</p>
                </div>
                <span className="dashboard-action-card__arrow">→</span>
              </Link>
              <Link to="/admin/submissions/planificaciones" className="dashboard-action-card">
                <span className="dashboard-action-card__icon">📅</span>
                <div>
                  <p className="dashboard-action-card__title">Planificaciones Semanales</p>
                  <p className="dashboard-action-card__sub">Ver y gestionar planificaciones enviadas</p>
                </div>
                <span className="dashboard-action-card__arrow">→</span>
              </Link>
            </div>
          </section>

          {/* Recent submissions */}
          <section aria-label="Envíos recientes">
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">Envíos Recientes</h2>
              <Link to="/admin/submissions" className="btn-ghost btn-sm">
                Ver todos →
              </Link>
            </div>

            {loadingRecent ? (
              <div>
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="skeleton skeleton-row" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📭</div>
                <h3>Sin envíos recientes</h3>
                <p>Aún no se han enviado formularios al sistema.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tipo</th>
                      <th>Responsable</th>
                      <th>Institución</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((s) => (
                      <tr key={s.id}>
                        <td className="td-muted font-mono">{shortId(s.id)}</td>
                        <td>{formatType(s.form_type || s.tipo)}</td>
                        <td>{s.responsable || '—'}</td>
                        <td className="truncate" style={{ maxWidth: '160px' }}>
                          {s.institucion || '—'}
                        </td>
                        <td className="td-muted">
                          {formatDate(s.fecha || s.submitted_at || s.created_at)}
                        </td>
                        <td>
                          <StatusBadge estado={s.estado || s.status || 'enviado'} />
                        </td>
                        <td>
                          <Link
                            to={`/admin/submissions/${s.id}`}
                            className="btn-ghost btn-sm"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      <style>{adminLayoutStyles}</style>
    </div>
  );
}

export const adminLayoutStyles = `
  .admin-layout {
    display: flex;
    min-height: 100vh;
  }
  /* Sidebar */
  .admin-sidebar {
    width: 260px;
    flex-shrink: 0;
    background: var(--white);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }
  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: .75rem;
    padding: 1.5rem 1.25rem 1rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: .5rem;
  }
  .sidebar-brand__icon {
    font-size: 1.6rem;
    width: 42px;
    height: 42px;
    background: var(--green-dark);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .sidebar-brand__name {
    font-family: var(--font-heading);
    font-weight: 800;
    font-size: 1rem;
    color: var(--green-dark);
    line-height: 1.2;
  }
  .sidebar-brand__sub {
    font-size: .72rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: .06em;
  }
  .sidebar-nav {
    flex: 1;
    padding: .5rem .75rem;
    display: flex;
    flex-direction: column;
    gap: .15rem;
  }
  .sidebar-nav__item {
    display: flex;
    align-items: center;
    gap: .75rem;
    padding: .65rem .9rem;
    border-radius: var(--radius-sm);
    font-size: .9rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    transition: background var(--transition), color var(--transition);
  }
  .sidebar-nav__item:hover {
    background: var(--green-light);
    color: var(--green-dark);
  }
  .sidebar-nav__item--active {
    background: var(--green-light);
    color: var(--green-dark);
    font-weight: 600;
  }
  .sidebar-nav__icon {
    font-size: 1rem;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }
  .sidebar-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: .75rem;
  }
  .sidebar-user {
    display: flex;
    align-items: center;
    gap: .75rem;
  }
  .sidebar-user__avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--green-dark);
    color: white;
    font-weight: 700;
    font-size: .875rem;
    display: flex;
    align-items: center;
    justify-content: center;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .sidebar-user__info {
    flex: 1;
    min-width: 0;
  }
  .sidebar-user__name {
    font-size: .875rem;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sidebar-user__email {
    font-size: .72rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sidebar-logout {
    width: 100%;
    justify-content: center;
    border: 1px solid var(--border);
  }
  /* Main */
  .admin-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .admin-topbar {
    background: var(--white);
    border-bottom: 1px solid var(--border);
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .admin-topbar__title {
    font-size: 1.2rem;
    font-family: var(--font-heading);
    color: var(--text-primary);
    font-weight: 700;
  }
  .admin-topbar__sub {
    font-size: .8rem;
    color: var(--text-muted);
    margin-top: .1rem;
    text-transform: capitalize;
  }
  .admin-topbar__logout-mobile {
    display: none;
  }
  .admin-content {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    flex: 1;
  }
  /* Dashboard specifics */
  .dashboard-section-title {
    font-size: 1rem;
    font-weight: 700;
    font-family: var(--font-heading);
    color: var(--text-primary);
    margin-bottom: 1rem;
  }
  .dashboard-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }
  .dashboard-section-header .dashboard-section-title {
    margin-bottom: 0;
  }
  .dashboard-actions__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
  }
  .dashboard-action-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.25rem 1.5rem;
    text-decoration: none;
    transition: border-color var(--transition), box-shadow var(--transition), transform var(--transition);
  }
  .dashboard-action-card:hover {
    border-color: var(--green-mid);
    box-shadow: var(--shadow);
    transform: translateY(-2px);
  }
  .dashboard-action-card__icon {
    font-size: 1.8rem;
    flex-shrink: 0;
  }
  .dashboard-action-card__title {
    font-weight: 600;
    font-size: .95rem;
    color: var(--text-primary);
    margin-bottom: .2rem;
  }
  .dashboard-action-card__sub {
    font-size: .8rem;
    color: var(--text-muted);
  }
  .dashboard-action-card__arrow {
    margin-left: auto;
    color: var(--green-dark);
    font-size: 1.1rem;
    font-weight: 700;
    flex-shrink: 0;
  }
  /* Responsive */
  @media (max-width: 900px) {
    .admin-sidebar {
      display: none;
    }
    .admin-topbar__logout-mobile {
      display: inline-flex;
    }
    .admin-content {
      padding: 1.25rem;
    }
  }
`;
