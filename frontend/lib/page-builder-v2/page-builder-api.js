"use strict";

import {
  normalizePage,
  normalizeSite,
  serializePage,
} from "./page-builder-state";

async function readJson(response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function extractSites(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.sites)) return payload.sites;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items;
  }
  return [];
}

function pageApiSlug(page) {
  return page?.slug
    ? encodeURIComponent(page.slug)
    : "home";
}

export async function fetchSite(siteId) {
  const response = await fetch("/api/website-builder/sites", {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(
      payload?.message ||
      `Impossible de charger les mini-sites (${response.status}).`
    );
  }

  const sites = extractSites(payload).map(normalizeSite);

  const site = sites.find(
    (item) =>
      item.id === String(siteId) ||
      item.slug === String(siteId)
  );

  if (!site) {
    throw new Error(
      `Mini-site introuvable : ${siteId}.`
    );
  }

  return site;
}

export async function fetchPageDetails(site, page) {
  if (!site?.agencyId || !page) {
    return normalizePage(page);
  }

  const response = await fetch(
    `/api/website-builder/agencies/${encodeURIComponent(
      site.agencyId
    )}/pages/${pageApiSlug(page)}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return normalizePage(page);
  }

  const payload = await readJson(response);

  return normalizePage(
    payload?.page ||
    payload?.data ||
    payload ||
    page
  );
}

export async function fetchApprovedOffers(
  agencyId,
  { limit = 24 } = {}
) {
  if (!agencyId) {
    return [];
  }

  const response = await fetch(
    `/api/website-builder/agencies/${encodeURIComponent(
      agencyId
    )}/offers?limit=${encodeURIComponent(limit)}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(
      payload?.message ||
      payload?.error ||
      `Impossible de charger les offres approuvées (${response.status}).`
    );
  }

  return Array.isArray(payload?.items)
    ? payload.items
    : [];
}

async function sendPage(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await readJson(response);

  return {
    response,
    payload,
  };
}

export async function savePage(site, page) {
  if (!site?.agencyId) {
    throw new Error(
      "Le mini-site ne possède pas d’identifiant d’agence."
    );
  }

  const url =
    `/api/website-builder/agencies/${encodeURIComponent(
      site.agencyId
    )}/pages/${pageApiSlug(page)}`;

  const serialized = serializePage(page);

  const body = {
    page: {
      id: serialized.id,
      slug: serialized.slug,
      title: serialized.title,
      status: serialized.status,
      published: serialized.published,
      seoTitle: serialized.seoTitle,
      seoDescription:
        serialized.seoDescription,
    },
    blocks: serialized.blocks,
    reason: "visual-editor-save",
  };

  let result = await sendPage(url, "PUT", body);

  if (
    result.response.status === 404 ||
    result.response.status === 405
  ) {
    result = await sendPage(url, "PATCH", body);
  }

  if (!result.response.ok) {
    throw new Error(
      result.payload?.message ||
      result.payload?.error ||
      `Échec de la sauvegarde (${result.response.status}).`
    );
  }

  return normalizePage(
    result.payload?.page ||
    result.payload?.data ||
    result.payload ||
    body
  );
}

export async function fetchPageVersions(site, page) {
  if (!site?.agencyId || !page?.id) {
    throw new Error(
      "La page ou l’agence est invalide."
    );
  }

  const response = await fetch(
    `/api/website-builder/agencies/${encodeURIComponent(
      site.agencyId
    )}/pages/${pageApiSlug(page)}/versions`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(
      payload?.message ||
      payload?.error ||
      `Impossible de charger les versions (${response.status}).`
    );
  }

  return {
    pageId: payload?.pageId || page.id,
    items: Array.isArray(payload?.items)
      ? payload.items
      : [],
  };
}

export async function rollbackPageVersion(
  site,
  page,
  versionId
) {
  if (
    !site?.agencyId ||
    !page?.id ||
    !versionId
  ) {
    throw new Error(
      "Les informations de rollback sont incomplètes."
    );
  }

  const response = await fetch(
    `/api/website-builder/agencies/${encodeURIComponent(
      site.agencyId
    )}/pages/${pageApiSlug(
      page
    )}/versions/${encodeURIComponent(
      versionId
    )}/rollback`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        reason: "visual-editor-rollback",
      }),
    }
  );

  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(
      result.payload?.message ||
      result.payload?.error ||
      `Échec de la restauration (${response.status}).`
    );
  }

  return normalizePage(
    payload?.page ||
    payload?.data ||
    payload
  );
}

export async function fetchPublishedDestinations() {
  const response = await fetch(
    "/api/website-builder/destinations",
    {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Impossible de charger le catalogue destinations."
    );
  }

  const payload = await response.json();

  const destinations = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.destinations)
        ? payload.destinations
        : [];

  return destinations
    .filter(
      (destination) =>
        destination &&
        destination.id &&
        destination.name
    )
    .map((destination) => ({
      id: String(destination.id),
      slug: String(destination.slug || ""),
      name: String(destination.name),
      country: String(destination.country || ""),
      region: String(destination.region || ""),
      heroImageUrl:
        destination.heroImageUrl || null,
    }));
}

export async function fetchPublishedInspirations({
  limit = 24,
  channel = "article",
} = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (channel) {
    params.set("channel", channel);
  }

  const response = await fetch(
    `/api/website-builder/inspirations?${params.toString()}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(
      payload?.message ||
      payload?.error ||
      `Impossible de charger les inspirations publiées (${response.status}).`
    );
  }

  return (Array.isArray(payload?.items) ? payload.items : [])
    .filter(item => item && item.id && item.title)
    .map(item => ({
      ...item,
      id: String(item.id),
      slug: String(item.slug || ""),
      title: String(item.title),
      description: String(item.description || ""),
      category: String(item.category || item.channel || "Inspiration"),
      image: item.image || null,
    }));
}
