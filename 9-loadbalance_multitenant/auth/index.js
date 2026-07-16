// Servico de autenticacao chamado pelo `auth_request` do NGINX.
//
// Existe porque a diretiva `auth_jwt` (validar JWT dentro do proprio NGINX) e
// exclusiva do NGINX Plus. No NGINX open-source o caminho e este: delegar a
// validacao para um servico e devolver o resultado em um header.
//
// Contrato com o NGINX:
//   200 + X-Tenant-Id: <tenant>  -> segue o request, e o tenant escolhe o pool
//   401                          -> token ausente, malformado ou expirado
//   403                          -> token valido, mas de OUTRO tenant
const http = require("http");
const crypto = require("crypto");

const SEGREDO = process.env.JWT_SEGREDO || "segredo-de-exemplo-nao-use-em-producao";
const PORTA = Number(process.env.PORTA || 4000);

const b64urlDecode = (s) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");

function validarToken(token) {
  const partes = token.split(".");
  if (partes.length !== 3) return { erro: "formato invalido" };

  const [cabecalho, corpo, assinatura] = partes;

  // Assinatura conferida em tempo constante: comparar com === vazaria, pelo
  // tempo de resposta, quantos bytes iniciais o atacante ja acertou.
  const esperada = crypto
    .createHmac("sha256", SEGREDO)
    .update(`${cabecalho}.${corpo}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { erro: "assinatura invalida" };
  }

  let dados;
  try {
    dados = JSON.parse(b64urlDecode(corpo));
  } catch {
    return { erro: "payload ilegivel" };
  }

  if (dados.exp && dados.exp < Math.floor(Date.now() / 1000)) {
    return { erro: "token expirado" };
  }
  if (!dados.tenant) return { erro: "claim tenant ausente" };

  return { tenant: dados.tenant };
}

// <tenant>.nuvemsaas.com -> tenant
function tenantDoHost(host = "") {
  const m = /^([a-z0-9-]+)\.nuvemsaas\.com$/.exec(host.split(":")[0]);
  return m ? m[1] : null;
}

http
  .createServer((req, res) => {
    const autorizacao = req.headers["authorization"] || "";
    const token = autorizacao.startsWith("Bearer ") ? autorizacao.slice(7) : null;

    if (!token) {
      res.writeHead(401, { "X-Motivo": "sem token" });
      return res.end();
    }

    const resultado = validarToken(token);
    if (resultado.erro) {
      res.writeHead(401, { "X-Motivo": resultado.erro });
      return res.end();
    }

    // O NGINX manda o Host original aqui. Sem esta checagem, um token valido do
    // tenant A funcionaria no subdominio do tenant B - o classico replay entre
    // tenants, que e a falha de isolamento mais comum em SaaS multi-tenant.
    const doHost = tenantDoHost(req.headers["x-original-host"]);
    if (doHost && doHost !== resultado.tenant) {
      res.writeHead(403, { "X-Motivo": `token de '${resultado.tenant}' em '${doHost}'` });
      return res.end();
    }

    res.writeHead(200, { "X-Tenant-Id": resultado.tenant });
    res.end();
  })
  .listen(PORTA, () => console.log(`authsvc ouvindo na porta ${PORTA}`));
