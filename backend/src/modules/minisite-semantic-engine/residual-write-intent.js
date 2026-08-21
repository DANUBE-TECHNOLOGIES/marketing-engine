"use strict";

const crypto = require("node:crypto");
const { saveBody, validatedSaveBody, normalizedBlockType } = require("../minisite-seo-enrichment/quality-uplift-write-intent");

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex"); }
function normalizedPageSlug(value) {
  const slug = String(value ?? "").trim().replace(/^\/+|\/+$/g, "");
  return !slug || slug === "accueil" ? "home" : slug;
}
function pageKey(siteSlug, pageSlug) { return `${String(siteSlug || "").trim()}:${normalizedPageSlug(pageSlug)}`; }
function error(code, message, details = {}) { const e = new Error(message); e.code = code; e.status = 409; e.details = details; return e; }
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const COPY = {
  ticketing: (city) => ({
    title: `Billetterie et vols à ${city}`,
    html: `<p>Pour vos billets d’avion, votre agence de voyages à ${escapeHtml(city)} vous accompagne dans la recherche d’un itinéraire adapté à votre projet. Nous comparons avec vous les horaires, les correspondances et les conditions tarifaires afin de retenir une solution cohérente avec vos priorités.</p><p>Notre rôle ne s’arrête pas au prix du billet : nous vous aidons également à comprendre les règles de bagages, les conditions de modification et les services utiles avant le départ. Vous disposez ainsi d’un interlocuteur en agence pour préparer votre voyage et suivre votre réservation.</p>`,
  }),
  stay: (city) => ({
    title: `Séjours et vacances avec votre agence à ${city}`,
    html: `<p>Votre agence de voyages à ${escapeHtml(city)} vous aide à choisir un séjour en fonction de vos envies, de votre budget et du rythme de vacances recherché. Hôtel, club, formule tout compris ou séjour plus libre : nous étudions avec vous les solutions réellement adaptées à votre projet.</p><p>Nous vérifions les éléments essentiels du voyage avant la réservation, notamment les prestations incluses, les conditions du séjour et les possibilités de transport. L’objectif est de construire des vacances lisibles, adaptées et suivies par un conseiller.</p>`,
  }),
  cruise: (city) => ({
    title: `Croisières avec votre agence à ${city}`,
    html: `<p>Votre agence de voyages à ${escapeHtml(city)} vous accompagne dans le choix d’une croisière adaptée à vos dates, à votre budget et à votre façon de voyager. Itinéraire, compagnie, catégorie de cabine et prestations à bord sont examinés avec vous avant la réservation.</p><p>Nous vous aidons également à anticiper les transports vers le port, les formalités et les options utiles afin de disposer d’un voyage cohérent de bout en bout.</p>`,
  }),
  circuit: (city) => ({
    title: `Circuits avec votre agence à ${city}`,
    html: `<p>Pour découvrir plusieurs étapes d’une destination sans organiser seul chaque détail, votre agence de voyages à ${escapeHtml(city)} vous aide à sélectionner un circuit adapté à vos attentes. Nous examinons le rythme du programme, les visites prévues, les hébergements et les temps de transport.</p><p>Cette lecture du programme permet de choisir un voyage cohérent avec votre niveau de confort, le temps disponible et les expériences que vous souhaitez privilégier.</p>`,
  }),
  "tailor-made": (city) => ({
    title: `Voyages sur mesure avec votre agence à ${city}`,
    html: `<p>Un voyage sur mesure part de vos priorités plutôt que d’un programme imposé. Votre agence de voyages à ${escapeHtml(city)} construit avec vous un projet tenant compte des étapes souhaitées, du rythme, des hébergements et du budget disponible.</p><p>Nous assemblons les différentes composantes du séjour afin de rechercher un itinéraire réaliste et équilibré, puis nous vérifions avec vous les prestations avant la réservation.</p>`,
  }),
};

function copyFor(intentKey, city) {
  const factory = COPY[String(intentKey || "")];
  if (!factory) throw error("MSE_25_40_WRITE_INTENT_COPY_UNSUPPORTED", "Aucun contenu éditorial certifié n'est défini pour cette intention.", { intentKey });
  const place = String(city || "").trim();
  if (!place) throw error("MSE_25_40_WRITE_INTENT_CITY_REQUIRED", "La ville persistée de l'agence est requise.", { intentKey });
  return factory(place);
}

function nextPosition(blocks = []) {
  return blocks.reduce((max, block, index) => {
    const value = Number(block?.position ?? block?.displayOrder);
    return Math.max(max, Number.isFinite(value) ? value : index);
  }, -1) + 1;
}

function normalizeCurrentPage(record = {}) {
  const page = clone(record.page || record);
  const siteSlug = String(record.siteSlug || page.siteSlug || "").trim();
  const agencyId = record.agencyId ?? page.agencyId ?? null;
  const pageSlug = normalizedPageSlug(page.slug);
  if (!siteSlug || agencyId == null || !page.title) throw error("MSE_25_40_WRITE_INTENT_CURRENT_PAGE_INVALID", "Snapshot Website Designer V2 incomplet.", { siteSlug, agencyId, pageSlug });
  page.blocks = Array.isArray(page.blocks) ? page.blocks : [];
  return { key: pageKey(siteSlug, pageSlug), siteSlug, agencyId, pageSlug, page };
}

function applyMetadata(page, metadata = {}, details = {}) {
  if (metadata.eligible !== true) return;
  const proposed = metadata.proposed || {};
  if (proposed.rewriteTitle === true) page.seoTitle = proposed.proposedTitle;
  if (proposed.rewriteMetaDescription === true) {
    page.metaDescription = proposed.proposedMetaDescription;
    page.seoDescription = proposed.proposedMetaDescription;
  }
  if (proposed.rewriteH1 === true) {
    const hero = (page.blocks || []).find((block) => normalizedBlockType(block) === "hero");
    if (!hero) throw error("MSE_25_40_WRITE_INTENT_HERO_MISSING", "Le H1 ne peut pas être renforcé car aucun Hero n'est présent.", details);
    hero.content = { ...(hero.content || {}), title: proposed.proposedH1 };
  }
}

function appendSection(page, section, city) {
  const copy = copyFor(section.intentKey, city);
  page.blocks.push({
    type: "rich_text",
    status: "published",
    position: nextPosition(page.blocks),
    content: { title: copy.title, html: copy.html, alignment: "left" },
    settings: {},
    seo: {
      generatedBy: "mse-25.40",
      purpose: "residual-semantic-uplift",
      intentKey: section.intentKey,
    },
    visibleDesktop: true,
    visibleMobile: true,
  });
}

function buildResidualWriteIntent({ residualPlan = {}, currentPages = [] } = {}) {
  if (
    residualPlan.version !== "mse-25.40"
    || residualPlan.operation !== "residual-semantic-execution-plan"
    || residualPlan.readOnly !== true
    || residualPlan.writes !== false
    || residualPlan.policy?.noHomeScoreFilling !== true
    || residualPlan.policy?.automaticWrites !== false
  ) {
    throw error("MSE_25_40_WRITE_INTENT_PLAN_INVALID", "Le write-intent exige un plan résiduel MSE-25.40 scellé et sûr.");
  }

  const map = new Map(currentPages.map((row) => {
    const normalized = normalizeCurrentPage(row);
    return [normalized.key, normalized];
  }));
  const executablePages = (residualPlan.sites || []).flatMap((site) => site.executablePages || []);
  const intents = [];

  for (const candidate of executablePages.sort((a, b) => `${a.siteSlug}:${a.pageSlug}`.localeCompare(`${b.siteSlug}:${b.pageSlug}`, "fr"))) {
    if (candidate.pageSlug === "home" && candidate.eligibleSections?.length) {
      throw error("MSE_25_40_WRITE_INTENT_HOME_FILL_FORBIDDEN", "Une section secondaire ne peut pas être écrite sur la home.", { siteSlug: candidate.siteSlug });
    }
    const key = pageKey(candidate.siteSlug, candidate.pageSlug);
    const current = map.get(key);
    if (!current) throw error("MSE_25_40_WRITE_INTENT_CURRENT_PAGE_MISSING", "Snapshot courant absent pour une page résiduelle.", { key });
    if (Number(current.agencyId) !== Number(candidate.agencyId)) throw error("MSE_25_40_WRITE_INTENT_AGENCY_MISMATCH", "Le snapshot n'appartient pas à l'agence du plan résiduel.", { key });

    const before = saveBody(current.page);
    const beforeFingerprint = digest(before);
    const finalPage = clone(current.page);
    applyMetadata(finalPage, candidate.metadata, { key });
    for (const section of candidate.eligibleSections || []) appendSection(finalPage, section, candidate.city);
    const after = validatedSaveBody(finalPage, { key });
    const afterFingerprint = digest(after);

    if (beforeFingerprint === afterFingerprint) continue;
    intents.push({
      key,
      agencyId: candidate.agencyId,
      siteSlug: candidate.siteSlug,
      pageSlug: candidate.pageSlug,
      residualPageFingerprint: candidate.residualPageFingerprint,
      sourceSnapshotFingerprint: beforeFingerprint,
      targetSnapshotFingerprint: afterFingerprint,
      snapshot: { before, after },
      persistence: {
        method: "PageBuilderPersistenceService.save",
        agencyId: candidate.agencyId,
        pageSlug: candidate.pageSlug,
        body: after,
      },
    });
  }

  const result = {
    version: "mse-25.40",
    operation: "residual-semantic-write-intent",
    readOnly: true,
    writes: false,
    publicWrites: false,
    persistenceCallsPerformed: 0,
    residualExecutionFingerprint: residualPlan.residualExecutionFingerprint,
    summary: {
      executableCandidateCount: executablePages.length,
      touchedPageCount: intents.length,
      snapshotCount: intents.length,
      homeSecondarySectionWriteCount: 0,
    },
    intents,
  };
  return { ...result, writeIntentFingerprint: digest(result) };
}

module.exports = {
  COPY,
  appendSection,
  applyMetadata,
  buildResidualWriteIntent,
  copyFor,
  digest,
  escapeHtml,
  nextPosition,
  normalizeCurrentPage,
  pageKey,
};
