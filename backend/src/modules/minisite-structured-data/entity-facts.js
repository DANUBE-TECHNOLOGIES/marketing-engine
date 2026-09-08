"use strict";

const {
  knowledgeFactFromThing,
} = require("./agency-knowledge");

function nodeTypes(node) {
  return Array.isArray(node?.["@type"])
    ? node["@type"]
    : node?.["@type"]
      ? [node["@type"]]
      : [];
}

function hasType(node, type) {
  return nodeTypes(node).includes(type);
}

function compact(value) {
  if (Array.isArray(value)) {
    const items = value.map(compact).filter((item) => item !== undefined);
    return items.length ? items : undefined;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, compact(item)])
      .filter(([, item]) => item !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  if (value === null || value === undefined || value === "") return undefined;
  return value;
}

function addressFact(address) {
  if (!address || typeof address !== "object") return undefined;
  return compact({
    streetAddress: address.streetAddress,
    postalCode: address.postalCode,
    locality: address.addressLocality,
    country: address.addressCountry,
  });
}

function areaServedFacts(value) {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  return items
    .map((item) => compact({ type: item?.["@type"] || "City", name: item?.name }))
    .filter(Boolean);
}

function agencyKnowledgeFacts(value) {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  return items.map(knowledgeFactFromThing).filter(Boolean);
}

function personFact(person) {
  return compact({
    id: person?.["@id"],
    type: "Person",
    name: person?.name,
    jobTitle: person?.jobTitle,
    description: person?.description,
    image: person?.image,
    worksFor: person?.worksFor?.["@id"],
    knowsAbout: Array.isArray(person?.knowsAbout)
      ? person.knowsAbout
      : person?.knowsAbout
        ? [person.knowsAbout]
        : [],
  });
}

function agencyFact(agency) {
  return compact({
    id: agency?.["@id"],
    type: "TravelAgency",
    additionalTypes: nodeTypes(agency).filter((type) => type !== "TravelAgency"),
    name: agency?.name,
    url: agency?.url,
    telephone: agency?.telephone,
    email: agency?.email,
    address: addressFact(agency?.address),
    image: agency?.image,
    logo: agency?.logo,
    description: agency?.description,
    areaServed: areaServedFacts(agency?.areaServed),
    parentOrganization: agency?.parentOrganization?.["@id"],
    openingHours: agency?.openingHoursSpecification,
    sameAs: agency?.sameAs,
    knowledge: agencyKnowledgeFacts(agency?.knowsAbout),
  });
}

function organizationFact(organization) {
  return compact({
    id: organization?.["@id"],
    type: "Organization",
    name: organization?.name,
    url: organization?.url,
  });
}

function buildEntityFacts(preview) {
  const graph = preview?.graph?.["@graph"] || [];
  const agency = graph.find((node) => hasType(node, "TravelAgency"));
  const organization = graph.find((node) => hasType(node, "Organization"));
  const people = graph.filter((node) => hasType(node, "Person"));

  if (!agency) {
    const error = new Error("TravelAgency canonique absente du graphe public.");
    error.code = "MINISITE_ENTITY_FACTS_AGENCY_MISSING";
    error.status = 409;
    throw error;
  }

  return compact({
    version: "1.1.0",
    siteSlug: preview?.siteSlug,
    agencyId: preview?.agencyId,
    agency: agencyFact(agency),
    organization: organizationFact(organization),
    people: people.map(personFact).filter(Boolean),
    provenance: {
      source: "canonical-structured-data-graph",
      graphVersion: preview?.version,
      factsOnly: true,
      inference: false,
      providerCall: false,
    },
  });
}

module.exports = {
  addressFact,
  agencyFact,
  agencyKnowledgeFacts,
  areaServedFacts,
  buildEntityFacts,
  compact,
  hasType,
  nodeTypes,
  organizationFact,
  personFact,
};
