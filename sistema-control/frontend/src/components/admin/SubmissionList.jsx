import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { submissions as submissionsApi } from '../../services/api.js';
import { adminLayoutStyles } from './Dashboard.jsx';

/* ============================================================
   SubmissionList — Admin list view
   Props:
     formType : string | undefined  (filters by form_type)
   ============================================================ */

const PAGE_SIZE = 15;

function StatusBadge({ estado }) {
  const map = {
    enviado:   'badge-enviado',
    revisado:  'badge-revisado',
    aprobado:  'badge-aprobado',
    rechazado: 'badge-rechazado',
  };
  return (
    <span className={`badge ${map[estado] || 'badge-enviado'}`}>
      {estado || 'enviado'}
    </span>
  );
}

function SkeletonRows({ count = 8 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i}>
          {[1,2,3,4,5,6,7].map((c) => (
            <td key={c}><div className="skeleton" style={{ height: '18px', borderRadius: '4px' }} /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function SubmissionList({ formType }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Filters
  const [search, setSearch]     = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin]       = useState('');
  const [estado, setEstado]           = useState('');
  const [typeFilter, setTypeFilter]   = useState(formType || '');

  // Data
  const [submissions, setSubmissions] = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    const filters = {
      page,
      limit: PAGE_SIZE,
    };
    if (search.trim())        filters.responsable  = search.trim();
    if (fechaInicio)          filters.fecha_inicio = fechaInicio;
    if (fechaFin)             filters.fecha_fin    = fechaFin;
    if (estado)               filters.estado       = estado;
    if (typeFilter || formType) filters.form_type  = typeFilter || formType;

    const { data, error: err } = await submissionsApi.getAll(filters);

    if (err) {
      setError(err);
      setLoading(false);
      return;
    }

    if (Array.isArray(data)) {
      setSubmissions(data);
      setTotal(data.length); // no pagination info from server
    } else {
      setSubmissions(data?.submissions || data?.data || []);
      setTotal(data?.total || data?.count || 0);
    }
    setLoading(false);
  }, [page, search, fechaInicio, fechaFin, estado, typeFilter, formType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, fechaInicio, fechaFin, estado, typeFilter]);

  function handleLogout() {
    logout();
    navigate('/admin/login', { replace: true });
  }

  function formatDate(str) {
    if (!str) return '—';
    try {
      return new Date(str).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return str; }
  }

  function formatType(type) {
    if (!type) return '—';
    if (type === 'reporte_diario')         return 'Reporte Diario';
    if (type === 'planificacion_semanal')  return 'Planificación Semanal';
    return type;
  }

  function shortId(id) {
    const s = String(id || '');
    return s.length > 10 ? `…${s.slice(-8)}` : s;
  }

  const pageTitle = formType === 'reporte_diario'
    ? 'Reportes Diarios'
    : formType === 'planificacion_semanal'
    ? 'Planificaciones Semanales'
    : 'Todos los Envíos';

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
          <Link to="/admin" className="sidebar-nav__item">
            <span className="sidebar-nav__icon">🏠</span> Dashboard
          </Link>
          <Link
            to="/admin/submissions"
            className={`sidebar-nav__item ${!formType && !typeFilter ? 'sidebar-nav__item--active' : ''}`}
          >
            <span className="sidebar-nav__icon">📋</span> Todos los Envíos
          </Link>
          <Link
            to="/admin/submissions/reportes"
            className={`sidebar-nav__item ${formType === 'reporte_diario' ? 'sidebar-nav__item--active' : ''}`}
          >
            <span className="sidebar-nav__icon">📄</span> Reportes Diarios
          </Link>
          <Link
            to="/admin/submissions/planificaciones"
            className={`sidebar-nav__item ${formType === 'planificacion_semanal' ? 'sidebar-nav__item--active' : ''}`}
          >
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

      {/* Main */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar__title">{pageTitle}</h1>
            <p className="admin-topbar__sub">
              {loading ? 'Cargando…' : `${total} registro${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button className="btn-secondary btn-sm admin-topbar__logout-mobile" onClick={handleLogout}>
            🚪 Salir
          </button>
        </header>

        <div className="admin-content">
          {/* Filter bar */}
          <div className="filter-bar card card-sm">
            <div className="filter-bar__grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Buscar por responsable</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre del funcionario…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Fecha inicio</label>
                <input
                  type="date"
                  className="form-input"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Fecha fin</label>
                <input
                  type="date"
                  className="form-input"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Estado</label>
                <select
                  className="form-input"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  <option value="enviado">Enviado</option>
                  <option value="revisado">Revisado</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="rechazado">Rechazado</option>
                </select>
              </div>

              {!formType && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tipo de formulario</label>
                  <select
                    className="form-input"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="">Todos los tipos</option>
                    <option value="reporte_diario">Reporte Diario</option>
                    <option value="planificacion_semanal">Planificación Semanal</option>
                  </select>
                </div>
              )}

              <div className="form-group filter-bar__actions" style={{ marginBottom: 0 }}>
                <label className="form-label">&nbsp;</label>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    setSearch('');
                    setFechaInicio('');
                    setFechaFin('');
                    setEstado('');
                    if (!formType) setTypeFilter('');
                    setPage(1);
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-error" role="alert">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Table */}
          {!error && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Responsable</th>
                    <th>Institución</th>
                    <th>Fecha / Semana</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonRows count={8} />
                  ) : submissions.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state">
                          <div className="empty-state__icon">📭</div>
                          <h3>Sin resultados</h3>
                          <p>No hay envíos que coincidan con los filtros aplicados.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    submissions.map((s) => (
                      <tr
                        key={s.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/admin/submissions/${s.id}`)}
                      >
                        <td className="td-muted font-mono" style={{ fontSize: '.78rem' }}>
                          {shortId(s.id)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {formatType(s.form_type || s.tipo)}
                        </td>
                        <td>{s.responsable || '—'}</td>
                        <td className="truncate" style={{ maxWidth: '200px' }}>
                          {s.institucion || '—'}
                        </td>
                        <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>
                          {formatDate(s.fecha || s.semana || s.submitted_at || s.created_at)}
                        </td>
                        <td>
                          <StatusBadge estado={s.estado || s.status || 'enviado'} />
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <Link
                            to={`/admin/submissions/${s.id}`}
                            className="btn-secondary btn-sm"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && total > PAGE_SIZE && (
            <div className="pagination">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Anterior
              </button>

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                // Smart page window
                let p;
                if (totalPages <= 7) {
                  p = i + 1;
                } else if (page <= 4) {
                  p = i + 1;
                } else if (page >= totalPages - 3) {
                  p = totalPages - 6 + i;
                } else {
                  p = page - 3 + i;
                }
                return (
                  <button
                    key={p}
                    className={p === page ? 'active' : ''}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </main>

      <style>{adminLayoutStyles}</style>
      <style>{`
        .filter-bar__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          align-items: end;
        }
        .filter-bar__actions {
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 600px) {
          .filter-bar__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
