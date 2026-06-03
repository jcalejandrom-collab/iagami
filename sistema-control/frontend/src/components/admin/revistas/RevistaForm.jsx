import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.jsx';
import { revistas as revistasApi } from '../../../services/api.js';
import { useToast } from '../../../App.jsx';

/* ============================================================
   RevistaForm — Create / Edit magazine
   ============================================================ */

const CATEGORIAS = ['Ambiental', 'Institucional', 'Educativa', 'Técnica', 'Informativa'];

function fmtFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function RevistaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  const isEdit = Boolean(id);

  // Form state
  const [form, setForm] = useState({
    titulo:            '',
    numero_edicion:    '',
    categoria:         '',
    fecha_publicacion: '',
    descripcion:       '',
    estado:            'borrador',
    destacada:         false,
  });

  // File state
  const [portadaFile, setPortadaFile]   = useState(null);
  const [portadaPreview, setPortadaPreview] = useState(null); // URL for preview
  const [pdfFile, setPdfFile]           = useState(null);

  // Existing data (edit mode)
  const [existingPortada, setExistingPortada] = useState(null);
  const [existingPdfName, setExistingPdfName] = useState(null);

  // UI
  const [loadingData, setLoadingData]   = useState(isEdit);
  const [submitting, setSubmitting]     = useState(false);
  const [errors, setErrors]             = useState({});

  const portadaInputRef = useRef(null);
  const pdfInputRef     = useRef(null);

  // Load existing data in edit mode
  useEffect(() => {
    if (!isEdit) return;
    revistasApi.getOne(id).then(({ data, error }) => {
      setLoadingData(false);
      if (error || !data) {
        addToast('Error al cargar la revista: ' + (error || 'No encontrada'), 'error');
        navigate('/admin/revistas');
        return;
      }
      const rv = data?.revista || data?.data || data;
      setForm({
        titulo:            rv.titulo            || '',
        numero_edicion:    rv.numero_edicion    || '',
        categoria:         rv.categoria         || '',
        fecha_publicacion: rv.fecha_publicacion ? rv.fecha_publicacion.slice(0, 10) : '',
        descripcion:       rv.descripcion       || '',
        estado:            rv.estado            || 'borrador',
        destacada:         Boolean(rv.destacada),
      });
      if (rv.portada_url)  setExistingPortada(rv.portada_url);
      if (rv.pdf_url || rv.archivo_url) {
        const url = rv.pdf_url || rv.archivo_url;
        const parts = url.split('/');
        setExistingPdfName(parts[parts.length - 1] || 'archivo.pdf');
      }
    });
  }, [id, isEdit, navigate, addToast]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) {
      setErrors((e) => { const n = { ...e }; delete n[name]; return n; });
    }
  }

  function handlePortadaChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPortadaFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPortadaPreview(ev.target.result);
    reader.readAsDataURL(file);
    if (errors.portada) setErrors((e) => { const n = { ...e }; delete n.portada; return n; });
  }

  function handlePdfChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPdfFile(file);
    if (errors.pdf) setErrors((e) => { const n = { ...e }; delete n.pdf; return n; });
  }

  function validate() {
    const errs = {};
    if (!form.titulo.trim())            errs.titulo = 'El título es requerido.';
    if (!form.numero_edicion.trim())    errs.numero_edicion = 'El número de edición es requerido.';
    if (!form.fecha_publicacion)        errs.fecha_publicacion = 'La fecha de publicación es requerida.';
    if (!isEdit && !portadaFile)        errs.portada = 'La portada es requerida para nuevas revistas.';
    if (!isEdit && !pdfFile)            errs.pdf = 'El PDF es requerido para nuevas revistas.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      addToast('Por favor completa los campos requeridos.', 'warning');
      return;
    }

    setSubmitting(true);

    const fd = new FormData();
    fd.append('titulo',            form.titulo.trim());
    fd.append('numero_edicion',    form.numero_edicion.trim());
    fd.append('categoria',         form.categoria.trim());
    fd.append('fecha_publicacion', form.fecha_publicacion);
    fd.append('descripcion',       form.descripcion.trim());
    fd.append('estado',            form.estado);
    fd.append('destacada',         form.destacada ? '1' : '0');
    if (portadaFile) fd.append('portada', portadaFile);
    if (pdfFile)     fd.append('pdf',     pdfFile);

    const { data, error } = isEdit
      ? await revistasApi.update(id, fd)
      : await revistasApi.create(fd);

    setSubmitting(false);

    if (error) {
      addToast('Error al guardar: ' + error, 'error');
      return;
    }

    addToast(
      isEdit ? '✅ Revista actualizada correctamente.' : '✅ Revista creada correctamente.',
      'success'
    );
    navigate('/admin/revistas');
  }

  function handleLogout() {
    logout();
    navigate('/admin/login', { replace: true });
  }

  // ── Styles ──
  const sidebarNavItem = {
    display: 'flex', alignItems: 'center', gap: '.6rem',
    padding: '.6rem .8rem', borderRadius: '8px',
    color: 'rgba(255,255,255,.75)', textDecoration: 'none',
    fontSize: '.88rem', fontWeight: 500,
  };
  const sidebarNavItemActive = {
    ...sidebarNavItem, background: 'rgba(255,255,255,.12)', color: '#fff',
  };

  const fieldStyle = {
    padding: '.6rem .85rem',
    border: '1.5px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '.9rem',
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color .2s',
  };
  const fieldErrorStyle = { ...fieldStyle, borderColor: '#dc2626' };

  const labelStyle = {
    fontSize: '.78rem', fontWeight: 600, color: '#555',
    textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '.3rem',
    display: 'block',
  };

  const fieldGroupStyle = {
    display: 'flex', flexDirection: 'column', gap: '.3rem',
  };

  const errorMsgStyle = {
    fontSize: '.75rem', color: '#dc2626', marginTop: '.15rem',
  };

  const btnPrimary = {
    padding: '.6rem 1.5rem', background: submitting ? '#8ab89e' : '#1d6b3e',
    color: '#fff', border: 'none', borderRadius: '8px',
    fontSize: '.9rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '.4rem',
    transition: 'background .2s',
  };
  const btnSecondary = {
    padding: '.6rem 1.3rem', background: 'transparent',
    color: '#666', border: '1.5px solid #ddd', borderRadius: '8px',
    fontSize: '.88rem', fontWeight: 600, cursor: 'pointer',
    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '.4rem',
  };

  if (loadingData) {
    return (
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="sidebar-brand">
            <span className="sidebar-brand__icon">🌿</span>
            <div>
              <p className="sidebar-brand__name">IAGAMI</p>
              <p className="sidebar-brand__sub">Panel Admin</p>
            </div>
          </div>
        </aside>
        <main className="admin-main">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem', color: '#555' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #d0eadb', borderTopColor: '#1d6b3e', animation: 'spin .75s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Cargando datos de la revista…
          </div>
        </main>
      </div>
    );
  }

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
          <Link to="/admin" style={sidebarNavItem}><span>🏠</span> Dashboard</Link>
          <Link to="/admin/submissions" style={sidebarNavItem}><span>📋</span> Todos los Envíos</Link>
          <Link to="/admin/submissions/reportes" style={sidebarNavItem}><span>📄</span> Reportes Diarios</Link>
          <Link to="/admin/submissions/planificaciones" style={sidebarNavItem}><span>📅</span> Planificaciones</Link>
          <Link to="/admin/revistas" style={sidebarNavItemActive}><span>📰</span> Revista Digital</Link>
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
            <h1 className="admin-topbar__title">
              {isEdit ? '✏️ Editar Revista' : '➕ Nueva Revista'}
            </h1>
            <p className="admin-topbar__sub">
              {isEdit ? `Editando: ${form.titulo || `Revista #${id}`}` : 'Completa los datos para publicar una nueva edición'}
            </p>
          </div>
          <Link to="/admin/revistas" style={btnSecondary}>
            ← Volver
          </Link>
        </header>

        <div className="admin-content">
          <form onSubmit={handleSubmit} noValidate>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 340px',
                gap: '1.5rem',
                alignItems: 'start',
              }}
            >
              {/* Left column: main fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {/* Card: basic info */}
                <div
                  style={{
                    background: '#fff', borderRadius: '14px',
                    padding: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,.06)',
                  }}
                >
                  <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: '#1d6b3e', marginBottom: '1.2rem', borderBottom: '1px solid #edf4ef', paddingBottom: '.7rem' }}>
                    📝 Información General
                  </h3>

                  {/* Título */}
                  <div style={{ ...fieldGroupStyle, marginBottom: '1rem' }}>
                    <label style={labelStyle} htmlFor="titulo">
                      Título <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      id="titulo"
                      name="titulo"
                      type="text"
                      value={form.titulo}
                      onChange={handleChange}
                      placeholder="Ej: Revista IAGAMI – Edición Ambiental 2025"
                      style={errors.titulo ? fieldErrorStyle : fieldStyle}
                    />
                    {errors.titulo && <span style={errorMsgStyle}>{errors.titulo}</span>}
                  </div>

                  {/* Edición + Categoría row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={fieldGroupStyle}>
                      <label style={labelStyle} htmlFor="numero_edicion">
                        Número de Edición <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        id="numero_edicion"
                        name="numero_edicion"
                        type="text"
                        value={form.numero_edicion}
                        onChange={handleChange}
                        placeholder="Ej: 12"
                        style={errors.numero_edicion ? fieldErrorStyle : fieldStyle}
                      />
                      {errors.numero_edicion && <span style={errorMsgStyle}>{errors.numero_edicion}</span>}
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={labelStyle} htmlFor="categoria">
                        Categoría
                      </label>
                      <input
                        id="categoria"
                        name="categoria"
                        type="text"
                        list="categoria-list"
                        value={form.categoria}
                        onChange={handleChange}
                        placeholder="Ej: Ambiental"
                        style={fieldStyle}
                      />
                      <datalist id="categoria-list">
                        {CATEGORIAS.map((c) => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                  </div>

                  {/* Fecha */}
                  <div style={{ ...fieldGroupStyle, marginBottom: '1rem' }}>
                    <label style={labelStyle} htmlFor="fecha_publicacion">
                      Fecha de Publicación <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      id="fecha_publicacion"
                      name="fecha_publicacion"
                      type="date"
                      value={form.fecha_publicacion}
                      onChange={handleChange}
                      style={errors.fecha_publicacion ? fieldErrorStyle : { ...fieldStyle, maxWidth: '220px' }}
                    />
                    {errors.fecha_publicacion && <span style={errorMsgStyle}>{errors.fecha_publicacion}</span>}
                  </div>

                  {/* Descripción */}
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle} htmlFor="descripcion">Descripción</label>
                    <textarea
                      id="descripcion"
                      name="descripcion"
                      rows={4}
                      value={form.descripcion}
                      onChange={handleChange}
                      placeholder="Describe brevemente el contenido de esta edición…"
                      style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.6 }}
                    />
                  </div>
                </div>

                {/* Card: PDF */}
                <div
                  style={{
                    background: '#fff', borderRadius: '14px',
                    padding: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,.06)',
                  }}
                >
                  <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: '#1d6b3e', marginBottom: '1.2rem', borderBottom: '1px solid #edf4ef', paddingBottom: '.7rem' }}>
                    📄 Archivo PDF
                  </h3>

                  {/* Existing PDF info */}
                  {isEdit && existingPdfName && !pdfFile && (
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: '.7rem',
                        background: '#f0f8f3', border: '1px solid #c8e6d4',
                        borderRadius: '8px', padding: '.75rem 1rem', marginBottom: '1rem',
                      }}
                    >
                      <span style={{ fontSize: '1.4rem' }}>📄</span>
                      <div>
                        <div style={{ fontSize: '.83rem', fontWeight: 600, color: '#1a1a1a' }}>
                          {existingPdfName}
                        </div>
                        <div style={{ fontSize: '.74rem', color: '#888' }}>PDF actual • Sube un nuevo archivo para reemplazarlo</div>
                      </div>
                    </div>
                  )}

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle} htmlFor="pdf-input">
                      {isEdit ? 'Nuevo PDF (opcional)' : <>Archivo PDF <span style={{ color: '#dc2626' }}>*</span></>}
                    </label>
                    <div
                      style={{
                        border: `2px dashed ${errors.pdf ? '#dc2626' : '#c8e6d4'}`,
                        borderRadius: '10px', padding: '1.5rem',
                        textAlign: 'center', cursor: 'pointer',
                        background: '#f9fdf9', transition: 'border-color .2s',
                      }}
                      onClick={() => pdfInputRef.current?.click()}
                    >
                      <input
                        ref={pdfInputRef}
                        id="pdf-input"
                        type="file"
                        accept=".pdf,application/pdf"
                        style={{ display: 'none' }}
                        onChange={handlePdfChange}
                      />
                      {pdfFile ? (
                        <div>
                          <div style={{ fontSize: '2rem', marginBottom: '.4rem' }}>📄</div>
                          <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '.9rem', marginBottom: '.2rem' }}>
                            {pdfFile.name}
                          </div>
                          <div style={{ fontSize: '.78rem', color: '#888' }}>{fmtFileSize(pdfFile.size)}</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '2rem', marginBottom: '.4rem', color: '#b8d8c4' }}>📁</div>
                          <div style={{ fontSize: '.88rem', color: '#666' }}>
                            Haz clic para seleccionar un PDF
                          </div>
                          <div style={{ fontSize: '.75rem', color: '#aaa', marginTop: '.25rem' }}>
                            Solo archivos .pdf
                          </div>
                        </div>
                      )}
                    </div>
                    {errors.pdf && <span style={errorMsgStyle}>{errors.pdf}</span>}
                    {pdfFile && (
                      <button
                        type="button"
                        onClick={() => { setPdfFile(null); pdfInputRef.current.value = ''; }}
                        style={{ fontSize: '.75rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', marginTop: '.25rem' }}
                      >
                        ✕ Quitar selección
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column: portada + estado */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {/* Card: Portada */}
                <div
                  style={{
                    background: '#fff', borderRadius: '14px',
                    padding: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,.06)',
                  }}
                >
                  <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: '#1d6b3e', marginBottom: '1.2rem', borderBottom: '1px solid #edf4ef', paddingBottom: '.7rem' }}>
                    🖼 Portada
                  </h3>

                  {/* Preview */}
                  <div
                    style={{
                      width: '100%', aspectRatio: '3/4', borderRadius: '10px',
                      overflow: 'hidden', background: 'linear-gradient(135deg,#e8f3ec,#d0eadb)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '1rem', cursor: 'pointer', position: 'relative',
                      border: `2px dashed ${errors.portada ? '#dc2626' : '#c8e6d4'}`,
                    }}
                    onClick={() => portadaInputRef.current?.click()}
                  >
                    <input
                      ref={portadaInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handlePortadaChange}
                    />
                    {portadaPreview ? (
                      <img
                        src={portadaPreview}
                        alt="Preview portada"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : existingPortada ? (
                      <img
                        src={existingPortada}
                        alt="Portada actual"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#b8d8c4' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>📷</div>
                        <div style={{ fontSize: '.8rem', color: '#aaa' }}>Clic para subir portada</div>
                      </div>
                    )}
                    {/* Overlay on hover */}
                    <div
                      style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity .2s',
                        color: '#fff', fontSize: '.85rem', fontWeight: 600,
                        borderRadius: '8px',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                    >
                      📷 Cambiar imagen
                    </div>
                  </div>

                  {errors.portada && <span style={{ ...errorMsgStyle, display: 'block', marginBottom: '.5rem' }}>{errors.portada}</span>}

                  <button
                    type="button"
                    onClick={() => portadaInputRef.current?.click()}
                    style={{
                      width: '100%', padding: '.5rem',
                      border: '1.5px solid #c8e6d4', borderRadius: '8px',
                      background: '#f9fdf9', color: '#1d6b3e', fontWeight: 600,
                      cursor: 'pointer', fontSize: '.83rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem',
                    }}
                  >
                    📁 {portadaPreview || existingPortada ? 'Cambiar portada' : 'Seleccionar imagen'}
                  </button>
                  {portadaFile && (
                    <div style={{ fontSize: '.73rem', color: '#888', marginTop: '.4rem', textAlign: 'center' }}>
                      {portadaFile.name} ({fmtFileSize(portadaFile.size)})
                    </div>
                  )}
                </div>

                {/* Card: Estado & Opciones */}
                <div
                  style={{
                    background: '#fff', borderRadius: '14px',
                    padding: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,.06)',
                  }}
                >
                  <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: '#1d6b3e', marginBottom: '1.2rem', borderBottom: '1px solid #edf4ef', paddingBottom: '.7rem' }}>
                    ⚙️ Publicación
                  </h3>

                  {/* Estado */}
                  <div style={{ ...fieldGroupStyle, marginBottom: '1.2rem' }}>
                    <label style={labelStyle} htmlFor="estado">Estado</label>
                    <select
                      id="estado"
                      name="estado"
                      value={form.estado}
                      onChange={handleChange}
                      style={fieldStyle}
                    >
                      <option value="borrador">📝 Borrador</option>
                      <option value="publicada">✅ Publicada</option>
                    </select>
                    <span style={{ fontSize: '.73rem', color: '#999' }}>
                      {form.estado === 'publicada'
                        ? 'Visible públicamente en /revistas'
                        : 'No visible para el público'}
                    </span>
                  </div>

                  {/* Destacada */}
                  <label
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '.7rem',
                      cursor: 'pointer', padding: '.8rem', borderRadius: '10px',
                      border: `1.5px solid ${form.destacada ? '#1d6b3e' : '#e0e0e0'}`,
                      background: form.destacada ? '#f0f8f3' : '#fafafa',
                      transition: 'border-color .2s, background .2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      name="destacada"
                      checked={form.destacada}
                      onChange={handleChange}
                      style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#1d6b3e', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#1a1a1a' }}>
                        ⭐ Marcar como destacada
                      </div>
                      <div style={{ fontSize: '.75rem', color: '#888', marginTop: '2px', lineHeight: 1.4 }}>
                        Aparecerá de forma prominente en la portada de revistas.
                      </div>
                    </div>
                  </label>
                </div>

                {/* Submit buttons */}
                <div
                  style={{
                    background: '#fff', borderRadius: '14px',
                    padding: '1.2rem 1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,.06)',
                    display: 'flex', flexDirection: 'column', gap: '.7rem',
                  }}
                >
                  <button type="submit" style={btnPrimary} disabled={submitting}>
                    {submitting
                      ? <><span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', animation: 'spin .6s linear infinite', display: 'inline-block' }} /> Guardando…</>
                      : isEdit ? '💾 Guardar cambios' : '🚀 Crear revista'}
                  </button>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  <Link
                    to="/admin/revistas"
                    style={{
                      ...btnSecondary, justifyContent: 'center',
                      textAlign: 'center',
                    }}
                  >
                    Cancelar
                  </Link>
                </div>
              </div>
            </div>

            {/* Mobile: responsive grid fix */}
            <style>{`
              @media (max-width: 860px) {
                form > div[style*="grid-template-columns"] {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>
          </form>
        </div>
      </main>
    </div>
  );
}
