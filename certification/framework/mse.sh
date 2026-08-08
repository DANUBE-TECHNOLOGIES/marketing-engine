#!/usr/bin/env bash

MSE_FRAMEWORK_DIR="$(
  cd \
    "$(dirname "${BASH_SOURCE[0]}")" \
    && pwd
)"

# shellcheck source=/dev/null
source "${MSE_FRAMEWORK_DIR}/core.sh"

# shellcheck source=/dev/null
source "${MSE_FRAMEWORK_DIR}/docker.sh"

# shellcheck source=/dev/null
source "${MSE_FRAMEWORK_DIR}/auth.sh"

# shellcheck source=/dev/null
source "${MSE_FRAMEWORK_DIR}/http.sh"

# shellcheck source=/dev/null
source "${MSE_FRAMEWORK_DIR}/assertions.sh"

# shellcheck source=/dev/null
source "${MSE_FRAMEWORK_DIR}/nextjs.sh"

# shellcheck source=/dev/null
source "${MSE_FRAMEWORK_DIR}/reports.sh"
