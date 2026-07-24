# 3. Timeouts

**Objetivo**: Configurar timeouts para gerenciar conexões de longa duração e evitar recursos presos.

**Conceitos**:
- `proxy_connect_timeout`
- `proxy_send_timeout`
- `proxy_read_timeout`
- `client_body_timeout`
- Gerenciamento de recursos

**Estrutura**:
```
3-timeouts/
├── docker-compose.yml
├── nginx.conf
├── snippets/proxy.conf
└── app/index.js       # backend que demora de propósito
```

#### Como executar:

```bash
cd 3-timeouts
docker compose up -d
```

#### Testar:

```bash
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' "localhost:8080/curto?ms=8000"
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' "localhost:8080/longo?ms=8000"
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' localhost:8080/inalcancavel
```

Medido:

| rota | limite | resultado |
|---|---|---|
| `/rapido` | — | 200 em 94ms |
| `/curto?ms=1000` | `proxy_read_timeout 3s` | 200 em 1078ms |
| `/curto?ms=8000` | `proxy_read_timeout 3s` | **504 em 3076ms** |
| `/longo?ms=8000` | `proxy_read_timeout 30s` | 200 em 8091ms |
| `/gotejando` | `proxy_read_timeout 3s` | **200 em 30124ms** |
| `/inalcancavel` | `proxy_connect_timeout 2s` | **504 em 2082ms** |

#### Parar:

```bash
docker compose down
```

**O que observar**:

> ⚠️ **`client_header_timeout` e `client_body_timeout` não valem dentro de `location`.** E faz sentido: quando o NGINX lê os headers, ele ainda não decidiu qual `location` vai atender. O detalhe é que isso **não** gera aviso — o NGINX se recusa a subir, com `"client_header_timeout" directive is not allowed here`. A primeira versão deste exemplo tinha exatamente esse erro e nunca chegou a rodar.

**A linha mais instrutiva da tabela é a do `/gotejando`**: 30 segundos de resposta com um `proxy_read_timeout` de 3s — e **não** estoura. O limite é o intervalo entre duas leituras, não a duração total. Um backend que responde devagar mas sem parar nunca dispara o timeout; um que fica calado por 3s, sim. Confundir os dois leva a aumentar o valor errado quando a produção começa a dar 504.

**Dois grupos que não se misturam:** `client_*` e `send_timeout` medem quem está do lado de fora; `proxy_*` medem o backend. Um upload lento estoura `client_body_timeout`; um banco travado estoura `proxy_read_timeout`.

**`client_header_timeout` é a defesa contra slowloris** — o ataque em que o cliente abre conexões e manda um byte de header por vez, prendendo workers sem nunca completar a requisição.

**Timeout só faz efeito onde há espera.** Se a `location` responde com `return`, nenhum `proxy_*_timeout` faz nada — não há upstream. Por isso este exemplo tem um backend de verdade.

---

[← voltar ao índice](../README.md)
