# Copyright (C) 2019 Kagucho <kagucho.net@gmail.com>

FROM alpine:edge AS base
RUN apk add --no-cache --repository https://alpine.global.ssl.fastly.net/alpine/edge/testing/ npm vips

FROM base
RUN apk add --no-cache --repository https://alpine.global.ssl.fastly.net/alpine/edge/testing/ build-base python2 vips-dev
COPY miniverse-0.0.1.tgz /
RUN npm -g config set user root && npm -g install miniverse-0.0.1.tgz

FROM base
CMD ["/usr/lib/node_modules/miniverse/index.sh", "sh", "-c", "db-migrate up && exec sapper start"]
COPY --from=1 /usr/lib/node_modules/miniverse /usr/lib/node_modules/miniverse
