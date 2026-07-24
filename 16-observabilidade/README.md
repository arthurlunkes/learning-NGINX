# 16. Observabilidade Avançada

**Objetivo**: Sair do `stub_status` do exemplo 7 para o que se usa em escala — log estruturado que uma ferramenta consegue ler, e métricas indo para o Prometheus.

**Conceitos**: `log_format ... escape=json`, `access_log ... if=`, `$request_time` vs `$upstream_*_time`, `nginx-prometheus-exporter`, Prometheus, Grafana provisionado

**Estrutura**:
```
16-observabilidade/
├── docker-compose.yaml
├── nginx.conf
├── prometheus.yml
├── grafana/datasource.yml   # Grafana já sobe conectado ao Prometheus
├── logs/                    # bind mount, não versionado
└── app/index.js             # backend que sabe ser lento e falhar
```

#### Como executar:

```bash
cd 16-observabilidade
docker compose up -d
```

| serviço | endereço |
|---|---|
| aplicação | http://localhost:8080 |
| métricas do exporter | http://localhost:9113/metrics |
| Prometheus | http://localhost:9090 |
| Grafana (sem login) | http://localhost:3001 |

#### Testar:

```bash
# Gera tráfego variado
curl -s localhost:8080/ > /dev/null
curl -s "localhost:8080/lento?ms=900" > /dev/null
curl -s "localhost:8080/erro?code=503" > /dev/null
for i in $(seq 1 5); do curl -s localhost:8080/health > /dev/null; done

# O log é JSON válido, linha a linha?
node -e 'require("fs").readFileSync("logs/access.log","utf8").trim().split("\n").filter(Boolean).forEach(l=>JSON.parse(l)); console.log("todas válidas")'

# Métricas e raspagem
curl -s localhost:9113/metrics | grep '^nginx_'
curl -s "localhost:9090/api/v1/query?query=up"
```

#### Parar:

```bash
docker compose down
```

**O que observar**:

**`escape=json` não é opcional.** Sem ele, um `User-Agent` com aspas ou barra invertida quebra o JSON da linha e o coletor descarta o registro **em silêncio** — justamente os requests estranhos, que são os que interessam. Testado com o agente `Mozilla "com aspas" e \barra`: as 1744 linhas geradas saíram como JSON válido, com o valor corretamente escapado.

**Os quatro tempos são um diagnóstico, não quatro números iguais:**

| caminho | status | `t_request` | `t_upstream_header` | `t_upstream_response` |
|---|---|---|---|---|
| `/` | 200 | 0.002 | 0.003 | 0.003 |
| `/lento` | 200 | **0.903** | **0.904** | **0.904** |
| `/erro` | 503 | 0.001 | 0.001 | 0.001 |

- `upstream_connect` alto → problema de **rede ou saturação de conexões**
- `upstream_header` alto → o **backend está pensando demais**
- `request_time` **muito maior** que `upstream_response` → o backend foi rápido e o **cliente** é que é lento (rede ruim, celular, download grande). Culpar o backend nesse caso é o erro de diagnóstico mais comum.

**Logging condicional corta o ruído.** Health check a cada 5s vira ~500 mil linhas por mês que não dizem nada. Verificado: 5 requisições a `/health` produziram **zero** linhas no `access.log`, enquanto um `erros.log` separado recebeu exatamente os dois status de erro (503 e 404).

> ⚠️ **O exporter só entrega o que o `stub_status` tem: 7 números.** Métricas por endpoint, por upstream ou por status code são do **NGINX Plus**. No open-source, essa granularidade sai do **log**, não das métricas — é para isso que o log em JSON existe.

**Com retentativa, `$upstream_addr` e `$upstream_status` viram listas** separadas por vírgula (`"10.0.0.2:3000, 10.0.0.3:3000"`). Por isso vão como string no JSON, e não como número.

---

[← voltar ao índice](../README.md)
