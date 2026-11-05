// gemini_education.pb.js — IA educativa para el Aula Ambiental IAGAMI
// SIGAP/IAGAMI — Fase 12
// Desplegar SOLO en VPS: /opt/pocketbase/pb_hooks/
// La API key de Gemini se lee de la variable de entorno GEMINI_API_KEY
// configurada en el VPS. NUNCA incluir la clave en este archivo.

function geminiGenerate(prompt, systemInstruction) {
  const apiKey = $os.getenv("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada en el servidor");
  }

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };

  if (systemInstruction) {
    payload.system_instruction = { parts: [{ text: systemInstruction }] };
  }

  const res = $http.send({
    method: "POST",
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.statusCode !== 200) {
    throw new Error("Gemini API error: " + res.statusCode + " " + res.body);
  }

  const data = JSON.parse(res.body);
  const text = data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0]
    ? data.candidates[0].content.parts[0].text
    : "{}";

  // Limpiar posibles bloques de código markdown
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function logGeminiAction(accion, usuario) {
  try {
    const col = $app.dao().findCollectionByNameOrId("iagami_sys_logs");
    const record = new Record(col);
    record.set("tipo", "gemini_ia");
    record.set("descripcion", accion + " | usuario: " + usuario);
    record.set("fecha", new Date().toISOString());
    $app.dao().saveRecord(record);
  } catch (e) {
    // ignorar
  }
}

function requireAuth(c) {
  const auth = c.get("authRecord");
  if (!auth) return null;
  return { id: auth.id, role: auth.collection().name };
}

// ── POST /api/gemini/quiz-generate ────────────────────────────────────────────
// Genera una evaluación completa con preguntas listas para insertar en PocketBase
routerAdd("POST", "/api/gemini/quiz-generate", (c) => {
  const user = requireAuth(c);
  if (!user) return c.json(401, { error: "Autenticación requerida" });
  if (user.role === "estudiantes") return c.json(403, { error: "Solo profesores y administradores" });

  let body;
  try { body = JSON.parse(c.request().body); } catch (e) { return c.json(400, { error: "JSON inválido" }); }

  const { tema, nivel = "intermedio", num_preguntas = 5, tipos = ["multiple", "verdadero_falso"] } = body;
  if (!tema) return c.json(400, { error: "El campo 'tema' es requerido" });

  const tiposStr = tipos.join(", ");
  const prompt = `Genera exactamente ${num_preguntas} preguntas de evaluación sobre el tema: "${tema}".
Nivel: ${nivel}. Contexto: educación ambiental para el municipio Iribarren, Barquisimeto, Venezuela.
Tipos de preguntas disponibles: ${tiposStr}.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "preguntas": [
    {
      "enunciado": "texto de la pregunta",
      "tipo": "multiple" | "verdadero_falso" | "abierta",
      "opciones": ["opción A", "opción B", "opción C", "opción D"],
      "respuesta_correcta": "opción A",
      "puntaje": 20,
      "orden": 1
    }
  ]
}

Reglas:
- Para tipo "multiple": incluir 4 opciones, respuesta_correcta debe ser el texto exacto de una opción.
- Para tipo "verdadero_falso": opciones = ["Verdadero", "Falso"], respuesta_correcta = "Verdadero" o "Falso".
- Para tipo "abierta": opciones = [], respuesta_correcta = "" (el profesor califica manualmente).
- Los puntajes deben sumar 100 en total.
- El campo "orden" va de 1 a ${num_preguntas}.`;

  try {
    const raw = geminiGenerate(prompt, "Eres un experto en pedagogía ambiental y evaluación educativa.");
    let result;
    try { result = JSON.parse(raw); } catch (e) { return c.json(502, { error: "Respuesta de IA inválida", raw: raw }); }

    if (!result.preguntas || !Array.isArray(result.preguntas)) {
      return c.json(502, { error: "Estructura de respuesta IA incorrecta", raw: raw });
    }

    logGeminiAction("quiz_generate:tema=" + tema, user.id);
    return c.json(200, { preguntas: result.preguntas, meta: { tema, nivel, num_preguntas, generado_en: new Date().toISOString() } });
  } catch (e) {
    return c.json(500, { error: e.message });
  }
});

// ── POST /api/gemini/question-bank ────────────────────────────────────────────
// Genera un banco de preguntas amplio por tema y dificultad
routerAdd("POST", "/api/gemini/question-bank", (c) => {
  const user = requireAuth(c);
  if (!user) return c.json(401, { error: "Autenticación requerida" });
  if (user.role === "estudiantes") return c.json(403, { error: "Solo profesores y administradores" });

  let body;
  try { body = JSON.parse(c.request().body); } catch (e) { return c.json(400, { error: "JSON inválido" }); }

  const { tema, dificultad = "mixta", cantidad = 20 } = body;
  if (!tema) return c.json(400, { error: "El campo 'tema' es requerido" });

  const prompt = `Genera un banco de ${cantidad} preguntas variadas sobre: "${tema}".
Dificultad: ${dificultad}. Contexto: educación ambiental, municipio Iribarren, Venezuela.
Incluye una mezcla de tipos: opción múltiple, verdadero/falso y preguntas abiertas.

Responde ÚNICAMENTE con JSON válido:
{
  "banco": [
    {
      "enunciado": "...",
      "tipo": "multiple" | "verdadero_falso" | "abierta",
      "opciones": [],
      "respuesta_correcta": "...",
      "puntaje": 5,
      "dificultad": "basica" | "intermedia" | "avanzada",
      "orden": 1
    }
  ]
}`;

  try {
    const raw = geminiGenerate(prompt, "Eres un experto en pedagogía ambiental.");
    let result;
    try { result = JSON.parse(raw); } catch (e) { return c.json(502, { error: "Respuesta IA inválida", raw: raw }); }

    logGeminiAction("question_bank:tema=" + tema, user.id);
    return c.json(200, { banco: result.banco || [], meta: { tema, dificultad, cantidad, generado_en: new Date().toISOString() } });
  } catch (e) {
    return c.json(500, { error: e.message });
  }
});

// ── POST /api/gemini/lesson-plan ──────────────────────────────────────────────
// Asistente de planificación de clases para profesores
routerAdd("POST", "/api/gemini/lesson-plan", (c) => {
  const user = requireAuth(c);
  if (!user) return c.json(401, { error: "Autenticación requerida" });
  if (user.role === "estudiantes") return c.json(403, { error: "Solo profesores y administradores" });

  let body;
  try { body = JSON.parse(c.request().body); } catch (e) { return c.json(400, { error: "JSON inválido" }); }

  const { tema, duracion_minutos = 60, nivel = "intermedio", objetivos = "" } = body;
  if (!tema) return c.json(400, { error: "El campo 'tema' es requerido" });

  const prompt = `Crea un plan de clase detallado sobre: "${tema}".
Duración: ${duracion_minutos} minutos. Nivel: ${nivel}.
Objetivos adicionales del profesor: ${objetivos || "ninguno especificado"}.
Contexto: Aula Ambiental del IAGAMI, Barquisimeto, Venezuela. Enfoque en conciencia ambiental.

Responde ÚNICAMENTE con JSON:
{
  "plan": {
    "titulo": "...",
    "objetivo_general": "...",
    "introduccion": {"duracion_min": 10, "actividad": "...", "recursos": ["..."]},
    "desarrollo": {"duracion_min": 30, "actividad": "...", "puntos_clave": ["..."], "recursos": ["..."]},
    "actividades": [{"nombre": "...", "duracion_min": 10, "descripcion": "..."}],
    "evaluacion": {"duracion_min": 10, "tipo": "...", "descripcion": "..."},
    "cierre": {"duracion_min": 5, "actividad": "...", "tarea_sugerida": "..."},
    "materiales": ["..."],
    "competencias": ["..."]
  }
}`;

  try {
    const raw = geminiGenerate(prompt, "Eres un pedagogo especialista en educación ambiental.");
    let result;
    try { result = JSON.parse(raw); } catch (e) { return c.json(502, { error: "Respuesta IA inválida", raw: raw }); }

    logGeminiAction("lesson_plan:tema=" + tema, user.id);
    return c.json(200, { plan: result.plan || result, meta: { tema, duracion_minutos, nivel, generado_en: new Date().toISOString() } });
  } catch (e) {
    return c.json(500, { error: e.message });
  }
});

// ── POST /api/gemini/course-recommend ─────────────────────────────────────────
// Recomendación de cursos según progreso del estudiante
routerAdd("POST", "/api/gemini/course-recommend", (c) => {
  const user = requireAuth(c);
  if (!user) return c.json(401, { error: "Autenticación requerida" });

  let body;
  try { body = JSON.parse(c.request().body); } catch (e) { return c.json(400, { error: "JSON inválido" }); }

  const { cursos_completados = [], calificaciones_promedio = {}, cursos_disponibles = [] } = body;

  const completadosStr = cursos_completados.length > 0 ? cursos_completados.join(", ") : "ninguno";
  const calificacionesStr = Object.keys(calificaciones_promedio).length > 0
    ? JSON.stringify(calificaciones_promedio)
    : "sin calificaciones aún";
  const disponiblesStr = cursos_disponibles.length > 0 ? cursos_disponibles.join(", ") : "variados cursos ambientales";

  const prompt = `Un estudiante del Aula Ambiental del IAGAMI (Barquisimeto, Venezuela) tiene este historial:
- Cursos completados: ${completadosStr}
- Calificaciones promedio por curso: ${calificacionesStr}
- Cursos disponibles actualmente: ${disponiblesStr}

Recomienda 3 cursos y da una razón pedagógica para cada uno.

Responde ÚNICAMENTE con JSON:
{
  "recomendaciones": [
    {
      "curso": "nombre del curso",
      "razon": "por qué es adecuado para este estudiante",
      "nivel_match": "basico" | "intermedio" | "avanzado",
      "prioridad": 1
    }
  ]
}`;

  try {
    const raw = geminiGenerate(prompt, "Eres un consejero educativo especialista en medio ambiente.");
    let result;
    try { result = JSON.parse(raw); } catch (e) { return c.json(502, { error: "Respuesta IA inválida", raw: raw }); }

    logGeminiAction("course_recommend", user.id);
    return c.json(200, { recomendaciones: result.recomendaciones || [], meta: { generado_en: new Date().toISOString() } });
  } catch (e) {
    return c.json(500, { error: e.message });
  }
});

// ── POST /api/gemini/academic-report ──────────────────────────────────────────
// Genera informe académico narrativo de un estudiante
routerAdd("POST", "/api/gemini/academic-report", (c) => {
  const user = requireAuth(c);
  if (!user) return c.json(401, { error: "Autenticación requerida" });
  if (user.role === "estudiantes") return c.json(403, { error: "Solo profesores y administradores" });

  let body;
  try { body = JSON.parse(c.request().body); } catch (e) { return c.json(400, { error: "JSON inválido" }); }

  const {
    nombre_estudiante, cursos = [], calificaciones = [], asistencia_porcentaje = 0,
    tareas_entregadas = 0, tareas_totales = 0, periodo = "2024"
  } = body;

  if (!nombre_estudiante) return c.json(400, { error: "El campo 'nombre_estudiante' es requerido" });

  const cursosStr = cursos.length > 0 ? cursos.join(", ") : "sin cursos registrados";
  const calificacionesStr = calificaciones.length > 0 ? calificaciones.map((c) => c.curso + ": " + c.promedio).join(", ") : "sin calificaciones";

  const prompt = `Redacta un informe académico formal e institucional para el estudiante "${nombre_estudiante}"
del Aula Ambiental del IAGAMI (Instituto Autónomo de Gestión Ambiental del Municipio Iribarren).
Periodo: ${periodo}.
Cursos: ${cursosStr}.
Calificaciones: ${calificacionesStr}.
Asistencia: ${asistencia_porcentaje}%.
Tareas entregadas: ${tareas_entregadas} de ${tareas_totales}.

Responde ÚNICAMENTE con JSON:
{
  "informe": {
    "encabezado": "...",
    "resumen_ejecutivo": "...",
    "desempeño_academico": "...",
    "asistencia_y_puntualidad": "...",
    "fortalezas": ["..."],
    "areas_de_mejora": ["..."],
    "recomendaciones": "...",
    "conclusion": "...",
    "calificacion_final": "Excelente" | "Bueno" | "Regular" | "Necesita Mejorar"
  }
}`;

  try {
    const raw = geminiGenerate(prompt, "Eres un secretario académico formal de una institución pública venezolana.");
    let result;
    try { result = JSON.parse(raw); } catch (e) { return c.json(502, { error: "Respuesta IA inválida", raw: raw }); }

    logGeminiAction("academic_report:estudiante=" + nombre_estudiante, user.id);
    return c.json(200, { informe: result.informe || result, meta: { nombre_estudiante, periodo, generado_en: new Date().toISOString() } });
  } catch (e) {
    return c.json(500, { error: e.message });
  }
});

// ── POST /api/gemini/content-generate ─────────────────────────────────────────
// Genera contenido educativo ambiental (artículos, resúmenes, actividades)
routerAdd("POST", "/api/gemini/content-generate", (c) => {
  const user = requireAuth(c);
  if (!user) return c.json(401, { error: "Autenticación requerida" });
  if (user.role === "estudiantes") return c.json(403, { error: "Solo profesores y administradores" });

  let body;
  try { body = JSON.parse(c.request().body); } catch (e) { return c.json(400, { error: "JSON inválido" }); }

  const { tema, tipo_contenido = "articulo", nivel = "general", longitud = "media" } = body;
  if (!tema) return c.json(400, { error: "El campo 'tema' es requerido" });

  const longitudes = { corta: "200 palabras", media: "400 palabras", larga: "700 palabras" };
  const palabras = longitudes[longitud] || "400 palabras";

  const prompt = `Genera contenido educativo ambiental sobre: "${tema}".
Tipo: ${tipo_contenido} (opciones: articulo, resumen, actividad, ficha_informativa).
Nivel: ${nivel}. Longitud aproximada: ${palabras}.
Contexto: Aula Ambiental del IAGAMI, Barquisimeto, Municipio Iribarren, Venezuela.
Enfoque en la realidad ambiental local: Río Turbio, Parque Ayacucho, cuencas hidrográficas del estado Lara.

Responde ÚNICAMENTE con JSON:
{
  "contenido": {
    "titulo": "...",
    "subtitulo": "...",
    "introduccion": "...",
    "cuerpo": "...",
    "conclusion": "...",
    "palabras_clave": ["..."],
    "actividad_sugerida": "..."
  }
}`;

  try {
    const raw = geminiGenerate(prompt, "Eres un especialista en comunicación ambiental educativa.");
    let result;
    try { result = JSON.parse(raw); } catch (e) { return c.json(502, { error: "Respuesta IA inválida", raw: raw }); }

    logGeminiAction("content_generate:tema=" + tema, user.id);
    return c.json(200, { contenido: result.contenido || result, meta: { tema, tipo_contenido, nivel, generado_en: new Date().toISOString() } });
  } catch (e) {
    return c.json(500, { error: e.message });
  }
});
