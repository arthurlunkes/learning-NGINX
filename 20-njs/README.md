# 20. njs — JavaScript dentro do NGINX

**Objetivo**: Resolver o que `map` e `if` não alcançam. Fecha um ciclo com o exemplo 9, que precisou de um serviço externo para validar JWT porque `auth_jwt` é NGINX Plus.

**Conceitos**: `load_module`, `js_import`, `js_set`, `js_content`, HMAC em njs

**Estrutura**:
```
20-njs/
├── docker-compose.yaml
├── nginx.conf
├── njs/principal.js     # toda a lógica
└── gerar-token.js       # emite JWT de teste
```

> 💡 O módulo **já vem na imagem oficial** como biblioteca dinâmica (`ngx_http_js_module.so`) — basta `load_module`. Não precisa compilar nada.

Um container só: **não há backend**. Toda a lógica roda dentro do NGINX.

#### Como executar:

```bash
cd 20-njs
docker compose up -d
```

#### Testar:

```bash
# njs monta a resposta (js_content)
curl -s localhost:8080/saude

# Emite um link assinado e usa
curl -s "localhost:8080/assinar?caminho=/privado/relatorio.pdf&segundos=60"
curl -s "localhost:8080/privado/relatorio.pdf?expira=...&assinatura=..."

# JWT validado dentro do NGINX, sem serviço externo
TOKEN=$(node gerar-token.js acme)
curl -s -H "Authorization: Bearer $TOKEN" localhost:8080/api/pedidos
```

Medido:

| caso | resposta |
|---|---|
| link válido | 200 |
| sem assinatura | 403 — *faltam os parâmetros expira e assinatura* |
| assinatura adulterada | 403 — *assinatura inválida* |
| **outro arquivo, mesma assinatura** | **403** — o caminho entra no HMAC |
| link de 3s, após 5s | 403 — *link expirado ha 2s* |
| JWT válido | 200, `tenant: acme` |
| **payload forjado com `tenant=admin`** | **401** |

#### Parar:

```bash
docker compose down
```

**O que observar**:

**njs não é Node.js.** Não há npm, nem `require` de pacotes, nem event loop de aplicação — é um interpretador enxuto embutido no worker, com poucos módulos nativos (`crypto`, `querystring`, `fs`). Escrever esperando Node é a primeira frustração.

**Quando vale e quando não vale.** Vale quando a lógica exige cálculo, laço ou criptografia — `map` faz de/para e `if` faz comparação, nenhum dos dois calcula um HMAC. **Não** vale para de/para simples: `map` é mais rápido e mais legível. E o custo é CPU do worker: erro no script vira erro na requisição.

**O caminho tem que entrar na assinatura.** Sem isso, uma assinatura válida para um arquivo serviria para todos — testado: a mesma assinatura em `/privado/outro.pdf` dá 403.

**Confira a assinatura antes de ler o payload.** Um JWT forjado declarando `tenant=admin` foi recusado com 401 porque o HMAC é verificado primeiro. Ler o payload sem validar — erro comum, porque é a parte "fácil" — deixa qualquer um virar quem quiser.

**`js_set` é preguiçoso e cacheado**, exatamente como as variáveis de `map` do exemplo 9: a função roda quando a variável é lida pela primeira vez, e o resultado fica fixo para o resto da requisição.

**Comparado ao `secure_link`**, que já existe no NGINX: aquele módulo só faz MD5, tem formato fixo e responde 403 sem dizer por quê. Com njs dá para usar SHA-256 e informar se o problema foi expiração ou assinatura — o que muda tudo para quem está integrando.

---

[← voltar ao índice](../README.md)
