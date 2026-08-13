# Plan de Activación CSP Enforcement — SIGAP / IAGAMI

> Estado: **PREPARADO — no activado**
> Fecha de preparación: 2026-07-30
> Activación: condicionada a ≥7 días de observación limpia en producción

---

## ¿Qué es esto?

SIGAP opera actualmente con `Content-Security-Policy-Report-Only` en el archivo `_headers`.
En este modo, el navegador **detecta pero no bloquea** recursos que violarían la política de seguridad.
Los reportes aparecen en la consola de DevTools del navegador bajo "Content Security Policy".

Cuando se active `Content-Security-Policy` (Enforcement), el navegador **bloqueará activamente**
cualquier recurso que no esté autorizado explícitamente. Esto aumenta la seguridad pero puede
interrumpir funcionalidad si hay recursos legítimos no cubiertos por la directiva actual.

---

## Condiciones de activación

**Todas** deben cumplirse antes de ejecutar el cambio:

- [ ] El sistema lleva ≥7 días en producción con tráfico real de usuarios
- [ ] Se revisó la consola de DevTools en al menos 3 sesiones distintas (roles diferentes) buscando violaciones CSP
- [ ] No hay violaciones CSP legítimas sin resolver (solo violaciones de extensiones del navegador o herramientas externas son aceptables)
- [ ] UAT completado — ver `docs/uat-protocol.md`
- [ ] `npm run lint && npm test` pasan en la rama antes del cambio
- [ ] Backup de `_headers` creado antes de modificar
- [ ] Existe un plan de rollback ejecutable en < 5 minutos (ver sección más abajo)

---

## Cambio exacto a ejecutar

**Archivo**: `_headers`

**Cambio**: Una sola línea — renombrar la directiva.

Antes:
```
Content-Security-Policy-Report-Only: default-src 'self'; ...
```

Después:
```
Content-Security-Policy: default-src 'self'; ...
```

El valor completo de la directiva **no se modifica**. Solo cambia el nombre del header.
Esto hace que el cambio sea revisable de un vistazo y reversible en segundos.

---

## Cómo revisar violaciones CSP antes de activar

1. Abrir Chrome o Firefox en el sistema en producción.
2. Presionar F12 → pestaña **Consola**.
3. Filtrar por `Content-Security-Policy`.
4. Navegar por todos los módulos del panel admin con el rol PRESIDENTE.
5. Repetir con un usuario TRABAJADOR y un usuario RRHH.
6. Documentar cada violación encontrada en la tabla siguiente.

### Registro de violaciones observadas

| Fecha | Módulo | Recurso bloqueado | Origen (extensión/legítimo) | Acción tomada |
|---|---|---|---|---|
| — | — | — | — | — |

> Si una violación es de una extensión del navegador (Grammarly, AdBlock, LastPass, etc.): ignorar.
> Si una violación es de un recurso cargado por el propio sistema: debe resolverse antes de activar Enforcement.

---

## Directiva CSP actual (referencia)

```
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://browser.sentry-cdn.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https://api.iagami.online;
  connect-src 'self' https://api.iagami.online https://*.ingest.sentry.io;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
```

Si antes de activar se detecta un recurso legítimo no cubierto, la directiva debe actualizarse primero
y luego observarse ≥2 días adicionales sin nuevas violaciones.

---

## Procedimiento de rollback

Si tras activar Enforcement se detectan problemas (módulos que no cargan, funciones que fallan):

**Tiempo estimado de rollback: < 5 minutos**

1. Ir al repositorio → `_headers`.
2. Cambiar `Content-Security-Policy:` de vuelta a `Content-Security-Policy-Report-Only:`.
3. Hacer commit y push a `main`.
4. Cloudflare Pages despliega en ~60 segundos.
5. Verificar que el sistema funciona nuevamente.
6. Documentar qué recurso causó el problema y actualizar la directiva antes del siguiente intento.

---

## Checklist de activación (firmar antes de ejecutar)

| Condición | Verificado por | Fecha | Estado |
|---|---|---|---|
| ≥7 días observación sin violaciones legítimas | TECNOLOGIA | | ⬜ |
| UAT completado (todos los roles) | DIRECTOR | | ⬜ |
| Backup de `_headers` creado | TECNOLOGIA | | ⬜ |
| `npm test` pasa en rama actual | TECNOLOGIA | | ⬜ |
| Plan de rollback comunicado al equipo | TECNOLOGIA | | ⬜ |
| **Autorización para activar** | **PRESIDENTE** | | ⬜ |

---

## Después de activar

- [ ] Verificar en DevTools que **no aparecen errores CSP** en los módulos principales
- [ ] Confirmar que login, dashboard, auditoría y carga de archivos siguen funcionando
- [ ] Documentar fecha de activación en este archivo
- [ ] Archivar el registro de violaciones observadas como evidencia de la decisión

**Fecha de activación efectiva**: _pendiente_
**Autorizado por**: _pendiente_
