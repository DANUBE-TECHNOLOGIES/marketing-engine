export const LOCAL_SEARCH_THRESHOLDS = Object.freeze({
  minimumLocalImpressionsForCtrAction: 5,
  minimumCommercialIntentCoverage: 5,
  targetReadinessScore: 100,
});

export function shouldReviewLocalCtr({ impressions = 0, ctr = 0, intent } = {}) {
  return (
    intent === "agency-local" &&
    Number(impressions) >= LOCAL_SEARCH_THRESHOLDS.minimumLocalImpressionsForCtrAction &&
    Number(ctr) === 0
  );
}
