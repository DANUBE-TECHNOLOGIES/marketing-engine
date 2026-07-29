"use strict";

const TEMPLATE_DEFINITIONS = Object.freeze({
  destination: {
    code: "destination",
    label: "Page destination enrichie",
    sections: [
      "hero",
      "introduction",
      "best-time",
      "must-see",
      "travel-profile",
      "budget",
      "practical-info",
      "climate",
      "faq",
      "recommendations",
      "contact-cta",
    ],
  },
});

function listTemplates() {
  return Object.values(TEMPLATE_DEFINITIONS).map((item) => ({ ...item }));
}

module.exports = { TEMPLATE_DEFINITIONS, listTemplates };
