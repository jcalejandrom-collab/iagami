# Fase 16 — Resultado: Respaldo y Continuidad Operativa
**Fecha:** 5 de noviembre de 2026
**Versión de referencia:** commit 0b27a12
**Estado:** ENTREGADO — Pendiente validación en VPS

---

## Dictamen

**COMPLETO CON PENDIENTES DE INFRAESTRUCTURA**

La Fase 16 entrega la estrategia completa de respaldo, continuidad y recuperación para SIGAP IAGAMI. Los scripts están listos para aplicarse en el VPS. La validación final requiere acceso SSH al VPS (166.1.88.129) por parte del administrador.

> Nota metodológica: los scripts han sido revisados por inspección. La ejecución real (primer backup, prueba de restauración) debe realizarse en el VPS y documentarse antes de Fase 17.

---

## Entregables generados

| Archivo | Descripción | Estado |
|---|---|---|
| `scripts/backup_pocketbase.sh` | Backup automático diario y semanal con rotación y checksum SHA256 | ✅ Creado |
| `scripts/verify_backup.sh` | Verificación de integridad SHA256 + estructura tar | ✅ Creado |
| `scripts/restore_test.sh` | Prueba de restauración en ambiente aislado (/tmp — NUNCA producción) | ✅ Creado |
| `docs/POLITICA_RESPALDOS.md` | Política institucional (RPO, RTO, retención, responsabilidades) | ✅ Creado |
| `docs/PLAN_RECUPERACION_DESASTRES.md` | Procedimientos para 6 escenarios de desastre | ✅ Creado |
| `docs/PLAN_CONTINUIDAD_OPERATIVA.md` | Arquitectura, medidas implementadas, protocolo de caída | ✅ Creado |

---

## Parámetros definidos

| Parámetro | Valor |
|---|---|
| RPO (Recovery Point Objective) | 24 horas |
| RTO (Recovery Time Objective) | 4 horas |
| Retención backups diarios | 7 días |
| Retención backups semanales | 4 semanas |
| Frecuencia de prueba de restauración | Trimestral |
| Directorio de backups en VPS | `/opt/backups/iagami/` |

---

## Acciones pendientes en VPS (responsabilidad del administrador)

| # | Acción | Script/Comando | Prioritario |
|---|---|---|---|
| 1 | Copiar scripts al VPS | `scp scripts/*.sh root@166.1.88.129:/opt/scripts/` | Sí |
| 2 | Dar permisos de ejecución | `chmod +x /opt/scripts/*.sh` | Sí |
| 3 | Ejecutar primer backup manual | `/opt/scripts/backup_pocketbase.sh` | Sí |
| 4 | Verificar el backup generado | `/opt/scripts/verify_backup.sh <archivo>` | Sí |
| 5 | Ejecutar prueba de restauración | `/opt/scripts/restore_test.sh <archivo>` | Sí |
| 6 | Configurar cron para backup automático | `crontab -e` → ver `PLAN_RECUPERACION_DESASTRES.md` | Sí |
| 7 | Aplicar Nginx rate limiting | Ver `docs/nginx_rate_limiting.md` | Obligatorio pre-producción |
| 8 | Establecer destino de copia externa | S3 / Google Drive / servidor secundario | Recomendado |

---

## Condición pre-producción (INNEGOCIABLE)

> Antes de abrir cualquier portal de autenticación al público:
> 1. **Nginx rate limiting aplicado y verificado** (ver `docs/nginx_rate_limiting.md`)
> 2. **Al menos un backup real ejecutado y verificado** en el VPS
> 3. **Al menos una prueba de restauración exitosa** con `restore_test.sh`

---

## Fase 16 — Ampliación (requisitos institucionales completos)

**Fecha ampliación:** 5 de noviembre de 2026

| Archivo | Descripción | Estado |
|---|---|---|
| `scripts/backup_pocketbase.sh` | **Actualizado**: cifrado AES-256-CBC opcional via OpenSSL (passphrase en archivo protegido, NUNCA en repo). Compatible si OpenSSL no está instalado. | ✅ Actualizado |
| `scripts/setup_systemd_timer.sh` | Configurar systemd timer como alternativa al cron. Instala servicio + timer, verifica estado, permite eliminar. Disparo: 02:00 AM diario. | ✅ Creado |
| `scripts/monitor_backups.sh` | Monitor de estado: último backup, antigüedad, tamaño, alertas de disco (>90%), log CSV detallado en `/opt/backups/iagami/backup_monitor.log`. Modos: `--check`, `--report`, `--log`. | ✅ Creado |
| `admin/index.html` | Módulo **Respaldos** en panel admin: estado actual (4 stat cards), historial de las últimas 10 entradas de `iagami_sys_logs` tipo "backup", info de almacenamiento y sistema. Sigue patrón y diseño institucional exacto. | ✅ Creado |

### Detalles del cifrado en backup_pocketbase.sh

- Variable `ENCRYPT_BACKUPS=false` — desactivado por defecto, no rompe el script si OpenSSL no está.
- Si se activa: cifra con `openssl enc -aes-256-cbc -pbkdf2`, passphrase desde `/opt/backups/iagami/.backup_key` (permisos 600).
- Si falla el cifrado: guarda sin cifrar y registra advertencia en log.
- Instrucciones de configuración documentadas como comentario al final del script.

### Detalles del módulo admin de respaldos

- Consulta `iagami_sys_logs` con `filter=tipo="backup"` para mostrar historial.
- Si no hay registros o falla la conexión: muestra mensaje explicativo con instrucción de configurar VPS.
- Nunca llama a rutas inexistentes ni expone credenciales.
- Función `renderRespaldos()` + `renderBackupHistory()` usando `esc()` en todos los valores.

---

## Próxima fase

**Fase 17 — Despliegue Productivo**

Prerrequisitos:
- Nginx rate limiting aplicado en VPS ⏳
- Scripts de backup copiados al VPS y cron o systemd timer configurado ⏳
- Primera prueba de restauración real aprobada ⏳
- 9 colecciones de Brigadas creadas en PocketBase producción ⏳
