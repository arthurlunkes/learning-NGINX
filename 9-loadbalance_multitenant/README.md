# 9. Load Balancing Multi-Tenant (silo + pool compartilhado)

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

[← voltar ao índice](../README.md)
