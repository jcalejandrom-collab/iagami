import React, { useState } from 'react';
import DynamicList from '../shared/DynamicList.jsx';
import FileUpload from '../shared/FileUpload.jsx';
import { submissions as submissionsApi } from '../../services/api.js';

/* ============================================================
   ReporteDiario — Public form (no auth required)
   ============================================================ */

const INITIAL_FIELDS = {
  fecha: '',
  institucion: '',
  responsable: '',
  horaInicio: '',
  horaFin: '',
  observaciones: '',
};

function validate(fields, activities) {
  const errors = {};
  if (!fields.fecha)       errors.fecha       = 'La fecha es obligatoria.';
  if (!fields.institucion) errors.institucion = 'La institución es obligatoria.';
  if (!fields.responsable) errors.responsable = 'El nombre del responsable es obligatorio.';
  if (!fields.horaInicio)  errors.horaInicio  = 'La hora de inicio es obligatoria.';
  if (!fields.horaFin)     errors.horaFin     = 'La hora de finalización es obligatoria.';
  if (activities.length === 0)
    errors.activities = 'Debe agregar al menos una actividad.';
  return errors;
}

export default function ReporteDiario() {
  const [fields, setFields]         = useState(INITIAL_FIELDS);
  const [activities, setActivities] = useState([]);
  const [files, setFiles]           = useState([]);
  const [errors, setErrors]         = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [success, setSuccess]       = useState(null); // { id }

  function handleField(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGlobalError('');

    const errs = validate(fields, activities);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Scroll to first error
      const firstErrEl = document.querySelector('.form-input.error, .field-error');
      firstErrEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);

    const payload = {
      fecha:        fields.fecha,
      institucion:  fields.institucion,
      responsable:  fields.responsable,
      hora_inicio:  fields.horaInicio,
      hora_fin:     fields.horaFin,
      observaciones: fields.observaciones,
      actividades: activities.map(({ descripcion, completada }) => ({
        descripcion,
        completada: !!completada,
      })),
    };

    const { data, error } = await submissionsApi.createReporte(payload);

    if (error) {
      setGlobalError(error);
      setSubmitting(false);
      return;
    }

    const submissionId = data.id || data.submission_id || data.data?.id || '—';

    // Upload files if any
    if (files.length > 0) {
      const formData = new FormData();
      files.forEach((file) => formData.append('evidencias', file));
      const { error: uploadError } = await submissionsApi.uploadEvidences(submissionId, formData);
      if (uploadError) {
        // Non-fatal: we still show success but warn about files
        setGlobalError(`Reporte enviado, pero hubo un problema al subir archivos: ${uploadError}`);
        setSubmitting(false);
        setSuccess({ id: submissionId, uploadWarning: true });
        return;
      }
    }

    setSubmitting(false);
    setSuccess({ id: submissionId });
  }

  /* ---- Success screen ---- */
  if (success) {
    return (
      <div className="rd-page">
        <div className="rd-container">
          <div className="rd-success card">
            <div className="rd-success__icon">✅</div>
            <h2 className="rd-success__title">¡Reporte enviado exitosamente!</h2>
            <p className="rd-success__subtitle">
              Tu reporte diario de actividades ha sido registrado en el sistema de IAGAMI.
            </p>

            {success.uploadWarning && (
              <div className="alert alert-error" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                ⚠ El reporte fue guardado, pero algunos archivos no pudieron subirse. Puedes intentar reenviarlos más tarde con el ID a continuación.
              </div>
            )}

            <div className="rd-success__id-box">
              <p className="rd-success__id-label">ID de Seguimiento</p>
              <p className="rd-success__id-value font-mono">{success.id}</p>
            </div>

            <div className="rd-success__instructions">
              <p className="section-title">¿Qué sigue?</p>
              <ul className="rd-success__steps">
                <li>📋 Guarda o comparte tu ID de seguimiento con tu supervisor.</li>
                <li>🔍 El personal de IAGAMI revisará tu reporte y lo actualizará.</li>
                <li>📨 Recibirás notificación cuando el estado cambie.</li>
              </ul>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSuccess(null);
                setFields(INITIAL_FIELDS);
                setActivities([]);
                setFiles([]);
                setErrors({});
                setGlobalError('');
              }}
            >
              Enviar otro reporte
            </button>
          </div>
        </div>

        <style>{pageStyles}</style>
      </div>
    );
  }

  /* ---- Form ---- */
  return (
    <div className="rd-page">
      <div className="rd-container">
        {/* Header */}
        <header className="rd-header">
          <div className="rd-header__logo">
            <div className="rd-header__logo-mark">🌿</div>
            <div>
              <p className="rd-header__org">IAGAMI</p>
              <p className="rd-header__org-full">
                Instituto Autónomo de Gestión Ambiental del Municipio Iribarren
              </p>
            </div>
          </div>
          <div className="rd-header__title-block">
            <h1 className="rd-header__title">Reporte Diario de Actividades</h1>
            <p className="rd-header__subtitle">
              Complete todos los campos requeridos y envíe su reporte al finalizar la jornada.
            </p>
          </div>
        </header>

        {/* Form card */}
        <form className="card rd-form" onSubmit={handleSubmit} noValidate>
          {/* Global error */}
          {globalError && (
            <div className="alert alert-error mb-3" role="alert">
              <span>⚠</span>
              <span>{globalError}</span>
            </div>
          )}

          {/* Section: Información General */}
          <section className="rd-section">
            <h2 className="rd-section__title">Información General</h2>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="fecha">
                  Fecha <span className="required">*</span>
                </label>
                <input
                  id="fecha"
                  name="fecha"
                  type="date"
                  className={`form-input ${errors.fecha ? 'error' : ''}`}
                  value={fields.fecha}
                  onChange={handleField}
                  required
                />
                {errors.fecha && <span className="field-error">{errors.fecha}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="institucion">
                  Institución / Dependencia <span className="required">*</span>
                </label>
                <input
                  id="institucion"
                  name="institucion"
                  type="text"
                  className={`form-input ${errors.institucion ? 'error' : ''}`}
                  placeholder="Ej. IAGAMI — Dirección de Inspección"
                  value={fields.institucion}
                  onChange={handleField}
                  required
                />
                {errors.institucion && <span className="field-error">{errors.institucion}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="responsable">
                Responsable / Funcionario <span className="required">*</span>
              </label>
              <input
                id="responsable"
                name="responsable"
                type="text"
                className={`form-input ${errors.responsable ? 'error' : ''}`}
                placeholder="Nombre completo"
                value={fields.responsable}
                onChange={handleField}
                required
              />
              {errors.responsable && <span className="field-error">{errors.responsable}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="horaInicio">
                  Hora de Inicio <span className="required">*</span>
                </label>
                <input
                  id="horaInicio"
                  name="horaInicio"
                  type="time"
                  className={`form-input ${errors.horaInicio ? 'error' : ''}`}
                  value={fields.horaInicio}
                  onChange={handleField}
                  required
                />
                {errors.horaInicio && <span className="field-error">{errors.horaInicio}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="horaFin">
                  Hora de Finalización <span className="required">*</span>
                </label>
                <input
                  id="horaFin"
                  name="horaFin"
                  type="time"
                  className={`form-input ${errors.horaFin ? 'error' : ''}`}
                  value={fields.horaFin}
                  onChange={handleField}
                  required
                />
                {errors.horaFin && <span className="field-error">{errors.horaFin}</span>}
              </div>
            </div>
          </section>

          {/* Section: Actividades */}
          <section className="rd-section">
            <h2 className="rd-section__title">
              Actividades Realizadas <span className="required">*</span>
            </h2>
            <p className="rd-section__hint">
              Registre cada actividad realizada durante la jornada. Marque las que fueron completadas.
            </p>
            <DynamicList
              items={activities}
              onChange={setActivities}
              type="reporte"
            />
            {errors.activities && (
              <span className="field-error" style={{ marginTop: '.5rem', display: 'block' }}>
                {errors.activities}
              </span>
            )}
          </section>

          {/* Section: Observaciones */}
          <section className="rd-section">
            <h2 className="rd-section__title">Observaciones</h2>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="observaciones">
                Observaciones adicionales (opcional)
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                className="form-input"
                rows={4}
                placeholder="Novedades, inconvenientes, logros relevantes…"
                value={fields.observaciones}
                onChange={handleField}
              />
            </div>
          </section>

          {/* Section: Evidencias */}
          <section className="rd-section">
            <h2 className="rd-section__title">Evidencias (opcional)</h2>
            <p className="rd-section__hint">
              Sube fotos o documentos PDF como soporte del reporte. Máximo 5 MB por archivo.
            </p>
            <FileUpload onFilesChange={setFiles} maxSizeMB={5} />
          </section>

          {/* Submit */}
          <div className="rd-submit">
            <p className="rd-submit__note">
              <span className="required">*</span> Campos obligatorios
            </p>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner" />
                  Enviando…
                </>
              ) : (
                'Enviar Reporte'
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <footer className="rd-footer">
          <p>IAGAMI · Instituto Autónomo de Gestión Ambiental del Municipio Iribarren</p>
          <p>Sistema de Control y Seguimiento Ambiental</p>
        </footer>
      </div>

      <style>{pageStyles}</style>
    </div>
  );
}

const pageStyles = `
  .rd-page {
    min-height: 100vh;
    background: linear-gradient(160deg, #e8f5ee 0%, #f0faf5 60%, #f4faf7 100%);
    padding: 2rem 1rem 3rem;
  }
  .rd-container {
    max-width: 760px;
    margin: 0 auto;
  }
  /* Header */
  .rd-header {
    margin-bottom: 2rem;
  }
  .rd-header__logo {
    display: flex;
    align-items: center;
    gap: .85rem;
    margin-bottom: 1.25rem;
  }
  .rd-header__logo-mark {
    width: 52px;
    height: 52px;
    background: var(--green-dark);
    border-radius: var(--radius);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(29,107,62,.3);
  }
  .rd-header__org {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--green-dark);
    line-height: 1.2;
  }
  .rd-header__org-full {
    font-size: .78rem;
    color: var(--text-muted);
    line-height: 1.3;
    max-width: 280px;
  }
  .rd-header__title {
    font-size: 1.7rem;
    font-family: var(--font-heading);
    color: var(--text-primary);
    font-weight: 700;
  }
  .rd-header__subtitle {
    color: var(--text-secondary);
    font-size: .95rem;
    margin-top: .35rem;
  }
  /* Form */
  .rd-form {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .rd-section {
    padding: 1.75rem 0;
    border-bottom: 1px solid var(--border);
  }
  .rd-section:last-of-type {
    border-bottom: none;
  }
  .rd-section__title {
    font-size: 1rem;
    font-weight: 700;
    font-family: var(--font-heading);
    color: var(--green-dark);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: .4rem;
  }
  .rd-section__title .required {
    color: var(--danger);
    font-size: .85rem;
  }
  .rd-section__hint {
    font-size: .875rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
    line-height: 1.5;
  }
  /* Submit row */
  .rd-submit {
    padding-top: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .rd-submit__note {
    font-size: .8rem;
    color: var(--text-muted);
  }
  .rd-submit .btn-primary {
    min-width: 160px;
  }
  /* Footer */
  .rd-footer {
    text-align: center;
    margin-top: 2rem;
    color: var(--text-muted);
    font-size: .8rem;
    line-height: 1.7;
  }
  /* Success */
  .rd-success {
    text-align: center;
    max-width: 520px;
    margin: 3rem auto 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  .rd-success__icon {
    font-size: 3.5rem;
    line-height: 1;
  }
  .rd-success__title {
    font-size: 1.5rem;
    color: var(--success);
  }
  .rd-success__subtitle {
    color: var(--text-secondary);
    font-size: .95rem;
    max-width: 400px;
  }
  .rd-success__id-box {
    background: var(--green-light);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem 2rem;
    text-align: center;
    width: 100%;
  }
  .rd-success__id-label {
    font-size: .78rem;
    text-transform: uppercase;
    letter-spacing: .07em;
    color: var(--text-muted);
    font-weight: 700;
    margin-bottom: .35rem;
  }
  .rd-success__id-value {
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--green-dark);
    word-break: break-all;
  }
  .rd-success__instructions {
    background: var(--green-xlight);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.1rem 1.25rem;
    text-align: left;
    width: 100%;
  }
  .rd-success__steps {
    margin-top: .5rem;
    display: flex;
    flex-direction: column;
    gap: .5rem;
  }
  .rd-success__steps li {
    font-size: .9rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }
`;
