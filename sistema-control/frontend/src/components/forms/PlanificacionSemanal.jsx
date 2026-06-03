import React, { useState } from 'react';
import DynamicList from '../shared/DynamicList.jsx';
import { submissions as submissionsApi } from '../../services/api.js';

/* ============================================================
   PlanificacionSemanal — Public form (no auth required)
   ============================================================ */

const INITIAL_FIELDS = {
  institucion: '',
  responsable: '',
  semana: '',
};

function validate(fields, activities) {
  const errors = {};
  if (!fields.institucion) errors.institucion = 'La institución es obligatoria.';
  if (!fields.responsable) errors.responsable = 'El nombre del responsable es obligatorio.';
  if (!fields.semana)      errors.semana      = 'Debe seleccionar la semana.';
  if (activities.length === 0)
    errors.activities = 'Debe agregar al menos una actividad planificada.';
  return errors;
}

export default function PlanificacionSemanal() {
  const [fields, setFields]         = useState(INITIAL_FIELDS);
  const [activities, setActivities] = useState([]);
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
      return;
    }

    setSubmitting(true);

    const payload = {
      institucion: fields.institucion,
      responsable: fields.responsable,
      semana:      fields.semana,
      actividades: activities.map(({ dia, hora, descripcion }) => ({
        dia,
        hora,
        descripcion,
      })),
    };

    const { data, error } = await submissionsApi.createPlanificacion(payload);

    if (error) {
      setGlobalError(error);
      setSubmitting(false);
      return;
    }

    const submissionId = data.id || data.submission_id || data.data?.id || '—';
    setSubmitting(false);
    setSuccess({ id: submissionId });
  }

  /* ---- Success screen ---- */
  if (success) {
    return (
      <div className="ps-page">
        <div className="ps-container">
          <div className="ps-success card">
            <div className="ps-success__icon">✅</div>
            <h2 className="ps-success__title">¡Planificación enviada exitosamente!</h2>
            <p className="ps-success__subtitle">
              Tu planificación semanal ha sido registrada en el sistema de IAGAMI.
            </p>

            <div className="ps-success__id-box">
              <p className="ps-success__id-label">ID de Seguimiento</p>
              <p className="ps-success__id-value font-mono">{success.id}</p>
            </div>

            <div className="ps-success__instructions">
              <p className="section-title">¿Qué sigue?</p>
              <ul className="ps-success__steps">
                <li>📋 Guarda o comparte tu ID de seguimiento con tu supervisor.</li>
                <li>🔍 El personal de IAGAMI revisará la planificación y la actualizará.</li>
                <li>📅 Asegúrate de cumplir las actividades planificadas durante la semana.</li>
              </ul>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSuccess(null);
                setFields(INITIAL_FIELDS);
                setActivities([]);
                setErrors({});
                setGlobalError('');
              }}
            >
              Enviar otra planificación
            </button>
          </div>
        </div>

        <style>{pageStyles}</style>
      </div>
    );
  }

  /* ---- Form ---- */
  return (
    <div className="ps-page">
      <div className="ps-container">
        {/* Header */}
        <header className="ps-header">
          <div className="ps-header__logo">
            <div className="ps-header__logo-mark">🌿</div>
            <div>
              <p className="ps-header__org">IAGAMI</p>
              <p className="ps-header__org-full">
                Instituto Autónomo de Gestión Ambiental del Municipio Iribarren
              </p>
            </div>
          </div>
          <div className="ps-header__title-block">
            <h1 className="ps-header__title">Planificación Semanal de Actividades</h1>
            <p className="ps-header__subtitle">
              Registre las actividades planificadas para la semana. Incluya día, hora y descripción de cada actividad.
            </p>
          </div>
        </header>

        {/* Form card */}
        <form className="card ps-form" onSubmit={handleSubmit} noValidate>
          {/* Global error */}
          {globalError && (
            <div className="alert alert-error mb-3" role="alert">
              <span>⚠</span>
              <span>{globalError}</span>
            </div>
          )}

          {/* Section: Información General */}
          <section className="ps-section">
            <h2 className="ps-section__title">Información General</h2>

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

            <div className="form-row">
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

              <div className="form-group">
                <label className="form-label" htmlFor="semana">
                  Semana <span className="required">*</span>
                </label>
                <input
                  id="semana"
                  name="semana"
                  type="week"
                  className={`form-input ${errors.semana ? 'error' : ''}`}
                  value={fields.semana}
                  onChange={handleField}
                  required
                />
                {errors.semana && <span className="field-error">{errors.semana}</span>}
              </div>
            </div>
          </section>

          {/* Section: Actividades */}
          <section className="ps-section">
            <h2 className="ps-section__title">
              Actividades Planificadas <span className="required">*</span>
            </h2>
            <p className="ps-section__hint">
              Agregue cada actividad con su día, hora estimada y descripción. Puede reordenarlas según la prioridad.
            </p>
            <DynamicList
              items={activities}
              onChange={setActivities}
              type="planificacion"
            />
            {errors.activities && (
              <span className="field-error" style={{ marginTop: '.5rem', display: 'block' }}>
                {errors.activities}
              </span>
            )}
          </section>

          {/* Submit */}
          <div className="ps-submit">
            <p className="ps-submit__note">
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
                'Enviar Planificación'
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <footer className="ps-footer">
          <p>IAGAMI · Instituto Autónomo de Gestión Ambiental del Municipio Iribarren</p>
          <p>Sistema de Control y Seguimiento Ambiental</p>
        </footer>
      </div>

      <style>{pageStyles}</style>
    </div>
  );
}

const pageStyles = `
  .ps-page {
    min-height: 100vh;
    background: linear-gradient(160deg, #e8f5ee 0%, #f0faf5 60%, #f4faf7 100%);
    padding: 2rem 1rem 3rem;
  }
  .ps-container {
    max-width: 760px;
    margin: 0 auto;
  }
  /* Header */
  .ps-header {
    margin-bottom: 2rem;
  }
  .ps-header__logo {
    display: flex;
    align-items: center;
    gap: .85rem;
    margin-bottom: 1.25rem;
  }
  .ps-header__logo-mark {
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
  .ps-header__org {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--green-dark);
    line-height: 1.2;
  }
  .ps-header__org-full {
    font-size: .78rem;
    color: var(--text-muted);
    line-height: 1.3;
    max-width: 280px;
  }
  .ps-header__title {
    font-size: 1.7rem;
    font-family: var(--font-heading);
    color: var(--text-primary);
    font-weight: 700;
  }
  .ps-header__subtitle {
    color: var(--text-secondary);
    font-size: .95rem;
    margin-top: .35rem;
  }
  /* Form */
  .ps-form {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .ps-section {
    padding: 1.75rem 0;
    border-bottom: 1px solid var(--border);
  }
  .ps-section:last-of-type {
    border-bottom: none;
  }
  .ps-section__title {
    font-size: 1rem;
    font-weight: 700;
    font-family: var(--font-heading);
    color: var(--green-dark);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: .4rem;
  }
  .ps-section__title .required {
    color: var(--danger);
    font-size: .85rem;
  }
  .ps-section__hint {
    font-size: .875rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
    line-height: 1.5;
  }
  /* Submit row */
  .ps-submit {
    padding-top: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .ps-submit__note {
    font-size: .8rem;
    color: var(--text-muted);
  }
  .ps-submit .btn-primary {
    min-width: 180px;
  }
  /* Footer */
  .ps-footer {
    text-align: center;
    margin-top: 2rem;
    color: var(--text-muted);
    font-size: .8rem;
    line-height: 1.7;
  }
  /* Success */
  .ps-success {
    text-align: center;
    max-width: 520px;
    margin: 3rem auto 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  .ps-success__icon {
    font-size: 3.5rem;
    line-height: 1;
  }
  .ps-success__title {
    font-size: 1.5rem;
    color: var(--success);
  }
  .ps-success__subtitle {
    color: var(--text-secondary);
    font-size: .95rem;
    max-width: 400px;
  }
  .ps-success__id-box {
    background: var(--green-light);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem 2rem;
    text-align: center;
    width: 100%;
  }
  .ps-success__id-label {
    font-size: .78rem;
    text-transform: uppercase;
    letter-spacing: .07em;
    color: var(--text-muted);
    font-weight: 700;
    margin-bottom: .35rem;
  }
  .ps-success__id-value {
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--green-dark);
    word-break: break-all;
  }
  .ps-success__instructions {
    background: var(--green-xlight);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.1rem 1.25rem;
    text-align: left;
    width: 100%;
  }
  .ps-success__steps {
    margin-top: .5rem;
    display: flex;
    flex-direction: column;
    gap: .5rem;
  }
  .ps-success__steps li {
    font-size: .9rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }
`;
