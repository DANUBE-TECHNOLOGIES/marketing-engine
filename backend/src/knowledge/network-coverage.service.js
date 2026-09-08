const agencyKnowledgeService = require("./network-agency-knowledge.service");
const expertiseService = require("./network-expertise.service");

function sortByTitle(items = []) {
  return [...items].sort((a, b) =>
    String(a?.title || "").localeCompare(String(b?.title || ""), "fr")
  );
}

function coverageFromMatrices({ agencyMatrix, expertiseMatrix } = {}) {
  const agencyRows = agencyMatrix?.agencies || [];
  const peopleRows = expertiseMatrix?.people || [];

  const peopleByAgencyId = new Map();
  const peopleWithoutAgency = [];

  for (const row of peopleRows) {
    if (!row?.agency?.id) {
      peopleWithoutAgency.push({
        id: row?.person?.id || null,
        slug: row?.person?.slug || null,
        title: row?.person?.title || null,
        reason: row?.blockedReason || "published_agency_works_at_missing",
      });
      continue;
    }

    const key = String(row.agency.id);
    const items = peopleByAgencyId.get(key) || [];
    items.push(row);
    peopleByAgencyId.set(key, items);
  }

  const targetCoverage = new Map();
  const agencies = agencyRows.map((row) => {
    const relations = row?.relations || [];
    const publicFacts = relations.filter((relation) =>
      ["recommends", "features", "available_in"].includes(relation?.relationType)
    );
    const creatableFacts = publicFacts.filter((relation) =>
      ["recommends", "features"].includes(relation?.relationType)
    );

    for (const relation of publicFacts) {
      const target = relation?.target;
      if (!target?.id) continue;
      const key = String(target.id);
      const existing = targetCoverage.get(key) || {
        id: target.id,
        slug: target.slug || null,
        title: target.title || null,
        type: target.type || null,
        agencyIds: new Set(),
        relationTypes: new Set(),
      };
      existing.agencyIds.add(row.agency.id);
      existing.relationTypes.add(relation.relationType);
      targetCoverage.set(key, existing);
    }

    const people = peopleByAgencyId.get(String(row?.agency?.id)) || [];
    const peopleWithoutExpertise = people
      .filter((personRow) => !(personRow?.expertises || []).length)
      .map((personRow) => ({
        id: personRow.person.id,
        slug: personRow.person.slug,
        title: personRow.person.title,
      }));

    return {
      agency: row.agency,
      agencyKnowledgeFactCount: publicFacts.length,
      creatableAgencyKnowledgeFactCount: creatableFacts.length,
      personCount: people.length,
      explicitExpertiseCount: people.reduce(
        (sum, personRow) => sum + (personRow?.expertises || []).length,
        0
      ),
      peopleWithoutExpertise: sortByTitle(peopleWithoutExpertise),
      exceptions: [
        ...(creatableFacts.length ? [] : ["agency_recommends_or_features_missing"]),
        ...(peopleWithoutExpertise.length ? ["person_expertise_missing"] : []),
      ],
    };
  });

  const targets = sortByTitle(
    [...targetCoverage.values()].map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      type: item.type,
      agencyCount: item.agencyIds.size,
      relationTypes: [...item.relationTypes].sort(),
    }))
  );

  return {
    mode: "read-only",
    writes: false,
    destructive: false,
    inference: false,
    providerCall: false,
    summary: {
      agencyCount: agencies.length,
      agenciesWithoutAgencyKnowledge: agencies.filter((row) =>
        row.creatableAgencyKnowledgeFactCount === 0
      ).length,
      personCount: peopleRows.length,
      peopleWithoutExpertise: agencies.reduce(
        (sum, row) => sum + row.peopleWithoutExpertise.length,
        0
      ),
      peopleWithoutAgency: peopleWithoutAgency.length,
      coveredTargetCount: targets.length,
      explicitAgencyKnowledgeFactCount: agencies.reduce(
        (sum, row) => sum + row.agencyKnowledgeFactCount,
        0
      ),
      explicitExpertiseCount: agencies.reduce(
        (sum, row) => sum + row.explicitExpertiseCount,
        0
      ),
    },
    agencies,
    targets,
    peopleWithoutAgency: sortByTitle(peopleWithoutAgency),
  };
}

async function report({
  agencyMatrixLoader = agencyKnowledgeService.matrix,
  expertiseMatrixLoader = expertiseService.matrix,
} = {}) {
  const [agencyMatrix, expertiseMatrix] = await Promise.all([
    agencyMatrixLoader(),
    expertiseMatrixLoader(),
  ]);
  return coverageFromMatrices({ agencyMatrix, expertiseMatrix });
}

module.exports = { coverageFromMatrices, report };
