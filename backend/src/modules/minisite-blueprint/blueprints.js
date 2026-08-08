"use strict";

const {
  PAGE_DEFINITIONS,
} = require(
  "./page-definitions"
);

function clonePages() {
  return PAGE_DEFINITIONS.map(
    (page) => ({
      ...page,

      blocks: [
        ...page.blocks,
      ],
    })
  );
}

const BLUEPRINTS = [
  {
    id: "mondescale",
    version: "1.0.0",
    name:
      "Mondescale Premium Travel Agency",
    description:
      "Blueprint premium généraliste pour une agence de voyages indépendante.",
    pages:
      clonePages(),
    theme: {
      personality:
        "premium-warm",
      density:
        "spacious",
      imagery:
        "editorial-travel",
    },
  },
  {
    id: "fram",
    version: "1.0.0",
    name:
      "Ambassade FRAM",
    description:
      "Blueprint destiné aux agences Ambassade FRAM.",
    pages:
      clonePages(),
    theme: {
      personality:
        "sunny-premium",
      density:
        "spacious",
      imagery:
        "holiday-destination",
    },
    defaults: {
      partners: [
        "FRAM",
        "Plein Vent",
        "Promovacances",
        "Kappa",
      ],
    },
  },
  {
    id: "tui",
    version: "1.0.0",
    name:
      "TUI Store",
    description:
      "Blueprint destiné aux agences TUI Store.",
    pages:
      clonePages(),
    theme: {
      personality:
        "modern-confident",
      density:
        "balanced",
      imagery:
        "experience-led",
    },
    defaults: {
      partners: [
        "TUI",
        "Club Marmara",
        "Club Lookéa",
        "Nouvelles Frontières",
      ],
    },
  },
];

module.exports = {
  BLUEPRINTS,
};
