FROM golang:1.25.5-bookworm AS builder

ARG AXL_REPO=https://github.com/gensyn-ai/axl.git
ARG AXL_REF=main

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git make \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN git clone --depth 1 --branch "${AXL_REF}" "${AXL_REPO}" axl
WORKDIR /src/axl
RUN make build

FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /src/axl/node /usr/local/bin/axl-node
COPY docker/axl/entrypoint.sh /usr/local/bin/pantheon-axl-entrypoint

RUN chmod +x /usr/local/bin/pantheon-axl-entrypoint

VOLUME ["/data"]
EXPOSE 9001 9002

ENTRYPOINT ["pantheon-axl-entrypoint"]
