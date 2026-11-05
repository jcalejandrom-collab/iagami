#!/bin/bash
# IAGAMI — Backup automático PocketBase
# Cron sugerido: 0 2 * * * /opt/scripts/backup_pocketbase.sh >> /var/log/iagami_backup.log 2>&1

set -euo pipefail

PB_DATA_DIR="/opt/pocketbase/pb_data"
BACKUP_BASE_DIR="/opt/backups/iagami"
BACKUP_DAILY_DIR="${BACKUP_BASE_DIR}/daily"
BACKUP_WEEKLY_DIR="${BACKUP_BASE_DIR}/weekly"
RETENTION_DAILY=7
RETENTION_WEEKLY=4
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)
LOG_PREFIX="[IAGAMI-BACKUP ${TIMESTAMP}]"

log() { echo "${LOG_PREFIX} $*"; }
fail() { echo "${LOG_PREFIX} ERROR: $*" >&2; exit 1; }

[ -d "${PB_DATA_DIR}" ] || fail "No existe el directorio PocketBase: ${PB_DATA_DIR}"
[ -f "${PB_DATA_DIR}/data.db" ] || fail "No existe data.db en ${PB_DATA_DIR}"
mkdir -p "${BACKUP_DAILY_DIR}" "${BACKUP_WEEKLY_DIR}"

DAILY_FILE="${BACKUP_DAILY_DIR}/pb_backup_${TIMESTAMP}.tar.gz"
log "Iniciando backup diario → ${DAILY_FILE}"

sqlite3 "${PB_DATA_DIR}/data.db" "PRAGMA wal_checkpoint(FULL);" 2>/dev/null || log "WAL checkpoint saltado (sqlite3 no disponible)"

tar -czf "${DAILY_FILE}" \
    --exclude="${PB_DATA_DIR}/logs" \
    -C "$(dirname ${PB_DATA_DIR})" \
    "$(basename ${PB_DATA_DIR})"

[ -s "${DAILY_FILE}" ] || fail "El archivo de backup está vacío o no existe"
BACKUP_SIZE=$(du -sh "${DAILY_FILE}" | cut -f1)
log "Backup diario creado: ${DAILY_FILE} (${BACKUP_SIZE})"

CHECKSUM_FILE="${DAILY_FILE}.sha256"
sha256sum "${DAILY_FILE}" > "${CHECKSUM_FILE}"
log "Checksum guardado: ${CHECKSUM_FILE}"

if [ "${DAY_OF_WEEK}" = "7" ]; then
    WEEKLY_FILE="${BACKUP_WEEKLY_DIR}/pb_weekly_${TIMESTAMP}.tar.gz"
    cp "${DAILY_FILE}" "${WEEKLY_FILE}"
    cp "${CHECKSUM_FILE}" "${WEEKLY_FILE}.sha256"
    log "Backup semanal creado: ${WEEKLY_FILE}"
fi

log "Rotación de backups diarios (retención: ${RETENTION_DAILY} días)"
find "${BACKUP_DAILY_DIR}" -name "pb_backup_*.tar.gz" -mtime +${RETENTION_DAILY} -delete
find "${BACKUP_DAILY_DIR}" -name "pb_backup_*.sha256" -mtime +${RETENTION_DAILY} -delete

log "Rotación de backups semanales (retención: ${RETENTION_WEEKLY} semanas)"
find "${BACKUP_WEEKLY_DIR}" -name "pb_weekly_*.tar.gz" -mtime +$((RETENTION_WEEKLY * 7)) -delete
find "${BACKUP_WEEKLY_DIR}" -name "pb_weekly_*.sha256" -mtime +$((RETENTION_WEEKLY * 7)) -delete

DAILY_COUNT=$(find "${BACKUP_DAILY_DIR}" -name "pb_backup_*.tar.gz" | wc -l)
WEEKLY_COUNT=$(find "${BACKUP_WEEKLY_DIR}" -name "pb_weekly_*.tar.gz" | wc -l)
log "COMPLETADO. Backups diarios: ${DAILY_COUNT} | Semanales: ${WEEKLY_COUNT}"
log "Último backup: ${DAILY_FILE}"
