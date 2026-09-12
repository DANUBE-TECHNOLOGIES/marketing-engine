"use strict";

const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TARGET_SITE_SLUG =
  process.env.MSE_25_203_SITE_SLUG || "mondescale-lamorlaye";

const TENANT_SLUG =
  process.env.TENANT_SLUG || "mondescale";

const SNAPSHOT_PATH =
  process.env.MSE_25_203_SNAPSHOT ||
  "/var/tmp/mse-25-203-lamorlaye-services-semantic-v2.snapshot.json";

const APPLY =
  String(process.env.MSE_25_203_CONFIRM || "").toLowerCase() === "true";

const ROLLBACK =
  String(process.env.MSE_25_203_ROLLBACK || "").toLowerCase() === "true";

const CONTROL_CITIES = [
  "Bois-Colombes",
  "Ozoir-la-Ferrière",
];

const SERVICES_SEO = Object.freeze({
  title: "Services de votre agence de voyages à Lamorlaye | Mondescale",
  h1: "Services de votre agence de voyages à Lamorlaye",
  metaDescription:
    "Séjours, circuits, voyages sur mesure, autotours, croisières et billetterie à Lamorlaye. Stéphanie vous accompagne pour comparer les solutions adaptées à votre projet.",
});

const SERVICE_ITEMS = Object.freeze([
  {
    id: "sejours-clubs",
    title: "Séjours et clubs au départ de votre agence de Lamorlaye",
    text:
      "Envie de soleil, de repos ou de vacances en famille ? Mondescale Lamorlaye vous aide à choisir parmi de nombreux hôtels, clubs et formules tout compris en France et à l'étranger. Nous comparons les destinations, les prestations, les catégories de chambres, les formules de pension et les solutions de transport afin de trouver un séjour cohérent avec votre budget et vos attentes.",
  },
  {
    id: "circuits-accompagnes",
    title: "Circuits accompagnés",
    text:
      "Un circuit accompagné permet de découvrir plusieurs étapes d'une destination avec un programme organisé à l'avance. Stéphanie vous aide à comparer les itinéraires, le rythme du circuit, les visites incluses, les hébergements et les conditions de transport afin de choisir la formule la mieux adaptée à votre projet.",
  },
  {
    id: "voyages-sur-mesure",
    title: "Voyages sur mesure",
    text:
      "Vous souhaitez construire un itinéraire qui ne correspond pas à un séjour standard ? Mondescale Lamorlaye peut vous accompagner dans la création d'un voyage personnalisé : étapes, durée, hébergements, transports, excursions et temps libres sont étudiés en fonction de vos envies et de votre budget.",
  },
  {
    id: "autotours",
    title: "Autotours et road trips",
    text:
      "Pour voyager en liberté tout en préparant les étapes essentielles à l'avance, l'autotour combine généralement véhicule de location, hébergements et itinéraire. Votre agence vous aide à construire un parcours réaliste, à équilibrer les distances et à sélectionner les étapes adaptées au temps dont vous disposez.",
  },
  {
    id: "croisieres",
    title: "Croisières maritimes et fluviales",
    text:
      "Méditerranée, Caraïbes, fjords, fleuves européens ou destinations plus lointaines : le choix d'une croisière ne dépend pas seulement de l'itinéraire. Compagnie, taille du navire, ambiance à bord, cabine, excursions et ports de départ doivent aussi être comparés. Mondescale Lamorlaye vous accompagne dans ces choix.",
  },
  {
    id: "famille",
    title: "Vacances en famille",
    text:
      "Club avec animations, séjour balnéaire, circuit, parc de loisirs ou voyage itinérant : les besoins d'une famille varient selon l'âge des enfants, la durée du séjour et le rythme souhaité. Nous vous aidons à choisir une formule adaptée et à vérifier les prestations utiles avant la réservation.",
  },
  {
    id: "voyages-de-noces",
    title: "Voyages de noces",
    text:
      "Île paradisiaque, combiné, circuit privé ou séjour mêlant découverte et repos : Mondescale Lamorlaye vous accompagne pour construire un voyage de noces adapté à vos envies, à votre budget et à la période de départ.",
  },
  {
    id: "groupes",
    title: "Voyages en groupe",
    text:
      "Associations, familles, groupes d'amis ou projets collectifs : les voyages de groupe nécessitent souvent des conditions particulières de transport, d'hébergement et de paiement. L'agence peut rechercher des solutions adaptées au nombre de participants et au projet.",
  },
  {
    id: "billets-avion",
    title: "Billets d'avion à Lamorlaye",
    text:
      "Mondescale Lamorlaye recherche et réserve des billets d'avion pour vos déplacements en France, en Europe et à l'international. Selon votre destination, nous pouvons étudier les possibilités au départ notamment de Paris-Charles-de-Gaulle et Paris-Orly, les horaires, les correspondances, les bagages et les conditions tarifaires.",
  },
  {
    id: "billets-train",
    title: "Billets de train",
    text:
      "L'agence peut également vous accompagner pour la réservation de billets de train selon les dessertes disponibles en France et en Europe, seuls ou en complément d'un autre voyage.",
  },
  {
    id: "conseil-accompagnement",
    title: "Un interlocuteur avant votre départ",
    text:
      "L'intérêt d'une agence ne se limite pas à effectuer une réservation. Stéphanie vous aide à comparer les possibilités, à comprendre les prestations incluses et à préparer votre voyage avec un interlocuteur identifié à Lamorlaye.",
  },
]);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stable(value[key]);
        return acc;
      }, {});
  }

  return value;
}

function hash(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}

function blockType(block) {
  return normalize(block?.blockType);
}

function blockContent(block) {
  return block?.content &&
    typeof block.content === "object" &&
    !Array.isArray(block.content)
    ? clone(block.content)
    : {};
}

function servicesPage(site) {
  return (site.pages || []).find(
    (page) => normalize(page.slug) === "services"
  ) || null;
}

function servicesBlock(page) {
  const accepted = new Set([
    "features",
    "services",
    "services-grid",
    "services-highlight",
    "cards",
  ]);

  return (page.blocks || []).find(
    (block) => accepted.has(blockType(block))
  ) || null;
}

function routeFingerprint(site) {
  return hash(
    (site.pages || [])
      .map((page) => ({
        id: page.id,
        slug: page.slug,
        path: page.path,
        pageType: page.pageType,
        menuTitle: page.menuTitle,
        menuLocation: page.menuLocation,
        displayOrder: page.displayOrder,
        schemaType: page.schemaType,
        status: page.status,
        published: page.published,
      }))
      .sort((a, b) =>
        String(a.id).localeCompare(String(b.id))
      )
  );
}

function siteEditorialFingerprint(site) {
  return hash({
    site: {
      id: site.id,
      slug: site.slug,
      basePath: site.basePath,
      status: site.status,
      theme: site.theme,
    },
    pages: (site.pages || []).map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      path: page.path,
      pageType: page.pageType,
      menuTitle: page.menuTitle,
      menuLocation: page.menuLocation,
      displayOrder: page.displayOrder,
      seoTitle: page.seoTitle,
      metaDescription: page.metaDescription,
      h1: page.h1,
      schemaType: page.schemaType,
      status: page.status,
      published: page.published,
      blocks: (page.blocks || []).map((block) => ({
        id: block.id,
        blockType: block.blockType,
        name: block.name,
        content: block.content,
        settings: block.settings,
        seo: block.seo,
        displayOrder: block.displayOrder,
        status: block.status,
        visibleDesktop: block.visibleDesktop,
        visibleMobile: block.visibleMobile,
        version: block.version,
      })),
    })),
  });
}

function protectedNonServicesFingerprint(site) {
  return hash({
    pages: (site.pages || [])
      .filter((page) => normalize(page.slug) !== "services")
      .map((page) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        path: page.path,
        pageType: page.pageType,
        menuTitle: page.menuTitle,
        menuLocation: page.menuLocation,
        displayOrder: page.displayOrder,
        seoTitle: page.seoTitle,
        metaDescription: page.metaDescription,
        h1: page.h1,
        schemaType: page.schemaType,
        status: page.status,
        published: page.published,
        blocks: page.blocks,
      })),
  });
}

function blockSnapshot(block) {
  return {
    id: block.id,
    content: clone(block.content),
    status: block.status,
    visibleDesktop: block.visibleDesktop,
    visibleMobile: block.visibleMobile,
    version: block.version,
  };
}

async function loadSites(tenantId) {
  return prisma.agencySite.findMany({
    where: { tenantId },
    include: {
      agency: true,
      pages: {
        include: {
          blocks: {
            orderBy: { displayOrder: "asc" },
          },
        },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
}

function assertTarget(site) {
  if (!site || site.slug !== TARGET_SITE_SLUG) {
    throw new Error(
      `MSE-25.203: site exact introuvable: ${TARGET_SITE_SLUG}`
    );
  }

  if (normalize(site.agency?.city) !== "lamorlaye") {
    throw new Error(
      `MSE-25.203: garde-fou ville refusé: ${
        site.agency?.city || "absente"
      }`
    );
  }
}

function newServicesContent(existing) {
  return {
    ...existing,
    title: "Services de votre agence de voyages à Lamorlaye",
    introduction:
      "Mondescale Lamorlaye vous accompagne pour préparer vos vacances et vos déplacements, du séjour tout compris au voyage sur mesure. À l'agence, Stéphanie vous aide à comparer les solutions proposées par nos voyagistes partenaires selon votre destination, votre budget et votre façon de voyager.",
    items: SERVICE_ITEMS.map(clone),
  };
}

async function restoreSnapshot(snapshot) {
  await prisma.$transaction(async (tx) => {
    await tx.agencySitePage.update({
      where: { id: snapshot.page.id },
      data: {
        seoTitle: snapshot.page.seoTitle,
        metaDescription: snapshot.page.metaDescription,
        h1: snapshot.page.h1,
      },
    });

    await tx.pageBlock.update({
      where: { id: snapshot.block.id },
      data: {
        content: snapshot.block.content,
        status: snapshot.block.status,
        visibleDesktop: snapshot.block.visibleDesktop,
        visibleMobile: snapshot.block.visibleMobile,
        version: snapshot.block.version,
      },
    });
  });
}

async function archiveSnapshot(suffix) {
  if (!fs.existsSync(SNAPSHOT_PATH)) return null;

  const archived =
    `${SNAPSHOT_PATH}.${suffix}-${Date.now()}`;

  fs.renameSync(SNAPSHOT_PATH, archived);
  return archived;
}

async function main() {
  if (APPLY && ROLLBACK) {
    throw new Error(
      "MSE-25.203: APPLY et ROLLBACK sont mutuellement exclusifs"
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: TENANT_SLUG },
  });

  if (!tenant) {
    throw new Error(
      `MSE-25.203: tenant introuvable: ${TENANT_SLUG}`
    );
  }

  let sites = await loadSites(tenant.id);

  const site = sites.find(
    (candidate) => candidate.slug === TARGET_SITE_SLUG
  );

  assertTarget(site);

  const services = servicesPage(site);

  if (!services) {
    throw new Error(
      "MSE-25.203: page Services Lamorlaye absente"
    );
  }

  const block = servicesBlock(services);

  if (!block) {
    throw new Error(
      "MSE-25.203: bloc Services existant introuvable"
    );
  }

  if (ROLLBACK) {
    if (!fs.existsSync(SNAPSHOT_PATH)) {
      throw new Error(
        `MSE-25.203: snapshot absent: ${SNAPSHOT_PATH}`
      );
    }

    const snapshot = JSON.parse(
      fs.readFileSync(SNAPSHOT_PATH, "utf8")
    );

    if (
      snapshot.siteId !== site.id ||
      snapshot.siteSlug !== site.slug ||
      snapshot.page.id !== services.id ||
      snapshot.block.id !== block.id
    ) {
      throw new Error(
        "MSE-25.203: snapshot incompatible"
      );
    }

    await restoreSnapshot(snapshot);

    const archived = await archiveSnapshot("rolledback");

    console.log(
      JSON.stringify(
        {
          mse: "25.203",
          mode: "ROLLBACK",
          site: site.slug,
          archivedSnapshot: archived,
        },
        null,
        2
      )
    );

    return;
  }

  const controlsBefore = Object.fromEntries(
    CONTROL_CITIES.map((city) => {
      const control = sites.find(
        (candidate) =>
          normalize(candidate.agency?.city) === normalize(city)
      );

      return [
        city,
        control ? siteEditorialFingerprint(control) : null,
      ];
    })
  );

  if (Object.values(controlsBefore).some((value) => !value)) {
    throw new Error(
      "MSE-25.203: agence témoin absente"
    );
  }

  const routeBefore = routeFingerprint(site);
  const nonServicesBefore =
    protectedNonServicesFingerprint(site);

  const report = {
    mse: "25.203",
    mode: APPLY ? "APPLY" : "DRY_RUN",
    site: site.slug,
    servicesPage: services.slug,
    servicesBlock: {
      id: block.id,
      type: block.blockType,
      name: block.name,
    },
    seo: SERVICES_SEO,
    items: SERVICE_ITEMS.map((item) => item.title),
    protected: {
      routeFingerprint: routeBefore,
      nonServicesFingerprint: nonServicesBefore,
      controls: controlsBefore,
    },
  };

  if (!APPLY) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (fs.existsSync(SNAPSHOT_PATH)) {
    throw new Error(
      `MSE-25.203: snapshot déjà présent: ${SNAPSHOT_PATH}`
    );
  }

  const snapshot = {
    mse: "25.203",
    siteId: site.id,
    siteSlug: site.slug,
    createdAt: new Date().toISOString(),
    page: {
      id: services.id,
      seoTitle: services.seoTitle,
      metaDescription: services.metaDescription,
      h1: services.h1,
    },
    block: blockSnapshot(block),
  };

  fs.writeFileSync(
    SNAPSHOT_PATH,
    JSON.stringify(snapshot, null, 2),
    {
      flag: "wx",
      mode: 0o600,
    }
  );

  try {
    await prisma.$transaction(async (tx) => {
      await tx.agencySitePage.update({
        where: { id: services.id },
        data: {
          seoTitle: SERVICES_SEO.title,
          metaDescription: SERVICES_SEO.metaDescription,
          h1: SERVICES_SEO.h1,
        },
      });

      await tx.pageBlock.update({
        where: { id: block.id },
        data: {
          content: newServicesContent(
            blockContent(block)
          ),
          status: "published",
          visibleDesktop: true,
          visibleMobile: true,
          version: block.version + 1,
        },
      });
    });

    sites = await loadSites(tenant.id);

    const fresh = sites.find(
      (candidate) => candidate.id === site.id
    );

    const controlsAfter = Object.fromEntries(
      CONTROL_CITIES.map((city) => {
        const control = sites.find(
          (candidate) =>
            normalize(candidate.agency?.city) === normalize(city)
        );

        return [
          city,
          control ? siteEditorialFingerprint(control) : null,
        ];
      })
    );

    const failures = [];

    if (routeFingerprint(fresh) !== routeBefore) {
      failures.push("topologie Lamorlaye");
    }

    if (
      protectedNonServicesFingerprint(fresh) !==
      nonServicesBefore
    ) {
      failures.push("pages Lamorlaye hors Services");
    }

    for (const city of CONTROL_CITIES) {
      if (controlsBefore[city] !== controlsAfter[city]) {
        failures.push(
          `contenu éditorial ${city}`
        );
      }
    }

    if (failures.length) {
      await restoreSnapshot(snapshot);

      const archived =
        await archiveSnapshot("auto-rollback");

      throw new Error(
        `MSE-25.203: validation post-écriture échouée ` +
        `(${failures.join(", ")}); rollback automatique effectué; ` +
        `snapshot=${archived}`
      );
    }

    report.result = {
      snapshot: SNAPSHOT_PATH,
      routeFingerprintUnchanged: true,
      nonServicesUnchanged: true,
      controlSitesUnchanged:
        Object.fromEntries(
          CONTROL_CITIES.map((city) => [city, true])
        ),
    };

    console.log(
      JSON.stringify(report, null, 2)
    );
  } catch (error) {
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
