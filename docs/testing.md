# Testing SIGAP / IAGAMI

---

## Estrategia general

Tres capas de calidad ejecutadas secuencialmente en CI:

```
ESLint (estático)
      │
      ▼
Vitest (unitario)
      │
      ▼
Playwright (E2E)
      │
      ▼
Merge autorizado
```

Cada capa falla rápido (`fail fast`): si ESLint falla, los tests no se ejecutan.

---

## 1. Análisis estático — ESLint

**Archivo**: `eslint.config.js`  
**Comando**: `npm run lint`  
**CI**: `.github/workflows/lint.yml`

### Cobertura
- Todo el código JavaScript del proyecto
- Reglas de seguridad: `no-eval`, `no-implied-eval`, `no-new-func`, `no-script-url`
- Reglas de calidad: complejidad cognitiva, código duplicado, promesas sin catch
- **0 warnings tolerados** (--max-warnings 0)

### Exclusiones justificadas
```javascript
ignores: ['node_modules/**', '**/*.min.js', 'sistema-control/**', 'siga-iagami/**']
```

---

## 2. Tests unitarios — Vitest

**Archivo**: `vitest.config.js`  
**Comando**: `npm test`  
**CI**: `.github/workflows/test.yml`

### Configuración
- Entorno: `jsdom` (simula el DOM del navegador)
- `globals: true` (sin imports de `expect`, `describe`, `it`)
- `setupFiles: ['./tests/setup.js']` — carga `cms/pb.js` vía `new Function(src)()`

### Por qué `new Function`
`cms/pb.js` está escrito como un IIFE de script de navegador (no módulo ES/CommonJS). Para ejecutarlo en jsdom sin modificar el archivo, se carga dinámicamente. Al final del archivo se expone el resultado:

```javascript
if (typeof window !== 'undefined' && !window.CMSDB) {
  window.CMSDB = CMSDB;
}
```

El guard `!window.CMSDB` previene doble-carga entre tests.

### Cobertura de código
| Métrica | Umbral | Estado |
|---|---|---|
| Lines | 70% | ✅ |
| Functions | 70% | ✅ |
| Branches | 60% | ✅ |

### Tests existentes (37/37)

**`tests/auth/verifyToken.test.js`**
- 200 OK actualiza token en sessionStorage
- 401 limpia sesión y devuelve false
- Sin token devuelve false inmediatamente
- Error de red preserva sesión (modo offline)
- Error 500 preserva sesión
- Reintentos ≤ 3 veces
- `sigap:offline` se emite en error de red
- Token faltante emite `sigap:auth-error`
- Backoff exponencial (1s, 2s, 4s) — verificado con `vi.useFakeTimers()`
- Deduplicación: llamadas concurrentes resuelven la misma Promise
- `destroy()` elimina el listener `online`

**`tests/cache/stale-while-revalidate.test.js`**
- Datos frescos devueltos desde caché (< 2 min)
- Datos stale devueltos + revalidación en background (2-6 min)
- Caché expirado: petición bloqueante (> 6 min)
- `clearCache` invalida entrada específica

**`tests/eventbus/bus.test.js`**
- `Bus.emit` dispara listeners registrados
- `Bus.on` / `Bus.off` — registro y desregistro
- Múltiples listeners por evento
- `once: true` dispara solo una vez

**`tests/security/xss.test.js`**
- `escapeHTML` escapa los 5 caracteres críticos: `& < > " '`
- Input no-string devuelve string vacío
- Cadenas anidadas no ejecutan código

### Técnicas de testing críticas

**Timers falsos para backoff**:
```javascript
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

it('espera backoff exponencial', async () => {
  const promise = CMSDB.verifyToken();
  await vi.runAllTimersAsync();
  await promise;
  // ...
});
```

**Cleanup entre tests**:
```javascript
beforeEach(() => {
  if (window.CMSDB?.destroy) { window.CMSDB.destroy(); } // elimina listener 'online'
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.CMSDB;
});
```

---

## 3. Tests E2E — Playwright

**Archivo**: `playwright.config.js`  
**Comando**: `npm run e2e`  
**CI**: `.github/workflows/e2e.yml`

### Configuración
- Navegador: Chromium (headless)
- Timeout por test: 20s (ajustable por test con `test.setTimeout`)
- Reintentos: 1 (`retries: 1`)
- Server: `npx serve . -p 3333` (levantado automáticamente)
- `fullyParallel: false` (secuencial, evita conflictos de estado)

### Mock de PocketBase
Todos los tests usan `page.route()` para interceptar peticiones a `http://127.0.0.1:8090`. **No se usa PocketBase real en tests E2E de fase 1**.

**Regla crítica — Route LIFO**:
Playwright evalúa handlers en orden inverso al registro (LIFO). Los handlers generales (`collections/**`) deben usar `route.fallback()` para endpoints de auth, permitiendo que el handler específico tome precedencia.

```javascript
// ✅ Correcto: mockCollections pasa auth endpoints al siguiente handler
await page.route(`${PB}/api/collections/**`, route => {
  const url = route.request().url();
  if (url.includes('/auth-refresh') || url.includes('/auth-with-password')) {
    return route.fallback(); // ← cede al mock específico
  }
  // ... respuesta de colección
});
```

### Tests existentes (33 passed, 5 skipped)

**`tests/e2e/auth.spec.js`** (9 tests)
| Test | Descripción |
|---|---|
| Login exitoso | Redirige al dashboard |
| Credenciales incorrectas | Muestra error, no redirige |
| Sin token → login | Redirect inmediato |
| Con token válido → dashboard | Panel admin visible |
| 401 en auth-refresh | Redirect a login |
| Token se actualiza | sessionStorage contiene REFRESHED_TOKEN |
| Offline: sesión preservada | No redirige, token intacto |
| sigap:offline emitido | Capturado con `addInitScript` |
| Logout | Limpia sesión |

**`tests/e2e/session-security.spec.js`** (9 tests)
| Test | Descripción |
|---|---|
| Token en sessionStorage | Nunca en localStorage ni cookies |
| Formato Bearer | Token empieza con "Bearer " |
| Token no en URL | URL y query strings limpias |
| Logout: limpia storage | pb_token y pb_user = null |
| Logout: admin inaccesible | Redirect sin token |
| 401 colección → redirect | sigap:session-expired dispara redirect |
| Error de red ≠ 401 | No dispara sigap:session-expired |
| Aislamiento de contextos | sessionStorage no se comparte entre tabs |
| Datos del usuario | pb_user corresponde al inyectado |

**`tests/e2e/permissions.spec.js`** (5 tests)
- Error 403 no cierra sesión
- Error 500 no expulsa al usuario
- Dos usuarios, contextos aislados
- Dashboard carga con datos del mock
- Portal público sin autenticación

**`tests/e2e/offline.spec.js`** (4 tests)
- Error de red preserva sesión
- Contexto offline de Playwright
- Reconnection flow
- Toast de offline en carga de datos

**`tests/e2e/xss.spec.js`** (4 tests base + 5 parametrizados)
- Chatbot FAQ no ejecuta XSS
- Noticias muestran XSS como texto
- Formulario de denuncia escapa payloads (5 × condicional)
- Panel admin no ejecuta XSS en datos de colecciones

**`tests/e2e/smoke.spec.js`** (3 tests)
- Portal público carga con título correcto
- Admin redirige sin sesión
- Recursos estáticos críticos existen

### Helpers — `tests/e2e/helpers/mockApi.js`

| Función | Descripción |
|---|---|
| `mockLogin(page, user)` | POST auth-with-password → 200 |
| `mockAuthRefreshOk(page, user)` | POST auth-refresh → 200 con REFRESHED_TOKEN |
| `mockAuthRefresh401(page)` | POST auth-refresh → 401 |
| `mockAuthRefreshOffline(page)` | POST auth-refresh → abort (red caída) |
| `mockCollections(page)` | GET collections → 200 con datos de prueba |
| `mockCollections500(page)` | GET collections → 500 |
| `injectSession(page, user)` | `addInitScript` → pb_token en sessionStorage |

**Constantes**:
- `TEST_TOKEN`: token inicial inyectado por `injectSession`
- `REFRESHED_TOKEN`: token devuelto por `mockAuthRefreshOk`
- `USERS`: objetos de usuario por rol (presidente, director, trabajador)

### Comportamientos especiales documentados

**`waitUntil: 'commit'` para redirects SPA**:
Cuando `window.location.replace` se ejecuta antes del evento `load` (el microtask del async checkAuth resuelve antes del DOM loaded), `page.goto` con `waitUntil: 'load'` cuelga. La solución:
```javascript
await page.goto('/admin/index.html', { waitUntil: 'commit' });
```

**`addInitScript` para eventos pre-navegación**:
`page.evaluate()` corre en el contexto actual. Para capturar eventos que se emiten durante la carga inicial (antes que `page.evaluate` pueda registrar listeners):
```javascript
await page.addInitScript(() => {
  window.__offlineEmitted = false;
  window.addEventListener('sigap:offline', () => {
    window.__offlineEmitted = true;
  }, { once: true });
});
// DESPUÉS registrar el addInitScript
await page.goto('/admin/index.html');
```

**serve redirige `/admin/index.html` → `/admin`**:
El servidor estático `npx serve` trata los directorios con `index.html` y elimina el filename de la URL. Los tests no deben verificar la URL literal `/admin/index.html`, sino la presencia de elementos del DOM o la URL de directorio `/admin`.

---

## CI/CD — Quality Gate

**Archivo**: `.github/workflows/quality-gate.yml`

Pipeline para Pull Requests hacia `main`:

```yaml
lint → unit-tests → e2e
```

- Secuencial con `needs:` (fail fast)
- `concurrency: cancel-in-progress: true` — cancela CI obsoleto al hacer push nuevo
- Solo en PR hacia `main` (no en pushes a feature branches)
