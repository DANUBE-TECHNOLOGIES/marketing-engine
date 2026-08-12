"use strict";

const TEXT_FIELDS = ["html", "text", "subtitle", "description", "title", "eyebrow"];

function cleanText(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function sentence(value) {
  const text = cleanText(value).replace(/[.!?]+$/g, "").trim();
  return text ? `${text}.` : "";
}

function pickField(content = {}) {
  for (const key of TEXT_FIELDS) {
    if (typeof content?.[key] === "string" && cleanText(content[key]).length >= 20) return key;
  }
  return null;
}

function evidenceByCode(localEvidence) {
  return new Map((localEvidence?.evidence || []).map((item) => [item.code, item]));
}

function localProofSentences(localEvidence) {
  const byCode = evidenceByCode(localEvidence);
  const city = byCode.get("CITY")?.value || localEvidence?.city || "";
  const postalCode = byCode.get("POSTAL_CODE")?.value || "";
  const address = byCode.get("ADDRESS")?.value || "";
  const team = Array.isArray(localEvidence?.team) ? localEvidence.team : [];
  const reviews = localEvidence?.reviews || null;
  const keywordCities = Array.isArray(localEvidence?.keywordCities) ? localEvidence.keywordCities : [];
  const agencyName = localEvidence?.agencyName || "l’agence";
  const sentences = [];
  const used = [];

  if (city) {
    sentences.push(`À ${city}, ${agencyName} accueille et conseille les voyageurs localement.`);
    used.push("CITY");
  }
  if (team.length) {
    const names = team.slice(0, 3).map((member) => member.name).filter(Boolean);
    if (names.length) {
      sentences.push(`Vous pouvez notamment échanger avec ${names.join(", ")}.`);
      used.push("TEAM");
    }
  }
  if (address) {
    const locality = [postalCode, city].filter(Boolean).join(" ");
    sentences.push(`L’agence est implantée au ${address}${locality ? `, ${locality}` : ""}.`);
    used.push("ADDRESS");
    if (postalCode) used.push("POSTAL_CODE");
  }
  if (reviews?.observedCount) {
    sentences.push(`Les données Google observées comptent ${reviews.observedCount} avis 4–5★, pour une moyenne de ${reviews.averageRating}/5.`);
    used.push("REVIEWS");
  }
  if (keywordCities.length > 1) {
    sentences.push(`Le suivi SEO local couvre déjà ${keywordCities.slice(0, 4).join(", ")}.`);
    used.push("LOCAL_CITIES");
  }

  return { sentences, evidenceCodes: [...new Set(used)] };
}

function buildLocalRewriteProposal({ block, localEvidence, insight = null }) {
  if (!block || typeof block !== "object") {
    const error = new Error("Le bloc à réécrire est obligatoire.");
    error.statusCode = 400;
    error.code = "LOCAL_REWRITE_BLOCK_REQUIRED";
    throw error;
  }
  const content = block.content && typeof block.content === "object" ? block.content : {};
  const field = pickField(content);
  if (!field) {
    return { version: "1.0", eligible: false, reason: "NO_EDITABLE_EDITORIAL_FIELD", blockId: block.id || null };
  }
  const proof = localProofSentences(localEvidence);
  if (!proof.sentences.length) {
    return { version: "1.0", eligible: false, reason: "NO_VERIFIED_LOCAL_EVIDENCE", blockId: block.id || null };
  }

  const before = String(content[field] || "");
  const original = sentence(before);
  const shared = new Set((insight?.sharedSegments || []).map((value) => cleanText(value).toLowerCase()));
  const keepOriginal = ![...shared].some((segment) => segment && cleanText(before).toLowerCase().includes(segment));
  const localized = proof.sentences.slice(0, 3).join(" ");
  const after = keepOriginal ? `${original} ${localized}`.trim() : localized;

  return {
    version: "1.0",
    eligible: true,
    mode: "proposal-only",
    blockId: block.id || null,
    blockType: block.type || block.blockType || null,
    field,
    before,
    after,
    content: { ...content, [field]: field === "html" ? `<p>${after}</p>` : after },
    evidenceCodes: proof.evidenceCodes,
    evidence: (localEvidence?.evidence || []).filter((item) => proof.evidenceCodes.includes(item.code)),
    safeguards: {
      verifiedEvidenceOnly: true,
      persistedAutomatically: false,
      userValidationRequired: true,
    },
  };
}

module.exports = { buildLocalRewriteProposal, localProofSentences, pickField };
