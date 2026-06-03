import React from 'react';

/* ============================================================
   DynamicList — Reusable dynamic activity list
   Props:
     items      : array of item objects
     onChange   : (newItems) => void
     type       : 'reporte' | 'planificacion'
   ============================================================ */

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function makeItem(type) {
  if (type === 'reporte') {
    return { id: Date.now() + Math.random(), descripcion: '', completada: false };
  }
  return { id: Date.now() + Math.random(), dia: 'Lunes', hora: '', descripcion: '' };
}

export default function DynamicList({ items = [], onChange, type = 'reporte' }) {
  function add() {
    onChange([...items, makeItem(type)]);
  }

  function remove(id) {
    onChange(items.filter((it) => it.id !== id));
  }

  function update(id, field, value) {
    onChange(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }

  return (
    <div className="dynamic-list">
      {items.length === 0 && (
        <p className="dynamic-list__empty">
          No hay actividades. Haz clic en &quot;+ Agregar&quot; para añadir una.
        </p>
      )}

      {items.map((item, idx) => (
        <div key={item.id} className="dynamic-list__item">
          <span className="dynamic-list__index">{idx + 1}</span>

          {type === 'reporte' ? (
            <div className="dynamic-list__fields">
              <label className="dynamic-list__check-label">
                <input
                  type="checkbox"
                  className="dynamic-list__checkbox"
                  checked={!!item.completada}
                  onChange={(e) => update(item.id, 'completada', e.target.checked)}
                />
                <span className="dynamic-list__check-text">Completada</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Descripción de la actividad…"
                value={item.descripcion}
                onChange={(e) => update(item.id, 'descripcion', e.target.value)}
              />
            </div>
          ) : (
            <div className="dynamic-list__fields dynamic-list__fields--planificacion">
              <select
                className="form-input dynamic-list__dia"
                value={item.dia}
                onChange={(e) => update(item.id, 'dia', e.target.value)}
              >
                {DIAS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <input
                type="time"
                className="form-input dynamic-list__hora"
                value={item.hora}
                onChange={(e) => update(item.id, 'hora', e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Descripción de la actividad…"
                value={item.descripcion}
                onChange={(e) => update(item.id, 'descripcion', e.target.value)}
              />
            </div>
          )}

          <button
            type="button"
            className="dynamic-list__remove"
            onClick={() => remove(item.id)}
            title="Eliminar actividad"
            aria-label="Eliminar actividad"
          >
            ×
          </button>
        </div>
      ))}

      <button type="button" className="btn-secondary btn-sm dynamic-list__add" onClick={add}>
        + Agregar actividad
      </button>

      <style>{`
        .dynamic-list {
          display: flex;
          flex-direction: column;
          gap: .75rem;
        }
        .dynamic-list__empty {
          color: var(--text-muted);
          font-size: .9rem;
          font-style: italic;
          padding: .75rem 0;
        }
        .dynamic-list__item {
          display: flex;
          align-items: flex-start;
          gap: .75rem;
          background: var(--green-xlight);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: .75rem 1rem;
        }
        .dynamic-list__index {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--green-dark);
          color: white;
          font-size: .75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: .5rem;
        }
        .dynamic-list__fields {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: .5rem;
        }
        .dynamic-list__fields--planificacion {
          flex-direction: row;
          flex-wrap: wrap;
          align-items: center;
        }
        .dynamic-list__fields--planificacion .form-input:last-child {
          flex: 1;
          min-width: 180px;
        }
        .dynamic-list__dia {
          width: 130px;
          flex-shrink: 0;
        }
        .dynamic-list__hora {
          width: 120px;
          flex-shrink: 0;
        }
        .dynamic-list__check-label {
          display: flex;
          align-items: center;
          gap: .5rem;
          cursor: pointer;
          user-select: none;
        }
        .dynamic-list__checkbox {
          width: 16px;
          height: 16px;
          accent-color: var(--green-dark);
          cursor: pointer;
          flex-shrink: 0;
        }
        .dynamic-list__check-text {
          font-size: .825rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .dynamic-list__remove {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1.4rem;
          line-height: 1;
          cursor: pointer;
          padding: .1rem .3rem;
          border-radius: var(--radius-sm);
          transition: color var(--transition), background var(--transition);
          flex-shrink: 0;
          margin-top: .15rem;
        }
        .dynamic-list__remove:hover {
          color: var(--danger);
          background: var(--danger-light);
        }
        .dynamic-list__add {
          align-self: flex-start;
          margin-top: .25rem;
        }
        @media (max-width: 600px) {
          .dynamic-list__fields--planificacion {
            flex-direction: column;
          }
          .dynamic-list__dia,
          .dynamic-list__hora {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
