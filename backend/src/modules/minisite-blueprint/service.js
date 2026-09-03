"use strict";

const {
  BLUEPRINTS,
} = require("./blueprints");

const {
  MiniSiteBlueprintEngine,
} = require("./engine");

const {
  BlueprintRegistry,
} = require("./registry");

class MiniSiteBlueprintService {
  constructor({
    registry,
    engine,
  } = {}) {
    this.registry =
      registry ||
      new BlueprintRegistry(
        BLUEPRINTS
      );

    this.engine =
      engine ||
      new MiniSiteBlueprintEngine({
        registry:
          this.registry,
      });
  }

  health() {
    const blueprints =
      this.registry.list();

    return {
      status:
        "ok",

      capability:
        "minisite-blueprint-engine",

      deterministic:
        true,

      persistence:
        false,

      blueprintCount:
        blueprints.length,

      blueprints,
    };
  }

  list() {
    return {
      items:
        this.registry.list(),
    };
  }

  get(
    id
  ) {
    return this.registry.get(
      id
    );
  }

  preview(
    input
  ) {
    return this.engine.compose(
      input
    );
  }
}

module.exports = {
  MiniSiteBlueprintService,
};
