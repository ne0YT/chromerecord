#!/bin/bash

set -e

SERVICE_NAME=deno-app
WORK_DIR="/opt/chromerecord"
DENO_EXEC="/.deno/bin/deno"
MAIN_FILE="main.ts"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
LOG_DIR="/var/log/${SERVICE_NAME}"

# Create logs dir
sudo mkdir -p "$LOG_DIR"
sudo touch "$LOG_DIR/output.log" "$LOG_DIR/error.log"
sudo chown -R $(whoami) "$LOG_DIR"

# Create the systemd service
echo "[Unit]
Description=Deno App
After=network.target

[Service]
ExecStart=${DENO_EXEC} run --allow-net --allow-read --allow-write --allow-env --allow-run ${WORK_DIR}/${MAIN_FILE}
WorkingDirectory=${WORK_DIR}
Restart=always
User=$(whoami)
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
StandardOutput=append:${LOG_DIR}/output.log
StandardError=append:${LOG_DIR}/error.log

[Install]
WantedBy=multi-user.target" | sudo tee "$SERVICE_FILE" > /dev/null

# Reload systemd and start
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

echo "✅ Installed and started '${SERVICE_NAME}'"
echo "📜 Log:    tail -f ${LOG_DIR}/output.log"
echo "▶ Start:  sudo systemctl start ${SERVICE_NAME}"
echo "⏹ Stop:   sudo systemctl stop ${SERVICE_NAME}"
echo "📋 Status: sudo systemctl status ${SERVICE_NAME}"
