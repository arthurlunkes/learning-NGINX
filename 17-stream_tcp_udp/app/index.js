// Backend HTTP identificavel. Fica atras do proxy TCP de propósito: como o
// NGINX na camada 4 nao entende HTTP, dá para testar o balanceamento de TCP
// com um simples `curl`.
const http = require("http");
const os = require("os");

const NOME = process.env.NOME || os.hostname();

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        servidor: NOME,
        // O IP que o backend enxerga. Sem proxy_protocol seria sempre o IP do
        // proxy; com ele, e o do cliente de verdade.
        cliente: req.socket.remoteAddress,
        caminho: req.url,
      }) + "\n"
    );
  })
  .listen(3000, () => console.log(`${NOME} HTTP na porta 3000`));
