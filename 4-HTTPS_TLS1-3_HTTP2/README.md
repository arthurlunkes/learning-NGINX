# 4. HTTPS + TLS 1.3 + HTTP/2

**Objetivo**: Implementar HTTPS com protocolo TLS 1.3, HTTP/2 e headers de segurança modernos.

**Conceitos**:
- Certificados SSL/TLS
- TLS 1.3 (protocolo mais seguro)
- HTTP/2 (multiplexação, compressão)
- HSTS (HTTP Strict Transport Security)
- Security headers
- Redirecionamento HTTP → HTTPS

**Estrutura**:
```
4-HTTPS_TLS1-3_HTTP2/
├── docker-compose.yaml
├── nginx.conf          # SSL/TLS e HTTP/2 configurados
├── certs/             # Certificados (gerados localmente)
│   ├── cert.pem
│   └── key.pem
└── html/
    └── index.html     # Página com info de protocolo
```

#### Passo 1: Gerar certificados auto-assinados

```bash
cd 4-HTTPS_TLS1-3_HTTP2

# A pasta precisa existir antes: o openssl não a cria, e o comando
# falha com "Can't open certs/key.pem for writing".
mkdir -p certs

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -subj "/C=BR/ST=SP/L=SaoPaulo/O=Learning/CN=localhost"
```

> 💡 **No Git Bash (Windows)**, se aparecer `subject name is expected to be in the format /type0=value0...`, é o MSYS convertendo o `-subj` em caminho de arquivo. Prefixe o comando com `MSYS_NO_PATHCONV=1`.

#### Passo 2: Executar

```bash
docker compose up -d
```

**Acesse**: https://localhost (aceite o certificado auto-assinado no navegador)

#### Testar:

**1. Verificar HTTP/2 no navegador:**
- Abra DevTools (F12)
- Aba Network
- Coluna Protocol deve mostrar "h2"

**2. Verificar TLS via linha de comando:**

```bash
# Ver informações do certificado e protocolo
curl -Ik https://localhost/info

# Testar conexão TLS 1.3 especificamente
openssl s_client -connect localhost:443 -tls1_3

# Ver headers de segurança
curl -I https://localhost 2>&1 | Select-String "strict-transport"
```

#### Parar:

```bash
docker compose down
```

**O que observar**:
- Endpoint `/info` mostra protocolo, versão TLS e cipher
- Headers de segurança (HSTS, X-Frame-Options, etc.)
- Redirecionamento automático HTTP → HTTPS
- Configuração de ciphers seguros

> ⚠️ **`listen 443 ssl http2` está deprecado** desde o NGINX 1.25 e imprime aviso a cada start e reload. O HTTP/2 deixou de ser propriedade do socket e virou diretiva própria: `listen 443 ssl;` mais `http2 on;`.

> ⚠️ **OCSP Stapling não funciona com certificado auto-assinado**, e por isso está desligado aqui. O stapling depende de um **emissor** real para consultar — auto-assinado não tem. Deixar `ssl_stapling on` não habilita nada: o NGINX avisa `"ssl_stapling ignored, issuer certificate not found"` e segue sem stapling. As linhas estão comentadas no config, prontas para produção.

> 💡 **O `curl` que vem no Windows não fala HTTP/2** (é compilado com schannel), então `/info` vai mostrar `HTTP/1.1` mesmo com tudo certo. Confirme pelo navegador (DevTools → Network → Protocol → `h2`) ou por um container:
> ```bash
> docker run --rm --add-host=host.docker.internal:host-gateway ymuski/curl-http3 \
>   curl -sk --http2 https://host.docker.internal/info
> ```

---

[← voltar ao índice](../README.md)
