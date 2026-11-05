# Plan de Continuidad Operativa — SIGAP IAGAMI
**Versión:** 1.0 | **Fecha:** 5 de noviembre de 2026 | **Clasificación:** Interno

---

## Arquitectura del sistema

```
Usuarios → Cloudflare Pages (CDN) → GitHub (código estático)
                                   ↕ API calls
                              VPS 166.1.88.129
                              Nginx (puerto 80/443)
                              PocketBase 0.39.1 (puerto 8090)
                              pb_data/ (SQLite + archivos)
```

## Componentes críticos

| Componente | Responsable de disponibilidad | Punto de fallo |
|---|---|---|
| DNS | Cloudflare (SLA 100%) | Mínimo — redundancia global |
| Código frontend | Cloudflare Pages (CDN global) | Mínimo — CDN distribuido |
| API PocketBase | VPS 166.1.88.129 | **Punto único de fallo** |
| Base de datos SQLite | Disco VPS | **Punto único de fallo** |
| Integraciones Zoom/Gemini | Proveedores externos | Dependencia externa |

## Medidas de continuidad implementadas (Fase 16)

- ✅ Backups diarios automatizables con `scripts/backup_pocketbase.sh`
- ✅ Verificación de integridad con `scripts/verify_backup.sh`
- ✅ Procedimiento de restauración con `scripts/restore_test.sh`
- ✅ Política de respaldos con RPO=24h, RTO=4h (ver `docs/POLITICA_RESPALDOS.md`)
- ✅ Plan de recuperación ante desastres para 6 escenarios (ver `docs/PLAN_RECUPERACION_DESASTRES.md`)

## Pendientes pre-producción (obligatorias)

- ⏳ Aplicar Nginx rate limiting — ver `docs/nginx_rate_limiting.md`
- ⏳ Ejecutar primera copia de respaldo real en VPS
- ⏳ Verificar restauración real con `restore_test.sh`
- ⏳ Configurar cron en VPS para backups automáticos
- ⏳ Establecer destino de copia externa (S3, Google Drive, servidor secundario)

## Recomendadas (Fase posterior)

- 🔵 Snapshot automático del VPS (ofrecido por el proveedor)
- 🔵 Monitoreo de disponibilidad con UptimeRobot (gratuito) para `https://iagami.online` y `https://api.iagami.online/api/health`
- 🔵 Alertas de email ante fallo de backup
- 🔵 PocketBase en modo réplica (si el tráfico lo justifica en el futuro)

## Protocolo ante caída del sistema

1. **Detectar caída** — alerta desde Cloudflare o reporte de usuario
2. **Verificar VPS** — `ssh -i <llave> root@166.1.88.129 "systemctl status pocketbase nginx"`
3. **Si PocketBase caído** — `systemctl start pocketbase`
4. **Si Nginx caído** — `systemctl start nginx`
5. **Si VPS no responde** — contactar proveedor + activar protocolo E2 del plan de desastres
6. **Comunicar a usuarios** — mensaje en portal público si la interrupción supera 30 minutos
7. **Post-incidente** — registrar causa y resolución en `iagami_sys_logs`
