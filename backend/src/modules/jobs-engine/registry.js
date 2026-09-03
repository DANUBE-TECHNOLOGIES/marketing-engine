"use strict";

class JobRegistry {
  constructor() { this.handlers = new Map(); }
  register(type, handler) {
    const key = String(type || "").trim();
    if (!key) throw new Error("Le type de job est obligatoire.");
    if (typeof handler !== "function") throw new Error(`Handler invalide pour ${key}.`);
    this.handlers.set(key, handler);
    return this;
  }
  has(type) { return this.handlers.has(type); }
  list() { return [...this.handlers.keys()].sort(); }
  async execute(type, context) {
    const handler = this.handlers.get(type);
    if (!handler) {
      const error = new Error(`Aucun handler enregistré pour le job ${type}.`);
      error.code = "JOB_HANDLER_NOT_FOUND";
      throw error;
    }
    return handler(context);
  }
}

module.exports = { JobRegistry };
