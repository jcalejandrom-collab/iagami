import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './hooks/useAuth.jsx';

// Public forms
import ReporteDiario       from './components/forms/ReporteDiario.jsx';
import PlanificacionSemanal from './components/forms/PlanificacionSemanal.jsx';

// Public revistas
import RevistasPublic from './components/revistas/RevistasPublic.jsx';
import RevistaVisor   from './components/revistas/RevistaVisor.jsx';

// Admin
import Login           from './components/admin/Login.jsx';
import Dashboard       from './components/admin/Dashboard.jsx';
import SubmissionList  from './components/admin/SubmissionList.jsx';
import SubmissionDetail from './components/admin/SubmissionDetail.jsx';

// Admin revistas
import RevistasAdmin from './components/admin/revistas/RevistasAdmin.jsx';
import RevistaForm   from './components/admin/revistas/RevistaForm.jsx';

/* ============================================================
   Toast Context
   ============================================================ */
const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

let toastIdCounter = 0;

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = 'info') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, msg, type, removing: false }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, removing: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 260);
    }, 4000);
  }, []);

  function dismiss(id) {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, removing: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 260);
  }

  const toastIcons = {
    success: '✅',
    error:   '⚠️',
    info:    'ℹ️',
    warning: '⚠️',
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast container */}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map(({ id, msg, type, removing }) => (
          <div
            key={id}
            className={`toast toast-${type} ${removing ? 'removing' : ''}`}
            role="alert"
          >
            <span className="toast-icon">{toastIcons[type] || 'ℹ️'}</span>
            <span className="toast-body">{msg}</span>
            <button
              className="toast-close"
              onClick={() => dismiss(id)}
              aria-label="Cerrar notificación"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ============================================================
   PrivateRoute — protege rutas de administración.
   Redirige a login si no hay sesión, y exige rol admin: una sesión
   válida sin rol admin no debe ver el panel (la API ya lo bloquea con
   requireAdmin, pero la UI no debe insinuar acceso). Mientras se
   revalida el token al cargar, muestra un estado de carga en lugar de
   redirigir prematuramente.
   ============================================================ */
function PrivateRoute({ children }) {
  const { isAuthenticated, isAdmin, authChecked } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!authChecked) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-heading)',
        }}
      >
        Verificando sesión…
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location, denied: true }} replace />;
  }

  return children;
}

/* ============================================================
   App
   ============================================================ */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* ---- Public forms ---- */}
            <Route path="/form/reporte-diario"        element={<ReporteDiario />} />
            <Route path="/form/planificacion-semanal" element={<PlanificacionSemanal />} />

            {/* ---- Public revistas ---- */}
            <Route path="/revistas"    element={<RevistasPublic />} />
            <Route path="/revista/:id" element={<RevistaVisor />} />

            {/* ---- Auth ---- */}
            <Route path="/admin/login" element={<LoginGuard />} />

            {/* ---- Protected admin ---- */}
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/submissions"
              element={
                <PrivateRoute>
                  <SubmissionList />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/submissions/reportes"
              element={
                <PrivateRoute>
                  <SubmissionList formType="reporte_diario" />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/submissions/planificaciones"
              element={
                <PrivateRoute>
                  <SubmissionList formType="planificacion_semanal" />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/submissions/:id"
              element={
                <PrivateRoute>
                  <SubmissionDetail />
                </PrivateRoute>
              }
            />

            {/* ---- Protected admin: revistas ---- */}
            <Route
              path="/admin/revistas"
              element={
                <PrivateRoute>
                  <RevistasAdmin />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/revistas/nueva"
              element={
                <PrivateRoute>
                  <RevistaForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/revistas/editar/:id"
              element={
                <PrivateRoute>
                  <RevistaForm />
                </PrivateRoute>
              }
            />

            {/* ---- Catch-all ---- */}
            <Route path="/" element={<Navigate to="/form/reporte-diario" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

/* ============================================================
   LoginGuard — redirect to /admin if already authenticated
   ============================================================ */
function LoginGuard() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }
  return <Login />;
}

/* ============================================================
   NotFound — 404 page
   ============================================================ */
function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        background: 'var(--bg)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '4rem' }}>🌿</div>
      <h1
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.5rem',
          color: 'var(--text-primary)',
        }}
      >
        Página no encontrada
      </h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
        La dirección que buscas no existe en el sistema de IAGAMI.
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="/form/reporte-diario" className="btn-secondary">
          Ir al formulario de reporte
        </a>
        <a href="/admin" className="btn-ghost">
          Panel administrativo
        </a>
      </div>
    </div>
  );
}
