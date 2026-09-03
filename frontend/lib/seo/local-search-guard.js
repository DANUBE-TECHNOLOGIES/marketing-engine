import { localSearchReadiness } from "./local-search-readiness";

export function localSearchGuard(site) {
  const readiness = localSearchReadiness(site);
  const warnings = [];
  if (!readiness.checks.city) warnings.push("missing-primary-city");
  if (!readiness.checks.nap) warnings.push("incomplete-local-nap");
  if (!readiness.checks.homeIntent) warnings.push("missing-home-local-intent");
  if (!readiness.checks.commercialIntentMap) warnings.push("insufficient-commercial-intent-coverage");
  if (!readiness.checks.noPrimaryCannibalisation) warnings.push("primary-query-cannibalisation");
  return { ok: warnings.length === 0, warnings, readiness };
}
