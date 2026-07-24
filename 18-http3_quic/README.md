# 18. HTTP/3 e QUIC

**Objetivo**: Servir HTTP/3 de verdade — que não roda sobre TCP, e por isso muda coisas práticas na configuração.

**Conceitos**: `listen 443 quic`, `reuseport`, `Alt-Svc`, TLS 1.3 obrigatório, `$http3`, mapeamento de porta UDP

**Estrutura**:
```
18-http3_quic/
├── docker-compose.yaml
├── nginx.conf
├── gerar-certs.sh
├── certs/            # gerado localmente
└── html/index.html   # mostra o protocolo negociado
```

#### Passo 1: Gerar certificado

```bash
cd 18-http3_quic
sh gerar-certs.sh
```

QUIC exige TLS 1.3 — não existe versão "sem TLS" deste exemplo.

#### Passo 2: Executar

```bash
docker compose up -d
```

#### Testar:

O `curl` que vem no Windows é compilado com schannel e **não tem HTTP/3**. Use um container que tenha:

```bash
docker run --rm --add-host=host.docker.internal:host-gateway ymuski/curl-http3 \
  curl --http3 -sk https://host.docker.internal:8443/versao
```

Medido:

| cliente | resposta |
|---|---|
| `curl --http3` | `protocolo: HTTP/3.0` · `tls: TLSv1.3` · `http3: h3` |
| `curl --http2` | `protocolo: HTTP/2.0` · `http3:` *(vazio)* |

No navegador: https://localhost:8443 → DevTools → Network → coluna **Protocol**.

#### Parar:

```bash
docker compose down
```

**O que observar**:

**`quic` e `ssl` são sockets diferentes, apesar do mesmo número.** Um é UDP, o outro TCP. Manter os dois não é redundância — é o único jeito de atender quem ainda não fala HTTP/3. No compose, a porta 443 aparece **duas vezes**, e esquecer a linha `/udp` faz o HTTP/3 simplesmente não funcionar, sem erro visível: o cliente cai para HTTP/2 em silêncio.

> ⚠️ **O `Alt-Svc` anuncia a porta PÚBLICA, não a interna.** A primeira requisição de qualquer cliente é sempre por TCP — ele não tem como adivinhar que existe um servidor QUIC do outro lado. É esse header que anuncia o h3. Neste exemplo ele diz `h3=":8443"`, porque é assim que o compose publica o servidor; se dissesse `443` (a porta de dentro do container), o navegador tentaria QUIC na porta errada e continuaria em HTTP/2 — sem erro na tela e sem uma linha no log. Em produção os dois números coincidem e o problema não aparece.

**`reuseport` só pode aparecer uma vez** por combinação de endereço e porta em todo o arquivo. Repetir em outro `server{}` impede o NGINX de subir.

**O ganho do QUIC é o fim do head-of-line blocking.** No HTTP/2, um pacote perdido trava **todas** as streams multiplexadas na mesma conexão, porque o TCP entrega em ordem. No QUIC cada stream tem controle próprio, então a perda afeta só a dela. Em rede móvel, é a diferença que se sente.

---

[← voltar ao índice](../README.md)
