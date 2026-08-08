"use strict";

const { BlockRegistry } = require("./block-registry");
const { pageBuilderError } = require("./errors");

class PageBuilderService {
  constructor({ registry } = {}) {
    this.registry = registry || new BlockRegistry();
  }

  listBlockTypes(query = {}) {
    return {
      categories: this.registry.categories(),
      items: this.registry.list({
        category: query.category || undefined,
      }),
    };
  }

  getBlockType(type) {
    return this.registry.get(type);
  }

  createBlock(type, input = {}) {
    return this.registry.create(type, input);
  }

  validateBlock(input) {
    return this.registry.validate(input);
  }

  validatePage(input = {}) {
    const blocks = this.registry.validatePage(
      input.blocks || []
    );

    if (!blocks.length) {
      throw pageBuilderError(
        "Une page doit contenir au moins un bloc.",
        "PAGE_BLOCKS_REQUIRED",
        400
      );
    }

    return {
      blocks,
      count: blocks.length,
      publishedCount: blocks.filter(
        (block) => block.status === "published"
      ).length,
      hiddenCount: blocks.filter(
        (block) => block.status === "hidden"
      ).length,
    };
  }

  health() {
    return this.registry.health();
  }
}

module.exports = {
  PageBuilderService,
};
