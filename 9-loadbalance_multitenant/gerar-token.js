// Emite os JWTs de teste. Um JWT e so isto: tres partes em base64url, onde a
// terceira e um HMAC das duas primeiras. Nenhuma biblioteca envolvida.
//
//   node gerar-token.js               -> todos os tenants de exemplo
//   node gerar-token.js acme globex   -> so os informados
const crypto = require("crypto");

const SEGREDO = process.env.JWT_SEGREDO || "segredo-de-exemplo-nao-use-em-producao";

const b64url = (v) =>
  Buffer.from(v).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function gerarToken(tenant) {
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const corpo = b64url(
    JSON.stringify({ tenant, sub: `usuario@${tenant}`, iat: agora, exp: agora + 86400 })
  );
  const assinatura = b64url(
    crypto.createHmac("sha256", SEGREDO).update(`${cabecalho}.${corpo}`).digest()
  );
  return `${cabecalho}.${corpo}.${assinatura}`;
}

const tenants = process.argv.slice(2);
const alvos = tenants.length ? tenants : ["acme", "globex", "initech", "umbrella"];

console.log("# Tokens validos por 24h. Cole no shell para exportar:\n");
for (const t of alvos) {
  console.log(`export TOKEN_${t.toUpperCase()}="${gerarToken(t)}"`);
}
console.log(`
# No PowerShell, use:  $env:TOKEN_ACME = "..."
#
# Para o teste de replay entre tenants, use um token de um tenant no
# subdominio de outro - o authsvc deve responder 403.`);
