#!/bin/bash
# IAGAMI — Monitor de estado de respaldos
# Uso: ./monitor_backups.sh [--report | --check | --log <N>]
# Genera registro en: /opt/backups/iagami/backup_monitor.log

BACKUP_BASE_DIR="/opt/backups/iagami"
BACKUP_DAILY_DIR="${BACKUP_BASE_DIR}/daily"
BACKUP_WEEKLY_DIR="${BACKUP_BASE_DIR}/weekly"
MONITOR_LOG="${BACKUP_BASE_DIR}/backup_monitor.log"
MAX_AGE_HOURS=25

check_status() {
    local NOW
    NOW=$(date +%s)
    local STATUS="OK"
    local ALERTS=""
    local BACKUP_AGE="N/A"
    local BACKUP_SIZE="N/A"

    LATEST_BACKUP=$(find "${BACKUP_DAILY_DIR}" -name "pb_backup_*.tar.gz*" -not -name "*.sha256" 2>/dev/null | sort | tail -1)

    if [ -z "${LATEST_BACKUP}" ]; then
        STATUS="ALERTA"
        ALERTS="${ALERTS}NO_BACKUP_ENCONTRADO;"
    else
        BACKUP_AGE=$(( (NOW - $(stat -c %Y "${LATEST_BACKUP}")) / 3600 ))
        BACKUP_SIZE=$(du -sh "${LATEST_BACKUP}" | cut -f1)
        if [ "${BACKUP_AGE}" -gt "${MAX_AGE_HOURS}" ]; then
            STATUS="ALERTA"
            ALERTS="${ALERTS}BACKUP_DESACTUALIZADO(${BACKUP_AGE}h);"
        fi
    fi

    DISK_AVAIL=$(df -h "${BACKUP_BASE_DIR}" 2>/dev/null | awk 'NR==2{print $4}' || echo "N/A")
    DISK_USE_PCT=$(df "${BACKUP_BASE_DIR}" 2>/dev/null | awk 'NR==2{print $5}' | tr -d '%' || echo "0")

    if [ "${DISK_USE_PCT:-0}" -gt 90 ]; then
        STATUS="ALERTA"
        ALERTS="${ALERTS}DISCO_LLENO(${DISK_USE_PCT}%);"
    fi

    DAILY_COUNT=$(find "${BACKUP_DAILY_DIR}" -name "pb_backup_*.tar.gz*" -not -name "*.sha256" 2>/dev/null | wc -l)
    WEEKLY_COUNT=$(find "${BACKUP_WEEKLY_DIR}" -name "pb_weekly_*.tar.gz*" -not -name "*.sha256" 2>/dev/null | wc -l)

    mkdir -p "${BACKUP_BASE_DIR}"
    LOG_ENTRY="$(date '+%Y-%m-%d %H:%M:%S')|${STATUS}|${BACKUP_SIZE}|${BACKUP_AGE}h|${DAILY_COUNT}|${WEEKLY_COUNT}|${DISK_AVAIL}|${DISK_USE_PCT}%|${LATEST_BACKUP:-ninguno}|${ALERTS:-ninguna}"
    echo "${LOG_ENTRY}" >> "${MONITOR_LOG}"

    echo "=== IAGAMI — Estado de Respaldos ==="
    echo "Fecha/hora:        $(date)"
    echo "Estado:            ${STATUS}"
    echo "Último backup:     ${LATEST_BACKUP:-Ninguno encontrado}"
    echo "Antigüedad:        ${BACKUP_AGE} horas"
    echo "Tamaño:            ${BACKUP_SIZE}"
    echo "Backups diarios:   ${DAILY_COUNT}"
    echo "Backups semanales: ${WEEKLY_COUNT}"
    echo "Espacio libre VPS: ${DISK_AVAIL}"
    echo "Uso de disco:      ${DISK_USE_PCT}%"
    echo "Alertas:           ${ALERTS:-Ninguna}"
    echo "Log guardado en:   ${MONITOR_LOG}"
}

show_report() {
    echo "=== HISTORIAL DE RESPALDOS (últimas 30 entradas) ==="
    echo "FECHA|ESTADO|TAMAÑO|ANTIGÜEDAD|DIARIOS|SEMANALES|DISCO_LIBRE|USO_DISCO|ARCHIVO|ALERTAS"
    tail -30 "${MONITOR_LOG}" 2>/dev/null || echo "Log no disponible en ${MONITOR_LOG}"
}

show_log() {
    local N="${1:-20}"
    echo "=== Últimas ${N} líneas del log de backup ==="
    tail -${N} /var/log/iagami_backup.log 2>/dev/null || echo "Log no encontrado en /var/log/iagami_backup.log"
}

case "${1:---check}" in
    --check)   check_status ;;
    --report)  show_report ;;
    --log)     show_log "${2:-20}" ;;
    *) echo "Uso: $0 [--check | --report | --log <N>]" ;;
esac
