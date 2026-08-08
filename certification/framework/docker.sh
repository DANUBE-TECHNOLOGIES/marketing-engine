#!/usr/bin/env bash

mse_compose_service_exists() {
  local service="$1"
  local services

  # Ne pas utiliser une pipeline avec grep -q ici.
  #
  # Avec `set -o pipefail`, grep -q peut fermer le pipe dès
  # le premier match. Le processus docker compose amont peut
  # recevoir SIGPIPE et faire échouer la pipeline malgré un
  # match parfaitement valide.
  #
  # On capture donc d'abord complètement la sortie.

  services="$(
    docker compose config --services \
      2>/dev/null
  )" || return 1

  grep -Fx \
    "${service}" \
    <<< "${services}" \
    >/dev/null
}

mse_assert_compose_service() {
  local service="$1"

  if ! mse_compose_service_exists "${service}"; then
    mse_fail "service Docker Compose absent : ${service}"
    return 1
  fi

  mse_ok "service Compose : ${service}"
}

mse_container_id() {
  local service="$1"

  docker compose ps \
    -q \
    "${service}" \
    2>/dev/null \
    | head -n 1
}

mse_container_running() {
  local service="$1"
  local id

  id="$(mse_container_id "${service}")"

  if [ -z "${id}" ]; then
    return 1
  fi

  [ "$(
    docker inspect \
      -f '{{.State.Running}}' \
      "${id}" \
      2>/dev/null \
      || true
  )" = "true" ]
}

mse_wait_container() {
  local service="$1"
  local timeout="${2:-${MSE_WAIT_TIMEOUT}}"
  local start
  local now

  mse_assert_compose_service "${service}"

  start="$(date +%s)"

  while true
  do
    if mse_container_running "${service}"; then
      mse_ok "conteneur ${service} démarré"
      return 0
    fi

    now="$(date +%s)"

    if [ $((now - start)) -ge "${timeout}" ]; then
      mse_fail "timeout démarrage conteneur ${service}"
      docker compose ps "${service}" || true
      docker compose logs --tail=200 "${service}" || true
      return 1
    fi

    sleep 2
  done
}

mse_wait_log() {
  local service="$1"
  local pattern="$2"
  local timeout="${3:-${MSE_WAIT_TIMEOUT}}"
  local start
  local now

  mse_wait_container "${service}" "${timeout}"

  start="$(date +%s)"

  while true
  do
    if docker compose logs \
      --no-color \
      --tail=300 \
      "${service}" \
      2>/dev/null \
      | grep -Fq "${pattern}"
    then
      mse_ok "${service} : log détecté '${pattern}'"
      return 0
    fi

    now="$(date +%s)"

    if [ $((now - start)) -ge "${timeout}" ]; then
      mse_fail "${service} : log '${pattern}' non détecté"
      docker compose logs \
        --no-color \
        --tail=300 \
        "${service}" \
        || true
      return 1
    fi

    sleep 2
  done
}

mse_wait_next() {
  local service="${1:-frontend}"
  local timeout="${2:-${MSE_WAIT_TIMEOUT}}"

  mse_wait_log \
    "${service}" \
    "Ready in" \
    "${timeout}"
}

mse_collect_logs() {
  local service="$1"

  mkdir -p \
    "${MSE_REPORT_DIR}/logs"

  docker compose logs \
    --no-color \
    --timestamps \
    --tail=2000 \
    "${service}" \
    > "${MSE_REPORT_DIR}/logs/${service}.log" \
    2>&1 \
    || true
}

mse_collect_all_logs() {
  local service

  mkdir -p \
    "${MSE_REPORT_DIR}/logs"

  while IFS= read -r service
  do
    [ -n "${service}" ] || continue
    mse_collect_logs "${service}"
  done < <(
    docker compose config --services 2>/dev/null || true
  )
}
