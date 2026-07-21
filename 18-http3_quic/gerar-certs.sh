#!/usr/bin/env sh
# Certificado do servidor. QUIC exige TLS 1.3, entao nao ha versao "sem TLS"
# deste exemplo.
set -e
cd "$(dirname "$0")"
mkdir -p certs
export MSYS_NO_PATHCONV=1
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout certs/servidor.key -out certs/servidor.crt \
  -subj "/C=BR/O=Learning NGINX/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:nginx,IP:127.0.0.1" 2>/dev/null
echo "  certs/servidor.crt -> localhost, nginx, 127.0.0.1"
