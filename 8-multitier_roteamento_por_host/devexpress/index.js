// Simula a maquina de impressao: UMA aplicacao DevExpress por porta,
// uma porta por municipio cliente. Sem dependencias - so o http nativo.
const http = require("http");
const os = require("os");

// Cada municipio tem sua propria instancia, na sua propria porta.
// Este mapa precisa bater com o `map $municipio $porta_devexpress` do nginx.conf.
const MUNICIPIOS = {
  8101: "saopaulo",
  8102: "campinas",
  8103: "santos",
};

for (const [porta, municipio] of Object.entries(MUNICIPIOS)) {
  http
    .createServer((req, res) => {
      const corpo = {
        servico: "DevExpress (simulado)",
        municipio,
        porta: Number(porta),
        container: os.hostname(),
        caminho: req.url,
        // Provam que o tier de impressao repassou o municipio corretamente
        host_recebido: req.headers.host,
        x_municipio: req.headers["x-municipio"] || "(ausente)",
      };
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(corpo, null, 2) + "\n");
    })
    .listen(Number(porta), () => {
      console.log(`DevExpress "${municipio}" ouvindo na porta ${porta}`);
    });
}
