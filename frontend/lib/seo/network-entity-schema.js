import { buildTravelAgencySchema } from "./json-ld";
import { absoluteUrl } from "./site-url";

export function mondescaleNetworkReference() {
  const url = absoluteUrl("/");
  return {
    "@type": "Organization",
    "@id": `${url}#mondescale-network`,
    name: "Mondescale Voyages",
    url,
  };
}

export function buildMondescaleNetworkSchema() {
  return {
    "@context": "https://schema.org",
    ...mondescaleNetworkReference(),
  };
}

export function buildNetworkAwareTravelAgencySchema(site) {
  const agency = buildTravelAgencySchema(site);
  return {
    ...agency,
    memberOf: mondescaleNetworkReference(),
  };
}
