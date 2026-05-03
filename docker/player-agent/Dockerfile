FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git make g++ python3 \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile --filter player-agent --filter @pantheon/assets

COPY docker/player-agent/entrypoint.sh /usr/local/bin/pantheon-player-agent-entrypoint
RUN chmod +x /usr/local/bin/pantheon-player-agent-entrypoint

WORKDIR /app/packages/player-agent

ENTRYPOINT ["pantheon-player-agent-entrypoint"]
