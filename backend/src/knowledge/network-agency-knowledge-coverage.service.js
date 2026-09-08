const agencyKnowledgeService = require("./network-agency-knowledge.service");

function relationTypesForAgency(row, targetId) {
  return [...new Set(
    (row?.relations || [])
      .filter((relation) => String(relation?.target?.id || "") === String(targetId || ""))
      .map((relation) => String(relation?.relationType || "").trim())
      .filter(Boolean)
  )].sort();
}

function buildCoverage(matrix) {
  const agencies = matrix?.agencies || [];
  const targets = matrix?.targets || [];
  const agencyCount = agencies.length;

  const items = targets.map((target) => {
    const recommends = [];
    const features = [];
    const availableInOnly = [];
    const missing = [];
    const covered = [];

    for (const row of agencies) {
      const types = relationTypesForAgency(row, target.id);
      const agency = row.agency;
      const hasRecommends = types.includes("recommends");
      const hasFeatures = types.includes("features");
      const hasAvailableIn = types.includes("available_in");
      const hasPublicRelation = hasRecommends || hasFeatures || hasAvailableIn;

      if (hasRecommends) recommends.push(agency);
      if (hasFeatures) features.push(agency);
      if (hasAvailableIn && !hasRecommends && !hasFeatures) availableInOnly.push(agency);
      if (hasPublicRelation) covered.push(agency);
      else missing.push(agency);
    }

    const coverageRate = agencyCount
      ? Number(((covered.length / agencyCount) * 100).toFixed(1))
      : 0;

    return {
      target,
      agencyCount,
      coveredCount: covered.length,
      missingCount: missing.length,
      coverageRate,
      recommends,
      features,
      availableInOnly,
      covered,
      missing,
      missingAgencyKnowledgeIds: missing.map((agency) => agency.id),
    };
  });

  items.sort((a, b) => {
    if (a.coverageRate !== b.coverageRate) return a.coverageRate - b.coverageRate;
    return `${a.target.type}:${a.target.title}`.localeCompare(`${b.target.type}:${b.target.title}`, "fr");
  });

  return {
    mode: "read-only",
    writes: false,
    destructive: false,
    inference: false,
    providerCall: false,
    summary: {
      agencyCount,
      targetCount: targets.length,
      fullyCoveredTargetCount: items.filter((item) => agencyCount > 0 && item.coveredCount === agencyCount).length,
      uncoveredTargetCount: items.filter((item) => item.coveredCount === 0).length,
      targetWithGapsCount: items.filter((item) => item.missingCount > 0).length,
    },
    items,
  };
}

async function report({ matrixLoader = agencyKnowledgeService.matrix } = {}) {
  const matrix = await matrixLoader();
  return buildCoverage(matrix);
}

module.exports = {
  buildCoverage,
  relationTypesForAgency,
  report,
};
