import { LOCAL_SEARCH_CONTRACT_VERSION, LOCAL_SEARCH_BASELINE_DATE } from "./local-search-version";
import { localSearchNetworkSummary } from "./local-search-network-summary";

export function localSearchSnapshot(items = []) {
  return {
    contract: LOCAL_SEARCH_CONTRACT_VERSION,
    baselineDate: LOCAL_SEARCH_BASELINE_DATE,
    generatedAt: new Date().toISOString(),
    ...localSearchNetworkSummary(items),
  };
}
