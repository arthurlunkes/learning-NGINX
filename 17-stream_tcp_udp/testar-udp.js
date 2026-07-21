// Cliente UDP de teste.
//
// Demonstra a diferenca que quase ninguem espera: o NGINX balanceia SESSOES
// UDP, nao datagramas. Uma "sessao" e identificada pelo par ip:porta do
// cliente - entao um cliente que reaproveita o mesmo socket fica preso no
// mesmo backend, por mais datagramas que envie.
//
//   node testar-udp.js        -> roda os dois cenarios
//   node testar-udp.js 20     -> com 20 datagramas cada
const dgram = require("dgram");

const TOTAL = Number(process.argv[2] || 8);
const PORTA = 9004; // 5353 no container; 9004 no host (mDNS costuma ocupar 5353)
const HOST = "127.0.0.1";

const quemRespondeu = (msg) => (msg.toString().match(/^\[([^\]]+)\]/) || [, "?"])[1];

function contar(lista) {
  const c = {};
  for (const q of lista) c[q] = (c[q] || 0) + 1;
  return c;
}

// Cenario A: UM socket para todos os datagramas.
function umSocket() {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    const respostas = [];
    socket.on("message", (msg) => {
      respostas.push(quemRespondeu(msg));
      if (respostas.length === TOTAL) {
        socket.close();
        resolve(respostas);
      }
    });
    for (let i = 1; i <= TOTAL; i++) socket.send(`mensagem ${i}`, PORTA, HOST);
    setTimeout(() => {
      try { socket.close(); } catch {}
      resolve(respostas);
    }, 4000);
  });
}

// Cenario B: um socket NOVO por datagrama - cada um vira uma sessao propria.
function variosSockets() {
  return new Promise((resolve) => {
    const respostas = [];
    let fechados = 0;
    for (let i = 1; i <= TOTAL; i++) {
      const socket = dgram.createSocket("udp4");
      socket.on("message", (msg) => {
        respostas.push(quemRespondeu(msg));
        socket.close();
        if (++fechados === TOTAL) resolve(respostas);
      });
      socket.send(`mensagem ${i}`, PORTA, HOST);
    }
    setTimeout(() => resolve(respostas), 4000);
  });
}

(async () => {
  console.log(`Enviando ${TOTAL} datagramas para ${HOST}:${PORTA}\n`);

  const a = await umSocket();
  console.log("  A) um socket para todos os datagramas");
  console.log("     ", JSON.stringify(contar(a)));
  console.log("      -> mesma sessao (mesmo ip:porta), entao mesmo backend\n");

  const b = await variosSockets();
  console.log("  B) um socket novo por datagrama");
  console.log("     ", JSON.stringify(contar(b)));
  console.log("      -> sessoes diferentes, entao o balanceamento aparece\n");

  console.log("  Licao: em UDP o NGINX balanceia SESSOES, nao datagramas.");
  console.log("  Um cliente de verdade (agente de metricas, resolver DNS) que");
  console.log("  mantem o socket aberto fica preso num backend so.");
  process.exit(0);
})();
