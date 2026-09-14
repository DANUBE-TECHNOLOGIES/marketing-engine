import { buildLocalWebPageSchema } from "./json-ld";

function serviceCatalogReference(serviceCatalog) {
  if (!serviceCatalog?.["@id"]) return null;

  return {
    "@type": "OfferCatalog",
    "@id": serviceCatalog["@id"],
    name: serviceCatalog.name,
    url: serviceCatalog.url,
  };
}

export function linkServiceCatalogToPage(serviceCatalog, url) {
  if (!serviceCatalog?.["@id"] || !url) return serviceCatalog;

  return {
    ...serviceCatalog,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
    },
  };
}

export function buildServiceAwareWebPageSchema({
  site,
  page,
  url,
  title,
  description,
  image,
  serviceCatalog,
}) {
  const webPage = buildLocalWebPageSchema({
    site,
    page,
    url,
    title,
    description,
    image,
  });
  const catalog = serviceCatalogReference(serviceCatalog);

  if (!catalog) return webPage;

  return {
    ...webPage,
    about: [webPage.about, catalog].filter(Boolean),
    mainEntity: catalog,
  };
}

export { serviceCatalogReference };
