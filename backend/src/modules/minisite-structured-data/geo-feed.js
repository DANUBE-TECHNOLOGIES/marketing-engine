"use strict";

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

function compactAgency(node) {
  if (!node || !hasType(node, "TravelAgency")) return null;
  return {
    id: node["@id"] || null,
    name: node.name || null,
    url: node.url || null,
    telephone: node.telephone || null,
    email: node.email || null,
    address: node.address || null,
    areaServed: node.areaServed || [],
    openingHoursSpecification: node.openingHoursSpecification || [],
    sameAs: node.sameAs || [],
    parentOrganization: node.parentOrganization || null,
  };
}

function compactPerson(node) {
  if (!node || !hasType(node, "Person")) return null;
  return {
    id: node["@id"] || null,
    name: node.name || null,
    jobTitle: node.jobTitle || null,
    description: node.description || null,
    image: node.image || null,
    worksFor: node.worksFor || null,
    knowsAbout: node.knowsAbout || [],
  };
}

function compactOrganization(node) {
  if (!node || !hasType(node, "Organization")) return null;
  return {
    id: node["@id"] || null,
    name: node.name || null,
    url: node.url || null,
  };
}

function projectGeoItem(item) {
  const graph = item?.graph?.["@graph"] || [];
  const agency = compactAgency(graph.find((node) => hasType(node, "TravelAgency")));
  const organization = compactOrganization(graph.find((node) => hasType(node, "Organization")));
  const people = graph.map(compactPerson).filter(Boolean);

  return {
    version: "mse-geo-feed-v1",
    siteSlug: item?.siteSlug || null,
    agencyId: item?.agencyId || null,
    agencyName: item?.agencyName || agency?.name || null,
    canonicalUrl: agency?.url || null,
    organization,
    agency,
    people,
    validation: {
      valid: item?.validation?.valid === true,
      issueCount: item?.validation?.issues?.length || 0,
    },
  };
}

function projectGeoSite(preview) {
  return projectGeoItem({
    siteSlug: preview?.siteSlug,
    agencyId: preview?.agencyId,
    agencyName: preview?.agencyName,
    validation: preview?.validation,
    graph: preview?.graph,
  });
}

function projectGeoNetwork(plan) {
  const agencies = (plan?.items || [])
    .map(projectGeoItem)
    .filter((item) => item.agency && item.validation.valid)
    .sort((a, b) => String(a.siteSlug || "").localeCompare(String(b.siteSlug || "")));

  const organization = agencies.find((item) => item.organization)?.organization || null;

  return {
    version: "mse-geo-feed-v1",
    generatedFrom: "minisite-structured-data",
    publicOrigin: plan?.publicOrigin || null,
    organization,
    summary: {
      agencyCount: agencies.length,
      personCount: agencies.reduce((total, item) => total + item.people.length, 0),
    },
    agencies: agencies.map((item) => ({
      siteSlug: item.siteSlug,
      agencyId: item.agencyId,
      agencyName: item.agencyName,
      canonicalUrl: item.canonicalUrl,
      geoFeedUrl: item.canonicalUrl ? `${item.canonicalUrl}/geo.json` : null,
      areaServed: item.agency?.areaServed || [],
      people: item.people.map((person) => ({
        id: person.id,
        name: person.name,
        jobTitle: person.jobTitle,
        knowsAbout: person.knowsAbout,
      })),
    })),
  };
}

module.exports = {
  compactAgency,
  compactOrganization,
  compactPerson,
  hasType,
  nodeTypes,
  projectGeoItem,
  projectGeoNetwork,
  projectGeoSite,
};
