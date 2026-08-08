"use client";

import { useEffect, useMemo, useState } from "react";

import PublicSiteSections from "../public-site/PublicSiteSections";

function toPublicPreviewPage(page) {
  return {
    ...page,
    sections: (page?.blocks || []).map((block, index) => ({
      id: block.id || `preview-${index}`,
      sectionType: block.type || "rich_text",
      status: block.status === "hidden" ? "hidden" : "draft",
      displayOrder: block.position ?? index,
      jsonContent: {
        ...(block.content || {}),
        __builderType: block.type || "rich_text",
      },
    })),
  };
}

function runtimeCssVariables(payload) {
  const variables = payload?.runtime?.brand?.cssVariables;

  if (!variables || typeof variables !== "object" || Array.isArray(variables)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(variables)
      .filter(
        ([key, value]) =>
          /^--[a-zA-Z0-9_-]+$/.test(key) &&
          value !== null &&
          value !== undefined &&
          value !== ""
      )
      .map(([key, value]) => [key, String(value)])
  );
}

export default function PublicPagePreview({ page, site }) {
  const [brandVariables, setBrandVariables] = useState({});

  const previewPage = useMemo(
    () => (page ? toPublicPreviewPage(page) : null),
    [page]
  );

  useEffect(() => {
    if (!site?.slug) {
      setBrandVariables({});
      return undefined;
    }

    let active = true;

    async function loadBrandRuntime() {
      try {
        const response = await fetch(
          `/api/public-brand-legal/sites/${encodeURIComponent(site.slug)}`,
          {
            headers: {
              accept: "application/json",
              "x-tenant-slug": "mondescale",
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (active) setBrandVariables({});
          return;
        }

        const payload = await response.json();
        if (active) setBrandVariables(runtimeCssVariables(payload));
      } catch {
        if (active) setBrandVariables({});
      }
    }

    loadBrandRuntime();

    return () => {
      active = false;
    };
  }, [site?.slug]);

  if (!site || !previewPage) {
    return null;
  }

  return (
    <div
      className="public-site-shell"
      style={
        Object.keys(brandVariables).length
          ? brandVariables
          : undefined
      }
    >
      <PublicSiteSections page={previewPage} site={site} />
    </div>
  );
}
