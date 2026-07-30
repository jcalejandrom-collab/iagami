# Manual del Administrador — SIGAP / IAGAMI

> Para roles: PRESIDENTE · DIRECTOR · TECNOLOGIA · RRHH (según módulo)

---

## Acceso al sistema

### URL del panel administrativo

```
https://iagami.online/admin
```

### Inicio de sesión

1. Ingresar el correo electrónico institucional registrado en PocketBase.
2. Ingresar la contraseña asignada.
3. Presionar **Iniciar sesión**.

El sistema verifica la sesión automáticamente. Si el token expira, se redirige al login automáticamente — no es un error del sistema.

### Recuperación de acceso

Si un usuario no puede iniciar sesión:
1. Verificar que las credenciales corresponden al correo institucional (no personal).
2. Si la contraseña está incorrecta, el administrador de PocketBase debe restablecerla desde `https://api.iagami.online/_`.
3. Si el correo no existe en el sistema, el usuario debe ser creado primero (ver sección "Gestión de usuarios").

---

## Gestión de usuarios

Los usuarios se administran directamente en **PocketBase Admin** (`https://api.iagami.online/_`), no desde el panel de SIGAP.

### Crear un usuario nuevo

1. Acceder a `https://api.iagami.online/_` con credenciales de administrador PocketBase.
2. Ir a **Collections → admins**.
3. Hacer clic en **New record**.
4. Completar los campos:
   - `email`: correo institucional del usuario
   - `password`: contraseña inicial (el usuario debe cambiarla en su primer acceso)
   - `rol`: asignar según la [Matriz de Permisos](./matriz-permisos.md)
   - `nombre`: nombre completo
5. Guardar.

### Cambiar el rol de un usuario

1. En PocketBase Admin → Collections → admins.
2. Localizar el registro del usuario.
3. Modificar el campo `rol`.
4. Guardar.

El cambio toma efecto en el próximo inicio de sesión del usuario.

### Desactivar un usuario

No eliminar el registro — puede tener datos asociados. En su lugar:
- Cambiar la contraseña a una cadena aleatoria para impedir el acceso.
- O agregar un campo `activo: false` si está disponible en el esquema.

### Campos del usuario en PocketBase (colección `admins`)

| Campo | Descripción | Obligatorio |
|---|---|---|
| `email` | Correo institucional | ✅ |
| `password` | Contraseña (encriptada) | ✅ |
| `rol` | Rol del sistema | ✅ |
| `nombre` | Nombre completo | Recomendado |

---

## Módulo de Auditoría

Accesible desde el sidebar del panel admin → **Auditoría** (solo PRESIDENTE y DIRECTOR).

### Consultar registros

1. Abrir el panel admin → clic en **Auditoría** en el menú lateral.
2. Usar los filtros disponibles:
   - **Módulo**: filtrar por área del sistema (auth, noticias, denuncias, etc.)
   - **Nivel**: INFO (operación normal), WARNING (advertencia), ERROR (fallo)
   - **Usuario**: buscar por correo o nombre parcial
   - **Desde / Hasta**: rango de fechas
3. Presionar **Buscar**.

### Interpretar los niveles

| Nivel | Significado | Acción recomendada |
|---|---|---|
| `INFO` | Operación normal registrada | Ninguna — monitoreo rutinario |
| `WARNING` | Situación que requiere atención | Revisar el detalle, evaluar si requiere seguimiento |
| `ERROR` | Fallo en una operación | Investigar causa, escalar a TECNOLOGIA si persiste |

### Exportar registros para informes

1. Aplicar los filtros deseados (período, módulo, nivel).
2. Presionar **⬇ CSV**.
3. El archivo se descarga en formato CSV compatible con Excel.

El CSV incluye: fecha, usuario, módulo, acción, nivel, detalle. Máximo 2000 registros por exportación.

---

## Procedimiento ante incidentes

### Sistema no carga (pantalla en blanco o error de red)

```
1. Verificar conexión a internet del dispositivo.
2. Abrir DevTools (F12) → pestaña Console → buscar errores en rojo.
3. Verificar estado de la API: https://api.iagami.online/api/health
   • Respuesta esperada: {"code":200,"message":"API is healthy."}
   • Si no responde → escalar a TECNOLOGIA.
4. Si la API responde pero el panel no carga → limpiar caché del navegador.
5. Registrar el incidente en el módulo Auditoría o comunicar a TECNOLOGIA.
```

### Sesión expira frecuentemente

```
1. Verificar que el reloj del dispositivo esté sincronizado (hora correcta).
2. Verificar conectividad estable.
3. Si persiste → puede indicar problema con el token JWT en PocketBase.
   Escalar a TECNOLOGIA con captura de pantalla del error.
```

### Usuario no puede acceder

```
1. Confirmar que el usuario tiene registro en PocketBase (admins).
2. Confirmar que el rol está asignado correctamente.
3. Restablecer contraseña desde PocketBase Admin si es necesario.
4. Verificar que no haya dos registros con el mismo email.
```

### Error al guardar datos

```
1. Verificar conexión a internet.
2. Revisar el módulo Auditoría → filtrar por ERROR y el usuario afectado.
3. Si el error es 401 → la sesión expiró, volver a iniciar sesión.
4. Si el error es 500 → problema en el servidor. Escalar a TECNOLOGIA.
```

---

## Mantenimiento periódico recomendado

| Frecuencia | Tarea |
|---|---|
| Semanal | Revisar módulo Auditoría → filtrar por ERROR |
| Mensual | Exportar CSV de auditoría del mes para archivo institucional |
| Mensual | Verificar que no existan usuarios sin rol asignado |
| Trimestral | Revisar lista de usuarios activos — desactivar quienes ya no pertenecen al instituto |
| Ante cualquier cambio de personal | Crear/desactivar usuario y documentar en bitácora interna |

---

## Acceso a PocketBase Admin

```
URL:      https://api.iagami.online/_
Uso:      Gestión de colecciones, usuarios, respaldos manuales
Acceso:   Solo personal de TECNOLOGIA y administrador designado
```

> **Importante**: El acceso a PocketBase Admin es de nivel superior al panel SIGAP. No compartir estas credenciales con usuarios operativos.

---

## Escalamiento de incidentes

| Nivel | Tipo | Responsable |
|---|---|---|
| 1 | Problema de acceso individual | Administrador (PRESIDENTE/DIRECTOR) |
| 2 | Módulo no funciona, datos incorrectos | TECNOLOGIA |
| 3 | API caída, servidor inaccesible | TECNOLOGIA + procedimiento en `docs/disaster-recovery.md` |
| 4 | Pérdida de datos, incidente de seguridad | PRESIDENTE + TECNOLOGIA + proveedor VPS |
