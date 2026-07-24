# 13. Load Balancing Avançado e Failover

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

[← voltar ao índice](../README.md)
