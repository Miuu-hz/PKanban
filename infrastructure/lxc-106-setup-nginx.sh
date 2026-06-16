#!/usr/bin/env bash
# Run this script on LXC 106 (kanban-proxy)
# It installs Nginx + Certbot, deploys the virtual host, and obtains SSL.

set -euo pipefail

DOMAIN="kanban.phopy.net"
PROXY_DIR="/opt/kanban"
NGINX_CONF_DIR="/etc/nginx"

# 1. Install Nginx and Certbot
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

# 2. Backup default config and deploy our configs
mv "${NGINX_CONF_DIR}/sites-enabled/default" "${NGINX_CONF_DIR}/sites-enabled/default.bak" 2>/dev/null || true

cp "${PROXY_DIR}/infrastructure/nginx/nginx.conf" "${NGINX_CONF_DIR}/nginx.conf"
cp "${PROXY_DIR}/infrastructure/lxc-106-nginx.conf" "${NGINX_CONF_DIR}/sites-enabled/kanban.conf"

# 3. Ensure certbot webroot exists
mkdir -p /var/www/certbot

# 4. Test Nginx config before requesting cert
nginx -t

# 5. Obtain SSL certificate from Let's Encrypt
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email admin@phopy.net

# 6. Reload Nginx
systemctl reload nginx

echo "=========================================="
echo "Nginx + SSL setup complete for ${DOMAIN}"
echo "Test: curl -I https://${DOMAIN}"
echo "=========================================="
