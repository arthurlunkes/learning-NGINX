# 7. Monitoramento e Status

**Objetivo**: Monitorar o NGINX em tempo real usando o módulo `stub_status` com dashboard visual.

**Conceitos**:
- Módulo `stub_status` do NGINX
- Métricas de performance em tempo real
- Visualização de dados com JavaScript
- Polling e atualização automática
- Health checks

**Estrutura**:
```
7-monitoring/
├── docker-compose.yaml
├── nginx.conf          # stub_status configurado
└── html/
    └── index.html     # Dashboard interativo
```

#### Como executar:

```bash
cd 7-monitoring
docker compose up -d
```

**Acesse**: http://localhost:8080

#### Funcionalidades do Dashboard:

- **Conexões Ativas**: Monitoramento em tempo real
- **Métricas Acumuladas**: Total de conexões aceitas, processadas e requisições
- **Estados de Conexão**: Reading, Writing, Waiting
- **Requisições/Segundo**: Taxa calculada automaticamente
- **Gráfico em Tempo Real**: Histórico visual das conexões
- **Gerador de Carga**: Testar com 100 requisições simultâneas

#### Testar:

**1. Ver status bruto do NGINX:**

```bash
curl http://localhost:8080/nginx-status
```

**Saída exemplo:**
```
Active connections: 3
server accepts handled requests
 152 152 301
Reading: 0 Writing: 1 Waiting: 2
```

**2. Gerar carga com PowerShell:**

```powershell
# 100 requisições
1..100 | ForEach-Object { Invoke-WebRequest http://localhost:8080/health }

# Requisições contínuas
while($true) { Invoke-WebRequest http://localhost:8080; Start-Sleep -Milliseconds 100 }
```

**3. Gerar carga com Apache Bench:**

```bash
# 1000 requisições, 10 concorrentes
ab -n 1000 -c 10 http://localhost:8080/

# Requisições contínuas por 30 segundos
ab -t 30 -c 5 http://localhost:8080/
```

**4. Health check endpoint:**

```bash
curl http://localhost:8080/health
```

#### Parar:

```bash
docker compose down
```

**O que observar**:

**Métricas do stub_status**:
- **Active connections**: Total de conexões ativas no momento
- **accepts**: Total de conexões aceitas pelo servidor
- **handled**: Total de conexões processadas com sucesso
- **requests**: Total de requisições HTTP processadas
- **Reading**: Conexões lendo dados do cliente
- **Writing**: Conexões enviando dados para o cliente
- **Waiting**: Conexões keep-alive em espera

**No nginx.conf**:
```nginx
location /nginx-status {
    stub_status on;
    access_log off;
}
```

**Limitações do stub_status**:
- Métricas básicas apenas (sem detalhes por endpoint)
- Sem métricas de latência detalhadas
- Sem histórico persistente

**Para monitoramento avançado, considere**:
- **NGINX Plus**: stub_status estendido com mais métricas
- **Prometheus + nginx-exporter**: Métricas detalhadas e dashboards Grafana
- **ELK Stack**: Análise avançada de logs
- **Datadog/New Relic**: Soluções APM completas

---

[← voltar ao índice](../README.md)
