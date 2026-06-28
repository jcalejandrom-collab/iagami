import React, { useRef, useState, useCallback } from 'react';

/* ============================================================
   FileUpload — Drag-and-drop + click file upload component
   Props:
     onFilesChange : (files: File[]) => void
     maxSizeMB     : number (default 5)
   ============================================================ */

export default function FileUpload({ onFilesChange, maxSizeMB = 5, maxFiles = 10 }) {
  const [files, setFiles]       = useState([]);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors]     = useState([]);
  const inputRef                = useRef(null);

  const maxBytes = maxSizeMB * 1024 * 1024;

  const processFiles = useCallback(
    (incoming) => {
      const newErrors = [];
      const valid     = [];

      Array.from(incoming).forEach((file) => {
        const isImage = file.type.startsWith('image/');
        const isPdf   = file.type === 'application/pdf';
        if (!isImage && !isPdf) {
          newErrors.push(`"${file.name}" no es una imagen ni PDF.`);
          return;
        }
        if (file.size > maxBytes) {
          newErrors.push(
            `"${file.name}" supera el límite de ${maxSizeMB} MB (${formatSize(file.size)}).`
          );
          return;
        }
        valid.push(file);
      });

      setErrors(newErrors);

      if (valid.length > 0) {
        setFiles((prev) => {
          const remaining = maxFiles - prev.length;
          if (remaining <= 0) {
            setErrors((e) => [...e, `Límite de ${maxFiles} archivos alcanzado.`]);
            return prev;
          }
          const combined = [...prev, ...valid.slice(0, remaining)];
          if (valid.length > remaining) {
            setErrors((e) => [...e, `Solo se agregaron ${remaining} archivo(s). Límite: ${maxFiles}.`]);
          }
          onFilesChange(combined);
          return combined;
        });
      }
    },
    [maxBytes, maxSizeMB, maxFiles, onFilesChange]
  );

  function removeFile(index) {
    setFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onFilesChange(updated);
      return updated;
    });
  }

  function handleInputChange(e) {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset input so same file can be re-selected
      e.target.value = '';
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function fileIcon(file) {
    if (file.type === 'application/pdf') return '📄';
    if (file.type.startsWith('image/'))  return '🖼️';
    return '📎';
  }

  return (
    <div className="file-upload">
      {/* Drop Zone */}
      <div
        className={`file-upload__zone ${dragging ? 'file-upload__zone--dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Zona de carga de archivos"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        <div className="file-upload__icon">
          {dragging ? '📂' : '📁'}
        </div>
        <p className="file-upload__main-text">
          {dragging
            ? 'Suelta los archivos aquí'
            : 'Arrastra archivos aquí o haz clic para seleccionar'}
        </p>
        <p className="file-upload__sub-text">
          Imágenes (JPG, PNG, WEBP) y PDF · Máximo {maxSizeMB} MB por archivo · Hasta {maxFiles} archivos
        </p>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="file-upload__errors">
          {errors.map((err, i) => (
            <p key={i} className="file-upload__error-item">⚠ {err}</p>
          ))}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="file-upload__list">
          {files.map((file, idx) => (
            <li key={`${file.name}-${file.size}-${idx}`} className="file-upload__file">
              <span className="file-upload__file-icon">{fileIcon(file)}</span>
              <div className="file-upload__file-info">
                <span className="file-upload__file-name">{file.name}</span>
                <span className="file-upload__file-size">{formatSize(file.size)}</span>
              </div>
              <button
                type="button"
                className="file-upload__remove"
                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                title="Eliminar archivo"
                aria-label={`Eliminar ${file.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .file-upload {
          display: flex;
          flex-direction: column;
          gap: .75rem;
        }
        .file-upload__zone {
          border: 2px dashed var(--border-dark);
          border-radius: var(--radius);
          padding: 2rem 1.5rem;
          text-align: center;
          cursor: pointer;
          background: var(--green-xlight);
          transition: border-color var(--transition), background var(--transition), transform var(--transition);
          user-select: none;
        }
        .file-upload__zone:hover,
        .file-upload__zone:focus-visible {
          border-color: var(--green-mid);
          background: var(--green-light);
          outline: none;
        }
        .file-upload__zone--dragging {
          border-color: var(--green-dark);
          background: var(--green-light);
          transform: scale(1.01);
        }
        .file-upload__icon {
          font-size: 2.2rem;
          margin-bottom: .75rem;
          transition: transform .15s;
        }
        .file-upload__zone--dragging .file-upload__icon {
          transform: scale(1.15);
        }
        .file-upload__main-text {
          font-weight: 600;
          color: var(--text-secondary);
          font-size: .95rem;
          margin-bottom: .3rem;
        }
        .file-upload__sub-text {
          color: var(--text-muted);
          font-size: .8rem;
        }
        .file-upload__errors {
          background: var(--danger-light);
          border: 1px solid var(--danger-border);
          border-radius: var(--radius-sm);
          padding: .75rem 1rem;
        }
        .file-upload__error-item {
          font-size: .85rem;
          color: var(--danger);
          margin: .2rem 0;
        }
        .file-upload__list {
          display: flex;
          flex-direction: column;
          gap: .4rem;
        }
        .file-upload__file {
          display: flex;
          align-items: center;
          gap: .75rem;
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: .6rem .9rem;
          transition: border-color var(--transition);
        }
        .file-upload__file:hover {
          border-color: var(--green-mid);
        }
        .file-upload__file-icon {
          font-size: 1.3rem;
          flex-shrink: 0;
        }
        .file-upload__file-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: .05rem;
        }
        .file-upload__file-name {
          font-size: .875rem;
          font-weight: 500;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .file-upload__file-size {
          font-size: .75rem;
          color: var(--text-muted);
        }
        .file-upload__remove {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1.3rem;
          line-height: 1;
          cursor: pointer;
          padding: .1rem .35rem;
          border-radius: var(--radius-sm);
          transition: color var(--transition), background var(--transition);
          flex-shrink: 0;
        }
        .file-upload__remove:hover {
          color: var(--danger);
          background: var(--danger-light);
        }
      `}</style>
    </div>
  );
}
