# Plan de Recuperación ante Desastres — SIGAP IAGAMI
**Versión:** 1.0 | **Fecha:** 5 de noviembre de 2026 | **Clasificación:** Interno

---

## Escenarios contemplados

| ID | Escenario | Probabilidad | Impacto |
|---|---|---|---|
| E1 | Corrupción de base de datos SQLite | Media | Alto |
| E2 | Falla de disco en VPS | Baja | Crítico |
| E3 | Eliminación accidental de datos | Media | Alto |
| E4 | Ataque ransomware o borrado malicioso | Muy baja | Crítico |
| E5 | Caída del VPS (red/energía) | Media | Medio |
| E6 | Vencimiento de credenciales Zoom/Gemini | Baja | Medio |

---

## Procedimiento E1/E3 — Corrupción o eliminación accidental

**RTO objetivo: 2 horas**

1. **Evaluar el daño** — no detener PocketBase todavía
   ```bash
   sqlite3 /opt/pocketbase/pb_data/data.db "PRAGMA integrity_check;"
   ```
2. **Si integrity_check falla → proceder a restauración**
3. **Identificar backup más reciente íntegro**
   ```bash
   ls -lth /opt/backups/iagami/daily/ | head -10
   /opt/scripts/verify_backup.sh /opt/backups/iagami/daily/pb_backup_<FECHA>.tar.gz
   ```
4. **Notificar al Director** antes de proceder
5. **Detener PocketBase**
   ```bash
   systemctl stop pocketbase
   ```
6. **Preservar estado actual**
   ```bash
   mv /opt/pocketbase/pb_data /opt/pocketbase/pb_data_CORRUPTO_$(date +%Y%m%d)
   ```
7. **Restaurar backup**
   ```bash
   mkdir -p /opt/pocketbase/pb_data
   tar -xzf /opt/backups/iagami/daily/pb_backup_<FECHA>.tar.gz -C /opt/pocketbase/
   ```
8. **Verificar restauración**
   ```bash
   sqlite3 /opt/pocketbase/pb_data/data.db "PRAGMA integrity_check;"
   ```
9. **Reiniciar PocketBase**
   ```bash
   systemctl start pocketbase
   ```
10. **Verificar acceso** — abrir https://iagami.online/admin
11. **Documentar**: fecha/hora del incidente, causa, backup usado, datos perdidos (si aplica)

---

## Procedimiento E2/E4 — Falla catastrófica del VPS

**RTO objetivo: 4 horas** (requiere nuevo VPS o restauración del proveedor)

1. **Contactar al proveedor del VPS** — solicitar restauración de snapshot o nuevo servidor
2. **Si se obtiene nuevo VPS:**
   - Instalar Ubuntu/Debian
   - Instalar PocketBase 0.39.1 desde GitHub releases (ver documentación oficial)
   - Restaurar backup externo más reciente
   - Configurar Nginx (ver `docs/nginx_rate_limiting.md`)
   - Restaurar hooks desde GitHub: `/opt/pocketbase/pb_hooks/`
   - Actualizar DNS de Cloudflare con la nueva IP del VPS
3. **Restaurar integración Zoom** — reconfigurar credenciales en hooks (NO en GitHub)
4. **Verificar acceso público** a https://iagami.online

---

## Procedimiento E5 — Caída del VPS

Este escenario no implica pérdida de datos — solo indisponibilidad temporal.

1. Verificar estado del VPS con el proveedor
2. Si el VPS no responde en 15 minutos → contactar soporte del proveedor
3. Una vez restaurado el VPS: `systemctl start pocketbase nginx`
4. Verificar que Cloudflare sigue apuntando a la IP correcta (166.1.88.129)
5. Si la IP cambió → actualizar registro A en Cloudflare

---

## Procedimiento E6 — Vencimiento de credenciales

1. **Zoom:** renovar credenciales en Portal Zoom Marketplace → actualizar en `/opt/pocketbase/pb_hooks/zoom_config.pb.js`
2. **Gemini:** renovar API key en Google AI Studio → actualizar en `/opt/pocketbase/pb_hooks/gemini_chat.pb.js`
3. NUNCA actualizar estas credenciales en archivos del repositorio GitHub.

---

## Alerta ante fallo de backup

Agregar al crontab (se activa si el backup del día no existe a las 06:00 AM):
```bash
# crontab -e
0 2 * * * /opt/scripts/backup_pocketbase.sh >> /var/log/iagami_backup.log 2>&1
0 6 * * * [ $(find /opt/backups/iagami/daily -name "pb_backup_$(date +\%Y\%m\%d)*.tar.gz" | wc -l) -gt 0 ] || echo "FALLO BACKUP IAGAMI $(date)" >> /var/log/iagami_backup.log
```

---

## Configuración inicial en el VPS

```bash
# Desde máquina local con llave SSH:
scp -i <llave_ssh> scripts/backup_pocketbase.sh root@166.1.88.129:/opt/scripts/
scp -i <llave_ssh> scripts/verify_backup.sh root@166.1.88.129:/opt/scripts/
scp -i <llave_ssh> scripts/restore_test.sh root@166.1.88.129:/opt/scripts/
chmod +x /opt/scripts/*.sh

# Primer backup manual para verificar funcionamiento:
/opt/scripts/backup_pocketbase.sh

# Verificar el backup generado:
/opt/scripts/verify_backup.sh /opt/backups/iagami/daily/pb_backup_<TIMESTAMP>.tar.gz

# Prueba de restauración en ambiente aislado:
/opt/scripts/restore_test.sh /opt/backups/iagami/daily/pb_backup_<TIMESTAMP>.tar.gz
```
