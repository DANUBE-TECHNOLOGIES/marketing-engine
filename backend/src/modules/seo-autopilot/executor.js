"use strict";

class SeoAutopilotExecutor {
  constructor({ handlers = {}, clock = () => new Date() } = {}) {
    this.handlers = handlers;
    this.clock = clock;
  }

  async execute(action, context = {}) {
    const startedAt = this.clock();
    const handler = this.handlers[action.type];
    if (!handler) {
      const error = new Error(`Aucun exécuteur enregistré pour le type ${action.type}`);
      error.code = "AUTOPILOT_HANDLER_NOT_FOUND";
      throw error;
    }
    const result = await handler(action, context);
    const finishedAt = this.clock();
    return {
      result: result ?? null,
      startedAt,
      finishedAt,
      durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
    };
  }
}

module.exports = { SeoAutopilotExecutor };
