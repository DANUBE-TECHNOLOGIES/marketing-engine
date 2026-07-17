const KNOWLEDGE_STATUSES = Object.freeze([
  "draft",
  "review",
  "published",
  "archived",
]);

const KNOWLEDGE_TYPES = Object.freeze([
  "country",
  "region",
  "destination",
  "city",
  "island",
  "hotel",
  "activity",
  "restaurant",
  "circuit",
  "cruise",
  "travel_product",
  "travel_theme",
  "offer",
  "article",
  "faq",
  "advice",
  "media",
  "other",
]);

const DEFAULT_LANGUAGE = "fr";
const DEFAULT_STATUS = "draft";
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

module.exports = {
  KNOWLEDGE_STATUSES,
  KNOWLEDGE_TYPES,
  DEFAULT_LANGUAGE,
  DEFAULT_STATUS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
};
