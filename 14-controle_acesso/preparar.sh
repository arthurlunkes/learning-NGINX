#!/usr/bin/env sh
# Gera a CA, os certificados de servidor e de cliente, e o arquivo de senhas.
set -e
cd "$(dirname "$0")"
mkdir -p certs

# No Git Bash (Windows) o MSYS converte "/CN=..." em caminho de arquivo.
export MSYS_NO_PATHCONV=1

echo "1/4  Autoridade certificadora (CA) propria"
openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
  -keyout certs/ca.key -out certs/ca.crt \
  -subj "/C=BR/O=Learning NGINX/CN=CA de Exemplo" 2>/dev/null

echo "2/4  Certificado do servidor, assinado pela CA"
openssl req -nodes -newkey rsa:2048 \
  -keyout certs/servidor.key -out certs/servidor.csr \
  -subj "/C=BR/O=Learning NGINX/CN=localhost" 2>/dev/null
# Arquivo de extensoes num arquivo de verdade: o openssl do Git Bash (Windows)
# nao le "-extfile /dev/stdin".
# "nginx" entra no SAN porque os testes de mTLS rodam de dentro da rede Docker,
# onde o servidor atende por esse nome. Sem ele, o curl recusa a conexao por
# divergencia de nome antes mesmo de chegar ao certificado de cliente.
printf 'subjectAltName=DNS:localhost,DNS:nginx,IP:127.0.0.1\n' > certs/ext.cnf
openssl x509 -req -in certs/servidor.csr -days 365 \
  -CA certs/ca.crt -CAkey certs/ca.key -CAcreateserial \
  -extfile certs/ext.cnf -out certs/servidor.crt 2>/dev/null

echo "3/4  Certificado do CLIENTE, assinado pela mesma CA"
# E isto que o mTLS verifica: o cliente prova que possui um certificado
# emitido por uma CA em que o servidor confia.
openssl req -nodes -newkey rsa:2048 \
  -keyout certs/cliente.key -out certs/cliente.csr \
  -subj "/C=BR/O=Learning NGINX/OU=Integracoes/CN=cliente-autorizado" 2>/dev/null
openssl x509 -req -in certs/cliente.csr -days 365 \
  -CA certs/ca.crt -CAkey certs/ca.key -CAcreateserial \
  -out certs/cliente.crt 2>/dev/null

echo "4/4  Certificado de um INTRUSO, de uma CA diferente (para o teste negativo)"
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout certs/intruso.key -out certs/intruso.crt \
  -subj "/C=BR/O=Outra Empresa/CN=intruso" 2>/dev/null

rm -f certs/*.csr certs/ext.cnf

# ---------------------------------------------------------------------------
# Arquivo de senhas do basic auth.
#
# O utilitario `htpasswd` vem do pacote apache2-utils e nem sempre esta
# instalado; `openssl passwd -apr1` gera o mesmo formato (MD5 do Apache), que o
# NGINX aceita.
# ---------------------------------------------------------------------------
{
  printf 'admin:%s\n' "$(openssl passwd -apr1 senha123)"
  printf 'leitor:%s\n' "$(openssl passwd -apr1 leitura456)"
} > htpasswd

echo ""
echo "Pronto."
echo "  Usuarios: admin/senha123  e  leitor/leitura456"
echo "  Certificados em certs/ (cliente.crt e o autorizado, intruso.crt nao e)"
