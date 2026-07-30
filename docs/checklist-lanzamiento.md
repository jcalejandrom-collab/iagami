# Checklist de Lanzamiento — SIGAP / IAGAMI

> Ejecutar en orden antes de abrir el sistema a usuarios reales.
> Cada punto debe ser verificado y firmado por el responsable.

---

## Fase 1 — Infraestructura

### Dominio y conectividad

- [ ] `https://iagami.online` carga correctamente desde dispositivo externo
- [ ] `https://iagami.online/admin` redirige al login (no error 404)
- [ ] `https://api.iagami.online/api/health` responde `{"code":200}`
- [ ] HTTPS activo en ambos dominios (candado verde en navegador)
- [ ] No hay errores de certificado SSL

### Servidor VPS

- [ ] PocketBase corriendo como servicio systemd (`systemctl status pocketbase`)
- [ ] Nginx activo y sirviendo como proxy inverso
- [ ] Backups automáticos configurados (cron o equivalente)
- [ ] Primer backup manual creado y verificado (restauración probada)
- [ ] IP del VPS anotada en documento seguro junto con credenciales SSH

---

## Fase 2 — Seguridad

### Configuración

- [ ] No hay credenciales hardcodeadas en ningún archivo del repositorio
- [ ] `cms/config.js` lee la URL de PocketBase desde `meta[name="pb-url"]` (no literal)
- [ ] `Content-Security-Policy-Report-Only` activa en `_headers` (Cloudflare Pages)
- [ ] Headers HTTP de seguridad verificados (HSTS, X-Frame-Options, nosniff, etc.)
- [ ] Secret scanner CI (`secrets-scan.yml`) ejecutado sin alertas en la rama `main`

### PocketBase — reglas de colección

Verificar en `https://api.iagami.online/_` que cada colección tiene reglas de acceso apropiadas:

- [ ] `admins`: solo lectura/escritura para administradores PocketBase
- [ ] `denuncias`: creación pública, lectura/edición solo autenticados
- [ ] `iagami_sys_logs`: solo lectura para usuarios autenticados, escritura solo via API
- [ ] `trabajadores`: solo lectura/edición para roles RRHH, DIRECTOR, PRESIDENTE
- [ ] Colecciones sensibles (RRHH, multas, inspecciones): no accesibles sin autenticación

### Monitoreo (opcional)

- [ ] Si se activa Sentry: `SENTRY_DSN` configurado en `cms/config.js` o vía meta tag
- [ ] Si se activa Sentry: `ENV` y `VERSION` configurados correctamente
- [ ] Si no se activa: `cms/monitoring.js` opera en modo no-op (sin efectos secundarios)

---

## Fase 3 — Usuarios iniciales

### Creación en PocketBase Admin

- [ ] Usuario PRESIDENTE creado con correo institucional real
- [ ] Usuario DIRECTOR creado (mínimo 1)
- [ ] Usuario TECNOLOGIA creado para soporte técnico
- [ ] Usuarios RRHH creados según organigrama
- [ ] Usuarios SUPERVISOR / COORDINADOR creados según organigrama
- [ ] Usuarios TRABAJADOR creados

### Validación de roles

- [ ] Cada usuario puede iniciar sesión correctamente
- [ ] Los módulos visibles corresponden al rol asignado (ver [Matriz de Permisos](./matriz-permisos.md))
- [ ] El módulo Auditoría es accesible para PRESIDENTE y DIRECTOR, no para otros roles

---

## Fase 4 — Prueba funcional por rol

Ejecutar un recorrido completo con cada rol antes del lanzamiento:

### PRESIDENTE / DIRECTOR

- [ ] Inicio de sesión exitoso
- [ ] Dashboard carga con estadísticas
- [ ] Puede abrir y usar el módulo **Auditoría** (ver registros, filtrar, exportar CSV)
- [ ] Puede ver **Centro de Control** con KPIs institucionales
- [ ] Puede navegar los 25+ módulos del panel
- [ ] Cierre de sesión limpia la sesión correctamente

### SUPERVISOR / COORDINADOR

- [ ] Inicio de sesión exitoso
- [ ] Módulo **Auditoría** muestra "Acceso restringido" (no carga logs)
- [ ] Puede registrar actividades en SIGA
- [ ] Puede ver actividades de su equipo (tab Control)
- [ ] No puede acceder a módulos de Presidencia en SIGA

### TRABAJADOR

- [ ] Inicio de sesión exitoso
- [ ] Solo ve sus propias actividades (no las del equipo)
- [ ] Puede registrar reporte diario
- [ ] No puede ver módulos restringidos (Auditoría, RRHH, Presidencia)

### RRHH

- [ ] Inicio de sesión exitoso
- [ ] Puede gestionar solicitudes de personal
- [ ] Puede ver evaluaciones y asistencia
- [ ] Puede aprobar/rechazar solicitudes

### TECNOLOGIA

- [ ] Inicio de sesión exitoso
- [ ] Puede acceder al módulo Tecnología en SIGA
- [ ] Puede ver indicadores del sistema
- [ ] No puede acceder a Presidencia en SIGA

---

## Fase 5 — Comunicación interna

- [ ] Todos los usuarios recibieron sus credenciales de acceso de forma segura
- [ ] Se distribuyó el [Manual del Trabajador](./manual-trabajador.md) al personal operativo
- [ ] Se distribuyó el [Manual del Administrador](./manual-administrador.md) a PRESIDENTE, DIRECTOR y TECNOLOGIA
- [ ] Se comunicó el procedimiento para reportar problemas técnicos
- [ ] Se definió el canal de soporte (WhatsApp institucional, correo, etc.)

---

## Fase 6 — Observación post-lanzamiento (primeros 14 días)

- [ ] Días 1-7: revisar módulo Auditoría diariamente buscando errores inesperados
- [ ] Días 1-7: monitorear consola del navegador en busca de violaciones CSP
- [ ] Días 7-14: si no hay violaciones CSP legítimas, preparar PR #72 (CSP Enforcement)
- [ ] Día 14: exportar CSV de auditoría del período y archivar como línea base
- [ ] Día 14: evaluar si algún rol necesita ajuste de permisos basándose en el uso real

---

## Autorización de lanzamiento

| Verificación | Responsable | Fecha | Estado |
|---|---|---|---|
| Infraestructura completa | TECNOLOGIA | | ⬜ |
| Seguridad revisada | TECNOLOGIA | | ⬜ |
| Usuarios creados | RRHH | | ⬜ |
| Prueba funcional completa | DIRECTOR | | ⬜ |
| Comunicación al personal | RRHH | | ⬜ |
| **Autorización final de lanzamiento** | **PRESIDENTE** | | ⬜ |

> El sistema no debe abrirse a usuarios hasta que todos los puntos anteriores estén marcados.
