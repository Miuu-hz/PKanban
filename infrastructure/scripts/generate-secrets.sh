#!/usr/bin/env bash
# Generate all required secrets and print a ready-to-paste .env snippet

set -euo pipefail

echo "# === Generated Secrets — paste into .env ==="
echo "POSTGRES_PASSWORD=$(openssl rand -base64 36 | tr -d '=+/' | cut -c1-48)"
echo "REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/')"
echo "PLANKA_SECRET_KEY=$(openssl rand -base64 48 | tr -d '=+/')"
echo "DEFAULT_ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/')"
echo "BFF_JWT_SECRET=$(openssl rand -base64 48 | tr -d '=+/')"
echo "ICAL_SECRET=$(openssl rand -base64 24 | tr -d '=+/')"
