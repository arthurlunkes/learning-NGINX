// njs - JavaScript rodando DENTRO do NGINX.
//
// Nao e Node.js: nao ha npm, nem require de pacotes, nem event loop de
// aplicacao. E um interpretador enxuto embutido no worker, com acesso ao
// objeto da requisicao. Os modulos disponiveis sao poucos e nativos
// (crypto, querystring, fs...).
//
// Serve para o que `map` e `if` nao alcancam: qualquer coisa que precise de
// calculo, laco ou criptografia.

import crypto from "crypto";

const SEGREDO = "segredo-de-exemplo-nao-use-em-producao";

const b64url = (buf) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// ===========================================================================
// 1. URL ASSINADA (HMAC)
//
// O caso classico de njs. O NGINX open-source tem o modulo secure_link, mas
// ele so faz MD5 e tem formato fixo. Com njs da para usar SHA-256, escolher o
// que entra na assinatura e devolver o motivo exato da recusa.
//
// Formato:  /arquivo?expira=<epoch>&assinatura=<hmac>
// A assinatura cobre  "<caminho>:<expira>"  - o caminho entra de proposito,
// senao uma assinatura valida para um arquivo serviria para todos.
// ===========================================================================
function assinaturaEsperada(caminho, expira) {
  const hmac = crypto.createHmac("sha256", SEGREDO);
  hmac.update(`${caminho}:${expira}`);
  return b64url(hmac.digest());
}

// Usada por js_set. Devolve "" quando o link e valido, ou o motivo da recusa.
function validarLink(r) {
  const expira = r.args.expira;
  const assinatura = r.args.assinatura;

  if (!expira || !assinatura) return "faltam os parametros expira e assinatura";

  const agora = Math.floor(Date.now() / 1000);
  if (Number(expira) < agora) {
    return `link expirado ha ${agora - Number(expira)}s`;
  }

  const esperada = assinaturaEsperada(r.uri, expira);

  // Comparacao byte a byte de tamanho fixo. njs nao tem timingSafeEqual, mas
  // o laco abaixo nao encurta ao encontrar diferenca - evita vazar, pelo
  // tempo de resposta, quantos bytes o atacante ja acertou.
  if (assinatura.length !== esperada.length) return "assinatura invalida";
  let diferenca = 0;
  for (let i = 0; i < esperada.length; i++) {
    diferenca |= assinatura.charCodeAt(i) ^ esperada.charCodeAt(i);
  }
  return diferenca === 0 ? "" : "assinatura invalida";
}

// ===========================================================================
// 2. DECODIFICAR JWT DENTRO DO NGINX
//
// O exemplo 9 precisou de um servico externo (auth_request) para isto, porque
// a diretiva `auth_jwt` e exclusiva do NGINX Plus. Com njs, o tenant sai do
// token sem sair do processo - um salto de rede a menos por requisicao.
//
// A contrapartida: o custo passa a ser CPU do worker do NGINX. Token grande
// ou trafego alto pode fazer diferenca, e um erro no script derruba o
// processamento da requisicao.
// ===========================================================================
function tenantDoJwt(r) {
  const auth = r.headersIn["Authorization"] || "";
  if (!auth.startsWith("Bearer ")) return "";

  const partes = auth.slice(7).split(".");
  if (partes.length !== 3) return "";

  // Confere a assinatura antes de confiar no conteudo. Ler o payload sem
  // validar - erro comum - deixa qualquer um forjar o tenant que quiser.
  const hmac = crypto.createHmac("sha256", SEGREDO);
  hmac.update(`${partes[0]}.${partes[1]}`);
  if (b64url(hmac.digest()) !== partes[2]) return "";

  try {
    const payload = JSON.parse(
      Buffer.from(partes[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()
    );
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return "";
    return payload.tenant || "";
  } catch (e) {
    return "";
  }
}

// ===========================================================================
// 3. GERAR RESPOSTA DIRETO DO njs (js_content)
//
// O NGINX vira a aplicacao. Util para endpoints pequenos - health check que
// agrega informacao, transformacao de payload, mock durante desenvolvimento -
// sem subir um backend so para isso.
// ===========================================================================
function emitirLink(r) {
  const caminho = r.args.caminho || "/privado/relatorio.pdf";
  const segundos = Number(r.args.segundos || 60);
  const expira = Math.floor(Date.now() / 1000) + segundos;
  const assinatura = assinaturaEsperada(caminho, expira);

  r.headersOut["Content-Type"] = "application/json; charset=utf-8";
  r.return(
    200,
    JSON.stringify(
      {
        url: `${caminho}?expira=${expira}&assinatura=${assinatura}`,
        expira_em: `${segundos}s`,
        dica: "cole a url no navegador ou no curl antes de expirar",
      },
      null,
      2
    ) + "\n"
  );
}

// Health check que njs monta na hora, sem backend.
function saude(r) {
  r.headersOut["Content-Type"] = "application/json; charset=utf-8";
  r.return(
    200,
    JSON.stringify({
      status: "ok",
      versao_njs: njs.version,
      metodo: r.method,
      requisicao: r.variables.request_id,
    }) + "\n"
  );
}

export default { validarLink, tenantDoJwt, emitirLink, saude };
