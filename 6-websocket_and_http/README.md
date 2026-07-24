# 6. WebSocket + HTTP

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

[← voltar ao índice](../README.md)
