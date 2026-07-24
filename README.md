# Aprendendo NGINX

**21 exemplos práticos** com Docker, do "hello world" estático ao roteamento multi-tier, load balancing multi-tenant, mTLS, HTTP/3, WAF, JavaScript dentro do próprio NGINX e tracing distribuído.

Cada exemplo vive na sua pasta, sobe com um `docker compose up -d` e traz um `README.md` próprio com o passo a passo. **Cada número documentado foi medido** rodando o ambiente — inclusive os testes negativos, que mostram o que quebra quando a configuração está errada.

Se você já sabe o básico e quer ir direto ao que costuma custar caro, comece pela tabela de [armadilhas que não dão erro](#as-armadilhas-que-não-dão-erro).

## Os exemplos

**Fundamentos**

| # | Exemplo | O que ensina | Diretivas centrais |
|---|---|---|---|
| 1 | [Primeiro Docker](1-first_docker/) | servir arquivo estático em container | `root` |
| 2 | [Load Balancer](2-loadbalancer_test/) | distribuir carga entre instâncias | `upstream`, `proxy_pass` |
| 3 | [Timeouts](3-timeouts/) | fazer o servidor desistir na hora certa | `proxy_read_timeout`, `client_header_timeout` |
| 4 | [HTTPS, TLS 1.3 e HTTP/2](4-HTTPS_TLS1-3_HTTP2/) | criptografia e protocolo moderno | `ssl_certificate`, `http2` |

**Aplicações e tempo real**

| # | Exemplo | O que ensina | Diretivas centrais |
|---|---|---|---|
| 5 | [WebSocket Proxy](5-websocket/) | atravessar o upgrade de protocolo | `proxy_set_header Upgrade` |
| 6 | [WebSocket + HTTP](6-websocket_and_http/) | HTTP e WebSocket no mesmo host | roteamento por `location` |
| 7 | [Monitoramento e Status](7-monitoring/) | métricas básicas em tempo real | `stub_status` |

**Arquitetura de produção**

| # | Exemplo | O que ensina | Diretivas centrais |
|---|---|---|---|
| 8 | [Multi-tier por empresa](8-multitier_roteamento_por_host/) | borda roteando por domínio para máquinas distintas | `server_name`, `map`, `resolver` |
| 9 | [Load Balancing Multi-Tenant](9-loadbalance_multitenant/) | silo dedicado vs pool compartilhado | `hash consistent`, `auth_request` |
| 13 | [LB Avançado e Failover](13-loadbalance_avancado/) | escolher algoritmo e sobreviver a falha | `least_conn`, `max_fails`, `backup` |
| 15 | [Canary e Blue-Green](15-canary_blue_green/) | subir versão nova sem derrubar ninguém | `split_clients` |

**Performance**

| # | Exemplo | O que ensina | Diretivas centrais |
|---|---|---|---|
| 10 | [Rate Limiting](10-rate_limiting/) | limitar tráfego sem punir usuário legítimo | `limit_req`, `burst`, `nodelay` |
| 11 | [Cache de Conteúdo](11-cache/) | responder sem tocar no backend — e sobreviver a ele | `proxy_cache`, `use_stale` |
| 12 | [Compressão, Estáticos e SPA](12-compressao_estaticos_spa/) | entregar frontend rápido sem quebrar no F5 | `gzip`, `try_files` |

**Segurança**

| # | Exemplo | O que ensina | Diretivas centrais |
|---|---|---|---|
| 14 | [Controle de Acesso](14-controle_acesso/) | IP, senha e certificado de cliente | `allow`/`deny`, `satisfy`, mTLS |
| 19 | [WAF com OWASP CRS](19-waf_modsecurity/) | bloquear ataque sem bloquear cliente | ModSecurity, paranoia, anomaly score |

**Observabilidade**

| # | Exemplo | O que ensina | Diretivas centrais |
|---|---|---|---|
| 16 | [Observabilidade Avançada](16-observabilidade/) | log estruturado e métricas no Prometheus | `log_format escape=json` |
| 21 | [OpenTelemetry](21-opentelemetry/) | responder "demorou **onde**?" | `otel_trace`, `traceparent` |

**Além do HTTP**

| # | Exemplo | O que ensina | Diretivas centrais |
|---|---|---|---|
| 17 | [Stream TCP e UDP](17-stream_tcp_udp/) | balancear o que não é HTTP | `stream`, `ssl_preread`, PROXY protocol |
| 18 | [HTTP/3 e QUIC](18-http3_quic/) | servir HTTP sobre UDP | `listen quic`, `Alt-Svc` |
| 20 | [njs](20-njs/) | lógica que `map` e `if` não alcançam | `js_set`, `js_content` |

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

Cada exemplo é autocontido, na sua própria pasta. **Cada pasta tem um `README.md`** com objetivo, passo a passo, testes e o que observar — os links da tabela acima levam direto a eles. O fluxo é sempre o mesmo:

```bash
cd 10-rate_limiting
docker compose up -d
# ... os testes descritos no README da pasta ...
docker compose down
```

**Rode um de cada vez.** A maioria publica em `8080`, e os exemplos 2, 4 e 8 usam as portas `80`/`443` — dois no ar ao mesmo tempo colidem. Se o `up` reclamar de porta ocupada, quase sempre é o exemplo anterior que ficou de pé:

```bash
docker ps                      # quem sobrou
docker compose down            # na pasta do exemplo anterior
```

**Antes de subir, alguns exemplos precisam de preparo** (o README de cada um detalha):

| Exemplo | Passo extra |
|---|---|
| 4 | `mkdir -p certs` + gerar certificado |
| 8, 17, 18 | `sh gerar-certs.sh` |
| 14 | `sh preparar.sh` (gera CA, certificados e senhas) |
| 21 | `docker compose up -d --build` (imagem própria, compila na primeira vez) |

Os certificados e arquivos de senha ficam fora do versionamento de propósito — são segredos, ainda que de brincadeira.

**Para ler a configuração**, comece pelo `nginx.conf` de cada pasta: os comentários explicam o porquê de cada diretiva, incluindo o que acontece quando ela está errada.

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
| `return 200` numa `location` com `auth_basic` | **o endpoint fica aberto** — `return` roda antes da fase de autenticação | [14](14-controle_acesso/) |
| chave de `limit_req` vinda de `auth_request_set` | **a cota deixa de existir** — a chave sai vazia e o NGINX ignora limites vazios | [9](9-loadbalance_multitenant/) |
| `if ($pool = "")` como proteção | **quebra o roteamento** — lê a variável cedo demais e congela o valor vazio | [9](9-loadbalance_multitenant/) |
| regex em `server_name` para um subdomínio | **nunca é alcançada** — wildcard vence regex, independente da ordem no arquivo | [8](8-multitier_roteamento_por_host/) |
| `proxy_pass` com variável, sem `resolver` | `nginx -t` passa e **todo request vira 502** em runtime | [8](8-multitier_roteamento_por_host/) |
| purge com `?renovar=1` no `proxy_cache_bypass` | **não purga nada** — a query faz parte da chave, grava em outra entrada | [11](11-cache/) |
| `expires` **e** `add_header Cache-Control` juntos | header **duplicado**, e o cliente escolhe qual obedecer | [12](12-compressao_estaticos_spa/) |
| `try_files ... /index.html` valendo para os assets | um `.js` ausente volta **HTML com status 200** | [12](12-compressao_estaticos_spa/) |
| duas `location` compartilhando um `upstream` | o estado "instância fora" é do upstream — **uma afeta a outra** | [13](13-loadbalance_avancado/) |
| `Alt-Svc` anunciando a porta interna | o navegador tenta HTTP/3 na porta errada e **fica em h2 calado** | [18](18-http3_quic/) |
| `trace_id` no log | pode **não existir no Jaeger** — a amostragem decide o envio, não o id | [21](21-opentelemetry/) |
| `real_ip` + `$proxy_add_x_forwarded_for` | o mesmo IP **repetido** na cadeia | [8](8-multitier_roteamento_por_host/) |
| trocar a chave de uma `limit_req_zone` e dar `reload` | **não tem efeito** — a zona sobrevive ao reload com a definição antiga | [9](9-loadbalance_multitenant/) |
| `ssl_stapling on` com certificado auto-assinado | **ignorado** — não há emissor para consultar | [4](4-HTTPS_TLS1-3_HTTP2/) |

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

Desenvolvido por Arthur Lunkes para aprender e praticar NGINX.
