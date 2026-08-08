import { CORE_BLOCK_MANIFESTS } from "./blocks/core-blocks.mjs";

import {
  BlockRegistryV3,
} from "./sdk/index.mjs";

export * from "./sdk/index.mjs";
export * from "./editor-state.mjs";
export * from "./history.mjs";
export * from "./drag-engine.mjs";

export {
  CORE_BLOCK_MANIFESTS,
};

export function createCoreRegistry() {
  return new BlockRegistryV3(
    CORE_BLOCK_MANIFESTS
  );
}

export * from "./selection-engine.mjs";

export * from "./clipboard.mjs";

export {
  PageTemplateRegistry,
  applyTemplateToState,
  interpolate,
  normalizeTemplate,
} from "./template-registry.mjs";

export {
  TRAVEL_PAGE_TEMPLATES,
} from "./travel-templates.mjs";

import {
  PageTemplateRegistry,
} from "./template-registry.mjs";

import {
  TRAVEL_PAGE_TEMPLATES,
} from "./travel-templates.mjs";

export function createTravelTemplateRegistry() {
  return new PageTemplateRegistry(
    TRAVEL_PAGE_TEMPLATES
  );
}

export * from "./persistence.mjs";

export * from "./seo-engine.mjs";

export * from "./inline-editing.mjs";

export * from "./inspector-engine.mjs";

export * from "./publication-engine.mjs";

export * from "./version-history.mjs";

export * from "./editorial-assistant.mjs";

export * from "./editorial-ai-api.mjs";

export * from "./editorial-factuality.mjs";
