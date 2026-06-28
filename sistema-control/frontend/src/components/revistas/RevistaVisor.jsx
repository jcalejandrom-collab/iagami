import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { revistas as revistasApi } from '../../services/api.js';
import { useToast } from '../../App.jsx';

/* ============================================================
   Styles
   ============================================================ */
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .vsr-page {
    min-height: 100vh;
    background: #f4f7f4;
    font-family: 'Segoe UI', system-ui, sans-serif;
    color: #1a1a1a;
  }

  /* ── Topbar ── */
  .vsr-topbar {
    background: #1d6b3e;
    padding: 0 2rem;
    height: 60px;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 2px 8px rgba(0,0,0,.2);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .vsr-back-btn {
    background: rgba(255,255,255,.12);
    color: #fff;
    border: 1px solid rgba(255,255,255,.25);
    padding: .4rem .9rem;
    border-radius: 7px;
    font-size: .85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background .2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: .4rem;
  }
  .vsr-back-btn:hover { background: rgba(255,255,255,.2); }
  .vsr-topbar-title {
    color: rgba(255,255,255,.85);
    font-size: .9rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }
  .vsr-topbar-logo {
    font-size: 1.4rem;
    color: #fff;
    text-decoration: none;
    font-weight: 800;
    letter-spacing: -.3px;
  }

  /* ── Main ── */
  .vsr-main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
  }

  /* ── Header section ── */
  .vsr-header {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 3px 14px rgba(0,0,0,.07);
    padding: 2rem;
    margin-bottom: 1.5rem;
    display: flex;
    gap: 2rem;
    align-items: flex-start;
  }
  .vsr-cover-wrap {
    flex-shrink: 0;
    width: 200px;
  }
  .vsr-cover {
    width: 200px;
    height: 270px;
    border-radius: 10px;
    overflow: hidden;
    background: linear-gradient(135deg, #e8f3ec, #d0eadb);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 20px rgba(0,0,0,.12);
    position: relative;
  }
  .vsr-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .vsr-cover-placeholder { font-size: 5rem; color: #b8d8c4; }
  .vsr-info { flex: 1; }
  .vsr-meta-row {
    display: flex;
    gap: .5rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  .vsr-info h1 {
    font-size: clamp(1.3rem, 3vw, 1.9rem);
    font-weight: 800;
    color: #1a1a1a;
    line-height: 1.3;
    margin-bottom: .7rem;
  }
  .vsr-date {
    font-size: .85rem;
    color: #888;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: .35rem;
  }
  .vsr-description {
    font-size: .93rem;
    color: #444;
    line-height: 1.7;
    margin-bottom: 1.5rem;
  }
  .vsr-actions {
    display: flex;
    gap: .7rem;
    flex-wrap: wrap;
  }

  /* ── Stats bar ── */
  .vsr-stats {
    background: #fff;
    border-radius: 12px;
    padding: 1rem 1.5rem;
    margin-bottom: 1.5rem;
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    align-items: center;
    box-shadow: 0 2px 8px rgba(0,0,0,.05);
    border: 1px solid #e8f3ec;
  }
  .vsr-stat {
    display: flex;
    align-items: center;
    gap: .5rem;
    font-size: .88rem;
    color: #555;
  }
  .vsr-stat-num {
    font-size: 1.05rem;
    font-weight: 700;
    color: #1d6b3e;
  }
  .vsr-stats-divider {
    width: 1px;
    height: 28px;
    background: #e0e8e2;
  }

  /* ── PDF Viewer ── */
  .vsr-viewer-section {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 3px 14px rgba(0,0,0,.07);
    overflow: hidden;
  }
  .vsr-viewer-header {
    padding: 1.2rem 1.5rem;
    border-bottom: 1px solid #edf4ef;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: .7rem;
  }
  .vsr-viewer-title {
    font-size: 1rem;
    font-weight: 700;
    color: #1d6b3e;
    display: flex;
    align-items: center;
    gap: .5rem;
  }
  .vsr-viewer-btns {
    display: flex;
    gap: .6rem;
    flex-wrap: wrap;
  }
  .vsr-iframe-wrap {
    padding: 0;
    background: #2a2a2a;
  }
  .vsr-iframe-wrap iframe {
    display: block;
    width: 100%;
    height: 720px;
    border: none;
  }
  .vsr-mobile-note {
    display: none;
    background: #fef9c3;
    border: 1px solid #fde047;
    border-radius: 8px;
    padding: .8rem 1rem;
    margin: 1rem 1.5rem;
    font-size: .82rem;
    color: #713f12;
    align-items: center;
    gap: .5rem;
  }

  /* ── Responsive ── */
  @media (max-width: 720px) {
    .vsr-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .vsr-cover-wrap { width: 160px; }
    .vsr-cover { width: 160px; height: 216px; }
    .vsr-meta-row { justify-content: center; }
    .vsr-actions { justify-content: center; }
    .vsr-date { justify-content: center; }
    .vsr-mobile-note { display: flex; }
    .vsr-iframe-wrap iframe { height: 500px; }
    .vsr-main { padding: 1.2rem 1rem 3rem; }
    .vsr-topbar { padding: 0 1rem; }
    .vsr-stats { gap: 1rem; }
  }

  /* ── Badge ── */
  .badge {
    display: inline-flex;
    align-items: center;
    font-size: .72rem;
    font-weight: 600;
    padding: .2rem .6rem;
    border-radius: 20px;
    letter-spacing: .3px;
  }
  .badge-green { background: #d0eadb; color: #1d6b3e; }
  .badge-blue  { background: #dbeafe; color: #1d4ed8; }
  .badge-gray  { background: #f0f0f0; color: #555; }

  /* ── Buttons ── */
  .btn-primary {
    padding: .55rem 1.2rem;
    background: #1d6b3e;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: .88rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    transition: background .2s;
    text-decoration: none;
    white-space: nowrap;
  }
  .btn-primary:hover { background: #155230; }
  .btn-primary:disabled { background: #8ab89e; cursor: not-allowed; }

  .btn-outline {
    padding: .55rem 1.2rem;
    background: transparent;
    color: #1d6b3e;
    border: 1.5px solid #1d6b3e;
    border-radius: 8px;
    font-size: .88rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    transition: background .2s, color .2s;
    text-decoration: none;
    white-space: nowrap;
  }
  .btn-outline:hover { background: #1d6b3e; color: #fff; }
  .btn-outline:disabled { opacity: .5; cursor: not-allowed; }

  .btn-ghost {
    padding: .5rem 1rem;
    background: transparent;
    color: #888;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: .85rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    transition: border-color .2s, color .2s;
  }
  .btn-ghost:hover { border-color: #1d6b3e; color: #1d6b3e; }

  /* ── Loading ── */
  .vsr-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5rem 2rem;
    gap: 1rem;
    color: #555;
  }
  .vsr-spinner {
    width: 44px;
    height: 44px;
    border: 4px solid #d0eadb;
    border-top-color: #1d6b3e;
    border-radius: 50%;
    animation: spin .75s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Error ── */
  .vsr-error {
    text-align: center;
    padding: 5rem 2rem;
    color: #666;
  }
  .vsr-error-icon { font-size: 3.5rem; margin-bottom: 1rem; }
  .vsr-error h2 { font-size: 1.2rem; color: #333; margin-bottom: .5rem; }
  .vsr-error p { font-size: .9rem; margin-bottom: 1.5rem; }

  /* ── Skeleton ── */
  .skeleton {
    background: linear-gradient(90deg, #e8f0ea 25%, #f4f9f5 50%, #e8f0ea 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 8px;
  }
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

/* ============================================================
   Helper: format date
   ============================================================ */
function fmtDate(str) {
  if (!str) return '';
  try {
    return new Date(str).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return str;
  }
}

function fmtNum(n) {
  if (n === undefined || n === null) return '0';
  return Number(n).toLocaleString('es-ES');
}

/* Devuelve la URL solo si apunta a un dominio autorizado o es una ruta
   relativa del mismo origen. Rechaza esquemas peligrosos (javascript:,
   data:) y dominios externos desconocidos. */
const ALLOWED_PDF_HOSTS = ['api.iagami.online', window.location.hostname];
function safePdfUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const s = url.trim();
  if (/^\//.test(s)) return s; // relative path — same origin
  try {
    const parsed = new URL(s);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    if (!ALLOWED_PDF_HOSTS.includes(parsed.hostname)) return null;
    return s;
  } catch {
    return null;
  }
}

/* ============================================================
   Loading skeleton
   ============================================================ */
function LoadingSkeleton() {
  return (
    <div className="vsr-main">
      <div className="vsr-header">
        <div className="vsr-cover-wrap">
          <div className="skeleton" style={{ width: '200px', height: '270px', borderRadius: '10px' }} />
        </div>
        <div className="vsr-info" style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
          <div className="skeleton" style={{ height: '14px', width: '30%' }} />
          <div className="skeleton" style={{ height: '28px', width: '80%' }} />
          <div className="skeleton" style={{ height: '18px', width: '50%' }} />
          <div className="skeleton" style={{ height: '14px', width: '100%' }} />
          <div className="skeleton" style={{ height: '14px', width: '90%' }} />
          <div className="skeleton" style={{ height: '14px', width: '75%' }} />
          <div style={{ display: 'flex', gap: '.7rem', marginTop: '.5rem' }}>
            <div className="skeleton" style={{ height: '38px', width: '130px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ height: '38px', width: '130px', borderRadius: '8px' }} />
          </div>
        </div>
      </div>
      <div className="skeleton" style={{ height: '60px', borderRadius: '12px', marginBottom: '1.5rem' }} />
      <div className="skeleton" style={{ height: '500px', borderRadius: '16px' }} />
    </div>
  );
}

/* ============================================================
   Main component
   ============================================================ */
export default function RevistaVisor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [revista, setRevista] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('ID de revista no especificado.');
      setLoading(false);
      return;
    }

    setLoading(true);
    revistasApi.getOne(id).then(({ data, error: err }) => {
      setLoading(false);
      if (err) {
        setError(err);
        return;
      }
      const item = data?.revista || data?.data || data;
      if (!item || !item.id) {
        setError('Revista no encontrada.');
        return;
      }
      if (item.estado && item.estado !== 'publicada') {
        setError('Esta revista no está disponible públicamente.');
        return;
      }
      setRevista(item);
    });
  }, [id]);

  async function handleDownload() {
    if (!revista) return;
    setDownloading(true);
    const { data, error: err } = await revistasApi.descargar(revista.id);
    setDownloading(false);

    if (err || !data) {
      addToast('No se pudo obtener el PDF: ' + (err || 'Sin URL'), 'error');
      return;
    }

    const pdfUrl = data?.pdf_url || data?.url || (typeof data === 'string' ? data : null);
    if (!pdfUrl) {
      addToast('Esta revista no tiene PDF disponible.', 'warning');
      return;
    }

    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `revista-iagami-${revista.titulo || revista.id}.pdf`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Update local download count optimistically
    setRevista((r) => ({ ...r, total_descargas: (r.total_descargas || 0) + 1 }));
    addToast('La descarga ha comenzado 📥', 'success');
  }

  function handleOpenNewTab() {
    const pdfUrl = revista?.pdf_url || revista?.archivo_url;
    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    } else {
      addToast('No hay URL de PDF disponible.', 'warning');
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="vsr-page">
        {/* Topbar */}
        <div className="vsr-topbar">
          <button className="vsr-back-btn" onClick={() => navigate('/revistas')}>
            ← Volver a Revistas
          </button>
          <div className="vsr-topbar-title">
            {revista ? revista.titulo : loading ? 'Cargando…' : 'Revista Digital'}
          </div>
          <a href="/revistas" className="vsr-topbar-logo" title="IAGAMI">🌿</a>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="vsr-main">
            <div className="vsr-error">
              <div className="vsr-error-icon">📭</div>
              <h2>No disponible</h2>
              <p>{error}</p>
              <button className="btn-primary" onClick={() => navigate('/revistas')}>
                ← Ver todas las revistas
              </button>
            </div>
          </div>
        ) : (
          <div className="vsr-main">
            {/* Header */}
            <div className="vsr-header">
              <div className="vsr-cover-wrap">
                <div className="vsr-cover">
                  {revista.portada_url ? (
                    <>
                      <img
                        src={revista.portada_url}
                        alt={`Portada ${revista.titulo}`}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div
                        className="vsr-cover-placeholder"
                        style={{ display: 'none', alignItems: 'center', justifyContent: 'center' }}
                      >
                        📰
                      </div>
                    </>
                  ) : (
                    <div className="vsr-cover-placeholder">📰</div>
                  )}
                </div>
              </div>

              <div className="vsr-info">
                <div className="vsr-meta-row">
                  {revista.categoria && (
                    <span className="badge badge-green">{revista.categoria}</span>
                  )}
                  {revista.numero_edicion && (
                    <span className="badge badge-blue">Edición Nº {revista.numero_edicion}</span>
                  )}
                  {revista.destacada && (
                    <span className="badge" style={{ background: '#fef9c3', color: '#713f12' }}>
                      ⭐ Destacada
                    </span>
                  )}
                </div>

                <h1>{revista.titulo}</h1>

                <div className="vsr-date">
                  📅 {fmtDate(revista.fecha_publicacion)}
                </div>

                {revista.descripcion && (
                  <p className="vsr-description">{revista.descripcion}</p>
                )}

                <div className="vsr-actions">
                  <button className="btn-primary" onClick={handleOpenNewTab}>
                    🔗 Abrir en nueva pestaña
                  </button>
                  <button
                    className="btn-outline"
                    onClick={handleDownload}
                    disabled={downloading}
                  >
                    {downloading ? '⏳ Descargando…' : '⬇ Descargar PDF'}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="vsr-stats">
              <div className="vsr-stat">
                <span>👁</span>
                <span><span className="vsr-stat-num">{fmtNum(revista.total_visualizaciones)}</span> visualizaciones</span>
              </div>
              <div className="vsr-stats-divider" />
              <div className="vsr-stat">
                <span>⬇</span>
                <span><span className="vsr-stat-num">{fmtNum(revista.total_descargas)}</span> descargas</span>
              </div>
              {revista.numero_edicion && (
                <>
                  <div className="vsr-stats-divider" />
                  <div className="vsr-stat">
                    <span>📋</span>
                    <span>Edición <span className="vsr-stat-num">#{revista.numero_edicion}</span></span>
                  </div>
                </>
              )}
            </div>

            {/* PDF Viewer */}
            <div className="vsr-viewer-section">
              <div className="vsr-viewer-header">
                <div className="vsr-viewer-title">📖 Leer Revista</div>
                <div className="vsr-viewer-btns">
                  <button className="btn-ghost" onClick={handleOpenNewTab}>
                    🔗 Abrir en nueva pestaña
                  </button>
                  <button
                    className="btn-outline"
                    onClick={handleDownload}
                    disabled={downloading}
                    style={{ fontSize: '.82rem', padding: '.4rem .9rem' }}
                  >
                    {downloading ? '⏳' : '⬇'} Descargar PDF
                  </button>
                </div>
              </div>

              {/* Mobile note */}
              <div className="vsr-mobile-note">
                ⚠️ En dispositivos móviles, si el PDF no carga correctamente, usa el botón "Abrir en nueva pestaña".
              </div>

              {safePdfUrl(revista.pdf_url || revista.archivo_url) ? (
                <div className="vsr-iframe-wrap">
                  <iframe
                    src={safePdfUrl(revista.pdf_url || revista.archivo_url)}
                    title={revista.titulo}
                    allow="fullscreen"
                  />
                </div>
              ) : (
                <div
                  style={{
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    color: '#888',
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '.8rem' }}>📄</div>
                  <p style={{ fontSize: '.9rem' }}>
                    El PDF de esta revista no está disponible para visualización en línea.
                    <br />
                    Puedes descargarlo usando el botón de descarga.
                  </p>
                  <button
                    className="btn-primary"
                    style={{ marginTop: '1rem' }}
                    onClick={handleDownload}
                    disabled={downloading}
                  >
                    {downloading ? '⏳ Descargando…' : '⬇ Descargar PDF'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
