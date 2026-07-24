# 8. Multi-tier: NGINX de borda + um tier por empresa

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

[← voltar ao índice](../README.md)
