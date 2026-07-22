// Backend deliberadamente ingenuo: ecoa o que recebeu, sem validar nada.
// A ideia e justamente essa - mostrar o que chega ate a aplicacao quando o WAF
// esta no caminho e quando nao esta.
const http = require("http");

http
  .createServer((req, res) => {
    const [caminho, query] = req.url.split("?");
    let corpo = "";
    req.on("data", (c) => (corpo += c));
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify(
          {
            aviso: "o backend recebeu isto sem filtrar nada",
            metodo: req.method,
            caminho,
            query: query || "",
            corpo: corpo || "",
          },
          null,
          2
        ) + "\n"
      );
    });
  })
  .listen(3000, () => console.log("backend na porta 3000"));
