# Seguridad SIGAP / IAGAMI

---

## Modelo de amenazas

SIGAP es un sistema municipal público. El portal es accesible por cualquier ciudadano. El panel admin contiene datos sensibles de gestión ambiental, denuncias y RRHH.

**Actores**:
- Ciudadanos (acceso público, sin auth)
- Administradores (acceso auth, roles: PRESIDENTE, DIRECTOR, TRABAJADOR)
- Atacantes externos (XSS, inyección, acceso no autorizado)

---

## Autenticación y sesión

### Almacenamiento del token
- El token JWT se guarda en `sessionStorage` (no `localStorage`, no cookies).
- `sessionStorage` es por-pestaña: cerrar la pestaña invalida la sesión.
- El token nunca aparece en URLs, query strings ni en el DOM.

### Formato del token
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.{payload}.{signature}
```
Siempre con prefijo `Bearer `. Si la respuesta de auth-refresh no incluye `token`, se emite `sigap:auth-error` y se rechaza la sesión.

### Ciclo de vida del token

| Evento | Acción |
|---|---|
| Login exitoso | `pb_token = token`, `pb_user = record` en sessionStorage |
| auth-refresh 200 | Actualiza `pb_token` con token renovado |
| auth-refresh 401 | `logout()` → elimina sessionStorage → redirect login |
| auth-refresh error de red | Mantiene sesión (offline graceful) |
| colección 401 | `_handleHttpError(401)` → `sigap:session-expired` → `logout()` → redirect |
| Logout voluntario | Elimina `pb_token` y `pb_user`, cola logout al servidor |

### Protección contra double-logout
```javascript
function _handleHttpError(status, ...) {
  case 401:
    if (getToken()) {  // ← guard: no hace logout si ya fue hecho
      Bus.emit('sigap:session-expired', meta);
      logout();
    }
}
```

---

## XSS (Cross-Site Scripting)

### Sanitización centralizada
Todos los datos de PocketBase se sanitizan con `escapeHTML()` antes de insertarse en el DOM:

```javascript
function escapeHTML(str) {
  if (typeof str !== 'string') { return ''; }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

### Puntos de inserción controlados
- Noticias (títulos, contenido)
- Chatbot FAQ (preguntas y respuestas)
- Datos de colecciones en el panel admin
- Formulario de denuncias ciudadanas

### Payloads probados en E2E
```
<script>window.__xss=1</script>
<img src=x onerror="window.__xss=2">
"><script>window.__xss=3</script>
javascript:window.__xss=4
<svg onload="window.__xss=5">
```
Ninguno ejecuta código en el navegador real (verificado con Playwright).

---

## CSP — Content Security Policy

### Fase 1 (activa): Report-Only
Cabecera: `Content-Security-Policy-Report-Only`

Modo de observación: registra violaciones sin bloquear nada. Permite auditar el comportamiento real de la aplicación en producción antes de enforcer.

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://api.iagami.online;
img-src 'self' https://api.iagami.online data: blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests
```

### Fase 2 (pendiente): Enforcement

**NO activar sin evidencia.** Cambiar Report-Only → Enforcement hace que el navegador **bloquee** en lugar de solo registrar. Un recurso no listado dejará de cargar en producción.

**Condiciones para activar:**
1. ≥ 7 días de tráfico real sin violaciones legítimas en la consola del navegador
2. Revisión manual de reportes (DevTools → Console → CSP violations)
3. Quality Gate CI verde con todos los E2E pasando
4. Backup de `_headers` actual antes de cambiar

**Cambio a realizar en `_headers` cuando se cumplan las condiciones:**

```diff
- Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' https://browser.sentry-cdn.com; ...
+ Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://browser.sentry-cdn.com; ...
```

**Recursos bajo CSP que deben verificarse sin violaciones antes de activar:**
- Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`)
- PocketBase API (`api.iagami.online`)
- Sentry SDK CDN (`browser.sentry-cdn.com`) — solo si `SENTRY_DSN` configurado
- `'unsafe-inline'` para scripts y estilos inline actuales

**PR dedicada:** cuando las condiciones se cumplan, abrir PR #72 — CSP Enforcement con un único cambio de línea en `_headers`. No mezclar con otras modificaciones.

---

## Cabeceras HTTP de seguridad

Configuradas en `_headers` (procesado por Cloudflare Pages):

| Cabecera | Efecto |
|---|---|
| `Strict-Transport-Security` | Fuerza HTTPS por 1 año, incluye subdominios |
| `X-Frame-Options: DENY` | Previene clickjacking (iframes) |
| `X-Content-Type-Options: nosniff` | Previene MIME sniffing |
| `Referrer-Policy` | Limita información de referencia entre orígenes |
| `Cross-Origin-Opener-Policy: same-origin` | Aísla el contexto de navegación |
| `Cross-Origin-Resource-Policy: same-origin` | Previene cross-origin resource embedding |
| `Origin-Agent-Cluster: ?1` | Aísla el agente de origen |
| `Permissions-Policy` | Deshabilita: cámara, micrófono, geolocalización, pago, USB |

---

## Análisis estático (ESLint)

Configurado en `eslint.config.js` con reglas de seguridad:

| Plugin | Reglas aplicadas |
|---|---|
| `eslint-plugin-security` | `detect-eval-with-expression`, `detect-non-literal-regexp`, `detect-unsafe-regex` |
| `eslint-plugin-promise` | Cadenas de promesas sin catch, promesas flotantes |
| `eslint-plugin-sonarjs` | Complejidad cognitiva, código duplicado, bugs potenciales |
| Core ESLint | `no-eval`, `no-implied-eval`, `no-new-func`, `no-script-url` |

Ejecutado en CI en cada push. **0 warnings tolerados** (`--max-warnings 0`).

---

## Permisos y roles

Los roles están definidos en la colección `admins` de PocketBase:

| Rol | Descripción |
|---|---|
| `PRESIDENTE` | Acceso completo |
| `DIRECTOR` | Acceso de gestión |
| `TRABAJADOR` | Acceso operativo |

La aplicación frontend aplica restricciones visuales por rol. Las restricciones definitivas deben aplicarse en las reglas de colección de PocketBase (no solo en frontend).

---

## Incidentes documentados

### Double-storage bug (resuelto en PR #63)
**Síntoma**: `sessionStorage.pb_token = "undefined"` (string literal)  
**Causa**: respuesta de auth-refresh sin campo `token` → `sessionStorage.setItem('pb_token', data.token)` → guardaba `"undefined"`  
**Fix**: validación defensiva + evento `sigap:auth-error`

```javascript
if (!data.token) {
  Logger.error('verifyToken', 'Respuesta sin token', data);
  Bus.emit('sigap:auth-error', { reason: 'missing-token' });
  return false;
}
```

### Playwright Route LIFO (documentado en PR #67)
**Síntoma**: tests E2E pasaban pero por razones incorrectas  
**Causa**: handler general `collections/**` interceptaba `auth-refresh` antes que el mock específico  
**Fix**: `route.fallback()` en endpoints de auth dentro de handlers generales

---

## Lista de verificación de seguridad

Antes de desplegar cualquier cambio:

- [ ] `npm run lint` sin errores ni warnings
- [ ] `npm test` — 37/37 tests unitarios
- [ ] `npm run e2e` — 33/33 tests E2E (más skips legítimos)
- [ ] Sin `console.log()` en código de producción
- [ ] Sin tokens ni credenciales hardcodeadas
- [ ] Datos de usuario sanitizados con `escapeHTML()` antes de insertar en DOM
- [ ] Rutas nuevas del admin verifican `pb_token` antes de renderizar
