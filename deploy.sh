#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-${SCRIPT_DIR}/compose.prod.yml}"
ENV_FILE="${ENV_FILE:-${SCRIPT_DIR}/.env.deploy}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

IMAGE_TAG="${1:-${IMAGE_TAG:-latest}}"
export IMAGE_TAG

echo "[deploy] compose file: ${COMPOSE_FILE}"
echo "[deploy] image tag: ${IMAGE_TAG}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[deploy] docker command not found" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[deploy] docker compose plugin not found" >&2
  exit 1
fi

if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  echo "[deploy] logging in to ghcr.io as ${GHCR_USERNAME}"
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USERNAME}" --password-stdin
fi

docker compose -f "${COMPOSE_FILE}" pull
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans

echo "[deploy] service status"
docker compose -f "${COMPOSE_FILE}" ps
