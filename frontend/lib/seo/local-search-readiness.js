import { buildLocalSearchSignals, hasCompleteLocalNap } from "./local-search-signals";
import { buildLocalIntentMap, duplicatePrimaryQueries } from "./local-search-intent-map";

export function localSearchReadiness(site) {
  const home = buildLocalSearchSignals(site, "");
  const intentMap = buildLocalIntentMap(site);
  const duplicates = duplicatePrimaryQueries(site);
  const checks = {
    city: Boolean(home.primaryCity),
    nap: hasCompleteLocalNap(site),
    homeIntent: Boolean(intentMap.find((entry) => entry.route === "home")?.primaryQuery),
    commercialIntentMap: intentMap.filter((entry) => entry.primaryQuery).length >= 5,
    noPrimaryCannibalisation: duplicates.length === 0,
  };
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;

  return {
    ready: passed === total,
    score: Math.round((passed / total) * 100),
    checks,
    primaryCity: home.primaryCity,
    serviceAreas: home.serviceAreas,
    duplicates,
    intentMap,
  };
}
