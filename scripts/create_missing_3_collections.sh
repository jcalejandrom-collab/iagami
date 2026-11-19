#!/bin/bash
# IAGAMI — Crea las 3 colecciones faltantes para Aula Ambiental
# Uso: ./create_missing_3_collections.sh <email_admin> <password_admin>
# Ejecutar en el VPS: bash /tmp/create_missing_3_collections.sh jcalejandrom@gmail.com TU_CLAVE

set -euo pipefail
PB_URL="http://127.0.0.1:8090"

if [ $# -lt 2 ]; then
  echo "Uso: $0 <email_admin> <password_admin>"
  exit 1
fi

ADMIN_EMAIL="$1"
ADMIN_PASS="$2"

echo "=== IAGAMI — Creando 3 colecciones faltantes ==="

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

# 1. biblioteca_multimedia — recursos educativos del Aula Ambiental
create_col "biblioteca_multimedia" '{
  "name": "biblioteca_multimedia",
  "type": "base",
  "schema": [
    {"name":"titulo","type":"text","required":true,"options":{"min":3,"max":200}},
    {"name":"tipo","type":"select","required":true,"options":{"maxSelect":1,"values":["video","pdf","guia","infografia","presentacion"]}},
    {"name":"categoria","type":"select","required":false,"options":{"maxSelect":1,"values":["Educación ambiental","Cambio climático","Protección del agua","Reciclaje","Reforestación","Árboles autóctonos de Lara","Biodiversidad","Protección de fauna","Contaminación ambiental","Gestión de residuos","Compostaje","Parques y áreas verdes","Ecosistemas de Iribarren"]}},
    {"name":"nivel","type":"select","required":false,"options":{"maxSelect":1,"values":["inicial","primaria","secundaria","universitario","comunidad","docentes"]}},
    {"name":"descripcion","type":"text","required":false,"options":{"max":500}},
    {"name":"url","type":"url","required":true,"options":{}},
    {"name":"archivo","type":"file","required":false,"options":{"maxSelect":1,"maxSize":10485760,"mimeTypes":["application/pdf","image/jpeg","image/png","image/webp"]}},
    {"name":"imagen_portada","type":"file","required":false,"options":{"maxSelect":1,"maxSize":5242880,"mimeTypes":["image/jpeg","image/png","image/webp"]}},
    {"name":"publicado","type":"bool","required":false},
    {"name":"destacado","type":"bool","required":false},
    {"name":"autor","type":"text","required":false,"options":{"max":150}},
    {"name":"fecha_publicacion","type":"date","required":false,"options":{}}
  ]
}'

# 2. avisos_aula — anuncios del Aula Ambiental
create_col "avisos_aula" '{
  "name": "avisos_aula",
  "type": "base",
  "schema": [
    {"name":"titulo","type":"text","required":true,"options":{"min":3,"max":200}},
    {"name":"mensaje","type":"text","required":true,"options":{"min":5,"max":2000}},
    {"name":"tipo","type":"select","required":false,"options":{"maxSelect":1,"values":["informativo","urgente","convocatoria","resultado","recordatorio"]}},
    {"name":"fecha_inicio","type":"date","required":false,"options":{}},
    {"name":"fecha_fin","type":"date","required":false,"options":{}},
    {"name":"activo","type":"bool","required":false},
    {"name":"destacado","type":"bool","required":false},
    {"name":"dirigido_a","type":"select","required":false,"options":{"maxSelect":3,"values":["estudiantes","profesores","brigadistas","comunidad","todos"]}}
  ]
}'

# 3. solicitudes_visitas — visitas escolares al Aula Ambiental
create_col "solicitudes_visitas" '{
  "name": "solicitudes_visitas",
  "type": "base",
  "schema": [
    {"name":"institucion","type":"text","required":true,"options":{"min":3,"max":200}},
    {"name":"solicitante","type":"text","required":true,"options":{"min":3,"max":150}},
    {"name":"telefono","type":"text","required":false,"options":{"max":20}},
    {"name":"email","type":"email","required":false,"options":{}},
    {"name":"parroquia","type":"select","required":false,"options":{"maxSelect":1,"values":["Catedral","Concepción","El Cuji","Juan de Villegas","Tamaca","Unión","Agua Viva","Buena Vista","Cabudare","Montalbán","Olivos","Santa Rosa","Río Claro","Juárez","Aguedo Felipe Alvarado","Sarare"]}},
    {"name":"nivel","type":"select","required":false,"options":{"maxSelect":1,"values":["inicial","primaria","secundaria","diversificado","universitario"]}},
    {"name":"cantidad","type":"number","required":false,"options":{"min":1,"max":200,"noDecimal":true}},
    {"name":"fecha_visita","type":"date","required":false,"options":{}},
    {"name":"horario","type":"text","required":false,"options":{"max":100}},
    {"name":"tematica","type":"text","required":false,"options":{"max":300}},
    {"name":"observaciones","type":"text","required":false,"options":{"max":1000}},
    {"name":"estado","type":"select","required":false,"options":{"maxSelect":1,"values":["recibida","en_revision","aprobada","rechazada","realizada","cancelada"]}},
    {"name":"notas_internas","type":"text","required":false,"options":{"max":1000}},
    {"name":"fecha_solicitud","type":"date","required":false,"options":{}}
  ]
}'

echo ""
echo "✅ Proceso completado — 3 colecciones procesadas"
echo ""
echo "Verifica en: https://pb.iagami.online/_/#/collections"
