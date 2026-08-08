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

const BACKEND_ORIGIN =
  String(
    process.env.MONDESCALE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    "http://backend:4000"
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

async function fetchCandidate({
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
      url,
      status:
        response.status,

      payload,
    };
  } catch (error) {
    return {
      url,
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

function arrayFromPayload(
  payload
) {
  if (
    Array.isArray(
      payload
    )
  ) {
    return payload;
  }

  const candidates = [
    payload?.agencies,
    payload?.sites,
    payload?.items,
    payload?.results,
    payload?.data,
    payload?.data?.agencies,
    payload?.data?.sites,
    payload?.data?.items,
    payload?.data?.results,
  ];

  for (
    const candidate
    of candidates
  ) {
    if (
      Array.isArray(
        candidate
      )
    ) {
      return candidate;
    }
  }

  return [];
}

function normalizeStatus(
  value
) {
  const status =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

  if (
    [
      "published",
      "live",
      "online",
      "active",
    ].includes(
      status
    )
  ) {
    return "published";
  }

  if (
    [
      "draft",
      "brouillon",
      "pending",
    ].includes(
      status
    )
  ) {
    return "draft";
  }

  return status || null;
}

function normalizeAgency(
  item
) {
  if (
    !item ||
    typeof item !==
      "object"
  ) {
    return null;
  }

  const agency =
    item.agency ||
    item.agence ||
    item;

  const site =
    item.site ||
    item.website ||
    item.miniSite ||
    (
      item.slug &&
      item.agencyId
        ? item
        : null
    );

  const rawId =
    agency.id ||
    agency.agencyId ||
    item.agencyId ||
    site?.agencyId ||
    null;

  const id =
    Number(
      rawId
    );

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  const name =
    agency.name ||
    agency.displayName ||
    agency.label ||
    item.agencyName ||
    site?.agency?.name ||
    site?.name ||
    `Agence #${id}`;

  const city =
    agency.city ||
    agency.locality ||
    agency.addressCity ||
    item.city ||
    site?.agency?.city ||
    "";

  const postalCode =
    agency.postalCode ||
    agency.zipCode ||
    item.postalCode ||
    site?.agency?.postalCode ||
    "";

  const siteSlug =
    site?.slug ||
    item.siteSlug ||
    agency.siteSlug ||
    null;

  const siteStatus =
    normalizeStatus(
      site?.status ||
      item.siteStatus ||
      (
        site?.publishedAt
          ? "published"
          : null
      )
    );

  return {
    id,

    name:
      String(name),

    city:
      String(
        city || ""
      ),

    postalCode:
      String(
        postalCode || ""
      ),

    label:
      [
        String(name),
        city
          ? String(city)
          : null,
      ]
        .filter(Boolean)
        .join(" — "),

    siteId:
      site?.id ||
      item.siteId ||
      null,

    siteSlug,

    siteStatus,

    published:
      siteStatus ===
        "published" ||
      Boolean(
        site?.publishedAt
      ),
  };
}

function mergeAgencies(
  collections
) {
  const byId =
    new Map();

  for (
    const collection
    of collections
  ) {
    for (
      const item
      of collection
    ) {
      const normalized =
        normalizeAgency(
          item
        );

      if (!normalized) {
        continue;
      }

      const existing =
        byId.get(
          normalized.id
        );

      if (!existing) {
        byId.set(
          normalized.id,
          normalized
        );

        continue;
      }

      byId.set(
        normalized.id,
        {
          ...existing,

          ...Object.fromEntries(
            Object.entries(
              normalized
            ).filter(
              (
                [
                  ,
                  value,
                ]
              ) =>
                value !== null &&
                value !== ""
            )
          ),

          published:
            existing.published ||
            normalized.published,
        }
      );
    }
  }

  return [
    ...byId.values(),
  ].sort(
    (
      first,
      second
    ) =>
      first.name.localeCompare(
        second.name,
        "fr",
        {
          sensitivity:
            "base",
        }
      )
  );
}

export async function GET(
  request
) {
  const headers =
    forwardedHeaders(
      request
    );

  const candidates = [
    `${FRONTEND_ORIGIN}/api/website-builder/sites`,
    `${BACKEND_ORIGIN}/api/website-builder/sites`,
    `${BACKEND_ORIGIN}/website-builder/sites`,
    `${BACKEND_ORIGIN}/api/agencies`,
    `${BACKEND_ORIGIN}/agencies`,
  ];

  const attempts =
    await Promise.all(
      candidates.map(
        (url) =>
          fetchCandidate({
            url,
            headers,
          })
      )
    );

  const collections =
    attempts
      .filter(
        (attempt) =>
          attempt.status >=
            200 &&
          attempt.status <
            300
      )
      .map(
        (attempt) =>
          arrayFromPayload(
            attempt.payload
          )
      )
      .filter(
        (collection) =>
          collection.length
      );

  const agencies =
    mergeAgencies(
      collections
    );

  if (!agencies.length) {
    return NextResponse.json(
      {
        error:
          "BRAND_STUDIO_AGENCIES_UNAVAILABLE",

        message:
          "Aucune agence n’a pu être chargée depuis les contrats disponibles.",

        agencies:
          [],

        attempts:
          attempts.map(
            (attempt) => ({
              path:
                (() => {
                  try {
                    return new URL(
                      attempt.url
                    ).pathname;
                  } catch {
                    return attempt.url;
                  }
                })(),

              status:
                attempt.status,

              error:
                attempt.error ||
                undefined,
            })
          ),
      },
      {
        status:
          503,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    {
      version:
        "1.0",

      count:
        agencies.length,

      agencies,

      data: {
        agencies,
      },

      sources:
        attempts
          .filter(
            (attempt) =>
              attempt.status >=
                200 &&
              attempt.status <
                300
          )
          .map(
            (attempt) => {
              try {
                return new URL(
                  attempt.url
                ).pathname;
              } catch {
                return attempt.url;
              }
            }
          ),
    },
    {
      status:
        200,

      headers: {
        "Cache-Control":
          "private, max-age=30",
      },
    }
  );
}

export const dynamic =
  "force-dynamic";
