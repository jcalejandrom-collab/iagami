#!/bin/bash
# IAGAMI — Creación de 25 colecciones nuevas en PocketBase
# Uso: ./create_new_collections.sh <email_admin> <password_admin>
# NUNCA hardcodear credenciales en este archivo

set -euo pipefail

PB_URL="http://127.0.0.1:8090"
ADMIN_EMAIL="${1:-}"
ADMIN_PASS="${2:-}"

[[ -z "$ADMIN_EMAIL" ]] && { echo "Uso: $0 <email_admin> <password_admin>"; exit 1; }
[[ -z "$ADMIN_PASS"  ]] && { echo "Uso: $0 <email_admin> <password_admin>"; exit 1; }

# --- Autenticar ---
echo "Autenticando en PocketBase..."
AUTH=$(curl -s -X POST "${PB_URL}/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}" 2>/dev/null) || {
  echo "ERROR: No se pudo conectar a PocketBase en ${PB_URL}"
  exit 1
}

TOKEN=$(echo "$AUTH" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null || true)
[[ -z "$TOKEN" ]] && { echo "ERROR: Credenciales incorrectas"; exit 1; }
echo "✅ Autenticado correctamente"
echo ""

OK=0
FAIL=0

# --- Función crear colección ---
create_col() {
  local NAME="$1"
  local JSON="$2"
  local RESP
  RESP=$(curl -s -X POST "${PB_URL}/api/collections" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$JSON" 2>/dev/null)

  if echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('id') else 1)" 2>/dev/null; then
    echo "  ✅ $NAME"
    OK=$((OK+1))
  else
    ERR=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','ERROR'))" 2>/dev/null || echo "ERROR")
    echo "  ⚠️  $NAME: $ERR"
    FAIL=$((FAIL+1))
  fi
}

# ============================================================
# AULA AMBIENTAL — AUTH
# ============================================================
echo "=== Aula Ambiental — AUTH ==="

create_col "representantes_legales" '{
  "name": "representantes_legales",
  "type": "base",
  "schema": [
    {"name":"nombres","type":"text","required":true,"options":{"min":2,"max":100}},
    {"name":"apellidos","type":"text","required":true,"options":{"min":2,"max":100}},
    {"name":"cedula","type":"text","required":true,"options":{"min":6,"max":12}},
    {"name":"parentesco","type":"select","required":true,"options":{"maxSelect":1,"values":["Padre","Madre","Tutor Legal","Abuelo/a","Otro"]}},
    {"name":"telefono","type":"text","required":true,"options":{"min":7,"max":15}},
    {"name":"telefono_alt","type":"text","required":false,"options":{"max":15}},
    {"name":"correo","type":"email","required":false,"options":{}},
    {"name":"direccion","type":"text","required":true,"options":{"min":5,"max":300}},
    {"name":"parroquia","type":"select","required":true,"options":{"maxSelect":1,"values":["Catedral","Concepcion","El Cují","Aguedo Felipe Alvarado","Juan de Villegas","Tamaca","Unión","Buena Vista","Juárez","Santa Rosa","Agua Viva","Pío Tamayo","Ramón Ignacio Méndez","Heriberto Arroyo","Flor de Patria","Diego de Lozada"]}},
    {"name":"comunidad","type":"text","required":true,"options":{"min":2,"max":150}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

create_col "profesores" '{
  "name": "profesores",
  "type": "auth",
  "schema": [
    {"name":"nombres","type":"text","required":true,"options":{"min":2,"max":100}},
    {"name":"apellidos","type":"text","required":true,"options":{"min":2,"max":100}},
    {"name":"cedula","type":"text","required":false,"options":{"max":12}},
    {"name":"telefono","type":"text","required":false,"options":{"max":15}},
    {"name":"especialidad","type":"text","required":false,"options":{"max":200}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["activo","suspendido","inactivo"]}},
    {"name":"avatar","type":"file","required":false,"options":{"maxSelect":1,"maxSize":2097152,"mimeTypes":["image/jpeg","image/png","image/webp"]}}
  ],
  "listRule": "@request.auth.id != '\'''\''",
  "viewRule": null,
  "createRule": null,
  "updateRule": "@request.auth.id = id",
  "deleteRule": null
}'

create_col "estudiantes" '{
  "name": "estudiantes",
  "type": "auth",
  "schema": [
    {"name":"nombres","type":"text","required":true,"options":{"min":2,"max":100}},
    {"name":"apellidos","type":"text","required":true,"options":{"min":2,"max":100}},
    {"name":"cedula","type":"text","required":false,"options":{"max":12}},
    {"name":"fecha_nacimiento","type":"text","required":false,"options":{"max":10}},
    {"name":"tipo","type":"select","required":true,"options":{"maxSelect":1,"values":["adulto","adolescente","nino"]}},
    {"name":"telefono","type":"text","required":false,"options":{"max":15}},
    {"name":"parroquia","type":"select","required":false,"options":{"maxSelect":1,"values":["Catedral","Concepcion","El Cují","Aguedo Felipe Alvarado","Juan de Villegas","Tamaca","Unión","Buena Vista","Juárez","Santa Rosa","Agua Viva","Pío Tamayo","Ramón Ignacio Méndez","Heriberto Arroyo","Flor de Patria","Diego de Lozada"]}},
    {"name":"comunidad","type":"text","required":false,"options":{"max":150}},
    {"name":"institucion","type":"text","required":false,"options":{"max":200}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["pendiente","activo","suspendido","inactivo"]}},
    {"name":"avatar","type":"file","required":false,"options":{"maxSelect":1,"maxSize":2097152,"mimeTypes":["image/jpeg","image/png","image/webp"]}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": "@request.auth.id = id",
  "deleteRule": null
}'

# ============================================================
# BRIGADAS 360° — AUTH
# ============================================================
echo ""
echo "=== Brigadas 360° — AUTH ==="

create_col "comandantes_brigadas" '{
  "name": "comandantes_brigadas",
  "type": "auth",
  "schema": [
    {"name":"nombres","type":"text","required":true,"options":{"max":100}},
    {"name":"apellidos","type":"text","required":true,"options":{"max":100}},
    {"name":"cargo","type":"text","required":false,"options":{"max":100}},
    {"name":"telefono","type":"text","required":false,"options":{"max":15}},
    {"name":"parroquia_asignada","type":"text","required":false,"options":{"max":100}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["activo","suspendido","inactivo"]}},
    {"name":"foto","type":"file","required":false,"options":{"maxSelect":1,"maxSize":5242880,"mimeTypes":["image/jpeg","image/png","image/webp"]}},
    {"name":"fecha_designacion","type":"date","required":false,"options":{}}
  ],
  "listRule": "@request.auth.id != '\'''\''",
  "viewRule": "@request.auth.id != '\'''\''",
  "createRule": null,
  "updateRule": "@request.auth.id = id",
  "deleteRule": null
}'

create_col "representantes_brigadas" '{
  "name": "representantes_brigadas",
  "type": "auth",
  "schema": [
    {"name":"nombres","type":"text","required":true,"options":{"max":100}},
    {"name":"apellidos","type":"text","required":true,"options":{"max":100}},
    {"name":"tipo","type":"select","required":true,"options":{"maxSelect":1,"values":["representante_comuna","representante_consejo_comunal"]}},
    {"name":"parroquia","type":"text","required":false,"options":{"max":100}},
    {"name":"cargo","type":"text","required":false,"options":{"max":100}},
    {"name":"telefono","type":"text","required":false,"options":{"max":15}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["pendiente","activo","suspendido"]}},
    {"name":"fecha_designacion","type":"date","required":false,"options":{}}
  ],
  "listRule": "@request.auth.id != '\'''\''",
  "viewRule": "@request.auth.id != '\'''\''",
  "createRule": null,
  "updateRule": "@request.auth.id = id",
  "deleteRule": null
}'

# ============================================================
# BRIGADAS 360° — BASE
# ============================================================
echo ""
echo "=== Brigadas 360° — BASE ==="

create_col "brigadistas" '{
  "name": "brigadistas",
  "type": "base",
  "schema": [
    {"name":"nombres","type":"text","required":true,"options":{"min":2,"max":100}},
    {"name":"apellidos","type":"text","required":true,"options":{"min":2,"max":100}},
    {"name":"cedula","type":"text","required":true,"options":{"min":6,"max":12}},
    {"name":"fecha_nacimiento","type":"text","required":true,"options":{"max":10}},
    {"name":"genero","type":"select","required":true,"options":{"maxSelect":1,"values":["Masculino","Femenino","Prefiero no indicar"]}},
    {"name":"telefono","type":"text","required":true,"options":{"min":7,"max":15}},
    {"name":"correo","type":"email","required":false,"options":{}},
    {"name":"parroquia","type":"select","required":true,"options":{"maxSelect":1,"values":["Catedral","Concepcion","El Cují","Aguedo Felipe Alvarado","Juan de Villegas","Tamaca","Unión","Buena Vista","Juárez","Santa Rosa","Agua Viva","Pío Tamayo","Ramón Ignacio Méndez","Heriberto Arroyo","Flor de Patria","Diego de Lozada"]}},
    {"name":"comunidad","type":"text","required":true,"options":{"min":2,"max":150}},
    {"name":"areas_interes","type":"json","required":false,"options":{}},
    {"name":"disponibilidad","type":"select","required":true,"options":{"maxSelect":1,"values":["Fines de semana","Entre semana","Ambos","Tiempo completo"]}},
    {"name":"experiencia","type":"text","required":false,"options":{"max":500}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["pendiente","activo","inactivo"]}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": "",
  "updateRule": null,
  "deleteRule": null
}'

create_col "brigadistas_menores" '{
  "name": "brigadistas_menores",
  "type": "base",
  "schema": [
    {"name":"nombres","type":"text","required":true,"options":{"min":2,"max":100}},
    {"name":"apellidos","type":"text","required":true,"options":{"min":2,"max":100}},
    {"name":"fecha_nacimiento","type":"text","required":true,"options":{"max":10}},
    {"name":"edad","type":"number","required":false,"options":{"min":null,"max":null,"noDecimal":true}},
    {"name":"categoria","type":"select","required":true,"options":{"maxSelect":1,"values":["adolescente","nino"]}},
    {"name":"genero","type":"select","required":true,"options":{"maxSelect":1,"values":["Masculino","Femenino","Prefiero no indicar"]}},
    {"name":"institucion_educativa","type":"text","required":true,"options":{"min":2,"max":200}},
    {"name":"grado","type":"text","required":false,"options":{"max":50}},
    {"name":"parroquia","type":"select","required":true,"options":{"maxSelect":1,"values":["Catedral","Concepcion","El Cují","Aguedo Felipe Alvarado","Juan de Villegas","Tamaca","Unión","Buena Vista","Juárez","Santa Rosa","Agua Viva","Pío Tamayo","Ramón Ignacio Méndez","Heriberto Arroyo","Flor de Patria","Diego de Lozada"]}},
    {"name":"comunidad","type":"text","required":true,"options":{"min":2,"max":150}},
    {"name":"areas_interes","type":"json","required":false,"options":{}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["pendiente_consentimiento","consentimiento_cargado","en_revision","aprobado","rechazado","retirado"]}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": "",
  "updateRule": null,
  "deleteRule": null
}'

create_col "consentimientos" '{
  "name": "consentimientos",
  "type": "base",
  "schema": [
    {"name":"documento","type":"file","required":true,"options":{"maxSelect":1,"maxSize":10485760,"mimeTypes":["application/pdf"]}},
    {"name":"fecha_firma","type":"date","required":false,"options":{}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["pendiente","aprobado","rechazado"]}},
    {"name":"observaciones","type":"text","required":false,"options":{"max":500}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": "",
  "updateRule": null,
  "deleteRule": null
}'

create_col "brigadas" '{
  "name": "brigadas",
  "type": "base",
  "schema": [
    {"name":"nombre","type":"text","required":true,"options":{"max":200}},
    {"name":"codigo","type":"text","required":false,"options":{"max":20}},
    {"name":"parroquia","type":"text","required":true,"options":{"max":100}},
    {"name":"fecha_conformacion","type":"date","required":false,"options":{}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["en_formacion","activa","en_planificacion","suspendida","inactiva"]}},
    {"name":"area_actuacion","type":"text","required":false,"options":{"max":300}},
    {"name":"objetivos","type":"text","required":false,"options":{"max":1000}},
    {"name":"total_brigadistas","type":"number","required":false,"options":{"min":0,"max":null,"noDecimal":true}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

create_col "actividades_brigadas" '{
  "name": "actividades_brigadas",
  "type": "base",
  "schema": [
    {"name":"titulo","type":"text","required":true,"options":{"max":200}},
    {"name":"tipo","type":"select","required":true,"options":{"maxSelect":1,"values":["jornada_limpieza","siembra","charla_ambiental","censo","formacion","visita","otro"]}},
    {"name":"fecha","type":"date","required":true,"options":{}},
    {"name":"hora_inicio","type":"text","required":false,"options":{"max":5}},
    {"name":"hora_fin","type":"text","required":false,"options":{"max":5}},
    {"name":"lugar","type":"text","required":false,"options":{"max":200}},
    {"name":"parroquia","type":"text","required":false,"options":{"max":100}},
    {"name":"descripcion","type":"text","required":false,"options":{"max":1000}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["planificada","en_ejecucion","ejecutada","cancelada","postergada"]}},
    {"name":"total_participantes","type":"number","required":false,"options":{"min":0,"max":null,"noDecimal":true}},
    {"name":"resultado","type":"text","required":false,"options":{"max":1000}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

create_col "asistencia_brigadas" '{
  "name": "asistencia_brigadas",
  "type": "base",
  "schema": [
    {"name":"presente","type":"bool","required":false,"options":{}},
    {"name":"hora_llegada","type":"text","required":false,"options":{"max":5}},
    {"name":"observaciones","type":"text","required":false,"options":{"max":300}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

create_col "comunicados_brigadas" '{
  "name": "comunicados_brigadas",
  "type": "base",
  "schema": [
    {"name":"asunto","type":"text","required":true,"options":{"max":200}},
    {"name":"contenido","type":"text","required":true,"options":{"max":3000}},
    {"name":"destinatarios","type":"select","required":true,"options":{"maxSelect":1,"values":["todos","parroquia","comuna","consejo_comunal"]}},
    {"name":"parroquia_destino","type":"text","required":false,"options":{"max":100}},
    {"name":"prioridad","type":"select","required":true,"options":{"maxSelect":1,"values":["normal","urgente"]}},
    {"name":"fecha_envio","type":"date","required":false,"options":{}},
    {"name":"autor_id","type":"text","required":false,"options":{"max":50}},
    {"name":"tipo_autor","type":"text","required":false,"options":{"max":50}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

create_col "solicitudes_apoyo" '{
  "name": "solicitudes_apoyo",
  "type": "base",
  "schema": [
    {"name":"tipo_apoyo","type":"select","required":true,"options":{"maxSelect":1,"values":["plantas","arboles","herramientas","bolsas","guantes","agua","transporte","material_educativo","apoyo_tecnico","formacion","otro"]}},
    {"name":"descripcion","type":"text","required":true,"options":{"max":1000}},
    {"name":"cantidad","type":"text","required":false,"options":{"max":100}},
    {"name":"urgencia","type":"select","required":false,"options":{"maxSelect":1,"values":["baja","media","alta"]}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["pendiente","en_proceso","aprobada","rechazada","entregada"]}},
    {"name":"respuesta_institucional","type":"text","required":false,"options":{"max":1000}},
    {"name":"fecha_respuesta","type":"date","required":false,"options":{}},
    {"name":"evidencia","type":"file","required":false,"options":{"maxSelect":5,"maxSize":10485760,"mimeTypes":["image/jpeg","image/png","image/webp","application/pdf"]}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

create_col "informes_actividad" '{
  "name": "informes_actividad",
  "type": "base",
  "schema": [
    {"name":"titulo","type":"text","required":true,"options":{"max":200}},
    {"name":"resumen","type":"text","required":true,"options":{"max":3000}},
    {"name":"total_participantes","type":"number","required":false,"options":{"min":0,"max":null,"noDecimal":true}},
    {"name":"logros","type":"text","required":false,"options":{"max":1000}},
    {"name":"dificultades","type":"text","required":false,"options":{"max":1000}},
    {"name":"recomendaciones","type":"text","required":false,"options":{"max":1000}},
    {"name":"estado","type":"select","required":false,"options":{"maxSelect":1,"values":["borrador","enviado","revisado"]}},
    {"name":"adjuntos","type":"file","required":false,"options":{"maxSelect":10,"maxSize":10485760,"mimeTypes":["image/jpeg","image/png","image/webp","application/pdf"]}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

create_col "evidencias_brigadas" '{
  "name": "evidencias_brigadas",
  "type": "base",
  "schema": [
    {"name":"tipo","type":"select","required":true,"options":{"maxSelect":1,"values":["foto","video","documento","otro"]}},
    {"name":"descripcion","type":"text","required":false,"options":{"max":300}},
    {"name":"archivo","type":"file","required":true,"options":{"maxSelect":5,"maxSize":10485760,"mimeTypes":["image/jpeg","image/png","image/webp","video/mp4","application/pdf"]}},
    {"name":"fecha_captura","type":"date","required":false,"options":{}},
    {"name":"coordenadas","type":"text","required":false,"options":{"max":50}},
    {"name":"verificada","type":"bool","required":false,"options":{}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

# ============================================================
# AULA AMBIENTAL — BASE
# ============================================================
echo ""
echo "=== Aula Ambiental — BASE ==="

create_col "solicitudes_inscripcion" '{
  "name": "solicitudes_inscripcion",
  "type": "base",
  "schema": [
    {"name":"nombres_apellidos","type":"text","required":true,"options":{"max":100}},
    {"name":"cedula","type":"text","required":false,"options":{"max":12}},
    {"name":"correo","type":"email","required":false,"options":{}},
    {"name":"telefono","type":"text","required":false,"options":{"max":15}},
    {"name":"fecha_nacimiento","type":"text","required":false,"options":{"max":10}},
    {"name":"tipo","type":"select","required":true,"options":{"maxSelect":1,"values":["adulto","adolescente","nino"]}},
    {"name":"parroquia","type":"select","required":false,"options":{"maxSelect":1,"values":["Catedral","Concepcion","El Cují","Aguedo Felipe Alvarado","Juan de Villegas","Tamaca","Unión","Buena Vista","Juárez","Santa Rosa","Agua Viva","Pío Tamayo","Ramón Ignacio Méndez","Heriberto Arroyo","Flor de Patria","Diego de Lozada"]}},
    {"name":"comunidad_institucion","type":"text","required":false,"options":{"max":200}},
    {"name":"rep_nombres","type":"text","required":false,"options":{"max":100}},
    {"name":"rep_apellidos","type":"text","required":false,"options":{"max":100}},
    {"name":"rep_cedula","type":"text","required":false,"options":{"max":12}},
    {"name":"rep_telefono","type":"text","required":false,"options":{"max":15}},
    {"name":"rep_correo","type":"email","required":false,"options":{}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["pendiente","aprobada","rechazada"]}},
    {"name":"observaciones","type":"text","required":false,"options":{"max":500}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": "",
  "updateRule": null,
  "deleteRule": null
}'

create_col "cursos_aula" '{
  "name": "cursos_aula",
  "type": "base",
  "schema": [
    {"name":"nombre","type":"text","required":true,"options":{"max":200}},
    {"name":"descripcion","type":"text","required":false,"options":{"max":1000}},
    {"name":"profesor_nombre","type":"text","required":false,"options":{"max":150}},
    {"name":"categoria","type":"select","required":true,"options":{"maxSelect":1,"values":["ambiental","ecosocialismo","reciclaje","agua","biodiversidad","clima","otro"]}},
    {"name":"nivel","type":"select","required":false,"options":{"maxSelect":1,"values":["inicial","primaria","secundaria","adultos","brigadistas","general"]}},
    {"name":"imagen_url","type":"url","required":false,"options":{}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["activo","inactivo","finalizado"]}},
    {"name":"publicado","type":"bool","required":false,"options":{}}
  ],
  "listRule": "",
  "viewRule": "",
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

create_col "clases_virtuales" '{
  "name": "clases_virtuales",
  "type": "base",
  "schema": [
    {"name":"titulo","type":"text","required":true,"options":{"max":200}},
    {"name":"descripcion","type":"text","required":false,"options":{"max":500}},
    {"name":"fecha","type":"date","required":true,"options":{}},
    {"name":"hora_inicio","type":"text","required":true,"options":{"max":5}},
    {"name":"duracion_min","type":"number","required":false,"options":{"min":0,"max":null,"noDecimal":true}},
    {"name":"zoom_meeting_id","type":"text","required":false,"options":{"max":50}},
    {"name":"join_url","type":"url","required":false,"options":{}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["programada","en_curso","finalizada","cancelada"]}},
    {"name":"grabacion_url","type":"url","required":false,"options":{}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

create_col "inscripciones_curso" '{
  "name": "inscripciones_curso",
  "type": "base",
  "schema": [
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["activo","retirado","completado","suspendido"]}},
    {"name":"fecha_inscripcion","type":"text","required":false,"options":{"max":10}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

create_col "evaluaciones" '{
  "name": "evaluaciones",
  "type": "base",
  "schema": [
    {"name":"titulo","type":"text","required":true,"options":{"max":200}},
    {"name":"descripcion","type":"text","required":false,"options":{"max":500}},
    {"name":"tipo","type":"select","required":true,"options":{"maxSelect":1,"values":["quiz","examen","tarea","diagnostico"]}},
    {"name":"preguntas","type":"json","required":false,"options":{}},
    {"name":"tiempo_limite_min","type":"number","required":false,"options":{"min":0,"max":null,"noDecimal":true}},
    {"name":"puntaje_total","type":"number","required":false,"options":{"min":0,"max":null,"noDecimal":false}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["borrador","publicada","cerrada"]}},
    {"name":"fecha_apertura","type":"date","required":false,"options":{}},
    {"name":"fecha_cierre","type":"date","required":false,"options":{}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

create_col "tareas" '{
  "name": "tareas",
  "type": "base",
  "schema": [
    {"name":"titulo","type":"text","required":true,"options":{"max":200}},
    {"name":"descripcion","type":"text","required":false,"options":{"max":2000}},
    {"name":"puntos_max","type":"number","required":false,"options":{"min":0,"max":null,"noDecimal":false}},
    {"name":"fecha_entrega","type":"date","required":false,"options":{}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["borrador","publicada","cerrada"]}},
    {"name":"adjunto","type":"file","required":false,"options":{"maxSelect":1,"maxSize":10485760,"mimeTypes":["image/jpeg","image/png","application/pdf"]}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

create_col "entregas_tareas" '{
  "name": "entregas_tareas",
  "type": "base",
  "schema": [
    {"name":"contenido","type":"text","required":false,"options":{"max":3000}},
    {"name":"archivos","type":"file","required":false,"options":{"maxSelect":3,"maxSize":10485760,"mimeTypes":["image/jpeg","image/png","application/pdf"]}},
    {"name":"calificacion","type":"number","required":false,"options":{"min":0,"max":null,"noDecimal":false}},
    {"name":"retroalimentacion","type":"text","required":false,"options":{"max":1000}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["entregada","calificada","tarde"]}},
    {"name":"fecha_entrega","type":"date","required":false,"options":{}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

create_col "resultados_evaluacion" '{
  "name": "resultados_evaluacion",
  "type": "base",
  "schema": [
    {"name":"respuestas","type":"json","required":false,"options":{}},
    {"name":"nota","type":"number","required":false,"options":{"min":0,"max":null,"noDecimal":false}},
    {"name":"puntaje_total","type":"number","required":false,"options":{"min":0,"max":null,"noDecimal":false}},
    {"name":"tiempo_usado_seg","type":"number","required":false,"options":{"min":0,"max":null,"noDecimal":true}},
    {"name":"estado","type":"select","required":false,"options":{"maxSelect":1,"values":["en_progreso","completada"]}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

create_col "asistencia_virtual" '{
  "name": "asistencia_virtual",
  "type": "base",
  "schema": [
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["presente","ausente","justificado"]}},
    {"name":"observaciones","type":"text","required":false,"options":{"max":300}}
  ],
  "listRule": null,
  "viewRule": null,
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

create_col "certificados" '{
  "name": "certificados",
  "type": "base",
  "schema": [
    {"name":"nombre_estudiante","type":"text","required":true,"options":{"max":150}},
    {"name":"nombre_curso","type":"text","required":true,"options":{"max":200}},
    {"name":"horas","type":"number","required":false,"options":{"min":0,"max":null,"noDecimal":true}},
    {"name":"fecha_inicio","type":"text","required":false,"options":{"max":10}},
    {"name":"fecha_fin","type":"text","required":false,"options":{"max":10}},
    {"name":"fecha_emision","type":"text","required":false,"options":{"max":10}},
    {"name":"nombre_profesor","type":"text","required":false,"options":{"max":150}},
    {"name":"codigo_verificacion","type":"text","required":true,"options":{"min":8,"max":60}},
    {"name":"estado","type":"select","required":true,"options":{"maxSelect":1,"values":["emitido","revocado"]}}
  ],
  "listRule": "",
  "viewRule": "",
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}'

# ============================================================
# RESUMEN
# ============================================================
echo ""
echo "============================================"
echo "RESUMEN: ${OK} colecciones creadas, ${FAIL} con error"
echo "============================================"
echo ""
echo "NOTA: Los campos de relación (relation) entre colecciones"
echo "deben agregarse manualmente desde el panel de PocketBase:"
echo "  https://pb.iagami.online/_/"
echo ""
echo "Relaciones pendientes de configurar:"
echo "  - estudiantes       → representantes_legales"
echo "  - brigadistas_menores → representantes_legales"
echo "  - consentimientos   → brigadistas_menores, representantes_legales"
echo "  - brigadas          → comunas, consejos_comunales, representantes_brigadas"
echo "  - cursos_aula       → profesores"
echo "  - clases_virtuales  → cursos_aula"
echo "  - inscripciones_curso → cursos_aula, estudiantes"
echo "  - evaluaciones      → cursos_aula, profesores"
echo "  - tareas            → cursos_aula, profesores"
echo "  - entregas_tareas   → tareas, estudiantes"
echo "  - resultados_evaluacion → evaluaciones, estudiantes"
echo "  - asistencia_virtual → clases_virtuales, estudiantes"
echo "  - certificados      → estudiantes"
echo "  - actividades_brigadas → brigadas, representantes_brigadas"
echo "  - asistencia_brigadas → actividades_brigadas, brigadistas, brigadistas_menores"
echo "  - solicitudes_apoyo → brigadas, representantes_brigadas"
echo "  - informes_actividad → actividades_brigadas, brigadas, representantes_brigadas"
echo "  - evidencias_brigadas → actividades_brigadas, brigadas, representantes_brigadas"
