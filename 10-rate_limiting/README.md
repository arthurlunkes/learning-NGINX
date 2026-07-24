# 10. Rate Limiting e Proteção

**Objetivo**: Entender de verdade como o NGINX limita tráfego — e por que `rate=5r/s` não significa "cinco por segundo".

**Conceitos**: `limit_req_zone`, `burst`, `nodelay`, `delay=N`, `limit_conn`, `geo` + `map` para isenção, `limit_req_status`, `Retry-After`

**Estrutura**:
```
10-rate_limiting/
├── docker-compose.yaml
├── nginx.conf
├── snippets/proxy.conf
└── app/index.js      # backend que aceita ?ms=N para segurar a resposta
```

#### Como executar:

```bash
cd 10-rate_limiting
docker compose up -d
```

#### Testar:

O truque é mandar tudo de uma vez. O globbing do `curl` faz 12 requisições numa única conexão, rápido o suficiente para estourar o limite:

```bash
curl -s -o /dev/null -w '%{http_code}\n' "localhost:8080/estrito?i=[1-12]" | sort | uniq -c
```

Compare os cinco modos (espere ~4s entre eles para a cota renovar):

| endpoint | configuração | resultado medido | tempo total |
|---|---|---|---|
| `/sem-limite` | — | 12× 200 | 137ms |
| `/estrito` | `limit_req` puro | 1× 200, **11× 429** | 142ms |
| `/burst` | `burst=10` | 12× 200 | **2319ms** |
| `/burst-nodelay` | `burst=10 nodelay` | 11× 200, 1× 429 | **164ms** |
| `/burst-delay` | `burst=10 delay=5` | 12× 200 | 1334ms |

Limite de conexões simultâneas:

```bash
curl -sZ --parallel-immediate -o /dev/null -w '%{http_code}\n' \
  "localhost:8080/conexoes?ms=3000&i=[1-5]" | sort | uniq -c
# → 2x 200, 3x 429
```

#### Parar:

```bash
docker compose down
```

**O que observar**:

**A taxa é um intervalo, não uma cota.** `rate=5r/s` quer dizer "uma a cada 200ms". Mandar 5 juntas rejeita 4 — é o que a linha `/estrito` mostra. Por isso `limit_req` sozinho quase nunca serve: um navegador abre várias conexões de uma vez e tomaria 429 numa página normal.

**`burst` sozinho × `burst nodelay`** — este é o par que importa, e a diferença não aparece no código de status, aparece no **relógio**. Ambos deixam ~12 requisições passarem; um demora 2,3s e o outro 164ms. Sem `nodelay` a fila **atrasa** cada requisição para respeitar o ritmo; com `nodelay` todas passam na hora e a fila só drena para liberar espaço. Para APIs, `nodelay` quase sempre é o que se quer.

**Zona compartilhada soma o consumo.** Se três `location` usarem a mesma zona, o consumo de uma gasta a cota das outras. No exemplo cada modo tem a sua zona justamente para poderem ser testados isoladamente — mas em produção é assim que se faz uma cota global valendo para vários endpoints.

**Chave vazia desliga o limite.** É como a isenção por IP funciona aqui (`geo` → `map` → chave `""`). O mesmo mecanismo, por descuido, desliga a proteção inteira — veja o exemplo 9.

**Use 429, não o 503 padrão.** E mande `Retry-After`: sem ele, um cliente bem-comportado não tem como saber quando voltar e repete na hora.

---

[← voltar ao índice](../README.md)
