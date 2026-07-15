// App de empresa: serve a API e o WebSocket na mesma porta.
// O mesmo arquivo roda nos 3 containers de empresa - o que muda e a env EMPRESA.
const http = require("http");
const os = require("os");
const { WebSocketServer } = require("ws");

const EMPRESA = process.env.EMPRESA || "desconhecida";
const PORTA = Number(process.env.PORTA || 3000);

// Headers que a borda e o tier injetam. Sao eles que revelam a cadeia de proxy.
const HEADERS_DE_PROXY = [
  "host",
  "x-real-ip",
  "x-forwarded-for",
  "x-forwarded-proto",
  "x-forwarded-host",
  "x-tier",
];

function responder(res, status, corpo) {
  const json = JSON.stringify(corpo, null, 2);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(json + "\n");
}

const server = http.createServer((req, res) => {
  const identidade = {
    empresa: EMPRESA,
    container: os.hostname(),
    caminho: req.url,
  };

  // /debug devolve TODOS os headers recebidos, para inspecionar a cadeia de proxy
  if (req.url === "/debug" || req.url.startsWith("/api/debug")) {
    return responder(res, 200, { ...identidade, headers: req.headers });
  }

  // Qualquer outra rota devolve so os headers de proxy, mais enxuto
  const proxy = {};
  for (const nome of HEADERS_DE_PROXY) {
    if (req.headers[nome] !== undefined) proxy[nome] = req.headers[nome];
  }
  responder(res, 200, { ...identidade, proxy });
});

// WebSocket na mesma porta: o upgrade precisa sobreviver a DOIS saltos de NGINX
const wss = new WebSocketServer({ server });

wss.on("connection", (socket, req) => {
  socket.send(
    `[${EMPRESA}/${os.hostname()}] conectado via Host="${req.headers.host}" ` +
      `x-forwarded-for="${req.headers["x-forwarded-for"] || "(ausente)"}"`
  );

  socket.on("message", (dados) => {
    socket.send(`[${EMPRESA}/${os.hostname()}] eco: ${dados}`);
  });
});

server.listen(PORTA, () => {
  console.log(`[${EMPRESA}] HTTP + WebSocket ouvindo na porta ${PORTA}`);
});
