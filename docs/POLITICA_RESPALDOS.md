# Política de Respaldos — SIGAP IAGAMI
**Versión:** 1.0 | **Fecha:** 5 de noviembre de 2026 | **Clasificación:** Interno

---

## 1. Alcance

Esta política aplica a todos los datos del sistema SIGAP almacenados en PocketBase:
- Base de datos SQLite (`pb_data/data.db`)
- Archivos adjuntos (`pb_data/storage/`)
- Configuración de colecciones y reglas de acceso

No aplica a: código fuente (versionado en GitHub), configuración de Nginx, credenciales de API (Zoom, Gemini).

## 2. Objetivos de Recuperación

| Parámetro | Valor | Descripción |
|---|---|---|
| **RPO** (Recovery Point Objective) | 24 horas | Pérdida máxima de datos aceptable |
| **RTO** (Recovery Time Objective) | 4 horas | Tiempo máximo para restaurar el servicio |
| **Retención diaria** | 7 días | Se conservan los últimos 7 backups diarios |
| **Retención semanal** | 4 semanas | Se conservan las últimas 4 copias semanales |

## 3. Frecuencia de Respaldos

| Tipo | Frecuencia | Horario | Retención |
|---|---|---|---|
| Diario | Cada día | 02:00 AM (hora local VPS) | 7 días |
| Semanal | Cada domingo | 02:00 AM | 4 semanas |
| Pre-despliegue | Antes de cada actualización mayor | Manual | Indefinido |

## 4. Ubicación de Respaldos

| Ubicación | Tipo | Responsable |
|---|---|---|
| `/opt/backups/iagami/daily/` | Respaldo local diario | Sistema automático (cron) |
| `/opt/backups/iagami/weekly/` | Respaldo local semanal | Sistema automático (cron) |
| Almacenamiento externo | Copia remota | Administrador IAGAMI (manual mensual) |

> **IMPORTANTE:** Los respaldos locales no son suficientes. Una falla catastrófica del VPS puede destruir tanto los datos como los respaldos. Se requiere copia externa mensual.

## 5. Verificación de Integridad

Cada backup debe verificarse con `scripts/verify_backup.sh`. Se registra:
- Checksum SHA256 del archivo
- Conteo de archivos dentro del tar
- Presencia de `data.db` y `storage/`

## 6. Procedimiento de Restauración (Resumen)

Ver `docs/PLAN_RECUPERACION_DESASTRES.md` para el procedimiento completo.

1. Identificar el backup más reciente íntegro.
2. Verificar con `scripts/verify_backup.sh`.
3. Detener PocketBase en el VPS.
4. Renombrar `pb_data` actual como respaldo de emergencia.
5. Restaurar backup seleccionado.
6. Verificar integridad SQLite.
7. Reiniciar PocketBase.
8. Verificar acceso al panel administrativo.

## 7. Responsabilidades

| Rol | Responsabilidad |
|---|---|
| Administrador VPS | Configurar cron, monitorear logs de backup, copias externas mensuales |
| Director IAGAMI | Aprobar restauraciones en producción |
| Equipo técnico | Mantener scripts actualizados, ejecutar pruebas de restauración trimestrales |

## 8. Pruebas de Restauración

Frecuencia mínima: **trimestral**.
Procedimiento: ejecutar `scripts/restore_test.sh` con el backup más reciente.
Documentar: fecha, backup usado, tiempo de restauración, resultado.
