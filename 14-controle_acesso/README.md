# 14. Controle de Acesso e Autenticação

**Objetivo**: Três camadas de proteção respondendo a perguntas diferentes — de onde veio, quem sabe a senha, quem tem a chave privada.

**Conceitos**: `allow`/`deny`, `geo`, `auth_basic`, `satisfy any|all`, mTLS (`ssl_client_certificate`, `ssl_verify_client`, `$ssl_client_verify`)

**Estrutura**:
```
14-controle_acesso/
├── docker-compose.yaml
├── nginx.conf
├── preparar.sh        # gera CA, certificados e htpasswd
├── certs/             # gerados localmente, não versionados
├── htpasswd           # idem
└── html/              # conteúdo de cada área protegida
```

#### Passo 1: Gerar certificados e senhas

```bash
cd 14-controle_acesso
sh preparar.sh
# usuários: admin/senha123 e leitor/leitura456
```

#### Passo 2: Executar

```bash
docker compose up -d
```

#### Testar:

O host aparece para o NGINX como o **gateway** da rede Docker, que a config nega de propósito — assim dá para ver os dois lados:

```bash
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/interno/
curl -s -o /dev/null -w '%{http_code}\n' -u admin:senha123 localhost:8080/admin/

# ...e de dentro da rede, onde a origem é um IP interno
docker compose exec cliente curl -s -o /dev/null -w '%{http_code}\n' http://nginx/interno/
```

Medido:

| rota | do host (gateway) | de dentro (172.31.0.2) |
|---|---|---|
| `/` público | 200 | 200 |
| `/interno/` | **403** | **200** |
| `/admin/` sem senha | 401 | — |
| `/admin/` com senha | 200 | — |
| `/ou/` sem senha | **401** | **200** (o IP já basta) |
| `/e/` sem senha | 403 | **401** (IP ok, falta senha) |
| `/e/` com senha | **403** | **200** |

mTLS (rode de dentro do container — veja a nota abaixo):

```bash
docker compose exec cliente sh -c '
  curl -s -o /dev/null -w "sem cert: %{http_code}\n" --cacert /certs/ca.crt https://nginx/mtls/
  curl -s -o /dev/null -w "com cert: %{http_code}\n" --cacert /certs/ca.crt \
       --cert /certs/cliente.crt --key /certs/cliente.key https://nginx/mtls/'
```

#### Parar:

```bash
docker compose down
```

**O que observar**:

> ⚠️ **`return` anula `auth_basic` e `allow`/`deny`.** Esta é a armadilha mais séria do repositório inteiro:
>
> ```nginx
> location /admin/ {
>     auth_basic "Admin";
>     auth_basic_user_file /etc/nginx/htpasswd;
>     return 200 "conteúdo secreto";   # ABERTO PARA QUALQUER UM
> }
> ```
>
> `return` roda na fase **rewrite**, que acontece **antes** da fase **access**, onde a autenticação atua. A resposta sai antes de a senha ser checada — e nada avisa: sobe limpo, `nginx -t` passa, e o endpoint devolve 200 para quem pedir. Foi exatamente o que aconteceu na primeira versão deste exemplo: as seis rotas "protegidas" respondiam 200 sem senha. Por isso o conteúdo protegido aqui é servido como **arquivo** (fase de conteúdo, posterior à access) — vale o mesmo para `proxy_pass`.

**`satisfy any` × `satisfy all`.** A tabela acima mostra a diferença numa linha: `/e/` recusa com **403 mesmo com a senha correta**, porque exige as duas condições; `/ou/` aceita só a senha.

**A ordem de `allow`/`deny` importa** — vale a primeira regra que casar. Por isso `deny 172.31.0.1` vem antes de `allow 172.31.0.0/16`; invertido, o `allow` casaria primeiro e o `deny` nunca seria alcançado.

**Os três desfechos do mTLS são distintos**: sem certificado → **403** (chega à `location`, `$ssl_client_verify=NONE`); certificado da CA correta → **200**, com o DN completo visível (`CN=cliente-autorizado,OU=Integracoes,…`); certificado de outra CA → **400**, e não 403 — com `optional` o NGINX recusa antes de a requisição chegar à `location`. Para tratar esse caso com mensagem própria seria preciso `optional_no_ca`.

> 💡 **No Windows, teste o mTLS de dentro do container.** O `curl` nativo usa schannel (TLS do Windows), que rejeita CA própria por não conseguir checar revogação e não aceita `--cert`/`--key` em PEM. O `curl` do container usa OpenSSL e funciona normalmente.

**Basic auth sem HTTPS é o mesmo que senha nenhuma** — base64 é codificação, não criptografia.

---

[← voltar ao índice](../README.md)
