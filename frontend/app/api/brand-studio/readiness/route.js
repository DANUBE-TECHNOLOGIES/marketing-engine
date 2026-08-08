import {
  NextResponse,
} from "next/server";

const FRONTEND_ORIGIN =
  String(
    process.env.INTERNAL_FRONTEND_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://127.0.0.1:3000"
  ).replace(
    /\/+$/,
    ""
  );

function forwardedHeaders(
  request
) {
  const headers =
    new Headers();

  for (
    const name
    of [
      "accept",
      "authorization",
      "cookie",
      "x-tenant-id",
      "x-tenant-slug",
      "x-request-id",
    ]
  ) {
    const value =
      request.headers.get(
        name
      );

    if (value) {
      headers.set(
        name,
        value
      );
    }
  }

  if (
    !headers.has(
      "accept"
    )
  ) {
    headers.set(
      "accept",
      "application/json"
    );
  }

  if (
    !headers.has(
      "x-tenant-id"
    ) &&
    !headers.has(
      "x-tenant-slug"
    )
  ) {
    headers.set(
      "x-tenant-slug",
      "mondescale"
    );
  }

  return headers;
}

async function fetchJson({
  url,
  headers,
}) {
  try {
    const response =
      await fetch(
        url,
        {
          method:
            "GET",

          headers,

          cache:
            "no-store",

          redirect:
            "manual",

          signal:
            AbortSignal.timeout(
              15000
            ),
        }
      );

    const text =
      await response.text();

    let payload = null;

    if (text) {
      try {
        payload =
          JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    return {
      ok:
        response.ok,

      status:
        response.status,

      payload,
    };
  } catch (error) {
    return {
      ok:
        false,

      status:
        0,

      payload:
        null,

      error:
        error?.message ||
        "Connexion impossible",
    };
  }
}

async function probeRoute({
  path,
  headers,
}) {
  try {
    const response =
      await fetch(
        `${FRONTEND_ORIGIN}${path}`,
        {
          method:
            "GET",

          headers,

          cache:
            "no-store",

          redirect:
            "manual",

          signal:
            AbortSignal.timeout(
              15000
            ),
        }
      );

    return {
      path,

      status:
        response.status,

      operational:
        response.status === 200,
    };
  } catch (error) {
    return {
      path,

      status:
        0,

      operational:
        false,

      error:
        error?.message ||
        "Connexion impossible",
    };
  }
}

function normalizeAgencyId(
  value
) {
  const id =
    Number(value);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

function hasValue(
  value
) {
  return Boolean(
    String(
      value || ""
    ).trim()
  );
}

function hasValidColor(
  value
) {
  return /^#[0-9a-f]{6}$/i.test(
    String(
      value || ""
    ).trim()
  );
}

function buildChecks(
  contract
) {
  const brand =
    contract?.brand ||
    contract?.branding ||
    contract?.brandProfile ||
    {};

  const values =
    brand.values ||
    contract?.site?.theme ||
    {};

  const assets =
    brand.assets ||
    {};

  const legal =
    contract?.legal ||
    contract?.legalProfile ||
    {};

  const legalPages =
    legal.pages ||
    {};

  const pages =
    Array.isArray(
      contract?.pages
    )
      ? contract.pages
      : [];

  const checks = [
    {
      id:
        "site",

      category:
        "Mini-site",

      label:
        "Mini-site configuré",

      ready:
        Boolean(
          contract?.site?.id &&
          contract?.site?.slug
        ),

      required:
        true,

      action:
        "website-builder",
    },

    {
      id:
        "home-page",

      category:
        "Mini-site",

      label:
        "Page d’accueil disponible",

      ready:
        Boolean(
          contract?.homePage ||
          contract?.page
        ),

      required:
        true,

      action:
        "website-builder",
    },

    {
      id:
        "primary-color",

      category:
        "Identité visuelle",

      label:
        "Couleur principale",

      ready:
        hasValidColor(
          values.primaryColor ||
          values.colors?.primary
        ),

      required:
        true,

      action:
        "identity",
    },

    {
      id:
        "secondary-color",

      category:
        "Identité visuelle",

      label:
        "Couleur secondaire",

      ready:
        hasValidColor(
          values.secondaryColor ||
          values.colors?.secondary
        ),

      required:
        true,

      action:
        "identity",
    },

    {
      id:
        "accent-color",

      category:
        "Identité visuelle",

      label:
        "Couleur d’accent",

      ready:
        hasValidColor(
          values.accentColor ||
          values.colors?.accent
        ),

      required:
        true,

      action:
        "identity",
    },

    {
      id:
        "heading-font",

      category:
        "Identité visuelle",

      label:
        "Police des titres",

      ready:
        hasValue(
          values.headingFont ||
          values.fonts?.heading
        ),

      required:
        true,

      action:
        "identity",
    },

    {
      id:
        "body-font",

      category:
        "Identité visuelle",

      label:
        "Police du texte",

      ready:
        hasValue(
          values.bodyFont ||
          values.fonts?.body
        ),

      required:
        true,

      action:
        "identity",
    },

    {
      id:
        "logo",

      category:
        "Médias",

      label:
        "Logo principal",

      ready:
        Boolean(
          brand.logoUrl ||
          brand.logoPrimaryUrl ||
          assets.logoPrimary?.publicUrl
        ),

      required:
        true,

      action:
        "media",
    },

    {
      id:
        "favicon",

      category:
        "Médias",

      label:
        "Favicon",

      ready:
        Boolean(
          brand.faviconUrl ||
          assets.favicon?.publicUrl
        ),

      required:
        true,

      action:
        "media",
    },

    {
      id:
        "hero",

      category:
        "Médias",

      label:
        "Image Hero par défaut",

      ready:
        Boolean(
          brand.heroDefaultUrl ||
          assets.heroDefault?.publicUrl
        ),

      required:
        true,

      action:
        "media",
    },

    {
      id:
        "open-graph",

      category:
        "Médias",

      label:
        "Image OpenGraph",

      ready:
        Boolean(
          brand.openGraphUrl ||
          assets.openGraph?.publicUrl
        ),

      required:
        false,

      action:
        "media",
    },

    {
      id:
        "legal-notice",

      category:
        "Juridique",

      label:
        "Mentions légales",

      ready:
        hasValue(
          legalPages.legalNotice ||
          legal.legalNotice
        ),

      required:
        true,

      action:
        "legal",
    },

    {
      id:
        "privacy",

      category:
        "Juridique",

      label:
        "Politique de confidentialité",

      ready:
        hasValue(
          legalPages.privacyPolicy ||
          legal.privacyPolicy
        ),

      required:
        true,

      action:
        "legal",
    },

    {
      id:
        "cookies",

      category:
        "Juridique",

      label:
        "Politique de cookies",

      ready:
        hasValue(
          legalPages.cookiePolicy ||
          legal.cookiePolicy
        ),

      required:
        false,

      action:
        "legal",
    },

    {
      id:
        "pages",

      category:
        "Contenu",

      label:
        "Pages éditoriales disponibles",

      ready:
        pages.length > 0,

      required:
        true,

      action:
        "website-builder",

      details:
        `${pages.length} page(s)`,
    },
  ];

  return checks;
}

function readinessScore(
  checks
) {
  const required =
    checks.filter(
      (check) =>
        check.required
    );

  const completed =
    required.filter(
      (check) =>
        check.ready
    );

  if (!required.length) {
    return 0;
  }

  return Math.round(
    (
      completed.length /
      required.length
    ) *
    100
  );
}

function readinessStatus(
  score
) {
  if (score === 100) {
    return "ready";
  }

  if (score >= 75) {
    return "almost-ready";
  }

  if (score >= 40) {
    return "in-progress";
  }

  return "incomplete";
}

export async function GET(
  request
) {
  const sourceUrl =
    new URL(
      request.url
    );

  const agencyId =
    normalizeAgencyId(
      sourceUrl.searchParams.get(
        "agencyId"
      )
    );

  const siteSlug =
    String(
      sourceUrl.searchParams.get(
        "siteSlug"
      ) ||
      ""
    ).trim();

  if (!agencyId) {
    return NextResponse.json(
      {
        error:
          "AGENCY_ID_REQUIRED",

        message:
          "L’identifiant de l’agence est obligatoire.",
      },
      {
        status:
          400,
      }
    );
  }

  if (!siteSlug) {
    return NextResponse.json(
      {
        version:
          "1.0",

        agencyId,

        siteSlug:
          null,

        score:
          0,

        status:
          "incomplete",

        checks: [
          {
            id:
              "site-slug",

            category:
              "Mini-site",

            label:
              "Mini-site associé à l’agence",

            ready:
              false,

            required:
              true,

            action:
              "website-builder",
          },
        ],

        publicRoutes:
          [],

        summary: {
          required:
            1,

          completed:
            0,

          missing:
            1,
        },
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const headers =
    forwardedHeaders(
      request
    );

  const contractResult =
    await fetchJson({
      url:
        `${FRONTEND_ORIGIN}` +
        `/api/public-sites/` +
        encodeURIComponent(
          siteSlug
        ),

      headers,
    });

  if (
    !contractResult.ok
  ) {
    return NextResponse.json(
      {
        error:
          "PUBLIC_SITE_CONTRACT_UNAVAILABLE",

        message:
          "Le contrat public du mini-site est indisponible.",

        details: {
          status:
            contractResult.status,

          siteSlug,

          cause:
            contractResult.error ||
            undefined,
        },
      },
      {
        status:
          contractResult.status ===
            404
            ? 404
            : 502,
      }
    );
  }

  const contract =
    contractResult.payload;

  const checks =
    buildChecks(
      contract
    );

  const score =
    readinessScore(
      checks
    );

  const routePaths = [
    `/sites/${siteSlug}`,
    `/sites/${siteSlug}/accueil`,
    `/sites/${siteSlug}/agence`,
    `/sites/${siteSlug}/mentions-legales`,
    `/sites/${siteSlug}/confidentialite`,
  ];

  const publicRoutes =
    await Promise.all(
      routePaths.map(
        (path) =>
          probeRoute({
            path,
            headers,
          })
      )
    );

  const requiredChecks =
    checks.filter(
      (check) =>
        check.required
    );

  const completedChecks =
    requiredChecks.filter(
      (check) =>
        check.ready
    );

  return NextResponse.json(
    {
      version:
        "1.0",

      generatedAt:
        new Date()
          .toISOString(),

      agencyId,

      siteSlug,

      site: {
        id:
          contract.site?.id ||
          null,

        name:
          contract.site?.name ||
          contract.agency?.name ||
          null,

        status:
          contract.site?.status ||
          null,

        published:
          Boolean(
            contract.site?.published
          ),

        pageCount:
          contract.pages
            ?.length ||
          0,
      },

      score,

      status:
        readinessStatus(
          score
        ),

      checks,

      publicRoutes,

      summary: {
        required:
          requiredChecks.length,

        completed:
          completedChecks.length,

        missing:
          requiredChecks.length -
          completedChecks.length,

        optionalCompleted:
          checks.filter(
            (check) =>
              !check.required &&
              check.ready
          ).length,

        operationalRoutes:
          publicRoutes.filter(
            (route) =>
              route.operational
          ).length,

        routeCount:
          publicRoutes.length,
      },
    },
    {
      status:
        200,

      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

export const dynamic =
  "force-dynamic";
