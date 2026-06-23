# CLAUDE.md — CONSTITUCIÓN TÉCNICA DEL SISTEMA SIGAP / IAGAMI
> Versión definitiva. Leer completamente antes de cualquier acción.

---

## IDENTIDAD DEL PROYECTO

**SIGAP** (Sistema Integral de Gestión Ambiental Pública) es la
plataforma oficial del Instituto Autónomo de Gestión Ambiental del
Municipio Iribarren (IAGAMI), Barquisimeto, Estado Lara, Venezuela.

- **Portal público**: https://iagami.online
- **Panel administrativo**: https://iagami.online/admin
- **API**: https://api.iagami.online
- **VPS**: 166.1.88.129:8090 — acceso SSH con llave (sin contraseña)
- **Despliegue**: Cloudflare Pages → GitHub → VPS (Nginx → PocketBase)

---

## ⚠️ REGLA SUPREMA

ANTES DE MODIFICAR CUALQUIER ARCHIVO:

1. Leer el archivo completo antes de tocarlo.
2. Identificar todas las dependencias (cms/pb.js, rutas, colecciones).
3. Mostrar el plan con archivos afectados.
4. Esperar confirmación si hay riesgo.

**NUNCA asumir. NUNCA improvisar. NUNCA reestructurar sin autorización.**

Si algo no está claro → PREGUNTAR.
Si hay varias interpretaciones → PRESENTARLAS TODAS, no elegir en silencio.
Si el cambio parece mayor de lo solicitado → DETENERSE y confirmar.

---

## STACK TECNOLÓGICO — NO CAMBIAR

### Frontend
- HTML5 + CSS3 + JavaScript Vanilla puro
- SPA (Single Page Application) — cada módulo es su propia carpeta

### Backend
- **PocketBase 0.39.1** en VPS
- Autenticación JWT via colección `admins`
- Archivos: hasta 10 MB, soporta PDF e imágenes

### PROHIBIDO sin aprobación explícita
React, Vue, Angular, Svelte, NextJS, Nuxt, Tailwind, Bootstrap, jQuery,
o cualquier librería externa no existente actualmente en el proyecto.

---

## DISEÑO — COMPLETAMENTE CONGELADO

| Token | Valor |
|---|---|
| Verde institucional | `#1d6b3e` |
| Verde oscuro | `#1a3d2b` |
| Fondo de apoyo | `#f5f7f5` |
| Texto principal | `#1f2937` |
| Fuente títulos | Poppins |
| Fuente contenido | Inter |

**NO MODIFICAR bajo ninguna circunstancia:**
colores, tipografías, layout, espaciados globales, sidebar, navbar,
dashboard principal, diseño responsive aprobado.

Esto aplica aunque parezca una mejora, optimización o corrección de
accesibilidad. **Si no fue solicitado explícitamente → NO TOCAR.**

---

## ESTRUCTURA DE CARPETAS

```
iagami/
├── index.html                  Portal principal público
├── admin/                      Panel administrativo (25 módulos)
├── cms/
│   └── pb.js                   ⚠️ ARCHIVO CRÍTICO — cliente PocketBase
│                               Toda la lógica de API pasa por aquí
├── agenda/                     Módulo eventos
├── consejos-comunales/         Módulo consejos comunales
├── empresas/                   Módulo empresas
├── indicadores/                Módulo indicadores
├── noticias/                   Módulo noticias
├── organizacion/               Módulo organización
├── proyectos/                  Módulo proyectos
├── tramites/                   Módulo trámites
├── transparencia/              Módulo transparencia
├── revista/                    Revista digital
├── siga-iagami/                Sistema SIGA
├── sala-situacional/           Panel situacional
└── sistema-control/            Control interno
```

**cms/pb.js es el núcleo.** Cualquier cambio ahí afecta TODO el sistema.
Modificar solo si fue explícitamente solicitado y con máximo cuidado.

---

## PORTAL PÚBLICO — iagami.online

| Sección | Estado |
|---|---|
| Pantalla de bienvenida | ✅ Funcionando |
| Noticias | ✅ Funcionando |
| Proyectos | ✅ Funcionando |
| Agenda | ✅ Funcionando |
| Revista Digital | ✅ Funcionando |
| Trámites y Servicios | ✅ Funcionando |
| Documentos Públicos | ✅ Funcionando |
| Denuncias | ✅ Funcionando |
| Chatbot FAQ | ✅ Funcionando |

---

## PANEL ADMINISTRATIVO — 25 módulos

### Contenido y comunicación
Dashboard, Noticias, Trámites, Agenda, Transparencia, Revista Digital,
Chatbot FAQ, Pantalla de Bienvenida, Archivos

### Gestión ambiental
Proyectos, Indicadores, Empresas, Alertas, Multas, Denuncias,
Infraestructura Hídrica, Diagnóstico Territorial

### Participación ciudadana
Comunas, Consejos Comunales, Organización

### Administración interna
Gestión Humana (RRHH), Planificación, Control y Seguimiento,
Centro de Control, Sembrar Datos

---

## COLECCIONES POCKETBASE — 30+ activas

**ANTES DE CREAR UNA COLECCIÓN NUEVA → VERIFICAR QUE NO EXISTA.**

| Categoría | Colecciones |
|---|---|
| Contenido | noticias, tramites, eventos, proyectos, indicadores, documentos, revistas, bienvenida, media |
| Ciudadanía | denuncias, alertas, multas, chatbot_faq |
| Territorial | comunas, consejos_comunales, diagnosticos_ambientales, infraestructura_hidrica |
| Empresarial | empresas, inspecciones_empresas |
| RRHH | trabajadores, solicitudes_rrhh, capacitaciones, evaluaciones_desempeno, asistencia |
| Sistema | admins, iagami_sys_logs, planificacion, control_seguimiento |

**REGLAS DE BD:**
- NO renombrar campos existentes.
- NO eliminar campos existentes.
- NO duplicar colecciones.
- NO modificar la colección `admins` sin autorización.
- NO sobrescribir ni eliminar registros históricos.

---

## MÓDULOS CRÍTICOS — CUIDADO ESPECIAL

### cms/pb.js
Archivo central de toda la API. Un error aquí rompe el sistema completo.
Leer completo antes de modificar. Proponer cambio y esperar aprobación.

### Control y Seguimiento
Módulo de trazabilidad. Registra: trabajador, fecha, hora, ubicación,
evidencia fotográfica, resultado, estado, observaciones.
**NUNCA eliminar trazabilidad. NUNCA sobrescribir registros.**

### Denuncias
- Portal: formulario ciudadano con adjuntos (PDF/imágenes hasta 10 MB)
- Admin: detalle completo, descarga de evidencias, eliminación
- Ambas partes deben mantenerse sincronizadas.

### Autenticación
JWT via colección `admins`. No modificar el flujo de auth sin
autorización explícita. Una rotura aquí bloquea todo el panel admin.

---

## POLÍTICA DE DESARROLLO — FORMATO OBLIGATORIO

**Antes de ejecutar cualquier tarea, mostrar:**

```
📋 PLAN
Archivos que se leerán:     [lista]
Archivos que se modificarán: [lista]
Archivos que NO se tocarán:  [lista]
Colecciones PocketBase afectadas: [lista o "ninguna"]
Riesgos detectados: [descripción o "ninguno"]

¿Procedo?
```

**Después de ejecutar:**

```
✅ RESULTADO
Archivos modificados: [lista]
Cambios realizados:   [descripción específica línea a línea]
Verificación:         [qué se comprobó]
Sincronía validada:   Frontend ↔ Backend ↔ BD ↔ Permisos
```

---

## PRINCIPIO QUIRÚRGICO

Tocar **SOLO** lo que fue pedido. Nada más.

- No mejorar código adyacente no relacionado.
- No reformatear archivos completos.
- No reorganizar imports que ya funcionan.
- No agregar `console.log()` que luego se olvidan.
- No refactorizar funciones que funcionan correctamente.
- No cambiar nombres de variables "para que queden mejor".

Cada línea modificada debe trazarse directamente a la solicitud.

---

## PRINCIPIO DE SIMPLICIDAD

El mínimo código que resuelve el problema.

- Sin abstracciones innecesarias.
- Sin "flexibilidad futura" no solicitada.
- Sin capas extra de configuración.
- Si se pueden usar 50 líneas en lugar de 200 → usar 50.

---

## ERRORES HISTÓRICOS — NUNCA REPETIR

❌ Cambiar CSS sin autorización explícita.
❌ Romper autenticación JWT de PocketBase.
❌ Modificar cms/pb.js sin leerlo completo primero.
❌ Renombrar o eliminar campos en la BD.
❌ Alterar rutas del SPA sin mapear todas las dependencias.
❌ Reescribir módulos que ya funcionan para "mejorarlos".
❌ Crear colecciones duplicadas.
❌ Eliminar o sobrescribir registros históricos.
❌ Perder trazabilidad del módulo Control y Seguimiento.
❌ Desincronizar portal público y panel admin.
❌ Agregar librerías externas sin aprobación.
❌ Asumir estructura de un archivo sin leerlo primero.
❌ Dejar console.log() en producción.
❌ Romper la sincronía Cloudflare → GitHub → VPS.

---

## PRINCIPIO DE SINCRONIZACIÓN

Una tarea NO está terminada hasta validar sincronía entre:

**Frontend ↔ Backend ↔ Base de Datos ↔ Permisos ↔ Roles ↔ Dashboard ↔ Reportes**

---

## OBJETIVO FINAL

Consolidar SIGAP como la plataforma integral de gestión pública ambiental
del Municipio Iribarren con trazabilidad completa en:

- Gestión Territorial y Ambiental
- Fiscalización y Control Operacional
- Recursos Humanos e Indicadores de Gestión
- Planificación Estratégica e Información Institucional
- Participación Ciudadana

**Todo cambio debe contribuir a este objetivo.**
