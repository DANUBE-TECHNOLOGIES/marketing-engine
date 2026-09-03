"use strict";

function normalizeMediaAsset(asset) {
  const payload =
    asset?.payload && typeof asset.payload === "object" ? asset.payload : {};

  return {
    id: String(asset?.id || ""),
    title: String(asset?.title || "Image"),
    slug: String(asset?.slug || ""),
    status: String(asset?.status || ""),
    type: String(asset?.type || ""),
    url: typeof payload.url === "string" ? payload.url : "",
    altText:
      typeof payload.altText === "string"
        ? payload.altText
        : String(asset?.title || ""),
    mimeType:
      typeof payload.mimeType === "string" ? payload.mimeType : "",
    usage: Array.isArray(payload.usage) ? payload.usage : [],
    currentVersion: Number(asset?.currentVersion || 0),
    metadata:
      asset?.metadata && typeof asset.metadata === "object"
        ? asset.metadata
        : {},
  };
}

export async function fetchPublishedMediaImages({ search = "" } = {}) {
  const params = new URLSearchParams();
  params.set("limit", "100");
  if (search) params.set("search", search);

  const response = await fetch(`/api/page-builder-media?${params.toString()}`, {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        payload?.error?.message ||
        `Impossible de charger la médiathèque (${response.status}).`
    );
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];

  return items
    .map(normalizeMediaAsset)
    .filter(
      (asset) =>
        asset.id &&
        asset.type === "MEDIA_IMAGE" &&
        asset.status === "published" &&
        asset.url
    );
}

export { normalizeMediaAsset };
