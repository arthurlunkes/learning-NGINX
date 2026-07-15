#!/usr/bin/env sh
# Gera os certificados auto-assinados que a borda usa para escolher por SNI.
set -e
cd "$(dirname "$0")"
mkdir -p certs

# No Git Bash (Windows), o MSYS converte o "/C=BR/ST=SP/..." do -subj em
# caminho de arquivo e o openssl recusa. Em Linux/Mac a variavel e ignorada.
export MSYS_NO_PATHCONV=1

gerar() {
  nome="$1"; cn="$2"; sans="$3"
  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout "certs/$nome.key" -out "certs/$nome.crt" \
    -subj "/C=BR/ST=SP/O=Learning NGINX/CN=$cn" \
    -addext "subjectAltName=$sans" 2>/dev/null
  echo "  certs/$nome.crt  ->  $sans"
}

echo "Gerando certificados..."
gerar nimbus          "nimbus.com"                  "DNS:nimbus.com,DNS:*.nimbus.com"
gerar orion           "orionsistemas.com"           "DNS:orionsistemas.com,DNS:*.orionsistemas.com"

# Certificado SEPARADO para a impressao, e nao por organizacao: um wildcard de
# certificado TLS cobre apenas UM nivel, entao *.orionsistemas.com NAO vale
# para saopaulo.impressao.orionsistemas.com. Repare que o NGINX trata wildcard
# de server_name de forma diferente - la, *.orionsistemas.com casaria.
gerar orion-impressao "impressao.orionsistemas.com" "DNS:*.impressao.orionsistemas.com"

gerar vertex          "vertexdata.com"              "DNS:vertexdata.com,DNS:*.vertexdata.com"

# Usado so pelo catch-all da borda, para conseguir recusar o handshake.
gerar default         "invalido.local"              "DNS:invalido.local"

echo ""
echo "Pronto. Para conferir os SANs de um certificado:"
echo "  openssl x509 -in certs/orion.crt -noout -text | grep -A1 'Subject Alternative Name'"
