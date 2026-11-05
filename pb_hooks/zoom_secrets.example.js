// zoom_secrets.example.js — TEMPLATE de configuración Zoom para el VPS
// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCCIONES:
//   1. En el VPS, configurar estas variables como variables de entorno del sistema.
//      Ejemplo en /etc/systemd/system/pocketbase.service (sección [Service]):
//
//      Environment="ZOOM_ACCOUNT_ID=tu_account_id"
//      Environment="ZOOM_CLIENT_ID=tu_client_id"
//      Environment="ZOOM_CLIENT_SECRET=tu_client_secret"
//      Environment="ZOOM_WEBHOOK_SECRET=tu_webhook_secret"
//
//   2. Reiniciar PocketBase: systemctl daemon-reload && systemctl restart pocketbase
//
//   3. NUNCA commitear el archivo con valores reales.
//      El archivo zoom_secrets.js está en .gitignore — solo este .example.js va al repo.
//
// CÓMO OBTENER ESTAS CREDENCIALES:
//   1. Ir a https://marketplace.zoom.us/develop/create
//   2. Crear una app de tipo "Server-to-Server OAuth"
//   3. Copiar Account ID, Client ID y Client Secret
//   4. En "Event Subscriptions" → agregar endpoint: https://api.iagami.online/api/zoom/webhook
//   5. Copiar el "Secret Token" del webhook como ZOOM_WEBHOOK_SECRET
//
// VARIABLES REQUERIDAS:
//   ZOOM_ACCOUNT_ID     — Account ID de la app Zoom (ej: "AbCdEfGhIjKlMnOp")
//   ZOOM_CLIENT_ID      — Client ID de la app Zoom (ej: "xxxxxxxxxxxxxxxxxxx")
//   ZOOM_CLIENT_SECRET  — Client Secret de la app Zoom (ej: "yyyyyyyyyyyyyyyyyyyy")
//   ZOOM_WEBHOOK_SECRET — Secret Token del Event Subscription (ej: "zzzzzzzzzzzz")
//
// SCOPES REQUERIDOS en la app Zoom:
//   meeting:read:admin
//   meeting:write:admin
//   recording:read:admin
//   report:read:admin
//   user:read:admin
// ─────────────────────────────────────────────────────────────────────────────
