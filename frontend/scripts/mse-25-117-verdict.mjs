import { spawnSync } from "node:child_process";

const checks = [
  ["LOCAL_SEARCH_CONTRACT", ["node", "scripts/audit-local-search-contract.mjs"]],
  ["LOCAL_SEARCH_TESTS", ["node", "--test", "test/mse-25-117-local-search-performance.test.mjs", "test/mse-25-117-local-search-signals.test.mjs", "test/mse-25-117-local-search-audit-wiring.test.mjs", "test/mse-25-117-intent-map.test.mjs", "test/mse-25-117-readiness.test.mjs", "test/mse-25-117-search-console-baseline.test.mjs", "test/mse-25-117-performance-comparison.test.mjs", "test/mse-25-117-page-contract.test.mjs", "test/mse-25-117-scope-regression.test.mjs"]],
  ["INDEXATION", ["npm", "run", "test:indexation"]],
  ["INDEXATION_PERFORMANCE", ["npm", "run", "test:indexation:performance"]],
  ["LINT", ["npm", "run", "lint"]],
  ["BUILD", ["npm", "run", "build"]],
];

let failed = false;
for (const [name, command] of checks) {
  const result = spawnSync(command[0], command.slice(1), { stdio: "inherit", shell: false });
  const ok = result.status === 0;
  console.log(`${name}=${ok ? "OK" : "FAIL"}`);
  if (!ok) failed = true;
}

console.log(`MSE_25_117=${failed ? "FAIL" : "OK"}`);
process.exit(failed ? 1 : 0);
