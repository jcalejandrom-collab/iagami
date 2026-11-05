// zoom_config.pb.js — Zoom OAuth Account Credentials + token management
// SIGAP/IAGAMI — Fase 7
// Desplegar SOLO en VPS: /opt/pocketbase/pb_hooks/
// Las credenciales se leen de variables de entorno del servidor.

function getZoomCredentials() {
  const accountId = $os.getenv("ZOOM_ACCOUNT_ID");
  const clientId = $os.getenv("ZOOM_CLIENT_ID");
  const clientSecret = $os.getenv("ZOOM_CLIENT_SECRET");
  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Zoom credentials not configured. Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET on the VPS.");
  }
  return { accountId, clientId, clientSecret };
}

function refreshZoomToken() {
  const { accountId, clientId, clientSecret } = getZoomCredentials();
  const basicAuth = $security.base64Encode(clientId + ":" + clientSecret);

  const res = $http.send({
    method: "POST",
    url: "https://zoom.us/oauth/token?grant_type=account_credentials&account_id=" + accountId,
    headers: {
      "Authorization": "Basic " + basicAuth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (res.statusCode !== 200) {
    throw new Error("Zoom token refresh failed: " + res.statusCode + " " + res.body);
  }

  const data = JSON.parse(res.body);
  const tokenData = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in * 1000) - 60000, // 1min buffer
  };

  try {
    $os.writeFile("pb_data/zoom_token.json", JSON.stringify(tokenData));
  } catch (e) {
    // Si no puede escribir al disco, continúa con el token en memoria
  }

  return tokenData.access_token;
}

function getZoomToken() {
  try {
    const raw = $os.readFile("pb_data/zoom_token.json");
    const tokenData = JSON.parse(raw);
    if (tokenData.access_token && tokenData.expires_at > Date.now()) {
      return tokenData.access_token;
    }
  } catch (e) {
    // token file no existe o es inválido — obtener uno nuevo
  }
  return refreshZoomToken();
}

function zoomRequest(method, path, body) {
  const token = getZoomToken();

  const reqOpts = {
    method: method,
    url: "https://api.zoom.us/v2" + path,
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json",
    },
  };
  if (body) {
    reqOpts.body = JSON.stringify(body);
  }

  let res = $http.send(reqOpts);

  // Si token expiró, refrescar y reintentar una vez
  if (res.statusCode === 401) {
    const newToken = refreshZoomToken();
    reqOpts.headers["Authorization"] = "Bearer " + newToken;
    res = $http.send(reqOpts);
  }

  return res;
}
