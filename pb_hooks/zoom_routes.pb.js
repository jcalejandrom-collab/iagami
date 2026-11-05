// zoom_routes.pb.js — Rutas API para gestión de Zoom desde los portales
// SIGAP/IAGAMI — Fase 7
// Desplegar SOLO en VPS: /opt/pocketbase/pb_hooks/

function logZoomAction(app, accion, usuario, resultado) {
  try {
    const col = app.dao().findCollectionByNameOrId("iagami_sys_logs");
    const record = new Record(col);
    record.set("tipo", "zoom");
    record.set("descripcion", accion + " | usuario: " + usuario + " | resultado: " + resultado);
    record.set("fecha", new Date().toISOString());
    app.dao().saveRecord(record);
  } catch (e) {
    // iagami_sys_logs puede no tener estos campos exactos; ignorar si falla
  }
}

function isAdminOrProfesor(c) {
  const auth = c.get("authRecord");
  if (!auth) return false;
  const col = auth.collection().name;
  return col === "admins" || col === "profesores";
}

// ── GET /api/zoom/status ──────────────────────────────────────────────────────
routerAdd("GET", "/api/zoom/status", (c) => {
  if (!isAdminOrProfesor(c)) {
    return c.json(403, { error: "No autorizado" });
  }
  try {
    const res = zoomRequest("GET", "/users/me");
    if (res.statusCode === 200) {
      const user = JSON.parse(res.body);
      return c.json(200, { connected: true, account: user.email, display_name: user.display_name });
    }
    return c.json(200, { connected: false, account: null });
  } catch (e) {
    return c.json(200, { connected: false, account: null, error: e.message });
  }
});

// ── POST /api/zoom/meetings ───────────────────────────────────────────────────
routerAdd("POST", "/api/zoom/meetings", (c) => {
  if (!isAdminOrProfesor(c)) {
    return c.json(403, { error: "Solo administradores y profesores pueden crear reuniones" });
  }

  let body;
  try {
    body = JSON.parse(c.request().body);
  } catch (e) {
    return c.json(400, { error: "JSON inválido" });
  }

  const { topic, start_time, duration, agenda, curso_id, profesor_id } = body;
  if (!topic || !start_time || !duration) {
    return c.json(400, { error: "Campos requeridos: topic, start_time, duration" });
  }

  const meetingPayload = {
    topic: topic,
    type: 2, // scheduled
    start_time: start_time,
    duration: duration,
    agenda: agenda || "",
    settings: {
      join_before_host: false,
      waiting_room: true,
      auto_recording: "none",
      mute_upon_entry: true,
      host_video: true,
      participant_video: false,
    },
  };

  try {
    const res = zoomRequest("POST", "/users/me/meetings", meetingPayload);
    if (res.statusCode !== 201) {
      return c.json(502, { error: "Error al crear reunión en Zoom", detail: res.body });
    }
    const meeting = JSON.parse(res.body);

    // Guardar en clases_virtuales si la colección existe
    const auth = c.get("authRecord");
    try {
      const col = $app.dao().findCollectionByNameOrId("clases_virtuales");
      const record = new Record(col);
      record.set("nombre", topic);
      record.set("enlace_zoom", meeting.join_url);
      record.set("zoom_meeting_id", String(meeting.id));
      record.set("fecha", start_time.split("T")[0]);
      record.set("hora", start_time.split("T")[1] ? start_time.split("T")[1].substring(0, 5) : "");
      record.set("duracion", duration);
      record.set("estado", "programada");
      record.set("publicado", false);
      if (curso_id) record.set("curso_id", curso_id);
      if (profesor_id) record.set("profesor_id", profesor_id);
      $app.dao().saveRecord(record);
    } catch (e) {
      // clases_virtuales puede no tener todos los campos aún — continuar
    }

    logZoomAction($app, "crear_meeting:" + meeting.id, auth ? auth.id : "admin", "ok");

    // NUNCA devolver start_url al cliente (URL del host con token incrustado)
    return c.json(201, {
      zoom_meeting_id: meeting.id,
      join_url: meeting.join_url,
      password: meeting.password,
      start_time: meeting.start_time,
      duration: meeting.duration,
      topic: meeting.topic,
    });
  } catch (e) {
    return c.json(500, { error: e.message });
  }
});

// ── GET /api/zoom/meetings ────────────────────────────────────────────────────
routerAdd("GET", "/api/zoom/meetings", (c) => {
  if (!isAdminOrProfesor(c)) {
    return c.json(403, { error: "No autorizado" });
  }
  try {
    const res = zoomRequest("GET", "/users/me/meetings?type=upcoming&page_size=50");
    if (res.statusCode !== 200) {
      return c.json(502, { error: "Error al listar reuniones", detail: res.body });
    }
    const data = JSON.parse(res.body);
    // Nunca devolver start_url
    const meetings = (data.meetings || []).map((m) => ({
      id: m.id,
      topic: m.topic,
      start_time: m.start_time,
      duration: m.duration,
      join_url: m.join_url,
      status: m.status,
    }));
    return c.json(200, { meetings: meetings, total: meetings.length });
  } catch (e) {
    return c.json(500, { error: e.message });
  }
});

// ── GET /api/zoom/meetings/:id ────────────────────────────────────────────────
routerAdd("GET", "/api/zoom/meetings/:id", (c) => {
  if (!isAdminOrProfesor(c)) {
    return c.json(403, { error: "No autorizado" });
  }
  const meetingId = c.pathParam("id");
  try {
    const res = zoomRequest("GET", "/meetings/" + meetingId);
    if (res.statusCode === 404) return c.json(404, { error: "Reunión no encontrada" });
    if (res.statusCode !== 200) return c.json(502, { error: "Error Zoom", detail: res.body });
    const m = JSON.parse(res.body);
    return c.json(200, {
      id: m.id,
      topic: m.topic,
      start_time: m.start_time,
      duration: m.duration,
      join_url: m.join_url,
      agenda: m.agenda,
      status: m.status,
      settings: {
        waiting_room: m.settings && m.settings.waiting_room,
        mute_upon_entry: m.settings && m.settings.mute_upon_entry,
      },
    });
  } catch (e) {
    return c.json(500, { error: e.message });
  }
});

// ── PATCH /api/zoom/meetings/:id ──────────────────────────────────────────────
routerAdd("PATCH", "/api/zoom/meetings/:id", (c) => {
  if (!isAdminOrProfesor(c)) {
    return c.json(403, { error: "No autorizado" });
  }
  const meetingId = c.pathParam("id");
  let body;
  try {
    body = JSON.parse(c.request().body);
  } catch (e) {
    return c.json(400, { error: "JSON inválido" });
  }

  const updatePayload = {};
  if (body.topic) updatePayload.topic = body.topic;
  if (body.start_time) updatePayload.start_time = body.start_time;
  if (body.duration) updatePayload.duration = body.duration;
  if (body.agenda) updatePayload.agenda = body.agenda;

  try {
    const res = zoomRequest("PATCH", "/meetings/" + meetingId, updatePayload);
    if (res.statusCode === 204) {
      const auth = c.get("authRecord");
      logZoomAction($app, "update_meeting:" + meetingId, auth ? auth.id : "admin", "ok");
      return c.json(200, { ok: true });
    }
    return c.json(502, { error: "Error al actualizar reunión", detail: res.body });
  } catch (e) {
    return c.json(500, { error: e.message });
  }
});

// ── DELETE /api/zoom/meetings/:id ─────────────────────────────────────────────
routerAdd("DELETE", "/api/zoom/meetings/:id", (c) => {
  if (!isAdminOrProfesor(c)) {
    return c.json(403, { error: "No autorizado" });
  }
  const meetingId = c.pathParam("id");
  try {
    const res = zoomRequest("DELETE", "/meetings/" + meetingId);
    if (res.statusCode !== 204) {
      return c.json(502, { error: "Error al cancelar reunión", detail: res.body });
    }

    // Actualizar estado en clases_virtuales si existe el registro
    try {
      const records = $app.dao().findRecordsByFilter("clases_virtuales", "zoom_meeting_id = '" + meetingId + "'", "", 1, 0);
      if (records && records.length > 0) {
        records[0].set("estado", "cancelada");
        $app.dao().saveRecord(records[0]);
      }
    } catch (e) {
      // colección puede no tener zoom_meeting_id aún
    }

    const auth = c.get("authRecord");
    logZoomAction($app, "delete_meeting:" + meetingId, auth ? auth.id : "admin", "ok");
    return c.json(200, { ok: true });
  } catch (e) {
    return c.json(500, { error: e.message });
  }
});

// ── GET /api/zoom/meetings/:id/participants ───────────────────────────────────
routerAdd("GET", "/api/zoom/meetings/:id/participants", (c) => {
  if (!isAdminOrProfesor(c)) {
    return c.json(403, { error: "No autorizado" });
  }
  const meetingId = c.pathParam("id");
  try {
    const res = zoomRequest("GET", "/report/meetings/" + meetingId + "/participants?page_size=100");
    if (res.statusCode === 200) {
      const data = JSON.parse(res.body);
      return c.json(200, { participants: data.participants || [], total: data.total_records || 0 });
    }
    if (res.statusCode === 400) {
      return c.json(200, { participants: [], note: "La reunión aún no ha finalizado o no tiene participantes registrados." });
    }
    return c.json(502, { error: "Error al obtener participantes", detail: res.body });
  } catch (e) {
    return c.json(500, { error: e.message });
  }
});

// ── GET /api/zoom/recordings ──────────────────────────────────────────────────
routerAdd("GET", "/api/zoom/recordings", (c) => {
  if (!isAdminOrProfesor(c)) {
    return c.json(403, { error: "No autorizado" });
  }
  const from = c.queryParam("from") || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split("T")[0];
  try {
    const res = zoomRequest("GET", "/users/me/recordings?from=" + from + "&page_size=30");
    if (res.statusCode !== 200) {
      return c.json(502, { error: "Error al obtener grabaciones", detail: res.body });
    }
    const data = JSON.parse(res.body);
    // Solo devolver play_url (no download_url con tokens)
    const meetings = (data.meetings || []).map((m) => ({
      id: m.id,
      topic: m.topic,
      start_time: m.start_time,
      duration: m.duration,
      recording_files: (m.recording_files || [])
        .filter((f) => f.file_type === "MP4" && f.status === "completed")
        .map((f) => ({
          id: f.id,
          play_url: f.play_url,
          file_size: f.file_size,
          recording_start: f.recording_start,
        })),
    }));
    return c.json(200, { recordings: meetings });
  } catch (e) {
    return c.json(500, { error: e.message });
  }
});
