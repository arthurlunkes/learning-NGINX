# Aprendendo NGINX

**21 exemplos práticos** com Docker, do "hello world" estático ao roteamento multi-tier, load balancing multi-tenant, mTLS, HTTP/3, WAF, JavaScript dentro do próprio NGINX e tracing distribuído.

Cada exemplo sobe com um `docker compose up -d`, e **cada número deste README foi medido** rodando o ambiente — inclusive os testes negativos, que mostram o que quebra quando a configuração está errada.

Se você já sabe o básico e quer ir direto ao que costuma custar caro, comece pela tabela de [armadilhas que não dão erro](#as-armadilhas-que-não-dão-erro).

## Os exemplos

**Fundamentos**

| # | Exemplo | O que ensina | Diretivas centrais |
|---|---|---|---|
| 1 | [Primeiro Docker](#1-primeiro-docker---hello-world) | servir arquivo estático em container | `root` |
| 2 | [Load Balancer](#2-load-balancer) | distribuir carga entre instâncias | `upstream`, `proxy_pass` |
| 3 | [Timeouts](#3-timeouts) | fazer o servidor desistir na hora certa | `proxy_read_timeout`, `client_header_timeout` |
| 4 | [HTTPS, TLS 1.3 e HTTP/2](#4-https--tls-13--http2) | criptografia e protocolo moderno | `ssl_certificate`, `http2` |

**Aplicações e tempo real**

| # | Exemplo | O que ensina | Diretivas centrais |
|---|---|---|---|
| 5 | [WebSocket Proxy](#5-websocket-proxy) | atravessar o upgrade de protocolo | `proxy_set_header Upgrade` |
| 6 | [WebSocket + HTTP](#6-websocket--http) | HTTP e WebSocket no mesmo host | roteamento por `location` |
| 7 | [Monitoramento e Status](#7-monitoramento-e-status) | métricas básicas em tempo real | `stub_status` |

**Arquitetura de produção**

| # | Exemplo | O que ensina | Diretivas centrais |
|---|---|---|---|
| 8 | [Multi-tier por empresa](#8-multi-tier-nginx-de-borda--um-tier-por-empresa) | borda roteando por domínio para máquinas distintas | `server_name`, `map`, `resolver` |
| 9 | [Load Balancing Multi-Tenant](#9-load-balancing-multi-tenant-silo--pool-compartilhado) | silo dedicado vs pool compartilhado | `hash consistent`, `auth_request` |
| 13 | [LB Avançado e Failover](#13-load-balancing-avançado-e-failover) | escolher algoritmo e sobreviver a falha | `least_conn`, `max_fails`, `backup` |
| 15 | [Canary e Blue-Green](#15-canary-e-blue-green) | subir versão nova sem derrubar ninguém | `split_clients` |

**Performance**

| # | Exemplo | O que ensina | Diretivas centrais |
|---|---|---|---|
| 10 | [Rate Limiting](#10-rate-limiting-e-proteção) | limitar tráfego sem punir usuário legítimo | `limit_req`, `burst`, `nodelay` |
| 11 | [Cache de Conteúdo](#11-cache-de-conteúdo) | responder sem tocar no backend — e sobreviver a ele | `proxy_cache`, `use_stale` |
| 12 | [Compressão, Estáticos e SPA](#12-compressão-estáticos-e-spa) | entregar frontend rápido sem quebrar no F5 | `gzip`, `try_files` |

**Segurança**

| # | Exemplo | O que ensina | Diretivas centrais |
|---|---|---|---|
| 14 | [Controle de Acesso](#14-controle-de-acesso-e-autenticação) | IP, senha e certificado de cliente | `allow`/`deny`, `satisfy`, mTLS |
| 19 | [WAF com OWASP CRS](#19-waf-com-modsecurity-e-owasp-crs) | bloquear ataque sem bloquear cliente | ModSecurity, paranoia, anomaly score |

**Observabilidade**

| # | Exemplo | O que ensina | Diretivas centrais |
|---|---|---|---|
| 16 | [Observabilidade Avançada](#16-observabilidade-avançada) | log estruturado e métricas no Prometheus | `log_format escape=json` |
| 21 | [OpenTelemetry](#21-opentelemetry--tracing-distribuído) | responder "demorou **onde**?" | `otel_trace`, `traceparent` |

**Além do HTTP**

| # | Exemplo | O que ensina | Diretivas centrais |
|---|---|---|---|
| 17 | [Stream TCP e UDP](#17-stream-module--tcp-e-udp) | balancear o que não é HTTP | `stream`, `ssl_preread`, PROXY protocol |
| 18 | [HTTP/3 e QUIC](#18-http3-e-quic) | servir HTTP sobre UDP | `listen quic`, `Alt-Svc` |
| 20 | [njs](#20-njs--javascript-dentro-do-nginx) | lógica que `map` e `if` não alcançam | `js_set`, `js_content` |

Também aqui: [Comandos Úteis](#comandos-úteis) · [Conceitos Aprendidos](#conceitos-aprendidos) · [Recursos](#recursos-de-aprendizado) · [Próximos Passos](#próximos-passos)

---

## Pré-requisitos

| Ferramenta | Para quê |
|---|---|
| **Docker** v20.10+ e **Compose** v2+ | todos os exemplos |
| **OpenSSL** | gerar certificados (exemplos 4, 8, 14, 17, 18) |
| **Node.js** | scripts auxiliares no host (exemplos 9, 17, 20) — os backends rodam em container |

**Se você está no Windows**, três detalhes que aparecem ao longo do caminho:

- o `curl` nativo é compilado com **schannel**: não fala HTTP/2 nem HTTP/3, e não aceita `--cert`/`--key` em PEM. Onde isso importa, o README indica testar de dentro de um container;
- no **Git Bash**, o MSYS converte o `-subj` do OpenSSL em caminho de arquivo. Prefixe com `MSYS_NO_PATHCONV=1`;
- a porta **5353/UDP** costuma estar ocupada pelo mDNS — por isso o exemplo 17 publica em 9004.

---

## Como usar

Cada exemplo é autocontido: entra na pasta, sobe, testa, derruba.

```bash
cd 10-rate_limiting
docker compose up -d
# ... os testes da seção correspondente ...
docker compose down
```

**Rode um de cada vez.** A maioria publica em `8080`, e os exemplos 2, 4 e 8 usam as portas `80`/`443` — dois no ar ao mesmo tempo colidem. Se o `up` reclamar de porta ocupada, quase sempre é o exemplo anterior que ficou de pé:

```bash
docker ps                      # quem sobrou
docker compose down            # na pasta do exemplo anterior
```

**Antes de subir, alguns exemplos precisam de preparo:**

| Exemplo | Passo extra |
|---|---|
| 4 | `mkdir -p certs` + gerar certificado (comando na seção) |
| 8, 17, 18 | `sh gerar-certs.sh` |
| 14 | `sh preparar.sh` (gera CA, certificados e senhas) |
| 21 | `docker compose up -d --build` (imagem própria, compila na primeira vez) |

Os certificados e arquivos de senha ficam fora do versionamento de propósito — são segredos, ainda que de brincadeira.

**Para ler a configuração**, comece pelo `nginx.conf` de cada pasta: os comentários explicam o porquê de cada diretiva, incluindo o que acontece quando ela está errada.

---

## Projetos

### 1. Primeiro Docker - Hello World

**Objetivo**: Aprender o básico de como servir conteúdo estático com NGINX em Docker.

**Conceitos**:
- Dockerfile básico
- NGINX como servidor de arquivos estáticos
- Build e execução de containers Docker

**Estrutura**:
```
1-first_docker/
├── dockerfile       # Imagem customizada do NGINX
└── hello.html      # Página HTML simples
```

#### Como executar:

```bash
cd 1-first_docker
docker build -t nginx-hello .
docker run -d -p 9090:80 --name nginx-hello nginx-hello
```

**Acesse**: http://localhost:9090/hello.html

#### Parar:

```bash
docker stop nginx-hello
docker rm nginx-hello
```

**O que observar**:
- Como o Dockerfile copia arquivos para dentro do container
- Mapeamento de portas (`-p 9090:80`)
- Volume padrão do NGINX (`/usr/share/nginx/html`)

---

### 2. Load Balancer

**Objetivo**: Demonstrar balanceamento de carga entre múltiplas instâncias de uma aplicação.

**Conceitos**:
- Load balancing (Round Robin)
- Upstream servers
- Health checks
- Docker Compose com múltiplos serviços

**Estrutura**:
```
2-loadbalancer_test/
├── docker-compose.yaml  # Orquestração de 3 apps Node.js + NGINX
├── nginx.conf          # Configuração de upstream e proxy
└── app/
    ├── index.js        # App Express.js simples
    └── package.json
```

#### Como executar:

```bash
cd 2-loadbalancer_test
docker compose up -d
```

**Acesse**: http://localhost

#### Testar load balancing:

```bash
# Windows PowerShell
1..10 | ForEach-Object { curl http://localhost }

# Linux/Mac
for i in {1..10}; do curl http://localhost; done
```

**Resultado esperado**: As requisições são distribuídas entre `node1`, `node2` e `node3` de forma circular.

#### Parar:

```bash
docker compose down
```

**O que observar**:
- Configuração `upstream` no nginx.conf
- Como o NGINX distribui o tráfego automaticamente
- Cada instância Node.js responde com seu hostname
- Rede Docker interna (`app-network`)

---

### 3. Timeouts

**Objetivo**: Configurar timeouts para gerenciar conexões de longa duração e evitar recursos presos.

**Conceitos**:
- `proxy_connect_timeout`
- `proxy_send_timeout`
- `proxy_read_timeout`
- `client_body_timeout`
- Gerenciamento de recursos

**Estrutura**:
```
3-timeouts/
├── docker-compose.yml
├── nginx.conf
├── snippets/proxy.conf
└── app/index.js       # backend que demora de propósito
```

#### Como executar:

```bash
cd 3-timeouts
docker compose up -d
```

#### Testar:

```bash
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' "localhost:8080/curto?ms=8000"
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' "localhost:8080/longo?ms=8000"
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' localhost:8080/inalcancavel
```

Medido:

| rota | limite | resultado |
|---|---|---|
| `/rapido` | — | 200 em 94ms |
| `/curto?ms=1000` | `proxy_read_timeout 3s` | 200 em 1078ms |
| `/curto?ms=8000` | `proxy_read_timeout 3s` | **504 em 3076ms** |
| `/longo?ms=8000` | `proxy_read_timeout 30s` | 200 em 8091ms |
| `/gotejando` | `proxy_read_timeout 3s` | **200 em 30124ms** |
| `/inalcancavel` | `proxy_connect_timeout 2s` | **504 em 2082ms** |

#### Parar:

```bash
docker compose down
```

**O que observar**:

> ⚠️ **`client_header_timeout` e `client_body_timeout` não valem dentro de `location`.** E faz sentido: quando o NGINX lê os headers, ele ainda não decidiu qual `location` vai atender. O detalhe é que isso **não** gera aviso — o NGINX se recusa a subir, com `"client_header_timeout" directive is not allowed here`. A primeira versão deste exemplo tinha exatamente esse erro e nunca chegou a rodar.

**A linha mais instrutiva da tabela é a do `/gotejando`**: 30 segundos de resposta com um `proxy_read_timeout` de 3s — e **não** estoura. O limite é o intervalo entre duas leituras, não a duração total. Um backend que responde devagar mas sem parar nunca dispara o timeout; um que fica calado por 3s, sim. Confundir os dois leva a aumentar o valor errado quando a produção começa a dar 504.

**Dois grupos que não se misturam:** `client_*` e `send_timeout` medem quem está do lado de fora; `proxy_*` medem o backend. Um upload lento estoura `client_body_timeout`; um banco travado estoura `proxy_read_timeout`.

**`client_header_timeout` é a defesa contra slowloris** — o ataque em que o cliente abre conexões e manda um byte de header por vez, prendendo workers sem nunca completar a requisição.

**Timeout só faz efeito onde há espera.** Se a `location` responde com `return`, nenhum `proxy_*_timeout` faz nada — não há upstream. Por isso este exemplo tem um backend de verdade.

---

### 4. HTTPS + TLS 1.3 + HTTP/2

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

### 5. WebSocket Proxy

**Objetivo**: Configurar NGINX como proxy reverso para WebSockets.

**Conceitos**:
- Upgrade de protocolo HTTP → WebSocket
- Headers `Upgrade` e `Connection`
- Proxy bidirecional
- Timeouts para conexões persistentes

**Estrutura**:
```
5-websocket/
├── docker-compose.yaml
├── nginx.conf          # Proxy WebSocket configurado
└── src/
    ├── index.js        # Servidor WebSocket (Node.js + ws)
    └── package.json
```

#### Como executar:

```bash
cd 5-websocket
docker compose up -d
```

#### Testar:

**Opção 1: Usando extensão do navegador**
- Instale uma extensão WebSocket Client
- Conecte em: `ws://localhost:8080`
- Envie mensagens e veja o broadcast

**Opção 2: Usando wscat (Node.js)**

```bash
npm install -g wscat
wscat -c ws://localhost:8080
```

**Opção 3: JavaScript no console do navegador**

```javascript
const ws = new WebSocket('ws://localhost:8080');
ws.onmessage = (e) => console.log('Recebido:', e.data);
ws.onopen = () => ws.send('Hello WebSocket!');
```

#### Parar:

```bash
docker compose down
```

**O que observar**:
- Headers específicos para WebSocket no nginx.conf:
  ```nginx
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  ```
- Timeouts longos (7 dias) para conexões WebSocket
- Servidor Node.js faz broadcast para todos os clientes conectados

---

### 6. WebSocket + HTTP

**Objetivo**: Combinar servidor HTTP estático e WebSocket na mesma aplicação através do NGINX.

**Conceitos**:
- Roteamento por path (`/` para HTTP, `/ws` para WebSocket)
- Servir conteúdo estático e proxy dinâmico simultaneamente
- Interface web interativa com WebSocket

**Estrutura**:
```
6-websocket_and_http/
├── docker-compose.yaml
├── nginx.conf          # Rotas HTTP e WebSocket
├── index.html         # Interface de chat interativa
└── src/
    ├── index.js        # Servidor WebSocket
    └── package.json
```

#### Como executar:

```bash
cd 6-websocket_and_http
docker compose up -d
```

**Acesse**: http://localhost:8080

#### Funcionalidades:

- Página HTML servida diretamente pelo NGINX
- WebSocket conectado automaticamente via rota `/ws`
- Chat em tempo real com interface visual
- Status de conexão em tempo real
- Reconexão automática se desconectar

#### Testar:

1. Abra http://localhost:8080 em múltiplas abas do navegador
2. Digite mensagens no chat
3. Veja as mensagens sendo transmitidas para todas as abas em tempo real
4. Abra DevTools → Network → WS para ver a conexão WebSocket

#### Parar:

```bash
docker compose down
```

**O que observar**:
- Configuração de `location /` para arquivos estáticos
- Configuração de `location /ws` para proxy WebSocket
- Como o HTML usa `window.location.host` para conectar dinamicamente
- Reconexão automática implementada no JavaScript

---

### 7. Monitoramento e Status

**Objetivo**: Monitorar o NGINX em tempo real usando o módulo `stub_status` com dashboard visual.

**Conceitos**:
- Módulo `stub_status` do NGINX
- Métricas de performance em tempo real
- Visualização de dados com JavaScript
- Polling e atualização automática
- Health checks

**Estrutura**:
```
7-monitoring/
├── docker-compose.yaml
├── nginx.conf          # stub_status configurado
└── html/
    └── index.html     # Dashboard interativo
```

#### Como executar:

```bash
cd 7-monitoring
docker compose up -d
```

**Acesse**: http://localhost:8080

#### Funcionalidades do Dashboard:

- **Conexões Ativas**: Monitoramento em tempo real
- **Métricas Acumuladas**: Total de conexões aceitas, processadas e requisições
- **Estados de Conexão**: Reading, Writing, Waiting
- **Requisições/Segundo**: Taxa calculada automaticamente
- **Gráfico em Tempo Real**: Histórico visual das conexões
- **Gerador de Carga**: Testar com 100 requisições simultâneas

#### Testar:

**1. Ver status bruto do NGINX:**

```bash
curl http://localhost:8080/nginx-status
```

**Saída exemplo:**
```
Active connections: 3
server accepts handled requests
 152 152 301
Reading: 0 Writing: 1 Waiting: 2
```

**2. Gerar carga com PowerShell:**

```powershell
# 100 requisições
1..100 | ForEach-Object { Invoke-WebRequest http://localhost:8080/health }

# Requisições contínuas
while($true) { Invoke-WebRequest http://localhost:8080; Start-Sleep -Milliseconds 100 }
```

**3. Gerar carga com Apache Bench:**

```bash
# 1000 requisições, 10 concorrentes
ab -n 1000 -c 10 http://localhost:8080/

# Requisições contínuas por 30 segundos
ab -t 30 -c 5 http://localhost:8080/
```

**4. Health check endpoint:**

```bash
curl http://localhost:8080/health
```

#### Parar:

```bash
docker compose down
```

**O que observar**:

**Métricas do stub_status**:
- **Active connections**: Total de conexões ativas no momento
- **accepts**: Total de conexões aceitas pelo servidor
- **handled**: Total de conexões processadas com sucesso
- **requests**: Total de requisições HTTP processadas
- **Reading**: Conexões lendo dados do cliente
- **Writing**: Conexões enviando dados para o cliente
- **Waiting**: Conexões keep-alive em espera

**No nginx.conf**:
```nginx
location /nginx-status {
    stub_status on;
    access_log off;
}
```

**Limitações do stub_status**:
- Métricas básicas apenas (sem detalhes por endpoint)
- Sem métricas de latência detalhadas
- Sem histórico persistente

**Para monitoramento avançado, considere**:
- **NGINX Plus**: stub_status estendido com mais métricas
- **Prometheus + nginx-exporter**: Métricas detalhadas e dashboards Grafana
- **ELK Stack**: Análise avançada de logs
- **Datadog/New Relic**: Soluções APM completas

---

### 8. Multi-tier: NGINX de borda + um tier por empresa

**Objetivo**: Montar a arquitetura que aparece em produção de verdade — um NGINX de borda que termina TLS e roteia por domínio para a máquina de cada cliente, e um NGINX por máquina que distribui internamente.

**Conceitos**:
- Precedência de `server_name` (exato → wildcard mais longo → regex)
- `map` para extrair dados do `$host`
- `proxy_pass` com variável e a exigência de `resolver`
- `set_real_ip_from` / `real_ip_header` e a cadeia de `X-Forwarded-For`
- Múltiplos certificados na mesma porta via SNI
- Segmentação de redes Docker (a borda não alcança as aplicações)
- `try_files` para SPA
- `return 444` como catch-all

**Estrutura**:
```
8-multitier_roteamento_por_host/
├── docker-compose.yaml
├── gerar-certs.sh / gerar-certs.ps1
├── certs/                    # gerados localmente, não versionados
├── borda/
│   ├── nginx.conf           # TLS + roteamento por Host
│   └── snippets/proxy-tier.conf
├── tier-comum/proxy-app.conf # snippet compartilhado pelos 3 tiers
├── nimbus/nginx.conf         # empresa A
├── orion/nginx.conf          # empresa B
├── vertex/nginx.conf         # empresa C
├── impressao/nginx.conf      # map município → porta
├── frontend/index.html       # mesma página nos 3 tiers
├── app/                      # API + WebSocket
└── devexpress/               # uma app por porta, por município
```

**Topologia**:
```
                        cliente
                           │  TLS (SNI)
                  ┌────────▼─────────┐
                  │   nginx-borda    │
                  └──┬────┬────┬───┬─┘
   *.nimbus.com ─────┘    │    │   └───── *.impressao.orionsistemas.com
        *.orionsistemas.com    │ *.vertexdata.com
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐
   │ nimbus-lb│ │ orion-lb │ │ vertex-lb│ │ impressao-lb  │
   └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘
   ┌────▼─────┐ ┌────▼─────┐ ┌────▼─────┐ ┌───────▼────────┐
   │nimbus-app│ │orion-app │ │vertex-app│ │  :8101 (SP)    │
   │ api + ws │ │ api + ws │ │ api + ws │ │  :8102 (Campinas)│
   └──────────┘ └──────────┘ └──────────┘ │  :8103 (Santos)│
                                          └────────────────┘
```

#### Passo 1: Gerar certificados

```bash
cd 8-multitier_roteamento_por_host

# Linux/Mac/Git Bash
sh gerar-certs.sh

# PowerShell
./gerar-certs.ps1
```

#### Passo 2: Executar

```bash
docker compose up -d
```

> ⚠️ Este exemplo usa as portas **80 e 443**. Derrube os exemplos 2 e 4 antes.

#### Testar:

Nada resolve esses domínios no DNS, então use `--resolve`. Com TLS, `-H "Host: ..."` **não** basta: o certificado é escolhido por SNI, que vem do nome na URL.

```bash
# Cada empresa responde pelo seu próprio tier
curl -k --resolve api.nimbus.com:443:127.0.0.1     https://api.nimbus.com/
curl -k --resolve api.orionsistemas.com:443:127.0.0.1 https://api.orionsistemas.com/
curl -k --resolve api.vertexdata.com:443:127.0.0.1 https://api.vertexdata.com/

# Impressão: o subdomínio vira porta
curl -k --resolve saopaulo.impressao.orionsistemas.com:443:127.0.0.1 \
     https://saopaulo.impressao.orionsistemas.com/
curl -k --resolve campinas.impressao.orionsistemas.com:443:127.0.0.1 \
     https://campinas.impressao.orionsistemas.com/

# Município fora do cadastro → 404
curl -k --resolve curitiba.impressao.orionsistemas.com:443:127.0.0.1 \
     https://curitiba.impressao.orionsistemas.com/

# Host desconhecido → conexão fechada (444)
curl -k --resolve desconhecido.com:443:127.0.0.1 https://desconhecido.com/

# A cadeia de proxy vista pela aplicação
curl -k --resolve api.nimbus.com:443:127.0.0.1 https://api.nimbus.com/debug
```

Para abrir no navegador, adicione ao `hosts` (`C:\Windows\System32\drivers\etc\hosts`, como administrador):

```
127.0.0.1 nimbus.com api.nimbus.com ws.nimbus.com
127.0.0.1 orionsistemas.com api.orionsistemas.com ws.orionsistemas.com
127.0.0.1 vertexdata.com api.vertexdata.com ws.vertexdata.com
127.0.0.1 saopaulo.impressao.orionsistemas.com
```

#### Parar:

```bash
docker compose down
```

**O que observar**:

**A pegadinha do `server_name`** — no NGINX, `*.orionsistemas.com` casa **múltiplos níveis**, incluindo `saopaulo.impressao.orionsistemas.com`. E a precedência é: nome exato → wildcard inicial **mais longo** → wildcard final → primeira regex. Ou seja, uma regex para capturar o município **nunca seria alcançada**: o wildcard genérico ganha antes, independente da ordem no arquivo. Por isso o bloco de impressão usa `*.impressao.orionsistemas.com` (wildcard mais longo) e extrai o município com `map`.

Para ver acontecer, troque o `server_name` do bloco de impressão por uma regex, recarregue e repita o curl — a resposta vem do tier da Orion, não do DevExpress.

**O inverso vale para TLS** — um certificado wildcard cobre **um único nível**, então `*.orionsistemas.com` **não** serve para `saopaulo.impressao.orionsistemas.com`. Daí o certificado separado. Confira com:

```bash
openssl x509 -in certs/orion.crt -noout -ext subjectAltName
openssl x509 -in certs/orion-impressao.crt -noout -ext subjectAltName
```

**`proxy_pass` com variável exige `resolver`** — o tier de impressão monta a porta dinamicamente, e isso muda o comportamento do NGINX: ele passa a resolver o nome a cada request. Sem `resolver 127.0.0.11` (DNS interno do Docker), `nginx -t` **passa**, o container sobe normalmente, e só em runtime todo request vira 502:

```bash
# comente a linha `resolver` em impressao/nginx.conf
docker compose restart impressao-lb
curl -k --resolve saopaulo.impressao.orionsistemas.com:443:127.0.0.1 \
     https://saopaulo.impressao.orionsistemas.com/          # → 502
docker compose logs impressao-lb | grep resolver
# → no resolver defined to resolve devexpress
```

**A segmentação de redes é real** — a borda está só na `dmz` e não enxerga as aplicações:

```bash
docker compose exec borda getent hosts nimbus-app      # falha
docker compose exec nimbus-lb getent hosts nimbus-app  # resolve
```

**`real_ip` e `$proxy_add_x_forwarded_for` não se combinam** — depois que o `real_ip` reescreve `$remote_addr` para o IP do cliente, anexá-lo de novo produz o mesmo IP repetido (`203.0.113.9, 203.0.113.9`). Por isso a borda usa `$proxy_add_x_forwarded_for` e o tier apenas repassa `$http_x_forwarded_for`.

---

### 9. Load Balancing Multi-Tenant (silo + pool compartilhado)

**Objetivo**: Distribuir carga em um SaaS multi-tenant, onde clientes grandes têm infraestrutura dedicada e clientes pequenos dividem um pool — com isolamento entre eles.

**Conceitos**:
- `map` traduzindo tenant → pool (silo ou compartilhado)
- `least_conn` nos silos vs `hash $tenant consistent` no pool compartilhado
- `auth_request` + `auth_request_set` (validação de JWT sem NGINX Plus)
- Avaliação preguiçosa e **cache** de variáveis de `map`
- Ordem das fases do NGINX (preaccess × access × content)
- Cota por tenant contra o "vizinho barulhento"

**Estrutura**:
```
9-loadbalance_multitenant/
├── docker-compose.yaml
├── nginx.conf
├── auth/index.js       # valida JWT com crypto nativo, sem dependências
├── app/index.js        # app de tenant
└── gerar-token.js      # emite os tokens de teste
```

**Topologia**:
```
  acme.nuvemsaas.com   globex.nuvemsaas.com   initech/umbrella/...
         └────────────────────┬────────────────────┘
                     ┌────────▼────────┐      ┌─────────┐
                     │    nginx-mt     │─────►│ authsvc │  valida JWT e
                     │  map tenant→pool│ auth │  :4000  │  barra replay
                     └──┬────────┬───┬─┘      └─────────┘
            SILO ───────┘        │   └─────── POOL COMPARTILHADO
      ┌──────────────┐  ┌────────────┐  ┌──────────────────────────┐
      │  pool_acme   │  │pool_globex │  │   pool_compartilhado     │
      │  least_conn  │  │ least_conn │  │ hash $tenant consistent  │
      │ acme1, acme2 │  │  globex1   │  │ shared1, shared2, shared3│
      └──────────────┘  └────────────┘  └──────────────────────────┘
```

#### Como executar:

```bash
cd 9-loadbalance_multitenant
docker compose up -d
```

#### Testar:

```bash
# Gera os tokens (válidos por 24h)
node gerar-token.js
# copie as linhas `export ...` para o shell

# Silo dedicado: alterna entre acme1 e acme2
curl -H "Host: acme.nuvemsaas.com" -H "Authorization: Bearer $TOKEN_ACME" localhost:8080/

# Pool compartilhado: cada tenant fica fixo em uma réplica
curl -H "Host: initech.nuvemsaas.com"  -H "Authorization: Bearer $TOKEN_INITECH"  localhost:8080/
curl -H "Host: umbrella.nuvemsaas.com" -H "Authorization: Bearer $TOKEN_UMBRELLA" localhost:8080/

# Replay entre tenants → 403
curl -H "Host: globex.nuvemsaas.com" -H "Authorization: Bearer $TOKEN_ACME" localhost:8080/

# Sem token → 401 ; host fora do padrão → 404
```

**Vizinho barulhento** (100 requisições numa conexão só):

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Host: initech.nuvemsaas.com" -H "Authorization: Bearer $TOKEN_INITECH" \
  "localhost:8080/?i=[1-100]" | sort | uniq -c
# → ~22x 200, ~78x 429

# ...e o vizinho no MESMO pool segue respondendo
curl -H "Host: umbrella.nuvemsaas.com" -H "Authorization: Bearer $TOKEN_UMBRELLA" localhost:8080/
```

**Failover com hashing consistente**:

```bash
docker compose stop shared2
# apenas os tenants que estavam no shared2 mudam de réplica; os demais ficam
docker compose start shared2
```

#### Parar:

```bash
docker compose down
```

**O que observar**:

**Por que `auth_request` e não `auth_jwt`** — validar JWT dentro do próprio NGINX (`auth_jwt`) é recurso **exclusivo do NGINX Plus**. No open-source o caminho é delegar para um serviço e ler o resultado de um header, que é o que o `authsvc` faz em ~60 linhas sem nenhuma dependência.

**A ordem das fases decide onde cada variável pode ser usada** — este é o ponto central do exemplo:

| Fase | Roda | `$tenant_jwt` disponível? |
|---|---|---|
| rewrite | `if`, `return` | ❌ vazio |
| preaccess | `limit_req`, `limit_conn` | ❌ vazio |
| access | `auth_request` | preenchido ao final |
| content | `proxy_pass` | ✅ |

Duas consequências práticas:

1. **A chave da cota tem que ser `$tenant_host`**, nunca `$tenant_jwt`. Com a chave errada o NGINX não dá erro nenhum — ele simplesmente **ignora limites cuja chave resultou vazia**, e a proteção desaparece por completo. Medido: `$tenant_jwt` → 100 requisições, 100× 200; `$tenant_host` → 22× 200 e 78× 429.

2. **Nunca leia `$pool` numa fase anterior.** Um `if ($pool = "")` "defensivo" quebra tudo: além de ler vazio, o NGINX **cacheia** o valor da variável de `map` na primeira leitura, fixando `$pool=""` para o resto da requisição — e o `proxy_pass` recebe vazio também.

> ⚠️ **Ao testar a chave da cota:** trocar a chave e dar `nginx -s reload` **não tem efeito**. Zonas de memória compartilhada sobrevivem ao reload com a definição antiga enquanto nome e tamanho não mudarem. Use `docker compose up -d --force-recreate nginx-mt`.

**Por que `hash ... consistent`** — mantém o mesmo tenant sempre na mesma réplica (cache e conexões quentes) e, quando uma réplica sai, remaneja **apenas** os tenants que estavam nela, em vez de embaralhar todos.

**Promover um tenant para silo** é uma linha no `map` mais um `upstream` — nada mais muda.

Aprofundamentos relacionados: o exemplo 10 (rate limiting) detalha `burst`/`nodelay` e whitelists; o 13 (LB avançado) compara os algoritmos e cobre failover ativo.

---

### 10. Rate Limiting e Proteção

**Objetivo**: Entender de verdade como o NGINX limita tráfego — e por que `rate=5r/s` não significa "cinco por segundo".

**Conceitos**: `limit_req_zone`, `burst`, `nodelay`, `delay=N`, `limit_conn`, `geo` + `map` para isenção, `limit_req_status`, `Retry-After`

**Estrutura**:
```
10-rate_limiting/
├── docker-compose.yaml
├── nginx.conf
├── snippets/proxy.conf
└── app/index.js      # backend que aceita ?ms=N para segurar a resposta
```

#### Como executar:

```bash
cd 10-rate_limiting
docker compose up -d
```

#### Testar:

O truque é mandar tudo de uma vez. O globbing do `curl` faz 12 requisições numa única conexão, rápido o suficiente para estourar o limite:

```bash
curl -s -o /dev/null -w '%{http_code}\n' "localhost:8080/estrito?i=[1-12]" | sort | uniq -c
```

Compare os cinco modos (espere ~4s entre eles para a cota renovar):

| endpoint | configuração | resultado medido | tempo total |
|---|---|---|---|
| `/sem-limite` | — | 12× 200 | 137ms |
| `/estrito` | `limit_req` puro | 1× 200, **11× 429** | 142ms |
| `/burst` | `burst=10` | 12× 200 | **2319ms** |
| `/burst-nodelay` | `burst=10 nodelay` | 11× 200, 1× 429 | **164ms** |
| `/burst-delay` | `burst=10 delay=5` | 12× 200 | 1334ms |

Limite de conexões simultâneas:

```bash
curl -sZ --parallel-immediate -o /dev/null -w '%{http_code}\n' \
  "localhost:8080/conexoes?ms=3000&i=[1-5]" | sort | uniq -c
# → 2x 200, 3x 429
```

#### Parar:

```bash
docker compose down
```

**O que observar**:

**A taxa é um intervalo, não uma cota.** `rate=5r/s` quer dizer "uma a cada 200ms". Mandar 5 juntas rejeita 4 — é o que a linha `/estrito` mostra. Por isso `limit_req` sozinho quase nunca serve: um navegador abre várias conexões de uma vez e tomaria 429 numa página normal.

**`burst` sozinho × `burst nodelay`** — este é o par que importa, e a diferença não aparece no código de status, aparece no **relógio**. Ambos deixam ~12 requisições passarem; um demora 2,3s e o outro 164ms. Sem `nodelay` a fila **atrasa** cada requisição para respeitar o ritmo; com `nodelay` todas passam na hora e a fila só drena para liberar espaço. Para APIs, `nodelay` quase sempre é o que se quer.

**Zona compartilhada soma o consumo.** Se três `location` usarem a mesma zona, o consumo de uma gasta a cota das outras. No exemplo cada modo tem a sua zona justamente para poderem ser testados isoladamente — mas em produção é assim que se faz uma cota global valendo para vários endpoints.

**Chave vazia desliga o limite.** É como a isenção por IP funciona aqui (`geo` → `map` → chave `""`). O mesmo mecanismo, por descuido, desliga a proteção inteira — veja o exemplo 9.

**Use 429, não o 503 padrão.** E mande `Retry-After`: sem ele, um cliente bem-comportado não tem como saber quando voltar e repete na hora.

---

### 11. Cache de Conteúdo

**Objetivo**: Colocar o NGINX na frente de um backend lento e, de quebra, manter o site no ar quando esse backend cair.

**Conceitos**: `proxy_cache_path`, `proxy_cache_key`, `$upstream_cache_status`, `proxy_cache_valid`, `proxy_cache_lock`, `proxy_cache_use_stale`, `proxy_cache_background_update`, `proxy_cache_bypass`, `proxy_no_cache`, `proxy_ignore_headers`

**Estrutura**:
```
11-cache/
├── docker-compose.yaml
├── nginx.conf
├── snippets/proxy.conf
└── app/index.js      # backend lento (500ms) com contador na resposta
```

O backend demora 500ms de propósito e devolve um contador. **Se o contador não muda entre duas requisições, a segunda nunca chegou até ele.**

#### Como executar:

```bash
cd 11-cache
docker compose up -d
```

#### Testar:

```bash
# X-Cache-Status conta o que aconteceu
curl -si localhost:8080/cache/ | grep -iE "x-cache-status|contador"
curl -si localhost:8080/cache/ | grep -iE "x-cache-status|contador"
```

Medido: `MISS` em **522ms** → `HIT` em **4ms**, com o contador congelado em 1.

**Sobreviver ao backend caindo** — o recurso mais valioso daqui:

```bash
curl -s localhost:8080/stale/          # popula (válido 5s)
docker compose stop app                # mata o backend
sleep 6                                # deixa o cache vencer

curl -si localhost:8080/stale/ | head -1   # → 200, X-Cache-Status: STALE
curl -si localhost:8080/cache/ | head -1   # → 504 (sem use_stale)
```

**Purge sem NGINX Plus**:

```bash
curl -s localhost:8080/purgavel/                        # HIT (valor velho)
curl -s -H "X-Purge-Cache: 1" localhost:8080/purgavel/  # BYPASS, regrava
curl -s localhost:8080/purgavel/                        # HIT (valor novo)
```

#### Parar:

```bash
docker compose down -v
```

**O que observar**:

**`STALE` vs `504`, no mesmo instante.** Com o backend morto e o cache vencido, `/stale/` responde **200** com conteúdo levemente velho e `/cache/` responde **504**. É a diferença entre "o site está um pouco desatualizado" e "o site caiu". Se você levar uma única linha deste exemplo para produção, leve `proxy_cache_use_stale`.

**A chave padrão não inclui cookies.** O padrão é `$scheme$proxy_host$request_uri` — nenhum cookie, nenhum header de autenticação. Cachear página que depende de login com a chave padrão entrega a página de um usuário para outro. O `/por-sessao` mostra a defesa: `proxy_cache_bypass` (não lê) **e** `proxy_no_cache` (não grava). Verificado: a requisição com sessão não poluiu o cache público, que continuou servindo o valor anônimo.

**"Configurei `proxy_cache` e nada é cacheado"** — quase sempre é um `Set-Cookie` ou um `Cache-Control` vindo do backend. `/privado` mostra o NGINX obedecendo; `/ignora-headers` mostra como sobrepor — com a ressalva de que ignorar `Set-Cookie` sem `proxy_hide_header` faz o cookie de um usuário vazar para os outros.

> ⚠️ **O gatilho do purge precisa ficar fora da chave do cache.** A tentação é usar `?renovar=1` com `proxy_cache_bypass $arg_renovar`. Não funciona: a query faz parte da chave, então `/purgavel/?renovar=1` é uma entrada **diferente** de `/purgavel/` — o bypass busca no backend e grava na entrada errada, deixando a original intacta e velha. Testado e confirmado. Por isso o gatilho aqui é um **header**, que não entra na chave.

**`inactive` ≠ `proxy_cache_valid`.** O primeiro remove o que ninguém pediu no período, mesmo que ainda esteja válido; o segundo define por quanto tempo a cópia é considerada fresca.

---

### 12. Compressão, Estáticos e SPA

**Objetivo**: Servir um frontend rápido e que não quebre ao dar F5 numa rota interna. Só NGINX, sem backend nenhum.

**Conceitos**: `gzip`, `gzip_static`, `gzip_vary`, `sendfile`/`tcp_nopush`, `open_file_cache`, `try_files`, `Cache-Control: immutable`, `error_page` com `internal`

**Estrutura**:
```
12-compressao_estaticos_spa/
├── docker-compose.yaml
├── nginx.conf
└── html/
    ├── index.html          # shell da SPA
    ├── 404.html            # página de erro própria
    ├── 50x.html
    └── assets/
        ├── app.a1b2c3.js        # nome com hash
        ├── app.a1b2c3.js.gz     # pré-comprimido para gzip_static
        └── style.a1b2c3.css
```

#### Como executar:

```bash
cd 12-compressao_estaticos_spa
docker compose up -d
```

**Acesse**: http://localhost:8080

#### Testar:

```bash
# Compressão (arquivo original: 13938 bytes)
curl -sI localhost:8080/assets/app.a1b2c3.js | grep -i content-length
curl -sI -H "Accept-Encoding: gzip" localhost:8080/assets/app.a1b2c3.js \
  | grep -iE "content-length|content-encoding"
```

Medido: **13938 → 1944 bytes** (86% menor). O CSS cai de 1101 para 570 bytes.

```bash
# SPA: qualquer rota devolve o shell com 200
for r in / /painel /painel/relatorios/2026 /qualquer/coisa; do
  curl -s -o /dev/null -w "$r -> %{http_code}\n" "localhost:8080$r"
done

# ...mas asset inexistente devolve 404, e não o HTML
curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/assets/nao-existe.js
```

#### Parar:

```bash
docker compose down
```

**O que observar**:

**O fallback da SPA não pode valer para os assets.** Se `try_files ... /index.html` pegar tudo, um `.js` que não existe volta com o HTML da página e **status 200** — e o navegador tenta executar `<!DOCTYPE html>` como JavaScript, gerando o clássico `Unexpected token '<'`. Por isso `location /assets/` usa `try_files $uri =404`: erro de asset tem que ser 404 mesmo.

**`Cache-Control: immutable` só é seguro com hash no nome.** Ele diz ao navegador para não revalidar nem com F5. Em arquivo sem hash, prende o usuário numa versão antiga por um ano. E o shell (`index.html`) leva `no-cache` justamente por ser ele quem aponta para os nomes novos.

> ⚠️ **`expires` e `add_header Cache-Control` não se substituem, se somam.** Usar os dois na mesma `location` manda o header **duplicado** e deixa o cliente escolher qual obedecer — o `immutable` pode simplesmente ser ignorado. Confirmado nos headers durante a construção deste exemplo. Use um ou outro.

**`gzip_vary on` não é opcional.** Sem o `Vary: Accept-Encoding`, um cache intermediário guarda a versão comprimida e a entrega a um cliente que não sabe descomprimir.

**`gzip_static` dá `Content-Length`; a compressão em tempo real, não.** O arquivo `.gz` pronto tem tamanho conhecido; comprimir na hora obriga o NGINX a usar `Transfer-Encoding: chunked`. Comprimir uma vez no build também permite usar nível 9 sem custo em runtime.

**Não comprima o que já é comprimido.** JPEG, PNG, woff2 e zip não devem entrar em `gzip_types` — só gastam CPU. E `text/html` é sempre comprimido, não pode ser listado.

---

### 13. Load Balancing Avançado e Failover

**Objetivo**: Ir além do round robin do exemplo 2 — escolher o algoritmo certo e entender o que o NGINX faz quando uma instância cai.

**Conceitos**: `least_conn`, `ip_hash`, `hash ... consistent`, `weight`, `max_fails`/`fail_timeout`, `backup`, `down`, `proxy_next_upstream`

> ⚠️ **Health check ativo é NGINX Plus.** No open-source só existe o **passivo**: o NGINX descobre que um servidor caiu quando uma requisição real falha nele. É isso que `max_fails`/`fail_timeout` controlam.

**Estrutura**:
```
13-loadbalance_avancado/
├── docker-compose.yaml
├── nginx.conf
├── snippets/proxy.conf
└── app/index.js       # instância identificável; SEMPRE_ERRO=1 responde 500
```

#### Como executar:

```bash
cd 13-loadbalance_avancado
docker compose up -d
```

#### Testar:

```bash
# Distribuição de 24 requisições em cada algoritmo
curl -s "localhost:8080/rr/?i=[1-24]" | grep -o '"servidor":"[^"]*"' | sort | uniq -c
```

Medido:

| endpoint | algoritmo | distribuição de 24 requisições |
|---|---|---|
| `/rr/` | round robin | 8 / 8 / 8 |
| `/iphash/` | `ip_hash` | **24 no mesmo servidor** |
| `/pesos/` | `weight=3` e `weight=1` | 18 / 6 |
| `/down/` | app2 marcada `down` | 12 / 12, app2 fora |

Afinidade por recurso e failover:

```bash
# hash $request_uri consistent: mesma URI, mesma instância
for u in produtos clientes pedidos; do curl -s localhost:8080/hash-uri/$u; done

# Retentativa automática (a 1ª instância do pool responde 500 sempre)
for i in $(seq 1 12); do curl -s -o /dev/null -w '%{http_code} ' localhost:8080/retry/; done
for i in $(seq 1 12); do curl -s -o /dev/null -w '%{http_code} ' localhost:8080/sem-retry/; done

# Servidor de reserva
docker compose stop app1 app2      # todas as primárias fora
curl -s localhost:8080/reserva/    # → reserva assume
docker compose start app1 app2     # volta sozinho após o fail_timeout
```

#### Parar:

```bash
docker compose down
```

**O que observar**:

**A retentativa é invisível para o cliente.** Com `proxy_next_upstream ... http_500`: **12× 200**. Sem ela, o mesmo pool alterna **500, 200, 500, 200…** — o round robin entrega metade das requisições à instância quebrada e o erro chega ao usuário.

> ⚠️ **`proxy_next_upstream http_500` faz o 500 contar como falha para o `max_fails`** — e o estado "instância fora" pertence ao **upstream**, não à `location`. Duas locations dividindo o mesmo upstream se afetam: na primeira versão deste exemplo, a rota "sem retry" nunca via um 500, porque a rota "com retry" já tinha feito o NGINX ejetar a instância quebrada. Por isso cada uma tem seu upstream, e a instância defeituosa usa `max_fails=0` para nunca sair de rotação.

**Recuperação não é imediata.** Ao religar uma instância, o tráfego **não** volta na hora: o NGINX só tenta de novo quando o `fail_timeout` expira. Medido — app1 religada continuou sem tráfego por vários segundos, com a reserva atendendo, e as primárias reassumiram sozinhas depois.

**`ip_hash` não é hash consistente.** Tirar uma instância remapeia **todos** os clientes. Compare com `hash ... consistent`, que remapeia só a fatia da instância que saiu. Some a isso o fato de `ip_hash` só olhar 3 octetos do IPv4 e agrupar todo mundo atrás de um mesmo NAT — hoje, sessão em store compartilhado costuma ser melhor ideia.

**`backup` só entra quando *todas* as primárias caem** — não é um quarto servidor do pool, é o plantão.

---

### 14. Controle de Acesso e Autenticação

**Objetivo**: Três camadas de proteção respondendo a perguntas diferentes — de onde veio, quem sabe a senha, quem tem a chave privada.

**Conceitos**: `allow`/`deny`, `geo`, `auth_basic`, `satisfy any|all`, mTLS (`ssl_client_certificate`, `ssl_verify_client`, `$ssl_client_verify`)

**Estrutura**:
```
14-controle_acesso/
├── docker-compose.yaml
├── nginx.conf
├── preparar.sh        # gera CA, certificados e htpasswd
├── certs/             # gerados localmente, não versionados
├── htpasswd           # idem
└── html/              # conteúdo de cada área protegida
```

#### Passo 1: Gerar certificados e senhas

```bash
cd 14-controle_acesso
sh preparar.sh
# usuários: admin/senha123 e leitor/leitura456
```

#### Passo 2: Executar

```bash
docker compose up -d
```

#### Testar:

O host aparece para o NGINX como o **gateway** da rede Docker, que a config nega de propósito — assim dá para ver os dois lados:

```bash
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/interno/
curl -s -o /dev/null -w '%{http_code}\n' -u admin:senha123 localhost:8080/admin/

# ...e de dentro da rede, onde a origem é um IP interno
docker compose exec cliente curl -s -o /dev/null -w '%{http_code}\n' http://nginx/interno/
```

Medido:

| rota | do host (gateway) | de dentro (172.31.0.2) |
|---|---|---|
| `/` público | 200 | 200 |
| `/interno/` | **403** | **200** |
| `/admin/` sem senha | 401 | — |
| `/admin/` com senha | 200 | — |
| `/ou/` sem senha | **401** | **200** (o IP já basta) |
| `/e/` sem senha | 403 | **401** (IP ok, falta senha) |
| `/e/` com senha | **403** | **200** |

mTLS (rode de dentro do container — veja a nota abaixo):

```bash
docker compose exec cliente sh -c '
  curl -s -o /dev/null -w "sem cert: %{http_code}\n" --cacert /certs/ca.crt https://nginx/mtls/
  curl -s -o /dev/null -w "com cert: %{http_code}\n" --cacert /certs/ca.crt \
       --cert /certs/cliente.crt --key /certs/cliente.key https://nginx/mtls/'
```

#### Parar:

```bash
docker compose down
```

**O que observar**:

> ⚠️ **`return` anula `auth_basic` e `allow`/`deny`.** Esta é a armadilha mais séria do repositório inteiro:
>
> ```nginx
> location /admin/ {
>     auth_basic "Admin";
>     auth_basic_user_file /etc/nginx/htpasswd;
>     return 200 "conteúdo secreto";   # ABERTO PARA QUALQUER UM
> }
> ```
>
> `return` roda na fase **rewrite**, que acontece **antes** da fase **access**, onde a autenticação atua. A resposta sai antes de a senha ser checada — e nada avisa: sobe limpo, `nginx -t` passa, e o endpoint devolve 200 para quem pedir. Foi exatamente o que aconteceu na primeira versão deste exemplo: as seis rotas "protegidas" respondiam 200 sem senha. Por isso o conteúdo protegido aqui é servido como **arquivo** (fase de conteúdo, posterior à access) — vale o mesmo para `proxy_pass`.

**`satisfy any` × `satisfy all`.** A tabela acima mostra a diferença numa linha: `/e/` recusa com **403 mesmo com a senha correta**, porque exige as duas condições; `/ou/` aceita só a senha.

**A ordem de `allow`/`deny` importa** — vale a primeira regra que casar. Por isso `deny 172.31.0.1` vem antes de `allow 172.31.0.0/16`; invertido, o `allow` casaria primeiro e o `deny` nunca seria alcançado.

**Os três desfechos do mTLS são distintos**: sem certificado → **403** (chega à `location`, `$ssl_client_verify=NONE`); certificado da CA correta → **200**, com o DN completo visível (`CN=cliente-autorizado,OU=Integracoes,…`); certificado de outra CA → **400**, e não 403 — com `optional` o NGINX recusa antes de a requisição chegar à `location`. Para tratar esse caso com mensagem própria seria preciso `optional_no_ca`.

> 💡 **No Windows, teste o mTLS de dentro do container.** O `curl` nativo usa schannel (TLS do Windows), que rejeita CA própria por não conseguir checar revogação e não aceita `--cert`/`--key` em PEM. O `curl` do container usa OpenSSL e funciona normalmente.

**Basic auth sem HTTPS é o mesmo que senha nenhuma** — base64 é codificação, não criptografia.

---

### 15. Canary e Blue-Green

**Objetivo**: Colocar versão nova no ar de duas formas — uma fatia por vez (canary) ou tudo de uma vez com volta imediata (blue-green). Sem módulo nenhum.

**Conceitos**: `split_clients`, sticky por cookie, override por header, `map` para chavear ambiente, `nginx -s reload` sem downtime

**Estrutura**:
```
15-canary_blue_green/
├── docker-compose.yaml
├── nginx.conf
├── snippets/proxy.conf
└── app/index.js       # instância que declara sua VERSAO e COR
```

#### Como executar:

```bash
cd 15-canary_blue_green
docker compose up -d
```

#### Testar:

```bash
# Proporção do canário (sem sticky, cada requisição é um sorteio novo)
for i in $(seq 1 200); do curl -s localhost:8080/sem-sticky/; done \
  | grep -o '"versao":"[^"]*"' | sort | uniq -c
# → ~90% v1, ~10% v2

# Sticky: o mesmo cliente fica preso na versão sorteada
curl -s -c /tmp/jar -b /tmp/jar localhost:8080/ > /dev/null
for i in $(seq 1 15); do curl -s -b /tmp/jar localhost:8080/; done \
  | grep -o '"versao":"[^"]*"' | sort | uniq -c
# → 15 na mesma versão

# QA força a versão
curl -s -H "X-Versao: v2" localhost:8080/
```

**Virada blue-green** (troque `default v1` por `default v2` no `map $host $ambiente_ativo`):

```bash
# em um terminal, martelando durante a virada
while true; do curl -s -o /dev/null -w '%{http_code} ' localhost:8080/bluegreen/; done

# no outro
docker compose exec nginx nginx -s reload
```

Medido: **120 requisições durante o reload, todas 200**, e o tráfego passou de azul para verde sem uma única falha.

#### Parar:

```bash
docker compose down
```

**O que observar**:

**Sem sticky, o canary quebra o usuário.** Cada requisição vira um sorteio novo, então o visitante alterna entre v1 e v2 no meio da navegação — e como o frontend novo costuma falar com uma API nova, o resultado é um bug que só acontece "às vezes" e ninguém reproduz. Verificado: 20 clientes distintos, 10 requisições cada, **nenhum oscilou** entre versões; 3 dos 20 ficaram no canário.

**A cadeia de decisão é uma pilha de `map`**, e a ordem é o que dá o comportamento certo:

```
header X-Versao  →  cookie versao  →  split_clients  →  padrão
   (QA força)       (mantém a escolha)  (sorteia 10%)
```

Cada `map` usa o resultado do anterior como `default`. Confirmado: com cookie `v2` e header `X-Versao: v1`, vence o **header**.

**`split_clients` usa `$request_id`, não `$remote_addr`.** O `$request_id` é único por requisição — de propósito: o sorteio é sempre novo para quem ainda não tem cookie, e a estabilidade fica por conta do cookie. Chavear por IP prenderia todos os usuários atrás de um mesmo NAT na mesma versão, distorcendo a amostra do canário.

**O valor do blue-green está na volta.** Reverter é trocar uma linha e recarregar — mesma velocidade da ida. Em produção isso costuma virar um `include /etc/nginx/ambiente-ativo.conf` de uma linha só, para o deploy reescrever e recarregar sem tocar no `nginx.conf` principal.

**`add_header ... always`** no `Set-Cookie`: sem o `always`, o cookie não acompanha respostas de erro, e o usuário que pegasse um 500 sairia da versão sorteada.

---

### 16. Observabilidade Avançada

**Objetivo**: Sair do `stub_status` do exemplo 7 para o que se usa em escala — log estruturado que uma ferramenta consegue ler, e métricas indo para o Prometheus.

**Conceitos**: `log_format ... escape=json`, `access_log ... if=`, `$request_time` vs `$upstream_*_time`, `nginx-prometheus-exporter`, Prometheus, Grafana provisionado

**Estrutura**:
```
16-observabilidade/
├── docker-compose.yaml
├── nginx.conf
├── prometheus.yml
├── grafana/datasource.yml   # Grafana já sobe conectado ao Prometheus
├── logs/                    # bind mount, não versionado
└── app/index.js             # backend que sabe ser lento e falhar
```

#### Como executar:

```bash
cd 16-observabilidade
docker compose up -d
```

| serviço | endereço |
|---|---|
| aplicação | http://localhost:8080 |
| métricas do exporter | http://localhost:9113/metrics |
| Prometheus | http://localhost:9090 |
| Grafana (sem login) | http://localhost:3001 |

#### Testar:

```bash
# Gera tráfego variado
curl -s localhost:8080/ > /dev/null
curl -s "localhost:8080/lento?ms=900" > /dev/null
curl -s "localhost:8080/erro?code=503" > /dev/null
for i in $(seq 1 5); do curl -s localhost:8080/health > /dev/null; done

# O log é JSON válido, linha a linha?
node -e 'require("fs").readFileSync("logs/access.log","utf8").trim().split("\n").filter(Boolean).forEach(l=>JSON.parse(l)); console.log("todas válidas")'

# Métricas e raspagem
curl -s localhost:9113/metrics | grep '^nginx_'
curl -s "localhost:9090/api/v1/query?query=up"
```

#### Parar:

```bash
docker compose down
```

**O que observar**:

**`escape=json` não é opcional.** Sem ele, um `User-Agent` com aspas ou barra invertida quebra o JSON da linha e o coletor descarta o registro **em silêncio** — justamente os requests estranhos, que são os que interessam. Testado com o agente `Mozilla "com aspas" e \barra`: as 1744 linhas geradas saíram como JSON válido, com o valor corretamente escapado.

**Os quatro tempos são um diagnóstico, não quatro números iguais:**

| caminho | status | `t_request` | `t_upstream_header` | `t_upstream_response` |
|---|---|---|---|---|
| `/` | 200 | 0.002 | 0.003 | 0.003 |
| `/lento` | 200 | **0.903** | **0.904** | **0.904** |
| `/erro` | 503 | 0.001 | 0.001 | 0.001 |

- `upstream_connect` alto → problema de **rede ou saturação de conexões**
- `upstream_header` alto → o **backend está pensando demais**
- `request_time` **muito maior** que `upstream_response` → o backend foi rápido e o **cliente** é que é lento (rede ruim, celular, download grande). Culpar o backend nesse caso é o erro de diagnóstico mais comum.

**Logging condicional corta o ruído.** Health check a cada 5s vira ~500 mil linhas por mês que não dizem nada. Verificado: 5 requisições a `/health` produziram **zero** linhas no `access.log`, enquanto um `erros.log` separado recebeu exatamente os dois status de erro (503 e 404).

> ⚠️ **O exporter só entrega o que o `stub_status` tem: 7 números.** Métricas por endpoint, por upstream ou por status code são do **NGINX Plus**. No open-source, essa granularidade sai do **log**, não das métricas — é para isso que o log em JSON existe.

**Com retentativa, `$upstream_addr` e `$upstream_status` viram listas** separadas por vírgula (`"10.0.0.2:3000, 10.0.0.3:3000"`). Por isso vão como string no JSON, e não como número.

---

### 17. Stream Module — TCP e UDP

**Objetivo**: Balancear o que não é HTTP. Todos os exemplos anteriores vivem no bloco `http`, onde o NGINX **lê** a requisição; aqui ele só move bytes.

**Conceitos**: bloco `stream`, LB de camada 4, PROXY protocol, `ssl_preread` para rotear por SNI sem descriptografar, balanceamento UDP

**Estrutura**:
```
17-stream_tcp_udp/
├── docker-compose.yaml
├── gerar-certs.sh
├── certs/                   # só os BACKENDS têm certificado
├── stream/nginx.conf        # o proxy de camada 4
├── web-pp/nginx.conf        # backend que lê PROXY protocol
├── tls-alfa/, tls-beta/     # backends TLS para o teste de SNI
├── app/index.js             # backend HTTP identificável
├── udp/index.js             # servidor UDP de eco
└── testar-udp.js            # cliente UDP de teste
```

| porta | o que faz |
|---|---|
| 9001 | LB TCP puro |
| 9002 | LB TCP com PROXY protocol |
| 9003 | roteamento por SNI (`ssl_preread`) |
| 9004 | LB UDP (→ 5353 no container) |

#### Como executar:

```bash
cd 17-stream_tcp_udp
sh gerar-certs.sh
docker compose up -d
```

#### Testar:

```bash
# 1. LB TCP — os backends falam HTTP, mas o NGINX aqui não sabe disso
for i in $(seq 1 8); do curl -s localhost:9001/; done

# 2. PROXY protocol — compare o IP que o backend enxerga
curl -s localhost:9001/     # cliente = IP do proxy
curl -s localhost:9002/     # cliente = IP real

# 3. Roteamento por SNI, sem descriptografar
curl -sk --resolve alfa.local:9003:127.0.0.1 https://alfa.local:9003/
curl -sk --resolve beta.local:9003:127.0.0.1 https://beta.local:9003/

# 4. LB UDP (mostra os dois cenários de sessão)
node testar-udp.js 10
```

#### Parar:

```bash
docker compose down
```

**O que observar**:

**O preço de não entender o protocolo.** Sem `http`, não há roteamento por caminho ou Host, nem cache, nem gzip, nem rewrite — e, principalmente, **nem `X-Forwarded-For`**: não existe header nenhum para acrescentar. Medido na porta 9001, o backend vê `172.33.0.9`, o IP do **proxy**.

**PROXY protocol resolve isso por fora.** Antes de repassar os bytes da aplicação, o proxy envia uma linha extra dizendo quem é o cliente. Na porta 9002, o mesmo backend passa a ver `172.33.0.1` — o cliente real.

> ⚠️ **Os dois lados precisam concordar.** Se o proxy manda a linha e o backend não a espera, ele recebe `PROXY TCP4 1.2.3.4 …` como se fosse o início da requisição e a conexão quebra com um erro que não explica nada. O inverso também falha. No destino é preciso `listen 80 proxy_protocol` + `set_real_ip_from` + `real_ip_header proxy_protocol` — e por isso essa porta não é exposta no compose: acessá-la direto, sem o proxy na frente, não funciona.

**`ssl_preread` roteia por domínio sem ter a chave privada.** Ele espia o ClientHello — que trafega em texto claro, por ser a primeira mensagem do handshake — lê o SNI e escolhe o backend. O tráfego segue criptografado de ponta a ponta. Confirmado: `alfa.local` e `beta.local` chegam a backends diferentes, e o container do proxy **não tem nenhum certificado** (`/etc/nginx/certs` sequer existe nele). Contraste direto com o exemplo 8, onde a borda termina o TLS e por isso precisa dos certificados de todos os domínios.

> ⚠️ **Em UDP, a unidade de balanceamento é a sessão, não o datagrama.** A sessão é identificada pelo par `ip:porta` do cliente, então quem reaproveita o mesmo socket fica preso no mesmo backend. Medido:
>
> | cenário | distribuição |
> |---|---|
> | 1 socket, 10 datagramas | **10 no mesmo backend** |
> | 10 sockets, 1 datagrama cada | 5 e 5 |
>
> Isso importa de verdade: agente de métricas, resolver DNS e cliente de syslog costumam abrir o socket uma vez e mantê-lo aberto — na prática, cada um conversa sempre com o mesmo backend.

**`proxy_responses`** diz quantos datagramas esperar de volta. Sem ele, o NGINX aguarda até o `proxy_timeout` segurando memória à toa; para protocolos que não respondem nada (syslog, statsd), use `0`.

> 💡 **A porta 5353 costuma estar ocupada** — é a do mDNS/Bonjour, sempre em uso no Windows. Por isso o host usa 9004 e o container mantém 5353.

---

### 18. HTTP/3 e QUIC

**Objetivo**: Servir HTTP/3 de verdade — que não roda sobre TCP, e por isso muda coisas práticas na configuração.

**Conceitos**: `listen 443 quic`, `reuseport`, `Alt-Svc`, TLS 1.3 obrigatório, `$http3`, mapeamento de porta UDP

**Estrutura**:
```
18-http3_quic/
├── docker-compose.yaml
├── nginx.conf
├── gerar-certs.sh
├── certs/            # gerado localmente
└── html/index.html   # mostra o protocolo negociado
```

#### Passo 1: Gerar certificado

```bash
cd 18-http3_quic
sh gerar-certs.sh
```

QUIC exige TLS 1.3 — não existe versão "sem TLS" deste exemplo.

#### Passo 2: Executar

```bash
docker compose up -d
```

#### Testar:

O `curl` que vem no Windows é compilado com schannel e **não tem HTTP/3**. Use um container que tenha:

```bash
docker run --rm --add-host=host.docker.internal:host-gateway ymuski/curl-http3 \
  curl --http3 -sk https://host.docker.internal:8443/versao
```

Medido:

| cliente | resposta |
|---|---|
| `curl --http3` | `protocolo: HTTP/3.0` · `tls: TLSv1.3` · `http3: h3` |
| `curl --http2` | `protocolo: HTTP/2.0` · `http3:` *(vazio)* |

No navegador: https://localhost:8443 → DevTools → Network → coluna **Protocol**.

#### Parar:

```bash
docker compose down
```

**O que observar**:

**`quic` e `ssl` são sockets diferentes, apesar do mesmo número.** Um é UDP, o outro TCP. Manter os dois não é redundância — é o único jeito de atender quem ainda não fala HTTP/3. No compose, a porta 443 aparece **duas vezes**, e esquecer a linha `/udp` faz o HTTP/3 simplesmente não funcionar, sem erro visível: o cliente cai para HTTP/2 em silêncio.

> ⚠️ **O `Alt-Svc` anuncia a porta PÚBLICA, não a interna.** A primeira requisição de qualquer cliente é sempre por TCP — ele não tem como adivinhar que existe um servidor QUIC do outro lado. É esse header que anuncia o h3. Neste exemplo ele diz `h3=":8443"`, porque é assim que o compose publica o servidor; se dissesse `443` (a porta de dentro do container), o navegador tentaria QUIC na porta errada e continuaria em HTTP/2 — sem erro na tela e sem uma linha no log. Em produção os dois números coincidem e o problema não aparece.

**`reuseport` só pode aparecer uma vez** por combinação de endereço e porta em todo o arquivo. Repetir em outro `server{}` impede o NGINX de subir.

**O ganho do QUIC é o fim do head-of-line blocking.** No HTTP/2, um pacote perdido trava **todas** as streams multiplexadas na mesma conexão, porque o TCP entrega em ordem. No QUIC cada stream tem controle próprio, então a perda afeta só a dela. Em rede móvel, é a diferença que se sente.

---

### 19. WAF com ModSecurity e OWASP CRS

**Objetivo**: Colocar um firewall de aplicação na frente do backend e entender o que ele custa — porque WAF mal ajustado bloqueia usuário legítimo.

**Conceitos**: ModSecurity, OWASP Core Rule Set, níveis de paranoia, pontuação de anomalia, `DetectionOnly`, exceções cirúrgicas

**Estrutura**:
```
19-waf_modsecurity/
├── docker-compose.yaml
├── app/index.js            # backend ingênuo, não valida nada
├── regras/excecoes.conf    # exceções customizadas
└── sem-waf/nginx.conf      # proxy simples, para comparar
```

> ⚠️ A imagem `nginx` oficial **não tem ModSecurity** — seria preciso compilar o módulo. Este exemplo usa `owasp/modsecurity-crs:nginx`, que já vem com tudo e se configura só por variável de ambiente.

Três caminhos até o **mesmo** backend: **8080** bloqueando, **8081** só observando, **8082** sem WAF.

#### Como executar:

```bash
cd 19-waf_modsecurity
docker compose up -d

# Espere ficar "healthy" antes de testar: carregar as ~900 regras do CRS
# leva alguns segundos, e nesse intervalo o WAF deixa o ataque passar.
until [ "$(docker inspect --format '{{.State.Health.Status}}' waf-bloqueio)" = "healthy" ]; do sleep 3; done
```

> ⚠️ Testar cedo demais dá **falso negativo**: a SQL injection volta 200 e parece que o WAF não funciona. Aconteceu na varredura de verificação deste repositório — 20 segundos de espera não bastaram.

#### Testar:

```bash
curl -s -o /dev/null -w '%{http_code}\n' --get \
  --data-urlencode "q=1' OR '1'='1" localhost:8080/busca   # WAF
curl -s -o /dev/null -w '%{http_code}\n' --get \
  --data-urlencode "q=1' OR '1'='1" localhost:8082/busca   # sem WAF
```

Medido — a mesma requisição pelos três caminhos:

| ataque | 8080 bloqueio | 8081 detecção | 8082 sem WAF |
|---|---|---|---|
| requisição normal | 200 | 200 | 200 |
| SQL injection | **403** | 200 | 200 |
| SQL injection (UNION) | **403** | 200 | 200 |
| XSS | **403** | 200 | 200 |
| path traversal | **403** | 200 | 200 |
| command injection | **403** | 200 | 200 |
| Log4Shell | **403** | 200 | 200 |

#### Parar:

```bash
docker compose down
```

**O que observar**:

**O CRS não bloqueia na primeira regra que casa — ele soma pontos.** Cada regra tem uma severidade, e o bloqueio só acontece quando o total passa de `ANOMALY_INBOUND` (padrão 5). O payload de Log4Shell acionou **3 regras** e somou **score 20**:

```
[932130] sev=2  Remote Command Execution: Unix Shell Expression Found
[933135] sev=2  PHP Injection Attack: Variable Access Found
[944150] sev=2  Potential Remote Command Execution: Log4j / Log4shell
[949110] sev=0  Inbound Anomaly Score Exceeded (Total Score: 20)
```

**O falso positivo é o custo real de um WAF.** Não é hipotético — este comentário perfeitamente legítimo num fórum de desenvolvedores é bloqueado com 403:

> *"quero fazer UNION SELECT dos dados, alguem ajuda?"*

A saída errada é baixar a paranoia ou desligar o WAF: joga fora a proteção inteira por causa de uma rota. A saída certa é uma exceção cirúrgica com `ctl:ruleRemoveTargetByTag`, que remove um **alvo** específico em vez de desligar as regras. Verificado nas três dimensões:

| requisição | resultado |
|---|---|
| `/busca?q=<texto>` | **403** — exceção não vale aqui |
| `/comentario?texto=<texto>` | **200** — exceção vale |
| `/comentario?outro=<texto>` | **403** — outro parâmetro, exceção não vale |

**`DetectionOnly` é como se coloca um WAF em produção sem quebrar nada.** Roda dias registrando o que *bloquearia*, você ajusta as exceções olhando o log de auditoria, e só então liga o bloqueio. A coluna 8081 da tabela acima é exatamente isso: detectou tudo, deixou passar tudo.

**Suba a paranoia devagar.** De 1 a 4: quanto maior, mais regras entram — e mais falso positivo aparece. Ir direto para 4 costuma quebrar a aplicação.

---

### 20. njs — JavaScript dentro do NGINX

**Objetivo**: Resolver o que `map` e `if` não alcançam. Fecha um ciclo com o exemplo 9, que precisou de um serviço externo para validar JWT porque `auth_jwt` é NGINX Plus.

**Conceitos**: `load_module`, `js_import`, `js_set`, `js_content`, HMAC em njs

**Estrutura**:
```
20-njs/
├── docker-compose.yaml
├── nginx.conf
├── njs/principal.js     # toda a lógica
└── gerar-token.js       # emite JWT de teste
```

> 💡 O módulo **já vem na imagem oficial** como biblioteca dinâmica (`ngx_http_js_module.so`) — basta `load_module`. Não precisa compilar nada.

Um container só: **não há backend**. Toda a lógica roda dentro do NGINX.

#### Como executar:

```bash
cd 20-njs
docker compose up -d
```

#### Testar:

```bash
# njs monta a resposta (js_content)
curl -s localhost:8080/saude

# Emite um link assinado e usa
curl -s "localhost:8080/assinar?caminho=/privado/relatorio.pdf&segundos=60"
curl -s "localhost:8080/privado/relatorio.pdf?expira=...&assinatura=..."

# JWT validado dentro do NGINX, sem serviço externo
TOKEN=$(node gerar-token.js acme)
curl -s -H "Authorization: Bearer $TOKEN" localhost:8080/api/pedidos
```

Medido:

| caso | resposta |
|---|---|
| link válido | 200 |
| sem assinatura | 403 — *faltam os parâmetros expira e assinatura* |
| assinatura adulterada | 403 — *assinatura inválida* |
| **outro arquivo, mesma assinatura** | **403** — o caminho entra no HMAC |
| link de 3s, após 5s | 403 — *link expirado ha 2s* |
| JWT válido | 200, `tenant: acme` |
| **payload forjado com `tenant=admin`** | **401** |

#### Parar:

```bash
docker compose down
```

**O que observar**:

**njs não é Node.js.** Não há npm, nem `require` de pacotes, nem event loop de aplicação — é um interpretador enxuto embutido no worker, com poucos módulos nativos (`crypto`, `querystring`, `fs`). Escrever esperando Node é a primeira frustração.

**Quando vale e quando não vale.** Vale quando a lógica exige cálculo, laço ou criptografia — `map` faz de/para e `if` faz comparação, nenhum dos dois calcula um HMAC. **Não** vale para de/para simples: `map` é mais rápido e mais legível. E o custo é CPU do worker: erro no script vira erro na requisição.

**O caminho tem que entrar na assinatura.** Sem isso, uma assinatura válida para um arquivo serviria para todos — testado: a mesma assinatura em `/privado/outro.pdf` dá 403.

**Confira a assinatura antes de ler o payload.** Um JWT forjado declarando `tenant=admin` foi recusado com 401 porque o HMAC é verificado primeiro. Ler o payload sem validar — erro comum, porque é a parte "fácil" — deixa qualquer um virar quem quiser.

**`js_set` é preguiçoso e cacheado**, exatamente como as variáveis de `map` do exemplo 9: a função roda quando a variável é lida pela primeira vez, e o resultado fica fixo para o resto da requisição.

**Comparado ao `secure_link`**, que já existe no NGINX: aquele módulo só faz MD5, tem formato fixo e responde 403 sem dizer por quê. Com njs dá para usar SHA-256 e informar se o problema foi expiração ou assinatura — o que muda tudo para quem está integrando.

---

### 21. OpenTelemetry — Tracing Distribuído

**Objetivo**: O exemplo 16 responde *"quanto tempo demorou?"*. Este responde **"demorou onde?"**.

**Conceitos**: `ngx_otel_module`, `otel_exporter`, `otel_trace`, `otel_span_attr`, W3C Trace Context (`traceparent`), amostragem, correlação log ↔ trace

**Estrutura**:
```
21-opentelemetry/
├── docker-compose.yaml
├── Dockerfile          # imagem própria: nginx + módulo otel
├── nginx.conf
├── snippets/proxy.conf
└── app/index.js        # backend que CONTINUA o trace, sem SDK
```

> ⚠️ **Este é o único exemplo com imagem própria, e o motivo importa.** O módulo de OpenTelemetry não vem na imagem oficial, e não adianta instalá-lo por cima: módulo dinâmico do NGINX é **travado por versão**. O repositório do nginx.org publica o `nginx-module-otel` compilado contra a 1.31.x, enquanto `nginx:latest` traz a 1.29.x — carregar um no outro falha com *"module is not binary compatible"*. Por isso o Dockerfile parte do Debian e instala NGINX e módulo do **mesmo** repositório, garantindo que as versões casem por construção.

#### Como executar:

```bash
cd 21-opentelemetry
docker compose up -d --build     # a primeira vez compila a imagem
```

| serviço | endereço |
|---|---|
| aplicação | http://localhost:8080 |
| **Jaeger (interface)** | **http://localhost:16686** |

#### Testar:

```bash
# Gera tráfego
for i in $(seq 1 12); do curl -s -o /dev/null -H "X-Tenant: acme" localhost:8080/pedidos/$i; done
for i in $(seq 1 30); do curl -s -o /dev/null localhost:8080/catalogo/$i; done

# O NGINX injeta o traceparent no backend?
curl -s localhost:8080/pedidos/1

# Descobrir o trace da própria requisição
curl -s localhost:8080/_trace

# Serviços registrados
curl -s localhost:16686/api/services
```

Abra o Jaeger, escolha o serviço `nginx-borda` e clique num trace.

#### Parar:

```bash
docker compose down
```

**O que observar**:

**A árvore precisa estar conectada — é isso que diferencia trace de log.** Verificado: **15 de 15** traces continham os dois serviços, com a estrutura correta:

```
[nginx-borda] GET /pedidos/5             261.0ms   RAIZ
[app-pedidos] processar /pedidos/5       255.0ms   filho do span acima
```

Os ~6ms de diferença são o overhead da borda. Essa subtração é a pergunta "demorou onde?" respondida — algo que nenhum log isolado entrega.

**A costura acontece pelo header `traceparent`** (padrão W3C), no formato `00-<trace-id>-<span-id>-<flags>`. O NGINX injeta, a aplicação lê, usa o `trace-id` como fio condutor e o `span-id` recebido como **pai** do próprio span. O `app/index.js` faz isso **sem SDK e sem dependência nenhuma** — de propósito, para o formato ficar visível: um span é só um JSON com ids, tempos e atributos.

**Amostragem: `otel_trace` aceita variável**, então o `split_clients` do exemplo 15 vira um amostrador. Medido: `/pedidos` com `otel_trace on` → **13 traces de 13 requisições**; `/catalogo` com amostragem de 10% → **2 traces de 30**.

> ⚠️ **O `trace_id` aparece no log mesmo quando a requisição NÃO foi amostrada.** O NGINX gera o identificador sempre; a amostragem decide apenas se o span será **enviado**. Na prática: você copia um `trace_id` de uma linha de log, cola no Jaeger e não acha nada — não porque o trace sumiu, mas porque nunca foi exportado. Verificado: das 30 requisições a `/catalogo`, **todas** com `trace_id` no log, só 2 existiam no Jaeger.

> 💡 **Ao testar, respeite o `interval` do exporter.** O envio é em lote; um trace consultado imediatamente após a requisição pode ainda não existir. Aconteceu durante a construção deste exemplo — o span aparecia depois de esperar os 2 segundos. Não é erro de configuração.

**Atributos de negócio são o que tornam o trace pesquisável.** Com `otel_span_attr http.tenant $http_x_tenant`, o span carrega `http.tenant = acme` e passa a ser possível perguntar *"me mostre os traces lentos do tenant X"*. Sem isso sobram spans genéricos, todos com o mesmo nome.

**O envio não entra no caminho da resposta** — é assíncrono e em lote, então o tracing não adiciona latência perceptível. E falha de coletor não pode derrubar requisição: no backend, o erro de envio é registrado e ignorado.

---

## Comandos Úteis

### Ver logs do NGINX:

```bash
# Logs em tempo real
docker compose logs -f nginx

# Últimas 100 linhas
docker compose logs --tail=100 nginx
```

### Recarregar configuração do NGINX:

```bash
# Recarregar sem parar o servidor
docker compose exec nginx nginx -s reload

# Parar graciosamente
docker compose exec nginx nginx -s quit
```

### Testar configuração do NGINX:

```bash
# Validar nginx.conf antes de aplicar
docker compose exec nginx nginx -t
```

### Listar containers em execução:

```bash
# Ver todos os containers do compose
docker compose ps

# Ver todos os containers Docker
docker ps
```

### Inspecionar container:

```bash
# Entrar no container NGINX
docker compose exec nginx sh

# Ver configuração ativa
docker compose exec nginx cat /etc/nginx/nginx.conf
```

### Limpar tudo:

```bash
# Parar e remover containers, redes e volumes
docker compose down -v

# Remover imagens não usadas
docker image prune -a
```

---

## Conceitos Aprendidos

### As armadilhas que não dão erro

A parte mais cara de aprender NGINX não são as diretivas — é descobrir onde uma configuração **errada se comporta como se estivesse certa**. `nginx -t` passa, o container sobe, nada aparece no log, e o comportamento está silenciosamente quebrado.

Cada linha abaixo foi encontrada construindo estes exemplos, e várias delas quebraram a primeira versão do próprio exemplo:

| O que parece | O que acontece de verdade | Onde |
|---|---|---|
| `return 200` numa `location` com `auth_basic` | **o endpoint fica aberto** — `return` roda antes da fase de autenticação | [14](#14-controle-de-acesso-e-autenticação) |
| chave de `limit_req` vinda de `auth_request_set` | **a cota deixa de existir** — a chave sai vazia e o NGINX ignora limites vazios | [9](#9-load-balancing-multi-tenant-silo--pool-compartilhado) |
| `if ($pool = "")` como proteção | **quebra o roteamento** — lê a variável cedo demais e congela o valor vazio | [9](#9-load-balancing-multi-tenant-silo--pool-compartilhado) |
| regex em `server_name` para um subdomínio | **nunca é alcançada** — wildcard vence regex, independente da ordem no arquivo | [8](#8-multi-tier-nginx-de-borda--um-tier-por-empresa) |
| `proxy_pass` com variável, sem `resolver` | `nginx -t` passa e **todo request vira 502** em runtime | [8](#8-multi-tier-nginx-de-borda--um-tier-por-empresa) |
| purge com `?renovar=1` no `proxy_cache_bypass` | **não purga nada** — a query faz parte da chave, grava em outra entrada | [11](#11-cache-de-conteúdo) |
| `expires` **e** `add_header Cache-Control` juntos | header **duplicado**, e o cliente escolhe qual obedecer | [12](#12-compressão-estáticos-e-spa) |
| `try_files ... /index.html` valendo para os assets | um `.js` ausente volta **HTML com status 200** | [12](#12-compressão-estáticos-e-spa) |
| duas `location` compartilhando um `upstream` | o estado "instância fora" é do upstream — **uma afeta a outra** | [13](#13-load-balancing-avançado-e-failover) |
| `Alt-Svc` anunciando a porta interna | o navegador tenta HTTP/3 na porta errada e **fica em h2 calado** | [18](#18-http3-e-quic) |
| `trace_id` no log | pode **não existir no Jaeger** — a amostragem decide o envio, não o id | [21](#21-opentelemetry--tracing-distribuído) |
| `real_ip` + `$proxy_add_x_forwarded_for` | o mesmo IP **repetido** na cadeia | [8](#8-multi-tier-nginx-de-borda--um-tier-por-empresa) |
| trocar a chave de uma `limit_req_zone` e dar `reload` | **não tem efeito** — a zona sobrevive ao reload com a definição antiga | [9](#9-load-balancing-multi-tenant-silo--pool-compartilhado) |
| `ssl_stapling on` com certificado auto-assinado | **ignorado** — não há emissor para consultar | [4](#4-https--tls-13--http2) |

### A ordem das fases do NGINX

Boa parte da tabela acima tem a mesma causa. O NGINX processa cada requisição em fases, e uma diretiva só enxerga o que já foi resolvido até a fase dela:

| Fase | Quem roda aqui | Consequência |
|---|---|---|
| **rewrite** | `return`, `if`, `rewrite`, `set` | acontece **antes** de qualquer autenticação |
| **preaccess** | `limit_req`, `limit_conn` | acontece **antes** do `auth_request` |
| **access** | `auth_basic`, `allow`/`deny`, `auth_request` | aqui a identidade fica conhecida |
| **content** | `proxy_pass`, servir arquivo, `js_content` | aqui tudo já está resolvido |

Some a isso duas propriedades das variáveis: as de `map` e `js_set` são **preguiçosas** (só calculam quando lidas) e ficam **cacheadas** na primeira leitura. Ler cedo demais não é apenas inútil — congela o valor errado para o resto da requisição.

### Fundamentos
- Servidor web estático e proxy reverso
- Docker Compose para orquestração multi-container
- Estrutura do `nginx.conf`: `events`, `http`, `server`, `location`
- Load balancing, `upstream` e health checks
- Gestão de timeouts do cliente e do upstream
- Certificados SSL/TLS, TLS 1.3 e HTTP/2
- Headers de segurança (HSTS, X-Frame-Options)
- WebSocket e conexões bidirecionais persistentes

### Arquitetura Multi-Tier e Multi-Tenant
- Roteamento por `Host` e precedência de `server_name`
- Múltiplos certificados na mesma porta via SNI
- `map` para seleção dinâmica de upstream e de porta
- `proxy_pass` com variável e a exigência de `resolver`
- Cadeia de `X-Forwarded-For` e recuperação do IP real com `real_ip`
- Segmentação de redes entre borda, tiers e aplicações
- Modelo silo vs pool compartilhado em SaaS multi-tenant
- Afinidade de tenant com `hash ... consistent`
- Autenticação JWT com `auth_request` (sem NGINX Plus)
- Ordem das fases do NGINX e onde cada variável já existe
- Cota por tenant contra o "vizinho barulhento"

### Performance e Proteção
- Leaky bucket: `rate` é intervalo mínimo, não cota por segundo
- `burst` com fila vs `nodelay` vs `delay=N`
- `limit_conn` contra conexões lentas (slowloris)
- Isenção por IP com `geo` + `map`
- `proxy_cache` e a leitura de `$upstream_cache_status`
- Servir conteúdo vencido quando o backend cai (`use_stale`)
- Cache e sessão: `proxy_no_cache` para não vazar página de usuário
- Purge no NGINX open-source via `proxy_cache_bypass`
- `gzip` vs `gzip_static` e a necessidade de `gzip_vary`
- `try_files` para SPA sem quebrar o carregamento de assets
- `Cache-Control: immutable` com nomes de arquivo versionados

### Resiliência, Segurança e Deploy
- Quando usar `least_conn`, `ip_hash` ou `hash ... consistent`
- Health check passivo: `max_fails`, `fail_timeout` e a recuperação automática
- `backup`, `down` e retentativa com `proxy_next_upstream`
- Por que `return` desliga `auth_basic` e `allow`/`deny`
- `satisfy any` vs `satisfy all` e a ordem das regras de IP
- mTLS: CA própria, certificado de cliente e `$ssl_client_verify`
- Canary com `split_clients` e afinidade por cookie
- Blue-green e reversão por `reload`, sem derrubar requisição

### Observabilidade e Camada 4
- Log em JSON e por que `escape=json` é obrigatório
- Ler `$request_time` vs `$upstream_*_time` para achar o culpado
- Logging condicional com `map` + `access_log if=`
- Métricas no Prometheus e o limite do que o open-source expõe
- O bloco `stream` e o que se perde ao sair do `http`
- PROXY protocol para preservar o IP do cliente em camada 4
- `ssl_preread`: rotear por SNI sem ter a chave privada
- Em UDP, o NGINX balanceia sessões — não datagramas

### Protocolos Modernos, WAF e Extensão
- HTTP/3 sobre QUIC: por que precisa de UDP e de TLS 1.3
- `Alt-Svc` como mecanismo de descoberta do h3
- Pontuação de anomalia do OWASP CRS, e não "bloqueia na primeira regra"
- `DetectionOnly` como forma de estrear um WAF sem quebrar nada
- Exceção cirúrgica de WAF em vez de baixar a paranoia
- njs para HMAC, URL assinada e validação de JWT no próprio worker
- Quando njs compensa e quando `map` continua sendo a resposta
- Tracing distribuído e propagação de contexto via `traceparent`
- Por que um módulo dinâmico exige a versão exata do NGINX
- Amostragem de traces — e por que o `trace_id` do log pode não existir no Jaeger

### Docker e operação
- Redes personalizadas e segmentação (a borda não alcança as aplicações)
- Subnets fixas quando a config precisa se referir a elas (`set_real_ip_from`, `allow`)
- Volume anônimo para isolar `node_modules` por container
- Bind mount de configuração e o ciclo editar → `nginx -t` → `reload`
- Recarregamento sem downtime, e o que **não** recarrega (zonas de memória compartilhada)
- Quando uma imagem própria é inevitável: módulo dinâmico exige a versão exata do NGINX

---

## Recursos de Aprendizado

### Documentação Oficial
- [NGINX Documentation](https://nginx.org/en/docs/) - Documentação completa
- [NGINX Beginner's Guide](https://nginx.org/en/docs/beginners_guide.html) - Guia para iniciantes
- [NGINX Admin Guide](https://docs.nginx.com/nginx/admin-guide/) - Guia administrativo

### Tópicos Específicos
- [Load Balancing](https://docs.nginx.com/nginx/admin-guide/load-balancer/) - Balanceamento de carga
- [WebSocket Proxying](https://nginx.org/en/docs/http/websocket.html) - Proxy de WebSocket
- [Configuring HTTPS](https://nginx.org/en/docs/http/configuring_https_servers.html) - Configuração SSL/TLS
- [HTTP/2 Module](https://nginx.org/en/docs/http/ngx_http_v2_module.html) - Módulo HTTP/2

### Ferramentas Úteis
- [SSL Labs](https://www.ssllabs.com/ssltest/) - Testar configuração SSL/TLS
- [HTTP/2 Test](https://tools.keycdn.com/http2-test) - Verificar suporte HTTP/2
- [WebSocket King](https://websocketking.com/) - Cliente WebSocket online
- [NGINX Config](https://www.digitalocean.com/community/tools/nginx) - Gerador de configurações

### Aprendizado Extra
- [NGINX Cookbook (O'Reilly)](https://www.nginx.com/resources/library/complete-nginx-cookbook/) - Receitas práticas
- [Learn NGINX in 2024](https://www.freecodecamp.org/news/the-nginx-handbook/) - Tutorial completo
- [Docker + NGINX](https://hub.docker.com/_/nginx) - Documentação da imagem oficial

---

## Próximos Passos

Os 21 exemplos estão implementados e verificados. Um tema ficou de fora, por depender de algo que este repositório não tem como subir sozinho:

| Tema | O que falta |
|---|---|
| **Kubernetes Ingress** | precisa de um cluster. Com o Kubernetes do Docker Desktop ligado (ou `kind`/`k3d`), o NGINX Ingress Controller reaproveita quase tudo daqui — escrito como annotations em vez de `nginx.conf` |

**Ideias de exercício combinando o que já existe:**

- aplicar o rate limiting do exemplo 10 na borda multi-tier do exemplo 8
- colocar o cache do exemplo 11 na frente dos tiers de empresa
- trocar o `auth_request` do exemplo 9 pela validação em njs do exemplo 20 — e medir a diferença de latência
- pôr o WAF do exemplo 19 na frente da borda do exemplo 8
- servir o exemplo 8 por HTTP/3, usando o que o exemplo 18 mostrou

---

## Contribuindo

Encontrou algo que não funciona, ou uma afirmação que não bate com o que você mediu? Abra uma issue — especialmente nesse segundo caso, que é o mais valioso. Sugestões de novos exemplos também são bem-vindas.

## Licença

Projeto para fins educacionais. Use e modifique à vontade.

---

Desenvolvido por Arthur Lunkes para aprender NGINX.
