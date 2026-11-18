#!/usr/bin/env python3
# IAGAMI — Agrega campos de relación a las 25 colecciones nuevas
# Uso: python3 add_relation_fields.py <email_admin> <password_admin>
# NUNCA hardcodear credenciales en este archivo

import json, urllib.request, sys

PB_URL = "http://127.0.0.1:8090"

if len(sys.argv) < 3:
    print("Uso: python3 add_relation_fields.py <email> <password>")
    sys.exit(1)

EMAIL = sys.argv[1]
PASS  = sys.argv[2]

def pb(method, path, data=None, token=None):
    url = PB_URL + path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

# --- Autenticar ---
auth = pb("POST", "/api/collections/_superusers/auth-with-password",
          {"identity": EMAIL, "password": PASS})
token = auth.get("token")
if not token:
    print(f"ERROR: Autenticación fallida — {auth.get('message','')}")
    sys.exit(1)
print("✅ Autenticado")

# --- Obtener IDs de todas las colecciones ---
resp = pb("GET", "/api/collections?page=1&perPage=200", token=token)
COLS = {c["name"]: c["id"] for c in resp.get("items", [])}
print(f"📋 {len(COLS)} colecciones encontradas\n")

# --- Función para agregar relaciones a una colección ---
def add_relations(col_name, relations):
    col = pb("GET", f"/api/collections/{col_name}", token=token)
    if "id" not in col:
        print(f"  ⚠️  {col_name}: no encontrada")
        return

    existing = col.get("schema", [])
    existing_names = {f["name"] for f in existing}
    new_fields = []

    for field_name, target_col, max_select, required in relations:
        if field_name in existing_names:
            print(f"  ⏭  {col_name}.{field_name} ya existe")
            continue
        target_id = COLS.get(target_col, "")
        if not target_id:
            print(f"  ⚠️  {col_name}.{field_name}: colección '{target_col}' no encontrada")
            continue
        new_fields.append({
            "name": field_name,
            "type": "relation",
            "required": required,
            "options": {
                "collectionId": target_id,
                "maxSelect": max_select,
                "minSelect": 0,
                "cascadeDelete": False,
                "displayFields": None
            }
        })

    if not new_fields:
        return

    result = pb("PATCH", f"/api/collections/{col['id']}",
                {"schema": existing + new_fields}, token=token)
    if "id" in result:
        print(f"  ✅ {col_name}: +{len(new_fields)} relación(es)")
    else:
        print(f"  ❌ {col_name}: {result.get('message','ERROR')}")

# --- Definición de relaciones ---
# (coleccion, [(campo, coleccion_destino, max_select, requerido)])
RELATIONS = [
    ("estudiantes", [
        ("representante_id", "representantes_legales", 1, False),
    ]),
    ("brigadistas_menores", [
        ("representante", "representantes_legales", 1, True),
    ]),
    ("consentimientos", [
        ("brigadista_menor_id", "brigadistas_menores", 1, True),
        ("representante_id",    "representantes_legales", 1, True),
    ]),
    ("brigadas", [
        ("comuna_id",          "comunas",                  1, False),
        ("consejo_comunal_id", "consejos_comunales",        1, False),
        ("representante_id",   "representantes_brigadas",   1, False),
    ]),
    ("representantes_brigadas", [
        ("comuna_id",          "comunas",             1, False),
        ("consejo_comunal_id", "consejos_comunales",   1, False),
    ]),
    ("cursos_aula", [
        ("profesor_id", "profesores", 1, False),
    ]),
    ("clases_virtuales", [
        ("curso_id", "cursos_aula", 1, True),
    ]),
    ("solicitudes_inscripcion", [
        ("curso_id", "cursos_aula", 1, False),
    ]),
    ("inscripciones_curso", [
        ("curso_id",      "cursos_aula", 1, True),
        ("estudiante_id", "estudiantes", 1, True),
    ]),
    ("evaluaciones", [
        ("curso_id",    "cursos_aula", 1, True),
        ("profesor_id", "profesores",  1, False),
    ]),
    ("tareas", [
        ("curso_id",    "cursos_aula", 1, True),
        ("profesor_id", "profesores",  1, False),
    ]),
    ("entregas_tareas", [
        ("tarea_id",      "tareas",      1, True),
        ("estudiante_id", "estudiantes", 1, True),
    ]),
    ("resultados_evaluacion", [
        ("evaluacion_id", "evaluaciones", 1, True),
        ("estudiante_id", "estudiantes",  1, True),
    ]),
    ("asistencia_virtual", [
        ("clase_id",      "clases_virtuales", 1, True),
        ("estudiante_id", "estudiantes",      1, True),
    ]),
    ("certificados", [
        ("estudiante_id", "estudiantes", 1, False),
    ]),
    ("actividades_brigadas", [
        ("brigada_id",     "brigadas",               1, True),
        ("representante_id","representantes_brigadas",1, False),
    ]),
    ("asistencia_brigadas", [
        ("actividad_id",        "actividades_brigadas", 1, True),
        ("brigadista_id",       "brigadistas",          1, False),
        ("brigadista_menor_id", "brigadistas_menores",  1, False),
    ]),
    ("comunicados_brigadas", [
        ("brigada_id", "brigadas", 1, False),
    ]),
    ("solicitudes_apoyo", [
        ("brigada_id",      "brigadas",               1, False),
        ("representante_id","representantes_brigadas", 1, False),
    ]),
    ("informes_actividad", [
        ("actividad_id",    "actividades_brigadas",   1, False),
        ("brigada_id",      "brigadas",               1, False),
        ("representante_id","representantes_brigadas", 1, False),
    ]),
    ("evidencias_brigadas", [
        ("actividad_id",    "actividades_brigadas",   1, False),
        ("brigada_id",      "brigadas",               1, False),
        ("representante_id","representantes_brigadas", 1, False),
    ]),
]

print("=== Agregando campos de relación ===")
for col_name, rels in RELATIONS:
    add_relations(col_name, rels)

print("\n✅ Proceso completado")
