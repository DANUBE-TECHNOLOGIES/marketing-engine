"use strict";

const SCORE_FIELDS = [
  "familyScore", "coupleScore", "luxuryScore", "adventureScore", "cultureScore",
  "beachScore", "natureScore", "nightlifeScore", "accessibilityScore",
];

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value) {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function normalizeStringArray(value, field, errors) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    errors.push(`${field} doit être un tableau.`);
    return undefined;
  }
  return [...new Set(value.map(normalizeString).filter(Boolean))];
}

function integerInRange(value, field, min, max, errors) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    errors.push(`${field} doit être un entier compris entre ${min} et ${max}.`);
    return undefined;
  }
  return parsed;
}

function nonNegativeInteger(value, field, errors) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    errors.push(`${field} doit être un entier positif ou nul.`);
    return undefined;
  }
  return parsed;
}

function optionalJson(value, field, errors) {
  if (value === undefined) return undefined;
  if (!isObject(value) && !Array.isArray(value)) {
    errors.push(`${field} doit être un objet ou un tableau JSON.`);
    return undefined;
  }
  return value;
}

function validateKnowledgePayload(payload, { partial = false } = {}) {
  const errors = [];
  if (!isObject(payload)) return { valid: false, errors: ["Le corps doit être un objet JSON."], data: null };

  const destinationSlug = normalizeString(payload.destinationSlug || payload.slug);
  if (!partial && !destinationSlug) errors.push("destinationSlug est obligatoire.");

  const knowledgeInput = payload.knowledge === undefined ? {} : payload.knowledge;
  const climateInput = payload.climateMonths === undefined ? [] : payload.climateMonths;
  const travelInput = payload.travelProfile === undefined ? {} : payload.travelProfile;
  const budgetInput = payload.budgetProfile === undefined ? {} : payload.budgetProfile;

  if (!isObject(knowledgeInput)) errors.push("knowledge doit être un objet.");
  if (!Array.isArray(climateInput)) errors.push("climateMonths doit être un tableau.");
  if (!isObject(travelInput)) errors.push("travelProfile doit être un objet.");
  if (!isObject(budgetInput)) errors.push("budgetProfile doit être un objet.");

  const knowledge = isObject(knowledgeInput) ? {
    timezone: normalizeString(knowledgeInput.timezone),
    utcOffset: normalizeString(knowledgeInput.utcOffset),
    currencyCode: normalizeString(knowledgeInput.currencyCode)?.toUpperCase(),
    languages: normalizeStringArray(knowledgeInput.languages, "knowledge.languages", errors),
    flightDurationMin: nonNegativeInteger(knowledgeInput.flightDurationMin, "knowledge.flightDurationMin", errors),
    flightDurationMax: nonNegativeInteger(knowledgeInput.flightDurationMax, "knowledge.flightDurationMax", errors),
    idealDurationMin: nonNegativeInteger(knowledgeInput.idealDurationMin, "knowledge.idealDurationMin", errors),
    idealDurationMax: nonNegativeInteger(knowledgeInput.idealDurationMax, "knowledge.idealDurationMax", errors),
    bestMonths: normalizeBestMonths(knowledgeInput.bestMonths, errors),
    entryRequirements: optionalJson(knowledgeInput.entryRequirements, "knowledge.entryRequirements", errors),
    healthAdvice: optionalJson(knowledgeInput.healthAdvice, "knowledge.healthAdvice", errors),
    safetyAdvice: optionalJson(knowledgeInput.safetyAdvice, "knowledge.safetyAdvice", errors),
    practicalInfo: optionalJson(knowledgeInput.practicalInfo, "knowledge.practicalInfo", errors),
    source: normalizeString(knowledgeInput.source),
    sourceUrl: normalizeString(knowledgeInput.sourceUrl),
    status: normalizeStatus(knowledgeInput.status, errors),
  } : {};

  validateMinMax(knowledge, "flightDurationMin", "flightDurationMax", errors);
  validateMinMax(knowledge, "idealDurationMin", "idealDurationMax", errors);

  const climateMonths = Array.isArray(climateInput)
    ? climateInput.map((item, index) => validateClimateMonth(item, index, errors)).filter(Boolean)
    : [];
  const seenMonths = new Set();
  for (const item of climateMonths) {
    if (seenMonths.has(item.month)) errors.push(`climateMonths contient le mois ${item.month} plusieurs fois.`);
    seenMonths.add(item.month);
  }

  const travelProfile = isObject(travelInput) ? {} : {};
  if (isObject(travelInput)) {
    for (const field of SCORE_FIELDS) travelProfile[field] = integerInRange(travelInput[field], `travelProfile.${field}`, 0, 100, errors);
    travelProfile.suitableFor = normalizeStringArray(travelInput.suitableFor, "travelProfile.suitableFor", errors);
    travelProfile.notRecommendedFor = normalizeStringArray(travelInput.notRecommendedFor, "travelProfile.notRecommendedFor", errors);
    travelProfile.metadata = optionalJson(travelInput.metadata, "travelProfile.metadata", errors);
  }

  const budgetProfile = isObject(budgetInput) ? {
    currencyCode: normalizeString(budgetInput.currencyCode)?.toUpperCase(),
    dailyBudgetLow: nonNegativeInteger(budgetInput.dailyBudgetLow, "budgetProfile.dailyBudgetLow", errors),
    dailyBudgetMid: nonNegativeInteger(budgetInput.dailyBudgetMid, "budgetProfile.dailyBudgetMid", errors),
    dailyBudgetHigh: nonNegativeInteger(budgetInput.dailyBudgetHigh, "budgetProfile.dailyBudgetHigh", errors),
    flightBudgetLow: nonNegativeInteger(budgetInput.flightBudgetLow, "budgetProfile.flightBudgetLow", errors),
    flightBudgetMid: nonNegativeInteger(budgetInput.flightBudgetMid, "budgetProfile.flightBudgetMid", errors),
    flightBudgetHigh: nonNegativeInteger(budgetInput.flightBudgetHigh, "budgetProfile.flightBudgetHigh", errors),
    accommodationLow: nonNegativeInteger(budgetInput.accommodationLow, "budgetProfile.accommodationLow", errors),
    accommodationMid: nonNegativeInteger(budgetInput.accommodationMid, "budgetProfile.accommodationMid", errors),
    accommodationHigh: nonNegativeInteger(budgetInput.accommodationHigh, "budgetProfile.accommodationHigh", errors),
    seasonality: optionalJson(budgetInput.seasonality, "budgetProfile.seasonality", errors),
    notes: normalizeString(budgetInput.notes),
    source: normalizeString(budgetInput.source),
  } : {};
  validateTier(budgetProfile, "dailyBudget", errors);
  validateTier(budgetProfile, "flightBudget", errors);
  validateTier(budgetProfile, "accommodation", errors);

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length ? null : { destinationSlug, knowledge: compact(knowledge), climateMonths: climateMonths.map(compact), travelProfile: compact(travelProfile), budgetProfile: compact(budgetProfile) },
  };
}

function normalizeBestMonths(value, errors) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    errors.push("knowledge.bestMonths doit être un tableau.");
    return undefined;
  }
  const months = value.map((item) => integerInRange(item, "knowledge.bestMonths[]", 1, 12, errors)).filter(Boolean);
  return [...new Set(months)].sort((a, b) => a - b);
}

function normalizeStatus(value, errors) {
  if (value === undefined) return undefined;
  const status = normalizeString(value)?.toLowerCase();
  if (!["draft", "review", "published", "archived"].includes(status)) {
    errors.push("knowledge.status doit être draft, review, published ou archived.");
    return undefined;
  }
  return status;
}

function validateClimateMonth(item, index, errors) {
  if (!isObject(item)) {
    errors.push(`climateMonths[${index}] doit être un objet.`);
    return null;
  }
  const month = integerInRange(item.month, `climateMonths[${index}].month`, 1, 12, errors);
  if (!month) return null;
  const number = (value, field, min, max) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      errors.push(`${field} doit être compris entre ${min} et ${max}.`);
      return undefined;
    }
    return parsed;
  };
  return {
    month,
    temperatureMinC: number(item.temperatureMinC, `climateMonths[${index}].temperatureMinC`, -80, 60),
    temperatureMaxC: number(item.temperatureMaxC, `climateMonths[${index}].temperatureMaxC`, -80, 60),
    seaTemperatureC: number(item.seaTemperatureC, `climateMonths[${index}].seaTemperatureC`, -5, 45),
    rainfallMm: number(item.rainfallMm, `climateMonths[${index}].rainfallMm`, 0, 5000),
    rainyDays: integerInRange(item.rainyDays, `climateMonths[${index}].rainyDays`, 0, 31, errors),
    sunshineHours: number(item.sunshineHours, `climateMonths[${index}].sunshineHours`, 0, 744),
    humidityPercent: integerInRange(item.humidityPercent, `climateMonths[${index}].humidityPercent`, 0, 100, errors),
    comfortScore: integerInRange(item.comfortScore, `climateMonths[${index}].comfortScore`, 0, 100, errors),
    notes: normalizeString(item.notes),
    source: normalizeString(item.source),
  };
}

function validateMinMax(object, minField, maxField, errors) {
  if (object[minField] !== undefined && object[maxField] !== undefined && object[minField] > object[maxField]) {
    errors.push(`${minField} ne peut pas être supérieur à ${maxField}.`);
  }
}

function validateTier(object, prefix, errors) {
  const low = object[`${prefix}Low`];
  const mid = object[`${prefix}Mid`];
  const high = object[`${prefix}High`];
  if (low !== undefined && mid !== undefined && low > mid) errors.push(`${prefix}Low ne peut pas être supérieur à ${prefix}Mid.`);
  if (mid !== undefined && high !== undefined && mid > high) errors.push(`${prefix}Mid ne peut pas être supérieur à ${prefix}High.`);
}

function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

module.exports = { validateKnowledgePayload, SCORE_FIELDS };
