# Plan de Recuperación ante Desastres — SIGAP / IAGAMI

---

## Niveles de incidencia

| Nivel | Síntoma | Objetivo de recuperación |
|---|---|---|
| 1 — API caída | PocketBase no responde | Restaurar servicio < 30 min |
| 2 — BD dañada | Datos corruptos o borrados | Restaurar desde backup < 2 h |
| 3 — Servidor perdido | VPS inaccesible o destruido | Reconstrucción completa < 24 h |

---

## Arquitectura de datos

```
VPS 166.1.88.129
└── PocketBase 0.39.1
    ├── pb_data/           ← base de datos SQLite + adjuntos
    │   ├── data.db        ← colecciones y registros
    │   └── storage/       ← archivos subidos (PDF, imágenes)
    └── pb_public/         ← archivos estáticos servidos por PocketBase
```

El frontend (HTML/CSS/JS) vive en **Cloudflare Pages** (repositorio GitHub). No necesita backup separado — el repositorio ES el backup del frontend.

---

## Nivel 1 — API caída

### Diagnóstico

```bash
# Verificar que PocketBase está corriendo
ssh -i <llave> root@166.1.88.129
systemctl status pocketbase    # o el nombre del servicio configurado

# Verificar que Nginx está en pie
systemctl status nginx

# Ver últimos errores
journalctl -u pocketbase -n 50
```

### Restaurar servicio

```bash
# Reiniciar PocketBase
systemctl restart pocketbase

# Verificar que responde
curl -s https://api.iagami.online/api/health
```

**Causa común**: proceso terminado por falta de memoria o reinicio del servidor.

---

## Nivel 2 — Base de datos dañada

### Backup manual (ejecutar desde VPS)

PocketBase incluye comando de backup nativo:

```bash
# Crear backup de toda la instancia (BD + storage)
# Reemplazar <path> con el directorio de datos real
./pocketbase backup --dir /ruta/al/backup/

# Alternativa: copiar pb_data directamente (con PocketBase detenido)
systemctl stop pocketbase
cp -r /ruta/pb_data/ /backups/pb_data_$(date +%Y%m%d_%H%M%S)/
systemctl start pocketbase
```

> Documentación oficial: https://pocketbase.io/docs/going-to-production/#backup

### Frecuencia recomendada

| Tipo | Frecuencia | Retención |
|---|---|---|
| Backup diario | Cada 24 h (cron) | 7 días |
| Backup semanal | Domingos 02:00 | 4 semanas |
| Backup previo a migración | Antes de cada cambio de esquema | Indefinido |

### Cron sugerido (VPS)

```bash
# /etc/cron.d/pocketbase-backup
0 2 * * * root /opt/scripts/backup-pb.sh >> /var/log/pb-backup.log 2>&1
```

Script `/opt/scripts/backup-pb.sh`:

```bash
#!/bin/bash
set -euo pipefail
DEST="/backups/pocketbase"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$DEST"
systemctl stop pocketbase
cp -r /ruta/pb_data/ "$DEST/pb_data_$DATE"
systemctl start pocketbase
# Eliminar backups con más de 7 días
find "$DEST" -maxdepth 1 -name "pb_data_*" -mtime +7 -exec rm -rf {} +
echo "Backup $DATE completado."
```

### Restaurar desde backup

```bash
systemctl stop pocketbase
cp -r /backups/pocketbase/pb_data_<fecha>/ /ruta/pb_data/
systemctl start pocketbase
# Verificar integridad
curl -s https://api.iagami.online/api/health
```

---

## Nivel 3 — Servidor perdido

### Pasos de reconstrucción completa

**1. Nuevo VPS (mismo proveedor o equivalente)**

```bash
# Ubuntu 22.04 LTS recomendado
# Mínimo: 1 vCPU, 1 GB RAM, 20 GB SSD
```

**2. Instalar dependencias**

```bash
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx ufw fail2ban
```

**3. Restaurar PocketBase**

```bash
# Descargar misma versión (0.39.1)
wget https://github.com/pocketbase/pocketbase/releases/download/v0.39.1/pocketbase_0.39.1_linux_amd64.zip
unzip pocketbase_0.39.1_linux_amd64.zip -d /opt/pocketbase/

# Restaurar datos desde último backup externo
cp -r /backups/pb_data_<ultima>/ /opt/pocketbase/pb_data/
```

**4. Configurar Nginx como proxy inverso**

```nginx
# /etc/nginx/sites-available/api.iagami.online
server {
    listen 80;
    server_name api.iagami.online;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.iagami.online;

    # Certificado Let's Encrypt
    ssl_certificate     /etc/letsencrypt/live/api.iagami.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.iagami.online/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:8090;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        client_max_body_size 15M;   # Para uploads de hasta 10 MB con margen
    }
}
```

**5. Servicio systemd para PocketBase**

```ini
# /etc/systemd/system/pocketbase.service
[Unit]
Description=PocketBase — SIGAP IAGAMI
After=network.target

[Service]
Type=simple
User=pocketbase
WorkingDirectory=/opt/pocketbase
ExecStart=/opt/pocketbase/pocketbase serve --http=127.0.0.1:8090
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable pocketbase
systemctl start pocketbase
```

**6. Actualizar DNS**

Apuntar `api.iagami.online` a la nueva IP del VPS en el panel DNS (probablemente Cloudflare).

**7. Verificar**

```bash
curl -s https://api.iagami.online/api/health
# Esperado: {"code":200,"message":"API is healthy.","data":{...}}
```

---

## Qué respaldar externamente

| Elemento | Método | Destino recomendado |
|---|---|---|
| `pb_data/` (BD + storage) | Script cron | Bucket S3, Backblaze B2, o disco externo |
| Configuración Nginx | Archivo manual | Repositorio privado o gist cifrado |
| Certificados SSL | Automático (Certbot) | Regenerar con `certbot renew` |
| Variables de entorno VPS | Documento cifrado | Gestor de contraseñas institucional |
| Frontend (HTML/CSS/JS) | Git | GitHub (ya cubierto) |

**NUNCA guardar backups en el mismo servidor** que respaldan.

---

## Variables de entorno críticas

Estas variables deben documentarse de forma segura (nunca en el repositorio):

| Variable | Descripción | Dónde se usa |
|---|---|---|
| `PB_ENCRYPTION_KEY` | Clave de cifrado de PocketBase | VPS — PocketBase |
| `SENTRY_DSN` | DSN de Sentry (cuando se active) | `cms/config.js` vía meta tag |
| IP VPS | IP actual del servidor | DNS, SSH, monitoreo |
| Llave SSH | Archivo `.pem` o `.key` | Acceso al VPS |

---

## Checklist previo a cualquier cambio en producción

- [ ] Backup manual de `pb_data/` confirmado
- [ ] Backup verificado (restaurar en entorno local o staging)
- [ ] Quality Gate CI verde (lint + tests + e2e)
- [ ] Ventana de mantenimiento comunicada (si aplica)
- [ ] Rollback documentado: pasos para revertir el cambio

---

## Contacto técnico

Repositorio: `jcalejandrom-collab/iagami`
Despliegue frontend: Cloudflare Pages (push a `main`)
API: `https://api.iagami.online` → VPS `166.1.88.129:8090`
