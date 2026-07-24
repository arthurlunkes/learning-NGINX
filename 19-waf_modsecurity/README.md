# 19. WAF com ModSecurity e OWASP CRS

**Objetivo**: Colocar um firewall de aplicação na frente do backend e entender o que ele custa — porque WAF mal ajustado bloqueia usuário legítimo.

**Conceitos**: ModSecurity, OWASP Core Rule Set, níveis de paranoia, pontuação de anomalia, `DetectionOnly`, exceções cirúrgicas

**Estrutura**:
```
19-waf_modsecurity/
├── docker-compose.yaml
├── app/index.js            # backend ingênuo, não valida nada
├── regras/excecoes.conf    # exceções customizadas
└── sem-waf/nginx.conf      # proxy simples, para comparar
```

> ⚠️ A imagem `nginx` oficial **não tem ModSecurity** — seria preciso compilar o módulo. Este exemplo usa `owasp/modsecurity-crs:nginx`, que já vem com tudo e se configura só por variável de ambiente.

Três caminhos até o **mesmo** backend: **8080** bloqueando, **8081** só observando, **8082** sem WAF.

#### Como executar:

```bash
cd 19-waf_modsecurity
docker compose up -d

# Espere ficar "healthy" antes de testar: carregar as ~900 regras do CRS
# leva alguns segundos, e nesse intervalo o WAF deixa o ataque passar.
until [ "$(docker inspect --format '{{.State.Health.Status}}' waf-bloqueio)" = "healthy" ]; do sleep 3; done
```

> ⚠️ Testar cedo demais dá **falso negativo**: a SQL injection volta 200 e parece que o WAF não funciona. Aconteceu na varredura de verificação deste repositório — 20 segundos de espera não bastaram.

#### Testar:

```bash
curl -s -o /dev/null -w '%{http_code}\n' --get \
  --data-urlencode "q=1' OR '1'='1" localhost:8080/busca   # WAF
curl -s -o /dev/null -w '%{http_code}\n' --get \
  --data-urlencode "q=1' OR '1'='1" localhost:8082/busca   # sem WAF
```

Medido — a mesma requisição pelos três caminhos:

| ataque | 8080 bloqueio | 8081 detecção | 8082 sem WAF |
|---|---|---|---|
| requisição normal | 200 | 200 | 200 |
| SQL injection | **403** | 200 | 200 |
| SQL injection (UNION) | **403** | 200 | 200 |
| XSS | **403** | 200 | 200 |
| path traversal | **403** | 200 | 200 |
| command injection | **403** | 200 | 200 |
| Log4Shell | **403** | 200 | 200 |

#### Parar:

```bash
docker compose down
```

**O que observar**:

**O CRS não bloqueia na primeira regra que casa — ele soma pontos.** Cada regra tem uma severidade, e o bloqueio só acontece quando o total passa de `ANOMALY_INBOUND` (padrão 5). O payload de Log4Shell acionou **3 regras** e somou **score 20**:

```
[932130] sev=2  Remote Command Execution: Unix Shell Expression Found
[933135] sev=2  PHP Injection Attack: Variable Access Found
[944150] sev=2  Potential Remote Command Execution: Log4j / Log4shell
[949110] sev=0  Inbound Anomaly Score Exceeded (Total Score: 20)
```

**O falso positivo é o custo real de um WAF.** Não é hipotético — este comentário perfeitamente legítimo num fórum de desenvolvedores é bloqueado com 403:

> *"quero fazer UNION SELECT dos dados, alguem ajuda?"*

A saída errada é baixar a paranoia ou desligar o WAF: joga fora a proteção inteira por causa de uma rota. A saída certa é uma exceção cirúrgica com `ctl:ruleRemoveTargetByTag`, que remove um **alvo** específico em vez de desligar as regras. Verificado nas três dimensões:

| requisição | resultado |
|---|---|
| `/busca?q=<texto>` | **403** — exceção não vale aqui |
| `/comentario?texto=<texto>` | **200** — exceção vale |
| `/comentario?outro=<texto>` | **403** — outro parâmetro, exceção não vale |

**`DetectionOnly` é como se coloca um WAF em produção sem quebrar nada.** Roda dias registrando o que *bloquearia*, você ajusta as exceções olhando o log de auditoria, e só então liga o bloqueio. A coluna 8081 da tabela acima é exatamente isso: detectou tudo, deixou passar tudo.

**Suba a paranoia devagar.** De 1 a 4: quanto maior, mais regras entram — e mais falso positivo aparece. Ir direto para 4 costuma quebrar a aplicação.

---

[← voltar ao índice](../README.md)
