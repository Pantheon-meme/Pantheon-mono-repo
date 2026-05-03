#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker/player-agent/docker-compose.yml"
DEFAULT_ENV_FILE="${ROOT_DIR}/docker/player-agent/player-agent.env"
EXAMPLE_ENV_FILE="${ROOT_DIR}/docker/player-agent/player-agent.env.example"
ENV_FILE="${PANTHEON_PLAYER_AGENT_ENV:-${DEFAULT_ENV_FILE}}"
case "${ENV_FILE}" in
  /*) ;;
  *) ENV_FILE="${ROOT_DIR}/${ENV_FILE}" ;;
esac
ACTION="${1:-up}"

compose() {
  PANTHEON_PLAYER_AGENT_ENV="${ENV_FILE}" docker compose \
    --env-file "${ENV_FILE}" \
    -f "${COMPOSE_FILE}" \
    "$@"
}

ensure_env_file() {
  if [ -f "${ENV_FILE}" ]; then
    return
  fi

  mkdir -p "$(dirname "${ENV_FILE}")"
  cp "${EXAMPLE_ENV_FILE}" "${ENV_FILE}"
  cat >&2 <<EOF
Created ${ENV_FILE}

Edit it with your real MUD/INFT/private-key settings, then run:
  $0 up

EOF
  exit 1
}

case "${ACTION}" in
  init)
    if [ -f "${ENV_FILE}" ]; then
      echo "Env file already exists: ${ENV_FILE}"
    else
      mkdir -p "$(dirname "${ENV_FILE}")"
      cp "${EXAMPLE_ENV_FILE}" "${ENV_FILE}"
      echo "Created ${ENV_FILE}"
    fi
    ;;
  up)
    ensure_env_file
    shift || true
    compose up --build "$@"
    ;;
  start)
    ensure_env_file
    compose up --build -d
    ;;
  down)
    ensure_env_file
    compose down
    ;;
  logs)
    ensure_env_file
    shift || true
    compose logs -f "$@"
    ;;
  ps)
    ensure_env_file
    compose ps
    ;;
  peer-id)
    ensure_env_file
    port="${PANTHEON_AXL_HOST_PORT:-9002}"
    node -e "fetch('http://127.0.0.1:${port}/topology').then((r)=>r.json()).then((j)=>console.log(j.our_public_key)).catch((error)=>{ console.error(error.message); process.exit(1); })"
    ;;
  *)
    cat >&2 <<EOF
Usage: $0 <command>

Commands:
  init      Create docker/player-agent/player-agent.env from the example
  up        Build and run AXL + player-agent in the foreground
  start     Build and run AXL + player-agent in the background
  down      Stop and remove containers
  logs      Follow logs
  ps        Show compose status
  peer-id   Print this node's local AXL peer id

Set PANTHEON_PLAYER_AGENT_ENV=/path/to/env to use a custom env file.
EOF
    exit 2
    ;;
esac
