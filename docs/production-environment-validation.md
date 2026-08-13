# Validación de Entorno de Producción — SIGAP / IAGAMI

> Auditoría ejecutada en: 2026-07-30
> Rama: `claude/bold-tesla-uuTwO`
> Complementa: `docs/production-readiness.md` (Fase 1 completada)

---

## Resumen de fases

| Fase | Alcance | Estado |
|---|---|---|
| A — Repositorio | Verificable desde el código | ✅ PASS |
| B — Infraestructura VPS | Requiere acceso SSH + consola PocketBase | ⏳ PENDIENTE |

---

## Fase A — Validación desde repositorio

### A.1 Verificación automatizada

Ejecutar antes de cada despliegue o apertura de acceso:

```bash
node scripts/verify-production-ready.js
```

**Resultado actual**: ✅ 34/34 · 0 errores · 1 aviso (CSP Report-Only — esperado)

El script verifica automáticamente:

| Categoría | Checks |
|---|---|
| Archivos críticos | `index.html`, `admin/index.html`, `cms/pb.js`, `cms/config.js`, `cms/monitoring.js`, `_headers` |
| Headers de seguridad | HSTS, X-Frame-Options, nosniff, CSP, Referrer-Policy, Permissions-Policy |
| Secretos hardcodeados | Patrones de API key, password, token, DSN en archivos de producción |
| `console.log` en producción | Archivos CMS de producción |
| Configuración de API | URL leída desde meta tag, no hardcodeada |
| Documentación operativa | 9 documentos requeridos |
| CI / Workflows | audit.yml, secrets-scan.yml, .trufflehog-ignore |
| Tests | Suite unitaria y E2E disponibles |

### A.2 Verificación manual de frontend

Antes de abrir acceso a usuarios, verificar en navegador real (Chrome o Firefox):

**Portal público — `https://iagami.online`**

- [ ] Carga sin errores en consola de DevTools
- [ ] HTTPS activo (candado verde)
- [ ] Imágenes cargan correctamente
- [ ] Secciones visibles: Noticias, Proyectos, Agenda, Trámites, Denuncias, Chatbot
- [ ] Formulario de denuncia funcional (no requiere sesión)
- [ ] Redirección a login al intentar acceder a `/admin` sin sesión

**Panel administrativo — `https://iagami.online/admin`**

- [ ] Página de login carga sin errores
- [ ] Credenciales incorrectas muestran error (no crash)
- [ ] Login exitoso con usuario PRESIDENTE carga el dashboard
- [ ] Sidebar con los 26 módulos visible
- [ ] No hay errores JS en consola tras login

---

## Fase B — Validación de infraestructura (PENDIENTE)

> Requiere acceso SSH al VPS `166.1.88.129` y acceso a la consola PocketBase `https://api.iagami.online/_`.
> Ver también: `docs/checklist-lanzamiento.md` — Fase 1 y Fase 2.

### B.1 Conectividad y TLS

```bash
# Desde terminal externo
curl -I https://iagami.online
curl -I https://api.iagami.online/api/health
```

| Check | Criterio |
|---|---|
| `https://iagami.online` accesible | HTTP 200 |
| `https://api.iagami.online/api/health` | `{"code":200}` |
| Certificado SSL válido | Sin advertencias, no expirado |
| HTTPS forzado (no HTTP) | Redirect 301 de HTTP → HTTPS |

### B.2 Servicios VPS

```bash
# En el VPS via SSH
systemctl status pocketbase
systemctl status nginx
```

| Check | Criterio |
|---|---|
| PocketBase como servicio systemd | `active (running)` |
| Nginx activo | `active (running)` |
| PocketBase en puerto `8090` | Solo accesible internamente vía Nginx |
| Logs sin errores críticos | `journalctl -u pocketbase --since "1 hour ago"` sin FATAL |

### B.3 Reglas de colecciones PocketBase

Verificar en `https://api.iagami.online/_` → Collections → API Rules:

| Colección | Crear | Listar | Ver | Editar | Eliminar |
|---|---|---|---|---|---|
| `admins` | Solo admin PocketBase | Solo admin PocketBase | Solo admin PocketBase | Solo admin PocketBase | Solo admin PocketBase |
| `denuncias` | Público (sin auth) | Solo autenticado | Solo autenticado | Solo autenticado | Solo autenticado |
| `iagami_sys_logs` | Solo API interna | Solo autenticado | Solo autenticado | Bloqueado | Bloqueado |
| `trabajadores` | Bloqueado | RRHH / DIRECTOR / PRESIDENTE | RRHH / DIRECTOR / PRESIDENTE | RRHH | Bloqueado |
| `evaluaciones_desempeno` | Solo RRHH | RRHH / DIRECTOR / PRESIDENTE | RRHH / DIRECTOR / PRESIDENTE | Solo RRHH | Bloqueado |
| `solicitudes_rrhh` | Solo autenticado (propio) | RRHH / DIRECTOR / PRESIDENTE | RRHH / propio | Solo RRHH | Bloqueado |

> Una colección con regla vacía (`""`) en PocketBase equivale a **acceso público sin restricción** — verificar que ninguna colección sensible tenga reglas vacías.

### B.4 Backups operativos

```bash
# En el VPS — verificar script de backup
crontab -l | grep backup
ls -lh /var/backups/pocketbase/
```

| Check | Criterio |
|---|---|
| Script de backup existe | Ubicación documentada en `docs/disaster-recovery.md` |
| Cron configurado | Al menos 1 ejecución diaria |
| Backup más reciente < 24h | `ls -lt` muestra archivo del día anterior o hoy |
| Restauración probada | Ver procedimiento en `docs/disaster-recovery.md` Nivel 2 |

### B.5 Rendimiento inicial

```bash
# Tiempo de respuesta API
curl -w "\nTiempo total: %{time_total}s\n" -o /dev/null -s https://api.iagami.online/api/health
```

| Métrica | Objetivo |
|---|---|
| Carga portal (`iagami.online`) | < 3 s en conexión promedio |
| Respuesta API health | < 500 ms |
| Lighthouse Performance | ≥ 80 en versión de producción |

---

## Prueba funcional por rol

> A ejecutar con usuarios reales tras completar Fase B.
> Ver `docs/checklist-lanzamiento.md` — Fase 4 para detalle completo.

### Matriz de validación por rol

| Acción | PRESIDENTE | DIRECTOR | COORDINADOR | SUPERVISOR | TRABAJADOR | RRHH | TECNOLOGIA |
|---|---|---|---|---|---|---|---|
| Login exitoso | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dashboard carga | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Módulo Auditoría visible | ✅ | ✅ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Módulo Auditoría denegado | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Registrar actividad SIGA | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Ver equipo completo SIGA | ✅ | ✅ | ✅ | ✅ | ✗ | — | — |
| Módulo RRHH accesible | ✅ | ✅ | — | — | ✗ | ✅ | ✗ |
| Cierre de sesión limpio | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> ✅ = debe funcionar · ✗ = debe ser denegado · — = no aplica para este rol

### Procedimiento de prueba

Para cada rol:
1. Abrir ventana de incógnito o perfil separado del navegador.
2. Ir a `https://iagami.online/admin`.
3. Iniciar sesión con el usuario del rol.
4. Verificar los accesos según la matriz anterior.
5. Registrar resultado en `docs/checklist-lanzamiento.md` — Fase 4.

---

## Checklist de apertura (resumen ejecutivo)

Completar en orden. No abrir acceso a usuarios hasta que todos los puntos estén marcados.

### Repositorio (Fase A)

- [ ] `node scripts/verify-production-ready.js` → PASS (0 errores)
- [ ] `npm run lint` → 0 errores, 0 warnings
- [ ] `npm test` → todos los tests pasan
- [ ] Sin secretos detectados por `secrets-scan.yml` en rama `main`

### Infraestructura (Fase B)

- [ ] `curl https://api.iagami.online/api/health` → `{"code":200}`
- [ ] Certificado SSL válido, no próximo a expirar
- [ ] PocketBase corriendo como servicio systemd
- [ ] Nginx activo con proxy inverso configurado
- [ ] Reglas de colecciones verificadas en consola PocketBase
- [ ] Backup automático configurado y primer backup generado
- [ ] Restauración probada en entorno diferente al de producción

### Usuarios y roles

- [ ] Usuario PRESIDENTE creado con correo institucional real
- [ ] Usuarios por rol creados según organigrama
- [ ] Prueba funcional completa por cada rol (ver matriz anterior)
- [ ] Credenciales comunicadas de forma segura al personal

### Comunicación

- [ ] `docs/manual-trabajador.md` distribuido al personal operativo
- [ ] `docs/manual-administrador.md` entregado a PRESIDENTE, DIRECTOR y TECNOLOGIA
- [ ] Canal de soporte definido (WhatsApp institucional, correo, etc.)

---

## Criterio de cierre

> SIGAP cuenta con procedimiento de validación de entorno productivo y checklist operativo.
> La Fase A (repositorio) está completada y verificable automáticamente.
> La Fase B (infraestructura real) queda pendiente de acceso autorizado al VPS y consola PocketBase.
>
> Una vez completada la Fase B y la prueba funcional por rol, el sistema queda autorizado para apertura a usuarios reales.

El siguiente paso técnico post-apertura es **PR #75 — CSP Enforcement**, tras ≥7 días de observación en producción sin violaciones CSP legítimas.
