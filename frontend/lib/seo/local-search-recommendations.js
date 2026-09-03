import { localSearchReadiness } from "./local-search-readiness";
import { topLocalSearchOpportunities } from "./local-search-opportunities";

export function localSearchRecommendations({ site, searchConsoleRows = [] }) {
  const readiness = localSearchReadiness(site);
  const opportunities = topLocalSearchOpportunities(searchConsoleRows, 5);
  const actions = [];

  if (!readiness.checks.city) actions.push({ priority: "P0", code: "CITY", action: "Renseigner la ville principale de l'agence." });
  if (!readiness.checks.nap) actions.push({ priority: "P0", code: "NAP", action: "Compléter les coordonnées locales réelles de l'agence." });
  if (!readiness.checks.noPrimaryCannibalisation) actions.push({ priority: "P0", code: "CANNIBALISATION", action: "Différencier l'intention principale des routes commerciales concurrentes." });

  for (const row of opportunities) {
    if (row.intent === "agency-local" && row.ctr === 0 && row.impressions >= 5) {
      actions.push({ priority: "P1", code: "LOCAL_CTR", query: row.query, action: "Revoir title, description et adéquation de la page cible sans créer de nouvelle page doorway." });
    }
  }

  return actions;
}
