"use strict";

const STORAGE_PREFIX = "mondescale-page-builder-draft-v1";

function storageKey(siteId, pageId) {
  return `${STORAGE_PREFIX}:${siteId}:${pageId}`;
}

export function saveLocalDraft(siteId, page) {
  if (
    typeof window === "undefined" ||
    !siteId ||
    !page?.id
  ) {
    return false;
  }

  const payload = {
    version: 1,
    siteId: String(siteId),
    pageId: String(page.id),
    savedAt: new Date().toISOString(),
    page,
  };

  window.localStorage.setItem(
    storageKey(siteId, page.id),
    JSON.stringify(payload)
  );

  return payload.savedAt;
}

export function readLocalDraft(siteId, pageId) {
  if (
    typeof window === "undefined" ||
    !siteId ||
    !pageId
  ) {
    return null;
  }

  const raw = window.localStorage.getItem(
    storageKey(siteId, pageId)
  );

  if (!raw) return null;

  try {
    const payload = JSON.parse(raw);

    if (
      payload?.version !== 1 ||
      !payload?.page ||
      String(payload.siteId) !== String(siteId) ||
      String(payload.pageId) !== String(pageId)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function removeLocalDraft(siteId, pageId) {
  if (
    typeof window === "undefined" ||
    !siteId ||
    !pageId
  ) {
    return;
  }

  window.localStorage.removeItem(
    storageKey(siteId, pageId)
  );
}
