// Backend minimo para os testes de limite. Sem dependencias.
//
//   /            -> responde na hora
//   /lento?ms=N  -> segura a resposta por N ms (para testar limit_conn, que
//                   conta CONEXOES simultaneas, nao requisicoes)
const http = require("http");
const os = require("os");

let contador = 0;

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://local");
    const atraso = Math.min(Number(url.searchParams.get("ms") || 0), 10000);
    const n = ++contador;

    const responder = () => {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          servidor: os.hostname(),
          request: n,
          atraso_ms: atraso,
          caminho: url.pathname,
        }) + "\n"
      );
    };

    if (atraso > 0) setTimeout(responder, atraso);
    else responder();
  })
  .listen(3000, () => console.log("backend ouvindo na porta 3000"));
