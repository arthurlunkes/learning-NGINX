# 11. Cache de Conteúdo

**Objetivo**: Colocar o NGINX na frente de um backend lento e, de quebra, manter o site no ar quando esse backend cair.

**Conceitos**: `proxy_cache_path`, `proxy_cache_key`, `$upstream_cache_status`, `proxy_cache_valid`, `proxy_cache_lock`, `proxy_cache_use_stale`, `proxy_cache_background_update`, `proxy_cache_bypass`, `proxy_no_cache`, `proxy_ignore_headers`

**Estrutura**:
```
11-cache/
├── docker-compose.yaml
├── nginx.conf
├── snippets/proxy.conf
└── app/index.js      # backend lento (500ms) com contador na resposta
```

O backend demora 500ms de propósito e devolve um contador. **Se o contador não muda entre duas requisições, a segunda nunca chegou até ele.**

#### Como executar:

```bash
cd 11-cache
docker compose up -d
```

#### Testar:

```bash
# X-Cache-Status conta o que aconteceu
curl -si localhost:8080/cache/ | grep -iE "x-cache-status|contador"
curl -si localhost:8080/cache/ | grep -iE "x-cache-status|contador"
```

Medido: `MISS` em **522ms** → `HIT` em **4ms**, com o contador congelado em 1.

**Sobreviver ao backend caindo** — o recurso mais valioso daqui:

```bash
curl -s localhost:8080/stale/          # popula (válido 5s)
docker compose stop app                # mata o backend
sleep 6                                # deixa o cache vencer

curl -si localhost:8080/stale/ | head -1   # → 200, X-Cache-Status: STALE
curl -si localhost:8080/cache/ | head -1   # → 504 (sem use_stale)
```

**Purge sem NGINX Plus**:

```bash
curl -s localhost:8080/purgavel/                        # HIT (valor velho)
curl -s -H "X-Purge-Cache: 1" localhost:8080/purgavel/  # BYPASS, regrava
curl -s localhost:8080/purgavel/                        # HIT (valor novo)
```

#### Parar:

```bash
docker compose down -v
```

**O que observar**:

**`STALE` vs `504`, no mesmo instante.** Com o backend morto e o cache vencido, `/stale/` responde **200** com conteúdo levemente velho e `/cache/` responde **504**. É a diferença entre "o site está um pouco desatualizado" e "o site caiu". Se você levar uma única linha deste exemplo para produção, leve `proxy_cache_use_stale`.

**A chave padrão não inclui cookies.** O padrão é `$scheme$proxy_host$request_uri` — nenhum cookie, nenhum header de autenticação. Cachear página que depende de login com a chave padrão entrega a página de um usuário para outro. O `/por-sessao` mostra a defesa: `proxy_cache_bypass` (não lê) **e** `proxy_no_cache` (não grava). Verificado: a requisição com sessão não poluiu o cache público, que continuou servindo o valor anônimo.

**"Configurei `proxy_cache` e nada é cacheado"** — quase sempre é um `Set-Cookie` ou um `Cache-Control` vindo do backend. `/privado` mostra o NGINX obedecendo; `/ignora-headers` mostra como sobrepor — com a ressalva de que ignorar `Set-Cookie` sem `proxy_hide_header` faz o cookie de um usuário vazar para os outros.

> ⚠️ **O gatilho do purge precisa ficar fora da chave do cache.** A tentação é usar `?renovar=1` com `proxy_cache_bypass $arg_renovar`. Não funciona: a query faz parte da chave, então `/purgavel/?renovar=1` é uma entrada **diferente** de `/purgavel/` — o bypass busca no backend e grava na entrada errada, deixando a original intacta e velha. Testado e confirmado. Por isso o gatilho aqui é um **header**, que não entra na chave.

**`inactive` ≠ `proxy_cache_valid`.** O primeiro remove o que ninguém pediu no período, mesmo que ainda esteja válido; o segundo define por quanto tempo a cópia é considerada fresca.

---

[← voltar ao índice](../README.md)
