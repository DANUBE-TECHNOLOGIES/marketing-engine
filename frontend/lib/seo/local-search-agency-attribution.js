import { classifyLocalSearchQuery } from "./local-search-query-classifier.js";
import { LOCAL_SEARCH_MEASUREMENT_THRESHOLDS } from "./local-search-measurement.js";

const ATTRIBUTABLE_INTENTS = new Set([
  "agency-local",
  "brand",
  "ticketing",
  "groups",
  "business",
  "service",
]);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function phraseMatch(query, phrase) {
  const normalizedQuery = ` ${normalize(query)} `;
  const normalizedPhrase = normalize(phrase);
  return Boolean(normalizedPhrase) && normalizedQuery.includes(` ${normalizedPhrase} `);
}

function agencyPhrases(agency) {
  return [agency?.city, ...(Array.isArray(agency?.aliases) ? agency.aliases : [])]
    .map(normalize)
    .filter(Boolean);
}

export function attributeSearchConsoleRow(row, agencies = []) {
  const query = String(row?.query || "").trim();
  const intent = classifyLocalSearchQuery(query);
  const matches = agencies.filter((agency) =>
    agencyPhrases(agency).some((phrase) => phraseMatch(query, phrase))
  );

  if (matches.length > 1) {
    return {
      ...row,
      intent,
      attribution: "ambiguous",
      agencyKey: null,
      confidence: "none",
    };
  }

  if (matches.length === 0) {
    return {
      ...row,
      intent,
      attribution: "unmapped",
      agencyKey: null,
      confidence: "none",
    };
  }

  const agencyKey = matches[0]?.agencyKey || null;
  if (!agencyKey || !ATTRIBUTABLE_INTENTS.has(intent)) {
    return {
      ...row,
      intent,
      attribution: "noise",
      agencyKey: agencyKey || null,
      confidence: "none",
    };
  }

  return {
    ...row,
    intent,
    attribution: "attributed",
    agencyKey,
    confidence: "deterministic",
  };
}

export function attributeSearchConsoleRows(rows = [], agencies = []) {
  return rows.map((row) => attributeSearchConsoleRow(row, agencies));
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function buildAgencyAttributionAudit(rows = [], agencies = []) {
  const attributedRows = attributeSearchConsoleRows(rows, agencies);

  const agencyAudits = agencies.map((agency) => {
    const queryRows = attributedRows.filter(
      (row) => row.attribution === "attributed" && row.agencyKey === agency.agencyKey
    );
    const impressions = queryRows.reduce((sum, row) => sum + numeric(row.impressions), 0);
    const clicks = queryRows.reduce((sum, row) => sum + numeric(row.clicks), 0);
    const volume = impressions >= LOCAL_SEARCH_MEASUREMENT_THRESHOLDS.minimumImpressionsForCtrJudgement
      ? "usable"
      : impressions > 0
        ? "low"
        : "none";

    let signal = "no-data";
    let recommendation = "verify-runtime-and-collect-data";
    if (volume === "low") {
      signal = "low-volume";
      recommendation = "collect-more-data";
    } else if (volume === "usable" && clicks === 0) {
      signal = "visibility-no-clicks";
      recommendation = "review-serp-snippet-and-position";
    } else if (volume === "usable") {
      signal = "observed";
      recommendation = "preserve-and-monitor";
    }

    return {
      agencyKey: agency.agencyKey,
      city: agency.city || null,
      impressions,
      clicks,
      queryCount: queryRows.length,
      volume,
      signal,
      recommendation,
      queryRows,
      automatedPublicChangeAllowed: false,
      googleWriteAllowed: false,
    };
  });

  return {
    agencies: agencyAudits,
    noise: attributedRows.filter((row) => row.attribution === "noise"),
    unmapped: attributedRows.filter((row) => row.attribution === "unmapped"),
    ambiguous: attributedRows.filter((row) => row.attribution === "ambiguous"),
    automatedPublicChangeAllowed: false,
    googleWriteAllowed: false,
  };
}

export { ATTRIBUTABLE_INTENTS };
