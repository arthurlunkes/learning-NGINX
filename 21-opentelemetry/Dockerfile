# O modulo de OpenTelemetry NAO vem na imagem oficial do NGINX, e nao adianta
# instala-lo por cima dela: modulo dinamico do NGINX e travado por versao.
# O repositorio do nginx.org publica o `nginx-module-otel` compilado contra a
# versao mais recente (1.31.x), enquanto a imagem `nginx:latest` traz a 1.29.x -
# carregar um no outro falha com "module is not binary compatible".
#
# Por isso a imagem e montada a partir do Debian, instalando o NGINX e o modulo
# do MESMO repositorio: assim as versoes casam por construcao.
FROM debian:trixie-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl gnupg ca-certificates \
 && curl -fsSL https://nginx.org/keys/nginx_signing.key \
      | gpg --dearmor -o /usr/share/keyrings/nginx.gpg \
 && echo "deb [signed-by=/usr/share/keyrings/nginx.gpg] \
http://nginx.org/packages/mainline/debian trixie nginx" \
      > /etc/apt/sources.list.d/nginx.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends nginx nginx-module-otel \
 && apt-get purge -y gnupg \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/* \
 # Logs para stdout/stderr, como faz a imagem oficial
 && ln -sf /dev/stdout /var/log/nginx/access.log \
 && ln -sf /dev/stderr /var/log/nginx/error.log

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
