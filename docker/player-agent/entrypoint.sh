#!/usr/bin/env sh
set -eu

AXL_ENABLED="$(printf '%s' "${PLAYER_AGENT_AXL_ENABLED:-true}" | tr '[:upper:]' '[:lower:]')"
AXL_URL="${AXL_BASE_URL:-http://axl:9002}"

if [ "${AXL_ENABLED}" = "1" ] || [ "${AXL_ENABLED}" = "true" ] || [ "${AXL_ENABLED}" = "yes" ] || [ "${AXL_ENABLED}" = "on" ]; then
  echo "[player-agent] waiting for AXL at ${AXL_URL}/topology"
  tries=0
  until node -e "fetch('${AXL_URL}/topology').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; do
    tries=$((tries + 1))
    if [ "${tries}" -ge "${AXL_WAIT_TRIES:-60}" ]; then
      echo "[player-agent] AXL did not become ready" >&2
      exit 1
    fi
    sleep 1
  done

  node -e "fetch('${AXL_URL}/topology').then((r)=>r.json()).then((j)=>console.log('[player-agent] AXL peer id=' + j.our_public_key)).catch(()=>{})"
fi

exec pnpm --filter player-agent play "$@"
