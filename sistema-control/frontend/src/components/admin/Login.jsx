import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';

/* ============================================================
   Login — Admin login page
   ============================================================ */

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Por favor ingrese su correo electrónico.'); return; }
    if (!password)     { setError('Por favor ingrese su contraseña.');         return; }

    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      setError(
        result.error === 'Unauthorized' || result.error.toLowerCase().includes('credencial')
          ? 'Correo o contraseña incorrectos. Verifique sus datos.'
          : result.error
      );
    } else {
      navigate('/admin', { replace: true });
    }
  }

  return (
    <div className="login-page">
      <div className="login-card card">
        {/* Logo / Brand */}
        <div className="login-brand">
          <div className="login-brand__mark">🌿</div>
          <div>
            <p className="login-brand__name">IAGAMI</p>
            <p className="login-brand__full">
              Instituto Autónomo de Gestión Ambiental<br />del Municipio Iribarren
            </p>
          </div>
        </div>

        <div className="login-divider" />

        <h1 className="login-title">Acceso Administrativo</h1>
        <p className="login-subtitle">Acceso exclusivo para personal autorizado IAGAMI</p>

        {/* Error alert */}
        {error && (
          <div className="alert alert-error login-error" role="alert">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Correo Electrónico
            </label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="usuario@iagami.gob.ve"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              autoComplete="username"
              required
              disabled={submitting || loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Contraseña
            </label>
            <div className="login-pass-wrapper">
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className="form-input login-pass-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                required
                disabled={submitting || loading}
              />
              <button
                type="button"
                className="login-pass-toggle"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                tabIndex={-1}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary btn-full"
            disabled={submitting || loading}
          >
            {submitting ? (
              <>
                <span className="spinner" />
                Verificando…
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <p className="login-help">
          ¿Problemas para acceder? Contacte al administrador del sistema.
        </p>
      </div>

      <p className="login-footer">
        © {new Date().getFullYear()} IAGAMI · Sistema de Control y Seguimiento Ambiental
      </p>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          background: linear-gradient(145deg, #1d6b3e 0%, #155230 40%, #0e3d24 100%);
        }
        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 2.25rem 2.5rem;
          border-radius: var(--radius-xl);
          box-shadow: 0 24px 60px rgba(0,0,0,.35);
          border: 1px solid rgba(255,255,255,.08);
        }
        .login-brand {
          display: flex;
          align-items: center;
          gap: .85rem;
          margin-bottom: 1.5rem;
        }
        .login-brand__mark {
          width: 50px;
          height: 50px;
          background: var(--green-dark);
          border-radius: var(--radius);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(29,107,62,.4);
        }
        .login-brand__name {
          font-family: var(--font-heading);
          font-weight: 800;
          font-size: 1.1rem;
          color: var(--green-dark);
          line-height: 1.2;
        }
        .login-brand__full {
          font-size: .72rem;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .login-divider {
          height: 1px;
          background: var(--border);
          margin-bottom: 1.5rem;
        }
        .login-title {
          font-size: 1.35rem;
          font-family: var(--font-heading);
          color: var(--text-primary);
          font-weight: 700;
          margin-bottom: .3rem;
        }
        .login-subtitle {
          font-size: .855rem;
          color: var(--text-muted);
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: .4rem;
        }
        .login-subtitle::before {
          content: '🔒';
          font-size: .9rem;
        }
        .login-error {
          margin-bottom: 1.25rem;
          font-size: .875rem;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .login-form .form-group {
          margin-bottom: 1rem;
        }
        .login-pass-wrapper {
          position: relative;
        }
        .login-pass-input {
          padding-right: 3rem;
        }
        .login-pass-toggle {
          position: absolute;
          right: .75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          line-height: 1;
          padding: .25rem;
          color: var(--text-muted);
          transition: color var(--transition);
          display: flex;
          align-items: center;
        }
        .login-pass-toggle:hover {
          color: var(--text-primary);
        }
        .login-form .btn-full {
          margin-top: .5rem;
          padding: .85rem;
          font-size: 1rem;
        }
        .login-help {
          text-align: center;
          font-size: .8rem;
          color: var(--text-muted);
          margin-top: 1.25rem;
        }
        .login-footer {
          color: rgba(255,255,255,.45);
          font-size: .78rem;
          margin-top: 1.75rem;
          text-align: center;
        }
        @media (max-width: 480px) {
          .login-card {
            padding: 1.75rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
