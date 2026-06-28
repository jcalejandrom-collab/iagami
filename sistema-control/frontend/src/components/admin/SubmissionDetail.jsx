import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { submissions as submissionsApi } from '../../services/api.js';
import { adminLayoutStyles } from './Dashboard.jsx';

/* ============================================================
   SubmissionDetail — Admin detail view for a single submission
   ============================================================ */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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

function MetaItem({ label, value }) {
  return (
    <div className="detail-meta__item">
      <p className="detail-meta__label">{label}</p>
      <p className="detail-meta__value">{value || '—'}</p>
    </div>
  );
}

function EvidenceThumb({ file }) {
  const isImage = /\.(jpe?g|png|gif|webp)$/i.test(file.filename || file.url || '');
  const url     = file.url || `${API_BASE}/evidences/${file.filename || file.id}`;

  if (isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="evidence-thumb"
        title={file.filename || file.name || 'Ver imagen'}
      >
        <img
          src={url}
          alt={file.filename || file.name || 'Evidencia'}
          loading="lazy"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="evidence-thumb__overlay">🔍 Ver</div>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="evidence-file"
      title={file.filename || file.name}
    >
      <span className="evidence-file__icon">📄</span>
      <div className="evidence-file__info">
        <span className="evidence-file__name">
          {file.filename || file.name || 'Archivo PDF'}
        </span>
        <span className="evidence-file__link">Abrir PDF →</span>
      </div>
    </a>
  );
}

export default function SubmissionDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [submission, setSubmission]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  // Status update panel
  const [newEstado, setNewEstado]     = useState('');
  const [notasAdmin, setNotasAdmin]   = useState('');
  const [updating, setUpdating]       = useState(false);
  const [toast, setToast]             = useState(null); // { type, msg }

  // Lightbox
  const [lightbox, setLightbox]       = useState(null); // url string

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    submissionsApi.getOne(id).then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) {
        setError(err);
      } else {
        const sub = data?.submission || data?.data || data;
        setSubmission(sub);
        setNewEstado(sub?.estado || sub?.status || 'enviado');
        setNotasAdmin(sub?.notas_admin || sub?.admin_notes || '');
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleStatusUpdate(e) {
    e.preventDefault();
    setUpdating(true);

    const { data, error: err } = await submissionsApi.updateStatus(id, newEstado, notasAdmin);
    setUpdating(false);

    if (err) {
      showToast('error', `Error al actualizar: ${err}`);
      return;
    }

    const updated = data?.submission || data?.data || data;
    if (updated) {
      setSubmission((prev) => ({ ...prev, ...updated }));
    } else {
      setSubmission((prev) => ({
        ...prev,
        estado: newEstado,
        status: newEstado,
        notas_admin: notasAdmin,
      }));
    }

    showToast('success', 'Estado actualizado correctamente.');
  }

  function handleLogout() {
    logout();
    navigate('/admin/login', { replace: true });
  }

  function formatDate(str) {
    if (!str) return '—';
    try {
      return new Date(str).toLocaleDateString('es-VE', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return str; }
  }

  function formatDateShort(str) {
    if (!str) return '—';
    try {
      return new Date(str).toLocaleDateString('es-VE', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch { return str; }
  }

  function formatType(type) {
    if (!type) return '—';
    if (type === 'reporte_diario')        return 'Reporte Diario de Actividades';
    if (type === 'planificacion_semanal') return 'Planificación Semanal de Actividades';
    return type;
  }

  // Normalize activities / evidencias arrays
  const actividades = submission?.actividades || submission?.activities || [];
  const evidencias  = submission?.evidencias  || submission?.evidences  || submission?.files || [];

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

      {/* Main */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <button
              className="btn-ghost btn-sm"
              onClick={() => navigate(-1)}
              aria-label="Volver"
            >
              ← Volver
            </button>
            <div>
              <h1 className="admin-topbar__title">
                {loading ? 'Cargando…' : formatType(submission?.form_type || submission?.tipo)}
              </h1>
              {!loading && submission && (
                <p className="admin-topbar__sub">
                  ID: <span className="font-mono">{submission.id}</span>
                  {' · '}
                  Enviado: {formatDate(submission.submitted_at || submission.created_at)}
                </p>
              )}
            </div>
          </div>
          <button className="btn-secondary btn-sm admin-topbar__logout-mobile" onClick={handleLogout}>
            🚪 Salir
          </button>
        </header>

        <div className="admin-content">
          {/* Toast */}
          {toast && (
            <div className={`detail-toast detail-toast--${toast.type}`} role="alert">
              {toast.type === 'success' ? '✅' : '⚠'} {toast.msg}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="detail-loading">
              <div className="spinner spinner-dark" style={{ width: '32px', height: '32px' }} />
              <p>Cargando envío…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="alert alert-error">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Content */}
          {!loading && !error && submission && (
            <div className="detail-layout">
              {/* LEFT COLUMN */}
              <div className="detail-left">
                {/* Header card */}
                <div className="card detail-card">
                  <div className="detail-header">
                    <div>
                      <h2 className="detail-header__type">
                        {formatType(submission.form_type || submission.tipo)}
                      </h2>
                      <p className="detail-header__id font-mono">#{submission.id}</p>
                    </div>
                    <StatusBadge estado={submission.estado || submission.status || 'enviado'} />
                  </div>
                </div>

                {/* Meta info */}
                <div className="card detail-card">
                  <h3 className="detail-card__title">Información General</h3>
                  <div className="detail-meta">
                    <MetaItem label="Institución / Dependencia" value={submission.institucion} />
                    <MetaItem label="Responsable / Funcionario" value={submission.responsable} />
                    {(submission.fecha || submission.semana) && (
                      <MetaItem
                        label={submission.semana ? 'Semana' : 'Fecha'}
                        value={submission.semana || formatDateShort(submission.fecha)}
                      />
                    )}
                    {(submission.hora_inicio || submission.horaInicio) && (
                      <MetaItem
                        label="Horario"
                        value={`${submission.hora_inicio || submission.horaInicio} — ${submission.hora_fin || submission.horaFin}`}
                      />
                    )}
                    <MetaItem
                      label="Fecha de envío"
                      value={formatDate(submission.submitted_at || submission.created_at)}
                    />
                  </div>
                </div>

                {/* Activities */}
                <div className="card detail-card">
                  <h3 className="detail-card__title">
                    Actividades ({actividades.length})
                  </h3>
                  {actividades.length === 0 ? (
                    <p className="detail-empty-text">Sin actividades registradas.</p>
                  ) : (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            {actividades[0]?.dia !== undefined && <th>Día</th>}
                            {actividades[0]?.hora !== undefined && <th>Hora</th>}
                            <th>Descripción</th>
                            {actividades[0]?.completada !== undefined && <th>Estado</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {actividades.map((act, idx) => (
                            <tr key={idx}>
                              <td className="td-muted">{idx + 1}</td>
                              {act.dia !== undefined && <td>{act.dia}</td>}
                              {act.hora !== undefined && <td className="td-muted">{act.hora || '—'}</td>}
                              <td>{act.descripcion || '—'}</td>
                              {act.completada !== undefined && (
                                <td>
                                  <span className={`badge ${act.completada ? 'badge-aprobado' : 'badge-revisado'}`}>
                                    {act.completada ? 'Completada' : 'Pendiente'}
                                  </span>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Observaciones */}
                {(submission.observaciones || submission.notes) && (
                  <div className="card detail-card">
                    <h3 className="detail-card__title">Observaciones</h3>
                    <p className="detail-observaciones">
                      {submission.observaciones || submission.notes}
                    </p>
                  </div>
                )}

                {/* Evidencias */}
                <div className="card detail-card">
                  <h3 className="detail-card__title">
                    Evidencias ({evidencias.length})
                  </h3>
                  {evidencias.length === 0 ? (
                    <p className="detail-empty-text">No se adjuntaron evidencias.</p>
                  ) : (
                    <div className="evidence-grid">
                      {evidencias.map((file, idx) => (
                        <EvidenceThumb key={idx} file={file} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN — Status panel */}
              <div className="detail-right">
                <div className="card detail-card detail-status-panel">
                  <h3 className="detail-card__title">Actualizar Estado</h3>
                  <p className="detail-status-panel__sub">
                    Cambia el estado del envío y agrega notas de revisión si es necesario.
                  </p>

                  <form onSubmit={handleStatusUpdate}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="new-estado">Estado</label>
                      <select
                        id="new-estado"
                        className="form-input"
                        value={newEstado}
                        onChange={(e) => setNewEstado(e.target.value)}
                        disabled={updating}
                      >
                        <option value="enviado">Enviado</option>
                        <option value="revisado">Revisado</option>
                        <option value="aprobado">Aprobado</option>
                        <option value="rechazado">Rechazado</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="notas-admin">
                        Notas del administrador
                      </label>
                      <textarea
                        id="notas-admin"
                        className="form-input"
                        rows={5}
                        placeholder="Observaciones de revisión, motivo de rechazo…"
                        value={notasAdmin}
                        onChange={(e) => setNotasAdmin(e.target.value)}
                        disabled={updating}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn-primary btn-full"
                      disabled={updating}
                    >
                      {updating ? (
                        <>
                          <span className="spinner" />
                          Actualizando…
                        </>
                      ) : (
                        'Actualizar Estado'
                      )}
                    </button>
                  </form>

                  {/* Current notas_admin display */}
                  {(submission.notas_admin || submission.admin_notes) && (
                    <div className="detail-admin-notes">
                      <p className="section-title" style={{ marginBottom: '.5rem' }}>
                        Notas guardadas
                      </p>
                      <p className="detail-admin-notes__text">
                        {submission.notas_admin || submission.admin_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick links */}
                <div className="card detail-card">
                  <h3 className="detail-card__title">Acciones</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    <Link to="/admin/submissions" className="btn-secondary btn-sm btn-full" style={{ justifyContent: 'center' }}>
                      ← Ver todos los envíos
                    </Link>
                    <Link to="/admin" className="btn-ghost btn-sm btn-full" style={{ justifyContent: 'center' }}>
                      🏠 Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{adminLayoutStyles}</style>
      <style>{`
        .detail-layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 1.5rem;
          align-items: start;
        }
        .detail-left {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .detail-right {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          position: sticky;
          top: 80px;
        }
        .detail-card {
          padding: 1.5rem;
        }
        .detail-card__title {
          font-size: .95rem;
          font-weight: 700;
          font-family: var(--font-heading);
          color: var(--green-dark);
          margin-bottom: 1rem;
          padding-bottom: .6rem;
          border-bottom: 1px solid var(--border);
        }
        .detail-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }
        .detail-header__type {
          font-size: 1.1rem;
          font-family: var(--font-heading);
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: .2rem;
        }
        .detail-header__id {
          font-size: .78rem;
          color: var(--text-muted);
          word-break: break-all;
        }
        .detail-meta {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
        }
        .detail-meta__item {
          display: flex;
          flex-direction: column;
          gap: .2rem;
        }
        .detail-meta__label {
          font-size: .75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .05em;
          color: var(--text-muted);
        }
        .detail-meta__value {
          font-size: .9rem;
          color: var(--text-primary);
          font-weight: 500;
        }
        .detail-empty-text {
          color: var(--text-muted);
          font-size: .9rem;
          font-style: italic;
        }
        .detail-observaciones {
          font-size: .9rem;
          color: var(--text-secondary);
          line-height: 1.7;
          white-space: pre-wrap;
          background: var(--green-xlight);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: .85rem 1rem;
        }
        .evidence-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: .75rem;
        }
        .evidence-thumb {
          position: relative;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 1px solid var(--border);
          aspect-ratio: 1;
          display: block;
          background: var(--green-xlight);
          transition: transform var(--transition), box-shadow var(--transition);
        }
        .evidence-thumb:hover {
          transform: scale(1.03);
          box-shadow: var(--shadow);
        }
        .evidence-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .evidence-thumb__overlay {
          position: absolute;
          inset: 0;
          background: rgba(29,107,62,.75);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .8rem;
          font-weight: 600;
          opacity: 0;
          transition: opacity var(--transition);
        }
        .evidence-thumb:hover .evidence-thumb__overlay {
          opacity: 1;
        }
        .evidence-file {
          display: flex;
          align-items: center;
          gap: .75rem;
          background: var(--green-xlight);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: .75rem 1rem;
          text-decoration: none;
          transition: border-color var(--transition), background var(--transition);
        }
        .evidence-file:hover {
          border-color: var(--green-mid);
          background: var(--green-light);
        }
        .evidence-file__icon {
          font-size: 1.4rem;
          flex-shrink: 0;
        }
        .evidence-file__info {
          display: flex;
          flex-direction: column;
          gap: .1rem;
          min-width: 0;
        }
        .evidence-file__name {
          font-size: .85rem;
          font-weight: 500;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .evidence-file__link {
          font-size: .75rem;
          color: var(--green-dark);
        }
        .detail-status-panel__sub {
          font-size: .85rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
          margin-top: -.5rem;
        }
        .detail-admin-notes {
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }
        .detail-admin-notes__text {
          font-size: .9rem;
          color: var(--text-secondary);
          background: var(--green-xlight);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: .75rem 1rem;
          white-space: pre-wrap;
          line-height: 1.6;
        }
        .detail-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 4rem 2rem;
          color: var(--text-muted);
        }
        .detail-toast {
          padding: .85rem 1.25rem;
          border-radius: var(--radius);
          font-size: .9rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: .75rem;
          animation: slideInRight .25s ease;
        }
        .detail-toast--success {
          background: var(--success-light);
          border: 1px solid var(--success-border);
          color: var(--success);
        }
        .detail-toast--error {
          background: var(--danger-light);
          border: 1px solid var(--danger-border);
          color: var(--danger);
        }
        @media (max-width: 1100px) {
          .detail-layout {
            grid-template-columns: 1fr;
          }
          .detail-right {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}
