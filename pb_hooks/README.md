# pb_hooks — Hooks del servidor SIGAP/IAGAMI

Estos archivos se ejecutan en PocketBase 0.39.1 en el VPS.
**NUNCA** se ejecutan en el navegador. Las credenciales viven solo aquí.

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `zoom_config.pb.js` | OAuth Account Credentials, refresh de tokens, wrapper `zoomRequest()` |
| `zoom_routes.pb.js` | Rutas CRUD de reuniones, participantes, grabaciones |
| `zoom_webhooks.pb.js` | Recepción y verificación HMAC de eventos Zoom |
| `zoom_secrets.example.js` | Template de variables de entorno (sin valores reales) |
| `gemini_education.pb.js` | 6 endpoints de IA educativa con Gemini API |
| `gemini_chat.pb.js` | *(ya existe en VPS)* Chatbot FAQ público |

## Despliegue en el VPS

```bash
# 1. Copiar todos los hooks al VPS
scp -i ~/.ssh/id_rsa pb_hooks/*.pb.js root@166.1.88.129:/opt/pocketbase/pb_hooks/

# 2. Verificar que el directorio existe
ssh -i ~/.ssh/id_rsa root@166.1.88.129 "ls /opt/pocketbase/pb_hooks/"

# 3. Reiniciar PocketBase para cargar los nuevos hooks
ssh -i ~/.ssh/id_rsa root@166.1.88.129 "systemctl restart pocketbase"

# 4. Verificar que los hooks se cargaron sin errores
ssh -i ~/.ssh/id_rsa root@166.1.88.129 "journalctl -u pocketbase -n 50 --no-pager"
```

## Variables de entorno requeridas

Configurar en `/etc/systemd/system/pocketbase.service` bajo `[Service]`:

```ini
# Zoom API (Server-to-Server OAuth)
Environment="ZOOM_ACCOUNT_ID=..."
Environment="ZOOM_CLIENT_ID=..."
Environment="ZOOM_CLIENT_SECRET=..."
Environment="ZOOM_WEBHOOK_SECRET=..."

# Gemini AI (ya configurado — no duplicar)
Environment="GEMINI_API_KEY=..."
```

Después de modificar el service file:
```bash
systemctl daemon-reload
systemctl restart pocketbase
```

## Creación de la app Zoom

1. Ir a https://marketplace.zoom.us/develop/create
2. Seleccionar **Server-to-Server OAuth**
3. Completar nombre y organización (IAGAMI)
4. Copiar: **Account ID**, **Client ID**, **Client Secret**
5. En **Scopes**, agregar:
   - `meeting:read:admin`
   - `meeting:write:admin`
   - `recording:read:admin`
   - `report:read:admin`
   - `user:read:admin`
6. En **Event Subscriptions** → Add new event subscription:
   - Notification endpoint URL: `https://api.iagami.online/api/zoom/webhook`
   - Events: `meeting.started`, `meeting.ended`, `meeting.participant_joined`, `meeting.participant_left`, `recording.completed`
   - Copiar el **Secret Token** → `ZOOM_WEBHOOK_SECRET`
7. Activar la app

## Verificar que el webhook de Zoom funciona

```bash
# Desde el VPS, hacer un curl al endpoint de verificación:
curl -X POST https://api.iagami.online/api/zoom/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"endpoint.url_validation","payload":{"plainToken":"testtoken123"}}'
# Debe responder con encryptedToken
```

También desde el Zoom Marketplace → tu app → Event Subscriptions → "Validate" button.

## Endpoints disponibles tras el despliegue

### Zoom
| Método | Ruta | Requiere |
|--------|------|---------|
| GET | `/api/zoom/status` | admin o profesor |
| POST | `/api/zoom/meetings` | admin o profesor |
| GET | `/api/zoom/meetings` | admin o profesor |
| GET | `/api/zoom/meetings/:id` | admin o profesor |
| PATCH | `/api/zoom/meetings/:id` | admin o profesor |
| DELETE | `/api/zoom/meetings/:id` | admin o profesor |
| GET | `/api/zoom/meetings/:id/participants` | admin o profesor |
| GET | `/api/zoom/recordings` | admin o profesor |
| POST | `/api/zoom/webhook` | público (verificado por HMAC) |

### Gemini IA
| Método | Ruta | Requiere |
|--------|------|---------|
| POST | `/api/gemini/quiz-generate` | admin o profesor |
| POST | `/api/gemini/question-bank` | admin o profesor |
| POST | `/api/gemini/lesson-plan` | admin o profesor |
| POST | `/api/gemini/course-recommend` | cualquier auth |
| POST | `/api/gemini/academic-report` | admin o profesor |
| POST | `/api/gemini/content-generate` | admin o profesor |

## Dependencias de PocketBase pendientes

Los hooks funcionan ahora, pero estas colecciones deben existir para aprovechar todo:
- `clases_virtuales` — necesita campo `zoom_meeting_id` (text) y `grabacion_url` (text)
- `iagami_sys_logs` — necesita campos `tipo` (text) y `fecha` (text) — puede ya existir
- Colecciones Fase 3: `evaluaciones`, `preguntas_evaluacion`, etc. — ver `pb_schema/`
