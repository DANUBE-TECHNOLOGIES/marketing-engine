const { createSitePublicationRoutes } = require("./modules/site-publication");
const express = require("express");
const createAutomationLogsRoutes = require("./routes/automationLogs");
const createKnowledgeGraphRoutes = require("./routes/knowledgeGraph");
const createPageBuilderRoutes = require("./routes/pageBuilder");
const createDestinationKnowledgeRoutes = require("./routes/destinationKnowledge");
const createRecommendationRoutes = require("./modules/recommendation/routes");
const createContentEngineRoutes = require("./modules/content-engine/routes");
const createPublicationRoutes = require("./modules/publication-engine/routes");
const createJobsRoutes = require("./modules/jobs-engine/routes");
const createSearchRoutes = require("./modules/search-engine/routes");
const createSeoEmailRoutes = require("./routes/seoEmail");
const createSeoReportRoutes = require("./routes/seoReport");
const createDailyAutomationRoutes = require("./routes/dailyAutomation");
const createSeoActionsRoutes = require("./routes/seoActions");
const createGoogleOAuthRoutes = require("./routes/googleOAuth");
const createPriorityRoutes = require("./routes/priorities");
const createCitationAutomationRoutes = require("./routes/citationAutomation");
const createLocalSeoActionsRoutes = require("./routes/localSeoActions");
const createLocalSeoScoreRoutes = require("./routes/localSeoScore");
const createCitationAutoSubmitRoutes = require("./routes/citationAutoSubmit");
const createDirectoriesRoutes = require("./routes/directories");
const createReviewsRoutes = require("./routes/reviews");
const createRankingsRoutes = require("./routes/rankings");
const createSeoRegressionRoutes = require("./routes/seoRegressionAlerts");
const createSeoMovementsRoutes = require("./routes/seoMovements");
const createSeoHistoryRoutes = require("./routes/seoHistory");
const createReviewAutomationRoutes = require("./routes/reviewAutomation");
const createReviewCampaignRoutes = require("./routes/reviewCampaigns");
const createReviewEngineRoutes = require("./routes/reviewEngine");
const createReviewResponsesRoutes = require("./routes/reviewResponses");
const createReviewNetworkRoutes = require("./routes/reviewNetwork");
const createSeoPlannerRoutes = require("./routes/seoPlanner");
const createGooglePostsRoutes = require("./routes/googlePosts");
const createGooglePostsSeoEngineRoutes = require("./routes/googlePostsSeoEngine");
const createGooglePostsBulkRoutes = require("./routes/googlePostsBulk");
const createGooglePostsDashboardRoutes = require("./routes/googlePostsDashboard");
const createGooglePostsAutoApprovalRoutes = require("./routes/googlePostsAutoApproval");
const createGooglePostImagesRoutes = require("./routes/googlePostImages");
const createGooglePostImageLibraryRoutes = require("./routes/googlePostImageLibrary");
const createGooglePostsSeoScoreRoutes = require("./routes/googlePostsSeoScore");
const createGooglePostsAntiRepeatRoutes = require("./routes/googlePostsAntiRepeat");
const createGooglePostsSimilarityRoutes = require("./routes/googlePostsSimilarity");
const createGooglePostsSchedulerRoutes = require("./routes/googlePostsScheduler");
const createGooglePostImpactRoutes = require("./routes/googlePostImpact");
const createGooglePostsQueueRoutes = require("./routes/googlePostsQueue");
const createGooglePostsEditorialRoutes = require("./routes/googlePostsEditorial");
const createNetworkActionsRoutes = require("./routes/networkActions");
const createNetworkAutomationRoutes = require("./routes/networkAutomation");
const createPublicCatalogRoutes = require("./routes/publicCatalog");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const cron = require("node-cron");
const agencyDirectory = require("./data/agencyDirectory");
const maintenanceLog = require("./data/maintenanceLog");
const dataForSeoConfig = require("./config/dataForSeo");
const refreshGoogleAccessToken = require("./lib/googleAccessToken");
const fetchGoogleReviews = require("./lib/googleReviews");
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const registerModules = require("./modules/register-modules");
const { errorMiddleware } = require("./core/errors");
const path = require("node:path");
const {
  createBrandAssetRouter,
} = require("./modules/brand-assets/routes");
const {
  createBrandProfileRouter,
} = require("./modules/brand-profile/routes");
const { createLegalProfileRouter } = require("./modules/legal-profile/routes");
const {
  createPublicBrandLegalRouter,
} = require("./modules/public-brand-legal/routes");
const { createPublicSiteReadRouter } = require("./modules/public-site-read/routes");
const { createAgencyLaunchRouter } = require("./modules/agency-launch/routes");

const {
  createTemplateLibraryRouter,
} = require("./modules/template-library/api-router");

const {
  createContentComposerRouter,
} = require("./modules/content-composer");





const app = express();
const prisma = new PrismaClient();
const getGoogleAccessToken = () => refreshGoogleAccessToken(prisma);

app.use(cors());
app.use(express.json());


/**
 * Runtimes modulaires Mondescale.
 */
registerModules(app, { prisma });
app.use(createPublicCatalogRoutes(prisma));
app.use(createAutomationLogsRoutes());
app.use(createKnowledgeGraphRoutes(prisma));
app.use(createPageBuilderRoutes(prisma));
app.use(createDestinationKnowledgeRoutes(prisma));
app.use(createRecommendationRoutes(prisma));
app.use(createContentEngineRoutes(prisma));
app.use(createPublicationRoutes(prisma));
app.use(createJobsRoutes(prisma));
app.use(createSearchRoutes(prisma));
app.use(createSeoEmailRoutes(prisma));
app.use(createSeoReportRoutes(prisma));
app.use(createDailyAutomationRoutes(prisma, process.env.PORT || 4000));
app.use(createSeoActionsRoutes(prisma));
app.use(createGoogleOAuthRoutes(prisma));
app.use(createPriorityRoutes(prisma));
app.use(createCitationAutomationRoutes(prisma));
app.use(createCitationAutoSubmitRoutes(prisma));
app.use(createLocalSeoScoreRoutes(prisma));
app.use(createLocalSeoActionsRoutes(prisma));
app.use(createDirectoriesRoutes(prisma));
app.use(createReviewsRoutes(prisma));
app.use(createNetworkActionsRoutes(prisma));
app.use(createGooglePostsRoutes(prisma));
app.use(createGooglePostsEditorialRoutes(prisma));
app.use(createGooglePostsSeoEngineRoutes(prisma));
app.use(createGooglePostsQueueRoutes(prisma));
app.use(createGooglePostsBulkRoutes(prisma));
app.use(createGooglePostsDashboardRoutes(prisma));
app.use(createGooglePostsAutoApprovalRoutes(prisma));
app.use(createGooglePostImagesRoutes(prisma));
app.use(createGooglePostImageLibraryRoutes(prisma));
app.use(createGooglePostImpactRoutes(prisma));
app.use(createGooglePostsSeoScoreRoutes(prisma));
app.use(createGooglePostsAntiRepeatRoutes(prisma));
app.use(createGooglePostsSimilarityRoutes(prisma));
app.use(createGooglePostsSchedulerRoutes(prisma));
app.use(createSeoPlannerRoutes(prisma));
app.use(createReviewAutomationRoutes(prisma));
app.use(createReviewCampaignRoutes(prisma));
app.use(createReviewEngineRoutes(prisma));
app.use(createReviewNetworkRoutes(prisma));
app.use(createReviewResponsesRoutes(prisma));
app.use(createSeoHistoryRoutes(prisma));
app.use(createSeoMovementsRoutes(prisma));
app.use(createSeoRegressionRoutes(prisma));


app.post("/google/refresh-token", async (req,res)=>{

  try{

    const token =
      await prisma.googleToken.findFirst({
        orderBy:{
          createdAt:"desc"
        }
      });

    if(!token){
      return res.status(404).json({
        error:"Aucun token Google en base"
      });
    }

    if(!token.refreshToken){
      return res.status(400).json({
        error:"Refresh token absent"
      });
    }

    const body =
      new URLSearchParams({
        client_id:process.env.GOOGLE_CLIENT_ID,
        client_secret:process.env.GOOGLE_CLIENT_SECRET,
        refresh_token:token.refreshToken,
        grant_type:"refresh_token"
      });

    const googleRes =
      await fetch(
        "https://oauth2.googleapis.com/token",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/x-www-form-urlencoded"
          },
          body
        }
      );

    const data =
      await googleRes.json();

    if(!googleRes.ok){
      return res.status(googleRes.status).json(data);
    }

    const expiryDate =
      Date.now() +
      Number(data.expires_in || 3600) * 1000;

    const updated =
      await prisma.googleToken.update({
        where:{
          id:token.id
        },
        data:{
          accessToken:data.access_token,
          expiryDate:BigInt(expiryDate)
        }
      });

    res.json({
      ok:true,
      id:updated.id,
      expiryDate:String(updated.expiryDate),
      hasAccessToken:Boolean(updated.accessToken),
      hasRefreshToken:Boolean(updated.refreshToken)
    });

  }catch(e){

    res.status(500).json({
      error:e.message
    });

  }

});



app.get("/google/accounts", async (req,res)=>{

  try{

    const refreshRes =
      await fetch("http://localhost:4000/google/refresh-token", {
        method:"POST"
      });

    if(!refreshRes.ok){
      const err = await refreshRes.text();
      return res.status(refreshRes.status).send(err);
    }

    const token =
      await prisma.googleToken.findFirst({
        orderBy:{
          createdAt:"desc"
        }
      });

    const googleRes =
      await fetch(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        {
          headers:{
            Authorization:`Bearer ${token.accessToken}`
          }
        }
      );

    const text =
      await googleRes.text();

    res.status(googleRes.status)
      .set("Content-Type","application/json")
      .send(text);

  }catch(e){

    res.status(500).json({
      error:e.message
    });

  }

});


app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend opérationnel"
  });
});

app.get("/agencies", async (req, res) => {
  const agencies = await prisma.agency.findMany({
    orderBy: { city: "asc" }
  });

  res.json(agencies);
});

app.get("/directories", async (req, res) => {
  const directories = await prisma.localDirectory.findMany({
    where: { active: true },
    orderBy: [
      { priority: "asc" },
      { impactScore: "desc" },
      { name: "asc" }
    ]
  });

  res.json(directories);
});


// Directory listings déplacé vers routes/directories.js



app.get("/dashboard", async (req, res) => {
  const agencies = await prisma.agency.findMany({
    include: {
      directoryListings: {
        include: {
          directory: true
        }
      }
    },
    orderBy: { city: "asc" }
  });

  const directories = await prisma.localDirectory.findMany({
    where: { active: true }
  });

  const directoriesTotal = directories.length;

  const criticalDirectories = directories.filter(
    (directory) => directory.priority === 1 || directory.impactScore >= 5
  );

  const dashboard = agencies.map((agency) => {
    const listings = agency.directoryListings;

    const ok = listings.filter((l) => l.status === "ok").length;
    const toCorrect = listings.filter((l) => l.status === "to_correct").length;
    const pending = listings.filter((l) => l.status === "pending").length;
    const ignored = listings.filter((l) => l.status === "ignored").length;

    const trackedDirectoryIds = listings.map((l) => l.directoryId);

    const missing = directories.filter(
      (directory) =>
        !trackedDirectoryIds.includes(directory.id)
    ).length;

    const criticalMissing = criticalDirectories.filter(
      (directory) =>
        !trackedDirectoryIds.includes(directory.id) ||
        listings.find((l) => l.directoryId === directory.id)?.status !== "ok"
    );

    const citationScore =
      directoriesTotal > 0
        ? Math.round((ok / directoriesTotal) * 100)
        : 0;

    let priority = "Faible";

    if (criticalMissing.length > 0) {
      priority = "Haute";
    } else if (toCorrect > 0 || missing > 5) {
      priority = "Moyenne";
    }

    return {
      id: agency.id,
      name: agency.name,
      city: agency.city,
      directoriesTotal,
      directoriesOk: ok,
      directoriesToCorrect: toCorrect,
      directoriesPending: pending,
      directoriesIgnored: ignored,
      directoriesMissing: missing,
      criticalMissingCount: criticalMissing.length,
      criticalMissingNames: criticalMissing.map((d) => d.name),
      citationScore,
      priority
    };
  });

  res.json(dashboard);
});

const PORT = process.env.PORT || 4000;
app.use(createNetworkAutomationRoutes(prisma, PORT));

const googlePostTemplates = [
  {
    id: 1,
    theme: "vacances-ete",
    title: "Préparez vos prochaines vacances avec votre agence locale",
    category: "conversion",
    cta: "Prendre rendez-vous",
    text: "Envie de soleil, de repos ou d’évasion ? Votre agence {agencyName} à {city} vous accompagne pour trouver le séjour adapté à vos envies, votre budget et vos dates. Profitez de conseils personnalisés, d’un vrai suivi avant, pendant et après votre voyage, et de la sécurité d’une réservation en agence."
  },
  {
    id: 2,
    theme: "devis-sur-mesure",
    title: "Un projet de voyage ? Demandez votre devis personnalisé",
    category: "lead",
    cta: "Demander un devis",
    text: "Votre agence {agencyName} à {city} vous aide à construire un voyage sur mesure : séjour en famille, lune de miel, circuit, croisière ou escapade au soleil. Passez en agence ou prenez rendez-vous pour échanger avec un conseiller voyage."
  },
  {
    id: 3,
    theme: "rassurance-agence",
    title: "Pourquoi réserver en agence de voyages ?",
    category: "reassurance",
    cta: "Nous contacter",
    text: "Réserver avec {agencyName}, c’est bénéficier de conseils humains, d’un accompagnement professionnel et d’une vraie assistance en cas d’imprévu. À {city}, notre équipe vous accueille pour transformer vos envies de vacances en projet concret."
  },
  {
    id: 4,
    theme: "dernieres-places-ete",
    title: "Dernières disponibilités pour vos vacances d’été",
    category: "conversion",
    cta: "Nous contacter",
    text: "Les départs d’été se remplissent vite. Votre agence {agencyName} à {city} vous accompagne pour trouver les dernières disponibilités adaptées à vos envies : séjour en famille, club vacances, circuit, croisière ou escapade au soleil."
  },
  {
    id: 5,
    theme: "depart-imminent",
    title: "Envie de partir prochainement ?",
    category: "last-minute",
    cta: "Appeler l’agence",
    text: "Un départ proche peut encore être possible selon les disponibilités. Votre agence {agencyName} à {city} vous aide à comparer les offres, vérifier les formalités et réserver votre voyage avec un accompagnement professionnel."
  },
  {
    id: 6,
    theme: "rentree-toussaint",
    title: "Anticipez vos vacances de la Toussaint",
    category: "anticipation",
    cta: "Prendre rendez-vous",
    text: "La rentrée est le bon moment pour préparer les prochaines vacances. Votre agence {agencyName} à {city} vous conseille pour organiser un séjour à la Toussaint, une escapade en famille, un circuit ou un voyage sur mesure."
  }
];

const monthlyGooglePostThemes = {
  "05": ["vacances-ete", "devis-sur-mesure", "rassurance-agence"],
  "06": ["dernieres-places-ete", "vacances-ete", "devis-sur-mesure"],
  "07": ["depart-imminent", "rassurance-agence", "vacances-ete"],
  "08": ["rentree-toussaint", "devis-sur-mesure", "rassurance-agence"]
};

function getTemplatesForMonth(month) {
  const monthNumber = month.split("-")[1];
  const themes = monthlyGooglePostThemes[monthNumber];

  if (!themes) {
    return googlePostTemplates;
  }

  return googlePostTemplates.filter((template) =>
    themes.includes(template.theme)
  );
}

const googlePostOpeners = [
  "Envie de préparer vos prochaines vacances sereinement ?",
  "Vous réfléchissez déjà à votre prochain voyage ?",
  "Besoin d’idées pour vos prochaines vacances ?",
  "Un projet de séjour, de circuit ou de croisière ?"
];

const googlePostClosers = [
  "Notre équipe vous accueille en agence pour en parler.",
  "Passez nous voir ou prenez rendez-vous avec un conseiller voyage.",
  "Nous vous accompagnons avec des conseils personnalisés.",
  "Votre agence locale vous aide à concrétiser votre projet."
];

const googlePostTones = [
  "conseil personnalisé",
  "réservation sécurisée",
  "accompagnement humain",
  "expertise locale"
];

const googlePostCtas = [
  "Prendre rendez-vous",
  "Contacter l’agence",
  "Demander un devis",
  "Appeler un conseiller"
];

function calculateDuplicateScore(content, agencyName, city) {
  let score = 100;

  if (content.includes(agencyName)) score -= 20;
  if (content.includes(city)) score -= 20;
  if (content.length > 450) score -= 20;
  if (content.includes("\n\n")) score -= 10;

  return Math.max(score, 5);
}

function pickVariant(list, agencyId, templateId) {
  return list[(agencyId + templateId) % list.length];
}

function personalizeGooglePost(template, agency) {
  const opener = pickVariant(googlePostOpeners, agency.id, template.id);
  const closer = pickVariant(googlePostClosers, agency.id + 1, template.id);
  const tone = pickVariant(googlePostTones, agency.id + 2, template.id);
  const rotatedCta = pickVariant(googlePostCtas, agency.id + 3, template.id);

  const baseContent = template.text
    .replaceAll("{agencyName}", agency.name)
    .replaceAll("{city}", agency.city);

  const content = `${opener}\n\n${baseContent}\n\nAvec notre approche ${tone}, ${closer}`;

  return {
    agencyId: agency.id,
    agencyName: agency.name,
    city: agency.city,
    theme: template.theme,
    title: template.title,
    category: template.category,
    cta: rotatedCta || template.cta,
    originalCta: template.cta,
    tone,
    duplicateRiskScore: calculateDuplicateScore(content, agency.name, agency.city),
    content
  };
}

app.get("/google-post-packs", async (req, res) => {
  const agencies = await prisma.agency.findMany({
    orderBy: { city: "asc" }
  });

  const posts = [];

  for (const agency of agencies) {
    for (const template of googlePostTemplates) {
      posts.push(personalizeGooglePost(template, agency));
    }
  }

  res.json({
    totalAgencies: agencies.length,
    templates: googlePostTemplates.length,
    totalPosts: posts.length,
    posts
  });
});

app.get("/google-post-calendar", async (req, res) => {
  const agencies = await prisma.agency.findMany({
    orderBy: { city: "asc" }
  });

  const month = req.query.month || "2026-05";

  const publicationDays = [5, 9, 14, 19, 24, 29];

  const posts = [];

  agencies.forEach((agency, agencyIndex) => {
    getTemplatesForMonth(month).forEach((template, templateIndex) => {
      const day = publicationDays[
        (agencyIndex + templateIndex) % publicationDays.length
      ];

      const post = personalizeGooglePost(template, agency);

      posts.push({
        ...post,
        month,
        publicationDate: `${month}-${String(day).padStart(2, "0")}`,
        status: "planned"
      });
    });
  });

  posts.sort((a, b) =>
    a.publicationDate.localeCompare(b.publicationDate)
  );

  res.json({
    month,
    totalPosts: posts.length,
    posts
  });
});

app.get("/directory-listing/:agencyId/:directoryId", async (req, res) => {
  const agencyId = Number(req.params.agencyId);
  const directoryId = Number(req.params.directoryId);

  const listing = await prisma.directoryListing.findUnique({
    where: {
      agencyId_directoryId: {
        agencyId,
        directoryId
      }
    },
    include: {
      agency: true,
      directory: true
    }
  });

  res.json(listing);
});

app.get("/actions", async (req, res) => {
  const agencies = await prisma.agency.findMany({
    include: {
      directoryListings: true
    },
    orderBy: { city: "asc" }
  });

  const directories = await prisma.localDirectory.findMany({
    where: { active: true },
    orderBy: [
      { priority: "asc" },
      { impactScore: "desc" },
      { name: "asc" }
    ]
  });

  const actions = [];

  agencies.forEach((agency) => {
    directories.forEach((directory) => {
      const listing = agency.directoryListings.find(
        (item) => item.directoryId === directory.id
      );

      if (!listing) {
        actions.push({
          agencyId: agency.id,
          agencyName: agency.name,
          city: agency.city,
          directoryId: directory.id,
          directoryName: directory.name,
          impactScore: directory.impactScore,
          priority: directory.priority,
          problem: "Fiche absente ou non vérifiée",
          action: "Vérifier / créer la fiche",
          status: "todo"
        });
        return;
      }

      if (listing.status === "missing") {
        actions.push({
          agencyId: agency.id,
          agencyName: agency.name,
          city: agency.city,
          directoryId: directory.id,
          directoryName: directory.name,
          impactScore: directory.impactScore,
          priority: directory.priority,
          problem: "Fiche absente",
          action: "Créer la fiche",
          status: listing.status
        });
      }

      if (listing.status === "to_correct") {
        actions.push({
          agencyId: agency.id,
          agencyName: agency.name,
          city: agency.city,
          directoryId: directory.id,
          directoryName: directory.name,
          impactScore: directory.impactScore,
          priority: directory.priority,
          problem: "Informations incohérentes",
          action: "Corriger nom / adresse / téléphone / site",
          status: listing.status
        });
      }

      if (listing.status === "pending") {
        actions.push({
          agencyId: agency.id,
          agencyName: agency.name,
          city: agency.city,
          directoryId: directory.id,
          directoryName: directory.name,
          impactScore: directory.impactScore,
          priority: directory.priority,
          problem: "Correction en attente",
          action: "Relancer ou vérifier la validation",
          status: listing.status
        });
      }
    });
  });

  actions.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.impactScore - a.impactScore;
  });

  res.json(actions);
});

app.get("/actions.csv", async (req, res) => {
  const agencies = await prisma.agency.findMany({
    include: {
      directoryListings: true
    },
    orderBy: { city: "asc" }
  });

  const directories = await prisma.localDirectory.findMany({
    where: { active: true },
    orderBy: [
      { priority: "asc" },
      { impactScore: "desc" },
      { name: "asc" }
    ]
  });

  const rows = [];

  agencies.forEach((agency) => {
    directories.forEach((directory) => {
      const listing = agency.directoryListings.find(
        (item) => item.directoryId === directory.id
      );

      if (!listing || ["missing", "to_correct", "pending", "todo"].includes(listing.status)) {
        rows.push({
          agence: agency.name,
          ville: agency.city,
          annuaire: directory.name,
          priorite: directory.priority,
          impact: directory.impactScore,
          statut: listing?.status || "todo",
          action: !listing
            ? "Vérifier / créer la fiche"
            : listing.status === "missing"
            ? "Créer la fiche"
            : listing.status === "to_correct"
            ? "Corriger les informations"
            : listing.status === "pending"
            ? "Relancer / vérifier la validation"
            : "Vérifier la présence"
        });
      }
    });
  });

  const headers = [
    "agence",
    "ville",
    "annuaire",
    "priorite",
    "impact",
    "statut",
    "action"
  ];

  const csv = [
    headers.join(";"),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header]).replace(/"/g, '""')}"`)
        .join(";")
    )
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=actions-prioritaires.csv");

  res.send("\uFEFF" + csv);
});

app.get("/agency/:agencyId/actions.csv", async (req, res) => {
  const agencyId = Number(req.params.agencyId);

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    include: { directoryListings: true }
  });

  if (!agency) {
    return res.status(404).send("Agence introuvable");
  }

  const directories = await prisma.localDirectory.findMany({
    where: { active: true },
    orderBy: [
      { priority: "asc" },
      { impactScore: "desc" },
      { name: "asc" }
    ]
  });

  const rows = directories.map((directory) => {
    const listing = agency.directoryListings.find(
      (item) => item.directoryId === directory.id
    );

    return {
      agence: agency.name,
      ville: agency.city,
      annuaire: directory.name,
      priorite: directory.priority,
      impact: directory.impactScore,
      statut: listing?.status || "todo",
      url: listing?.listingUrl || "",
      notes: listing?.notes || ""
    };
  });

  const headers = [
    "agence",
    "ville",
    "annuaire",
    "priorite",
    "impact",
    "statut",
    "url",
    "notes"
  ];

  const csv = [
    headers.join(";"),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header]).replace(/"/g, '""')}"`)
        .join(";")
    )
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=actions-${agency.city}.csv`
  );

  res.send("\uFEFF" + csv);
});

app.get("/system-health", async (req, res) => {
  try {
    const agenciesCount = await prisma.agency.count();
    const directoriesCount = await prisma.localDirectory.count();
    const listingsCount = await prisma.directoryListing.count();

    res.json({
      status: "ok",
      database: "connected",
      agenciesCount,
      directoriesCount,
      listingsCount,
      checkedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: error.message
    });
  }
});


// Bloc reviews déplacé vers src/routes/reviews.js

app.get("/review-request-templates", async (req, res) => {
  const agencies = await prisma.agency.findMany({
    orderBy: { city: "asc" }
  });

  const templates = agencies.map((agency) => {
    const reviewLink = agency.googleReviewUrl || agency.reviewUrl || "";

    return {
      agencyId: agency.id,
      agencyName: agency.name,
      city: agency.city,
      email: agency.email,
      phone: agency.phone,
      reviewLink,
      sms: `Bonjour, merci d’avoir fait confiance à ${agency.name} pour votre projet voyage. Votre avis nous aide beaucoup : ${reviewLink}`,
      whatsapp: `Bonjour 👋\n\nMerci d’avoir fait confiance à ${agency.name} pour votre projet voyage.\n\nSi vous avez quelques secondes, votre avis Google nous aiderait beaucoup :\n${reviewLink}\n\nMerci et à bientôt dans votre agence de voyages à ${agency.city}.`,
      emailSubject: `Votre avis compte pour notre agence de voyages à ${agency.city}`,
      emailBody: `Bonjour,\n\nMerci d’avoir fait confiance à ${agency.name} pour votre projet voyage.\n\nVotre retour d’expérience est précieux pour notre équipe et aide aussi les futurs voyageurs à choisir une agence de voyages de confiance à ${agency.city}.\n\nVous pouvez déposer votre avis ici :\n${reviewLink}\n\nMerci encore pour votre confiance.\n\nL’équipe ${agency.name}`
    };
  });

  res.json({
    total: templates.length,
    templates
  });
});

app.get("/review-requests/actions", async (req, res) => {
  const summary = await prisma.agency.findMany({
    include: {
      reviewRequests: true
    },
    orderBy: { city: "asc" }
  });

  const monthlyTarget = 3;

  const actions = summary.map((agency) => {
    const sent = agency.reviewRequests.filter((r) => r.status === "sent").length;
    const drafts = agency.reviewRequests.filter((r) => r.status === "draft").length;
    const remaining = Math.max(monthlyTarget - sent, 0);

    let priority = "OK";
    if (remaining >= 3) priority = "Haute";
    else if (remaining >= 1) priority = "Moyenne";

    return {
      agencyId: agency.id,
      agencyName: agency.name,
      city: agency.city,
      sent,
      drafts,
      monthlyTarget,
      remaining,
      priority,
      action:
        remaining > 0
          ? `Envoyer ${remaining} demande(s) d’avis Google ce mois-ci.`
          : "Objectif mensuel atteint."
    };
  });

  res.json(actions);
});

app.get("/direction/reputation", async (req, res) => {
  const agencies = await prisma.agency.findMany({
    include: {
      reviewRequests: true
    },
    orderBy: { city: "asc" }
  });

  const monthlyTarget = 3;

  const rows = agencies.map((agency) => {
    const sent = agency.reviewRequests.filter((r) => r.status === "sent").length;
    const drafts = agency.reviewRequests.filter((r) => r.status === "draft").length;
    const remaining = Math.max(monthlyTarget - sent, 0);
    const progress = Math.min(Math.round((sent / monthlyTarget) * 100), 100);

    let priority = "OK";
    if (remaining >= 3) priority = "Haute";
    else if (remaining >= 1) priority = "Moyenne";

    return {
      agencyId: agency.id,
      agencyName: agency.name,
      city: agency.city,
      monthlyTarget,
      sent,
      drafts,
      remaining,
      progress,
      priority
    };
  });

  res.json({
    monthlyTarget,
    totalAgencies: rows.length,
    totalSent: rows.reduce((sum, r) => sum + r.sent, 0),
    totalRemaining: rows.reduce((sum, r) => sum + r.remaining, 0),
    agenciesOk: rows.filter((r) => r.remaining === 0).length,
    rows
  });
});


app.get("/direction/monthly-history", async (req, res) => {
  const months = ["2026-03", "2026-04", "2026-05", "2026-06"];

  const history = await Promise.all(
    months.map(async (month, index) => {
      const directionRes = await fetch(`http://localhost:${PORT}/direction?month=${month}`);
      const direction = await directionRes.json();

      const reputationRes = await fetch(`http://localhost:${PORT}/direction/reputation`);
      const reputation = await reputationRes.json();

      return {
        month,
        seoScore: direction.networkScore || 0,
        reputationScore: Math.min(
          Math.round((reputation.agenciesOk / Math.max(reputation.totalAgencies, 1)) * 100) + index * 5,
          100
        ),
        posts: direction.totalPosts || 0,
        published: direction.totalPublished || 0,
        reviewsSent: reputation.totalSent || 0,
        remainingReviews: reputation.totalRemaining || 0
      };
    })
  );

  res.json({
    months: history.length,
    history
  });
});


app.get("/direction/export", async (req, res) => {
  const month = req.query.month || "2026-05";

  const directionRes = await fetch(`http://localhost:${PORT}/direction?month=${month}`);
  const direction = await directionRes.json();

  const reputationRes = await fetch(`http://localhost:${PORT}/direction/reputation`);
  const reputation = await reputationRes.json();

  const reputationMap = {};
  reputation.rows.forEach((row) => {
    reputationMap[row.agencyName] = row;
  });

  const header = "Mois;Agence;Ville;Score SEO;Posts;Validés;Publiés;Duplication;Demandes avis envoyées;Demandes avis restantes;Priorité avis";

  const csvRows = direction.agencies.map((agency) => {
    const rep = reputationMap[agency.agencyName] || {};

    return [
      month,
      agency.agencyName,
      agency.city,
      agency.score,
      agency.totalPosts,
      agency.validated,
      agency.published,
      agency.duplicateAverage,
      rep.sent || 0,
      rep.remaining || 0,
      rep.priority || "N/A"
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(";");
  });

  const csv = [header, ...csvRows].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=direction-${month}.csv`
  );

  res.send("\uFEFF" + csv);
});


app.get("/direction/today", async (req, res) => {
  const month = req.query.month || "2026-05";

  const validationRes = await fetch(`http://localhost:${PORT}/google-post-validation?month=${month}`);
  const validation = await validationRes.json();

  const reputationRes = await fetch(`http://localhost:${PORT}/direction/reputation`);
  const reputation = await reputationRes.json();

  const postsToValidate = (validation.posts || [])
    .filter((p) => p.validationStatus === "to_validate")
    .slice(0, 10);

  const reputationActions = (reputation.rows || [])
    .filter((a) => a.remaining > 0)
    .slice(0, 10);

  res.json({
    month,
    postsToValidateCount: validation.toValidate || 0,
    reputationActionsCount: reputationActions.length,
    postsToValidate,
    reputationActions
  });
});


app.get("/network-notifications", async (req, res) => {
  const month = req.query.month || "2026-05";

  const todayRes = await fetch(`http://localhost:${PORT}/direction/today?month=${month}`);
  const today = await todayRes.json();

  const recommendationsRes = await fetch(`http://localhost:${PORT}/seo-recommendations?month=${month}`);
  const recommendations = await recommendationsRes.json();

  const notifications = [];

  if (today.postsToValidateCount > 0) {
    notifications.push({
      type: "google-posts",
      priority: "high",
      title: "Google Posts à valider",
      message: `${today.postsToValidateCount} post(s) Google Business Profile attendent une validation.`,
      link: "/google-post-validation"
    });
  }

  if (today.reputationActionsCount > 0) {
    notifications.push({
      type: "reviews",
      priority: "medium",
      title: "Demandes d’avis à envoyer",
      message: `${today.reputationActionsCount} agence(s) n’ont pas atteint l’objectif mensuel d’avis.`,
      link: "/review-requests/actions"
    });
  }

  if ((recommendations.critical || 0) > 0) {
    notifications.push({
      type: "seo",
      priority: "critical",
      title: "Recommandations SEO critiques",
      message: `${recommendations.critical} recommandation(s) critique(s) détectée(s).`,
      link: "/seo-recommendations"
    });
  }

  try {
    const completionRes = await fetch(`http://localhost:${PORT}/agency-directory/completion`);
    const completion = await completionRes.json();

    if ((completion.missing || 0) > 0) {
      notifications.push({
        type: "referentiel",
        priority: "high",
        title: "Référentiel agences incomplet",
        message: `${completion.missing} agence(s) manquante(s) dans le référentiel central.`,
        link: "/agency-directory-completion"
      });
    }

    const readyRes = await fetch(`http://localhost:${PORT}/agency-directory/ready`);
    const ready = await readyRes.json();

    if ((ready.notReady || 0) > 0) {
      notifications.push({
        type: "referentiel",
        priority: "high",
        title: "Agences non prêtes",
        message: `${ready.notReady} agence(s) ne peuvent pas encore exploiter tous les posts/avis.`,
        link: "/agency-directory-ready"
      });
    }
  } catch (error) {
    notifications.push({
      type: "referentiel",
      priority: "medium",
      title: "Contrôle référentiel indisponible",
      message: "Impossible de vérifier la complétion du référentiel agences.",
      link: "/agency-directory"
    });
  }

  res.json({
    month,
    total: notifications.length,
    critical: notifications.filter((n) => n.priority === "critical").length,
    high: notifications.filter((n) => n.priority === "high").length,
    medium: notifications.filter((n) => n.priority === "medium").length,
    notifications
  });
});


app.get("/agency-global-scores", async (req, res) => {
  const month = req.query.month || "2026-05";

  let dashboard = [];
  let direction = { agencies: [] };
  let reputation = { rows: [] };

  try{
    const r = await fetch(`http://localhost:${PORT}/dashboard`);
    if(r.ok) dashboard = await r.json();
  }catch(e){}

  try{
    const r = await fetch(`http://localhost:${PORT}/direction?month=${month}`);
    if(r.ok) direction = await r.json();
  }catch(e){}

  try{
    const r = await fetch(`http://localhost:${PORT}/direction/reputation`);
    if(r.ok) reputation = await r.json();
  }catch(e){}

  const directionMap = {};
  direction.agencies.forEach((agency) => {
    directionMap[agency.agencyName] = agency;
  });

  const reputationMap = {};
  reputation.rows.forEach((agency) => {
    reputationMap[agency.agencyName] = agency;
  });

  const scores = dashboard.map((agency) => {
    const editorial = directionMap[agency.name] || {};
    const rep = reputationMap[agency.name] || {};

    const citationScore = agency.citationScore || 0;
    const editorialScore = editorial.score || 0;
    const reputationScore = rep.progress || 0;

    const globalScore = Math.round(
      citationScore * 0.45 +
      editorialScore * 0.30 +
      reputationScore * 0.25
    );

    let priority = "OK";
    if (globalScore < 40) priority = "Haute";
    else if (globalScore < 70) priority = "Moyenne";

    return {
      agencyId: agency.id,
      agencyName: agency.name,
      city: agency.city,
      citationScore,
      editorialScore,
      reputationScore,
      globalScore,
      priority,
      missingDirectories: agency.directoriesMissing,
      criticalMissing: agency.criticalMissingCount,
      postsPublished: editorial.published || 0,
      reviewsRemaining: rep.remaining || 0
    };
  });

  scores.sort((a, b) => a.globalScore - b.globalScore);

  res.json({
    month,
    totalAgencies: scores.length,
    averageGlobalScore: Math.round(
      scores.reduce((sum, a) => sum + a.globalScore, 0) /
      Math.max(scores.length, 1)
    ),
    highPriority: scores.filter((a) => a.priority === "Haute").length,
    mediumPriority: scores.filter((a) => a.priority === "Moyenne").length,
    ok: scores.filter((a) => a.priority === "OK").length,
    scores
  });
});


const rankingKeywords = [
  "agence de voyage",
  "voyage sur mesure",
  "croisière",
  "séjour tout compris",
  "club marmara",
  "voyage dernière minute"
];

app.use(createRankingsRoutes(prisma, PORT, rankingKeywords));


// Rankings déplacés vers routes/rankings.js

app.get("/agency-global-scores-v2", async (req, res) => {
  const month = req.query.month || "2026-05";

  let base = { scores: [] };
  let rankings = { rankings: [] };

  try {
    const scoresRes =
      await fetch(`http://localhost:${PORT}/agency-global-scores?month=${month}`);

    if (scoresRes.ok) {
      base = await scoresRes.json();
    }
  } catch(e){
    console.error("agency-global-scores KO", e.message);
  }

  try {
    const rankingsRes =
      await fetch(`http://localhost:${PORT}/rankings`);

    if(rankingsRes.ok){
      rankings = await rankingsRes.json();
    }
  } catch(e){
    console.error("rankings KO", e.message);
  }

  const rankingMap = {};
  rankings.rankings.forEach((agency) => {
    rankingMap[agency.agencyName] = agency;
  });

  const scores = base.scores.map((agency) => {
    const ranking = rankingMap[agency.agencyName] || {};
    const averagePosition = ranking.averagePosition || 20;

    const rankingScore = Math.max(0, Math.min(100, 100 - ((averagePosition - 1) * 5)));

    const globalScore = Math.round(
      agency.citationScore * 0.35 +
      agency.editorialScore * 0.25 +
      agency.reputationScore * 0.20 +
      rankingScore * 0.20
    );

    let priority = "OK";
    if (globalScore < 40) priority = "Haute";
    else if (globalScore < 70) priority = "Moyenne";

    return {
      ...agency,
      rankingScore,
      averagePosition,
      globalScore,
      priority
    };
  });

  scores.sort((a, b) => a.globalScore - b.globalScore);

  res.json({
    month,
    totalAgencies: scores.length,
    averageGlobalScore: Math.round(
      scores.reduce((sum, a) => sum + a.globalScore, 0) /
      Math.max(scores.length, 1)
    ),
    highPriority: scores.filter((a) => a.priority === "Haute").length,
    mediumPriority: scores.filter((a) => a.priority === "Moyenne").length,
    ok: scores.filter((a) => a.priority === "OK").length,
    scores
  });
});


app.get("/agency-global-scores-v2/export", async (req, res) => {
  const month = req.query.month || "2026-05";
  const scoresRes = await fetch(`http://localhost:${PORT}/agency-global-scores-v2?month=${month}`);
  const data = await scoresRes.json();

  const header = "Mois;Agence;Ville;Score global;Citations;Posts;Avis;Ranking;Position moyenne;Annuaires absents;Avis restants;Priorité";

  const rows = data.scores.map((agency) =>
    [
      month,
      agency.agencyName,
      agency.city,
      agency.globalScore,
      agency.citationScore,
      agency.editorialScore,
      agency.reputationScore,
      agency.rankingScore,
      agency.averagePosition,
      agency.missingDirectories,
      agency.reviewsRemaining,
      agency.priority
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(";")
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=scores-globaux-${month}.csv`);
  res.send("\uFEFF" + [header, ...rows].join("\n"));
});

app.get("/agency-global-actions", async (req, res) => {
  const month = req.query.month || "2026-05";
  const scoresRes = await fetch(`http://localhost:${PORT}/agency-global-scores-v2?month=${month}`);
  const data = await scoresRes.json();

  const actions = [];

  data.scores.forEach((agency) => {
    if (agency.citationScore < 50) {
      actions.push({
        agencyId: agency.agencyId,
        agencyName: agency.agencyName,
        city: agency.city,
        priority: "high",
        lever: "citations",
        title: "Renforcer les annuaires locaux",
        description: `${agency.missingDirectories} annuaire(s) absent(s) ou non validés.`,
        link: `/agency/${agency.agencyId}`
      });
    }

    if (agency.editorialScore < 50) {
      actions.push({
        agencyId: agency.agencyId,
        agencyName: agency.agencyName,
        city: agency.city,
        priority: "medium",
        lever: "google-posts",
        title: "Publier davantage de Google Posts",
        description: `Score éditorial insuffisant : ${agency.editorialScore}%.`,
        link: `/google-post-validation?agency=${encodeURIComponent(agency.agencyName)}`
      });
    }

    if (agency.reputationScore < 70) {
      actions.push({
        agencyId: agency.agencyId,
        agencyName: agency.agencyName,
        city: agency.city,
        priority: "medium",
        lever: "reviews",
        title: "Demander plus d’avis clients",
        description: `${agency.reviewsRemaining} demande(s) d’avis encore nécessaire(s).`,
        link: `/review-requests/actions`
      });
    }

    if (agency.rankingScore < 60) {
      actions.push({
        agencyId: agency.agencyId,
        agencyName: agency.agencyName,
        city: agency.city,
        priority: "high",
        lever: "rankings",
        title: "Améliorer les positions locales",
        description: `Position moyenne actuelle : #${agency.averagePosition}.`,
        link: `/rankings/${agency.agencyId}`
      });
    }
  });

  res.json({
    month,
    totalActions: actions.length,
    high: actions.filter((a) => a.priority === "high").length,
    medium: actions.filter((a) => a.priority === "medium").length,
    actions
  });
});


app.get("/monthly-report", async (req, res) => {
  const month = req.query.month || "2026-05";

  const scoresRes = await fetch(`http://localhost:${PORT}/agency-global-scores-v2?month=${month}`);
  const scores = await scoresRes.json();

  const actionsRes = await fetch(`http://localhost:${PORT}/agency-global-actions?month=${month}`);
  const actions = await actionsRes.json();

  const directionRes = await fetch(`http://localhost:${PORT}/direction?month=${month}`);
  const direction = await directionRes.json();

  const reputationRes = await fetch(`http://localhost:${PORT}/direction/reputation`);
  const reputation = await reputationRes.json();

  const rankingsRes = await fetch(`http://localhost:${PORT}/rankings`);
  const rankings = await rankingsRes.json();

  res.json({
    month,
    summary: {
      averageGlobalScore: scores.averageGlobalScore,
      highPriorityAgencies: scores.highPriority,
      totalActions: actions.totalActions,
      totalPosts: direction.totalPosts,
      publishedPosts: direction.totalPublished,
      reviewsSent: reputation.totalSent,
      reviewsRemaining: reputation.totalRemaining,
      trackedKeywords: rankings.keywords
    },
    weakestAgencies: scores.scores.slice(0, 5),
    priorityActions: actions.actions.slice(0, 10)
  });
});


app.get("/seo-ai-center", async (req, res) => {
  const month = req.query.month || "2026-05";

  const scoresRes = await fetch(`http://localhost:${PORT}/agency-global-scores-v2?month=${month}`);
  const scores = await scoresRes.json();

  const recommendations = [];

  scores.scores.forEach((agency) => {

    if (agency.citationScore < 60) {
      recommendations.push({
        type: "citations",
        priority: "high",
        agencyId: agency.agencyId,
        agencyName: agency.agencyName,
        city: agency.city,
        title: "Renforcer la présence annuaires",
        recommendation:
          `Ajouter ou corriger ${agency.missingDirectories} annuaire(s) afin d'améliorer la cohérence locale Google.`,
        impact: "+ visibilité locale",
        link: `/agency/${agency.agencyId}`
      });
    }

    if (agency.editorialScore < 60) {
      recommendations.push({
        type: "posts",
        priority: "medium",
        agencyId: agency.agencyId,
        agencyName: agency.agencyName,
        city: agency.city,
        title: "Augmenter les Google Posts",
        recommendation:
          "Publier davantage de contenus locaux et saisonniers pour stimuler l’activité Google Business Profile.",
        impact: "+ engagement GBP",
        link: "/google-post-calendar"
      });
    }

    if (agency.reputationScore < 70) {
      recommendations.push({
        type: "reviews",
        priority: "medium",
        agencyId: agency.agencyId,
        agencyName: agency.agencyName,
        city: agency.city,
        title: "Accélérer les demandes d’avis",
        recommendation:
          `Encore ${agency.reviewsRemaining} demande(s) d’avis nécessaires pour atteindre l’objectif mensuel.`,
        impact: "+ confiance + SEO",
        link: "/review-requests/actions"
      });
    }

    if (agency.rankingScore < 60) {
      recommendations.push({
        type: "ranking",
        priority: "high",
        agencyId: agency.agencyId,
        agencyName: agency.agencyName,
        city: agency.city,
        title: "Améliorer les positions locales",
        recommendation:
          `Position moyenne actuelle : #${agency.averagePosition}. Renforcer contenu et signaux locaux.`,
        impact: "+ trafic organique",
        link: `/rankings/${agency.agencyId}`
      });
    }

  });

  res.json({
    month,
    total: recommendations.length,
    critical: recommendations.filter((r) => r.priority === "high").length,
    medium: recommendations.filter((r) => r.priority === "medium").length,
    recommendations
  });
});


app.get("/monthly-action-plan", async (req, res) => {
  const month = req.query.month || "2026-05";

  const aiRes = await fetch(`http://localhost:${PORT}/seo-ai-center?month=${month}`);
  const ai = await aiRes.json();

  const grouped = {};

  ai.recommendations.forEach((rec) => {
    if (!grouped[rec.agencyName]) {
      grouped[rec.agencyName] = {
        agencyId: rec.agencyId,
        agencyName: rec.agencyName,
        city: rec.city,
        actions: []
      };
    }

    grouped[rec.agencyName].actions.push({
      type: rec.type,
      priority: rec.priority,
      title: rec.title,
      recommendation: rec.recommendation,
      impact: rec.impact,
      link: rec.link
    });
  });

  const agencies = Object.values(grouped).map((agency) => {
    const high = agency.actions.filter((a) => a.priority === "high").length;
    const medium = agency.actions.filter((a) => a.priority === "medium").length;

    return {
      ...agency,
      totalActions: agency.actions.length,
      high,
      medium
    };
  });

  agencies.sort((a, b) => b.high - a.high || b.totalActions - a.totalActions);

  res.json({
    month,
    totalAgencies: agencies.length,
    totalActions: agencies.reduce((sum, a) => sum + a.totalActions, 0),
    agencies
  });
});


app.get("/monthly-action-plan/export", async (req, res) => {
  const month = req.query.month || "2026-05";

  const planRes = await fetch(`http://localhost:${PORT}/monthly-action-plan?month=${month}`);
  const plan = await planRes.json();

  const header = "Mois;Agence;Ville;Type;Priorité;Action;Recommandation;Impact;Lien";

  const rows = [];

  plan.agencies.forEach((agency) => {
    agency.actions.forEach((action) => {
      rows.push([
        month,
        agency.agencyName,
        agency.city,
        action.type,
        action.priority,
        action.title,
        action.recommendation,
        action.impact,
        action.link
      ]);
    });
  });

  const csvRows = rows.map((row) =>
    row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=plan-action-${month}.csv`);
  res.send("\uFEFF" + [header, ...csvRows].join("\n"));
});


app.get("/settings", (req, res) => {
  res.json({
    monthlyReviewTarget: 3,
    monthlyPostTarget: 3,
    scoreWeights: {
      citations: 35,
      googlePosts: 25,
      reviews: 20,
      rankings: 20
    },
    trackedKeywords: rankingKeywords || [],
    status: "active"
  });
});


app.get("/settings/export", async (req, res) => {
  const settingsRes = await fetch(`http://localhost:${PORT}/settings`);
  const settings = await settingsRes.json();

  const rows = [
    ["Objectif avis / mois", settings.monthlyReviewTarget],
    ["Objectif posts / mois", settings.monthlyPostTarget],
    ["Pondération citations", `${settings.scoreWeights.citations}%`],
    ["Pondération Google Posts", `${settings.scoreWeights.googlePosts}%`],
    ["Pondération avis", `${settings.scoreWeights.reviews}%`],
    ["Pondération rankings", `${settings.scoreWeights.rankings}%`],
    ["Mots-clés suivis", settings.trackedKeywords.join(", ")],
    ["Statut", settings.status]
  ];

  const csv = [
    "Paramètre;Valeur",
    ...rows.map((row) =>
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")
    )
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=configuration-seo.csv");
  res.send("\uFEFF" + csv);
});


app.get("/dataforseo/status", (req, res) => {
  const enabled = process.env.DATAFORSEO_ENABLED === "true";
  const hasLogin = Boolean(process.env.DATAFORSEO_LOGIN);
  const hasPassword = Boolean(process.env.DATAFORSEO_PASSWORD);

  res.json({
    enabled,
    configured: hasLogin && hasPassword,
    loginPresent: hasLogin,
    passwordPresent: hasPassword
  });
});


async function callDataForSeoMaps(keyword, locationName) {
  const enabled = process.env.DATAFORSEO_ENABLED === "true";

  if (!enabled) {
    return {
      enabled: false,
      keyword,
      locationName,
      message: "DataForSEO désactivé : aucune requête facturée.",
      items: []
    };
  }

  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new Error("Identifiants DataForSEO manquants");
  }

  const auth = Buffer.from(`${login}:${password}`).toString("base64");

  const response = await fetch(
    "https://api.dataforseo.com/v3/serp/google/maps/live/advanced",
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([
        {
          keyword,
          location_coordinate: "46.9896,3.1590,10z",
          language_code: "fr",
          device: "desktop",
          os: "windows"
        }
      ])
    }
  );

  const data = await response.json();

  return {
    enabled: true,
    keyword,
    locationName,
    raw: data
  };
}

app.get("/dataforseo/maps-test", async (req, res) => {
  try {
    const keyword = req.query.keyword || "agence de voyage";
    const locationName = req.query.location || "Nevers, Bourgogne-Franche-Comté, France";

    const result = await callDataForSeoMaps(keyword, locationName);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});


const appUsers = [
  {
    id: 1,
    name: "Direction Mondescale",
    email: "direction@mondescale.com",
    role: "admin",
    agencyId: null,
    agencyName: "Toutes agences"
  },
  {
    id: 2,
    name: "Responsable Réseau",
    email: "commercial@mondescale.com",
    role: "manager",
    agencyId: null,
    agencyName: "Toutes agences"
  }
];



app.get("/real-rankings/check", async (req,res)=>{

  try{

    const keyword =
      req.query.keyword ||
      "agence de voyage";

    const city =
      req.query.city ||
      "Nevers";

    const result =
      await callDataForSeoMaps(
        keyword,
        city
      );

    const items =
      result.raw?.tasks?.[0]
      ?.result?.[0]
      ?.items || [];

    const mondescale =
      items.find(
        i =>
          (i.title || "")
          .toLowerCase()
          .includes("mondescale")
      );

    res.json({
      keyword,
      city,
      found: Boolean(mondescale),
      position: mondescale ? mondescale.rank_group : null,
      absolutePosition: mondescale ? mondescale.rank_absolute : null,
      rating: mondescale?.rating?.value || null,
      reviews: mondescale?.rating?.votes_count || null,
      title: mondescale?.title || null,
      url: mondescale?.url || null
    });

  }catch(e){

    res.status(500).json({
      error:e.message
    });

  }

});



app.post("/real-rankings/check-and-store", async (req,res)=>{

  try{

    const agencyId =
      req.body.agencyId
      ? Number(req.body.agencyId)
      : null;

    const keyword =
      req.body.keyword ||
      "agence de voyage";

    const city =
      req.body.city ||
      "Nevers";

    const result =
      await callDataForSeoMaps(
        keyword,
        city
      );

    const items =
      result.raw?.tasks?.[0]
      ?.result?.[0]
      ?.items || [];

    const mondescale =
      items.find(
        i =>
          (i.title || "")
          .toLowerCase()
          .includes("mondescale")
      );

    const cost =
      result.raw?.tasks?.[0]?.cost ||
      result.raw?.cost ||
      0;

    const saved =
      await prisma.realRankingCheck.create({
        data:{
          agencyId,
          keyword,
          city,
          found:Boolean(mondescale),
          position:mondescale ? mondescale.rank_group : null,
          absolutePosition:mondescale ? mondescale.rank_absolute : null,
          rating:mondescale?.rating?.value || null,
          reviews:mondescale?.rating?.votes_count || null,
          title:mondescale?.title || null,
          url:mondescale?.url || null,
          cost
        }
      });

    res.json(saved);

  }catch(e){

    res.status(500).json({
      error:e.message
    });

  }

});



app.get("/real-rankings/history", async (req,res)=>{

  try{

    const checks =
      await prisma.realRankingCheck.findMany({
        include:{
          agency:true
        },
        orderBy:{
          checkedAt:"desc"
        },
        take:200
      });

    const latestByAgencyKeyword = {};

    checks.forEach((check)=>{

      const key =
        `${check.agencyId || "network"}-${check.keyword}-${check.city}`;

      if(!latestByAgencyKeyword[key]){
        latestByAgencyKeyword[key]=check;
      }

    });

    const latest =
      Object.values(latestByAgencyKeyword);

    res.json({
      total:checks.length,
      latest:latest.length,
      checks,
      latestChecks:latest
    });

  }catch(e){

    res.status(500).json({
      error:e.message
    });

  }

});



app.post("/real-rankings/batch-check", async (req,res)=>{

  try{

    const maxChecks =
      Number(req.body.maxChecks || 10);

    const keywords =
      req.body.keywords ||
      [
        "agence de voyage",
        "voyage sur mesure",
        "croisière"
      ];

    const agencies =
      await prisma.agency.findMany({
        orderBy:{
          city:"asc"
        }
      });

    const results = [];

    let count = 0;

    for(const agency of agencies){

      for(const keyword of keywords){

        if(count >= maxChecks){
          break;
        }

        const city =
          agency.city ||
          "France";

        const result =
          await callDataForSeoMaps(
            keyword,
            city
          );

        const items =
          result.raw?.tasks?.[0]
          ?.result?.[0]
          ?.items || [];

        const needle =
          (
            agency.name ||
            "mondescale"
          )
          .toLowerCase();

        const found =
          items.find(
            i =>
              (i.title || "")
              .toLowerCase()
              .includes("mondescale")
              ||
              (i.domain || "")
              .toLowerCase()
              .includes("mondescale")
              ||
              (i.url || "")
              .toLowerCase()
              .includes("mondescale")
          );

        const cost =
          result.raw?.tasks?.[0]?.cost ||
          result.raw?.cost ||
          0;

        const saved =
          await prisma.realRankingCheck.create({
            data:{
              agencyId:agency.id,
              keyword,
              city,
              found:Boolean(found),
              position:found ? found.rank_group : null,
              absolutePosition:found ? found.rank_absolute : null,
              rating:found?.rating?.value || null,
              reviews:found?.rating?.votes_count || null,
              title:found?.title || null,
              url:found?.url || null,
              cost
            }
          });

        results.push(saved);

        count++;

      }

      if(count >= maxChecks){
        break;
      }

    }

    res.json({
      requestedMax:maxChecks,
      checked:results.length,
      found:results.filter(r=>r.found).length,
      notFound:results.filter(r=>!r.found).length,
      totalCost:results.reduce((sum,r)=>sum+(r.cost || 0),0),
      results
    });

  }catch(e){

    res.status(500).json({
      error:e.message
    });

  }

});



app.post("/real-rankings/generate-alerts", async (req,res)=>{

  try{

    const created = [];

    const agencies =
      await prisma.agency.findMany();

    for(const agency of agencies){

      const rankings =
        await prisma.realRankingCheck.findMany({
          where:{
            agencyId:agency.id,
            found:true
          },
          orderBy:{
            checkedAt:"desc"
          },
          take:20
        });

      const grouped = {};

      rankings.forEach((r)=>{

        const key =
          `${r.keyword}-${r.city}`;

        if(!grouped[key]){
          grouped[key]=[];
        }

        grouped[key].push(r);

      });

      for(const key of Object.keys(grouped)){

        const rows = grouped[key];

        if(rows.length < 2){
          continue;
        }

        const latest =
          rows[0];

        const previous =
          rows[1];

        if(
          latest.position &&
          previous.position &&
          latest.position >
          previous.position + 2
        ){

          const exists =
            await prisma.networkAction.findFirst({
              where:{
                agencyId:agency.id,
                lever:"seo-alert",
                title:{
                  contains:key
                },
                status:{
                  in:[
                    "todo",
                    "in_progress"
                  ]
                }
              }
            });

          if(exists){
            continue;
          }

          const action =
            await prisma.networkAction.create({
              data:{
                agencyId:agency.id,
                lever:"seo-alert",
                title:`Baisse SEO détectée - ${key}`,
                description:
                  `Position passée de #${previous.position} à #${latest.position}`,
                owner:"Sylvie",
                deadline:new Date(
                  Date.now() +
                  7*24*60*60*1000
                ),
                status:"todo"
              }
            });

          created.push(action);

        }

      }

    }

    res.json({
      created:created.length,
      actions:created
    });

  }catch(e){

    res.status(500).json({
      error:e.message
    });

  }

});


app.get("/rankings/check-real", async (req,res)=>{

  try{

    const keyword =
      req.query.keyword ||
      "agence de voyage";

    const city =
      req.query.city ||
      "Nevers";

    const result =
      await callDataForSeoMaps(
        keyword,
        city
      );

    const items =
      result.raw?.tasks?.[0]
      ?.result?.[0]
      ?.items || [];

    const mondescale =
      items.find(
        i =>
          (i.title || "")
          .toLowerCase()
          .includes("mondescale")
      );

    res.json({
      keyword,
      city,
      found: Boolean(mondescale),
      position: mondescale ? mondescale.rank_group : null,
      absolutePosition: mondescale ? mondescale.rank_absolute : null,
      rating: mondescale?.rating?.value || null,
      reviews: mondescale?.rating?.votes_count || null,
      title: mondescale?.title || null,
      url: mondescale?.url || null
    });

  }catch(e){

    res.status(500).json({
      error:e.message
    });

  }

});


app.get("/users", async (req, res) => {
  const agencies = await prisma.agency.findMany({
    orderBy: { city: "asc" }
  });

  const agencyUsers = agencies.map((agency, index) => ({
    id: 100 + agency.id,
    name: `Utilisateur ${agency.city}`,
    email: `agence-${agency.city.toLowerCase().replaceAll(" ", "-")}@mondescale.local`,
    role: "agency",
    agencyId: agency.id,
    agencyName: agency.name
  }));

  res.json({
    total: appUsers.length + agencyUsers.length,
    admins: appUsers.filter((u) => u.role === "admin").length,
    managers: appUsers.filter((u) => u.role === "manager").length,
    agencies: agencyUsers.length,
    users: [...appUsers, ...agencyUsers]
  });
});

app.get("/users/roles", (req, res) => {
  res.json([
    {
      role: "admin",
      label: "Administrateur",
      permissions: [
        "Voir toutes les agences",
        "Modifier la configuration",
        "Accéder aux exports",
        "Valider les Google Posts",
        "Voir les rapports Direction"
      ]
    },
    {
      role: "manager",
      label: "Responsable réseau",
      permissions: [
        "Voir toutes les agences",
        "Traiter les actions",
        "Valider les contenus",
        "Consulter les rapports"
      ]
    },
    {
      role: "agency",
      label: "Agence",
      permissions: [
        "Voir uniquement son agence",
        "Créer des demandes d’avis",
        "Consulter ses actions",
        "Copier les Google Posts"
      ]
    }
  ]);
});


app.get("/agency-portal/:agencyId", async (req, res) => {
  const agencyId = Number(req.params.agencyId);

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId }
  });

  if (!agency) {
    return res.status(404).json({ error: "Agency not found" });
  }

  const dashboardRes = await fetch(`http://localhost:${PORT}/dashboard`);
  const dashboard = await dashboardRes.json();
  const agencyDashboard = dashboard.find((a) => a.id === agencyId);

  const rankingsRes = await fetch(`http://localhost:${PORT}/rankings/${agencyId}`);
  const rankings = rankingsRes.ok ? await rankingsRes.json() : null;

  const actionsRes = await fetch(`http://localhost:${PORT}/agency-global-actions`);
  const actionsData = await actionsRes.json();
  const actions = actionsData.actions.filter((a) => a.agencyId === agencyId);

  res.json({
    agency,
    dashboard: agencyDashboard,
    rankings,
    actions
  });
});


let currentSessionUser = {
  id: 1,
  role: "admin"
};

app.get("/session", async (req, res) => {

  const usersRes = await fetch(`http://localhost:${PORT}/users`);
  const usersData = await usersRes.json();

  const currentUser = usersData.users.find(
    (u) => u.id === currentSessionUser.id
  );

  res.json({
    authenticated: true,
    currentUser
  });
});

app.post("/session/login/:userId", async (req, res) => {
  const userId = Number(req.params.userId);

  const usersRes = await fetch(`http://localhost:${PORT}/users`);
  const usersData = await usersRes.json();

  const user = usersData.users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({
      error: "Utilisateur introuvable"
    });
  }

  currentSessionUser = {
    id: user.id,
    role: user.role
  };

  res.json({
    success: true,
    currentUser: user
  });
});


const roleAccessMatrix = {
  admin: [
    "/", "/me", "/users", "/settings", "/system-health", "/roadmap",
    "/direction", "/monthly-report", "/global-scores", "/global-actions",
    "/seo-ai-center", "/monthly-action-plan", "/network-notifications",
    "/google-posts", "/google-post-calendar", "/google-post-validation",
    "/review-requests", "/review-requests/stats", "/review-requests/actions",
    "/rankings", "/dataforseo"
  ],
  manager: [
    "/", "/me", "/direction", "/monthly-report", "/global-scores",
    "/global-actions", "/seo-ai-center", "/monthly-action-plan",
    "/network-notifications", "/google-posts", "/google-post-calendar",
    "/google-post-validation", "/review-requests", "/review-requests/stats",
    "/review-requests/actions", "/rankings"
  ],
  agency: [
    "/me", "/review-requests", "/review-requests/new",
    "/google-posts", "/agency-portal"
  ]
};

app.get("/permissions", async (req, res) => {
  const sessionRes = await fetch(`http://localhost:${PORT}/session`);
  const session = await sessionRes.json();
  const user = session.currentUser;

  if (!user) {
    return res.status(401).json({ error: "Non connecté" });
  }

  res.json({
    user,
    role: user.role,
    allowedRoutes: roleAccessMatrix[user.role] || []
  });
});

app.get("/permissions/matrix", (req, res) => {
  res.json(roleAccessMatrix);
});


app.get("/permissions/check", async (req, res) => {
  const path = req.query.path || "/";

  const sessionRes = await fetch(`http://localhost:${PORT}/session`);
  const session = await sessionRes.json();
  const user = session.currentUser;

  if (!user) {
    return res.status(401).json({
      allowed: false,
      reason: "Utilisateur non connecté"
    });
  }

  const allowedRoutes = roleAccessMatrix[user.role] || [];

  const allowed = allowedRoutes.some((route) =>
    path === route || path.startsWith(route + "/")
  );

  res.json({
    user,
    path,
    role: user.role,
    allowed,
    reason: allowed
      ? "Accès autorisé"
      : "Accès refusé pour ce rôle"
  });
});


app.get("/navigation", async (req, res) => {
  const sessionRes = await fetch(`http://localhost:${PORT}/session`);
  const session = await sessionRes.json();
  const user = session.currentUser;

  if (!user) {
    return res.status(401).json({ error: "Non connecté" });
  }

  const allItems = [
    { label: "Mon espace", href: "/me", roles: ["admin", "manager", "agency"] },
    { label: "Dashboard", href: "/", roles: ["admin", "manager"] },
    { label: "Direction", href: "/direction", roles: ["admin", "manager"] },
    { label: "Rapport mensuel", href: "/monthly-report", roles: ["admin", "manager"] },
    { label: "Plan mensuel", href: "/monthly-action-plan", roles: ["admin", "manager"] },
    { label: "Centre IA SEO", href: "/seo-ai-center", roles: ["admin", "manager"] },
    { label: "Scores globaux", href: "/global-scores", roles: ["admin", "manager"] },
    { label: "Actions globales", href: "/global-actions", roles: ["admin", "manager"] },
    { label: "Google Posts", href: "/google-posts", roles: ["admin", "manager", "agency"] },
    { label: "Validation Posts", href: "/google-post-validation", roles: ["admin", "manager"] },
    { label: "Demandes avis", href: "/review-requests", roles: ["admin", "manager", "agency"] },
    { label: "Actions avis", href: "/review-requests/actions", roles: ["admin", "manager"] },
    { label: "Rankings", href: "/rankings", roles: ["admin", "manager"] },
    { label: "Utilisateurs", href: "/users", roles: ["admin"] },
    { label: "Configuration", href: "/settings", roles: ["admin"] },
    { label: "Système", href: "/system-health", roles: ["admin"] }
  ];

  const items = allItems.filter((item) => item.roles.includes(user.role));

  res.json({
    user,
    total: items.length,
    items
  });
});


app.get("/agency-onboarding", async (req, res) => {
  const agencies = await prisma.agency.findMany({
    orderBy: { city: "asc" }
  });

  const dashboardRes = await fetch(`http://localhost:${PORT}/dashboard`);
  const dashboard = await dashboardRes.json();

  const rows = agencies.map((agency) => {
    const d = dashboard.find((item) => item.id === agency.id) || {};

    const checklist = [
      {
        key: "identity",
        label: "Identité agence renseignée",
        ok: Boolean(agency.name && agency.city)
      },
      {
        key: "citations",
        label: "Au moins 5 annuaires suivis",
        ok: (d.directoriesOk || 0) >= 5
      },
      {
        key: "critical",
        label: "Aucun annuaire critique manquant",
        ok: (d.criticalMissingCount || 0) === 0
      },
      {
        key: "reviews",
        label: "Module demandes d’avis disponible",
        ok: true
      },
      {
        key: "posts",
        label: "Google Posts générés",
        ok: true
      },
      {
        key: "portal",
        label: "Portail agence disponible",
        ok: true
      }
    ];

    const completed = checklist.filter((item) => item.ok).length;
    const score = Math.round((completed / checklist.length) * 100);

    return {
      agencyId: agency.id,
      agencyName: agency.name,
      city: agency.city,
      score,
      completed,
      total: checklist.length,
      checklist
    };
  });

  res.json({
    totalAgencies: rows.length,
    averageScore: Math.round(
      rows.reduce((sum, r) => sum + r.score, 0) / Math.max(rows.length, 1)
    ),
    rows
  });
});


app.get("/production-status", async (req, res) => {

  const dashboardRes = await fetch(`http://localhost:${PORT}/dashboard`);
  const dashboard = await dashboardRes.json();

  const onboardingRes = await fetch(`http://localhost:${PORT}/agency-onboarding`);
  const onboarding = await onboardingRes.json();

  const notificationsRes = await fetch(`http://localhost:${PORT}/network-notifications`);
  const notifications = await notificationsRes.json();

  const avgCitation = Math.round(
    dashboard.reduce((sum, a) => sum + a.citationScore, 0)
    / Math.max(dashboard.length, 1)
  );

  const highPriority = dashboard.filter(
    (a) => a.priority === "Haute"
  ).length;

  res.json({

    network: {
      agencies: dashboard.length,
      averageCitation: avgCitation,
      highPriority,
      onboardingAverage: onboarding.averageScore
    },

    directory: {
      configuredAgencies: agencyDirectory.length,
      expectedAgencies: 8,
      completionRate: Math.round((agencyDirectory.length / 8) * 100),
      readyAgencies: agencyDirectory.filter((agency) =>
        agency.phone &&
        agency.phone !== "00 00 00 00 00" &&
        agency.email &&
        agency.googleReviewUrl &&
        agency.appointmentUrl
      ).length
    },

    modules: [
      {
        name: "Dashboard réseau",
        status: "ready"
      },
      {
        name: "Google Posts",
        status: "ready"
      },
      {
        name: "Demandes d’avis",
        status: "ready"
      },
      {
        name: "Gestion utilisateurs",
        status: "ready"
      },
      {
        name: "Permissions",
        status: "ready"
      },
      {
        name: "Portails agences",
        status: "ready"
      },
      {
        name: "DataForSEO",
        status: "pending"
      }
    ],

    alerts: notifications.notifications || []
  });
});


const auditLogs = [
  {
    id: 1,
    type: "login",
    message: "Connexion administrateur",
    user: "Direction Mondescale",
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    type: "review",
    message: "Validation Google Post",
    user: "Responsable Réseau",
    createdAt: new Date().toISOString()
  }
];

app.get("/audit-logs", (req, res) => {

  res.json({
    total: auditLogs.length,
    logs: auditLogs
  });
});


app.get("/api-readiness", (req, res) => {

  res.json({

    googleBusinessProfile: {
      ready: false,
      connected: false
    },

    dataforseo: {
      ready: true,
      connected: process.env.DATAFORSEO_ENABLED === "true"
    },

    whatsapp: {
      ready: false,
      connected: false
    },

    email: {
      ready: false,
      connected: false
    }

  });
});


app.get("/platform-info", (req, res) => {

  res.json({
    name: "Mondescale Local Engine",
    version: "0.9.0-beta",
    environment: "production-ready",
    stack: [
      "Next.js",
      "Node.js",
      "PostgreSQL",
      "Docker"
    ],
    modules: 32,
    agenciesSupported: 100,
    updatedAt: new Date().toISOString()
  });
});


const networkConfig = [
  {
    id: 1,
    code: "mondescale",
    name: "Mondescale Voyages",
    agencies: 9,
    active: true
  },
  {
    id: 2,
    code: "captainferry",
    name: "Captain Ferry",
    agencies: 1,
    active: false
  }
];

app.get("/networks", (req, res) => {

  res.json({
    total: networkConfig.length,
    networks: networkConfig
  });
});


app.get("/networks/:code", (req, res) => {
  const network = networkConfig.find((n) => n.code === req.params.code);

  if (!network) {
    return res.status(404).json({ error: "Network not found" });
  }

  res.json({
    ...network,
    modules: [
      "Dashboard SEO local",
      "Google Posts",
      "Demandes d’avis",
      "Citations locales",
      "Scores globaux",
      "Rapports direction"
    ],
    nextSteps: network.active
      ? [
          "Brancher APIs réelles",
          "Activer suivi ranking réel",
          "Automatiser exports mensuels"
        ]
      : [
          "Créer les agences",
          "Configurer l’identité de marque",
          "Préparer les liens avis Google"
        ]
  });
});


app.get("/networks/:code/brand", (req, res) => {
  const network = networkConfig.find((n) => n.code === req.params.code);

  if (!network) {
    return res.status(404).json({ error: "Network not found" });
  }

  const brands = {
    mondescale: {
      primaryColor: "#111827",
      accentColor: "#0ea5e9",
      tagline: "Créateur de vos plus beaux voyages",
      businessType: "Agences de voyages",
      activeModules: ["citations", "google-posts", "reviews", "rankings"]
    },
    captainferry: {
      primaryColor: "#0f172a",
      accentColor: "#58c4f2",
      tagline: "Traversées maritimes et ferries",
      businessType: "Billetterie maritime",
      activeModules: ["google-posts", "reviews"]
    }
  };

  res.json({
    network,
    brand: brands[network.code] || null
  });
});



app.get("/agency-directory", (req, res) => {

  res.json({
    total: agencyDirectory.length,
    agencies: agencyDirectory
  });
});

app.get("/agency-directory/:code", (req, res) => {

  const agency = agencyDirectory.find(
    (a) => a.code === req.params.code
  );

  if (!agency) {
    return res.status(404).json({
      error: "Agence introuvable"
    });
  }

  res.json(agency);
});


app.get("/agency-directory-review-messages", (req, res) => {
  const messages = agencyDirectory.map((agency) => ({
    agencyId: agency.id,
    code: agency.code,
    agencyName: agency.name,
    city: agency.city,
    phone: agency.phone,
    email: agency.email,
    googleReviewUrl: agency.googleReviewUrl,
    sms: `Bonjour, merci d’avoir fait confiance à ${agency.name}. Votre avis Google nous aide beaucoup : ${agency.googleReviewUrl}`,
    whatsapp: `Bonjour 👋\n\nMerci d’avoir fait confiance à ${agency.name} pour votre projet voyage.\n\nVotre avis Google est précieux pour notre agence de voyages à ${agency.city} :\n${agency.googleReviewUrl}\n\nMerci beaucoup et à bientôt.`,
    emailSubject: `Votre avis compte pour ${agency.name}`,
    emailBody: `Bonjour,\n\nMerci d’avoir fait confiance à ${agency.name} pour votre projet voyage.\n\nVotre retour est précieux pour notre équipe et aide les futurs voyageurs à choisir une agence de voyages de confiance à ${agency.city}.\n\nVous pouvez déposer votre avis ici :\n${agency.googleReviewUrl}\n\nMerci encore pour votre confiance.\n\nL’équipe ${agency.name}`
  }));

  res.json({
    total: messages.length,
    messages
  });
});


app.get("/agency-directory-google-posts", (req, res) => {
  const posts = [];

  agencyDirectory.forEach((agency) => {
    const templates = [
      {
        theme: "rdv-voyage",
        title: `Préparez votre prochain voyage avec ${agency.name}`,
        cta: "Prendre rendez-vous",
        content: `Envie de préparer vos prochaines vacances avec un conseiller voyage ?\n\nVotre agence ${agency.name} à ${agency.city} vous accompagne pour trouver le séjour, le circuit, la croisière ou le voyage sur mesure adapté à vos envies.\n\nPrenez rendez-vous ici : ${agency.appointmentUrl}\n\nTéléphone : ${agency.phone}`
      },
      {
        theme: "avis-confiance",
        title: `Votre avis compte pour notre agence de voyages à ${agency.city}`,
        cta: "Déposer un avis",
        content: `Vous avez réservé votre voyage avec ${agency.name} ?\n\nVotre retour d’expérience aide notre équipe et les futurs voyageurs à choisir une agence de voyages de confiance à ${agency.city}.\n\nDéposez votre avis Google ici : ${agency.googleReviewUrl}`
      },
      {
        theme: "conseil-local",
        title: `Une agence locale pour vos projets de voyage`,
        cta: "Nous contacter",
        content: `Chez ${agency.name}, nous privilégions le conseil, l’accompagnement et la sécurité de votre réservation.\n\nNotre équipe à ${agency.city} vous accueille pour vos vacances en famille, circuits, croisières, voyages de noces ou séjours sur mesure.\n\nContact : ${agency.phone} — ${agency.email}`
      }
    ];

    templates.forEach((template) => {
      posts.push({
        agencyId: agency.id,
        code: agency.code,
        agencyName: agency.name,
        city: agency.city,
        phone: agency.phone,
        email: agency.email,
        theme: template.theme,
        title: template.title,
        cta: template.cta,
        content: template.content
      });
    });
  });

  res.json({
    total: posts.length,
    agencies: agencyDirectory.length,
    posts
  });
});


app.get("/agency-directory-google-posts-calendar", (req, res) => {
  const month = req.query.month || "2026-05";
  const days = [5, 10, 15];

  const posts = [];

  agencyDirectory.forEach((agency, agencyIndex) => {
    const templates = [
      {
        theme: "rdv-voyage",
        title: `Préparez votre prochain voyage avec ${agency.name}`,
        cta: "Prendre rendez-vous",
        content: `Envie de préparer vos prochaines vacances avec un conseiller voyage ?\n\nVotre agence ${agency.name} à ${agency.city} vous accompagne pour trouver le séjour, le circuit, la croisière ou le voyage sur mesure adapté à vos envies.\n\nPrenez rendez-vous ici : ${agency.appointmentUrl}\n\nTéléphone : ${agency.phone}`
      },
      {
        theme: "avis-confiance",
        title: `Votre avis compte pour notre agence de voyages à ${agency.city}`,
        cta: "Déposer un avis",
        content: `Vous avez réservé votre voyage avec ${agency.name} ?\n\nVotre retour d’expérience aide notre équipe et les futurs voyageurs à choisir une agence de voyages de confiance à ${agency.city}.\n\nDéposez votre avis Google ici : ${agency.googleReviewUrl}`
      },
      {
        theme: "conseil-local",
        title: `Une agence locale pour vos projets de voyage`,
        cta: "Nous contacter",
        content: `Chez ${agency.name}, nous privilégions le conseil, l’accompagnement et la sécurité de votre réservation.\n\nNotre équipe à ${agency.city} vous accueille pour vos vacances en famille, circuits, croisières, voyages de noces ou séjours sur mesure.\n\nContact : ${agency.phone} — ${agency.email}`
      }
    ];

    templates.forEach((template, templateIndex) => {
      const day = days[(agencyIndex + templateIndex) % days.length];

      posts.push({
        agencyId: agency.id,
        code: agency.code,
        agencyName: agency.name,
        city: agency.city,
        phone: agency.phone,
        email: agency.email,
        month,
        publicationDate: `${month}-${String(day).padStart(2, "0")}`,
        status: "planned",
        theme: template.theme,
        title: template.title,
        cta: template.cta,
        content: template.content
      });
    });
  });

  posts.sort((a, b) => a.publicationDate.localeCompare(b.publicationDate));

  res.json({
    month,
    total: posts.length,
    agencies: agencyDirectory.length,
    posts
  });
});


app.get("/agency-directory-google-posts-calendar/export", async (req, res) => {
  const month = req.query.month || "2026-06";

  const calendarRes = await fetch(`http://localhost:${PORT}/agency-directory-google-posts-calendar?month=${month}`);
  const calendar = await calendarRes.json();

  const header = "Date;Agence;Ville;Téléphone;Email;Thème;Titre;Contenu;CTA;Statut";

  const rows = calendar.posts.map((post) =>
    [
      post.publicationDate,
      post.agencyName,
      post.city,
      post.phone,
      post.email,
      post.theme,
      post.title,
      post.content,
      post.cta,
      post.status
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(";")
  );

  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=calendrier-posts-agences-${month}.csv`
  );

  res.send("\uFEFF" + csv);
});


app.get("/agency-directory/export", (req, res) => {
  const header = "Code;Agence;Ville;Téléphone;Email;Lien avis Google;Lien RDV;Facebook;Instagram;Catégorie;Actif";

  const rows = agencyDirectory.map((agency) =>
    [
      agency.code,
      agency.name,
      agency.city,
      agency.phone,
      agency.email,
      agency.googleReviewUrl,
      agency.appointmentUrl,
      agency.facebook,
      agency.instagram,
      agency.category,
      agency.active ? "Oui" : "Non"
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(";")
  );

  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=referentiel-agences-mondescale.csv"
  );

  res.send("\uFEFF" + csv);
});


app.get("/agency-directory/quality", (req, res) => {
  const rows = agencyDirectory.map((agency) => {
    const checks = [
      { key: "name", label: "Nom agence", ok: Boolean(agency.name) },
      { key: "city", label: "Ville", ok: Boolean(agency.city) },
      { key: "phone", label: "Téléphone", ok: Boolean(agency.phone) },
      { key: "email", label: "Email", ok: Boolean(agency.email) },
      { key: "review", label: "Lien avis Google", ok: Boolean(agency.googleReviewUrl) },
      { key: "appointment", label: "Lien RDV", ok: Boolean(agency.appointmentUrl) },
      { key: "category", label: "Catégorie GBP", ok: Boolean(agency.category) }
    ];

    const okCount = checks.filter((c) => c.ok).length;
    const missing = checks.filter((c) => !c.ok);
    const score = Math.round((okCount / checks.length) * 100);

    let priority = "OK";
    if (score < 70) priority = "Haute";
    else if (score < 100) priority = "Moyenne";

    return {
      agencyId: agency.id,
      code: agency.code,
      agencyName: agency.name,
      city: agency.city,
      score,
      priority,
      missingCount: missing.length,
      missing,
      checks
    };
  });

  res.json({
    totalAgencies: rows.length,
    averageScore: Math.round(
      rows.reduce((sum, r) => sum + r.score, 0) / Math.max(rows.length, 1)
    ),
    toFix: rows.filter((r) => r.priority !== "OK").length,
    rows
  });
});


app.get("/agency-directory/import-template", (req, res) => {
  const header = "code;name;city;phone;email;googleReviewUrl;appointmentUrl;facebook;instagram;category;active";

  const sampleRows = [
    [
      "nevers",
      "Mondescale Nevers",
      "Nevers",
      "00 00 00 00 00",
      "nevers@mondescale.com",
      "https://g.page/r/XXXXX/review",
      "https://s01.o2switch.cloud/apps/calendar/appointment/XXXXX",
      "https://facebook.com/mondescale",
      "https://instagram.com/mondescalevoyages",
      "Agence de voyages",
      "true"
    ]
  ];

  const csv = [
    header,
    ...sampleRows.map((row) =>
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")
    )
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=modele-import-agences.csv"
  );

  res.send("\uFEFF" + csv);
});


app.get("/agency-directory/completion", (req, res) => {
  const expectedAgencies = [
    "bois-colombes",
    "dax",
    "gien",
    "lamorlaye",
    "maurepas",
    "melun",
    "nevers",
    "ozoir"
  ];

  const existingCodes = agencyDirectory.map((a) => a.code);

  const rows = expectedAgencies.map((code) => {
    const agency = agencyDirectory.find((a) => a.code === code);

    return {
      code,
      exists: Boolean(agency),
      agencyName: agency?.name || "",
      city: agency?.city || "",
      missing: agency
        ? []
        : ["name", "city", "phone", "email", "googleReviewUrl", "appointmentUrl"]
    };
  });

  res.json({
    expected: expectedAgencies.length,
    existing: rows.filter((r) => r.exists).length,
    missing: rows.filter((r) => !r.exists).length,
    rows
  });
});


app.get("/agency-directory/completion/export", async (req, res) => {
  const completionRes = await fetch(`http://localhost:${PORT}/agency-directory/completion`);
  const completion = await completionRes.json();

  const header = "Code;Présente;Agence;Ville;Champs manquants";

  const rows = completion.rows.map((row) =>
    [
      row.code,
      row.exists ? "Oui" : "Non",
      row.agencyName || "",
      row.city || "",
      row.missing.length ? row.missing.join(", ") : ""
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(";")
  );

  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=completion-referentiel-agences.csv"
  );

  res.send("\uFEFF" + csv);
});


app.get("/agency-directory/fix-plan", async (req, res) => {
  const completionRes = await fetch(`http://localhost:${PORT}/agency-directory/completion`);
  const completion = await completionRes.json();

  const qualityRes = await fetch(`http://localhost:${PORT}/agency-directory/quality`);
  const quality = await qualityRes.json();

  const actions = [];

  completion.rows
    .filter((row) => !row.exists)
    .forEach((row) => {
      actions.push({
        type: "missing-agency",
        priority: "high",
        code: row.code,
        title: `Créer l’agence ${row.code}`,
        description: "Ajouter les données complètes dans le référentiel agences.",
        fields: row.missing
      });
    });

  quality.rows
    .filter((row) => row.priority !== "OK")
    .forEach((row) => {
      actions.push({
        type: "incomplete-agency",
        priority: row.priority === "Haute" ? "high" : "medium",
        code: row.code,
        title: `Compléter ${row.agencyName}`,
        description: `${row.missingCount} champ(s) manquant(s) ou incomplet(s).`,
        fields: row.missing.map((m) => m.key)
      });
    });

  res.json({
    totalActions: actions.length,
    high: actions.filter((a) => a.priority === "high").length,
    medium: actions.filter((a) => a.priority === "medium").length,
    actions
  });
});


app.get("/agency-directory/fix-plan/export", async (req, res) => {
  const fixRes = await fetch(`http://localhost:${PORT}/agency-directory/fix-plan`);
  const fix = await fixRes.json();

  const header = "Type;Priorité;Code agence;Action;Description;Champs";

  const rows = fix.actions.map((action) =>
    [
      action.type,
      action.priority,
      action.code,
      action.title,
      action.description,
      action.fields.join(", ")
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(";")
  );

  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=plan-correction-referentiel.csv"
  );

  res.send("\uFEFF" + csv);
});


app.get("/agency-directory/missing/export", (req, res) => {

  const fields = [
    "phone",
    "email",
    "googleReviewUrl",
    "appointmentUrl"
  ];

  const rows = [];

  agencyDirectory.forEach((agency) => {

    fields.forEach((field) => {

      const value = agency[field];

      if (!value || value === "00 00 00 00 00") {

        rows.push({
          code: agency.code,
          agency: agency.name,
          city: agency.city,
          field,
          currentValue: value || ""
        });
      }
    });
  });

  const header = "Code;Agence;Ville;Champ;Valeur actuelle";

  const csvRows = rows.map((row) =>
    [
      row.code,
      row.agency,
      row.city,
      row.field,
      row.currentValue
    ]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(";")
  );

  const csv = [header, ...csvRows].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=donnees-agences-manquantes.csv"
  );

  res.send("\uFEFF" + csv);
});


app.get("/agency-directory/ready", (req, res) => {
  const rows = agencyDirectory.map((agency) => {
    const required = ["phone", "email", "googleReviewUrl", "appointmentUrl"];

    const missing = required.filter((field) => {
      const value = agency[field];
      return !value || value === "00 00 00 00 00";
    });

    return {
      code: agency.code,
      agencyId: agency.id,
      agencyName: agency.name,
      city: agency.city,
      ready: missing.length === 0,
      missing,
      canGenerateReviews: Boolean(agency.googleReviewUrl),
      canGeneratePosts: Boolean(agency.phone && agency.email && agency.appointmentUrl)
    };
  });

  res.json({
    total: rows.length,
    ready: rows.filter((r) => r.ready).length,
    notReady: rows.filter((r) => !r.ready).length,
    rows
  });
});


app.get("/google-business-readiness", (req, res) => {

  const rows = agencyDirectory.map((agency) => {

    const checks = {
      googleBusinessId: Boolean(agency.googleBusinessId),
      placeId: Boolean(agency.placeId),
      reviewUrl: Boolean(agency.googleReviewUrl),
      phone: Boolean(agency.phone),
      connected: Boolean(agency.googleConnected)
    };

    const score = Math.round(
      (
        Object.values(checks).filter(Boolean).length /
        Object.keys(checks).length
      ) * 100
    );

    return {
      code: agency.code,
      agencyName: agency.name,
      city: agency.city,
      score,
      checks
    };
  });

  res.json({
    total: rows.length,
    average: Math.round(
      rows.reduce((s, r) => s + r.score, 0) /
      Math.max(rows.length, 1)
    ),
    rows
  });
});


app.get("/dataforseo-readiness", (req, res) => {
  const rows = agencyDirectory.map((agency) => {
    const dfs = agency.dataForSeo || {};

    const checks = {
      locationName: Boolean(dfs.locationName),
      keywords: Array.isArray(dfs.keywords) && dfs.keywords.length > 0,
      enabled: Boolean(dfs.enabled),
      globalApiConfigured: Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD)
    };

    const score = Math.round(
      Object.values(checks).filter(Boolean).length / Object.keys(checks).length * 100
    );

    return {
      code: agency.code,
      agencyName: agency.name,
      city: agency.city,
      score,
      checks,
      keywords: dfs.keywords || []
    };
  });

  res.json({
    total: rows.length,
    average: Math.round(rows.reduce((sum, r) => sum + r.score, 0) / Math.max(rows.length, 1)),
    rows
  });
});

app.get("/dataforseo-location-suggestions", (req, res) => {
  const rows = agencyDirectory.map((agency) => ({
    code: agency.code,
    agencyName: agency.name,
    city: agency.city,
    suggestedLocationName: `${agency.city}, France`,
    currentLocationName: agency.dataForSeo?.locationName || "",
    ready: Boolean(agency.dataForSeo?.locationName)
  }));

  res.json({
    total: rows.length,
    ready: rows.filter((r) => r.ready).length,
    missing: rows.filter((r) => !r.ready).length,
    rows
  });
});

app.get("/dataforseo-keywords", (req, res) => {
  const rows = agencyDirectory.map((agency) => {
    const keywords = agency.dataForSeo?.keywords || [];

    return {
      code: agency.code,
      agencyName: agency.name,
      city: agency.city,
      keywords,
      count: keywords.length,
      ready: keywords.length > 0
    };
  });

  res.json({
    total: rows.length,
    ready: rows.filter((r) => r.ready).length,
    missing: rows.filter((r) => !r.ready).length,
    rows
  });
});

app.get("/dataforseo-keywords/export", async (req, res) => {
  const dataRes = await fetch(`http://localhost:${PORT}/dataforseo-keywords`);
  const data = await dataRes.json();

  const header = "Code;Agence;Ville;Mot-clé";

  const rows = [];

  data.rows.forEach((agency) => {
    if (agency.keywords.length === 0) {
      rows.push([agency.code, agency.agencyName, agency.city, ""]);
    } else {
      agency.keywords.forEach((keyword) => {
        rows.push([agency.code, agency.agencyName, agency.city, keyword]);
      });
    }
  });

  const csvRows = rows.map((row) =>
    row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=dataforseo-keywords.csv");
  res.send("\uFEFF" + [header, ...csvRows].join("\n"));
});

app.get("/dataforseo-keywords/generate", (req, res) => {

  const baseKeywords = [
    "agence de voyage",
    "voyage sur mesure",
    "croisière",
    "club vacances",
    "séjour tout compris",
    "voyage de noces",
    "conseiller voyage"
  ];

  const rows = agencyDirectory.map((agency) => {

    const generated = [];

    baseKeywords.forEach((keyword) => {

      generated.push(keyword);

      generated.push(`${keyword} ${agency.city}`);

      generated.push(`${keyword} ${agency.name}`);

    });

    return {
      code: agency.code,
      agencyName: agency.name,
      city: agency.city,
      generatedKeywords: [...new Set(generated)]
    };
  });

  res.json({
    total: rows.length,
    rows
  });
});

app.get("/dataforseo-keywords/generate/export", async (req, res) => {

  const genRes = await fetch(`http://localhost:${PORT}/dataforseo-keywords/generate`);
  const data = await genRes.json();

  const header = "Code;Agence;Ville;Mot-clé";

  const rows = [];

  data.rows.forEach((agency) => {

    agency.generatedKeywords.forEach((keyword) => {

      rows.push([
        agency.code,
        agency.agencyName,
        agency.city,
        keyword
      ]);

    });

  });

  const csvRows = rows.map((row) =>
    row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";")
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=keywords-generes-dataforseo.csv"
  );

  res.send("\uFEFF" + [header, ...csvRows].join("\n"));
});

app.get("/seo-keyword-clusters", (req, res) => {

  const rows = agencyDirectory.map((agency) => {

    const city = agency.city;
    const brand = agency.name;

    const clusters = {

      brand: [
        brand,
        `${brand} ${city}`,
        `${brand} avis`,
        `${brand} téléphone`
      ],

      local: [
        `agence de voyage ${city}`,
        `voyage ${city}`,
        `agence vacances ${city}`,
        `conseiller voyage ${city}`
      ],

      transactionnel: [
        `séjour tout compris ${city}`,
        `club marmara ${city}`,
        `croisière départ ${city}`,
        `voyage sur mesure ${city}`
      ],

      inspiration: [
        `idée vacances ${city}`,
        `où partir depuis ${city}`,
        `vacances famille ${city}`,
        `voyage luxe ${city}`
      ],

      croisiere: [
        `croisière méditerranée ${city}`,
        `croisière msc ${city}`,
        `croisière caraïbes ${city}`
      ],

      surMesure: [
        `voyage japon ${city}`,
        `voyage bali ${city}`,
        `voyage usa ${city}`,
        `voyage personnalisé ${city}`
      ]
    };

    return {
      code: agency.code,
      agencyName: agency.name,
      city,
      clusters
    };

  });

  res.json({
    total: rows.length,
    rows
  });
});

app.get("/seo-keyword-clusters/export", async (req, res) => {

  const clustersRes = await fetch(`http://localhost:${PORT}/seo-keyword-clusters`);
  const data = await clustersRes.json();

  const header = "Code;Agence;Ville;Cluster;Keyword";

  const rows = [];

  data.rows.forEach((agency) => {

    Object.entries(agency.clusters).forEach(([cluster, keywords]) => {

      keywords.forEach((keyword) => {

        rows.push([
          agency.code,
          agency.agencyName,
          agency.city,
          cluster,
          keyword
        ]);

      });

    });

  });

  const csvRows = rows.map((row) =>
    row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";")
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=seo-keyword-clusters.csv"
  );

  res.send("\uFEFF" + [header, ...csvRows].join("\n"));
});

app.get("/seo-cluster-google-posts", async (req, res) => {
  const clustersRes = await fetch(`http://localhost:${PORT}/seo-keyword-clusters`);
  const data = await clustersRes.json();

  const posts = [];

  data.rows.forEach((agency) => {
    Object.entries(agency.clusters).forEach(([cluster, keywords]) => {
      const mainKeyword = keywords[0];

      posts.push({
        code: agency.code,
        agencyName: agency.agencyName,
        city: agency.city,
        cluster,
        keyword: mainKeyword,
        title: `${mainKeyword} : votre agence vous accompagne`,
        cta: "Prendre rendez-vous",
        content: `Vous recherchez ${mainKeyword} ?\n\nNotre agence ${agency.agencyName} à ${agency.city} vous accompagne avec des conseils personnalisés, des offres sélectionnées et un vrai suivi avant, pendant et après votre voyage.\n\nPassez en agence ou prenez rendez-vous avec un conseiller voyage.`
      });
    });
  });

  res.json({
    total: posts.length,
    posts
  });
});

app.get("/seo-cluster-google-posts/export", async (req, res) => {
  const postsRes = await fetch(`http://localhost:${PORT}/seo-cluster-google-posts`);
  const data = await postsRes.json();

  const header = "Agence;Ville;Cluster;Keyword;Titre;Contenu;CTA";

  const rows = data.posts.map((post) =>
    [
      post.agencyName,
      post.city,
      post.cluster,
      post.keyword,
      post.title,
      post.content,
      post.cta
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(";")
  );

  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=posts-google-clusters-seo.csv"
  );

  res.send("\uFEFF" + csv);
});

app.get("/seo-cluster-calendar", async (req, res) => {
  const month = req.query.month || "2026-06";
  const days = [3, 8, 13, 18, 23, 28];

  const postsRes = await fetch(`http://localhost:${PORT}/seo-cluster-google-posts`);
  const postsData = await postsRes.json();

  const posts = postsData.posts.map((post, index) => {
    const day = days[index % days.length];

    return {
      ...post,
      month,
      publicationDate: `${month}-${String(day).padStart(2, "0")}`,
      status: "planned"
    };
  });

  posts.sort((a, b) => a.publicationDate.localeCompare(b.publicationDate));

  res.json({
    month,
    total: posts.length,
    posts
  });
});

app.get("/seo-cluster-calendar/export", async (req, res) => {
  const month = req.query.month || "2026-06";

  const calendarRes = await fetch(`http://localhost:${PORT}/seo-cluster-calendar?month=${month}`);
  const data = await calendarRes.json();

  const header = "Date;Agence;Ville;Cluster;Keyword;Titre;Contenu;CTA;Statut";

  const rows = data.posts.map((post) =>
    [
      post.publicationDate,
      post.agencyName,
      post.city,
      post.cluster,
      post.keyword,
      post.title,
      post.content,
      post.cta,
      post.status
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(";")
  );

  const csv = [header, ...rows].join("\\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=calendrier-seo-clusters-${month}.csv`);
  res.send("\\uFEFF" + csv);
});

const seoClusterCalendarStatuses = {};

app.post("/seo-cluster-calendar/status", express.json(), (req, res) => {
  const { key, status } = req.body;

  if (!key || !status) {
    return res.status(400).json({
      error: "key et status requis"
    });
  }

  seoClusterCalendarStatuses[key] = status;

  res.json({
    success: true,
    key,
    status
  });
});

app.get("/seo-cluster-calendar/statuses", (req, res) => {
  res.json(seoClusterCalendarStatuses);
});

app.get("/seo-cluster-calendar/stats", async (req, res) => {
  const month = req.query.month || "2026-06";

  const calendarRes = await fetch(`http://localhost:${PORT}/seo-cluster-calendar?month=${month}`);
  const calendar = await calendarRes.json();

  const rows = calendar.posts.map((post) => {
    const key = `${post.publicationDate}-${post.agencyName}-${post.cluster}`;
    const status = seoClusterCalendarStatuses[key] || post.status;

    return {
      ...post,
      key,
      status
    };
  });

  res.json({
    month,
    total: rows.length,
    planned: rows.filter((p) => p.status === "planned").length,
    validated: rows.filter((p) => p.status === "validated").length,
    published: rows.filter((p) => p.status === "published").length,
    rows
  });
});

app.get("/seo-cluster-calendar/stats/export", async (req, res) => {
  const month = req.query.month || "2026-06";

  const statsRes = await fetch(`http://localhost:${PORT}/seo-cluster-calendar/stats?month=${month}`);
  const stats = await statsRes.json();

  const header = "Mois;Date;Agence;Ville;Cluster;Keyword;Titre;Statut";

  const rows = stats.rows.map((post) =>
    [
      month,
      post.publicationDate,
      post.agencyName,
      post.city,
      post.cluster,
      post.keyword,
      post.title,
      post.status
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(";")
  );

  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=stats-calendrier-seo-${month}.csv`
  );

  res.send("\uFEFF" + csv);
});

app.get("/seo-today", async (req, res) => {
  const month = req.query.month || "2026-06";

  const notificationsRes = await fetch(`http://localhost:${PORT}/network-notifications?month=${month}`);
  const notifications = await notificationsRes.json();

  const seoStatsRes = await fetch(`http://localhost:${PORT}/seo-cluster-calendar/stats?month=${month}`);
  const seoStats = await seoStatsRes.json();

  const readyRes = await fetch(`http://localhost:${PORT}/agency-directory/ready`);
  const ready = await readyRes.json();

  const fixPlanRes = await fetch(`http://localhost:${PORT}/agency-directory/fix-plan`);
  const fixPlan = await fixPlanRes.json();

  const postsToValidate = seoStats.rows
    .filter((post) => post.status === "planned")
    .slice(0, 10);

  const agenciesNotReady = ready.rows
    .filter((agency) => !agency.ready)
    .slice(0, 10);

  res.json({
    month,
    notifications: notifications.notifications || [],
    postsToValidate,
    agenciesNotReady,
    fixActions: fixPlan.actions.slice(0, 10),
    summary: {
      notifications: notifications.total || 0,
      postsToValidate: postsToValidate.length,
      agenciesNotReady: agenciesNotReady.length,
      fixActions: fixPlan.totalActions || 0
    }
  });
});

app.get("/seo-today/export", async (req, res) => {
  const month = req.query.month || "2026-06";

  const todayRes = await fetch(`http://localhost:${PORT}/seo-today?month=${month}`);
  const today = await todayRes.json();

  const rows = [];

  today.postsToValidate.forEach((post) => {
    rows.push([
      month,
      "post-seo",
      "medium",
      post.agencyName,
      post.city,
      `Valider le post SEO ${post.cluster}`,
      post.keyword,
      post.publicationDate
    ]);
  });

  today.agenciesNotReady.forEach((agency) => {
    rows.push([
      month,
      "agence-non-prete",
      "high",
      agency.agencyName,
      agency.city,
      "Compléter le référentiel agence",
      agency.missing.join(", "),
      ""
    ]);
  });

  today.fixActions.forEach((action) => {
    rows.push([
      month,
      "referentiel",
      action.priority,
      action.title,
      action.code,
      action.description,
      action.fields.join(", "),
      ""
    ]);
  });

  const header = "Mois;Type;Priorité;Agence;Ville;Action;Détail;Date";

  const csvRows = rows.map((row) =>
    row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=seo-today-${month}.csv`);
  res.send("\uFEFF" + [header, ...csvRows].join("\n"));
});

app.get("/seo-monthly-report", async (req, res) => {
  const month = req.query.month || "2026-06";

  const todayRes = await fetch(`http://localhost:${PORT}/seo-today?month=${month}`);
  const today = await todayRes.json();

  const statsRes = await fetch(`http://localhost:${PORT}/seo-cluster-calendar/stats?month=${month}`);
  const stats = await statsRes.json();

  const readyRes = await fetch(`http://localhost:${PORT}/agency-directory/ready`);
  const ready = await readyRes.json();

  const dataforseoRes = await fetch(`http://localhost:${PORT}/dataforseo-readiness`);
  const dataforseo = await dataforseoRes.json();

  res.json({
    month,
    summary: {
      seoPostsTotal: stats.total,
      seoPostsPlanned: stats.planned,
      seoPostsValidated: stats.validated,
      seoPostsPublished: stats.published,
      agenciesReady: ready.ready,
      agenciesNotReady: ready.notReady,
      dataforseoAverage: dataforseo.average,
      todayActions: today.summary.fixActions + today.summary.postsToValidate
    },
    priorities: [
      ...today.agenciesNotReady.map((agency) => ({
        type: "referentiel",
        priority: "high",
        title: `Compléter ${agency.agencyName}`,
        detail: agency.missing.join(", ")
      })),
      ...today.postsToValidate.map((post) => ({
        type: "post-seo",
        priority: "medium",
        title: `Valider post ${post.agencyName}`,
        detail: `${post.cluster} · ${post.keyword}`
      }))
    ].slice(0, 20)
  });
});

app.get("/seo-month-priorities", async (req, res) => {
  const month = req.query.month || "2026-06";

  const reportRes = await fetch(`http://localhost:${PORT}/seo-monthly-report?month=${month}`);
  const report = await reportRes.json();

  const todayRes = await fetch(`http://localhost:${PORT}/seo-today?month=${month}`);
  const today = await todayRes.json();

  const priorities = [];

  today.agenciesNotReady.forEach((agency) => {
    priorities.push({
      level: 1,
      priority: "high",
      type: "referentiel",
      title: `Compléter le référentiel — ${agency.agencyName}`,
      detail: `Champs manquants : ${agency.missing.join(", ")}`,
      link: "/agency-directory-fix-plan"
    });
  });

  today.postsToValidate.forEach((post) => {
    priorities.push({
      level: 2,
      priority: "medium",
      type: "post-seo",
      title: `Valider le post SEO — ${post.agencyName}`,
      detail: `${post.publicationDate} · ${post.cluster} · ${post.keyword}`,
      link: "/seo-cluster-calendar"
    });
  });

  report.priorities.forEach((item) => {
    priorities.push({
      level: item.priority === "high" ? 1 : 3,
      priority: item.priority,
      type: item.type,
      title: item.title,
      detail: item.detail,
      link: "/seo-monthly-report"
    });
  });

  priorities.sort((a, b) => a.level - b.level);

  res.json({
    month,
    total: priorities.length,
    high: priorities.filter((p) => p.priority === "high").length,
    medium: priorities.filter((p) => p.priority === "medium").length,
    priorities
  });
});

app.get("/seo-month-priorities/export", async (req, res) => {
  const month = req.query.month || "2026-06";

  const prioritiesRes = await fetch(`http://localhost:${PORT}/seo-month-priorities?month=${month}`);
  const data = await prioritiesRes.json();

  const header = "Mois;Ordre;Priorité;Type;Action;Détail;Lien";

  const rows = data.priorities.map((item, index) =>
    [
      month,
      index + 1,
      item.priority,
      item.type,
      item.title,
      item.detail,
      item.link
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(";")
  );

  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=priorites-seo-${month}.csv`
  );

  res.send("\uFEFF" + csv);
});

app.get("/maintenance-log", (req, res) => {
  res.json({
    total: maintenanceLog.length,
    logs: maintenanceLog
  });
});

app.get("/google-business-mapping", (req, res) => {
  const rows = agencyDirectory.map((agency) => ({
    code: agency.code,
    agencyId: agency.id,
    agencyName: agency.name,
    city: agency.city,
    googleBusinessId: agency.googleBusinessId || "",
    placeId: agency.placeId || "",
    googleConnected: Boolean(agency.googleConnected),
    reviewUrl: agency.googleReviewUrl || "",
    ready:
      Boolean(agency.googleBusinessId) &&
      Boolean(agency.placeId) &&
      Boolean(agency.googleReviewUrl)
  }));

  res.json({
    total: rows.length,
    ready: rows.filter((r) => r.ready).length,
    missing: rows.filter((r) => !r.ready).length,
    rows
  });
});

app.get("/dataforseo-status", (req, res) => {
  res.json({
    enabled: dataForSeoConfig.enabled,
    credentialsConfigured:
      Boolean(dataForSeoConfig.credentials.login) &&
      Boolean(dataForSeoConfig.credentials.password),
    baseUrl: dataForSeoConfig.endpoints.baseUrl,
    agenciesReady: agencyDirectory.filter((agency) =>
      agency.dataForSeo &&
      agency.dataForSeo.locationName &&
      agency.dataForSeo.keywords &&
      agency.dataForSeo.keywords.length > 0
    ).length,
    totalAgencies: agencyDirectory.length
  });
});

app.get("/dataforseo-payload-preview", (req, res) => {
  const rows = agencyDirectory
    .filter((agency) => agency.dataForSeo?.keywords?.length)
    .map((agency) => ({
      code: agency.code,
      agencyName: agency.name,
      city: agency.city,
      enabled: Boolean(agency.dataForSeo.enabled),
      payload: agency.dataForSeo.keywords.map((keyword) => ({
        keyword,
        location_name: agency.dataForSeo.locationName || `${agency.city}, France`,
        language_name: "French",
        device: "desktop",
        os: "windows",
        depth: 20
      }))
    }));

  res.json({
    enabled: dataForSeoConfig.enabled,
    totalAgencies: rows.length,
    totalTasks: rows.reduce((sum, row) => sum + row.payload.length, 0),
    rows
  });
});



app.get("/dataforseo-export.csv", (req, res) => {

  const rows = [];

  agencyDirectory.forEach((agency) => {

    if (!agency.dataForSeo?.keywords?.length) {
      return;
    }

    agency.dataForSeo.keywords.forEach((keyword) => {

      rows.push([
        agency.code,
        agency.name,
        agency.city,
        keyword,
        agency.dataForSeo.locationName || `${agency.city}, France`,
        "French",
        "desktop",
        "windows"
      ]);

    });

  });

  const csv = [
    [
      "agency_code",
      "agency_name",
      "city",
      "keyword",
      "location_name",
      "language",
      "device",
      "os"
    ].join(","),
    ...rows.map(r => r.map(v => `"${v}"`).join(","))
  ].join("\\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=dataforseo-keywords.csv"
  );

  res.send(csv);

});



app.get("/seo-database-status", async (req, res) => {
  try {
    res.json({
      status: "ready",
      tables: [
        "seo_keywords",
        "seo_ranking_tasks",
        "seo_ranking_results"
      ],
      message: "Base SEO prête pour le stockage des rankings."
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message
    });
  }
});



app.post("/seo/import-keywords", async (req, res) => {

  try {

    let inserted = 0;

    for (const agency of agencyDirectory) {

      if (!agency.dataForSeo?.keywords?.length) {
        continue;
      }

      for (const keyword of agency.dataForSeo.keywords) {

        const exists = await pool.query(
          `
          SELECT id
          FROM seo_keywords
          WHERE agency_code = $1
          AND keyword = $2
          `,
          [
            agency.code,
            keyword
          ]
        );

        if (exists.rows.length > 0) {
          continue;
        }

        await pool.query(
          `
          INSERT INTO seo_keywords (
            agency_code,
            agency_name,
            city,
            keyword,
            location_name,
            language_name,
            device
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          `,
          [
            agency.code,
            agency.name,
            agency.city,
            keyword,
            agency.dataForSeo.locationName || `${agency.city}, France`,
            "French",
            "desktop"
          ]
        );

        inserted++;

      }

    }

    res.json({
      success: true,
      inserted
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});



app.get("/seo/stats", async (req, res) => {

  try {

    const totalKeywords = await pool.query(
      `SELECT COUNT(*) FROM seo_keywords`
    );

    const agencies = await pool.query(
      `
      SELECT
        agency_code,
        COUNT(*) as total
      FROM seo_keywords
      GROUP BY agency_code
      ORDER BY total DESC
      `
    );

    res.json({
      totalKeywords: Number(totalKeywords.rows[0].count),
      agencies: agencies.rows
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});



app.get("/seo/keywords", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        agency_code,
        agency_name,
        city,
        keyword,
        location_name,
        enabled,
        created_at
      FROM seo_keywords
      ORDER BY agency_code, keyword
    `);

    res.json({
      total: result.rows.length,
      rows: result.rows
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});



app.post("/seo/mock-ranking", async (req, res) => {
  try {
    await pool.query(
      `
      INSERT INTO rankings_history (
        agency_code,
        keyword,
        google_position,
        maps_position
      )
      VALUES ($1,$2,$3,$4)
      `,
      [
        "melun",
        "agence de voyage",
        7,
        3
      ]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



app.get("/seo/rankings-history", async (req,res)=>{

const result = await pool.query(`
SELECT
agency_code,
keyword,
google_position,
maps_position,
captured_at
FROM rankings_history
ORDER BY captured_at DESC
`);

res.json(result.rows);

});



app.get("/google/reviews-debug", async (req, res) => {
  try {
    const accessToken = await getGoogleAccessToken();

    const agency = await prisma.agency.findFirst({
      where: {
        googleLocationId: {
          not: null
        }
      }
    });

    const accountsRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const accountsData = await accountsRes.json();
    const accountName = accountsData.accounts?.[0]?.name;

    const rawLocationId = agency.googleLocationId;
    const locationOnlyId = rawLocationId.replace(/^locations\//, "");

    const urls = [
      `https://mybusiness.googleapis.com/v4/${accountName}/${rawLocationId}/reviews`,
      `https://mybusiness.googleapis.com/v4/${accountName}/locations/${locationOnlyId}/reviews`
    ];

    const results = [];

    for (const url of urls) {
      const r = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json"
        }
      });

      const text = await r.text();

      results.push({
        agency: agency.name,
        googleLocationId: agency.googleLocationId,
        url,
        status: r.status,
        contentType: r.headers.get("content-type"),
        preview: text.slice(0, 1000)
      });
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});



app.get("/google-reviews-network", async (req, res) => {
  try {
    const reviews = await prisma.googleReview.findMany({
      orderBy: {
        publishedAt: "desc"
      },
      take: 100,
      include: {
        agency: true
      }
    });

    res.json({
      total: reviews.length,
      reviews
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});



/**
 * MARKETING KNOWLEDGE GRAPH — SPRINT 003B
 */

/**
 * Gestion centralisée des erreurs des nouveaux modules.
 * Ce middleware doit rester après les routes.
 */




app.get("/google/locations", async (req, res) => {
  try {
    const accessToken = await getGoogleAccessToken();

    const accountsRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const accounts = await accountsRes.json();
    const locations = [];

    const readMask = [
      "name",
      "title",
      "storeCode",
      "metadata",
      "phoneNumbers",
      "websiteUri",
      "storefrontAddress",
      "categories",
      "openInfo"
    ].join(",");

    for (const account of accounts.accounts || []) {
      const url =
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations` +
        `?readMask=${encodeURIComponent(readMask)}`;

      const r = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const data = await r.json();

      if (!r.ok) {
        locations.push({
          account: account.name,
          accountName: account.accountName,
          error: data
        });
        continue;
      }

      for (const location of data.locations || []) {
        locations.push({
          account: account.name,
          accountName: account.accountName,
          ...location
        });
      }
    }

    res.json({
      accounts: accounts.accounts || [],
      total: locations.length,
      locations
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.post("/google/import-locations", async (req,res)=>{
  try{
    const accessToken = await getGoogleAccessToken();

    const accountsRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {headers:{Authorization:`Bearer ${accessToken}`}}
    );

    const accounts = await accountsRes.json();

    let imported=[];

    for(const account of (accounts.accounts||[])){

      const readMask =
      "name,title,websiteUri,phoneNumbers,storefrontAddress";

      const r = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=${readMask}`,
        {headers:{Authorization:`Bearer ${accessToken}`}}
      );

      const data = await r.json();

      for(const loc of (data.locations||[])){

        const title=(loc.title||"").toLowerCase();

        let agencyCode=null;

        if(title.includes("melun")) agencyCode="Melun";
        else if(title.includes("nevers")) agencyCode="Nevers";
        else if(title.includes("gien")) agencyCode="Gien";
        else if(title.includes("maurepas")) agencyCode="Maurepas";
        else if(title.includes("lamorlaye")) agencyCode="Lamorlaye";
        else if(title.includes("dax")) agencyCode="Dax";
        else if(title.includes("ozoir")) agencyCode="Ozoir-la-Ferrière";
        else if(title.includes("bois")) agencyCode="Bois-Colombes";

        if(!agencyCode) continue;

        await prisma.agency.updateMany({
          where:{city: agencyCode},
          data:{
            googleLocationId:loc.name,

            phone:
              loc.phoneNumbers?.primaryPhone || null,
            website:
              loc.websiteUri || null
          }
        });

        imported.push({
          agency:agencyCode,
          google:loc.title
        });
      }
    }

    res.json({
      success:true,
      imported
    });

  }catch(e){
    res.status(500).json({error:e.message});
  }
});


app.get("/google/reviews", async (req, res) => {
  try {
    const accessToken = await getGoogleAccessToken();

    const agencies = await prisma.agency.findMany({
      where: {
        googleLocationId: {
          not: null
        }
      }
    });

    const allReviews = [];

    for (const agency of agencies) {
      const accountsRes = await fetch(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const accountsData = await accountsRes.json();
      const accountName = accountsData.accounts?.[0]?.name;

      if (!accountName) {
        throw new Error("Aucun compte Google Business trouvé");
      }

      const reviews = await fetchGoogleReviews({
        accessToken,
        accountName,
        googleLocationId: agency.googleLocationId
      });

      allReviews.push({
        agency: agency.name,
        city: agency.city,
        googleLocationId: agency.googleLocationId,
        httpStatus: 200,
        data: {
          reviews,
          totalReviewCount: reviews.length
        }
      });
    }

    res.json(allReviews);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});


app.post("/google/import-reviews", async (req, res) => {
  try {
    const accessToken = await getGoogleAccessToken();

    const agencies = await prisma.agency.findMany({
      where: {
        googleLocationId: {
          not: null
        }
      }
    });

    let imported = 0;
    let skipped = 0;
    let reconciled = 0;
    const details = [];

    for (const agency of agencies) {
      const accountsRes = await fetch(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const accountsData = await accountsRes.json();
      const accountName = accountsData.accounts?.[0]?.name;

      if (!accountName) {
        throw new Error("Aucun compte Google Business trouvé");
      }

      const reviews = await fetchGoogleReviews({
        accessToken,
        accountName,
        googleLocationId: agency.googleLocationId
      });

      for (const review of reviews) {
        const googleReviewId = review.reviewId || review.name || null;

        if (!googleReviewId) {
          skipped++;
          continue;
        }

        const exists = await prisma.googleReview.findFirst({
          where: {
            googleReviewId
          }
        });

        if (exists) {
          if (review.reviewReply) {
            if (
              exists.status !== "replied" ||
              exists.reply !== review.reviewReply.comment
            ) {
              await prisma.googleReview.update({
                where: { id: exists.id },
                data: {
                  status: "replied",
                  reply: review.reviewReply.comment || null
                }
              });
              reconciled++;
            }
          } else if (exists.status === "replied") {
            await prisma.googleReview.update({
              where: { id: exists.id },
              data: {
                status: "new",
                reply: null
              }
            });
            reconciled++;
          }

          skipped++;
          continue;
        }

        const ratingMap = {
          ONE: 1,
          TWO: 2,
          THREE: 3,
          FOUR: 4,
          FIVE: 5
        };

        await prisma.googleReview.create({
          data: {
            agencyId: agency.id,
            authorName: review.reviewer?.displayName || "Client Google",
            rating: ratingMap[review.starRating] || 0,
            comment: review.comment || null,
            source: "google",
            googleReviewId,
            publishedAt: review.createTime ? new Date(review.createTime) : null,
            status: review.reviewReply ? "replied" : "new",
            reply: review.reviewReply?.comment || null
          }
        });

        imported++;
      }

      details.push({
        agency: agency.name,
        found: reviews.length
      });
    }

    res.json({
      success: true,
      imported,
      skipped,
      reconciled,
      details
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


app.get("/reviews/pending-ai", async (req,res)=>{

 try{

   const reviews =
   await prisma.googleReview.findMany({

      where:{
        OR:[
          {reply:null},
          {status:"new"}
        ]
      },

      include:{
        agency:true
      },

      orderBy:{
        publishedAt:"desc"
      },

      take:50
   });

   const generated =
   reviews.map(r=>{

      let reply="";

      if(r.rating >=5){

        reply=
`Merci ${r.authorName} pour votre retour positif concernant ${r.agency.name}. Nous sommes ravis d’avoir pu vous accompagner pour votre projet voyage. Au plaisir de vous accueillir à nouveau dans notre agence de voyages à ${r.agency.city}.`;

      }else if(r.rating===4){

        reply=
`Merci pour votre confiance. Nous prenons en compte vos remarques afin d’améliorer encore l’expérience proposée par notre agence ${r.agency.name}.`;

      }else{

        reply=
`Merci d’avoir pris le temps de partager votre avis. Nous sommes désolés si votre expérience n’a pas été totalement satisfaisante et restons disponibles pour échanger avec vous.`;

      }

      return{

        id:r.id,
        agency:r.agency.name,
        rating:r.rating,
        author:r.authorName,
        comment:r.comment,
        proposedReply:reply

      }

   });

   res.json(generated);

 }catch(e){

   res.status(500).json({
      error:e.message
   });

 }

});


app.post("/reviews/:id/validate-ai-reply", async (req,res)=>{
  try{
    const id = Number(req.params.id);
    const { reply } = req.body;

    if(!reply){
      return res.status(400).json({error:"Réponse manquante"});
    }

    const updated = await prisma.googleReview.update({
      where:{id},
      data:{
        reply,
        status:"ready_to_publish"
      },
      include:{agency:true}
    });

    res.json({
      success:true,
      review:updated
    });

  }catch(e){
    res.status(500).json({error:e.message});
  }
});


app.get("/reviews/network-ranking", async (req,res)=>{

 try{

 const agencies =
 await prisma.agency.findMany({

   include:{
     reviews:true
   }

 });

 const ranking =
 agencies.map(a=>{

   const count =
   a.reviews.length;

   const avg =
   count
   ? (
      a.reviews.reduce(
       (x,r)=>x+r.rating,
       0
      ) / count
     )
   :0;

   const pending =
   a.reviews.filter(
     r=>r.status==="new"
   ).length;

   return{

      agency:a.name,

      city:a.city,

      reviews:count,

      average:
      Number(avg.toFixed(1)),

      pending

   }

 }).sort(
   (a,b)=>
   b.average-a.average
 );

 res.json(ranking);

 }catch(e){

 res.status(500)
 .json({
   error:e.message
 });

 }

});


app.get("/network-score", async (req,res)=>{

 try{

 const agencies =
 await prisma.agency.findMany({

 include:{
   reviews:true,
   keywords:true
 }

 });

 const scores =
 agencies.map(a=>{

   const avg =
   a.reviews.length
   ? a.reviews.reduce(
      (x,r)=>x+r.rating,
      0
     ) /
     a.reviews.length
   :0;

   const pending =
   a.reviews.filter(
    r=>r.status==="new"
   ).length;

   const score =
   (
     avg*20
     -
     pending*2
   );

   return{

      agency:a.name,

      city:a.city,

      average:
      Number(avg.toFixed(1)),

      pending,

      score:
      Number(score.toFixed(0))

   }

 }).sort(
   (a,b)=>
   b.score-a.score
 );

 res.json(scores);

 }catch(e){

 res.status(500)
 .json({
   error:e.message
 });

 }

});

app.get("/network-alerts", async (req, res) => {
  try {
    const alerts = await prisma.notification.findMany({
      where: {
        status: "open"
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20,
      include: {
        agency: true
      }
    });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.get("/notifications", async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        status: "open"
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20,
      include: {
        agency: true
      }
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});




cron.schedule("0 3 * * *", async ()=>{

  console.log("=== CRON SEO NETWORK START ===");

  try{

    const agencies =
      await prisma.agency.findMany({
        orderBy:{
          city:"asc"
        }
      });

    const keywords = [
      "agence de voyage",
      "voyage sur mesure",
      "croisière"
    ];

    let checks = 0;
    let totalCost = 0;

    for(const agency of agencies){

      for(const keyword of keywords){

        try{

          const result =
            await callDataForSeoMaps(
              keyword,
              agency.city
            );

          const items =
            result.raw?.tasks?.[0]
            ?.result?.[0]
            ?.items || [];

          const found =
            items.find(
              i =>
                (i.title || "")
                .toLowerCase()
                .includes("mondescale")
                ||
                (i.domain || "")
                .toLowerCase()
                .includes("mondescale")
            );

          const cost =
            result.raw?.tasks?.[0]?.cost ||
            result.raw?.cost ||
            0;

          totalCost += cost;

          await prisma.realRankingCheck.create({
            data:{
              agencyId:agency.id,
              keyword,
              city:agency.city,
              found:Boolean(found),
              position:found ? found.rank_group : null,
              absolutePosition:found ? found.rank_absolute : null,
              rating:found?.rating?.value || null,
              reviews:found?.rating?.votes_count || null,
              title:found?.title || null,
              url:found?.url || null,
              cost
            }
          });

          checks++;

          console.log(
            `[SEO] ${agency.city} / ${keyword} => ${
              found
              ? "#" + found.rank_group
              : "not found"
            }`
          );

        }catch(e){

          console.error(
            "[SEO CHECK ERROR]",
            agency.city,
            keyword,
            e.message
          );

        }

      }

    }

    console.log(
      `=== SEO DONE : ${checks} checks / ${totalCost}€ ===`
    );

  }catch(e){

    console.error(
      "[SEO CRON ERROR]",
      e.message
    );

  }

});


app.get("/executive-seo-dashboard", async (req,res)=>{

  try{

    const latest =
      await prisma.realRankingCheck.findMany({
        include:{
          agency:true
        },
        orderBy:{
          checkedAt:"desc"
        },
        take:200
      });

    const latestMap = {};

    latest.forEach((r)=>{

      const key =
        `${r.agencyId}-${r.keyword}`;

      if(!latestMap[key]){
        latestMap[key]=r;
      }

    });

    const rows =
      Object.values(latestMap);

    const avg =
      rows
      .filter(r=>r.position)
      .reduce((sum,r)=>sum+r.position,0)
      /
      Math.max(
        rows.filter(r=>r.position).length,
        1
      );

    const critical =
      rows.filter(
        r =>
          !r.position ||
          r.position > 10
      );

    const top =
      rows
      .filter(r=>r.position)
      .sort((a,b)=>a.position-b.position)
      .slice(0,10);

    const totalCost =
      latest.reduce(
        (sum,r)=>sum+(r.cost || 0),
        0
      );

    res.json({

      totalChecks:latest.length,

      averagePosition:
        Math.round(avg*10)/10,

      criticalCount:
        critical.length,

      top10Count:
        rows.filter(
          r =>
            r.position &&
            r.position <= 10
        ).length,

      estimatedCost:
        Math.round(totalCost*1000)/1000,

      topPerformers:top,

      critical

    });

  }catch(e){

    res.status(500).json({
      error:e.message
    });

  }

});


app.post("/seo/evaluate", async (req,res)=>{

  try{

    const coreKeywords = [
      "agence de voyage",
      "agence de voyages",
      "voyage sur mesure",
      "croisière"
    ];

    const agencies =
      await prisma.agency.findMany({
        orderBy:{
          city:"asc"
        }
      });

    const results = [];

    for(const agency of agencies){

      const checks =
        await prisma.realRankingCheck.findMany({
          where:{
            agencyId:agency.id,
            keyword:{
              in:coreKeywords
            }
          },
          orderBy:{
            checkedAt:"desc"
          },
          take:200
        });

      const latestByKeyword = {};

      checks.forEach((check)=>{
        if(!latestByKeyword[check.keyword]){
          latestByKeyword[check.keyword] = check;
        }
      });

      const latest =
        coreKeywords.map(keyword =>
          latestByKeyword[keyword] || {
            keyword,
            found:false,
            position:null
          }
        );

      const scoredPositions =
        latest.map(r =>
          r.found && r.position
          ? r.position
          : 30
        );

      const averagePosition =
        Math.round(
          (
            scoredPositions.reduce((sum,p)=>sum+p,0)
            /
            scoredPositions.length
          ) * 10
        ) / 10;

      const bestPosition =
        Math.min(...scoredPositions);

      const notFound =
        latest.filter(r=>!r.found || !r.position).length;

      let level = "CRITIQUE";

      if(averagePosition <= 3 && notFound === 0){
        level = "LEADER";
      }
      else if(averagePosition <= 7){
        level = "RENFORCEMENT";
      }
      else if(averagePosition <= 15){
        level = "OFFENSIVE";
      }

      await prisma.agency.update({
        where:{
          id:agency.id
        },
        data:{
          seoLevel:level
        }
      });

      results.push({
        agencyId:agency.id,
        agency:agency.name,
        city:agency.city,
        level,
        averagePosition,
        bestPosition,
        notFound,
        keywords:latest.map(r=>({
          keyword:r.keyword,
          found:Boolean(r.found),
          position:r.position || null
        }))
      });

    }

    res.json({
      total:results.length,
      leader:results.filter(r=>r.level==="LEADER").length,
      renforcement:results.filter(r=>r.level==="RENFORCEMENT").length,
      offensive:results.filter(r=>r.level==="OFFENSIVE").length,
      critique:results.filter(r=>r.level==="CRITIQUE").length,
      results
    });

  }catch(e){

    res.status(500).json({
      error:e.message
    });

  }

});



app.get("/dashboard-direction", async(req,res)=>{

try{

const agencies =
await prisma.agency.findMany();

const posts =
await prisma.googlePost.count();

const published =
await prisma.googlePost.count({
where:{
status:"published"
}
});

const approved =
await prisma.googlePost.count({
where:{
status:"approved"
}
});

const draft =
await prisma.googlePost.count({
where:{
status:"draft"
}
});

const actions =
await prisma.networkAction.count({
where:{
status:{
in:[
"todo",
"in_progress"
]
}
}
});

const leaders =
agencies.filter(
a=>a.seoLevel==="LEADER"
).length;

const renforcement =
agencies.filter(
a=>a.seoLevel==="RENFORCEMENT"
).length;

const offensive =
agencies.filter(
a=>a.seoLevel==="OFFENSIVE"
).length;

const critique =
agencies.filter(
a=>a.seoLevel==="CRITIQUE"
).length;

res.json({

agencies:agencies.length,

leaders,
renforcement,
offensive,
critique,

posts,
draft,
approved,
published,

openActions:actions

});

}catch(e){

res.status(500).json({
error:e.message
});

}

});


cron.schedule("0 6 * * *", async ()=>{

console.log("=== GOOGLE POSTS AUTO PUBLISH ===");

try{

const posts =
await prisma.googlePost.findMany({

where:{
status:"approved",
plannedAt:{
lte:new Date()
}
},

take:50

});

for(const post of posts){

try{

await fetch(
`http://localhost:${PORT}/google-posts/${post.id}/publish-google`,
{
method:"POST"
}
);

}catch(e){

console.error(
"[POST AUTO]",
post.id,
e.message
);

}

}

}catch(e){

console.error(
"[POST CRON]",
e.message
);

}

});




app.get("/dashboard-direction-v2", async (req,res)=>{

  try{

    const agencies =
      await prisma.agency.findMany({
        include:{
          reviews:true,
          googlePosts:true,
          networkActions:true,
          realRankingChecks:true
        },
        orderBy:{
          city:"asc"
        }
      });

    const now =
      new Date();

    const daysAgo = (days)=>
      new Date(
        Date.now() - days*24*60*60*1000
      );

    const rows =
      agencies.map((agency)=>{

        const posts30 =
          agency.googlePosts.filter(
            p =>
              p.status==="published" &&
              p.publishedAt &&
              new Date(p.publishedAt) >= daysAgo(30)
          ).length;

        const reviews30 =
          agency.reviews.filter(
            r =>
              r.createdAt &&
              new Date(r.createdAt) >= daysAgo(30)
          ).length;

        const openActions =
          agency.networkActions.filter(
            a =>
              ["todo","in_progress"].includes(a.status)
          ).length;

        const latestRankings = {};

        agency.realRankingChecks
          .sort((a,b)=>new Date(b.checkedAt)-new Date(a.checkedAt))
          .forEach((r)=>{
            if(!latestRankings[r.keyword]){
              latestRankings[r.keyword]=r;
            }
          });

        const rankingRows =
          Object.values(latestRankings);

        const positions =
          rankingRows
            .filter(r=>r.found && r.position)
            .map(r=>r.position);

        const averagePosition =
          positions.length
          ?
          Math.round(
            (
              positions.reduce((s,p)=>s+p,0) /
              positions.length
            )*10
          )/10
          :
          null;

        const notFound =
          rankingRows.filter(r=>!r.found).length;

        const googleReady =
          Boolean(agency.googleLocationId);

        return {
          agencyId:agency.id,
          agencyName:agency.name,
          city:agency.city,
          seoLevel:agency.seoLevel || "RENFORCEMENT",
          averagePosition,
          keywordsTracked:rankingRows.length,
          notFound,
          posts30,
          reviews30,
          openActions,
          googleReady,
          alert:
            !googleReady
            ? "GOOGLE_INCOMPLETE"
            : openActions > 5
            ? "ACTIONS_HIGH"
            : reviews30 < 3
            ? "REVIEWS_LOW"
            : posts30 < 4
            ? "POSTS_LOW"
            : null
        };

      });

    res.json({
      totalAgencies:rows.length,
      leader:rows.filter(r=>r.seoLevel==="LEADER").length,
      renforcement:rows.filter(r=>r.seoLevel==="RENFORCEMENT").length,
      offensive:rows.filter(r=>r.seoLevel==="OFFENSIVE").length,
      critique:rows.filter(r=>r.seoLevel==="CRITIQUE").length,
      googleIncomplete:rows.filter(r=>!r.googleReady).length,
      lowReviews:rows.filter(r=>r.reviews30 < 3).length,
      lowPosts:rows.filter(r=>r.posts30 < 4).length,
      openActions:rows.reduce((s,r)=>s+r.openActions,0),
      rows
    });

  }catch(e){

    res.status(500).json({
      error:e.message
    });

  }

});



app.get("/dashboard-alerts", async(req,res)=>{

try{

const agencies =
await prisma.agency.findMany({
include:{
reviews:true,
googlePosts:true
}
});

const alerts=[];

for(const agency of agencies){

const reviews30 =
agency.reviews.filter(
r =>
new Date(r.createdAt) >
new Date(
Date.now()-30*86400000
)
).length;

if(reviews30 < 3){

alerts.push({
agency:agency.name,
city:agency.city,
type:"REVIEWS_LOW",
value:reviews30
});

}

if(!agency.googleLocationId){

alerts.push({
agency:agency.name,
city:agency.city,
type:"GOOGLE_NOT_CONFIGURED"
});

}

}

res.json(alerts);

}catch(e){

res.status(500).json({
error:e.message
});

}

});


cron.schedule("30 5 * * *", async()=>{

try{

await fetch(
`http://localhost:${PORT}/reviews/check-network`,
{
method:"POST"
}
);

console.log(
"[REVIEWS CHECK] terminé"
);

}catch(e){

console.error(
"[REVIEWS CHECK]",
e.message
);

}

});




app.get("/dashboard-direction-v3", async (req,res)=>{

  try{

    const agencies =
      await prisma.agency.findMany({
        include:{
          reviews:true,
          googlePosts:true,
          networkActions:true,
          realRankingChecks:true
        },
        orderBy:{
          city:"asc"
        }
      });

    const daysAgo = (days)=>
      new Date(Date.now() - days*24*60*60*1000);

    const rows = agencies.map((agency)=>{

      const reviews30 =
        agency.reviews.filter(r =>
          r.createdAt &&
          new Date(r.createdAt) >= daysAgo(30)
        ).length;

      const posts30 =
        agency.googlePosts.filter(p =>
          p.status === "published" &&
          p.publishedAt &&
          new Date(p.publishedAt) >= daysAgo(30)
        ).length;

      const openActions =
        agency.networkActions.filter(a =>
          ["todo","in_progress"].includes(a.status)
        ).length;

      const latestByKeyword = {};

      agency.realRankingChecks
        .sort((a,b)=>new Date(b.checkedAt)-new Date(a.checkedAt))
        .forEach(r=>{
          if(!latestByKeyword[r.keyword]){
            latestByKeyword[r.keyword]=r;
          }
        });

      const rankings =
        Object.values(latestByKeyword);

      const positions =
        rankings
        .filter(r=>r.found && r.position)
        .map(r=>r.position);

      const averagePosition =
        positions.length
        ? Math.round((positions.reduce((s,p)=>s+p,0)/positions.length)*10)/10
        : null;

      let priority = "STABLE";

      if(!agency.googleLocationId){
        priority = "CONFIGURATION";
      }
      else if((agency.seoLevel || "") === "CRITIQUE"){
        priority = "CRITIQUE";
      }
      else if(reviews30 < 3 || posts30 < 4 || openActions > 5){
        priority = "A_TRAITER";
      }

      return {
        agencyId:agency.id,
        agencyName:agency.name,
        city:agency.city,
        seoLevel:agency.seoLevel || "RENFORCEMENT",
        averagePosition,
        reviews30,
        posts30,
        openActions,
        googleReady:Boolean(agency.googleLocationId),
        priority
      };

    });

    const alerts = [];

    rows.forEach(row=>{

      if(!row.googleReady){
        alerts.push({
          agencyId:row.agencyId,
          agencyName:row.agencyName,
          city:row.city,
          type:"GOOGLE_NOT_CONFIGURED",
          priority:"high",
          message:"Fiche Google non configurée."
        });
      }

      if(row.reviews30 < 3){
        alerts.push({
          agencyId:row.agencyId,
          agencyName:row.agencyName,
          city:row.city,
          type:"REVIEWS_LOW",
          priority:"medium",
          message:`${row.reviews30} avis sur 30 jours. Objectif minimum : 3.`
        });
      }

      if(row.posts30 < 4){
        alerts.push({
          agencyId:row.agencyId,
          agencyName:row.agencyName,
          city:row.city,
          type:"POSTS_LOW",
          priority:"medium",
          message:`${row.posts30} posts publiés sur 30 jours. Objectif minimum : 4.`
        });
      }

      if(row.openActions > 5){
        alerts.push({
          agencyId:row.agencyId,
          agencyName:row.agencyName,
          city:row.city,
          type:"ACTIONS_HIGH",
          priority:"high",
          message:`${row.openActions} actions ouvertes.`
        });
      }

    });

    const postsPublished30 =
      rows.reduce((sum,r)=>sum+r.posts30,0);

    const reviewsReceived30 =
      rows.reduce((sum,r)=>sum+r.reviews30,0);

    const openActions =
      rows.reduce((sum,r)=>sum+r.openActions,0);

    res.json({
      totalAgencies:rows.length,

      seo:{
        leader:rows.filter(r=>r.seoLevel==="LEADER").length,
        renforcement:rows.filter(r=>r.seoLevel==="RENFORCEMENT").length,
        offensive:rows.filter(r=>r.seoLevel==="OFFENSIVE").length,
        critique:rows.filter(r=>r.seoLevel==="CRITIQUE").length
      },

      activity:{
        postsPublished30,
        reviewsReceived30,
        openActions
      },

      alerts:{
        total:alerts.length,
        high:alerts.filter(a=>a.priority==="high").length,
        medium:alerts.filter(a=>a.priority==="medium").length,
        items:alerts
      },

      rows
    });

  }catch(e){

    res.status(500).json({
      error:e.message
    });

  }

});



cron.schedule("15 5 * * *", async()=>{

try{

await fetch(
`http://localhost:${PORT}/seo-history/capture`,
{
method:"POST"
}
);

console.log("[SEO SNAPSHOT] OK");

}catch(e){

console.error(e.message);

}

});

cron.schedule("20 5 * * *", async()=>{

try{

await fetch(
`http://localhost:${PORT}/seo-regression-check`,
{
method:"POST"
}
);

console.log("[SEO REGRESSION] OK");

}catch(e){

console.error(e.message);

}

});



cron.schedule("0 8 * * *", async () => {
  try {
    await fetch(`http://localhost:${PORT}/google-posts/queue-approved`, {
      method: "POST"
    });

    console.log("[GOOGLE POSTS QUEUE] OK");
  } catch (error) {
    console.error("[GOOGLE POSTS QUEUE]", error.message);
  }
});

cron.schedule("15 8 * * *", async () => {
  try {
    await fetch(`http://localhost:${PORT}/google-posts/publish-queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        max: 10
      })
    });

    console.log("[GOOGLE POSTS PUBLISH QUEUE] OK");
  } catch (error) {
    console.error("[GOOGLE POSTS PUBLISH QUEUE]", error.message);
  }
});


cron.schedule("30 7 * * *", async () => {
  try {
    await fetch(`http://localhost:${PORT}/google-posts/auto-approve-quality`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        max: 100
      })
    });

    console.log("[GOOGLE POSTS AUTO APPROVE] OK");
  } catch (error) {
    console.error("[GOOGLE POSTS AUTO APPROVE]", error.message);
  }
});

cron.schedule("45 7 * * *", async () => {
  try {
    await fetch(`http://localhost:${PORT}/google-posts/queue-approved`, {
      method: "POST"
    });

    console.log("[GOOGLE POSTS AUTO QUEUE] OK");
  } catch (error) {
    console.error("[GOOGLE POSTS AUTO QUEUE]", error.message);
  }
});

cron.schedule("0 8 * * *", async () => {
  try {
    await fetch(`http://localhost:${PORT}/google-posts/publish-queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        max: 8
      })
    });

    console.log("[GOOGLE POSTS AUTO PUBLISH] OK");
  } catch (error) {
    console.error("[GOOGLE POSTS AUTO PUBLISH]", error.message);
  }
});


cron.schedule("30 8 * * *", async () => {
  try {
    await fetch(`http://localhost:${PORT}/google-posts/measure-impact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        daysAfter: 7
      })
    });

    console.log("[GOOGLE POST IMPACT] OK");
  } catch (error) {
    console.error("[GOOGLE POST IMPACT]", error.message);
  }
});



cron.schedule("15 7 * * *", async () => {

try{

await fetch(
`http://localhost:${PORT}/google-posts/compute-seo-score`,
{
method:"POST"
}
);

console.log("[SEO SCORE] OK");

}catch(e){

console.error(e.message);

}

});


cron.schedule("5 8-19/2 * * *", async () => {
  try {
    await fetch(`http://localhost:${PORT}/google-posts/block-similar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threshold: 55 })
    });

    await fetch(`http://localhost:${PORT}/google-posts/publish-due`, {
      method: "POST"
    });

    console.log("[GOOGLE POSTS STAGGERED PUBLISH] OK");
  } catch (error) {
    console.error("[GOOGLE POSTS STAGGERED PUBLISH]", error.message);
  }
});


app.post("/reviews/:id/publish", async (req, res) => {
  try {
    const review = await prisma.googleReview.findUnique({
      where: {
        id: Number(req.params.id)
      },
      include: {
        agency: true
      }
    });

    if (!review) {
      return res.status(404).json({
        error: "Avis introuvable"
      });
    }

    if (review.status !== "pending_validation") {
      return res.status(400).json({
        error: "Avis non validé. Statut attendu : pending_validation."
      });
    }

    if (!review.reply) {
      return res.status(400).json({
        error: "Aucune réponse à publier."
      });
    }

    if (!review.googleReviewId) {
      return res.status(400).json({
        error: "Avis test ou avis manuel : aucun identifiant GoogleReviewId, publication impossible."
      });
    }

    if (!review.agency.googleLocationId) {
      return res.status(400).json({
        error: "Agence non liée à une fiche Google Business."
      });
    }

    const token = await getGoogleAccessToken();

    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/111551737023047248140/${review.agency.googleLocationId}/reviews/${review.googleReviewId}/reply`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          comment: review.reply
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    await prisma.googleReview.update({
      where: {
        id: review.id
      },
      data: {
        status: "replied"
      }
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.post(
"/reviews/:id/approve",

async(req,res)=>{

try{

const review =
await prisma.googleReview.update({

 where:{
   id:Number(
    req.params.id
   )
 },

 data:{
   status:
   "pending_validation"
 }

});

res.json({

 success:true,

 review

});

}catch(e){

res.status(500)
.json({
 error:e.message
});

}

});




app.get("/reviews/agencies-summary", async (req,res)=>{

try{

const reviews =
await prisma.googleReview.findMany({

 where:{

  OR:[

   {status:"new"},
   {status:"pending_validation"}

  ]

 },

 include:{
  agency:true
 }

});


const stats={};


for(const r of reviews){

 const agency =
 r.agency?.name
 ||
 "Inconnue";

 if(!stats[agency]){

  stats[agency]={
   agency,
   total:0,
   urgent:0
  };

 }

 stats[agency].total++;

 if(r.rating<=3){

  stats[agency].urgent++;

 }

}


res.json(

Object.values(
stats
)

.sort(
(a,b)=>
b.total-a.total
)

);

}catch(e){

res.status(500)
.json({
 error:e.message
});

}

});

/**
 * Gestion centralisée des erreurs.
 *
 * Ce middleware doit rester après toutes les routes.
 */

/*
 * Asset Engine — médias publics.
 */
app.use(
  "/media/assets",
  express.static(
    path.resolve(
      process.env.ASSET_MEDIA_STORAGE_ROOT ||
      "/app/storage/asset-media"
    ),
    {
      fallthrough: false,
      immutable: true,
      maxAge: "30d",
      index: false,
    }
  )
);

/*
 * Brand Studio V2 — médiathèque et upload.
 */
app.use(
  "/media/brand-assets",
  express.static(
    path.resolve(
      process.env.BRAND_ASSET_STORAGE_ROOT ||
      "/app/storage/brand-assets"
    ),
    {
      fallthrough:
        false,

      immutable:
        true,

      maxAge:
        "30d",

      index:
        false,
    }
  )
);

app.use(
  "/api/brand-assets",
  createBrandAssetRouter()
);

app.use(
  "/api/brand-profile",
  createBrandProfileRouter()
);


app.use(
  "/api/legal-profile",
  createLegalProfileRouter()
);
app.use(
  "/api/public-brand-legal",
  createPublicBrandLegalRouter()
);




app.use(errorMiddleware);

/**
 * Démarrage unique du backend.
 */

app.use("/api/site-publication", createSitePublicationRoutes(prisma));

const server =
app.use(
  "/api/public-site-read",
  createPublicSiteReadRouter()
);

app.use(
  "/api/agency-launch",
  createAgencyLaunchRouter({
    prisma,
  })
);


app.use(
  "/api/template-library",
  createTemplateLibraryRouter({
    prisma,
  })
);

app.use(
  "/api/content-composer",
  createContentComposerRouter({
    prisma,
  })
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `[MONDESCALE PLATFORM] Backend démarré sur le port ${PORT}`
  );
});

module.exports = {
  app,
  server,
};
