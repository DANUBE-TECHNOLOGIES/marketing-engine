"use strict";

const express = require("express");

const FUNNEL_VERSION = "mse-25.202-v1";
const CONSENT_VERSION = "2026-09-v1";

const FUNNELS = Object.freeze({
  "bois-colombes/soleil-hiver": Object.freeze({
    id: "bois-colombes-soleil-hiver",
    version: FUNNEL_VERSION,
    siteSlug: "bois-colombes",
    agencyCity: "Bois-Colombes",
    campaign: "soleil-hiver",
    title: "Trouvons votre prochain voyage au soleil",
    subtitle: "Quelques questions suffisent pour orienter nos premières recommandations.",
    questions: [
      {
        id: "departureWindow",
        type: "single",
        label: "Quand souhaitez-vous partir ?",
        required: true,
        options: ["decembre", "janvier", "fevrier", "mars", "pas-encore-decide"]
      },
      {
        id: "travellers",
        type: "single",
        label: "Combien de voyageurs ?",
        required: true,
        options: ["1", "2", "3-4", "5-plus"]
      },
      {
        id: "budgetPerPerson",
        type: "single",
        label: "Quel budget envisagez-vous par personne ?",
        required: true,
        options: ["moins-2000", "2000-3000", "3000-5000", "5000-plus", "a-definir"]
      },
      {
        id: "travelStyle",
        type: "multi",
        label: "Quel voyage vous attire ?",
        required: true,
        options: ["plage", "circuit", "safari", "croisiere", "combine", "a-decouvrir"]
      },
      {
        id: "departureAirport",
        type: "single",
        label: "D'où souhaitez-vous partir ?",
        required: true,
        options: ["paris", "autre", "a-definir"]
      },
      {
        id: "maturity",
        type: "single",
        label: "Où en êtes-vous dans votre projet ?",
        required: true,
        options: ["idees", "comparaison", "reservation-prochaine"]
      }
    ],
    contact: {
      required: ["name", "email", "postalCode"],
      optional: ["phone"],
      consentVersion: CONSENT_VERSION,
      consents: {
        emailMarketing: {
          required: false,
          label: "J’accepte de recevoir par e-mail des idées, conseils et offres de Mondescale Voyages."
        },
        phoneProjectContact: {
          requiredWhen: "phone",
          label: "Je souhaite être contacté(e) par téléphone par Mondescale Voyages au sujet de ce projet de voyage."
        }
      }
    }
  })
});

function clean(value, max = 500) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function getFunnel(siteSlug, campaign) {
  return FUNNELS[`${clean(siteSlug, 160)}/${clean(campaign, 160)}`] || null;
}

function scoreSubmission(input = {}) {
  const answers = input.answers || {};
  let score = 0;
  const reasons = [];

  if (answers.maturity === "reservation-prochaine") {
    score += 40;
    reasons.push("reservation-prochaine");
  } else if (answers.maturity === "comparaison") {
    score += 22;
    reasons.push("comparaison-active");
  } else if (answers.maturity === "idees") {
    score += 8;
    reasons.push("inspiration");
  }

  const budgetPoints = {
    "5000-plus": 24,
    "3000-5000": 20,
    "2000-3000": 14,
    "moins-2000": 8,
    "a-definir": 3
  };
  const budget = budgetPoints[answers.budgetPerPerson] || 0;
  score += budget;
  if (budget > 0) reasons.push(`budget:${answers.budgetPerPerson}`);

  if (answers.departureWindow && answers.departureWindow !== "pas-encore-decide") {
    score += 14;
    reasons.push("periode-definie");
  }

  if (answers.departureAirport && answers.departureAirport !== "a-definir") {
    score += 6;
    reasons.push("depart-defini");
  }

  const styles = Array.isArray(answers.travelStyle) ? answers.travelStyle : [answers.travelStyle].filter(Boolean);
  if (styles.length > 0 && !styles.includes("a-decouvrir")) {
    score += 6;
    reasons.push("style-defini");
  }

  if (input.phone && input.consents?.phoneProjectContact === true) {
    score += 10;
    reasons.push("rappel-demande");
  }

  score = Math.min(score, 100);
  const temperature = score >= 70 ? "HOT" : score >= 40 ? "WARM" : "COLD";
  const recommendedAction = temperature === "HOT"
    ? "CONTACT_PRIORITY"
    : temperature === "WARM"
      ? "CONTACT_OR_NURTURE"
      : "NURTURE";

  return { score, temperature, recommendedAction, reasons };
}

function buildConsentEvidence(input = {}, context = {}) {
  const capturedAt = context.capturedAt || new Date().toISOString();
  return {
    version: CONSENT_VERSION,
    capturedAt,
    source: clean(context.source || "acquisition-funnel", 120),
    funnelId: clean(context.funnelId, 180),
    siteSlug: clean(context.siteSlug, 160),
    emailMarketing: input.emailMarketing === true,
    phoneProjectContact: input.phoneProjectContact === true,
    phoneProvided: Boolean(clean(context.phone, 50))
  };
}

function buildErpLeadEnvelope({ leadId, funnel, submission, qualification, consentEvidence }) {
  return {
    schemaVersion: "mondescale.acquisition-lead.v1",
    eventType: "ACQUISITION_LEAD_QUALIFIED",
    leadId: clean(leadId, 160),
    occurredAt: new Date().toISOString(),
    agency: { siteSlug: funnel.siteSlug, city: funnel.agencyCity },
    campaign: { id: funnel.campaign, funnelId: funnel.id, funnelVersion: funnel.version },
    contact: {
      name: clean(submission.name, 120),
      email: clean(submission.email, 180).toLowerCase(),
      phone: clean(submission.phone, 50) || null,
      postalCode: clean(submission.postalCode, 20)
    },
    project: submission.answers || {},
    qualification,
    consentEvidence
  };
}

class DisabledErpConnector {
  async publish(envelope) {
    return {
      status: "DISABLED",
      externalId: null,
      schemaVersion: envelope.schemaVersion
    };
  }
}

function createRoutes() {
  const router = express.Router();

  router.get("/api/public/acquisition-funnels/:siteSlug/:campaign", (req, res) => {
    const funnel = getFunnel(req.params.siteSlug, req.params.campaign);
    if (!funnel) return res.status(404).json({ ok: false, error: "FUNNEL_NOT_FOUND" });
    return res.json({ ok: true, funnel });
  });

  router.post("/api/public/acquisition-funnels/:siteSlug/:campaign/qualify", (req, res) => {
    const funnel = getFunnel(req.params.siteSlug, req.params.campaign);
    if (!funnel) return res.status(404).json({ ok: false, error: "FUNNEL_NOT_FOUND" });
    const qualification = scoreSubmission(req.body || {});
    return res.json({ ok: true, funnelId: funnel.id, funnelVersion: funnel.version, qualification });
  });

  return router;
}

module.exports = {
  CONSENT_VERSION,
  FUNNEL_VERSION,
  DisabledErpConnector,
  buildConsentEvidence,
  buildErpLeadEnvelope,
  getFunnel,
  routes: () => createRoutes(),
  scoreSubmission
};
