const { weightedSimilarity } = require("./similarity");
const { detectIntent, intentSimilarity } = require("./intent-matcher");

function classify(similarity, intentScore) {
  const duplicateRisk = Math.min(1, (similarity.score * 0.8) + (intentScore * 0.2));
  const cannibalizationRisk = Math.min(1, (similarity.score * 0.45) + (intentScore * 0.55));
  let recommendedAction = "create";
  if (duplicateRisk >= 0.82) recommendedAction = "merge";
  else if (cannibalizationRisk >= 0.72) recommendedAction = "update_existing";
  else if (cannibalizationRisk >= 0.55) recommendedAction = "differentiate";
  return {
    duplicateRisk: Number(duplicateRisk.toFixed(4)),
    cannibalizationRisk: Number(cannibalizationRisk.toFixed(4)),
    recommendedAction
  };
}

function analyzeAgainstCandidates(source, candidates = [], options = {}) {
  const duplicateThreshold = Number(options.duplicateThreshold ?? 0.65);
  const results = candidates
    .filter((candidate) => candidate && candidate.id !== source.id)
    .map((candidate) => {
      const similarity = weightedSimilarity(source, candidate);
      const intentScore = intentSimilarity(source, candidate);
      const classification = classify(similarity, intentScore);
      return {
        page: {
          id: candidate.id,
          siteId: candidate.siteId,
          title: candidate.title,
          slug: candidate.slug,
          path: candidate.path,
          status: candidate.status
        },
        similarity: similarity.score,
        components: similarity.components,
        intent: detectIntent(candidate),
        intentSimilarity: intentScore,
        ...classification
      };
    })
    .filter((item) => item.similarity >= duplicateThreshold || item.cannibalizationRisk >= duplicateThreshold)
    .sort((a, b) => b.cannibalizationRisk - a.cannibalizationRisk || b.similarity - a.similarity);

  const top = results[0] || null;
  return {
    sourceIntent: detectIntent(source),
    duplicateRisk: top ? top.duplicateRisk : 0,
    cannibalizationRisk: top ? top.cannibalizationRisk : 0,
    recommendedAction: top ? top.recommendedAction : "create",
    similarPages: results
  };
}

module.exports = { classify, analyzeAgainstCandidates };
