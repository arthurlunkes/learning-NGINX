// Backend LENTO de proposito (500ms). O contador na resposta e o que denuncia
// o cache: se o numero nao muda entre duas requisicoes, a segunda nao chegou
// ate aqui.
const http = require("http");

const ATRASO_MS = 500;
let contador = 0;

http
  .createServer((req, res) => {
    // Nada de `new URL(req.url, ...)`: o NGINX pode legitimamente repassar
    // caminhos como "//" dependendo de como proxy_pass foi escrito, e o
    // construtor URL lanca excecao neles, derrubando o processo.
    const caminho = req.url.split("?")[0];
    const n = ++contador;

    const corpo =
      JSON.stringify({
        contador: n,
        gerado_em: new Date().toISOString(),
        caminho,
      }) + "\n";

    const headers = { "Content-Type": "application/json; charset=utf-8" };

    // O backend manda o NGINX nao guardar. Por padrao o NGINX obedece.
    if (caminho.startsWith("/privado")) {
      headers["Cache-Control"] = "no-store, private";
    }

    // Set-Cookie tambem impede o cache por padrao - e a causa mais comum de
    // "configurei proxy_cache e nada e cacheado".
    if (caminho.startsWith("/com-cookie")) {
      headers["Set-Cookie"] = "sessao=abc123; Path=/";
    }

    setTimeout(() => {
      res.writeHead(200, headers);
      res.end(corpo);
    }, ATRASO_MS);
  })
  .listen(3000, () => console.log(`backend lento (${ATRASO_MS}ms) na porta 3000`));
