"use strict";

function create({ sdk }) {
  function generate(input = {}) {
    const page = input.page || {};
    const content = input.content || {};
    const baseUrl = String(input.baseUrl || "https://www.mondescale-voyages.fr").replace(/\/+$/, "");
    const url = `${baseUrl}${page.path || "/"}`;

    const graph = [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: page.title || content.title,
        description: content.introduction || input.description || undefined,
        inLanguage: input.locale || "fr-FR"
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: breadcrumbItems(page, baseUrl)
      }
    ];

    if (Array.isArray(content.faq) && content.faq.length) {
      graph.push({
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: content.faq.map(item => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer
          }
        }))
      });
    }

    if (input.agency) {
      graph.push({
        "@type": "TravelAgency",
        "@id": `${baseUrl}#agency`,
        name: input.agency.name || "Mondescale Voyages",
        url: input.agency.url || baseUrl,
        telephone: input.agency.telephone || undefined,
        address: input.agency.address || undefined
      });
    }

    const result = {
      "@context": "https://schema.org",
      "@graph": graph
    };

    sdk.events.publish("seo.schema.generated", {
      path: page.path,
      types: graph.map(item => item["@type"])
    });

    return result;
  }

  return { generate };
}

function breadcrumbItems(page, baseUrl) {
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Accueil",
      item: baseUrl
    }
  ];

  if (page.parent) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: "Destination",
      item: `${baseUrl}${page.parent}`
    });
  }

  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: page.title || "Page",
    item: `${baseUrl}${page.path || "/"}`
  });

  return items;
}

module.exports = { create, breadcrumbItems };
