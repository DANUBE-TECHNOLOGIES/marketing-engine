"use strict";

class RankingGridProvider {
  constructor(name = "unconfigured") {
    this.name = name;
  }

  async measurePoint() {
    throw new Error("RankingGridProvider.measurePoint must be implemented");
  }
}

class UnconfiguredRankingGridProvider extends RankingGridProvider {
  constructor() {
    super("unconfigured");
  }

  async measurePoint() {
    const error = new Error("No ranking grid provider configured");
    error.code = "RANKING_GRID_PROVIDER_UNCONFIGURED";
    throw error;
  }
}

module.exports = {
  RankingGridProvider,
  UnconfiguredRankingGridProvider,
};
