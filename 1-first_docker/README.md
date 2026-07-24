# 1. Primeiro Docker - Hello World

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

[← voltar ao índice](../README.md)
