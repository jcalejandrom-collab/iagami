# FASE 14 — Correcciones Integrales: Resultado y Evidencias

**Fecha de cierre:** 5 de noviembre de 2026  
**Basado en:** Auditoría Fase 13  
**Estado general:** COMPLETO — todos los greps de validación pasan

---

## 1. Tabla de correcciones aplicadas

| ID | Descripción | Estado | Archivo modificado | Grep de verificación |
|---|---|---|---|---|
| A-1 | Campo `ev.nombre` → `ev.titulo` en portal representante (actividades_brigadas) | APLICADA | `brigadas-ambientales/representante/index.html` | `grep "ev\.nombre"` → 0 resultados ✅ |
| A-2 | Campo `tipo_recurso` → `tipo_apoyo` en render y POST de solicitudes_apoyo | APLICADA | `brigadas-ambientales/representante/index.html` | `grep "tipo_recurso"` → 0 resultados ✅ |
| A-3 | Schema `presente:bool` → `estado:select` (presente/ausente/justificado). Helper `getEstadoAsistencia()` para compatibilidad backward. | APLICADA | `pb_schema/brigadas_sistema_completo.json`, `brigadas-ambientales/comandante/index.html`, `brigadas-ambientales/representante/index.html` | `grep '"presente".*bool'` en schema → 0 resultados ✅ |
| B-1 | Botón Zoom: condición `!m.start_url` → `!m.join_url` en portal profesor | APLICADA | `aula-ambiental/profesor/index.html` | `grep "start_url.*disabled"` → 0 resultados ✅ |
| B-2 | Campo `cedula` agregado al schema de `representantes_brigadas` | APLICADA | `pb_schema/brigadas_sistema_completo.json` | Verificado en schema ✅ |
| C-1 | Brute-force JS (5 intentos → bloqueo 60s) en portales: profesor, representante, comandante | APLICADA (primera capa JS) | `aula-ambiental/profesor/index.html`, `brigadas-ambientales/representante/index.html`, `brigadas-ambientales/comandante/index.html` | `grep "_profLoginAttempts"` → 5 resultados, `_repLoginAttempts` → 5, `_cmdLoginAttempts` → 5 ✅ |
| C-2 | `setInterval` sin `clearInterval` en estudiante → agregada variable `_countdownTimer` y `clearInterval` antes de cada llamada | APLICADA | `aula-ambiental/estudiante/index.html` | Variable `_countdownTimer` declarada y usada ✅ |
| C-3 | `__IAGAMI_CONFIG__` inyectado en `<head>` del portal público `index.html` | APLICADA | `index.html` | `window.__IAGAMI_CONFIG__` inyectado antes de cargar scripts ✅ |

---

## 2. Resultados de los 5 greps de validación

```
CHECK 1: grep -n "ev\.nombre" brigadas-ambientales/representante/index.html
Resultado: 0 ✅

CHECK 2: grep -n "tipo_recurso" brigadas-ambientales/representante/index.html
Resultado: 0 ✅

CHECK 3: grep -n '"presente".*bool|type.*bool.*presente' pb_schema/brigadas_sistema_completo.json
Resultado: 0 ✅

CHECK 4: grep -c "start_url.*disabled|disabled.*start_url" aula-ambiental/profesor/index.html
Resultado: 0 ✅

CHECK 5: grep -c "_profLoginAttempts|_repLoginAttempts|_cmdLoginAttempts" [3 portales]
profesor: 5 ✅
representante: 5 ✅
comandante: 5 ✅
```

---

## 3. Compatibilidad cruzada de asistencia

**Pregunta:** ¿Un registro creado en `asistencia_brigadas` desde el portal del comandante puede leerse correctamente desde el portal del representante y el panel administrativo, sin pérdida de información?

**Respuesta: SÍ — con las correcciones aplicadas.**

| Contexto | Campo leído | Helper usado | Valores soportados |
|---|---|---|---|
| Portal Comandante | `r.estado` | `getEstadoAsistencia(r)` | presente / ausente / justificado + fallback presente:bool |
| Portal Representante | `a.estado` | `getEstadoAsistencia(a)` | presente / ausente / justificado + fallback presente:bool |
| Panel Administrativo | No lee `asistencia_brigadas` directamente (tab brigadas usa contadores por actividad) | N/A | — |

**El helper `getEstadoAsistencia()` está implementado en:**
- `brigadas-ambientales/comandante/index.html` — 4 referencias (declaración + 3 usos)
- `brigadas-ambientales/representante/index.html` — 4 referencias (declaración + 3 usos en radio pre-checks)

**Compatibilidad backward:** El helper lee primero `r.estado` (nuevo campo select). Si está vacío, intenta `r.presente === true/false` (campo bool anterior). Esto asegura que registros antiguos (si existieran) no pierdan información al migrar.

**Resultado:** COMPATIBLE ✅

---

## 4. Tabla de 9 colecciones nuevas vs portales que las usan

| Colección | Portal que la crea/edita | Portal que la lee | Campos críticos verificados |
|---|---|---|---|
| `comandantes_brigadas` | Admin (crear/activar) | Portal comandante (auth) | `email`, `estado` (activo/suspendido/inactivo) |
| `representantes_brigadas` | Admin, Comandante (crear) | Portal representante (auth) | `email`, `estado` (pendiente/activo/suspendido), `cedula`, `comuna_id`, `consejo_comunal_id` |
| `brigadas` | Admin, Representante, Comandante | Todos los portales | `nombre`, `estado`, `representante_id`, `parroquia` |
| `actividades_brigadas` | Representante, Comandante | Representante, Comandante | `titulo` (no `nombre`), `fecha` (no `fecha_inicio`), `tipo`, `estado` |
| `asistencia_brigadas` | Representante | Representante, Comandante | `estado` (select: presente/ausente/justificado), `brigadista_id`, `actividad_id` |
| `comunicados_brigadas` | Comandante | Representante, Comandante | `asunto`, `contenido`, `prioridad`, `destinatarios` |
| `solicitudes_apoyo` | Representante | Representante, Comandante | `tipo_apoyo` (no `tipo_recurso`), `brigada_id`, `estado` |
| `informes_actividad` | Representante | Representante, Comandante | `titulo`, `resumen`, `brigada_id`, `representante_id` |
| `evidencias_brigadas` | Representante | Representante, Comandante | `archivo`, `tipo`, `actividad_id` |

> **IMPORTANTE:** No crear estas colecciones en PocketBase producción hasta completar la Fase 15 (pruebas integrales en entorno de prueba).

---

## 5. Flujo Zoom: profesor → alumno

| Actor | URL utilizada | Cuándo está disponible | Configuración requerida |
|---|---|---|---|
| Profesor | `join_url` (mismo enlace que el alumno) | Siempre disponible cuando existe la reunión | Ninguna adicional |
| Alumno | `join_url` | Siempre disponible cuando existe la reunión | Ninguna adicional |
| Profesor (futuro) | `start_url` | Cuando el VPS hook lo retorne explícitamente | Configurar hook para devolver `start_url` solo a tokens de profesor autenticados |

**Estado actual:** `profStartMeeting(startUrl, joinUrl)` abre `startUrl || joinUrl`. Como el VPS hook no retorna `start_url` por seguridad, el profesor entra por `join_url` — que es el enlace correcto y funcional para abrir la reunión en Zoom como host (si el profesor tiene la cuenta de Zoom configurada como host de la reunión).

**Comentario en código:** Documentado en `aula-ambiental/profesor/index.html` en la función `profStartMeeting`.

---

## 6. Nginx — PENDIENTE_VPS

**Estado: PENDIENTE — Debe aplicarse en el VPS antes de la apertura pública de los portales de autenticación.**

La protección brute-force JavaScript es la **primera capa** (bloqueo en el navegador del cliente). No es suficiente por sí sola — puede ser bypasseada desde scripts externos. La segunda capa obligatoria es Nginx.

**Configuración lista para aplicar — ver:** `docs/nginx_rate_limiting.md`

Resumen de la config:
```nginx
# En nginx.conf, bloque http:
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

# En sites-available/iagami, bloque server:
location ~ ^/api/collections/[^/]+/auth-with-password {
    limit_req zone=auth burst=3 nodelay;
    limit_req_status 429;
    proxy_pass http://127.0.0.1:8090;
    # ... headers proxy ...
}
```

**Portales que requieren esta protección:**
- `/api/collections/admins/auth-with-password`
- `/api/collections/profesores/auth-with-password`
- `/api/collections/estudiantes/auth-with-password`
- `/api/collections/comandantes_brigadas/auth-with-password`
- `/api/collections/representantes_brigadas/auth-with-password`

**Responsable de aplicar:** Administrador VPS (166.1.88.129)

---

## 7. Pendiente para Fase 15

| Tarea | Descripción | Prerequisito |
|---|---|---|
| **Crear colecciones en entorno de prueba** | Usar `pb_schema/brigadas_sistema_completo.json` para crear las 9 colecciones en PocketBase de prueba | Fase 14 aprobada ✅ |
| **Prueba de flujo completo brigadista** | Registro público → activación por representante → actividad → asistencia → informe | Colecciones creadas |
| **Prueba Zoom real** | Una clase completa de principio a fin: crear reunión (admin) → profesor ingresa → alumno ingresa → grabación disponible | VPS con credenciales Zoom activas |
| **Configurar Nginx rate limiting en VPS** | Aplicar `docs/nginx_rate_limiting.md` en `/etc/nginx/sites-available/iagami` | Acceso SSH al VPS |
| **Validar brute-force con Nginx activo** | Correr el test curl de 10 intentos y confirmar 429 en intento 6+ | Nginx configurado |
| **Verificar `__IAGAMI_CONFIG__` en todos los portales** | Confirmar que todos los portales con `127.0.0.1` como fallback lo tienen inyectado | — |
| **Prueba de datos de menores** | Confirmar que `cedula`, `telefono` y `representante_legal` de `brigadistas_menores` NO aparecen en listados públicos | Colecciones creadas con datos reales |
| **Respaldo verificable de BD** | Backup de PocketBase antes de crear colecciones en producción | — |

---

*Informe generado en Fase 14 — Correcciones Integrales SIGAP IAGAMI. Verificado por inspección estática de código.*
