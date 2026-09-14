function schemaTypes(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.map((item) => String(item || "").trim()).filter(Boolean);
}

function hasSchemaType(data, expected) {
  return schemaTypes(data?.["@type"]).includes(expected);
}

function breadcrumbPageUrl(data) {
  const items = Array.isArray(data?.itemListElement) ? data.itemListElement : [];
  const last = items[items.length - 1];
  const item = last?.item;

  if (typeof item === "string") return item.trim() || null;
  if (item && typeof item === "object") {
    return String(item["@id"] || item.url || "").trim() || null;
  }

  return null;
}

export function canonicalizeJsonLd(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;

  if (hasSchemaType(data, "BreadcrumbList")) {
    const pageUrl = breadcrumbPageUrl(data);
    if (!pageUrl) return data;

    return {
      ...data,
      "@id": data["@id"] || `${pageUrl}#breadcrumb`,
      mainEntityOfPage: data.mainEntityOfPage || {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
      },
    };
  }

  if (hasSchemaType(data, "WebPage")) {
    const pageUrl = String(data.url || "").trim();
    if (!pageUrl) return data;

    return {
      ...data,
      breadcrumb: data.breadcrumb || {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
      },
    };
  }

  return data;
}

export { breadcrumbPageUrl, hasSchemaType, schemaTypes };
