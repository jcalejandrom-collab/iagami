# Protocolo UAT — SIGAP / IAGAMI

> User Acceptance Testing — Prueba de Aceptación de Usuarios
> A ejecutar con usuarios reales antes de apertura general al personal del Instituto.

---

## Propósito

Verificar que SIGAP funciona correctamente en condiciones reales con usuarios representativos
de cada rol. Las pruebas automáticas (Vitest, Playwright) validan el código; el UAT valida
que el sistema es usable e institucional.

El UAT también genera el tráfico inicial que permite observar violaciones CSP para
la posterior activación de `Content-Security-Policy` Enforcement (ver `docs/csp-enforcement-plan.md`).

---

## Participantes recomendados

| Rol | Cantidad mínima | Perfil |
|---|---|---|
| PRESIDENTE o DIRECTOR | 1 | Autoridad institucional, revisará módulo Auditoría |
| RRHH | 1 | Gestión de personal y solicitudes |
| COORDINADOR o SUPERVISOR | 1 | Seguimiento de equipos |
| TRABAJADOR | 2 | Usuarios operativos — perfiles diferentes si es posible |
| TECNOLOGIA | 1 | Soporte técnico + observación de consola del navegador |

**Total mínimo**: 6 personas. Más participantes aumentan la cobertura.

---

## Entorno de prueba

- **URL**: `https://iagami.online` y `https://iagami.online/admin`
- **Navegador recomendado**: Chrome o Firefox actualizado
- **Dispositivos**: computadora de escritorio + al menos 1 dispositivo móvil
- **Conexión**: red del Instituto (para reflejar condiciones reales)
- **DevTools**: TECNOLOGIA debe tener DevTools abierto en consola durante las pruebas para capturar violaciones CSP y errores JS

---

## Instrucciones para coordinador

1. Programar sesión de 2-3 horas con los participantes.
2. Crear los usuarios en PocketBase Admin antes de la sesión (ver `docs/manual-administrador.md`).
3. Comunicar a cada participante su usuario, contraseña y la lista de casos que debe probar.
4. Durante la sesión, pedir que verbalicen dudas o confusiones — no corregirles de inmediato, documentar el punto de confusión.
5. Al finalizar, recopilar el formulario de retroalimentación de cada participante.
6. Documentar hallazgos en la sección "Resultados" al final de este documento.

---

## Casos de prueba por rol

### PRESIDENTE / DIRECTOR

**Objetivo**: validar acceso completo, módulo Auditoría y visión general.

| # | Caso | Pasos | Resultado esperado | ✓/✗ |
|---|---|---|---|---|
| P-01 | Inicio de sesión | Ir a `/admin`, ingresar correo y contraseña | Dashboard carga con estadísticas | |
| P-02 | Navegación general | Hacer clic en 5 módulos distintos del sidebar | Cada módulo abre sin error | |
| P-03 | Módulo Auditoría | Sidebar → Auditoría | Tabla con registros del sistema visible | |
| P-04 | Filtro en Auditoría | Seleccionar módulo "auth", presionar Buscar | Tabla muestra solo registros de autenticación | |
| P-05 | Exportar CSV | Presionar "Exportar CSV" en Auditoría | Descarga un archivo `.csv` legible en Excel | |
| P-06 | Módulo restringido | Verificar que ve módulos RRHH y Centro de Control | Módulos accesibles sin mensaje de denegación | |
| P-07 | Cierre de sesión | Presionar "Cerrar sesión" | Redirige a login, sesión eliminada | |
| P-08 | Responsive | Abrir en dispositivo móvil o reducir ventana | Sidebar colapsa, contenido legible | |

---

### RRHH

**Objetivo**: validar gestión de personal, solicitudes y restricciones de módulos.

| # | Caso | Pasos | Resultado esperado | ✓/✗ |
|---|---|---|---|---|
| R-01 | Inicio de sesión | Ingresar credenciales RRHH | Dashboard carga | |
| R-02 | Ver trabajadores | Sidebar → Gestión Humana | Lista de trabajadores disponible | |
| R-03 | Ver solicitudes | Sidebar → Gestión Humana → pestaña Solicitudes | Solicitudes pendientes listadas | |
| R-04 | Aprobar solicitud | Si hay solicitud pendiente → aprobar | Estado cambia a "Aprobada" | |
| R-05 | Módulo Auditoría | Sidebar → Auditoría | Mensaje "Acceso restringido" visible, sin datos | |
| R-06 | Cierre de sesión | Presionar "Cerrar sesión" | Redirige a login | |

---

### COORDINADOR / SUPERVISOR

**Objetivo**: validar seguimiento de equipo y restricciones de módulos de presidencia.

| # | Caso | Pasos | Resultado esperado | ✓/✗ |
|---|---|---|---|---|
| S-01 | Inicio de sesión | Ingresar credenciales | Dashboard carga | |
| S-02 | Ver actividades propias | SIGA → Actividades → Mis actividades | Lista de actividades del usuario | |
| S-03 | Ver actividades del equipo | SIGA → Control → pestaña equipo | Actividades de los trabajadores a cargo | |
| S-04 | Módulo Auditoría | Sidebar → Auditoría | Mensaje "Acceso restringido", sin datos | |
| S-05 | Módulo Presidencia | Intentar acceder a Centro de Control | No accesible o mensaje de denegación | |
| S-06 | Cierre de sesión | Presionar "Cerrar sesión" | Redirige a login | |

---

### TRABAJADOR

**Objetivo**: validar registro de actividades propias y aislamiento de datos de terceros.

| # | Caso | Pasos | Resultado esperado | ✓/✗ |
|---|---|---|---|---|
| T-01 | Inicio de sesión | Ingresar credenciales | Dashboard carga | |
| T-02 | Registrar actividad | SIGA → Actividades → Nueva actividad | Formulario guarda correctamente | |
| T-03 | Ver mis actividades | SIGA → Actividades → Mis actividades | Solo aparecen actividades del propio usuario | |
| T-04 | No ver equipo | Verificar que no hay pestaña "Control de equipo" visible | Pestaña ausente o no accesible | |
| T-05 | Módulo Auditoría | Sidebar → Auditoría | Mensaje "Acceso restringido", sin datos | |
| T-06 | Solicitud RRHH | SIGA → Mi Solicitud → Nueva solicitud | Solicitud guardada, estado "Pendiente" | |
| T-07 | Reporte diario | SIGA → Reporte Diario | Formulario disponible y funcional | |
| T-08 | Cierre de sesión | Presionar "Cerrar sesión" | Redirige a login, sesión eliminada | |

---

### TECNOLOGIA

**Objetivo**: validar acceso técnico y observar comportamiento del sistema durante las pruebas.

| # | Caso | Pasos | Resultado esperado | ✓/✗ |
|---|---|---|---|---|
| TC-01 | Inicio de sesión | Ingresar credenciales | Dashboard carga | |
| TC-02 | Módulo Tecnología SIGA | SIGA → Tecnología | Accesible sin error | |
| TC-03 | Módulo Presidencia SIGA | SIGA → Presidencia | No accesible o denegado | |
| TC-04 | Módulo Auditoría | Admin → Auditoría | Acceso denegado (no es PRESIDENTE/DIRECTOR) | |
| TC-05 | Consola DevTools | F12 → Consola durante toda la sesión | Documentar cualquier error JS o violación CSP | |
| TC-06 | Carga de archivos | Probar adjuntar un PDF en un módulo que lo admita | Archivo sube y se puede descargar | |
| TC-07 | Cierre de sesión | Presionar "Cerrar sesión" | Redirige a login | |

---

## Pruebas transversales

A realizar independientemente del rol:

| # | Caso | Descripción | ✓/✗ |
|---|---|---|---|
| X-01 | Sin sesión → login | Ir directamente a `/admin` sin estar autenticado | Redirige a login automáticamente |
| X-02 | Token expirado | Esperar expiración (o borrar token manualmente) e intentar acción | Redirige a login, no error 500 |
| X-03 | Dispositivo móvil | Abrir el panel en teléfono | Sidebar funcional, formularios usables |
| X-04 | Velocidad de carga | Medir tiempo desde login hasta dashboard visible | < 3 segundos en red del Instituto |
| X-05 | Portal público | Acceder a `https://iagami.online` sin sesión | Carga, secciones visibles, formulario de denuncia funcional |

---

## Formulario de retroalimentación (por participante)

A completar al final de la sesión:

**Nombre**: _______________  
**Rol**: _______________  
**Fecha**: _______________

| Pregunta | Respuesta |
|---|---|
| ¿Pudiste iniciar sesión sin ayuda? | Sí / No |
| ¿Los módulos que necesitas están en el menú? | Sí / No / Parcialmente |
| ¿Hubo algún momento en que no supiste qué hacer? | Describir |
| ¿Encontraste algún error o comportamiento extraño? | Describir |
| ¿Hay información que necesitas y no encontraste? | Describir |
| Calificación general del sistema (1-5) | |
| Comentario libre | |

---

## Resultados del UAT

> A completar durante y después de la sesión. Este registro respalda la decisión de apertura general.

### Hallazgos por rol

| Rol | # Casos probados | # PASS | # FAIL | Hallazgos críticos |
|---|---|---|---|---|
| PRESIDENTE/DIRECTOR | | | | |
| RRHH | | | | |
| COORDINADOR/SUPERVISOR | | | | |
| TRABAJADOR (1) | | | | |
| TRABAJADOR (2) | | | | |
| TECNOLOGIA | | | | |

### Violaciones CSP detectadas durante el UAT

| Módulo | Recurso | Extensión o legítimo | Acción |
|---|---|---|---|
| | | | |

### Errores JS detectados durante el UAT

| Módulo | Error | Reproducible | Acción |
|---|---|---|---|
| | | | |

### Decisión post-UAT

- [ ] UAT aprobado — proceder con apertura general al personal
- [ ] UAT con observaciones — corregir los siguientes puntos antes de apertura:

  _[listar puntos]_

**Firmado por**: _______________  
**Cargo**: _______________  
**Fecha**: _______________
