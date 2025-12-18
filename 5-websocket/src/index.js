const http = require("http");
const ws = require("ws");

const server = http.createServer();
const wss = new ws.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    wss.clients.forEach((client) => {
      client.send(message);
      console.log(`Client ${client.id} sent: ${message} to ${client.id}`);
    });
  });
});

server.listen(8080);

console.log("Server started on port 8080");
