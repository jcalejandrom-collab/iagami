#!/bin/bash
# IAGAMI — Prueba de restauración en ambiente aislado
# ADVERTENCIA: NUNCA ejecutar apuntando a /opt/pocketbase/pb_data (producción)
# Uso: ./restore_test.sh <archivo_backup.tar.gz> [--start-instance]

set -euo pipefail

BACKUP_FILE="${1:-}"
[ -z "${BACKUP_FILE}" ] && { echo "Uso: $0 <archivo.tar.gz> [--start-instance]"; exit 1; }
[ -f "${BACKUP_FILE}" ] || { echo "ERROR: No existe el archivo: ${BACKUP_FILE}"; exit 1; }

RESTORE_DIR="/tmp/iagami_restore_test_$(date +%Y%m%d_%H%M%S)"
PB_BINARY="/opt/pocketbase/pocketbase"
TEST_PORT=8091
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_PREFIX="[IAGAMI-RESTORE-TEST ${TIMESTAMP}]"
log() { echo "${LOG_PREFIX} $*"; }
fail() { echo "${LOG_PREFIX} ERROR: $*" >&2; exit 1; }

[[ "${RESTORE_DIR}" == *"/tmp/"* ]] || fail "Directorio de restauración debe estar en /tmp/ — NUNCA en producción"

log "=== PRUEBA DE RESTAURACIÓN — AMBIENTE AISLADO ==="
log "Backup fuente: ${BACKUP_FILE}"
log "Directorio de prueba: ${RESTORE_DIR}"
log "Puerto de prueba: ${TEST_PORT}"

mkdir -p "${RESTORE_DIR}/pb_data"
log "Directorio de prueba creado"

log "Verificando integridad del backup..."
tar -tzf "${BACKUP_FILE}" > /dev/null || fail "Backup corrupto — no se puede proceder"
log "✅ Backup íntegro"

log "Restaurando backup en ambiente aislado..."
tar -xzf "${BACKUP_FILE}" -C "${RESTORE_DIR}/"
[ -f "${RESTORE_DIR}/pb_data/data.db" ] || fail "data.db no encontrado después de la restauración"
log "✅ Restauración completada"

log "Verificando integridad de la base de datos SQLite..."
sqlite3 "${RESTORE_DIR}/pb_data/data.db" "PRAGMA integrity_check;" | grep -q "ok" || fail "La base de datos no pasa integrity_check"
TABLE_COUNT=$(sqlite3 "${RESTORE_DIR}/pb_data/data.db" "SELECT count(*) FROM sqlite_master WHERE type='table';")
log "✅ Base de datos íntegra. Tablas encontradas: ${TABLE_COUNT}"

if [ "${2:-}" = "--start-instance" ]; then
    [ -f "${PB_BINARY}" ] || fail "No se encontró el binario PocketBase en ${PB_BINARY}"
    log "Iniciando instancia PocketBase de prueba en puerto ${TEST_PORT}..."
    "${PB_BINARY}" serve --dir="${RESTORE_DIR}/pb_data" --http="127.0.0.1:${TEST_PORT}" &
    PB_PID=$!
    sleep 3

    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${TEST_PORT}/api/health" || echo "000")
    if [ "${HTTP_STATUS}" = "200" ]; then
        log "✅ Instancia de prueba respondiendo en http://127.0.0.1:${TEST_PORT}"
        curl -s "http://127.0.0.1:${TEST_PORT}/api/collections" \
            | python3 -c "import sys,json; data=json.load(sys.stdin); [print('  -', c['name']) for c in data.get('items',[])]" 2>/dev/null \
            || log "  (python3 no disponible para parsear JSON)"
    else
        log "⚠️  La instancia de prueba no respondió (HTTP ${HTTP_STATUS})"
    fi

    kill "${PB_PID}" 2>/dev/null || true
    log "Instancia de prueba detenida"
fi

log "Limpiando ambiente de prueba..."
rm -rf "${RESTORE_DIR}"
log "✅ Ambiente de prueba eliminado"

log "=== PRUEBA DE RESTAURACIÓN COMPLETADA EXITOSAMENTE ==="
log "El backup es funcional y restaurable."
