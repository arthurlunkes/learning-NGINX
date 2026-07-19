// Instancia versionada. A env VERSAO define o que a resposta declara ser.
const http = require("http");
const os = require("os");

const VERSAO = process.env.VERSAO || "v1";
const COR = process.env.COR || "azul";

http
  .createServer((req, res) => {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      // Devolver a versao tambem em header facilita inspecionar sem ler o corpo
      "X-Versao": VERSAO,
    });
    res.end(
      JSON.stringify({
        versao: VERSAO,
        cor: COR,
        instancia: os.hostname(),
        caminho: req.url.split("?")[0],
      }) + "\n"
    );
  })
  .listen(3000, () => console.log(`${VERSAO} (${COR}) em ${os.hostname()}:3000`));
