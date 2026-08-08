"use strict";

const CHANNELS = new Set(["landing-page", "article", "faq", "google-business", "facebook", "instagram", "newsletter"]);

function bad(message, code) { return Object.assign(new Error(message), { statusCode: 400, code }); }
function text(value) { return typeof value === "string" ? value.trim() : ""; }

function validateGenerate(input = {}) {
  const channel = text(input.channel);
  if (!CHANNELS.has(channel)) throw bad("Canal de contenu invalide.", "INVALID_AI_CONTENT_CHANNEL");
  const topic = text(input.topic || input.destination);
  if (!topic) throw bad("Le sujet ou la destination est obligatoire.", "AI_CONTENT_TOPIC_REQUIRED");
  return {
    campaignId: text(input.campaignId) || null,
    promptId: text(input.promptId) || null,
    channel,
    locale: text(input.locale) || "fr-FR",
    topic,
    agencyName: text(input.agencyName) || "Mondescale Voyages",
    city: text(input.city) || "",
    tourOperator: text(input.tourOperator) || "",
    tone: text(input.tone) || "expert, chaleureux et rassurant",
    keywords: Array.isArray(input.keywords) ? input.keywords.map(text).filter(Boolean).slice(0, 20) : [],
    requestedBy: text(input.requestedBy) || null,
    maxAttempts: Math.max(1, Math.min(Number(input.maxAttempts) || 3, 5)),
  };
}

module.exports = { CHANNELS, validateGenerate };
