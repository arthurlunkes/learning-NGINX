# 2. Load Balancer

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

[← voltar ao índice](../README.md)
