# Nginx Rate Limiting — Protección Brute-Force en VPS

**Estado:** PENDIENTE_VPS — debe aplicarse en producción antes de autorizar acceso público a los portales de autenticación.

---

## Contexto

Los portales de autenticación de SIGAP incluyen protección JavaScript de primera capa (5 intentos → bloqueo 60s). Esta protección opera en el navegador del cliente y puede ser bypasseada. La segunda capa obligatoria es la configuración de Nginx en el VPS.

Colecciones afectadas:
- `/api/collections/admins/auth-with-password`
- `/api/collections/profesores/auth-with-password`
- `/api/collections/estudiantes/auth-with-password`
- `/api/collections/comandantes_brigadas/auth-with-password`
- `/api/collections/representantes_brigadas/auth-with-password`

---

## Configuración Nginx

### 1. Definir la zona de rate limiting

En el bloque `http {}` de `/etc/nginx/nginx.conf`:

```nginx
# Zona de rate limiting para autenticación — 10 MB en memoria, 5 req/min por IP
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
```

### 2. Aplicar en el server block de SIGAP

En `/etc/nginx/sites-available/iagami` (o el archivo de configuración del VPS), dentro del bloque `server {}`:

```nginx
# Rate limiting en todos los endpoints de autenticación de PocketBase
location ~ ^/api/collections/[^/]+/auth-with-password {
    limit_req zone=auth burst=3 nodelay;
    limit_req_status 429;
    
    # Pasar al backend PocketBase
    proxy_pass http://127.0.0.1:8090;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

**Parámetros:**
- `burst=3`: permite hasta 3 peticiones en ráfaga antes de comenzar a rechazar
- `nodelay`: rechaza inmediatamente cuando se supera el burst (no pone en cola)
- `limit_req_status 429`: responde con HTTP 429 Too Many Requests

### 3. Recargar Nginx

```bash
nginx -t                          # verificar sintaxis
systemctl reload nginx            # aplicar sin downtime
```

---

## Prueba de funcionamiento

### Prueba manual con curl (desde máquina externa)

```bash
# Enviar 10 intentos rápidos y observar las respuestas
for i in $(seq 1 10); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    https://api.iagami.online/api/collections/admins/auth-with-password \
    -H "Content-Type: application/json" \
    -d '{"identity":"test@test.com","password":"wrongpass"}')
  echo "Intento $i: HTTP $STATUS"
done
```

**Resultado esperado:**
- Intentos 1-3: `400` (credenciales incorrectas — PocketBase respondió)
- Intentos 4-5: `400` (dentro del burst)
- Intentos 6+: `429` (Nginx bloqueó antes de llegar a PocketBase)

### Verificar en logs de Nginx

```bash
tail -f /var/log/nginx/access.log | grep "auth-with-password"
# Buscar líneas con código 429
```

---

## Restaurar después de prueba

Si se requiere levantar el bloqueo de una IP específica durante pruebas:

```bash
# No hay forma directa de limpiar la zona en memoria sin reiniciar Nginx
# En su lugar, esperar el tiempo de la ventana (1 minuto) o reiniciar Nginx
systemctl restart nginx
```

---

## Notas de seguridad adicionales

1. **IP-based vs. User-based**: Este rate limiting bloquea por IP. Un atacante detrás de múltiples proxies puede evadir este control. Para mayor seguridad, considerar también un rate limiting por `username` en la capa de aplicación (PocketBase hook o middleware).

2. **Cloudflare WAF**: Si el tráfico pasa por Cloudflare (configuración actual de IAGAMI), activar también la regla "Rate Limiting" en el dashboard de Cloudflare para los paths `/api/collections/*/auth-with-password`. Esto actúa antes de que el tráfico llegue al VPS.

3. **Fail2ban (opcional)**: Configurar fail2ban para parsear los logs de Nginx y bloquear a nivel de firewall (iptables) las IPs que acumulen múltiples 429:
   ```bash
   apt-get install fail2ban
   # Ver /etc/fail2ban/filter.d/nginx-limit-req.conf
   ```

---

*Documento generado en Fase 14 — Correcciones Integrales SIGAP IAGAMI*
