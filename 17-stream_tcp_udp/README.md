# 17. Stream Module — TCP e UDP

**Objetivo**: Balancear o que não é HTTP. Todos os exemplos anteriores vivem no bloco `http`, onde o NGINX **lê** a requisição; aqui ele só move bytes.

**Conceitos**: bloco `stream`, LB de camada 4, PROXY protocol, `ssl_preread` para rotear por SNI sem descriptografar, balanceamento UDP

**Estrutura**:
```
17-stream_tcp_udp/
├── docker-compose.yaml
├── gerar-certs.sh
├── certs/                   # só os BACKENDS têm certificado
├── stream/nginx.conf        # o proxy de camada 4
├── web-pp/nginx.conf        # backend que lê PROXY protocol
├── tls-alfa/, tls-beta/     # backends TLS para o teste de SNI
├── app/index.js             # backend HTTP identificável
├── udp/index.js             # servidor UDP de eco
└── testar-udp.js            # cliente UDP de teste
```

| porta | o que faz |
|---|---|
| 9001 | LB TCP puro |
| 9002 | LB TCP com PROXY protocol |
| 9003 | roteamento por SNI (`ssl_preread`) |
| 9004 | LB UDP (→ 5353 no container) |

#### Como executar:

```bash
cd 17-stream_tcp_udp
sh gerar-certs.sh
docker compose up -d
```

#### Testar:

```bash
# 1. LB TCP — os backends falam HTTP, mas o NGINX aqui não sabe disso
for i in $(seq 1 8); do curl -s localhost:9001/; done

# 2. PROXY protocol — compare o IP que o backend enxerga
curl -s localhost:9001/     # cliente = IP do proxy
curl -s localhost:9002/     # cliente = IP real

# 3. Roteamento por SNI, sem descriptografar
curl -sk --resolve alfa.local:9003:127.0.0.1 https://alfa.local:9003/
curl -sk --resolve beta.local:9003:127.0.0.1 https://beta.local:9003/

# 4. LB UDP (mostra os dois cenários de sessão)
node testar-udp.js 10
```

#### Parar:

```bash
docker compose down
```

**O que observar**:

**O preço de não entender o protocolo.** Sem `http`, não há roteamento por caminho ou Host, nem cache, nem gzip, nem rewrite — e, principalmente, **nem `X-Forwarded-For`**: não existe header nenhum para acrescentar. Medido na porta 9001, o backend vê `172.33.0.9`, o IP do **proxy**.

**PROXY protocol resolve isso por fora.** Antes de repassar os bytes da aplicação, o proxy envia uma linha extra dizendo quem é o cliente. Na porta 9002, o mesmo backend passa a ver `172.33.0.1` — o cliente real.

> ⚠️ **Os dois lados precisam concordar.** Se o proxy manda a linha e o backend não a espera, ele recebe `PROXY TCP4 1.2.3.4 …` como se fosse o início da requisição e a conexão quebra com um erro que não explica nada. O inverso também falha. No destino é preciso `listen 80 proxy_protocol` + `set_real_ip_from` + `real_ip_header proxy_protocol` — e por isso essa porta não é exposta no compose: acessá-la direto, sem o proxy na frente, não funciona.

**`ssl_preread` roteia por domínio sem ter a chave privada.** Ele espia o ClientHello — que trafega em texto claro, por ser a primeira mensagem do handshake — lê o SNI e escolhe o backend. O tráfego segue criptografado de ponta a ponta. Confirmado: `alfa.local` e `beta.local` chegam a backends diferentes, e o container do proxy **não tem nenhum certificado** (`/etc/nginx/certs` sequer existe nele). Contraste direto com o exemplo 8, onde a borda termina o TLS e por isso precisa dos certificados de todos os domínios.

> ⚠️ **Em UDP, a unidade de balanceamento é a sessão, não o datagrama.** A sessão é identificada pelo par `ip:porta` do cliente, então quem reaproveita o mesmo socket fica preso no mesmo backend. Medido:
>
> | cenário | distribuição |
> |---|---|
> | 1 socket, 10 datagramas | **10 no mesmo backend** |
> | 10 sockets, 1 datagrama cada | 5 e 5 |
>
> Isso importa de verdade: agente de métricas, resolver DNS e cliente de syslog costumam abrir o socket uma vez e mantê-lo aberto — na prática, cada um conversa sempre com o mesmo backend.

**`proxy_responses`** diz quantos datagramas esperar de volta. Sem ele, o NGINX aguarda até o `proxy_timeout` segurando memória à toa; para protocolos que não respondem nada (syslog, statsd), use `0`.

> 💡 **A porta 5353 costuma estar ocupada** — é a do mDNS/Bonjour, sempre em uso no Windows. Por isso o host usa 9004 e o container mantém 5353.

---

[← voltar ao índice](../README.md)
