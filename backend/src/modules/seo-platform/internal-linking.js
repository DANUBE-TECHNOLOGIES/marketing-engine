"use strict";

function create({ sdk }) {
  function build(plan, options = {}) {
    const pages = Array.isArray(plan?.pages) ? plan.pages : [];
    const maxLinks = Math.max(1, Math.min(Number(options.maxLinksPerPage) || 5, 12));
    const pillar = pages.find(page => page.type === "pillar") || pages[0];

    const links = pages.map(page => {
      const candidates = pages.filter(other => other.path !== page.path);
      const prioritized = candidates.sort((a, b) => {
        if (a.path === pillar?.path) return -1;
        if (b.path === pillar?.path) return 1;
        return String(a.intent).localeCompare(String(b.intent));
      });

      return {
        source: page.path,
        links: prioritized.slice(0, maxLinks).map(target => ({
          target: target.path,
          anchor: anchorFor(target),
          relation: target.path === pillar?.path ? "pillar" : "related"
        }))
      };
    });

    sdk.events.publish("seo.internal-links.created", {
      pageCount: pages.length,
      linkCount: links.reduce((sum, item) => sum + item.links.length, 0)
    });

    return {
      pageCount: pages.length,
      maxLinksPerPage: maxLinks,
      links
    };
  }

  return { build };
}

function anchorFor(page) {
  const anchors = {
    pillar: page.title,
    weekend: "organiser un week-end",
    family: "voyager en famille",
    luxury: "découvrir les séjours haut de gamme",
    food: "explorer la gastronomie locale",
    guide: "consulter le guide pratique",
    when: "choisir la meilleure période",
    things: "découvrir les activités incontournables"
  };
  return anchors[page.type] || page.title || page.path;
}

module.exports = { create, anchorFor };
