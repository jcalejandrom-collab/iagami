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

## Próxima fase

**Fase 17 — Despliegue Productivo**

Prerrequisitos:
- Nginx rate limiting aplicado en VPS ⏳
- Scripts de backup copiados al VPS y cron configurado ⏳
- Primera prueba de restauración real aprobada ⏳
- 9 colecciones de Brigadas creadas en PocketBase producción ⏳
