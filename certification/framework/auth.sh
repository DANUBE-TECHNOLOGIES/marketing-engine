#!/usr/bin/env bash

##############################################################################
# Mondescale Certification Auth Layer
#
# Priorité :
#
# 1. MSE_BASIC_AUTH_USER / MSE_BASIC_AUTH_PASSWORD
# 2. variables connues déjà présentes dans l'environnement
#
# Aucun secret n'est affiché.
##############################################################################

mse_auth_first_set() {
  local name

  for name in "$@"
  do
    if [ -n "${!name:-}" ]; then
      printf '%s' "${!name}"
      return 0
    fi
  done

  return 1
}

mse_load_basic_auth() {
  if [ -n "${MSE_BASIC_AUTH_USER:-}" ] && \
     [ -n "${MSE_BASIC_AUTH_PASSWORD:-}" ]
  then
    export MSE_BASIC_AUTH_ENABLED=true
    return 0
  fi

  local user
  local password

  user="$(
    mse_auth_first_set \
      BASIC_AUTH_USER \
      BASIC_AUTH_USERNAME \
      AUTH_USER \
      AUTH_USERNAME \
      MONDESCALE_AUTH_USER \
      MONDESCALE_BASIC_AUTH_USER \
      2>/dev/null \
      || true
  )"

  password="$(
    mse_auth_first_set \
      BASIC_AUTH_PASSWORD \
      BASIC_AUTH_PASS \
      AUTH_PASSWORD \
      AUTH_PASS \
      MONDESCALE_AUTH_PASSWORD \
      MONDESCALE_BASIC_AUTH_PASSWORD \
      2>/dev/null \
      || true
  )"

  if [ -n "${user}" ] && \
     [ -n "${password}" ]
  then
    export MSE_BASIC_AUTH_USER="${user}"
    export MSE_BASIC_AUTH_PASSWORD="${password}"
    export MSE_BASIC_AUTH_ENABLED=true

    return 0
  fi

  export MSE_BASIC_AUTH_ENABLED=false

  return 1
}

mse_basic_auth_available() {
  [ "${MSE_BASIC_AUTH_ENABLED:-false}" = "true" ] && \
  [ -n "${MSE_BASIC_AUTH_USER:-}" ] && \
  [ -n "${MSE_BASIC_AUTH_PASSWORD:-}" ]
}

mse_http_auth_args() {
  if mse_basic_auth_available
  then
    printf '%s\n' \
      "--user" \
      "${MSE_BASIC_AUTH_USER}:${MSE_BASIC_AUTH_PASSWORD}"
  fi
}

mse_auth_status() {
  if mse_basic_auth_available
  then
    mse_ok "Basic Auth certification disponible"
  else
    mse_warn "Basic Auth certification non configurée"
  fi
}
