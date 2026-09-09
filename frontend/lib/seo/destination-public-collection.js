import {
  getItems,
  getSectionContent,
  getSectionType,
} from "../../components/public-site/renderers/helpers";

const DESTINATION_SECTION_TYPES = new Set([
  "destinations",
  "destination",
  "destination-grid",
  "destinations-grid",
  "destinations-highlight",
  "destination-recommendations",
]);

export function destinationSiteRoot(site) {
  return String(
    site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`
  ).replace(/\/$/, "");
}

export function destinationHref(site, item) {
  const root = destinationSiteRoot(site);
  const explicit = String(item?.href || item?.url || "").trim();

  if (explicit) {
    if (/^(https?:|mailto:|tel:|#)/i.test(explicit)) return explicit;

    const legacyDestination = explicit.match(
      /^\/destinations\/([^/?#]+)\/?(?:[?#].*)?$/i
    );
    if (legacyDestination) {
      return `${root}/destination/${encodeURIComponent(
        decodeURIComponent(legacyDestination[1])
      )}`;
    }

    if (explicit.startsWith("/agence/")) return explicit;
    if (explicit.startsWith("/")) {
      return `${root}/${explicit.replace(/^\/+/, "")}`;
    }
    return `${root}/${explicit.replace(/^\/+|\/+$/g, "")}`;
  }

  if (!item?.slug) return null;
  return `${root}/destination/${encodeURIComponent(item.slug)}`;
}

export function destinationSectionItems(section) {
  const content = getSectionContent(section);
  const source = String(
    content.__dataSource ||
      content.source ||
      (Array.isArray(content.destinationIds) && content.destinationIds.length
        ? "travel-core"
        : "automatic")
  ).toLowerCase();
  const dynamicSource = ["travel-core", "catalog", "automatic", "auto"].includes(
    source
  );

  return getItems(
    section,
    dynamicSource ? ["destinations", "items"] : ["items"]
  );
}

export function publicDestinationCollectionItems({ site, sections = [] }) {
  const result = [];
  const seen = new Set();

  for (const section of Array.isArray(sections) ? sections : []) {
    if (!DESTINATION_SECTION_TYPES.has(getSectionType(section))) continue;

    for (const item of destinationSectionItems(section)) {
      const name = String(item?.title || item?.name || "").replace(/\s+/g, " ").trim();
      const href = destinationHref(site, item);
      if (!name || !href || /^(mailto:|tel:|#)/i.test(href)) continue;

      const key = href.toLocaleLowerCase("fr-FR");
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ name, href });
    }
  }

  return result.slice(0, 24);
}

export { DESTINATION_SECTION_TYPES };
