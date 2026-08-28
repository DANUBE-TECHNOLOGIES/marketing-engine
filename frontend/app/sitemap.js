import {
  fetchMiniSiteSitemap,
} from "../lib/minisite-structured-data/client";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

const PUBLIC_ORIGIN =
  String(
    process.env
      .NEXT_PUBLIC_SITE_ORIGIN ||
    "https://agences.mondescale.com"
  ).replace(
    /\/+$/g,
    ""
  );

function normalizePath(
  value
) {
  let pathname =
    String(
      value ||
      ""
    ).trim();

  if (!pathname) {
    return null;
  }

  try {
    if (
      /^https?:\/\//i.test(
        pathname
      )
    ) {
      pathname =
        new URL(
          pathname
        ).pathname;
    }
  } catch {
    return null;
  }

  if (
    !pathname.startsWith(
      "/"
    )
  ) {
    pathname =
      `/${pathname}`;
  }

  pathname =
    pathname.replace(
      /^\/sites\/([^/]+)/,
      "/agence/$1"
    );

  pathname =
    pathname.replace(
      /\/{2,}/g,
      "/"
    );

  pathname =
    pathname.replace(
      /^(\/agence\/[^/]+)\/(?:home|accueil|index)$/i,
      "$1"
    );

  pathname =
    pathname.replace(
      /^(\/agence\/[^/]+)\/inspirations$/i,
      "$1/inspiration"
    );

  if (
    pathname.length >
      1 &&
    pathname.endsWith(
      "/"
    )
  ) {
    pathname =
      pathname.slice(
        0,
        -1
      );
  }

  return pathname;
}

function canonicalUrl(
  value
) {
  const pathname =
    normalizePath(
      value
    );

  if (!pathname) {
    return null;
  }

  if (
    !pathname.startsWith(
      "/agence/"
    )
  ) {
    return null;
  }

  return (
    PUBLIC_ORIGIN +
    pathname
  );
}

function normalizeDate(
  value
) {
  if (!value) {
    return undefined;
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return undefined;
  }

  return date;
}

function normalizePriority(
  value
) {
  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return 0.5;
  }

  return Math.min(
    1,
    Math.max(
      0,
      number
    )
  );
}

export default async function sitemap() {
  const payload =
    await fetchMiniSiteSitemap();

  if (payload?.error) {
    throw new Error(
      `MINISITE_SITEMAP_UNAVAILABLE:${payload.error}`
    );
  }

  const entries =
    Array.isArray(
      payload?.entries
    )
      ? payload.entries
      : [];

  const unique =
    new Map();

  for (
    const entry
    of entries
  ) {
    const url =
      canonicalUrl(
        entry?.url ||
        entry?.path
      );

    if (!url) {
      continue;
    }

    const normalized = {
      url,

      lastModified:
        normalizeDate(
          entry.lastModified ||
          entry.updatedAt ||
          entry.publishedAt
        ),

      changeFrequency:
        entry.changeFrequency ||
        "monthly",

      priority:
        normalizePriority(
          entry.priority
        ),
    };

    const existing =
      unique.get(
        url
      );

    if (
      !existing ||
      (
        normalized.lastModified &&
        (
          !existing.lastModified ||
          normalized.lastModified >
            existing.lastModified
        )
      )
    ) {
      unique.set(
        url,
        normalized
      );
    }
  }

  return Array.from(
    unique.values()
  ).sort(
    (
      left,
      right
    ) =>
      left.url.localeCompare(
        right.url
      )
  );
}

export {
  canonicalUrl,
  normalizePath,
};
