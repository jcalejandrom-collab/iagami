# Arquitectura SIGAP / IAGAMI

Sistema Integral de Gestión Ambiental Pública  
Instituto Autónomo de Gestión Ambiental del Municipio Iribarren — Barquisimeto, Venezuela

---

## Visión general

SIGAP es una SPA (Single Page Application) sin framework de frontend. Cada módulo es una carpeta independiente con su propio `index.html`. El backend es PocketBase 0.39.1 corriendo en un VPS.

```
Navegador  ──►  Cloudflare Pages (CDN)  ──►  GitHub (fuente)
                                         ──►  VPS (Nginx + PocketBase)
```

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | HTML5 + CSS3 + JavaScript Vanilla | — |
| Backend | PocketBase | 0.39.1 |
| CDN / Hosting | Cloudflare Pages | — |
| Servidor | Nginx + VPS | 166.1.88.129:8090 |
| Base de datos | SQLite (vía PocketBase) | — |

**Principio**: sin frameworks externos (React, Vue, Angular, Bootstrap, jQuery). Todo el código es Vanilla JS.

---

## Módulos del sistema

### Portal público (`/`)
Acceso sin autenticación. Muestra información institucional pública.

| Sección | Fuente de datos |
|---|---|
| Bienvenida | colección `bienvenida` |
| Noticias | colección `noticias` |
| Proyectos | colección `proyectos` |
| Agenda | colección `eventos` |
| Trámites | colección `tramites` |
| Documentos | colección `documentos` |
| Denuncias | colección `denuncias` (escritura ciudadana) |
| Chatbot FAQ | colección `chatbot_faq` |
| Revista Digital | colección `revistas` |

### Panel administrativo (`/admin`)
Requiere autenticación JWT. 25 módulos de gestión.

**Contenido y comunicación**: Dashboard, Noticias, Trámites, Agenda, Transparencia, Revista Digital, Chatbot FAQ, Bienvenida, Archivos

**Gestión ambiental**: Proyectos, Indicadores, Empresas, Alertas, Multas, Denuncias, Infraestructura Hídrica, Diagnóstico Territorial

**Participación ciudadana**: Comunas, Consejos Comunales, Organización

**Administración interna**: RRHH, Planificación, Control y Seguimiento, Centro de Control, Sembrar Datos

---

## Archivo crítico: `cms/pb.js`

Cliente PocketBase central. Toda la lógica de API pasa por aquí. **Modificar con máxima precaución.**

### Patrones implementados

#### Circuit Breaker
Previene cascadas de fallos cuando el backend no responde.

```
Estado: CERRADO → ABIERTO (3 fallos) → HALF-OPEN (30s) → CERRADO
```

- Umbral: 3 fallos consecutivos
- Reset: 30 segundos
- Cuando abierto: retorna datos de caché si existen

#### Event Bus
Comunicación desacoplada entre módulos vía `CustomEvent` sobre `window`.

| Evento | Descripción |
|---|---|
| `sigap:session-expired` | Token rechazado por el servidor (401) |
| `sigap:offline` | Error de red persistente |
| `sigap:online` | Conexión restaurada |
| `sigap:auth-error` | Respuesta de auth sin token |
| `sigap:circuit-open` | Circuit Breaker activado |
| `sigap:access-denied` | Error 403 |
| `sigap:server-error` | Error 5xx |

#### Request Manager (deduplicación)
Previene peticiones duplicadas simultáneas al mismo recurso.

```javascript
// Si ya hay una petición en vuelo para "getAll_noticias", devuelve la misma Promise
_dedupe('getAll_noticias', fetcher)
```

#### Caché stale-while-revalidate
- TTL fresco: 2 minutos
- Ventana stale: 6 minutos (datos usables, revalidación en background)
- Después de 6 min: petición bloqueante

#### Reintentos con backoff exponencial
`verifyToken` reintenta 3 veces: 1s → 2s → 4s

#### Offline Queue
Peticiones de logout pendientes se almacenan y envían cuando se restaura la conexión.

---

## Colecciones PocketBase (30+)

| Categoría | Colecciones |
|---|---|
| Contenido | `noticias`, `tramites`, `eventos`, `proyectos`, `indicadores`, `documentos`, `revistas`, `bienvenida`, `media` |
| Ciudadanía | `denuncias`, `alertas`, `multas`, `chatbot_faq` |
| Territorial | `comunas`, `consejos_comunales`, `diagnosticos_ambientales`, `infraestructura_hidrica` |
| Empresarial | `empresas`, `inspecciones_empresas` |
| RRHH | `trabajadores`, `solicitudes_rrhh`, `capacitaciones`, `evaluaciones_desempeno`, `asistencia` |
| Sistema | `admins`, `iagami_sys_logs`, `planificacion`, `control_seguimiento` |

---

## Flujo de autenticación

```
1. Usuario ingresa credenciales en modal de login
2. POST /api/collections/admins/auth-with-password
3. Respuesta: { token, record }
4. sessionStorage.setItem('pb_token', token)
5. sessionStorage.setItem('pb_user', JSON.stringify(record))
6. Redirect a /admin/index.html

Al cargar /admin/index.html:
7. verifyToken() → POST /api/collections/admins/auth-refresh
   - 200: actualiza token, continúa
   - 401: logout() + redirect a login
   - Error de red: mantiene sesión (modo offline)
8. Si ok: renderDashboard()
```

---

## Comportamiento offline

| Situación | Comportamiento |
|---|---|
| `verifyToken` → error de red | Mantiene sesión, emite `sigap:offline` |
| `verifyToken` → 401 | Logout, emite `sigap:session-expired`, redirect |
| `getAll/getFiltered` → 401 | Logout vía `_handleAuthError`, redirect |
| `count` → cualquier error | Retorna 0 silenciosamente (no dispara auth handler) |
| Conexión restaurada | Emite `sigap:online`, procesa cola de logout pendientes |

> **Nota técnica**: `count()` no pasa por `_handleHttpError`. Comportamiento distinto a `getAll`/`getFiltered`. Candidato a unificación futura.

---

## Seguridad HTTP

Cabeceras configuradas en `_headers` (Cloudflare Pages):

| Cabecera | Valor |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `Content-Security-Policy-Report-Only` | Fase 1 de observación (ver `docs/seguridad.md`) |

---

## Estructura de carpetas

```
iagami/
├── index.html                  Portal público
├── admin/                      Panel administrativo
├── cms/
│   ├── pb.js                   ⚠️ Cliente PocketBase (CRÍTICO)
│   ├── config.js               Configuración de entornos
│   └── animations.js           Animaciones CSS/JS
├── _headers                    Cabeceras HTTP Cloudflare Pages
├── docs/                       Documentación técnica
├── tests/
│   ├── auth/                   Tests unitarios Vitest
│   └── e2e/                    Tests E2E Playwright
├── .github/workflows/          CI/CD
├── eslint.config.js            Análisis estático
├── playwright.config.js        Configuración E2E
└── vitest.config.js            Configuración unit tests
```
