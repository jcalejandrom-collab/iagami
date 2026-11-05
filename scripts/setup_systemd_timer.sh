#!/bin/bash
# IAGAMI — Configuración de systemd timer para backups automáticos
# Alternativa a cron. Ejecutar como root en el VPS.
# Uso: ./setup_systemd_timer.sh [--install | --status | --remove]

ACTION="${1:---install}"

SERVICE_FILE="/etc/systemd/system/iagami-backup.service"
TIMER_FILE="/etc/systemd/system/iagami-backup.timer"
SCRIPT_PATH="/opt/scripts/backup_pocketbase.sh"

install_timer() {
    echo "Instalando servicio systemd para backups IAGAMI..."

    [ -f "${SCRIPT_PATH}" ] || { echo "ERROR: No existe ${SCRIPT_PATH}. Copiar primero el script al VPS."; exit 1; }

    cat > "${SERVICE_FILE}" << 'EOF'
[Unit]
Description=IAGAMI PocketBase Backup
After=network.target

[Service]
Type=oneshot
User=root
ExecStart=/opt/scripts/backup_pocketbase.sh
StandardOutput=append:/var/log/iagami_backup.log
StandardError=append:/var/log/iagami_backup.log
EOF

    cat > "${TIMER_FILE}" << 'EOF'
[Unit]
Description=IAGAMI PocketBase Backup Timer
Requires=iagami-backup.service

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    systemctl daemon-reload
    systemctl enable iagami-backup.timer
    systemctl start iagami-backup.timer
    echo "✅ Systemd timer instalado y activado."
    echo "Estado: $(systemctl is-active iagami-backup.timer)"
    echo "Próximo disparo:"
    systemctl list-timers iagami-backup.timer --no-pager 2>/dev/null | tail -2
}

check_status() {
    echo "=== Estado del backup timer ==="
    systemctl status iagami-backup.timer --no-pager 2>/dev/null || echo "Timer no instalado"
    echo ""
    echo "=== Próximas ejecuciones ==="
    systemctl list-timers iagami-backup.timer --no-pager 2>/dev/null || echo "N/A"
    echo ""
    echo "=== Últimas 10 líneas del log ==="
    tail -10 /var/log/iagami_backup.log 2>/dev/null || echo "Log no encontrado en /var/log/iagami_backup.log"
}

remove_timer() {
    systemctl stop iagami-backup.timer 2>/dev/null || true
    systemctl disable iagami-backup.timer 2>/dev/null || true
    rm -f "${SERVICE_FILE}" "${TIMER_FILE}"
    systemctl daemon-reload
    echo "Timer eliminado."
}

case "${ACTION}" in
    --install) install_timer ;;
    --status)  check_status ;;
    --remove)  remove_timer ;;
    *) echo "Uso: $0 [--install | --status | --remove]" ;;
esac
