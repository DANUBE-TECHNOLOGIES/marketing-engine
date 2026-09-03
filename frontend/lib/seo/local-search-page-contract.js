import { buildLocalPageSeo } from "./local-page-seo";
import { buildLocalSearchSignals } from "./local-search-signals";

export function buildLocalSearchPageContract({ site, page, pageSlug }) {
  const seo = buildLocalPageSeo({ site, page, pageSlug });
  const signals = buildLocalSearchSignals(site, pageSlug);

  return {
    kind: seo.kind,
    city: seo.city || signals.primaryCity,
    title: seo.title,
    description: seo.description,
    heading: seo.heading,
    image: seo.image,
    serviceAreas: signals.serviceAreas,
    primaryQuery: signals.targetQueries[0] || null,
    supportingQueries: signals.targetQueries.slice(1),
    nap: signals.nap,
  };
}
