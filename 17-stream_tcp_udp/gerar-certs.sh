#!/usr/bin/env sh
# Certificados dos dois backends TLS. O proxy de stream NAO recebe nenhum:
# ele nunca termina o TLS.
set -e
cd "$(dirname "$0")"
mkdir -p certs
export MSYS_NO_PATHCONV=1

for nome in alfa beta; do
  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout "certs/$nome.key" -out "certs/$nome.crt" \
    -subj "/C=BR/O=Learning NGINX/CN=$nome.local" \
    -addext "subjectAltName=DNS:$nome.local" 2>/dev/null
  echo "  certs/$nome.crt -> $nome.local"
done
