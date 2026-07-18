// Instancia de backend identificavel. Sem dependencias.
//
// Envs:
//   NOME         nome que aparece na resposta
//   SEMPRE_ERRO  se "1", responde 500 em tudo (para testar proxy_next_upstream)
//
// Rotas:
//   /lento?ms=N  segura a resposta N ms (para o least_conn ter o que medir)
const http = require("http");

const NOME = process.env.NOME || "sem-nome";
const SEMPRE_ERRO = process.env.SEMPRE_ERRO === "1";

let atendidas = 0;

http
  .createServer((req, res) => {
    const caminho = req.url.split("?")[0];
    const query = new URLSearchParams(req.url.split("?")[1] || "");
    atendidas++;

    if (SEMPRE_ERRO) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ servidor: NOME, erro: "instancia quebrada" }) + "\n");
    }

    const atraso = Math.min(Number(query.get("ms") || 0), 15000);

    setTimeout(() => {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ servidor: NOME, atendidas, caminho }) + "\n");
    }, atraso);
  })
  .listen(3000, () => console.log(`${NOME} ouvindo na porta 3000 (erro=${SEMPRE_ERRO})`));
