# 5. WebSocket Proxy

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

[← voltar ao índice](../README.md)
