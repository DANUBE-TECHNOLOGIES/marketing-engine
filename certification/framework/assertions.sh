#!/usr/bin/env bash

mse_assert_file() {
  local file="$1"

  if [ ! -s "${file}" ]; then
    mse_fail "fichier absent ou vide : ${file}"
    return 1
  fi

  mse_ok "fichier : ${file}"
}

mse_assert_contains() {
  local file="$1"
  local expected="$2"

  mse_assert_file "${file}"

  if ! grep -Fq \
    "${expected}" \
    "${file}"
  then
    mse_fail "'${expected}' absent de ${file}"
    return 1
  fi

  mse_ok "${file} contient '${expected}'"
}

mse_assert_not_contains() {
  local file="$1"
  local forbidden="$2"

  mse_assert_file "${file}"

  if grep -Fq \
    "${forbidden}" \
    "${file}"
  then
    mse_fail "'${forbidden}' présent dans ${file}"
    return 1
  fi

  mse_ok "${file} ne contient pas '${forbidden}'"
}

mse_assert_json() {
  local file="$1"
  local path="$2"
  local expected="$3"

  python3 - \
    "${file}" \
    "${path}" \
    "${expected}" <<'PY'
import json
import sys

file_path = sys.argv[1]
json_path = sys.argv[2]
expected_raw = sys.argv[3]

with open(file_path) as f:
    value = json.load(f)

current = value

for part in json_path.split("."):
    if isinstance(current, list):
        current = current[int(part)]
    elif isinstance(current, dict):
        if part not in current:
            raise SystemExit(
                f"ERREUR : chemin JSON absent : {json_path}"
            )
        current = current[part]
    else:
        raise SystemExit(
            f"ERREUR : chemin JSON invalide : {json_path}"
        )

def normalize_expected(raw):
    lowered = raw.lower()

    if lowered == "true":
        return True

    if lowered == "false":
        return False

    if lowered == "null":
        return None

    try:
        return int(raw)
    except ValueError:
        pass

    try:
        return float(raw)
    except ValueError:
        pass

    return raw

expected = normalize_expected(expected_raw)

if current != expected:
    raise SystemExit(
        f"ERREUR : {json_path} attendu={expected!r} reçu={current!r}"
    )

print(
    f"OK : {json_path} = {current!r}"
)
PY
}

mse_assert_json_exists() {
  local file="$1"
  local path="$2"

  python3 - \
    "${file}" \
    "${path}" <<'PY'
import json
import sys

file_path = sys.argv[1]
json_path = sys.argv[2]

with open(file_path) as f:
    current = json.load(f)

for part in json_path.split("."):
    if isinstance(current, list):
        current = current[int(part)]
    elif isinstance(current, dict):
        if part not in current:
            raise SystemExit(
                f"ERREUR : chemin JSON absent : {json_path}"
            )
        current = current[part]
    else:
        raise SystemExit(
            f"ERREUR : chemin JSON invalide : {json_path}"
        )

print(
    f"OK : chemin JSON présent : {json_path}"
)
PY
}
