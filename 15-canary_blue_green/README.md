# 15. Canary e Blue-Green

**Objetivo**: Colocar versão nova no ar de duas formas — uma fatia por vez (canary) ou tudo de uma vez com volta imediata (blue-green). Sem módulo nenhum.

**Conceitos**: `split_clients`, sticky por cookie, override por header, `map` para chavear ambiente, `nginx -s reload` sem downtime

**Estrutura**:
```
15-canary_blue_green/
├── docker-compose.yaml
├── nginx.conf
├── snippets/proxy.conf
└── app/index.js       # instância que declara sua VERSAO e COR
```

#### Como executar:

```bash
cd 15-canary_blue_green
docker compose up -d
```

#### Testar:

```bash
# Proporção do canário (sem sticky, cada requisição é um sorteio novo)
for i in $(seq 1 200); do curl -s localhost:8080/sem-sticky/; done \
  | grep -o '"versao":"[^"]*"' | sort | uniq -c
# → ~90% v1, ~10% v2

# Sticky: o mesmo cliente fica preso na versão sorteada
curl -s -c /tmp/jar -b /tmp/jar localhost:8080/ > /dev/null
for i in $(seq 1 15); do curl -s -b /tmp/jar localhost:8080/; done \
  | grep -o '"versao":"[^"]*"' | sort | uniq -c
# → 15 na mesma versão

# QA força a versão
curl -s -H "X-Versao: v2" localhost:8080/
```

**Virada blue-green** (troque `default v1` por `default v2` no `map $host $ambiente_ativo`):

```bash
# em um terminal, martelando durante a virada
while true; do curl -s -o /dev/null -w '%{http_code} ' localhost:8080/bluegreen/; done

# no outro
docker compose exec nginx nginx -s reload
```

Medido: **120 requisições durante o reload, todas 200**, e o tráfego passou de azul para verde sem uma única falha.

#### Parar:

```bash
docker compose down
```

**O que observar**:

**Sem sticky, o canary quebra o usuário.** Cada requisição vira um sorteio novo, então o visitante alterna entre v1 e v2 no meio da navegação — e como o frontend novo costuma falar com uma API nova, o resultado é um bug que só acontece "às vezes" e ninguém reproduz. Verificado: 20 clientes distintos, 10 requisições cada, **nenhum oscilou** entre versões; 3 dos 20 ficaram no canário.

**A cadeia de decisão é uma pilha de `map`**, e a ordem é o que dá o comportamento certo:

```
header X-Versao  →  cookie versao  →  split_clients  →  padrão
   (QA força)       (mantém a escolha)  (sorteia 10%)
```

Cada `map` usa o resultado do anterior como `default`. Confirmado: com cookie `v2` e header `X-Versao: v1`, vence o **header**.

**`split_clients` usa `$request_id`, não `$remote_addr`.** O `$request_id` é único por requisição — de propósito: o sorteio é sempre novo para quem ainda não tem cookie, e a estabilidade fica por conta do cookie. Chavear por IP prenderia todos os usuários atrás de um mesmo NAT na mesma versão, distorcendo a amostra do canário.

**O valor do blue-green está na volta.** Reverter é trocar uma linha e recarregar — mesma velocidade da ida. Em produção isso costuma virar um `include /etc/nginx/ambiente-ativo.conf` de uma linha só, para o deploy reescrever e recarregar sem tocar no `nginx.conf` principal.

**`add_header ... always`** no `Set-Cookie`: sem o `always`, o cookie não acompanha respostas de erro, e o usuário que pegasse um 500 sairia da versão sorteada.

---

[← voltar ao índice](../README.md)
