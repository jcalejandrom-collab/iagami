#!/bin/bash
# IAGAMI — Mejoras Aula Ambiental: cuestionarios, foros y progreso
# Uso: ./create_aula_mejoras.sh <email_admin> <password_admin>

set -euo pipefail
PB_URL="http://127.0.0.1:8090"

if [ $# -lt 2 ]; then
  echo "Uso: $0 <email_admin> <password_admin>"
  exit 1
fi

ADMIN_EMAIL="$1"
ADMIN_PASS="$2"

echo "=== IAGAMI — Creando 6 colecciones: cuestionarios, foros y progreso ==="

AUTH=$(curl -s -X POST "${PB_URL}/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASS}\"}" 2>/dev/null)

TOKEN=$(echo "$AUTH" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null || true)

if [ -z "$TOKEN" ]; then
  echo "ERROR: Autenticación fallida"
  echo "$AUTH"
  exit 1
fi
echo "✅ Autenticado"

create_col() {
  local name="$1"
  local body="$2"
  local result
  result=$(curl -s -X POST "${PB_URL}/api/collections" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$body")
  if echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'id' in d else 1)" 2>/dev/null; then
    echo "  ✅ $name"
  else
    local msg
    msg=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','ERROR'))" 2>/dev/null || echo "ERROR")
    if echo "$msg" | grep -qi "already exists\|ya existe"; then
      echo "  ⏭  $name (ya existe)"
    else
      echo "  ❌ $name: $msg"
    fi
  fi
}

# ------------------------------------------------------------------
# 1. cuestionarios — exámenes y quizzes por curso
# ------------------------------------------------------------------
create_col "cuestionarios" '{
  "name": "cuestionarios",
  "type": "base",
  "schema": [
    {"name":"titulo","type":"text","required":true,"options":{"min":3,"max":200}},
    {"name":"descripcion","type":"text","required":false,"options":{"max":1000}},
    {"name":"instrucciones","type":"text","required":false,"options":{"max":2000}},
    {"name":"tipo","type":"select","required":true,"options":{"maxSelect":1,"values":["diagnostico","parcial","final","practica","repaso"]}},
    {"name":"tiempo_limite_min","type":"number","required":false,"options":{"min":0,"max":300,"noDecimal":true}},
    {"name":"intentos_permitidos","type":"number","required":false,"options":{"min":1,"max":10,"noDecimal":true}},
    {"name":"nota_aprobatoria","type":"number","required":false,"options":{"min":0,"max":100}},
    {"name":"mezclar_preguntas","type":"bool","required":false},
    {"name":"mostrar_respuestas","type":"bool","required":false},
    {"name":"fecha_inicio","type":"date","required":false,"options":{}},
    {"name":"fecha_fin","type":"date","required":false,"options":{}},
    {"name":"publicado","type":"bool","required":false},
    {"name":"estado","type":"select","required":false,"options":{"maxSelect":1,"values":["borrador","activo","cerrado","archivado"]}}
  ]
}'

# ------------------------------------------------------------------
# 2. preguntas_cuestionario — banco de preguntas
# ------------------------------------------------------------------
create_col "preguntas_cuestionario" '{
  "name": "preguntas_cuestionario",
  "type": "base",
  "schema": [
    {"name":"enunciado","type":"text","required":true,"options":{"min":5,"max":2000}},
    {"name":"tipo","type":"select","required":true,"options":{"maxSelect":1,"values":["opcion_multiple","verdadero_falso","respuesta_corta","emparejamiento","multiple_respuesta"]}},
    {"name":"opciones","type":"json","required":false,"options":{}},
    {"name":"respuesta_correcta","type":"json","required":false,"options":{}},
    {"name":"explicacion","type":"text","required":false,"options":{"max":1000}},
    {"name":"puntos","type":"number","required":false,"options":{"min":0,"max":100}},
    {"name":"orden","type":"number","required":false,"options":{"min":0,"noDecimal":true}},
    {"name":"imagen","type":"file","required":false,"options":{"maxSelect":1,"maxSize":5242880,"mimeTypes":["image/jpeg","image/png","image/webp"]}}
  ]
}'

# ------------------------------------------------------------------
# 3. respuestas_cuestionario — intentos y calificaciones de estudiantes
# ------------------------------------------------------------------
create_col "respuestas_cuestionario" '{
  "name": "respuestas_cuestionario",
  "type": "base",
  "schema": [
    {"name":"respuestas","type":"json","required":false,"options":{}},
    {"name":"puntuacion","type":"number","required":false,"options":{"min":0,"max":100}},
    {"name":"puntuacion_maxima","type":"number","required":false,"options":{"min":0,"max":100}},
    {"name":"porcentaje","type":"number","required":false,"options":{"min":0,"max":100}},
    {"name":"aprobado","type":"bool","required":false},
    {"name":"tiempo_empleado_seg","type":"number","required":false,"options":{"min":0,"noDecimal":true}},
    {"name":"intento_numero","type":"number","required":false,"options":{"min":1,"max":10,"noDecimal":true}},
    {"name":"fecha_inicio","type":"date","required":false,"options":{}},
    {"name":"fecha_fin","type":"date","required":false,"options":{}},
    {"name":"estado","type":"select","required":false,"options":{"maxSelect":1,"values":["en_progreso","completado","abandonado","revision_pendiente"]}}
  ]
}'

# ------------------------------------------------------------------
# 4. foros_aula — foros de debate por curso
# ------------------------------------------------------------------
create_col "foros_aula" '{
  "name": "foros_aula",
  "type": "base",
  "schema": [
    {"name":"titulo","type":"text","required":true,"options":{"min":3,"max":200}},
    {"name":"descripcion","type":"text","required":false,"options":{"max":1000}},
    {"name":"tipo","type":"select","required":false,"options":{"maxSelect":1,"values":["debate","consulta","noticias","ideas","general"]}},
    {"name":"activo","type":"bool","required":false},
    {"name":"solo_lectura","type":"bool","required":false},
    {"name":"orden","type":"number","required":false,"options":{"min":0,"noDecimal":true}}
  ]
}'

# ------------------------------------------------------------------
# 5. mensajes_foro — hilos y respuestas en foros
# ------------------------------------------------------------------
create_col "mensajes_foro" '{
  "name": "mensajes_foro",
  "type": "base",
  "schema": [
    {"name":"asunto","type":"text","required":false,"options":{"max":200}},
    {"name":"mensaje","type":"text","required":true,"options":{"min":2,"max":5000}},
    {"name":"tipo_autor","type":"select","required":true,"options":{"maxSelect":1,"values":["estudiante","profesor","admin"]}},
    {"name":"nombre_autor","type":"text","required":false,"options":{"max":150}},
    {"name":"adjunto","type":"file","required":false,"options":{"maxSelect":1,"maxSize":10485760,"mimeTypes":["application/pdf","image/jpeg","image/png","image/webp"]}},
    {"name":"editado","type":"bool","required":false},
    {"name":"fecha_edicion","type":"date","required":false,"options":{}},
    {"name":"activo","type":"bool","required":false},
    {"name":"nivel","type":"number","required":false,"options":{"min":0,"max":5,"noDecimal":true}}
  ]
}'

# ------------------------------------------------------------------
# 6. progreso_estudiante — avance por curso (calculado)
# ------------------------------------------------------------------
create_col "progreso_estudiante" '{
  "name": "progreso_estudiante",
  "type": "base",
  "schema": [
    {"name":"porcentaje_avance","type":"number","required":false,"options":{"min":0,"max":100}},
    {"name":"clases_vistas","type":"number","required":false,"options":{"min":0,"noDecimal":true}},
    {"name":"clases_total","type":"number","required":false,"options":{"min":0,"noDecimal":true}},
    {"name":"tareas_entregadas","type":"number","required":false,"options":{"min":0,"noDecimal":true}},
    {"name":"tareas_total","type":"number","required":false,"options":{"min":0,"noDecimal":true}},
    {"name":"cuestionarios_completados","type":"number","required":false,"options":{"min":0,"noDecimal":true}},
    {"name":"nota_promedio","type":"number","required":false,"options":{"min":0,"max":100}},
    {"name":"ultima_actividad","type":"date","required":false,"options":{}},
    {"name":"completado","type":"bool","required":false},
    {"name":"fecha_completado","type":"date","required":false,"options":{}},
    {"name":"certificado_emitido","type":"bool","required":false}
  ]
}'

echo ""
echo "=== Agregando relaciones ==="

# Obtener IDs de colecciones necesarias
COLS_JSON=$(curl -s "${PB_URL}/api/collections?page=1&perPage=200" \
  -H "Authorization: Bearer ${TOKEN}")

get_id() {
  echo "$COLS_JSON" | python3 -c "
import sys, json
cols = json.load(sys.stdin).get('items', [])
m = {c['name']: c['id'] for c in cols}
print(m.get('$1', ''))
"
}

ID_CURSOS=$(get_id "cursos_aula")
ID_CUEST=$(get_id "cuestionarios")
ID_FOROS=$(get_id "foros_aula")
ID_MENSAJES=$(get_id "mensajes_foro")
ID_EST=$(get_id "estudiantes")

add_relations() {
  local col_name="$1"
  local fields_json="$2"

  local col_data
  col_data=$(curl -s "${PB_URL}/api/collections/${col_name}" \
    -H "Authorization: Bearer ${TOKEN}")
  local col_id
  col_id=$(echo "$col_data" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  if [ -z "$col_id" ]; then
    echo "  ⚠️  $col_name: no encontrada"
    return
  fi

  local existing
  existing=$(echo "$col_data" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('schema',[])))" 2>/dev/null)
  local merged
  merged=$(python3 -c "
import json, sys
existing = json.loads('''${existing}''')
new_fields = json.loads(sys.stdin.read())
existing_names = {f['name'] for f in existing}
added = [f for f in new_fields if f['name'] not in existing_names]
print(json.dumps(existing + added))
" <<< "$fields_json")

  local result
  result=$(curl -s -X PATCH "${PB_URL}/api/collections/${col_id}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"schema\": ${merged}}")

  if echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'id' in d else 1)" 2>/dev/null; then
    echo "  ✅ $col_name: relaciones agregadas"
  else
    local msg
    msg=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null)
    echo "  ❌ $col_name: $msg"
  fi
}

# cuestionarios → cursos_aula
add_relations "cuestionarios" "[
  {\"name\":\"curso_id\",\"type\":\"relation\",\"required\":true,\"options\":{\"collectionId\":\"${ID_CURSOS}\",\"maxSelect\":1,\"minSelect\":0,\"cascadeDelete\":false,\"displayFields\":null}}
]"

# preguntas_cuestionario → cuestionarios
add_relations "preguntas_cuestionario" "[
  {\"name\":\"cuestionario_id\",\"type\":\"relation\",\"required\":true,\"options\":{\"collectionId\":\"${ID_CUEST}\",\"maxSelect\":1,\"minSelect\":0,\"cascadeDelete\":false,\"displayFields\":null}}
]"

# respuestas_cuestionario → cuestionarios + estudiantes
add_relations "respuestas_cuestionario" "[
  {\"name\":\"cuestionario_id\",\"type\":\"relation\",\"required\":true,\"options\":{\"collectionId\":\"${ID_CUEST}\",\"maxSelect\":1,\"minSelect\":0,\"cascadeDelete\":false,\"displayFields\":null}},
  {\"name\":\"estudiante_id\",\"type\":\"relation\",\"required\":true,\"options\":{\"collectionId\":\"${ID_EST}\",\"maxSelect\":1,\"minSelect\":0,\"cascadeDelete\":false,\"displayFields\":null}}
]"

# foros_aula → cursos_aula
add_relations "foros_aula" "[
  {\"name\":\"curso_id\",\"type\":\"relation\",\"required\":true,\"options\":{\"collectionId\":\"${ID_CURSOS}\",\"maxSelect\":1,\"minSelect\":0,\"cascadeDelete\":false,\"displayFields\":null}}
]"

# mensajes_foro → foros_aula + mensajes_foro (respuesta padre)
add_relations "mensajes_foro" "[
  {\"name\":\"foro_id\",\"type\":\"relation\",\"required\":true,\"options\":{\"collectionId\":\"${ID_FOROS}\",\"maxSelect\":1,\"minSelect\":0,\"cascadeDelete\":false,\"displayFields\":null}},
  {\"name\":\"padre_id\",\"type\":\"relation\",\"required\":false,\"options\":{\"collectionId\":\"${ID_MENSAJES}\",\"maxSelect\":1,\"minSelect\":0,\"cascadeDelete\":false,\"displayFields\":null}},
  {\"name\":\"autor_estudiante_id\",\"type\":\"relation\",\"required\":false,\"options\":{\"collectionId\":\"${ID_EST}\",\"maxSelect\":1,\"minSelect\":0,\"cascadeDelete\":false,\"displayFields\":null}}
]"

# progreso_estudiante → cursos_aula + estudiantes
add_relations "progreso_estudiante" "[
  {\"name\":\"curso_id\",\"type\":\"relation\",\"required\":true,\"options\":{\"collectionId\":\"${ID_CURSOS}\",\"maxSelect\":1,\"minSelect\":0,\"cascadeDelete\":false,\"displayFields\":null}},
  {\"name\":\"estudiante_id\",\"type\":\"relation\",\"required\":true,\"options\":{\"collectionId\":\"${ID_EST}\",\"maxSelect\":1,\"minSelect\":0,\"cascadeDelete\":false,\"displayFields\":null}}
]"

echo ""
echo "✅ COMPLETADO — 6 colecciones + relaciones"
echo ""
echo "Colecciones creadas:"
echo "  cuestionarios          → banco de exámenes"
echo "  preguntas_cuestionario → preguntas por examen"
echo "  respuestas_cuestionario→ intentos y notas de estudiantes"
echo "  foros_aula             → foros de debate por curso"
echo "  mensajes_foro          → hilos y respuestas"
echo "  progreso_estudiante    → avance por curso"
echo ""
echo "Verifica en: https://pb.iagami.online/_/#/collections"
