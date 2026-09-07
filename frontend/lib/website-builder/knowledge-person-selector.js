const DEFAULT_PAGE_SIZE = 100;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizedPerson(entity) {
  if (!entity || typeof entity !== "object") {
    return null;
  }

  const id = String(entity.id || "").trim();
  const title = String(entity.title || "").trim();

  if (!id || !title) {
    return null;
  }

  if (entity.type !== "person" || entity.status !== "published") {
    return null;
  }

  return {
    id,
    title,
    slug: String(entity.slug || "").trim() || null,
  };
}

export function publishedPersonKnowledgeUrl({
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) {
  const params = new URLSearchParams({
    type: "person",
    status: "published",
    page: "1",
    pageSize: String(pageSize),
  });

  return `/api/knowledge?${params.toString()}`;
}

export function normalizePublishedPersonEntities(payload) {
  const seen = new Set();

  return asArray(payload?.data)
    .map(normalizedPerson)
    .filter(Boolean)
    .filter((person) => {
      if (seen.has(person.id)) {
        return false;
      }

      seen.add(person.id);
      return true;
    });
}

export async function fetchPublishedPersonKnowledge({
  fetchImpl = fetch,
  pageSize = DEFAULT_PAGE_SIZE,
  signal,
} = {}) {
  const response = await fetchImpl(
    publishedPersonKnowledgeUrl({ pageSize }),
    {
      cache: "no-store",
      signal,
      headers: {
        accept: "application/json",
      },
    }
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        "Impossible de charger les conseillers publiés."
    );
  }

  return normalizePublishedPersonEntities(payload);
}
