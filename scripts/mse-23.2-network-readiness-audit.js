"use strict";

const fs =
  require("node:fs");

const {
  Prisma,
  PrismaClient,
} = require("@prisma/client");

const prisma =
  new PrismaClient();

const reportFile =
  process.argv[2];

const jsonFile =
  process.argv[3];

if (!reportFile || !jsonFile) {
  console.error(
    "Usage: node audit.js <report.md> <report.json>"
  );

  process.exit(1);
}

function fieldsFor(
  modelName
) {
  const model =
    Prisma.dmmf.datamodel.models
      .find(
        (item) =>
          item.name ===
          modelName
      );

  return new Set(
    model?.fields.map(
      (field) =>
        field.name
    ) || []
  );
}

function selectFields(
  available,
  requested
) {
  return Object.fromEntries(
    requested
      .filter(
        (field) =>
          available.has(
            field
          )
      )
      .map(
        (field) => [
          field,
          true,
        ]
      )
  );
}

function value(
  object,
  candidates,
  fallback = null
) {
  for (
    const candidate
    of candidates
  ) {
    if (
      object?.[candidate] !==
        undefined &&
      object?.[candidate] !==
        null
    ) {
      return object[candidate];
    }
  }

  return fallback;
}

function text(
  input
) {
  return String(
    input ?? ""
  ).trim();
}

function normalizeType(
  block
) {
  return text(
    value(
      block,
      [
        "blockType",
        "type",
      ],
      ""
    )
  ).toLowerCase();
}

function isPublished(
  object
) {
  return Boolean(
    object?.published === true ||
    object?.status ===
      "published" ||
    object?.publishedAt
  );
}

function issue(
  level,
  code,
  message,
  details = {}
) {
  return {
    level,
    code,
    message,
    details,
  };
}

function auditPage(
  page
) {
  const issues = [];

  const slug =
    text(
      page.slug
    );

  const title =
    text(
      page.title
    );

  const seoTitle =
    text(
      value(
        page,
        [
          "seoTitle",
        ],
        ""
      )
    );

  const description =
    text(
      value(
        page,
        [
          "metaDescription",
          "seoDescription",
        ],
        ""
      )
    );

  const blocks =
    Array.isArray(
      page.blocks
    )
      ? page.blocks
      : [];

  const types =
    blocks.map(
      normalizeType
    );

  if (!slug) {
    issues.push(
      issue(
        "FAIL",
        "PAGE_SLUG_MISSING",
        "Le slug de la page est absent."
      )
    );
  }

  if (!title) {
    issues.push(
      issue(
        "FAIL",
        "PAGE_TITLE_MISSING",
        "Le titre de la page est absent."
      )
    );
  }

  if (!seoTitle) {
    issues.push(
      issue(
        "WARN",
        "SEO_TITLE_MISSING",
        "Le titre SEO est absent."
      )
    );
  } else if (
    seoTitle.length < 25 ||
    seoTitle.length > 65
  ) {
    issues.push(
      issue(
        "WARN",
        "SEO_TITLE_LENGTH",
        `Longueur du titre SEO : ${seoTitle.length} caractères.`,
        {
          length:
            seoTitle.length,
        }
      )
    );
  }

  if (!description) {
    issues.push(
      issue(
        "WARN",
        "SEO_DESCRIPTION_MISSING",
        "La méta-description est absente."
      )
    );
  } else if (
    description.length < 70 ||
    description.length > 170
  ) {
    issues.push(
      issue(
        "WARN",
        "SEO_DESCRIPTION_LENGTH",
        `Longueur de la méta-description : ${description.length} caractères.`,
        {
          length:
            description.length,
        }
      )
    );
  }

  if (!blocks.length) {
    issues.push(
      issue(
        "FAIL",
        "PAGE_BLOCKS_MISSING",
        "La page ne contient aucun bloc."
      )
    );
  }

  const duplicateTypes =
    types.filter(
      (
        type,
        index
      ) =>
        type &&
        types.indexOf(
          type
        ) !== index
    );

  if (
    duplicateTypes.includes(
      "hero"
    )
  ) {
    issues.push(
      issue(
        "WARN",
        "DUPLICATE_HERO",
        "La page contient plusieurs blocs Hero."
      )
    );
  }

  if (
    ["home", "accueil", ""]
      .includes(slug)
  ) {
    if (
      !types.includes(
        "hero"
      )
    ) {
      issues.push(
        issue(
          "FAIL",
          "HOME_HERO_MISSING",
          "La page d’accueil ne contient aucun Hero."
        )
      );
    }

    if (
      !types.some(
        (type) =>
          [
            "cta",
            "call-to-action",
            "contact-cta",
          ].includes(type)
      )
    ) {
      issues.push(
        issue(
          "WARN",
          "HOME_CTA_MISSING",
          "La page d’accueil ne contient aucun CTA identifié."
        )
      );
    }
  }

  return {
    id:
      page.id,

    slug,

    title,

    status:
      page.status || null,

    published:
      isPublished(page),

    seoTitle,

    seoDescription:
      description,

    blockCount:
      blocks.length,

    blockTypes:
      types,

    issues,
  };
}

function auditSite(
  site
) {
  const issues = [];

  const pages =
    (
      site.pages || []
    ).map(
      auditPage
    );

  const siteSlug =
    text(
      site.slug
    );

  const agencyName =
    text(
      site.agency?.name
    );

  const pageSlugs =
    new Set(
      pages.map(
        (page) =>
          page.slug
      )
    );

  if (!siteSlug) {
    issues.push(
      issue(
        "FAIL",
        "SITE_SLUG_MISSING",
        "Le mini-site ne possède pas de slug."
      )
    );
  }

  if (!agencyName) {
    issues.push(
      issue(
        "FAIL",
        "AGENCY_NAME_MISSING",
        "Le nom de l’agence est absent."
      )
    );
  }

  if (!pages.length) {
    issues.push(
      issue(
        "FAIL",
        "SITE_PAGES_MISSING",
        "Le mini-site ne contient aucune page."
      )
    );
  }

  const homePage =
    pages.find(
      (page) =>
        [
          "",
          "home",
          "accueil",
        ].includes(
          page.slug
        )
    );

  if (!homePage) {
    issues.push(
      issue(
        "FAIL",
        "HOME_PAGE_MISSING",
        "Aucune page d’accueil n’est disponible."
      )
    );
  }

  const expectedPages = [
    {
      name:
        "Contact",
      slugs: [
        "contact",
        "nous-contacter",
      ],
      level:
        "FAIL",
    },
    {
      name:
        "Mentions légales",
      slugs: [
        "mentions-legales",
        "legal",
      ],
      level:
        "WARN",
    },
    {
      name:
        "Confidentialité",
      slugs: [
        "confidentialite",
        "politique-de-confidentialite",
        "privacy",
      ],
      level:
        "WARN",
    },
  ];

  for (
    const expected
    of expectedPages
  ) {
    const found =
      expected.slugs.some(
        (slug) =>
          pageSlugs.has(
            slug
          )
      );

    if (!found) {
      issues.push(
        issue(
          expected.level,
          "EXPECTED_PAGE_MISSING",
          `Page ${expected.name} absente.`,
          {
            expectedSlugs:
              expected.slugs,
          }
        )
      );
    }
  }

  const pageIssues =
    pages.flatMap(
      (page) =>
        page.issues.map(
          (pageIssue) => ({
            ...pageIssue,
            pageSlug:
              page.slug,
          })
        )
    );

  const allIssues = [
    ...issues,
    ...pageIssues,
  ];

  const failCount =
    allIssues.filter(
      (item) =>
        item.level ===
        "FAIL"
    ).length;

  const warningCount =
    allIssues.filter(
      (item) =>
        item.level ===
        "WARN"
    ).length;

  return {
    id:
      site.id,

    agencyId:
      site.agencyId,

    agencyName,

    slug:
      siteSlug,

    status:
      site.status || null,

    published:
      isPublished(site),

    pageCount:
      pages.length,

    blockCount:
      pages.reduce(
        (
          total,
          page
        ) =>
          total +
          page.blockCount,
        0
      ),

    failCount,

    warningCount,

    ready:
      failCount === 0,

    pages,

    issues,
  };
}

async function main() {
  const agencyFields =
    fieldsFor(
      "Agency"
    );

  const siteFields =
    fieldsFor(
      "AgencySite"
    );

  const pageFields =
    fieldsFor(
      "AgencySitePage"
    );

  const blockFields =
    fieldsFor(
      "PageBlock"
    );

  const agencySelect =
    selectFields(
      agencyFields,
      [
        "id",
        "name",
      ]
    );

  const siteSelect =
    selectFields(
      siteFields,
      [
        "id",
        "agencyId",
        "slug",
        "status",
        "publishedAt",
        "createdAt",
        "updatedAt",
      ]
    );

  const pageSelect =
    selectFields(
      pageFields,
      [
        "id",
        "siteId",
        "slug",
        "title",
        "status",
        "published",
        "seoTitle",
        "metaDescription",
        "seoDescription",
        "displayOrder",
        "createdAt",
        "updatedAt",
      ]
    );

  const blockSelect =
    selectFields(
      blockFields,
      [
        "id",
        "pageId",
        "blockType",
        "type",
        "status",
        "displayOrder",
        "position",
        "content",
      ]
    );

  const sites =
    await prisma
      .agencySite
      .findMany({
        select: {
          ...siteSelect,

          agency: {
            select:
              agencySelect,
          },

          pages: {
            select: {
              ...pageSelect,

              blocks: {
                select:
                  blockSelect,

                orderBy:
                  blockFields.has(
                    "displayOrder"
                  )
                    ? {
                        displayOrder:
                          "asc",
                      }
                    : blockFields.has(
                          "position"
                        )
                      ? {
                          position:
                            "asc",
                        }
                      : undefined,
              },
            },

            orderBy:
              pageFields.has(
                "displayOrder"
              )
                ? {
                    displayOrder:
                      "asc",
                  }
                : pageFields.has(
                      "createdAt"
                    )
                  ? {
                      createdAt:
                        "asc",
                    }
                  : undefined,
          },
        },

        orderBy:
          siteFields.has(
            "createdAt"
          )
            ? {
                createdAt:
                  "asc",
              }
            : {
                id:
                  "asc",
              },
      });

  const auditedSites =
    sites.map(
      auditSite
    );

  const totalFails =
    auditedSites.reduce(
      (
        total,
        site
      ) =>
        total +
        site.failCount,
      0
    );

  const totalWarnings =
    auditedSites.reduce(
      (
        total,
        site
      ) =>
        total +
        site.warningCount,
      0
    );

  const readySites =
    auditedSites.filter(
      (site) =>
        site.ready
    );

  const blockedSites =
    auditedSites.filter(
      (site) =>
        !site.ready
    );

  const result = {
    patch:
      "MSE-23.2A-NETWORK-SITES-READINESS-AUDIT",

    generatedAt:
      new Date()
        .toISOString(),

    summary: {
      totalSites:
        auditedSites.length,

      readySites:
        readySites.length,

      blockedSites:
        blockedSites.length,

      publishedSites:
        auditedSites.filter(
          (site) =>
            site.published
        ).length,

      draftSites:
        auditedSites.filter(
          (site) =>
            !site.published
        ).length,

      totalPages:
        auditedSites.reduce(
          (
            total,
            site
          ) =>
            total +
            site.pageCount,
          0
        ),

      totalBlocks:
        auditedSites.reduce(
          (
            total,
            site
          ) =>
            total +
            site.blockCount,
          0
        ),

      failures:
        totalFails,

      warnings:
        totalWarnings,
    },

    sites:
      auditedSites,
  };

  fs.writeFileSync(
    jsonFile,
    JSON.stringify(
      result,
      null,
      2
    )
  );

  const markdown = [];

  markdown.push(
    "# Recette réseau des mini-sites",
    "",
    `- Date : ${result.generatedAt}`,
    `- Mini-sites : **${result.summary.totalSites}**`,
    `- Prêts : **${result.summary.readySites}**`,
    `- Bloqués : **${result.summary.blockedSites}**`,
    `- Publiés : **${result.summary.publishedSites}**`,
    `- Brouillons : **${result.summary.draftSites}**`,
    `- Pages : **${result.summary.totalPages}**`,
    `- Blocs : **${result.summary.totalBlocks}**`,
    `- Échecs : **${result.summary.failures}**`,
    `- Avertissements : **${result.summary.warnings}**`,
    "",
    "## Synthèse par mini-site",
    "",
    "| Agence | Slug | Pages | Blocs | Échecs | Avertissements | Publication | Verdict |",
    "|---|---|---:|---:|---:|---:|---|---|"
  );

  for (
    const site
    of auditedSites
  ) {
    markdown.push(
      `| ${site.agencyName || "—"} | ${site.slug || "—"} | ${site.pageCount} | ${site.blockCount} | ${site.failCount} | ${site.warningCount} | ${site.published ? "Publié" : "Brouillon"} | ${site.ready ? "PRÊT" : "BLOQUÉ"} |`
    );
  }

  for (
    const site
    of auditedSites
  ) {
    markdown.push(
      "",
      `## ${site.agencyName || site.slug}`,
      "",
      `- Slug : \`${site.slug}\``,
      `- Statut : \`${site.status || "non défini"}\``,
      `- Pages : ${site.pageCount}`,
      `- Blocs : ${site.blockCount}`,
      `- Verdict : **${site.ready ? "PRÊT" : "BLOQUÉ"}**`,
      "",
      "### Pages",
      "",
      "| Slug | Titre | Blocs | SEO title | Description | Échecs | Alertes |",
      "|---|---|---:|---|---|---:|---:|"
    );

    for (
      const page
      of site.pages
    ) {
      const pageFails =
        page.issues.filter(
          (item) =>
            item.level ===
            "FAIL"
        ).length;

      const pageWarnings =
        page.issues.filter(
          (item) =>
            item.level ===
            "WARN"
        ).length;

      markdown.push(
        `| ${page.slug || "—"} | ${page.title || "—"} | ${page.blockCount} | ${page.seoTitle ? "Oui" : "Non"} | ${page.seoDescription ? "Oui" : "Non"} | ${pageFails} | ${pageWarnings} |`
      );
    }

    const allIssues = [
      ...site.issues,
      ...site.pages.flatMap(
        (page) =>
          page.issues.map(
            (pageIssue) => ({
              ...pageIssue,
              pageSlug:
                page.slug,
            })
          )
      ),
    ];

    if (allIssues.length) {
      markdown.push(
        "",
        "### Anomalies",
        ""
      );

      for (
        const currentIssue
        of allIssues
      ) {
        markdown.push(
          `- **${currentIssue.level}** — ${currentIssue.pageSlug ? `\`${currentIssue.pageSlug}\` — ` : ""}${currentIssue.message}`
        );
      }
    } else {
      markdown.push(
        "",
        "Aucune anomalie détectée."
      );
    }
  }

  fs.writeFileSync(
    reportFile,
    markdown.join("\n") +
      "\n"
  );

  console.log(
    JSON.stringify(
      result.summary,
      null,
      2
    )
  );
}

main()
  .catch(
    (error) => {
      console.error(error);
      process.exitCode = 1;
    }
  )
  .finally(
    async () => {
      await prisma
        .$disconnect();
    }
  );
