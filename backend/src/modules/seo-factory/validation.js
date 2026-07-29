const { ValidationError } = require("../../core/errors");

function text(value, field, required = true) {
  if (value === undefined || value === null || value === "") {
    if (!required) return null;
    throw new ValidationError(`Le champ ${field} est obligatoire.`, { field });
  }
  if (typeof value !== "string") {
    throw new ValidationError(`Le champ ${field} doit être une chaîne.`, { field });
  }
  return value.trim();
}

function integer(value, field, required = true) {
  if ((value === undefined || value === null || value === "") && !required) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`Le champ ${field} doit être un entier positif.`, { field });
  }
  return parsed;
}

function validateGenerate(body = {}) {
  return {
    agencyId: integer(body.agencyId, "agencyId"),
    siteId: text(body.siteId, "siteId", false),
    destination: text(body.destination, "destination"),
    destinationSlug: text(body.destinationSlug || body.destination, "destinationSlug"),
    intent: text(body.intent || "voyage", "intent"),
    travelType: text(body.travelType || "séjour", "travelType"),
    season: text(body.season || "toute l'année", "season"),
    language: text(body.language || "fr", "language"),
    publish: Boolean(body.publish),
  };
}

module.exports = { validateGenerate };
