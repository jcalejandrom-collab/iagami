# Matriz de Permisos — SIGAP / IAGAMI

> Extraída del código fuente. Refleja los controles reales implementados.
> Última actualización: PR #72.

---

## Roles del sistema

| Rol | Descripción |
|---|---|
| `PRESIDENTE` | Acceso completo a todos los módulos |
| `DIRECTOR` | Gestión institucional y supervisión general |
| `COORDINADOR` | Coordinación de equipos y actividades |
| `SUPERVISOR` | Supervisión operativa de trabajadores |
| `RRHH` | Gestión de recursos humanos |
| `TECNOLOGIA` | Soporte técnico y administración del sistema |
| `TRABAJADOR` | Operación de campo, acceso restringido a sus propios registros |

Los roles se asignan desde la colección `admins` en PocketBase. Un usuario solo puede tener un rol activo.

---

## Panel Administrativo — admin/index.html

El panel admin requiere autenticación JWT. Todos los roles autenticados acceden al panel; los módulos con restricción adicional se indican con los roles permitidos.

| Módulo | PRESIDENTE | DIRECTOR | COORDINADOR | SUPERVISOR | TRABAJADOR | RRHH | TECNOLOGIA |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Noticias | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Trámites | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Agenda | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Transparencia | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Organización | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Proyectos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Indicadores | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Empresas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Alertas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Denuncias | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Archivos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Consejos Comunales | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Comunas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Infraestructura Hídrica | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pantalla de Bienvenida | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Planificación | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Revista Digital | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chatbot FAQ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sembrar Datos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Diagnóstico Territorial | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gestión Humana (RRHH) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Centro de Control | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Control y Seguimiento | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Auditoría** ¹ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

¹ Auditoría tiene control de acceso validado en código (no solo visibilidad del botón). Ver `_auditCanAccess()` en `admin/index.html`.

> **Nota**: La restricción a nivel de escritura (quién puede crear, editar o eliminar registros) se gestiona en las reglas de colección de PocketBase, no solo en el frontend. Las reglas del frontend son una primera capa; la fuente de verdad es PocketBase.

---

## Sistema SIGA — siga-iagami/index.html

El sistema SIGA tiene control de acceso por rol en la navegación lateral. Los módulos sin restricción explícita son accesibles para todos los roles autenticados en SIGA.

| Módulo SIGA | PRESIDENTE | DIRECTOR | COORDINADOR | SUPERVISOR | TRABAJADOR | RRHH | TECNOLOGIA |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Mi Solicitud | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Registro de Presencia | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Planificación | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Comunicaciones | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mensajes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reporte Diario | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Alertas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **RRHH** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Asistencia** | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **Evaluaciones** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Seguimiento** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Indicadores** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Presidencia** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Tecnología** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### Restricciones adicionales dentro de módulos (SIGA)

| Funcionalidad | Roles con acceso |
|---|---|
| Ver actividades propias | Todos |
| Ver actividades del equipo (tab Control) | SUPERVISOR, DIRECTOR, PRESIDENTE, RRHH, COORDINADOR |
| Vista global de actividades | SUPERVISOR, DIRECTOR, PRESIDENTE, RRHH, COORDINADOR, TECNOLOGIA |
| Editar registros RRHH | RRHH, DIRECTOR, PRESIDENTE |
| Crear nuevas alertas | RRHH, SUPERVISOR, DIRECTOR, PRESIDENTE |
| Ver todas las alertas del equipo | RRHH, TECNOLOGIA, DIRECTOR, PRESIDENTE |
| Verificar/aprobar actividades | RRHH, SUPERVISOR, DIRECTOR, PRESIDENTE |
| Aprobar solicitudes RRHH | RRHH, DIRECTOR, PRESIDENTE |

---

## Criterios de asignación de roles

Al crear un usuario nuevo en PocketBase (`admins`), asignar el rol según:

| Si el usuario es… | Asignar rol |
|---|---|
| Presidente del instituto | `PRESIDENTE` |
| Director de área o departamento | `DIRECTOR` |
| Jefe de unidad / coordinador de proyectos | `COORDINADOR` |
| Supervisor de equipos de campo | `SUPERVISOR` |
| Personal operativo de campo | `TRABAJADOR` |
| Personal de Recursos Humanos | `RRHH` |
| Soporte técnico / TI | `TECNOLOGIA` |

**Principio de mínimo privilegio**: asignar siempre el rol más restrictivo que permita al usuario realizar su función. No asignar `PRESIDENTE` o `DIRECTOR` a personal operativo.
