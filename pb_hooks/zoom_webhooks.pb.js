// zoom_webhooks.pb.js — Recepción y verificación de eventos Zoom
// SIGAP/IAGAMI — Fase 7
// Desplegar SOLO en VPS: /opt/pocketbase/pb_hooks/
// Configurar en Zoom Marketplace: Event Subscription → endpoint: https://api.iagami.online/api/zoom/webhook

routerAdd("POST", "/api/zoom/webhook", (c) => {
  const webhookSecret = $os.getenv("ZOOM_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return c.json(500, { error: "ZOOM_WEBHOOK_SECRET no configurado en el servidor" });
  }

  const rawBody = c.request().body;
  const bodyStr = rawBody ? rawBody.toString() : "";

  // Verificar firma HMAC-SHA256
  const zmSignature = c.request().header.get("x-zm-signature") || "";
  const zmTimestamp = c.request().header.get("x-zm-request-timestamp") || "";

  if (zmSignature && zmTimestamp) {
    const message = "v0:" + zmTimestamp + ":" + bodyStr;
    const expectedSig = "v0=" + $security.hs256(message, webhookSecret);
    if (zmSignature !== expectedSig) {
      return c.json(401, { error: "Firma inválida" });
    }
  }

  let event;
  try {
    event = JSON.parse(bodyStr);
  } catch (e) {
    return c.json(400, { error: "Payload inválido" });
  }

  const eventType = event.event || "";

  // Zoom URL validation challenge
  if (eventType === "endpoint.url_validation") {
    const plainToken = event.payload && event.payload.plainToken ? event.payload.plainToken : "";
    const encryptedToken = $security.hs256(plainToken, webhookSecret);
    return c.json(200, { plainToken: plainToken, encryptedToken: encryptedToken });
  }

  const meetingId = event.payload && event.payload.object ? String(event.payload.object.id) : "";

  function updateClaseByMeetingId(meetingId, fields) {
    try {
      const records = $app.dao().findRecordsByFilter("clases_virtuales", "zoom_meeting_id = '" + meetingId + "'", "", 1, 0);
      if (records && records.length > 0) {
        for (const key in fields) {
          records[0].set(key, fields[key]);
        }
        $app.dao().saveRecord(records[0]);
      }
    } catch (e) {
      // colección o campo no existe aún
    }
  }

  function logEvent(accion, detalle) {
    try {
      const col = $app.dao().findCollectionByNameOrId("iagami_sys_logs");
      const record = new Record(col);
      record.set("tipo", "zoom_webhook");
      record.set("descripcion", accion + " | meeting:" + meetingId + " | " + detalle);
      record.set("fecha", new Date().toISOString());
      $app.dao().saveRecord(record);
    } catch (e) {
      // ignorar
    }
  }

  switch (eventType) {
    case "meeting.started":
      updateClaseByMeetingId(meetingId, { estado: "en_curso" });
      logEvent("meeting.started", "ok");
      break;

    case "meeting.ended": {
      const duration = event.payload && event.payload.object ? event.payload.object.duration : 0;
      updateClaseByMeetingId(meetingId, { estado: "finalizada", duracion_real: duration });
      logEvent("meeting.ended", "duracion:" + duration);
      break;
    }

    case "meeting.participant_joined":
    case "meeting.participant_left": {
      const participant = event.payload && event.payload.object && event.payload.object.participant
        ? event.payload.object.participant
        : {};
      const participantName = participant.user_name || "desconocido";
      logEvent(eventType, "participante:" + participantName);
      break;
    }

    case "recording.completed": {
      const recordingFiles = event.payload && event.payload.object && event.payload.object.recording_files
        ? event.payload.object.recording_files
        : [];
      const mp4 = recordingFiles.find((f) => f.file_type === "MP4" && f.status === "completed");
      if (mp4 && mp4.play_url) {
        updateClaseByMeetingId(meetingId, { grabacion_url: mp4.play_url });
      }
      logEvent("recording.completed", mp4 ? "play_url_saved" : "no_mp4");
      break;
    }

    default:
      // Evento no manejado — ignorar silenciosamente
      break;
  }

  return c.json(200, { received: true });
});
