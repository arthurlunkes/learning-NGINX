# 21. OpenTelemetry — Tracing Distribuído

**Objetivo**: O exemplo 16 responde *"quanto tempo demorou?"*. Este responde **"demorou onde?"**.

**Conceitos**: `ngx_otel_module`, `otel_exporter`, `otel_trace`, `otel_span_attr`, W3C Trace Context (`traceparent`), amostragem, correlação log ↔ trace

**Estrutura**:
```
21-opentelemetry/
├── docker-compose.yaml
├── Dockerfile          # imagem própria: nginx + módulo otel
├── nginx.conf
├── snippets/proxy.conf
└── app/index.js        # backend que CONTINUA o trace, sem SDK
```

> ⚠️ **Este é o único exemplo com imagem própria, e o motivo importa.** O módulo de OpenTelemetry não vem na imagem oficial, e não adianta instalá-lo por cima: módulo dinâmico do NGINX é **travado por versão**. O repositório do nginx.org publica o `nginx-module-otel` compilado contra a 1.31.x, enquanto `nginx:latest` traz a 1.29.x — carregar um no outro falha com *"module is not binary compatible"*. Por isso o Dockerfile parte do Debian e instala NGINX e módulo do **mesmo** repositório, garantindo que as versões casem por construção.

#### Como executar:

```bash
cd 21-opentelemetry
docker compose up -d --build     # a primeira vez compila a imagem
```

| serviço | endereço |
|---|---|
| aplicação | http://localhost:8080 |
| **Jaeger (interface)** | **http://localhost:16686** |

#### Testar:

```bash
# Gera tráfego
for i in $(seq 1 12); do curl -s -o /dev/null -H "X-Tenant: acme" localhost:8080/pedidos/$i; done
for i in $(seq 1 30); do curl -s -o /dev/null localhost:8080/catalogo/$i; done

# O NGINX injeta o traceparent no backend?
curl -s localhost:8080/pedidos/1

# Descobrir o trace da própria requisição
curl -s localhost:8080/_trace

# Serviços registrados
curl -s localhost:16686/api/services
```

Abra o Jaeger, escolha o serviço `nginx-borda` e clique num trace.

#### Parar:

```bash
docker compose down
```

**O que observar**:

**A árvore precisa estar conectada — é isso que diferencia trace de log.** Verificado: **15 de 15** traces continham os dois serviços, com a estrutura correta:

```
[nginx-borda] GET /pedidos/5             261.0ms   RAIZ
[app-pedidos] processar /pedidos/5       255.0ms   filho do span acima
```

Os ~6ms de diferença são o overhead da borda. Essa subtração é a pergunta "demorou onde?" respondida — algo que nenhum log isolado entrega.

**A costura acontece pelo header `traceparent`** (padrão W3C), no formato `00-<trace-id>-<span-id>-<flags>`. O NGINX injeta, a aplicação lê, usa o `trace-id` como fio condutor e o `span-id` recebido como **pai** do próprio span. O `app/index.js` faz isso **sem SDK e sem dependência nenhuma** — de propósito, para o formato ficar visível: um span é só um JSON com ids, tempos e atributos.

**Amostragem: `otel_trace` aceita variável**, então o `split_clients` do exemplo 15 vira um amostrador. Medido: `/pedidos` com `otel_trace on` → **13 traces de 13 requisições**; `/catalogo` com amostragem de 10% → **2 traces de 30**.

> ⚠️ **O `trace_id` aparece no log mesmo quando a requisição NÃO foi amostrada.** O NGINX gera o identificador sempre; a amostragem decide apenas se o span será **enviado**. Na prática: você copia um `trace_id` de uma linha de log, cola no Jaeger e não acha nada — não porque o trace sumiu, mas porque nunca foi exportado. Verificado: das 30 requisições a `/catalogo`, **todas** com `trace_id` no log, só 2 existiam no Jaeger.

> 💡 **Ao testar, respeite o `interval` do exporter.** O envio é em lote; um trace consultado imediatamente após a requisição pode ainda não existir. Aconteceu durante a construção deste exemplo — o span aparecia depois de esperar os 2 segundos. Não é erro de configuração.

**Atributos de negócio são o que tornam o trace pesquisável.** Com `otel_span_attr http.tenant $http_x_tenant`, o span carrega `http.tenant = acme` e passa a ser possível perguntar *"me mostre os traces lentos do tenant X"*. Sem isso sobram spans genéricos, todos com o mesmo nome.

**O envio não entra no caminho da resposta** — é assíncrono e em lote, então o tracing não adiciona latência perceptível. E falha de coletor não pode derrubar requisição: no backend, o erro de envio é registrado e ignorado.

---

[← voltar ao índice](../README.md)
