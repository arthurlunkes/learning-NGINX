// Backend que sabe ser lento e sabe falhar, para os graficos terem o que
// mostrar. Sem dependencias.
//
//   /              rapido
//   /lento?ms=N    demora N ms
//   /erro?code=N   responde com o status N (default 500)
const http = require("http");
const os = require("os");

http
  .createServer((req, res) => {
    const caminho = req.url.split("?")[0];
    const q = new URLSearchParams(req.url.split("?")[1] || "");

    if (caminho === "/erro") {
      const code = Number(q.get("code") || 500);
      res.writeHead(code, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ erro: true, status: code }) + "\n");
    }

    const atraso = caminho === "/lento" ? Math.min(Number(q.get("ms") || 800), 15000) : 0;

    setTimeout(() => {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, instancia: os.hostname(), atraso_ms: atraso }) + "\n");
    }, atraso);
  })
  .listen(3000, () => console.log("backend na porta 3000"));
