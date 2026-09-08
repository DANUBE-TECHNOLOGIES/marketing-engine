"use strict";

const { cleanText } = require("./utils");

const PUBLIC_RELATION_TYPES = new Set([
  "features",
  "recommends",
  "available_in",
]);

const PUBLIC_TARGET_TYPES = new Set([
  "destination",
  "country",
  "region",
  "city",
  "island",
  "travel_theme",
  "cruise",
  "circuit",
  "travel_product",
  "activity",
]);

function identifierValues(item) {
  return [
    {
      "@type": "PropertyValue",
      propertyID: "mondescale:knowledgeEntityId",
      value: cleanText(item?.target?.id),
    },
    {
      "@type": "PropertyValue",
      propertyID: "mondescale:knowledgeType",
      value: cleanText(item?.target?.type),
    },
    {
      "@type": "PropertyValue",
      propertyID: "mondescale:relationType",
      value: cleanText(item?.relationType),
    },
  ].filter((entry) => entry.value);
}

function publicAgencyKnowledgeRelations(site) {
  const agencyKnowledge = site?.agencyKnowledge;
  if (
    !agencyKnowledge ||
    agencyKnowledge.type !== "agency" ||
    agencyKnowledge.status !== "published"
  ) {
    return [];
  }

  const seen = new Set();
  const result = [];

  for (const relation of agencyKnowledge.outgoingRelations || []) {
    const relationType = cleanText(relation?.relationType);
    const target = relation?.target;
    const targetType = cleanText(target?.type);
    const targetId = cleanText(target?.id);
    const title = cleanText(target?.title);

    if (
      !PUBLIC_RELATION_TYPES.has(relationType) ||
      !target ||
      target.status !== "published" ||
      !PUBLIC_TARGET_TYPES.has(targetType) ||
      !targetId ||
      !title
    ) {
      continue;
    }

    const key = `${relationType}:${targetId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ relationType, target });
  }

  return result;
}

function buildAgencyKnowsAbout(site) {
  return publicAgencyKnowledgeRelations(site).map((item) => ({
    "@type": "Thing",
    name: cleanText(item.target.title),
    identifier: identifierValues(item),
  }));
}

function propertyValue(identifier, propertyID) {
  const values = Array.isArray(identifier) ? identifier : identifier ? [identifier] : [];
  return cleanText(
    values.find((item) => cleanText(item?.propertyID) === propertyID)?.value
  );
}

function knowledgeFactFromThing(thing) {
  const id = propertyValue(thing?.identifier, "mondescale:knowledgeEntityId");
  const type = propertyValue(thing?.identifier, "mondescale:knowledgeType");
  const relationType = propertyValue(thing?.identifier, "mondescale:relationType");
  const title = cleanText(thing?.name);

  if (!id || !type || !relationType || !title) return null;
  if (!PUBLIC_RELATION_TYPES.has(relationType) || !PUBLIC_TARGET_TYPES.has(type)) return null;

  return { id, type, relationType, title };
}

module.exports = {
  PUBLIC_RELATION_TYPES,
  PUBLIC_TARGET_TYPES,
  buildAgencyKnowsAbout,
  identifierValues,
  knowledgeFactFromThing,
  propertyValue,
  publicAgencyKnowledgeRelations,
};
