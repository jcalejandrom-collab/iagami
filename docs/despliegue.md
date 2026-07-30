# Despliegue SIGAP / IAGAMI

---

## Infraestructura

```
Desarrollador
     │
     ▼
  GitHub
  (jcalejandrom-collab/iagami)
     │
     ▼
Cloudflare Pages  ←── build automático en push a main
(iagami.online)
     │
     ▼ (API calls desde el navegador)
VPS 166.1.88.129
Nginx → PocketBase 0.39.1
(api.iagami.online → :8090)
```

---

## Entornos

| Entorno | URL frontend | URL API | Estado |
|---|---|---|---|
| Producción | https://iagami.online | https://api.iagami.online | ✅ Activo |
| Admin | https://iagami.online/admin | — | ✅ Activo |

No existe entorno de staging actualmente. Los cambios se validan localmente con mocks antes de llegar a producción.

---

## Flujo de despliegue

### Frontend (Cloudflare Pages)
1. Push a `main` → Cloudflare Pages detecta el cambio automáticamente
2. Build: sin paso de compilación (archivos estáticos directamente)
3. Distribución via CDN global de Cloudflare
4. Las cabeceras HTTP del archivo `_headers` se aplican automáticamente

**Tiempo de propagación**: 1-3 minutos.

### Backend (PocketBase en VPS)
PocketBase corre como proceso persistente en el VPS. Actualizaciones de esquema de colecciones se realizan directamente desde la interfaz de PocketBase (`http://166.1.88.129:8090/_`).

**Acceso SSH**: `ssh -i <llave> root@166.1.88.129`

---

## Variables de configuración

La URL de PocketBase se configura en `cms/config.js`:

```javascript
// Para producción:
window.__IAGAMI_CONFIG__ = { PB_URL: 'https://api.iagami.online' };

// Fallback en pb.js si no hay config:
const PB_URL = window.__IAGAMI_CONFIG__?.PB_URL || 'http://127.0.0.1:8090';
```

En tests E2E locales, pb.js usa `http://127.0.0.1:8090` (interceptado por `page.route()`).

---

## CI/CD en GitHub Actions

### Workflows activos

| Archivo | Trigger | Descripción |
|---|---|---|
| `lint.yml` | Push/PR en `*.js` | ESLint análisis estático |
| `test.yml` | Push/PR en `cms/pb.js`, `tests/**` | Vitest unit tests |
| `e2e.yml` | Push/PR en `*.html`, `cms/**`, `tests/e2e/**` | Playwright E2E |
| `quality-gate.yml` | PR hacia `main` | Pipeline completo secuencial |

### Quality Gate (PR → main)
```
Push a feature branch → lint.yml + test.yml + e2e.yml (paralelos, por path)
PR hacia main → quality-gate.yml (secuencial: lint → tests → e2e)
Merge → Cloudflare Pages despliega automáticamente
```

---

## Proceso de desarrollo recomendado

```
1. Crear branch: git checkout -b feature/nombre

2. Desarrollar localmente:
   npm run lint       # verificar código
   npm test           # unit tests
   npm run e2e        # E2E tests

3. Push y PR:
   git push -u origin feature/nombre
   # Abrir PR → quality-gate.yml corre automáticamente

4. Review + merge → despliegue automático
```

---

## Tests locales E2E

El servidor de desarrollo para E2E se levanta automáticamente:

```bash
npm run e2e
# Equivalente a:
# npx serve . -p 3333 (en background)
# npx playwright test
```

**Chromium**: en el entorno remoto de Claude Code, el ejecutable está en:
```
/opt/pw-browsers/chromium-1194/chrome-linux/chrome
```

En CI (GitHub Actions): `npx playwright install chromium --with-deps` descarga el browser. La variable `PLAYWRIGHT_CHROMIUM_PATH=""` le indica a playwright.config.js que use el browser instalado por el paso anterior.

---

## Colecciones PocketBase — reglas de BD

Las colecciones se gestionan desde la interfaz de PocketBase. Reglas a respetar siempre:

- **NO renombrar campos** existentes (rompe frontend)
- **NO eliminar campos** existentes (rompe frontend)
- **NO duplicar colecciones** (verificar que no exista antes de crear)
- **NO modificar** la colección `admins` sin autorización explícita
- **NO sobrescribir** ni eliminar registros históricos

---

## Monitoreo (cms/monitoring.js)

Integración opcional con Sentry. **No activa sin `SENTRY_DSN`** — sin DSN el módulo es completamente no-op.

### Activar en producción

En `cms/config.js`, añadir al objeto `window.__IAGAMI_CONFIG__`:

```javascript
window.__IAGAMI_CONFIG__ = {
  PB_URL:      'https://api.iagami.online',
  SENTRY_DSN:  'https://<key>@o<org>.ingest.sentry.io/<project>',
  ENV:         'production',   // 'staging' | 'production'
  VERSION:     '1.0.0',        // etiqueta de release en Sentry
};
```

### Comportamiento

| Condición | Resultado |
|---|---|
| Sin `SENTRY_DSN` | API no-op (`isReady: false`), cero efectos secundarios |
| Con `SENTRY_DSN` | Carga Sentry SDK desde CDN, captura errores y breadcrumbs |
| CDN bloqueado / sin red | Script `onerror` silencioso, app sigue funcionando |

### API pública — `window.SIGAP_MONITORING`

```javascript
SIGAP_MONITORING.captureError(error, { url: '/admin/noticias' });
SIGAP_MONITORING.captureMessage('Mensaje informativo');
SIGAP_MONITORING.setUser({ id, email, rol });
SIGAP_MONITORING.addBreadcrumb({ message, category, level });
SIGAP_MONITORING.isReady; // true solo tras carga exitosa de Sentry
```

### CSP

El archivo `_headers` ya incluye los dominios de Sentry en `Content-Security-Policy-Report-Only`:
- `script-src`: `https://browser.sentry-cdn.com`
- `connect-src`: `https://*.ingest.sentry.io`

Al pasar a enforcement (Fase 2 CSP), estos dominios deben mantenerse.

---

## Checklist de despliegue

Antes de hacer merge a `main`:

- [ ] Quality Gate CI verde (lint + tests + e2e)
- [ ] Sin `console.log()` de debug en código de producción
- [ ] Sin credenciales ni tokens en el código
- [ ] Cambios de BD documentados (colecciones afectadas)
- [ ] Portal público probado manualmente (flujo ciudadano)
- [ ] Panel admin probado manualmente (flujo operador)
- [ ] Sincronía validada: Frontend ↔ Backend ↔ BD ↔ Permisos
