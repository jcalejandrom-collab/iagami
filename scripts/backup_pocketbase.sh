#!/bin/bash
# IAGAMI — Backup automático PocketBase
# Uso: ./backup_pocketbase.sh
# Cron sugerido: 0 2 * * * /opt/scripts/backup_pocketbase.sh >> /var/log/iagami_backup.log 2>&1
# Alternativa systemd: ver scripts/setup_systemd_timer.sh

set -euo pipefail

# --- Configuración ---
PB_DATA_DIR="/opt/pocketbase/pb_data"
BACKUP_BASE_DIR="/opt/backups/iagami"
BACKUP_DAILY_DIR="${BACKUP_BASE_DIR}/daily"
BACKUP_WEEKLY_DIR="${BACKUP_BASE_DIR}/weekly"
RETENTION_DAILY=7
RETENTION_WEEKLY=4
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)
LOG_PREFIX="[IAGAMI-BACKUP ${TIMESTAMP}]"

# --- Cifrado (opcional) ---
ENCRYPT_BACKUPS=false
ENCRYPT_PASSPHRASE_FILE="/opt/backups/iagami/.backup_key"
# NUNCA escribir la passphrase directamente en este script

# --- Funciones ---
log() { echo "${LOG_PREFIX} $*"; }
fail() { echo "${LOG_PREFIX} ERROR: $*" >&2; exit 1; }

encrypt_backup() {
    local FILE="$1"
    if [ "${ENCRYPT_BACKUPS}" != "true" ]; then
        echo "${FILE}"
        return
    fi
    if [ ! -f "${ENCRYPT_PASSPHRASE_FILE}" ]; then
        log "⚠️  Archivo de passphrase no encontrado: ${ENCRYPT_PASSPHRASE_FILE}. Guardando sin cifrar."
        echo "${FILE}"
        return
    fi
    local ENC_FILE="${FILE}.enc"
    if openssl enc -aes-256-cbc -pbkdf2 -in "${FILE}" -out "${ENC_FILE}" -pass "file:${ENCRYPT_PASSPHRASE_FILE}" 2>/dev/null; then
        rm -f "${FILE}"
        log "🔒 Backup cifrado: ${ENC_FILE}"
        sha256sum "${ENC_FILE}" > "${ENC_FILE}.sha256"
        echo "${ENC_FILE}"
    else
        log "⚠️  Error al cifrar. Guardando sin cifrar: ${FILE}"
        echo "${FILE}"
    fi
}

# --- Verificaciones previas ---
[ -d "${PB_DATA_DIR}" ] || fail "No existe el directorio PocketBase: ${PB_DATA_DIR}"
[ -f "${PB_DATA_DIR}/data.db" ] || fail "No existe data.db en ${PB_DATA_DIR}"
mkdir -p "${BACKUP_DAILY_DIR}" "${BACKUP_WEEKLY_DIR}"

# --- Backup diario ---
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

# --- Checksum antes de posible cifrado ---
CHECKSUM_FILE="${DAILY_FILE}.sha256"
sha256sum "${DAILY_FILE}" > "${CHECKSUM_FILE}"
log "Checksum guardado: ${CHECKSUM_FILE}"

# --- Cifrado opcional ---
DAILY_FILE=$(encrypt_backup "${DAILY_FILE}")

# --- Backup semanal (cada domingo) ---
if [ "${DAY_OF_WEEK}" = "7" ]; then
    WEEKLY_FILE="${BACKUP_WEEKLY_DIR}/pb_weekly_${TIMESTAMP}.tar.gz"
    # Copiar el archivo original antes del cifrado para el semanal
    # Si ya está cifrado, copiar el archivo cifrado
    if [[ "${DAILY_FILE}" == *.enc ]]; then
        cp "${DAILY_FILE}" "${BACKUP_WEEKLY_DIR}/pb_weekly_${TIMESTAMP}.tar.gz.enc"
        cp "${DAILY_FILE}.sha256" "${BACKUP_WEEKLY_DIR}/pb_weekly_${TIMESTAMP}.tar.gz.enc.sha256" 2>/dev/null || true
        log "Backup semanal cifrado creado: ${BACKUP_WEEKLY_DIR}/pb_weekly_${TIMESTAMP}.tar.gz.enc"
    else
        cp "${DAILY_FILE}" "${WEEKLY_FILE}"
        cp "${CHECKSUM_FILE}" "${WEEKLY_FILE}.sha256" 2>/dev/null || true
        log "Backup semanal creado: ${WEEKLY_FILE}"
    fi
fi

# --- Rotación: eliminar backups viejos ---
log "Rotación de backups diarios (retención: ${RETENTION_DAILY} días)"
find "${BACKUP_DAILY_DIR}" -name "pb_backup_*.tar.gz*" -mtime +${RETENTION_DAILY} -delete

log "Rotación de backups semanales (retención: ${RETENTION_WEEKLY} semanas)"
find "${BACKUP_WEEKLY_DIR}" -name "pb_weekly_*.tar.gz*" -mtime +$((RETENTION_WEEKLY * 7)) -delete

# --- Resumen ---
DAILY_COUNT=$(find "${BACKUP_DAILY_DIR}" -name "pb_backup_*.tar.gz*" -not -name "*.sha256" | wc -l)
WEEKLY_COUNT=$(find "${BACKUP_WEEKLY_DIR}" -name "pb_weekly_*.tar.gz*" -not -name "*.sha256" | wc -l)
log "COMPLETADO. Backups diarios: ${DAILY_COUNT} | Semanales: ${WEEKLY_COUNT}"
log "Último backup: ${DAILY_FILE}"

# CONFIGURACIÓN DEL CIFRADO:
# 1. Crear archivo de passphrase: echo 'TU_PASSPHRASE_SEGURA' > /opt/backups/iagami/.backup_key
# 2. Proteger el archivo: chmod 600 /opt/backups/iagami/.backup_key
# 3. Activar: cambiar ENCRYPT_BACKUPS=false a ENCRYPT_BACKUPS=true en este script
# 4. Para descifrar: openssl enc -d -aes-256-cbc -pbkdf2 -in archivo.tar.gz.enc -out archivo.tar.gz -pass file:/opt/backups/iagami/.backup_key
# NUNCA guardar la passphrase en el repositorio GitHub
