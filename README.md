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

## 2. Load Balancer Test

Demonstração de load balancing com NGINX distribuindo tráfego entre múltiplas instâncias de uma aplicação Node.js.

### Executar:

```bash
cd 2-loadbalancer_test
docker-compose up -d
```

Acesse: http://localhost:8080

### Testar load balancing:

```bash
for i in {1..10}; do curl http://localhost:8080; done
```

### Parar:

```bash
docker-compose down
```

---

## 3. Timeouts

Exemplo de configuração de timeouts no NGINX para gerenciar conexões de longa duração.

### Executar:

```bash
cd 3-timeouts
docker-compose up -d
```

### Testar:

```bash
curl http://localhost:8080
```

### Parar:

```bash
docker-compose down
```

---

## 4. HTTPS com TLS 1.3 e HTTP/2

Exemplo de configuração HTTPS com TLS 1.3, HTTP/2 e headers de segurança modernos.

### Gerar certificados auto-assinados:

```bash
cd 4-HTTPS_TLS1-3_HTTP2
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -subj "/C=BR/ST=State/L=City/O=Organization/CN=localhost"
```

### Executar:

```bash
docker-compose up -d
```

### Testar:

- **Browser**: https://localhost (aceite o certificado auto-assinado)
- **Verificar HTTP/2**: DevTools → Network → Protocol (deve mostrar "h2")
- **Verificar TLS**:
  ```bash
  curl -Ik https://localhost/info
  openssl s_client -connect localhost:443 -tls1_3
  ```

### Parar:

```bash
docker-compose down
```

---

## 5. WebSocket

Exemplo de proxy WebSocket com NGINX.

### Executar:

```bash
cd 5-websocket
docker-compose up -d
```

### Testar:

Use um cliente WebSocket para conectar em `ws://localhost:8080`

### Parar:

```bash
docker-compose down
```

---

## 6. WebSocket + HTTP

Exemplo combinando servidor HTTP e WebSocket na mesma aplicação através do NGINX.

### Executar:

```bash
cd 6-websocket_and_http
docker-compose up -d
```

Acesse: http://localhost:8080

### Parar:

```bash
docker-compose down
```

---

## Comandos Úteis

### Ver logs do NGINX:

```bash
docker-compose logs -f nginx
```

### Recarregar configuração do NGINX:

```bash
docker-compose exec nginx nginx -s reload
```

### Testar configuração do NGINX:

```bash
docker-compose exec nginx nginx -t
```

### Listar containers em execução:

```bash
docker-compose ps
```

---

## Recursos de Aprendizado

- [Documentação oficial do NGINX](https://nginx.org/en/docs/)
- [NGINX Load Balancing](https://docs.nginx.com/nginx/admin-guide/load-balancer/)
- [NGINX WebSocket Proxying](https://nginx.org/en/docs/http/websocket.html)
- [NGINX SSL/TLS Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)

---

## Licença

Projeto para fins educacionais.
