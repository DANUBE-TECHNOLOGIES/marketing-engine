#!/usr/bin/env bash

mse_certify_next() {
  local service="${1:-frontend}"
  local base_url="${2:-http://127.0.0.1:3000}"

  mse_section \
    "NEXT.JS ${service}"

  mse_wait_container \
    "${service}"

  mse_wait_next \
    "${service}"

  mse_wait_http \
    "${base_url}" \
    200 \
    120

  mse_collect_logs \
    "${service}"
}
