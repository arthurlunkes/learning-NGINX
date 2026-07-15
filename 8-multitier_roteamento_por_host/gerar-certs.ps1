# Gera os certificados auto-assinados que a borda usa para escolher por SNI.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
New-Item -ItemType Directory -Force -Path certs | Out-Null

function New-Cert($nome, $cn, $sans) {
    openssl req -x509 -nodes -newkey rsa:2048 -days 365 `
        -keyout "certs/$nome.key" -out "certs/$nome.crt" `
        -subj "/C=BR/ST=SP/O=Learning NGINX/CN=$cn" `
        -addext "subjectAltName=$sans" 2>$null
    Write-Host "  certs/$nome.crt  ->  $sans"
}

Write-Host "Gerando certificados..."
New-Cert nimbus "nimbus.com"        "DNS:nimbus.com,DNS:*.nimbus.com"
New-Cert orion  "orionsistemas.com" "DNS:orionsistemas.com,DNS:*.orionsistemas.com"

# Certificado SEPARADO para a impressao, e nao por organizacao: um wildcard de
# certificado TLS cobre apenas UM nivel, entao *.orionsistemas.com NAO vale
# para saopaulo.impressao.orionsistemas.com. Repare que o NGINX trata wildcard
# de server_name de forma diferente - la, *.orionsistemas.com casaria.
New-Cert orion-impressao "impressao.orionsistemas.com" "DNS:*.impressao.orionsistemas.com"

New-Cert vertex "vertexdata.com" "DNS:vertexdata.com,DNS:*.vertexdata.com"

# Usado so pelo catch-all da borda, para conseguir recusar o handshake.
New-Cert default "invalido.local" "DNS:invalido.local"

Write-Host ""
Write-Host "Pronto. Para conferir os SANs de um certificado:"
Write-Host "  openssl x509 -in certs/orion.crt -noout -text | Select-String -Context 0,1 'Subject Alternative Name'"
