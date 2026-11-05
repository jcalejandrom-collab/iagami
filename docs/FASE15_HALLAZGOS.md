# FASE 15 — Hallazgos Adicionales

**Fecha:** 5 de noviembre de 2026  
**Basado en:** Inspección estática completa de Fases 1-14  
**Referencia:** Commit d9844fb

---

## Hallazgos nuevos detectados en Fase 15

### H15-001 — Helper getEstadoAsistencia devuelve null en lugar de 'sin_registro'
**Severidad:** Baja  
**Archivo:** `brigadas-ambientales/representante/index.html` y `brigadas-ambientales/comandante/index.html`  
**Situación encontrada:**  
```javascript
function getEstadoAsistencia(a) {
  if (!a) return null;
  if (a.estado) return a.estado;
  if (a.presente === true) return 'presente';
  if (a.presente === false) return 'ausente';
  return null;  // ← devuelve null
}
```
El plan original de Fase 14 especificaba devolver `'sin_registro'` como valor de fallback final. El código devuelve `null`. Esto no causa un error visible porque los portales verifican `if (!estado)` antes de renderizar, pero es inconsistente con la nomenclatura documentada.  
**Recomendación:** En la siguiente fase de correcciones menores, cambiar la última línea a `return 'sin_registro'` en ambos portales.  
**Impacto:** Nulo en funcionalidad actual. No bloquea ningún flujo.  
**Estado:** NO REQUIERE CORRECCIÓN INMEDIATA — anotar para Fase 16.

---

### H15-002 — start_url referenciado dos veces en zoom_routes.pb.js
**Severidad:** Ninguna (confirmación de buena práctica)  
**Archivo:** `pb_hooks/zoom_routes.pb.js`  
**Situación encontrada:**  
El grep de `start_url` arroja 2 coincidencias. Ambas son comentarios de seguridad explícitos que confirman que `start_url` **NO** se devuelve al cliente:
- Línea 105: `// NUNCA devolver start_url al cliente`
- Línea 130: `// Nunca devolver start_url`
**Resultado:** POSITIVO. Los comentarios son intencionados y correctos. No hay fuga de `start_url`.

---

### H15-003 — Colección brigadas_ambientales_schema.json duplicada
**Severidad:** Baja  
**Archivo:** `pb_schema/brigadas_ambientales_schema.json` (versión anterior)  
**Situación encontrada:**  
Existen dos archivos en `pb_schema/` para brigadas:
- `brigadas_ambientales_schema.json` — versión anterior de Fase 10
- `brigadas_sistema_completo.json` — versión correcta y final con todas las correcciones Fase 14

El archivo anterior puede causar confusión al momento de crear colecciones en PocketBase (importar el archivo incorrecto).  
**Recomendación:** Antes de importar en PocketBase, confirmar siempre el uso de `brigadas_sistema_completo.json`. Considerar agregar un README claro en `pb_schema/` indicando cuál es el archivo canónico.  
**Estado:** NO requiere corrección de código — solo instrucción operativa para el administrador de BD.

---

### H15-004 — Nginx rate limiting no aplicado en VPS (PENDIENTE crítico pre-producción)
**Severidad:** Media-Alta (riesgo real en producción)  
**Componente:** VPS 166.1.88.129 — Nginx  
**Situación encontrada:**  
La protección brute-force en JavaScript es la primera capa de defensa. Los 4 portales autenticados (profesor, estudiante, representante, comandante) tienen esta protección implementada. Sin embargo, puede ser bypasseada con scripts externos que hagan requests directamente a la API de PocketBase.

La configuración Nginx está completamente documentada en `docs/nginx_rate_limiting.md` y lista para aplicar. No fue aplicada en el VPS.

**Riesgo específico:** Un atacante puede ejecutar fuerza bruta directamente contra:
- `https://api.iagami.online/api/collections/profesores/auth-with-password`
- `https://api.iagami.online/api/collections/representantes_brigadas/auth-with-password`
- (y otros 3 endpoints)

**Prerequisito obligatorio antes de apertura pública:** Aplicar `docs/nginx_rate_limiting.md` en el VPS.  
**Estado:** PENDIENTE_VPS — requiere acción del administrador de infraestructura.

---

### H15-005 — Sin estrategia de respaldo automatizado documentada
**Severidad:** Media  
**Componente:** VPS / PocketBase  
**Situación encontrada:**  
El documento de Fase 14 menciona "Respaldo verificable de BD" como prerequisito antes de crear colecciones en producción, pero no existe un plan detallado de:
- Frecuencia de backup (diario/semanal)
- Destino del backup (s3, NFS, otro)
- Procedimiento de restauración
- Responsable de verificar el backup

PocketBase tiene soporte nativo para backups vía su panel de admin y endpoint `/api/backups`.  
**Recomendación:** Crear `docs/ESTRATEGIA_RESPALDO.md` con el procedimiento antes de Fase 17 (despliegue productivo).  
**Estado:** PENDIENTE — no bloquea Fase 15 pero es prerequisito de Fase 16.

---

## Confirmaciones positivas de Fase 15

| Aspecto | Resultado | Detalle |
|---|---|---|
| Consistencia schema-código | VERIFICADO | 9 colecciones y 3 portales sincrónicos |
| Correcciones Fase 14 (8 de 8) | VERIFICADO | Todos los greps de validación pasan |
| Protección datos menores | VERIFICADO | Código comentado + lógica esMenor aplicada |
| Secretos aislados en VPS | VERIFICADO | 0 archivos HTML con claves API |
| Versionado de schemas en git | VERIFICADO | 17 archivos JSON en pb_schema/ |
| XSS esc() en portales | VERIFICADO | 4/4 portales con esc() implementado |

---

## Resumen de riesgos

| ID | Hallazgo | Severidad | Bloquea producción | Acción requerida |
|---|---|---|---|---|
| H15-001 | null vs 'sin_registro' en helper | Baja | No | Anotar para Fase 16 |
| H15-002 | start_url en zoom_routes | N/A (positivo) | No | Ninguna |
| H15-003 | Schema brigadas duplicado | Baja | No | Instrucción operativa |
| H15-004 | Nginx no aplicado | Media-Alta | **Sí** | Aplicar en VPS antes de apertura |
| H15-005 | Sin plan de respaldo automatizado | Media | No (Fase 16) | Crear doc para Fase 16 |

---

*Informe generado en Fase 15 — Pruebas de Aceptación Institucional SIGAP IAGAMI. Inspección estática de código. Sin pruebas destructivas. Sin acceso a datos de producción.*
