"use strict";

function primaryContactCta() {
  return {
    label:
      "Préparer mon voyage",

    href:
      "/contact",

    kind:
      "primary",
  };
}

function quoteCta() {
  return {
    label:
      "Demander un devis",

    href:
      "/contact",

    kind:
      "primary",
  };
}

function phoneCta(
  context
) {
  if (
    !context
      ?.agency
      ?.phone
  ) {
    return null;
  }

  return {
    label:
      context.agency.phone,

    href:
      context.agency.phoneHref,

    kind:
      "phone",
  };
}

module.exports = {
  primaryContactCta,
  quoteCta,
  phoneCta,
};
