// Servidor UDP de eco. UDP nao tem conexao: cada datagrama e independente, e
// e por isso que balancear UDP e um problema diferente de balancear TCP.
const dgram = require("dgram");

const NOME = process.env.NOME || "udp";
const socket = dgram.createSocket("udp4");

socket.on("message", (msg, remetente) => {
  const resposta = `[${NOME}] eco: ${msg.toString().trim()}`;
  socket.send(resposta, remetente.port, remetente.address);
  console.log(`${NOME} <- ${remetente.address}:${remetente.port} "${msg.toString().trim()}"`);
});

socket.bind(5353, () => console.log(`${NOME} UDP na porta 5353`));
