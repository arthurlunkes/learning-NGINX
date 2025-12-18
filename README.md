# 🚀 Aprendendo NGINX

Projeto completo de aprendizado sobre NGINX com 6 exemplos práticos usando Docker, desde o básico até configurações avançadas de segurança e WebSockets.

## 📋 Índice

1. [Pré-requisitos](#-pré-requisitos)
2. [Projetos](#-projetos)
3. [Comandos Úteis](#-comandos-úteis)
4. [Conceitos Aprendidos](#-conceitos-aprendidos)
5. [Recursos](#-recursos-de-aprendizado)

---

## 🛠 Pré-requisitos

- **Docker** (v20.10+)
- **Docker Compose** (v2.0+)
- **OpenSSL** (para certificados SSL/TLS)
- **Node.js** (opcional, apenas para desenvolvimento local)

---

## 📦 Projetos

### 1. Primeiro Docker - Hello World

**🎯 Objetivo**: Aprender o básico de como servir conteúdo estático com NGINX em Docker.

**💡 Conceitos**:
- Dockerfile básico
- NGINX como servidor de arquivos estáticos
- Build e execução de containers Docker

**📁 Estrutura**:
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

**🔍 O que observar**:
- Como o Dockerfile copia arquivos para dentro do container
- Mapeamento de portas (`-p 9090:80`)
- Volume padrão do NGINX (`/usr/share/nginx/html`)

---

### 2. Load Balancer

**🎯 Objetivo**: Demonstrar balanceamento de carga entre múltiplas instâncias de uma aplicação.

**💡 Conceitos**:
- Load balancing (Round Robin)
- Upstream servers
- Health checks
- Docker Compose com múltiplos serviços

**📁 Estrutura**:
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
docker-compose up -d
```

**Acesse**: http://localhost

#### Testar load balancing:

```bash
# Windows PowerShell
1..10 | ForEach-Object { curl http://localhost }

# Linux/Mac
for i in {1..10}; do curl http://localhost; done
```

**✅ Resultado esperado**: As requisições são distribuídas entre `node1`, `node2` e `node3` de forma circular.

#### Parar:

```bash
docker-compose down
```

**🔍 O que observar**:
- Configuração `upstream` no nginx.conf
- Como o NGINX distribui o tráfego automaticamente
- Cada instância Node.js responde com seu hostname
- Rede Docker interna (`app-network`)

---

### 3. Timeouts

**🎯 Objetivo**: Configurar timeouts para gerenciar conexões de longa duração e evitar recursos presos.

**💡 Conceitos**:
- `proxy_connect_timeout`
- `proxy_send_timeout`
- `proxy_read_timeout`
- `client_body_timeout`
- Gerenciamento de recursos

**📁 Estrutura**:
```
3-timeouts/
├── docker-compose.yml
└── nginx.conf         # Timeouts configurados
```

#### Como executar:

```bash
cd 3-timeouts
docker-compose up -d
```

#### Testar:

```bash
curl http://localhost:8080
```

#### Parar:

```bash
docker-compose down
```

**🔍 O que observar**:
- Configurações de timeout no nginx.conf
- Como timeouts protegem contra conexões travadas
- Diferença entre timeouts de conexão, leitura e envio

---

### 4. HTTPS + TLS 1.3 + HTTP/2

**🎯 Objetivo**: Implementar HTTPS com protocolo TLS 1.3, HTTP/2 e headers de segurança modernos.

**💡 Conceitos**:
- Certificados SSL/TLS
- TLS 1.3 (protocolo mais seguro)
- HTTP/2 (multiplexação, compressão)
- HSTS (HTTP Strict Transport Security)
- Security headers
- Redirecionamento HTTP → HTTPS

**📁 Estrutura**:
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
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -subj "/C=BR/ST=SP/L=SaoPaulo/O=Learning/CN=localhost"
```

#### Passo 2: Executar

```bash
docker-compose up -d
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
docker-compose down
```

**🔍 O que observar**:
- Endpoint `/info` mostra protocolo, versão TLS e cipher
- Headers de segurança (HSTS, X-Frame-Options, etc.)
- Redirecionamento automático HTTP → HTTPS
- Configuração de ciphers seguros
- OCSP Stapling para validação de certificado

---

### 5. WebSocket Proxy

**🎯 Objetivo**: Configurar NGINX como proxy reverso para WebSockets.

**💡 Conceitos**:
- Upgrade de protocolo HTTP → WebSocket
- Headers `Upgrade` e `Connection`
- Proxy bidirecional
- Timeouts para conexões persistentes

**📁 Estrutura**:
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
docker-compose up -d
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
docker-compose down
```

**🔍 O que observar**:
- Headers específicos para WebSocket no nginx.conf:
  ```nginx
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  ```
- Timeouts longos (7 dias) para conexões WebSocket
- Servidor Node.js faz broadcast para todos os clientes conectados

---

### 6. WebSocket + HTTP

**🎯 Objetivo**: Combinar servidor HTTP estático e WebSocket na mesma aplicação através do NGINX.

**💡 Conceitos**:
- Roteamento por path (`/` para HTTP, `/ws` para WebSocket)
- Servir conteúdo estático e proxy dinâmico simultaneamente
- Interface web interativa com WebSocket

**📁 Estrutura**:
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
docker-compose up -d
```

**Acesse**: http://localhost:8080

#### Funcionalidades:

- ✅ Página HTML servida diretamente pelo NGINX
- ✅ WebSocket conectado automaticamente via rota `/ws`
- ✅ Chat em tempo real com interface visual
- ✅ Status de conexão em tempo real
- ✅ Reconexão automática se desconectar

#### Testar:

1. Abra http://localhost:8080 em múltiplas abas do navegador
2. Digite mensagens no chat
3. Veja as mensagens sendo transmitidas para todas as abas em tempo real
4. Abra DevTools → Network → WS para ver a conexão WebSocket

#### Parar:

```bash
docker-compose down
```

**🔍 O que observar**:
- Configuração de `location /` para arquivos estáticos
- Configuração de `location /ws` para proxy WebSocket
- Como o HTML usa `window.location.host` para conectar dinamicamente
- Reconexão automática implementada no JavaScript

---

### 7. Monitoramento e Status

**🎯 Objetivo**: Monitorar o NGINX em tempo real usando o módulo `stub_status` com dashboard visual.

**💡 Conceitos**:
- Módulo `stub_status` do NGINX
- Métricas de performance em tempo real
- Visualização de dados com JavaScript
- Polling e atualização automática
- Health checks

**📁 Estrutura**:
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
docker-compose up -d
```

**Acesse**: http://localhost:8080

#### Funcionalidades do Dashboard:

- ✅ **Conexões Ativas**: Monitoramento em tempo real
- ✅ **Métricas Acumuladas**: Total de conexões aceitas, processadas e requisições
- ✅ **Estados de Conexão**: Reading, Writing, Waiting
- ✅ **Requisições/Segundo**: Taxa calculada automaticamente
- ✅ **Gráfico em Tempo Real**: Histórico visual das conexões
- ✅ **Gerador de Carga**: Testar com 100 requisições simultâneas

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
docker-compose down
```

**🔍 O que observar**:

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

## 🛠 Comandos Úteis

### Ver logs do NGINX:

```bash
# Logs em tempo real
docker-compose logs -f nginx

# Últimas 100 linhas
docker-compose logs --tail=100 nginx
```

### Recarregar configuração do NGINX:

```bash
# Recarregar sem parar o servidor
docker-compose exec nginx nginx -s reload

# Parar graciosamente
docker-compose exec nginx nginx -s quit
```

### Testar configuração do NGINX:

```bash
# Validar nginx.conf antes de aplicar
docker-compose exec nginx nginx -t
```

### Listar containers em execução:

```bash
# Ver todos os containers do compose
docker-compose ps

# Ver todos os containers Docker
docker ps
```

### Inspecionar container:

```bash
# Entrar no container NGINX
docker-compose exec nginx sh

# Ver configuração ativa
docker-compose exec nginx cat /etc/nginx/nginx.conf
```

### Limpar tudo:

```bash
# Parar e remover containers, redes e volumes
docker-compose down -v

# Remover imagens não usadas
docker image prune -a
```

---

## 📚 Conceitos Aprendidos

Ao completar este projeto, você terá aprendido:

### Fundamentos
- ✅ Servidor web estático com NGINX
- ✅ Dockerização de aplicações web
- ✅ Docker Compose para orquestração multi-container
- ✅ Configuração básica do nginx.conf

### Intermediário
- ✅ Load balancing e distribuição de tráfego
- ✅ Upstream servers e health checks
- ✅ Proxy reverso (reverse proxy)
- ✅ Gestão de timeouts e recursos
- ✅ Roteamento por path

### Avançado
- ✅ Certificados SSL/TLS
- ✅ HTTPS com TLS 1.3
- ✅ HTTP/2 para melhor performance
- ✅ Headers de segurança (HSTS, CSP, etc.)
- ✅ WebSocket proxying
- ✅ Conexões bidirecionais persistentes
- ✅ Combinação de protocolos HTTP e WebSocket

### Monitoramento & Observabilidade
- ✅ stub_status module para métricas básicas
- ✅ Monitoramento em tempo real
- ✅ Visualização de métricas com dashboards
- ✅ Health checks e disponibilidade
- ✅ Log formats customizados

### DevOps
- ✅ Redes Docker personalizadas
- ✅ Volumes e bind mounts
- ✅ Logs e debugging
- ✅ Validação de configuração
- ✅ Recarregamento sem downtime

---

## 🔗 Recursos de Aprendizado

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
 (`limit_req_zone`)
2. **Caching** - Cache de conteúdo estático e dinâmico (`proxy_cache`)
3. **Gzip Compression** - Compressão de resposta para reduzir banda
4. **Access Control** - Restrição por IP, autenticação básica
5. **Logging Avançado** - Logs customizados, JSON logs, análise
6. **SSL/TLS Avançado** - Client certificates, OCSP, Certificate Pinning
7. **Microservices** - Roteamento complexo entre serviços, service mesh
8. **Kubernetes Ingress** - NGINX como Ingress Controller
9. **Prometheus Exporter** - Métricas avançadas com nginx-prometheus-exporter
10. **ModSecurity WAF** - Web Application Firewall integrado
2. **Caching** - Cache de conteúdo estático e dinâmico
3. **Gzip Compression** - Compressão de resposta
4. **Access Control** - Restrição por IP, autenticação básica
5. **Logging Avançado** - Logs customizados e análise
6. **SSL/TLS Avançado** - Client certificates, OCSP
7. **Microservices** - Roteamento complexo entre serviços
8. **Kubernetes Ingress** - NGINX como Ingress Controller

---

## 📄 Licença

Projeto para fins educacionais. Sinta-se livre para usar e modificar.

---

## 🤝 Contribuindo

Encontrou algum problema ou tem sugestões? Sinta-se livre para:
- Reportar issues
- Sugerir melhorias
- Adicionar novos exemplos

---

**Desenvolvido com 💚 por Arthur Lunkes para aprender NGINX**
