"use strict";

const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const TARGET_SITE_SLUG = process.env.MSE_25_197_SITE_SLUG || "mondescale-lamorlaye";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const SNAPSHOT_PATH = process.env.MSE_25_197_SNAPSHOT || "/var/tmp/mse-25-197-lamorlaye-seo-editorial-v1.snapshot.json";
const APPLY = String(process.env.MSE_25_197_CONFIRM || "").toLowerCase() === "true";
const ROLLBACK = String(process.env.MSE_25_197_ROLLBACK || "").toLowerCase() === "true";
const CONTROL_CITIES = ["Bois-Colombes", "Ozoir-la-Ferrière"];
const MEDIA_KEYS = [
  "imageAssetId", "imageUrl", "image", "photo", "photoUrl", "photoAsset",
  "avatar", "avatarUrl", "portrait", "portraitUrl", "portraitAsset", "media",
  "asset", "picture", "pictureUrl", "profileImage", "profileImageUrl",
  "profilePhoto", "profilePhotoUrl", "imageAlt",
];

const HOME_SEO = Object.freeze({
  title: "Agence de voyages à Lamorlaye | Mondescale",
  h1: "Agence de voyages à Lamorlaye",
  metaDescription: "Mondescale, agence de voyages à Lamorlaye près de Chantilly et Gouvieux. Séjours, circuits, croisières, voyages sur mesure et billetterie avec les conseils de Stéphanie.",
});

const SERVICE_ITEMS = Object.freeze([
  { id: "sejours-clubs", title: "Séjours & clubs", text: "Pour des vacances en hôtel ou en club, Stéphanie vous aide à comparer les formules, les pensions, les catégories de chambre et les services inclus afin de choisir une proposition adaptée à votre projet." },
  { id: "circuits-accompagnes", title: "Circuits accompagnés", text: "Pour découvrir plusieurs étapes au cours d’un même voyage, l’agence étudie avec vous l’itinéraire, le rythme du circuit, les prestations prévues et les conditions du programme proposé par le voyagiste." },
  { id: "voyages-sur-mesure", title: "Voyages sur mesure", text: "Un projet plus personnel peut être construit à partir de vos dates, de vos envies, de votre budget et du rythme souhaité, en combinant les prestations disponibles auprès des partenaires référencés." },
  { id: "autotours", title: "Autotours", text: "Pour voyager avec davantage de liberté, l’agence peut étudier un itinéraire en autotour avec les étapes, hébergements et prestations nécessaires, selon les solutions disponibles pour votre destination." },
  { id: "croisieres", title: "Croisières", text: "Méditerranée, Europe ou destinations plus lointaines : l’agence vous accompagne dans la lecture des itinéraires, des catégories de cabine, des prestations à bord et des conditions proposées par les compagnies référencées." },
  { id: "famille", title: "Voyages en famille", text: "Pour un voyage en famille, l’agence prend en compte l’âge des voyageurs, le rythme du séjour, la configuration des chambres, les transports et les prestations utiles à votre organisation." },
  { id: "voyages-de-noces", title: "Voyages de noces & grands voyages", text: "Pour un voyage de noces ou un grand voyage, Stéphanie vous aide à construire un projet cohérent avec vos envies, votre calendrier et votre budget, sans imposer une formule unique." },
  { id: "groupes", title: "Voyages en groupe", text: "Associations, familles, amis ou autres groupes constitués peuvent présenter leur projet à l’agence afin d’étudier l’organisation et les prestations disponibles selon la demande." },
  { id: "billets-avion", title: "Billets d’avion", text: "L’agence peut étudier des itinéraires aériens, notamment depuis Paris-Charles-de-Gaulle (CDG) et Paris-Orly (ORY), en vérifiant les conditions tarifaires, les bagages et les correspondances applicables à la proposition retenue." },
  { id: "billets-train", title: "Billets de train", text: "Pour un trajet ferroviaire en France ou en Europe, l’agence peut rechercher une solution disponible et vous aider à lire les conditions du billet, les horaires et les correspondances avant réservation." },
]);

const PAGE_ALIASES = Object.freeze({
  home: ["", "home", "accueil", "index"],
  services: ["services"],
  team: ["equipe", "équipe", "team"],
  contact: ["contact"],
  agency: ["agence", "notre-agence", "qui-sommes-nous"],
  destinations: ["destinations"],
});

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function typeOf(block) { return normalize(block?.blockType || ""); }
function contentOf(block) { return block?.content && typeof block.content === "object" && !Array.isArray(block.content) ? clone(block.content) : {}; }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.keys(value).sort().reduce((acc, key) => { acc[key] = stable(value[key]); return acc; }, {});
  return value;
}
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex"); }

function pageByKind(site, kind) {
  const aliases = new Set((PAGE_ALIASES[kind] || []).map(normalize));
  return (site.pages || []).find((page) => aliases.has(normalize(page.slug))) || null;
}

function memberArrays(content) {
  return ["members", "items", "team", "teamMembers"].map((key) => ({ key, value: content?.[key] })).filter((entry) => Array.isArray(entry.value));
}

function mediaReferenceKeys(member) {
  return MEDIA_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(member || {}, key));
}

function findStephanie(site) {
  const home = pageByKind(site, "home");
  const orderedPages = [home, ...(site.pages || []).filter((page) => page && page.id !== home?.id)].filter(Boolean);
  for (const page of orderedPages) {
    const blocks = [...(page.blocks || [])].sort((a, b) => {
      const aPublished = String(a?.status || "").toLowerCase() === "published" ? 0 : 1;
      const bPublished = String(b?.status || "").toLowerCase() === "published" ? 0 : 1;
      return aPublished - bPublished || Number(a?.displayOrder || 0) - Number(b?.displayOrder || 0);
    });
    for (const block of blocks) {
      if (!["team", "equipe", "team-grid", "equipe-grid"].includes(typeOf(block))) continue;
      const content = contentOf(block);
      for (const collection of memberArrays(content)) {
        const index = collection.value.findIndex((member) => normalize(member?.name || member?.title).includes("stephanie"));
        if (index < 0) continue;
        const member = clone(collection.value[index]);
        return {
          page, block, content, collectionKey: collection.key, index, member,
          mediaKeys: mediaReferenceKeys(member),
        };
      }
    }
  }
  return null;
}

function routeFingerprint(site) {
  return hash((site.pages || []).map((page) => ({
    id: page.id, slug: page.slug, path: page.path, pageType: page.pageType,
    menuTitle: page.menuTitle, menuLocation: page.menuLocation, displayOrder: page.displayOrder,
    schemaType: page.schemaType, status: page.status, published: page.published,
  })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
}

function fullFingerprint(site) {
  return hash({
    site: { id: site.id, slug: site.slug, basePath: site.basePath, status: site.status, theme: site.theme },
    agency: site.agency,
    pages: (site.pages || []).map((page) => ({
      id: page.id, title: page.title, slug: page.slug, path: page.path, pageType: page.pageType,
      menuTitle: page.menuTitle, menuLocation: page.menuLocation, displayOrder: page.displayOrder,
      seoTitle: page.seoTitle, metaDescription: page.metaDescription, h1: page.h1,
      schemaType: page.schemaType, status: page.status, published: page.published,
      blocks: (page.blocks || []).map((block) => ({ id: block.id, blockType: block.blockType, name: block.name, content: block.content, settings: block.settings, seo: block.seo, displayOrder: block.displayOrder, status: block.status, visibleDesktop: block.visibleDesktop, visibleMobile: block.visibleMobile, version: block.version })),
    })),
  });
}

function destinationFingerprint(site) {
  const page = pageByKind(site, "destinations");
  return page ? hash({ page: { title: page.title, seoTitle: page.seoTitle, metaDescription: page.metaDescription, h1: page.h1 }, blocks: page.blocks }) : null;
}

function compactSpaces(value) { return String(value || "").replace(/\s{2,}/g, " ").replace(/\s+([,.;:])/g, "$1").trim(); }
function sanitizeString(value) {
  return compactSpaces(String(value || "")
    .replace(/agence\s+haut\s+de\s+gamme/gi, "agence de voyages")
    .replace(/conciergerie\s*24\s*\/?\s*7/gi, "accompagnement en agence")
    .replace(/service\s+de\s+conciergerie\s*24\s*\/?\s*7/gi, "accompagnement en agence")
    .replace(/Relais\s*&\s*Ch[âa]teaux/gi, ""));
}
function sanitizeEditorial(value) {
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map(sanitizeEditorial);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sanitizeEditorial(child)]));
}

function homeBlocks() {
  return [
    {
      name: "lamorlaye-editorial-intro-v1", blockType: "rich_text",
      content: {
        title: "Une agence de voyages pour construire le voyage qui vous correspond",
        html: "<p>À Lamorlaye, Mondescale vous accompagne dans la préparation de vos vacances et déplacements, que vous habitiez Lamorlaye, Gouvieux, Chantilly, Coye-la-Forêt ou Orry-la-Ville. Stéphanie prend le temps d’étudier votre projet et de comparer les solutions disponibles auprès des voyagistes référencés afin de construire avec vous un séjour, un circuit, une croisière, un autotour ou un voyage sur mesure.</p>",
      },
    },
    {
      name: "lamorlaye-trip-types-v1", blockType: "features",
      content: {
        title: "Quel voyage préparez-vous ?", columns: 3,
        introduction: "Des vacances en club au grand voyage, votre projet est étudié selon vos dates, vos envies, votre budget et les solutions disponibles.",
        items: [
          SERVICE_ITEMS[0], SERVICE_ITEMS[1], SERVICE_ITEMS[2], SERVICE_ITEMS[3], SERVICE_ITEMS[4], SERVICE_ITEMS[6],
        ].map(({ id, title, text }) => ({ id, title, text })),
      },
    },
    {
      name: "lamorlaye-catchment-v1", blockType: "rich_text",
      content: {
        title: "Votre agence de voyages à Lamorlaye et autour de Chantilly",
        html: "<p>L’agence accueille les voyageurs de Lamorlaye et des communes voisines, notamment Gouvieux, Chantilly, Coye-la-Forêt et Orry-la-Ville. Cette proximité permet d’échanger en agence sur votre projet et de disposer d’un interlocuteur pour la préparation et le suivi du dossier.</p>",
      },
    },
    {
      name: "lamorlaye-ticketing-v1", blockType: "rich_text",
      content: {
        title: "Billets d’avion et de train depuis votre agence de Lamorlaye",
        html: "<p>Pour vos déplacements, l’agence peut étudier des billets d’avion et de train. Pour l’aérien, les itinéraires peuvent notamment être recherchés depuis Paris-Charles-de-Gaulle (CDG) et Paris-Orly (ORY), selon les vols disponibles. Avant réservation, Stéphanie peut vous aider à vérifier les conditions tarifaires, les bagages et les correspondances applicables à l’itinéraire proposé.</p>",
      },
    },
  ];
}

function serviceContent(existing) {
  return {
    ...sanitizeEditorial(existing),
    title: "Billets d'avion et de train à Lamorlaye",
    introduction: "Séjours, circuits, voyages sur mesure, autotours, croisières, vacances en famille, voyages de noces, groupes et billetterie : découvrez les services proposés par votre agence de voyages à Lamorlaye.",
    items: SERVICE_ITEMS.map(clone),
  };
}

function contactContent() {
  return {
    title: "Venir dans votre agence de voyages à Lamorlaye",
    html: "<p>Votre agence Mondescale à Lamorlaye accueille également les voyageurs de Gouvieux, Chantilly, Coye-la-Forêt et Orry-la-Ville. Pour préparer votre venue, utilisez les horaires, l’adresse, le téléphone et les autres coordonnées affichés sur cette page : ces informations proviennent des données structurées de l’agence et ne sont pas dupliquées dans ce texte.</p><p>En agence, vous pouvez présenter vos dates, votre budget, le nombre de voyageurs et vos premières envies afin d’étudier un séjour, un circuit, une croisière, un voyage sur mesure ou un besoin de billetterie.</p>",
  };
}

function agencyContent() {
  return {
    title: "Votre agence Mondescale à Lamorlaye",
    html: "<p>À Lamorlaye, l’accompagnement commence par l’écoute de votre projet. Stéphanie étudie avec vous les possibilités correspondant à vos dates, à votre budget et à votre manière de voyager, puis vous aide à comparer les propositions disponibles auprès des voyagistes référencés.</p><p>L’agence peut vous accompagner pour un séjour, un circuit accompagné, un autotour, un voyage sur mesure, une croisière ou de la billetterie, avec un interlocuteur en agence pour la préparation et le suivi de votre dossier.</p>",
  };
}

function teamEditorialContent() {
  return {
    title: "Stéphanie — Conseillère voyage à Lamorlaye",
    html: `<p>${stephaniePresentation()}</p>`,
  };
}

function stephaniePresentation() {
  return "Stéphanie accompagne les voyageurs de l’agence de Lamorlaye dans la préparation de leurs séjours, circuits accompagnés, autotours, voyages sur mesure et croisières. Elle prend en compte les dates, le budget, le rythme souhaité et les prestations utiles afin d’étudier les solutions disponibles et de construire le projet avec le client.";
}

async function loadSites(tenantId) {
  return prisma.agencySite.findMany({
    where: { tenantId }, include: { agency: true, pages: { include: { blocks: { orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } } },
  });
}

function assertTarget(site) {
  if (!site) throw new Error(`MSE-25.197: site exact introuvable: ${TARGET_SITE_SLUG}`);
  if (site.slug !== TARGET_SITE_SLUG) throw new Error(`MSE-25.197: slug inattendu: ${site.slug}`);
  if (normalize(site.agency?.city) !== "lamorlaye") throw new Error(`MSE-25.197: garde-fou ville refusé: ${site.agency?.city || "absente"}`);
}

function existingNamedBlock(page, name) { return (page.blocks || []).find((block) => block.name === name) || null; }
function firstBlockOfTypes(page, types) { const accepted = new Set(types.map(normalize)); return (page.blocks || []).find((block) => accepted.has(typeOf(block))) || null; }
function nextOrder(page) { return Math.max(-1, ...(page.blocks || []).map((block) => Number(block.displayOrder) || 0)) + 1; }
function blockSnapshot(block) {
  return { id: block.id, pageId: block.pageId, content: clone(block.content), blockType: block.blockType, name: block.name, displayOrder: block.displayOrder, status: block.status, visibleDesktop: block.visibleDesktop, visibleMobile: block.visibleMobile, version: block.version, settings: clone(block.settings), seo: clone(block.seo) };
}

async function upsertBlock(tx, page, spec, snapshot) {
  const existing = existingNamedBlock(page, spec.name);
  if (existing) {
    snapshot.updatedBlocks.push(blockSnapshot(existing));
    await tx.pageBlock.update({ where: { id: existing.id }, data: { blockType: spec.blockType, content: spec.content, status: "published", visibleDesktop: true, visibleMobile: true, version: existing.version + 1 } });
    return existing.id;
  }
  const created = await tx.pageBlock.create({ data: { pageId: page.id, blockType: spec.blockType, name: spec.name, content: spec.content, settings: {}, seo: {}, displayOrder: nextOrder(page) + snapshot.createdBlocks.filter((item) => item.pageId === page.id).length, status: "published", visibleDesktop: true, visibleMobile: true } });
  snapshot.createdBlocks.push({ id: created.id, pageId: page.id });
  return created.id;
}

async function applyChanges(site, controlsBefore) {
  const home = pageByKind(site, "home");
  const services = pageByKind(site, "services");
  const teamPage = pageByKind(site, "team");
  const contact = pageByKind(site, "contact");
  const agency = pageByKind(site, "agency");
  if (!home || !services || !contact) throw new Error("MSE-25.197: home, services ou contact existant introuvable; aucune page ne sera créée");

  const stephanie = findStephanie(site);
  if (!stephanie) throw new Error("MSE-25.197: entité Stéphanie existante introuvable dans un bloc Équipe");
  if (!stephanie.mediaKeys.length) throw new Error("MSE-25.197: aucun champ média existant sur Stéphanie; refus de créer un nouveau média");
  if (normalize(stephanie.page.slug) !== "home") throw new Error(`MSE-25.197: Stéphanie n'est pas issue du bloc Équipe de la home (${stephanie.page.slug})`);

  const snapshot = { mse: "25.197", siteId: site.id, siteSlug: site.slug, createdAt: new Date().toISOString(), pages: [], updatedBlocks: [], createdBlocks: [] };
  snapshot.pages.push({ id: home.id, seoTitle: home.seoTitle, metaDescription: home.metaDescription, h1: home.h1 });
  snapshot.updatedBlocks.push(blockSnapshot(stephanie.block));
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), { flag: "wx", mode: 0o600 });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.agencySitePage.update({ where: { id: home.id }, data: { seoTitle: HOME_SEO.title, metaDescription: HOME_SEO.metaDescription, h1: HOME_SEO.h1 } });

      const teamContent = contentOf(stephanie.block);
      const list = clone(teamContent[stephanie.collectionKey]);
      const originalMember = clone(list[stephanie.index]);
      list[stephanie.index] = { ...originalMember, name: originalMember.name || "Stéphanie", role: "Conseillère voyage", presentation: stephaniePresentation() };
      await tx.pageBlock.update({ where: { id: stephanie.block.id }, data: { content: { ...teamContent, title: "Stéphanie, votre conseillère voyage à Lamorlaye", text: "Un accompagnement en agence pour construire votre projet de voyage.", [stephanie.collectionKey]: list }, version: stephanie.block.version + 1 } });

      for (const spec of homeBlocks()) await upsertBlock(tx, home, spec, snapshot);

      const servicesBlock = firstBlockOfTypes(services, ["features", "services", "services-grid", "services-highlight", "cards"]);
      if (!servicesBlock) {
        await upsertBlock(tx, services, { name: "lamorlaye-services-editorial-v1", blockType: "services-grid", content: serviceContent({}) }, snapshot);
      } else {
        snapshot.updatedBlocks.push(blockSnapshot(servicesBlock));
        await tx.pageBlock.update({ where: { id: servicesBlock.id }, data: { content: serviceContent(contentOf(servicesBlock)), status: "published", visibleDesktop: true, visibleMobile: true, version: servicesBlock.version + 1 } });
      }

      if (teamPage) await upsertBlock(tx, teamPage, { name: "lamorlaye-team-editorial-v1", blockType: "rich_text", content: teamEditorialContent() }, snapshot);
      await upsertBlock(tx, contact, { name: "lamorlaye-contact-editorial-v1", blockType: "rich_text", content: contactContent() }, snapshot);
      if (agency) await upsertBlock(tx, agency, { name: "lamorlaye-agency-editorial-v1", blockType: "rich_text", content: agencyContent() }, snapshot);

      const partners = firstBlockOfTypes(home, ["partners", "logos", "partner-logos"]);
      if (partners) {
        snapshot.updatedBlocks.push(blockSnapshot(partners));
        await tx.pageBlock.update({ where: { id: partners.id }, data: { content: { ...contentOf(partners), title: "Plusieurs voyagistes, un seul conseiller", text: "Votre agence s’appuie uniquement sur les marques et partenaires actuellement référencés par Mondescale pour étudier les solutions correspondant à votre projet." }, version: partners.version + 1 } });
      } else {
        await upsertBlock(tx, home, { name: "lamorlaye-partners-v1", blockType: "partners", content: { title: "Plusieurs voyagistes, un seul conseiller", text: "Votre agence s’appuie uniquement sur les marques et partenaires actuellement référencés par Mondescale pour étudier les solutions correspondant à votre projet." } }, snapshot);
      }

      const reviews = firstBlockOfTypes(home, ["reviews"]);
      if (!reviews) await upsertBlock(tx, home, { name: "lamorlaye-google-reviews-v1", blockType: "reviews", content: { title: "Les avis Google de votre agence à Lamorlaye", limit: 3 } }, snapshot);
    });
  } catch (error) {
    if (fs.existsSync(SNAPSHOT_PATH)) fs.unlinkSync(SNAPSHOT_PATH);
    throw error;
  }

  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), { mode: 0o600 });
  const freshSites = await loadSites(site.tenantId);
  const fresh = freshSites.find((candidate) => candidate.id === site.id);
  const controlsAfter = Object.fromEntries(CONTROL_CITIES.map((city) => {
    const control = freshSites.find((candidate) => normalize(candidate.agency?.city) === normalize(city));
    return [city, control ? fullFingerprint(control) : null];
  }));

  if (routeFingerprint(fresh) !== routeFingerprint(site)) throw new Error("MSE-25.197: régression topologie Lamorlaye détectée après écriture");
  if (destinationFingerprint(fresh) !== destinationFingerprint(site)) throw new Error("MSE-25.197: la page Destinations Lamorlaye a changé alors qu’elle est hors périmètre V1");
  for (const city of CONTROL_CITIES) if (controlsBefore[city] !== controlsAfter[city]) throw new Error(`MSE-25.197: régression hors Lamorlaye détectée sur ${city}`);
  return { fresh, snapshot, controlsAfter };
}

async function rollback(site) {
  if (!fs.existsSync(SNAPSHOT_PATH)) throw new Error(`MSE-25.197: snapshot absent: ${SNAPSHOT_PATH}`);
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
  if (snapshot.siteId !== site.id || snapshot.siteSlug !== site.slug) throw new Error("MSE-25.197: snapshot incompatible avec le site courant");
  await prisma.$transaction(async (tx) => {
    for (const block of snapshot.createdBlocks || []) await tx.pageBlock.delete({ where: { id: block.id } });
    for (const block of snapshot.updatedBlocks || []) await tx.pageBlock.update({ where: { id: block.id }, data: { blockType: block.blockType, name: block.name, content: block.content, settings: block.settings, seo: block.seo, displayOrder: block.displayOrder, status: block.status, visibleDesktop: block.visibleDesktop, visibleMobile: block.visibleMobile, version: block.version } });
    for (const page of snapshot.pages || []) await tx.agencySitePage.update({ where: { id: page.id }, data: { seoTitle: page.seoTitle, metaDescription: page.metaDescription, h1: page.h1 } });
  });
  return snapshot;
}

async function main() {
  if (APPLY && ROLLBACK) throw new Error("MSE-25.197: APPLY et ROLLBACK sont mutuellement exclusifs");
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`MSE-25.197: tenant introuvable: ${TENANT_SLUG}`);
  const sites = await loadSites(tenant.id);
  const site = sites.find((candidate) => candidate.slug === TARGET_SITE_SLUG);
  assertTarget(site);

  const home = pageByKind(site, "home");
  const services = pageByKind(site, "services");
  const team = pageByKind(site, "team");
  const contact = pageByKind(site, "contact");
  const agency = pageByKind(site, "agency");
  const destinations = pageByKind(site, "destinations");
  const stephanie = findStephanie(site);
  const controlsBefore = Object.fromEntries(CONTROL_CITIES.map((city) => {
    const control = sites.find((candidate) => normalize(candidate.agency?.city) === normalize(city));
    return [city, control ? fullFingerprint(control) : null];
  }));

  if (!home || !services || !contact) throw new Error("MSE-25.197: préconditions pages home/services/contact non satisfaites");
  if (!stephanie) throw new Error("MSE-25.197: précondition Stéphanie existante non satisfaite");
  if (!stephanie.mediaKeys.length) throw new Error("MSE-25.197: aucun champ média existant sur Stéphanie");
  if (normalize(stephanie.page.slug) !== "home") throw new Error(`MSE-25.197: le profil Stéphanie attendu sur la home a été trouvé sur ${stephanie.page.slug}`);
  if (Object.values(controlsBefore).some((value) => !value)) throw new Error("MSE-25.197: agence témoin Bois-Colombes ou Ozoir introuvable");

  if (ROLLBACK) {
    const snapshot = await rollback(site);
    console.log(JSON.stringify({ mse: "25.197", mode: "ROLLBACK", site: site.slug, restoredBlocks: snapshot.updatedBlocks.length, removedBlocks: snapshot.createdBlocks.length, snapshot: SNAPSHOT_PATH }, null, 2));
    return;
  }

  const report = {
    mse: "25.197", mode: APPLY ? "APPLY" : "DRY_RUN", tenant: tenant.slug, site: site.slug,
    preconditions: {
      home: home.slug, services: services.slug, team: team?.slug || null, contact: contact.slug,
      agency: agency?.slug || null, destinations: destinations?.slug || null,
      stephaniePage: stephanie.page.slug, stephanieBlockId: stephanie.block.id,
      stephanieMediaKeys: stephanie.mediaKeys,
    },
    protected: {
      siteRouteFingerprint: routeFingerprint(site), destinationFingerprint: destinationFingerprint(site),
      controls: controlsBefore,
    },
    planned: {
      homeSeo: HOME_SEO,
      homeEditorialBlocks: homeBlocks().map((block) => ({ name: block.name, type: block.blockType, title: block.content.title })),
      homeTeam: "enrich existing published Stéphanie member in place; preserve all existing media fields",
      services: SERVICE_ITEMS.map((item) => item.title),
      team: team ? "add editorial profile copy only; no new Person identity or media" : "team page absent; no page creation",
      contact: "local geographic context only; structured NAP untouched",
      partners: "renderer-backed existing Mondescale partner catalog only",
      reviews: "Google Business Profile synchronized renderer only",
      destinations: "unchanged",
      networkWrites: 0,
    },
  };

  if (!APPLY) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (fs.existsSync(SNAPSHOT_PATH)) throw new Error(`MSE-25.197: snapshot déjà présent (${SNAPSHOT_PATH}); archiver/supprimer uniquement après validation ou rollback`);
  const result = await applyChanges(site, controlsBefore);
  report.result = {
    snapshot: SNAPSHOT_PATH,
    createdBlocks: result.snapshot.createdBlocks.length,
    updatedBlocks: result.snapshot.updatedBlocks.length,
    routeFingerprintUnchanged: routeFingerprint(result.fresh) === routeFingerprint(site),
    destinationsUnchanged: destinationFingerprint(result.fresh) === destinationFingerprint(site),
    controlSitesUnchanged: Object.fromEntries(CONTROL_CITIES.map((city) => [city, controlsBefore[city] === result.controlsAfter[city]])),
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
