import SectionRenderer from "../agency-site/SectionRenderer";
import BreadcrumbBlock from "./blocks/BreadcrumbBlock";
import CardsBlock from "./blocks/CardsBlock";
import ClimateBlock from "./blocks/ClimateBlock";
import ContactCtaBlock from "./blocks/ContactCtaBlock";
import FaqBlock from "./blocks/FaqBlock";
import HeroBlock from "./blocks/HeroBlock";
import IntroBlock from "./blocks/IntroBlock";
import PageHeaderBlock from "./blocks/PageHeaderBlock";
import PartnerCategoriesBlock from "./blocks/PartnerCategoriesBlock";
import RelatedDestinationsBlock from "./blocks/RelatedDestinationsBlock";

const registry = new Map();

export function registerBlock(type, component) {
  if (!type || typeof component !== "function") {
    throw new Error("Invalid page-builder block registration");
  }
  registry.set(String(type).trim().toLowerCase(), component);
}

export function getBlock(type) {
  return registry.get(String(type || "").trim().toLowerCase()) || SectionRenderer;
}

export function listBlocks() {
  return Array.from(registry.keys());
}

registerBlock("hero", HeroBlock);
registerBlock("page-header", PageHeaderBlock);
registerBlock("breadcrumb", BreadcrumbBlock);
registerBlock("intro", IntroBlock);
registerBlock("richtext", IntroBlock);
registerBlock("agency-introduction", IntroBlock);
registerBlock("agency-story", IntroBlock);
registerBlock("destinations-introduction", IntroBlock);
registerBlock("inspiration-introduction", IntroBlock);
registerBlock("reviews-introduction", IntroBlock);
registerBlock("partners-introduction", IntroBlock);
registerBlock("team-introduction", IntroBlock);
registerBlock("custom-travel", IntroBlock);
registerBlock("advisor-help", IntroBlock);
registerBlock("review-proof", IntroBlock);
registerBlock("review-cta", IntroBlock);
registerBlock("opening-contact", IntroBlock);
registerBlock("climate", ClimateBlock);
registerBlock("faq", FaqBlock);
registerBlock("cards", CardsBlock);
registerBlock("highlights", CardsBlock);
registerBlock("services-highlight", CardsBlock);
registerBlock("services-grid", CardsBlock);
registerBlock("destination-families", CardsBlock);
registerBlock("trust", CardsBlock);
registerBlock("expertise", CardsBlock);
registerBlock("commitments", CardsBlock);
registerBlock("partner-categories", PartnerCategoriesBlock);
registerBlock("travel-themes", CardsBlock);
registerBlock("booking-support", CardsBlock);
registerBlock("destinations-highlight", CardsBlock);
registerBlock("destination-recommendations", RelatedDestinationsBlock);
registerBlock("contact-cta", ContactCtaBlock);
