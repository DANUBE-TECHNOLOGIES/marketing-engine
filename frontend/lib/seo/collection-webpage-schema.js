import { normalizedTypes } from "./page-semantics-schema";

function hasType(schema, expected) {
  return normalizedTypes(schema?.["@type"]).includes(expected);
}

export function consolidateCollectionWebPage(webPage, schemas = []) {
  const entries = Array.isArray(schemas) ? schemas.filter(Boolean) : [];
  if (!webPage?.["@id"] || !entries.length) {
    return { webPage, schemas: entries };
  }

  const fragmentIndex = entries.findIndex(
    (schema) =>
      schema?.["@id"] === webPage["@id"] &&
      hasType(schema, "CollectionPage")
  );

  if (fragmentIndex < 0) {
    return { webPage, schemas: entries };
  }

  const fragment = entries[fragmentIndex];
  const types = normalizedTypes([
    ...normalizedTypes(webPage["@type"]),
    ...normalizedTypes(fragment["@type"]),
  ]);

  const consolidated = {
    ...webPage,
    ...(types.length === 1
      ? { "@type": types[0] }
      : types.length
        ? { "@type": types }
        : {}),
    ...(fragment.mainEntity ? { mainEntity: fragment.mainEntity } : {}),
  };

  return {
    webPage: consolidated,
    schemas: entries.filter((_schema, index) => index !== fragmentIndex),
  };
}

export { hasType };
