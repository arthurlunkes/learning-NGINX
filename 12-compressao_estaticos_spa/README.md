# 12. Compressão, Estáticos e SPA

**Objetivo**: Servir um frontend rápido e que não quebre ao dar F5 numa rota interna. Só NGINX, sem backend nenhum.

**Conceitos**: `gzip`, `gzip_static`, `gzip_vary`, `sendfile`/`tcp_nopush`, `open_file_cache`, `try_files`, `Cache-Control: immutable`, `error_page` com `internal`

**Estrutura**:
```
12-compressao_estaticos_spa/
├── docker-compose.yaml
├── nginx.conf
└── html/
    ├── index.html          # shell da SPA
    ├── 404.html            # página de erro própria
    ├── 50x.html
    └── assets/
        ├── app.a1b2c3.js        # nome com hash
        ├── app.a1b2c3.js.gz     # pré-comprimido para gzip_static
        └── style.a1b2c3.css
```

#### Como executar:

```bash
cd 12-compressao_estaticos_spa
docker compose up -d
```

**Acesse**: http://localhost:8080

#### Testar:

```bash
# Compressão (arquivo original: 13938 bytes)
curl -sI localhost:8080/assets/app.a1b2c3.js | grep -i content-length
curl -sI -H "Accept-Encoding: gzip" localhost:8080/assets/app.a1b2c3.js \
  | grep -iE "content-length|content-encoding"
```

Medido: **13938 → 1944 bytes** (86% menor). O CSS cai de 1101 para 570 bytes.

```bash
# SPA: qualquer rota devolve o shell com 200
for r in / /painel /painel/relatorios/2026 /qualquer/coisa; do
  curl -s -o /dev/null -w "$r -> %{http_code}\n" "localhost:8080$r"
done

# ...mas asset inexistente devolve 404, e não o HTML
curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/assets/nao-existe.js
```

#### Parar:

```bash
docker compose down
```

**O que observar**:

**O fallback da SPA não pode valer para os assets.** Se `try_files ... /index.html` pegar tudo, um `.js` que não existe volta com o HTML da página e **status 200** — e o navegador tenta executar `<!DOCTYPE html>` como JavaScript, gerando o clássico `Unexpected token '<'`. Por isso `location /assets/` usa `try_files $uri =404`: erro de asset tem que ser 404 mesmo.

**`Cache-Control: immutable` só é seguro com hash no nome.** Ele diz ao navegador para não revalidar nem com F5. Em arquivo sem hash, prende o usuário numa versão antiga por um ano. E o shell (`index.html`) leva `no-cache` justamente por ser ele quem aponta para os nomes novos.

> ⚠️ **`expires` e `add_header Cache-Control` não se substituem, se somam.** Usar os dois na mesma `location` manda o header **duplicado** e deixa o cliente escolher qual obedecer — o `immutable` pode simplesmente ser ignorado. Confirmado nos headers durante a construção deste exemplo. Use um ou outro.

**`gzip_vary on` não é opcional.** Sem o `Vary: Accept-Encoding`, um cache intermediário guarda a versão comprimida e a entrega a um cliente que não sabe descomprimir.

**`gzip_static` dá `Content-Length`; a compressão em tempo real, não.** O arquivo `.gz` pronto tem tamanho conhecido; comprimir na hora obriga o NGINX a usar `Transfer-Encoding: chunked`. Comprimir uma vez no build também permite usar nível 9 sem custo em runtime.

**Não comprima o que já é comprimido.** JPEG, PNG, woff2 e zip não devem entrar em `gzip_types` — só gastam CPU. E `text/html` é sempre comprimido, não pode ser listado.

---

[← voltar ao índice](../README.md)
