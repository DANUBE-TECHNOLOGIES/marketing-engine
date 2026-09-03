"use client";

import PublicPagePreview from "./PublicPagePreview";

export default function PreviewCanvas({
  previewMode,
  page,
  site,
  children,
}) {
  if (previewMode) {
    return (
      <PublicPagePreview
        page={page}
        site={site}
      />
    );
  }

  return children;
}
