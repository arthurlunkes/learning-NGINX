// Backend que CONTINUA o trace iniciado pelo NGINX.
//
// Sem isto, o trace no Jaeger teria um span so - o da borda - e a pergunta
// "demorou onde?" continuaria sem resposta. Aqui a aplicacao le o header
// `traceparent`, cria o proprio span como FILHO do span do NGINX e o envia ao
// coletor.
//
// Normalmente isso e trabalho do SDK do OpenTelemetry. Aqui esta escrito a mao,
// sem dependencia nenhuma, justamente para o formato ficar visivel: um span e
// so um JSON com ids, tempos e atributos.
const http = require("http");
const crypto = require("crypto");

const OTLP = process.env.OTLP_HTTP || "http://jaeger:4318/v1/traces";
const SERVICO = process.env.SERVICO || "app-pedidos";

const hex = (bytes) => crypto.randomBytes(bytes).toString("hex");

// traceparent: "00-<trace-id 32 hex>-<span-id 16 hex>-<flags 2 hex>"
// O trace-id e o fio que costura tudo; o span-id de quem chamou vira o PAI.
function lerTraceparent(valor) {
  if (!valor) return null;
  const p = valor.trim().split("-");
  if (p.length !== 4 || p[0] !== "00") return null;
  return { traceId: p[1], parentSpanId: p[2], amostrado: (parseInt(p[3], 16) & 1) === 1 };
}

async function enviarSpan(span) {
  const corpo = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: SERVICO } },
          ],
        },
        scopeSpans: [{ scope: { name: "manual" }, spans: [span] } ],
      },
    ],
  };

  try {
    await fetch(OTLP, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
  } catch (e) {
    // Falha no coletor NAO pode derrubar a requisicao do usuario. Tracing e
    // observabilidade, nao funcionalidade.
    console.error("falha ao enviar span:", e.message);
  }
}

http
  .createServer((req, res) => {
    const inicio = process.hrtime.bigint();
    const caminho = req.url.split("?")[0];
    const contexto = lerTraceparent(req.headers["traceparent"]);

    // Trabalho ficticio, com duracao variavel, para a arvore de spans ter
    // formas diferentes e o exemplo ficar util de olhar.
    const trabalho = caminho.startsWith("/pedidos") ? 120 + Math.random() * 250 : 20;

    setTimeout(async () => {
      const fim = process.hrtime.bigint();

      if (contexto && contexto.amostrado) {
        await enviarSpan({
          traceId: contexto.traceId,
          spanId: hex(8),
          parentSpanId: contexto.parentSpanId,
          name: `processar ${caminho}`,
          kind: 2, // SERVER
          startTimeUnixNano: String(inicio),
          endTimeUnixNano: String(fim),
          attributes: [
            { key: "http.method", value: { stringValue: req.method } },
            { key: "http.route", value: { stringValue: caminho } },
            { key: "app.trabalho_ms", value: { intValue: String(Math.round(trabalho)) } },
          ],
        });
      }

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          servico: SERVICO,
          caminho,
          trabalho_ms: Math.round(trabalho),
          traceparent_recebido: req.headers["traceparent"] || "(nenhum)",
          trace_id: contexto ? contexto.traceId : null,
        }) + "\n"
      );
    }, trabalho);
  })
  .listen(3000, () => console.log(`${SERVICO} na porta 3000, enviando spans para ${OTLP}`));
