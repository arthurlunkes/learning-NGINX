// Backend que demora de proposito, para os timeouts de proxy terem o que
// estourar. Sem dependencias.
//
//   /            responde na hora
//   /lento?ms=N  segura a resposta por N ms
//   /gotejando   manda um pedaco por segundo, sem terminar (testa send/read)
const http = require("http");

http
  .createServer((req, res) => {
    const caminho = req.url.split("?")[0];
    const q = new URLSearchParams(req.url.split("?")[1] || "");

    if (caminho === "/gotejando") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      let n = 0;
      const timer = setInterval(() => {
        res.write(`pedaco ${++n}\n`);
        if (n >= 30) {
          clearInterval(timer);
          res.end();
        }
      }, 1000);
      req.on("close", () => clearInterval(timer));
      return;
    }

    const atraso = caminho === "/lento" ? Math.min(Number(q.get("ms") || 5000), 60000) : 0;

    setTimeout(() => {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, atraso_ms: atraso, caminho }) + "\n");
    }, atraso);
  })
  .listen(3000, () => console.log("backend lento na porta 3000"));
