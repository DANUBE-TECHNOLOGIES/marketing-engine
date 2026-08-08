"use strict";

const {
  routes,
} = require("./routes");

const {
  MiniSiteStructuredDataService,
} = require("./service");

const {
  MiniSiteStructuredDataRepository,
} = require("./repository");

const {
  buildStructuredDataPlan,
} = require("./planner");

const {
  buildTravelAgency,
  buildPostalAddress,
} = require("./travel-agency");

const {
  buildBreadcrumbList,
} = require("./breadcrumbs");

const {
  buildFaqPage,
  extractFaqItems,
} = require("./faq");

const {
  buildWebPage,
  buildWebSite,
  siteUrlForReference,
} = require("./webpage");

const {
  validateGraph,
} = require("./validation");

const {
  NOINDEX_SLUGS,
  buildPublicSitemap,
  isPublishedPage,
  isPublishedSite,
  pageChangeFrequency,
  pagePriority,
  shouldIndexPage,
} = require("./sitemap");

module.exports = {
  routes,

  MiniSiteStructuredDataService,
  MiniSiteStructuredDataRepository,

  buildStructuredDataPlan,

  buildTravelAgency,
  buildPostalAddress,

  buildBreadcrumbList,

  buildFaqPage,
  extractFaqItems,

  buildWebPage,
  buildWebSite,
  siteUrlForReference,

  validateGraph,

  NOINDEX_SLUGS,
  buildPublicSitemap,
  isPublishedPage,
  isPublishedSite,
  pageChangeFrequency,
  pagePriority,
  shouldIndexPage,
};
