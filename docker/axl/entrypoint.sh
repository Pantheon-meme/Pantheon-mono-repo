#!/usr/bin/env sh
set -eu

DATA_DIR="${AXL_DATA_DIR:-/data}"
PRIVATE_KEY_PATH="${AXL_PRIVATE_KEY_PATH:-${DATA_DIR}/private.pem}"
CONFIG_PATH="${AXL_CONFIG_PATH:-${DATA_DIR}/node-config.json}"
API_PORT="${AXL_API_PORT:-9002}"
BRIDGE_ADDR="${AXL_BRIDGE_ADDR:-0.0.0.0}"
TCP_PORT="${AXL_TCP_PORT:-7000}"
PEERS="${AXL_PEERS:-tls://34.46.48.224:9001,tls://136.111.135.206:9001}"
LISTEN="${AXL_LISTEN:-}"

mkdir -p "${DATA_DIR}"

if [ ! -f "${PRIVATE_KEY_PATH}" ]; then
  echo "[axl] generating persistent ed25519 identity at ${PRIVATE_KEY_PATH}"
  openssl genpkey -algorithm ed25519 -out "${PRIVATE_KEY_PATH}"
fi

json_array() {
  values="$1"
  if [ -z "${values}" ]; then
    printf '[]'
    return
  fi

  printf '['
  first=1
  old_ifs="${IFS}"
  IFS=','
  for value in ${values}; do
    trimmed="$(printf '%s' "${value}" | sed 's/^ *//;s/ *$//')"
    if [ -z "${trimmed}" ]; then
      continue
    fi
    if [ "${first}" -eq 0 ]; then
      printf ','
    fi
    first=0
    escaped="$(printf '%s' "${trimmed}" | sed 's/\\/\\\\/g; s/"/\\"/g')"
    printf '"%s"' "${escaped}"
  done
  IFS="${old_ifs}"
  printf ']'
}

cat > "${CONFIG_PATH}" <<EOF
{
  "PrivateKeyPath": "${PRIVATE_KEY_PATH}",
  "Peers": $(json_array "${PEERS}"),
  "Listen": $(json_array "${LISTEN}"),
  "api_port": ${API_PORT},
  "bridge_addr": "${BRIDGE_ADDR}",
  "tcp_port": ${TCP_PORT}
}
EOF

echo "[axl] starting node api=${BRIDGE_ADDR}:${API_PORT}"
exec axl-node -config "${CONFIG_PATH}" "$@"
