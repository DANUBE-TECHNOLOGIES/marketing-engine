#!/usr/bin/env bash

mse_http_build_args() {
  local -n target_ref="$1"

  target_ref=()

  if mse_basic_auth_available
  then
    target_ref+=(
      --user
      "${MSE_BASIC_AUTH_USER}:${MSE_BASIC_AUTH_PASSWORD}"
    )
  fi
}

mse_http_code() {
  local url="$1"
  shift || true

  local auth_args=()

  mse_http_build_args \
    auth_args

  curl \
    --silent \
    --show-error \
    --output /dev/null \
    --write-out '%{http_code}' \
    --max-time "${MSE_HTTP_TIMEOUT}" \
    "${auth_args[@]}" \
    "$@" \
    "${url}" \
    2>/dev/null \
    || true
}

mse_wait_http() {
  local url="$1"
  local expected="${2:-200}"
  local timeout="${3:-${MSE_WAIT_TIMEOUT}}"

  shift 3 || true

  local start
  local now
  local code

  start="$(date +%s)"

  while true
  do
    code="$(
      mse_http_code \
        "${url}" \
        "$@"
    )"

    if [ "${code}" = "${expected}" ]; then
      mse_ok "HTTP ${expected} : ${url}"
      return 0
    fi

    now="$(date +%s)"

    if [ $((now - start)) -ge "${timeout}" ]; then
      mse_fail \
        "HTTP ${url} attendu=${expected} reçu=${code:-aucun}"

      return 1
    fi

    sleep 2
  done
}

mse_expect_http() {
  local url="$1"
  local expected="${2:-200}"

  shift 2 || true

  local code

  code="$(
    mse_http_code \
      "${url}" \
      "$@"
  )"

  if [ "${code}" != "${expected}" ]; then
    mse_fail \
      "HTTP ${url} attendu=${expected} reçu=${code:-aucun}"

    return 1
  fi

  mse_ok \
    "HTTP ${expected} : ${url}"
}

mse_fetch_json() {
  local url="$1"
  local output="$2"

  shift 2 || true

  mkdir -p \
    "$(dirname "${output}")"

  local auth_args=()
  local code

  mse_http_build_args \
    auth_args

  code="$(
    curl \
      --silent \
      --show-error \
      --output "${output}" \
      --write-out '%{http_code}' \
      --max-time "${MSE_HTTP_TIMEOUT}" \
      "${auth_args[@]}" \
      "$@" \
      "${url}" \
      || true
  )"

  if [ "${code}" -lt 200 ] || \
     [ "${code}" -ge 300 ]
  then
    mse_warn \
      "réponse HTTP ${code} pour ${url}"

    if [ -s "${output}" ]; then
      cat "${output}" >&2 || true
    fi

    return 1
  fi

  python3 -m json.tool \
    "${output}" \
    >/dev/null

  mse_ok \
    "JSON ${url} -> ${output}"
}
