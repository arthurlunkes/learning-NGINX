// Aplicacao de tenant. A mesma imagem roda nos silos e no pool compartilhado -
// o que muda e a env POOL. Sem dependencias.
const http = require("http");
const os = require("os");

const POOL = process.env.POOL || "desconhecido";
const PORTA = Number(process.env.PORTA || 3000);

http
  .createServer((req, res) => {
    const corpo = {
      pool: POOL,
      replica: os.hostname(),
      // Quem o NGINX disse que e o tenant deste request (vem do claim do JWT)
      tenant_servido: req.headers["x-tenant"] || "(ausente)",
      host: req.headers["host"],
      caminho: req.url,
    };
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(corpo) + "\n");
  })
  .listen(PORTA, () => console.log(`[${POOL}] ${os.hostname()} ouvindo na porta ${PORTA}`));
