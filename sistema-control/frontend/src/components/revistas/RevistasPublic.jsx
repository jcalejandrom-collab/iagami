import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { revistas as revistasApi } from '../../services/api.js';
import { useToast } from '../../App.jsx';

/* ============================================================
   Styles
   ============================================================ */
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .rv-page {
    min-height: 100vh;
    background: #f4f7f4;
    font-family: 'Segoe UI', system-ui, sans-serif;
    color: #1a1a1a;
  }

  /* ── Navbar ── */
  .rv-nav {
    background: #1d6b3e;
    padding: 0 2rem;
    display: flex;
    align-items: center;
    gap: 1.2rem;
    height: 64px;
    box-shadow: 0 2px 8px rgba(0,0,0,.2);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .rv-nav-logo {
    width: 40px;
    height: 40px;
    background: rgba(255,255,255,.15);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
  }
  .rv-nav-brand {
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
    letter-spacing: .3px;
  }
  .rv-nav-sub {
    font-size: .75rem;
    color: rgba(255,255,255,.7);
    margin-top: 1px;
  }
  .rv-nav-spacer { flex: 1; }
  .rv-nav-back {
    color: rgba(255,255,255,.85);
    text-decoration: none;
    font-size: .85rem;
    padding: .4rem .9rem;
    border: 1px solid rgba(255,255,255,.3);
    border-radius: 6px;
    transition: background .2s;
  }
  .rv-nav-back:hover { background: rgba(255,255,255,.12); }

  /* ── Hero header ── */
  .rv-hero {
    background: linear-gradient(135deg, #1d6b3e 0%, #155230 50%, #0e3d25 100%);
    color: #fff;
    padding: 3.5rem 2rem 3rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .rv-hero::before {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 280px; height: 280px;
    background: rgba(255,255,255,.04);
    border-radius: 50%;
  }
  .rv-hero::after {
    content: '';
    position: absolute;
    bottom: -80px; left: -40px;
    width: 200px; height: 200px;
    background: rgba(255,255,255,.03);
    border-radius: 50%;
  }
  .rv-hero-icon {
    font-size: 3rem;
    margin-bottom: .8rem;
    display: block;
  }
  .rv-hero h1 {
    font-size: clamp(1.6rem, 4vw, 2.4rem);
    font-weight: 800;
    letter-spacing: -.5px;
    margin-bottom: .5rem;
  }
  .rv-hero p {
    font-size: 1rem;
    color: rgba(255,255,255,.75);
    max-width: 520px;
    margin: 0 auto;
    line-height: 1.6;
  }

  /* ── Main container ── */
  .rv-main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 4rem;
  }

  /* ── Search/filter bar ── */
  .rv-filters {
    background: #fff;
    border-radius: 14px;
    padding: 1.5rem;
    box-shadow: 0 2px 12px rgba(0,0,0,.06);
    margin-bottom: 2.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: .8rem;
    align-items: flex-end;
  }
  .rv-filter-group {
    display: flex;
    flex-direction: column;
    gap: .3rem;
    flex: 1;
    min-width: 160px;
  }
  .rv-filter-group label {
    font-size: .75rem;
    font-weight: 600;
    color: #555;
    text-transform: uppercase;
    letter-spacing: .4px;
  }
  .rv-filter-group input,
  .rv-filter-group select {
    padding: .55rem .8rem;
    border: 1.5px solid #d8e8d8;
    border-radius: 8px;
    font-size: .9rem;
    color: #1a1a1a;
    background: #f9fdf9;
    outline: none;
    transition: border-color .2s;
  }
  .rv-filter-group input:focus,
  .rv-filter-group select:focus {
    border-color: #1d6b3e;
    background: #fff;
  }
  .rv-btn-search {
    padding: .6rem 1.5rem;
    background: #1d6b3e;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: .9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background .2s, transform .1s;
    white-space: nowrap;
    align-self: flex-end;
  }
  .rv-btn-search:hover { background: #155230; }
  .rv-btn-search:active { transform: scale(.97); }
  .rv-btn-clear {
    padding: .6rem 1rem;
    background: transparent;
    color: #666;
    border: 1.5px solid #d8e8d8;
    border-radius: 8px;
    font-size: .85rem;
    cursor: pointer;
    align-self: flex-end;
    transition: border-color .2s, color .2s;
  }
  .rv-btn-clear:hover { border-color: #1d6b3e; color: #1d6b3e; }

  /* ── Section title ── */
  .rv-section-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: #1d6b3e;
    margin-bottom: 1.2rem;
    display: flex;
    align-items: center;
    gap: .5rem;
  }
  .rv-section-title::after {
    content: '';
    flex: 1;
    height: 2px;
    background: linear-gradient(to right, #1d6b3e22, transparent);
    border-radius: 2px;
    margin-left: .5rem;
  }

  /* ── Featured card ── */
  .rv-featured {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(29,107,62,.12);
    overflow: hidden;
    margin-bottom: 3rem;
    display: flex;
    gap: 0;
    border: 2px solid #d0eadb;
    position: relative;
  }
  .rv-featured-badge {
    position: absolute;
    top: 1rem;
    left: 1rem;
    background: #f59e0b;
    color: #fff;
    font-size: .72rem;
    font-weight: 700;
    padding: .25rem .65rem;
    border-radius: 20px;
    text-transform: uppercase;
    letter-spacing: .5px;
    z-index: 2;
    box-shadow: 0 2px 6px rgba(245,158,11,.3);
  }
  .rv-featured-img {
    width: 260px;
    min-height: 340px;
    flex-shrink: 0;
    object-fit: cover;
    background: #e8f3ec;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .rv-featured-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .rv-featured-img-placeholder {
    font-size: 5rem;
    color: #b8d8c4;
  }
  .rv-featured-body {
    padding: 2rem 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 1;
  }
  .rv-featured-meta {
    display: flex;
    gap: .6rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  .rv-featured-body h2 {
    font-size: 1.5rem;
    font-weight: 800;
    color: #1a1a1a;
    margin-bottom: .7rem;
    line-height: 1.3;
  }
  .rv-featured-desc {
    font-size: .95rem;
    color: #555;
    line-height: 1.65;
    margin-bottom: 1.5rem;
    flex: 1;
  }
  .rv-featured-actions {
    display: flex;
    gap: .8rem;
    flex-wrap: wrap;
  }

  /* ── Grid ── */
  .rv-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
  @media (max-width: 900px) {
    .rv-grid { grid-template-columns: repeat(2, 1fr); }
    .rv-featured { flex-direction: column; }
    .rv-featured-img { width: 100%; min-height: 220px; }
  }
  @media (max-width: 580px) {
    .rv-grid { grid-template-columns: 1fr; }
    .rv-main { padding: 1.5rem 1rem 3rem; }
    .rv-filters { flex-direction: column; }
    .rv-filter-group { min-width: unset; }
    .rv-nav { padding: 0 1rem; }
    .rv-hero { padding: 2.5rem 1rem 2rem; }
  }

  /* ── Magazine card ── */
  .rv-card {
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,.06);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform .2s, box-shadow .2s;
    border: 1px solid #edf4ef;
  }
  .rv-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 28px rgba(29,107,62,.13);
  }
  .rv-card-cover {
    height: 200px;
    background: linear-gradient(135deg, #e8f3ec, #d0eadb);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rv-card-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .rv-card-cover-placeholder {
    font-size: 4rem;
    color: #b8d8c4;
  }
  .rv-card-edition-badge {
    position: absolute;
    top: .6rem;
    right: .6rem;
    background: #1d6b3e;
    color: #fff;
    font-size: .7rem;
    font-weight: 700;
    padding: .2rem .55rem;
    border-radius: 12px;
    letter-spacing: .3px;
  }
  .rv-card-body {
    padding: 1.1rem 1.1rem .9rem;
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: .4rem;
  }
  .rv-card-title {
    font-size: .98rem;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .rv-card-date {
    font-size: .78rem;
    color: #888;
  }
  .rv-card-desc {
    font-size: .83rem;
    color: #555;
    line-height: 1.55;
    flex: 1;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .rv-card-footer {
    padding: .75rem 1.1rem 1rem;
    display: flex;
    gap: .5rem;
    flex-wrap: wrap;
    border-top: 1px solid #f0f4f0;
  }

  /* ── Badges ── */
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
    padding: .55rem 1.1rem;
    background: #1d6b3e;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: .84rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    transition: background .2s, transform .1s;
    white-space: nowrap;
  }
  .btn-primary:hover { background: #155230; }
  .btn-primary:active { transform: scale(.97); }
  .btn-primary:disabled { background: #8ab89e; cursor: not-allowed; }

  .btn-outline {
    padding: .55rem 1.1rem;
    background: transparent;
    color: #1d6b3e;
    border: 1.5px solid #1d6b3e;
    border-radius: 8px;
    font-size: .84rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    transition: background .2s, color .2s;
    white-space: nowrap;
  }
  .btn-outline:hover { background: #1d6b3e; color: #fff; }
  .btn-outline:disabled { opacity: .5; cursor: not-allowed; }

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
  .rv-card-skeleton .rv-card-cover { background: none; }

  /* ── Empty state ── */
  .rv-empty {
    text-align: center;
    padding: 4rem 2rem;
    color: #888;
  }
  .rv-empty-icon { font-size: 3.5rem; margin-bottom: 1rem; }
  .rv-empty h3 { font-size: 1.1rem; color: #555; margin-bottom: .4rem; }
  .rv-empty p { font-size: .88rem; }

  /* ── Pagination ── */
  .rv-pagination {
    display: flex;
    justify-content: center;
    gap: .6rem;
    margin-top: 2.5rem;
    flex-wrap: wrap;
  }
  .rv-pag-btn {
    padding: .5rem .9rem;
    border-radius: 8px;
    border: 1.5px solid #d0eadb;
    background: #fff;
    color: #1d6b3e;
    font-size: .85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background .2s, color .2s;
  }
  .rv-pag-btn:hover, .rv-pag-btn.active { background: #1d6b3e; color: #fff; border-color: #1d6b3e; }
  .rv-pag-btn:disabled { opacity: .4; cursor: not-allowed; }
  .rv-load-more {
    margin: 2rem auto 0;
    display: block;
    padding: .7rem 2.5rem;
    background: #fff;
    color: #1d6b3e;
    border: 2px solid #1d6b3e;
    border-radius: 10px;
    font-size: .95rem;
    font-weight: 700;
    cursor: pointer;
    transition: background .2s, color .2s;
  }
  .rv-load-more:hover { background: #1d6b3e; color: #fff; }
  .rv-load-more:disabled { opacity: .5; cursor: not-allowed; }

  /* ── Results info ── */
  .rv-results-info {
    font-size: .82rem;
    color: #888;
    margin-bottom: 1rem;
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

/* ============================================================
   Skeleton card
   ============================================================ */
function SkeletonCard() {
  return (
    <div className="rv-card rv-card-skeleton">
      <div className="rv-card-cover">
        <div className="skeleton" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="rv-card-body">
        <div className="skeleton" style={{ height: '14px', width: '40%' }} />
        <div className="skeleton" style={{ height: '18px', width: '85%' }} />
        <div className="skeleton" style={{ height: '14px', width: '60%' }} />
        <div className="skeleton" style={{ height: '12px', width: '100%', marginTop: '4px' }} />
        <div className="skeleton" style={{ height: '12px', width: '80%' }} />
      </div>
      <div className="rv-card-footer">
        <div className="skeleton" style={{ height: '32px', flex: 1 }} />
        <div className="skeleton" style={{ height: '32px', flex: 1 }} />
      </div>
    </div>
  );
}

/* ============================================================
   Magazine card
   ============================================================ */
function RevistCard({ revista, onDownload, downloading }) {
  const navigate = useNavigate();

  const truncate = (text, max = 120) =>
    text && text.length > max ? text.slice(0, max).trimEnd() + '…' : text;

  return (
    <div className="rv-card">
      <div className="rv-card-cover">
        {revista.portada_url ? (
          <img
            src={revista.portada_url}
            alt={`Portada ${revista.titulo}`}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="rv-card-cover-placeholder"
          style={{ display: revista.portada_url ? 'none' : 'flex' }}
        >
          📰
        </div>
        {revista.numero_edicion && (
          <span className="rv-card-edition-badge">Ed. {revista.numero_edicion}</span>
        )}
      </div>

      <div className="rv-card-body">
        {revista.categoria && (
          <span className="badge badge-green" style={{ alignSelf: 'flex-start' }}>
            {revista.categoria}
          </span>
        )}
        <div className="rv-card-title">{revista.titulo}</div>
        <div className="rv-card-date">📅 {fmtDate(revista.fecha_publicacion)}</div>
        {revista.descripcion && (
          <div className="rv-card-desc">{truncate(revista.descripcion)}</div>
        )}
      </div>

      <div className="rv-card-footer">
        <button
          className="btn-primary"
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => navigate(`/revista/${revista.id}`)}
        >
          👁 Ver Revista
        </button>
        <button
          className="btn-outline"
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => onDownload(revista.id, revista.titulo)}
          disabled={downloading === revista.id}
        >
          {downloading === revista.id ? '⏳' : '⬇'} Descargar
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Featured magazine
   ============================================================ */
function FeaturedRevista({ revista, onDownload, downloading }) {
  const navigate = useNavigate();

  return (
    <div>
      <div className="rv-section-title">⭐ Edición Destacada</div>
      <div className="rv-featured">
        <span className="rv-featured-badge">⭐ Destacada</span>

        <div className="rv-featured-img">
          {revista.portada_url ? (
            <img
              src={revista.portada_url}
              alt={`Portada ${revista.titulo}`}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="rv-featured-img-placeholder"
            style={{
              display: revista.portada_url ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            📰
          </div>
        </div>

        <div className="rv-featured-body">
          <div>
            <div className="rv-featured-meta">
              {revista.categoria && (
                <span className="badge badge-green">{revista.categoria}</span>
              )}
              {revista.numero_edicion && (
                <span className="badge badge-blue">Edición {revista.numero_edicion}</span>
              )}
              <span className="badge badge-gray">📅 {fmtDate(revista.fecha_publicacion)}</span>
            </div>
            <h2>{revista.titulo}</h2>
            {revista.descripcion && (
              <p className="rv-featured-desc">{revista.descripcion}</p>
            )}
          </div>
          <div className="rv-featured-actions">
            <button
              className="btn-primary"
              style={{ padding: '.65rem 1.6rem', fontSize: '.95rem' }}
              onClick={() => navigate(`/revista/${revista.id}`)}
            >
              👁 Ver Revista
            </button>
            <button
              className="btn-outline"
              style={{ padding: '.65rem 1.6rem', fontSize: '.95rem' }}
              onClick={() => onDownload(revista.id, revista.titulo)}
              disabled={downloading === revista.id}
            >
              {downloading === revista.id ? '⏳ Descargando…' : '⬇ Descargar PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Main component
   ============================================================ */
export default function RevistasPublic() {
  const { addToast } = useToast();

  // Filters
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i);

  const [search, setSearch]       = useState('');
  const [categoria, setCategoria] = useState('');
  const [anio, setAnio]           = useState('');
  const [edicion, setEdicion]     = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});

  // Data
  const [revistas, setRevistas]   = useState([]);
  const [featured, setFeatured]   = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(null);

  // Pagination
  const PAGE_SIZE = 9;
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Load categories on mount
  useEffect(() => {
    revistasApi.getCategorias().then(({ data }) => {
      if (data) {
        const list = Array.isArray(data) ? data : (data.categorias || []);
        setCategorias(list);
      }
    });
  }, []);

  // Load magazines when filters or page changes
  const fetchRevistas = useCallback(async (filters, pg) => {
    setLoading(true);
    const params = {
      ...filters,
      page: pg,
      limit: PAGE_SIZE,
    };
    const { data, error } = await revistasApi.getAll(params);
    setLoading(false);

    if (error) {
      addToast('Error al cargar las revistas: ' + error, 'error');
      return;
    }

    const list = Array.isArray(data)
      ? data
      : (data?.revistas || data?.items || data?.data || []);
    const tot = data?.total ?? data?.count ?? list.length;

    setRevistas(list);
    setTotal(tot);

    // Find featured
    const feat = list.find((r) => r.destacada);
    setFeatured(feat || null);
  }, [addToast]);

  useEffect(() => {
    fetchRevistas(appliedFilters, page);
  }, [appliedFilters, page, fetchRevistas]);

  function handleSearch() {
    const f = {};
    if (search.trim())   f.search   = search.trim();
    if (categoria)       f.categoria = categoria;
    if (anio)            f.anio     = anio;
    if (edicion.trim())  f.edicion  = edicion.trim();
    setAppliedFilters(f);
    setPage(1);
  }

  function handleClear() {
    setSearch('');
    setCategoria('');
    setAnio('');
    setEdicion('');
    setAppliedFilters({});
    setPage(1);
  }

  async function handleDownload(id, titulo) {
    setDownloading(id);
    const { data, error } = await revistasApi.descargar(id);
    setDownloading(null);

    if (error || !data) {
      addToast('No se pudo obtener el PDF: ' + (error || 'Sin URL'), 'error');
      return;
    }

    const pdfUrl = data?.pdf_url || data?.url || (typeof data === 'string' ? data : null);
    if (!pdfUrl) {
      addToast('La revista no tiene PDF disponible.', 'warning');
      return;
    }

    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `revista-iagami-${titulo || id}.pdf`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast('La descarga ha comenzado 📥', 'success');
  }

  // Magazines excluding the featured one (to avoid duplication)
  const gridRevistas = featured
    ? revistas.filter((r) => r.id !== featured.id)
    : revistas;

  return (
    <>
      <style>{CSS}</style>
      <div className="rv-page">
        {/* Navbar */}
        <nav className="rv-nav">
          <div className="rv-nav-logo">🌿</div>
          <div>
            <div className="rv-nav-brand">IAGAMI</div>
            <div className="rv-nav-sub">Revista Digital</div>
          </div>
          <div className="rv-nav-spacer" />
          <a href="/" className="rv-nav-back">← Portal Principal</a>
        </nav>

        {/* Hero */}
        <div className="rv-hero">
          <span className="rv-hero-icon">📰</span>
          <h1>Revista Digital IAGAMI</h1>
          <p>
            Publicaciones institucionales, ambientales y técnicas del Instituto IAGAMI.
            Accede a nuestro archivo de ediciones y mantente informado.
          </p>
        </div>

        <div className="rv-main">
          {/* Filters */}
          <div className="rv-filters">
            <div className="rv-filter-group" style={{ flex: 2, minWidth: '200px' }}>
              <label>🔍 Buscar</label>
              <input
                type="text"
                placeholder="Título, edición, descripción…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div className="rv-filter-group">
              <label>📂 Categoría</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                {/* Fallback defaults if API returns nothing */}
                {categorias.length === 0 && (
                  <>
                    <option value="Ambiental">Ambiental</option>
                    <option value="Institucional">Institucional</option>
                    <option value="Educativa">Educativa</option>
                    <option value="Técnica">Técnica</option>
                    <option value="Informativa">Informativa</option>
                  </>
                )}
              </select>
            </div>

            <div className="rv-filter-group">
              <label>📅 Año</label>
              <select value={anio} onChange={(e) => setAnio(e.target.value)}>
                <option value="">Todos los años</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="rv-filter-group" style={{ maxWidth: '140px' }}>
              <label>🔢 Edición</label>
              <input
                type="text"
                placeholder="Ej: 12"
                value={edicion}
                onChange={(e) => setEdicion(e.target.value)}
              />
            </div>

            <button className="rv-btn-search" onClick={handleSearch}>
              Buscar
            </button>
            {Object.keys(appliedFilters).length > 0 && (
              <button className="rv-btn-clear" onClick={handleClear}>
                ✕ Limpiar
              </button>
            )}
          </div>

          {/* Featured */}
          {!loading && featured && (
            <FeaturedRevista
              revista={featured}
              onDownload={handleDownload}
              downloading={downloading}
            />
          )}

          {/* Grid section */}
          <div className="rv-section-title">
            📚 {Object.keys(appliedFilters).length > 0 ? 'Resultados' : 'Todas las Ediciones'}
          </div>

          {total > 0 && !loading && (
            <div className="rv-results-info">
              Mostrando {revistas.length} de {total} revista{total !== 1 ? 's' : ''}
            </div>
          )}

          {loading ? (
            <div className="rv-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : gridRevistas.length === 0 && !featured ? (
            <div className="rv-empty">
              <div className="rv-empty-icon">📭</div>
              <h3>No se encontraron revistas</h3>
              <p>
                {Object.keys(appliedFilters).length > 0
                  ? 'Intenta con otros filtros de búsqueda.'
                  : 'Aún no hay revistas publicadas.'}
              </p>
              {Object.keys(appliedFilters).length > 0 && (
                <button
                  className="rv-btn-search"
                  style={{ marginTop: '1rem' }}
                  onClick={handleClear}
                >
                  Ver todas las revistas
                </button>
              )}
            </div>
          ) : (
            <div className="rv-grid">
              {gridRevistas.map((revista) => (
                <RevistCard
                  key={revista.id}
                  revista={revista}
                  onDownload={handleDownload}
                  downloading={downloading}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && !loading && (
            <div className="rv-pagination">
              <button
                className="rv-pag-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Anterior
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) {
                    acc.push('...');
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === '...' ? (
                    <span key={`e${idx}`} style={{ padding: '.5rem .4rem', color: '#888' }}>…</span>
                  ) : (
                    <button
                      key={item}
                      className={`rv-pag-btn${page === item ? ' active' : ''}`}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                className="rv-pag-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
