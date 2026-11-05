#!/bin/bash
# IAGAMI — Verificación de integridad de backup
# Uso: ./verify_backup.sh <archivo_backup.tar.gz>

set -euo pipefail

BACKUP_FILE="${1:-}"
[ -z "${BACKUP_FILE}" ] && { echo "Uso: $0 <archivo.tar.gz>"; exit 1; }
[ -f "${BACKUP_FILE}" ] || { echo "ERROR: No existe el archivo: ${BACKUP_FILE}"; exit 1; }

CHECKSUM_FILE="${BACKUP_FILE}.sha256"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_PREFIX="[IAGAMI-VERIFY ${TIMESTAMP}]"
log() { echo "${LOG_PREFIX} $*"; }
fail() { echo "${LOG_PREFIX} ERROR: $*" >&2; exit 1; }

log "Verificando: ${BACKUP_FILE}"

if [ -f "${CHECKSUM_FILE}" ]; then
    log "Verificando integridad SHA256..."
    sha256sum --check "${CHECKSUM_FILE}" || fail "El checksum no coincide — el archivo puede estar corrupto"
    log "✅ Checksum OK"
else
    log "⚠️  No existe archivo de checksum. Calculando checksum del archivo actual..."
    CURRENT_SUM=$(sha256sum "${BACKUP_FILE}" | cut -d' ' -f1)
    log "SHA256: ${CURRENT_SUM}"
fi

log "Verificando estructura del archivo tar..."
tar -tzf "${BACKUP_FILE}" > /tmp/backup_contents_${TIMESTAMP}.txt || fail "El archivo tar está corrupto"
log "✅ Archivo tar legible"

grep -q "data.db" /tmp/backup_contents_${TIMESTAMP}.txt || fail "data.db no encontrado en el backup"
log "✅ data.db presente"

grep -q "storage/" /tmp/backup_contents_${TIMESTAMP}.txt \
    && log "✅ directorio storage/ presente" \
    || log "⚠️  directorio storage/ no encontrado (puede estar vacío)"

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
FILE_COUNT=$(wc -l < /tmp/backup_contents_${TIMESTAMP}.txt)
log "Tamaño: ${BACKUP_SIZE} | Archivos: ${FILE_COUNT}"

rm -f /tmp/backup_contents_${TIMESTAMP}.txt
log "✅ VERIFICACIÓN COMPLETADA — Backup íntegro"
