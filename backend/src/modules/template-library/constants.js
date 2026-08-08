"use strict";

const TEMPLATE_LIBRARY_VERSION =
  "1.0";

const TEMPLATE_KINDS =
  Object.freeze({
    PAGE:
      "page",

    SECTION:
      "section",
  });

const TEMPLATE_STATUS =
  Object.freeze({
    ACTIVE:
      "active",

    DRAFT:
      "draft",

    ARCHIVED:
      "archived",
  });

const TEMPLATE_SCOPES =
  Object.freeze({
    PLATFORM:
      "platform",

    TENANT:
      "tenant",

    AGENCY:
      "agency",
  });

const PAGE_TYPES =
  Object.freeze([
    "HOME",
    "AGENCY",
    "SERVICES",
    "CONTACT",
    "LEGAL",
    "PRIVACY",
  ]);

module.exports = {
  TEMPLATE_LIBRARY_VERSION,
  TEMPLATE_KINDS,
  TEMPLATE_STATUS,
  TEMPLATE_SCOPES,
  PAGE_TYPES,
};
