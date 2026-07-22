// Emite um JWT de teste para o endpoint /api/, com o mesmo segredo do
// njs/principal.js.
const crypto = require("crypto");
const SEGREDO = "segredo-de-exemplo-nao-use-em-producao";
const b64url = (v) => Buffer.from(v).toString("base64")
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const tenant = process.argv[2] || "acme";
const agora = Math.floor(Date.now() / 1000);
const cabecalho = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const corpo = b64url(JSON.stringify({ tenant, iat: agora, exp: agora + 3600 }));
const assinatura = Buffer.from(
  crypto.createHmac("sha256", SEGREDO).update(`${cabecalho}.${corpo}`).digest()
).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

console.log(`${cabecalho}.${corpo}.${assinatura}`);
