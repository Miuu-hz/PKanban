#!/usr/bin/env bash
# Run this script on LXC 105 (kanban-bff)
# It copies .env and installs the systemd service for the BFF.

set -euo pipefail

BFF_DIR="/opt/kanban/bff"
PROJECT_DIR="/opt/kanban"

# 1. Ensure .env exists (user must have copied it or create it now)
if [ ! -f "${BFF_DIR}/.env" ]; then
    echo "WARNING: ${BFF_DIR}/.env not found."
    echo "Please copy bff/.env from your dev machine to ${BFF_DIR}/.env first."
    echo "Example: rsync -avz bff/.env root@<LXC-105-IP>:${BFF_DIR}/.env"
    exit 1
fi

# 2. Install systemd service
cp "${PROJECT_DIR}/infrastructure/lxc-105-kanban-bff.service" /etc/systemd/system/kanban-bff.service

# 3. Reload systemd and start service
systemctl daemon-reload
systemctl enable kanban-bff
systemctl restart kanban-bff

# 4. Show status
sleep 2
systemctl status kanban-bff --no-pager

echo "=========================================="
echo "BFF service started."
echo "Test: curl http://localhost:3000/health"
echo "Logs: journalctl -u kanban-bff -f"
echo "=========================================="
