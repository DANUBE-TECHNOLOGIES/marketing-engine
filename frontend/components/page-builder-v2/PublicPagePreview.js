"use client";

import { useEffect, useMemo, useState } from "react";

import PublicSiteFooter from "../public-site/PublicSiteFooter";
import PublicSiteHeader from "../public-site/PublicSiteHeader";
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

function previewNavigation(site, currentPage) {
  if (!site?.slug || !Array.isArray(site?.pages)) {
    return Array.isArray(site?.navigation)
      ? site.navigation
      : [];
  }

  const root = `/agence/${encodeURIComponent(site.slug)}`;

  return site.pages
    .filter(
      (page) =>
        page?.id === currentPage?.id ||
        page?.status === "published" ||
        page?.published === true
    )
    .map((page, index) => {
      const slug = String(page?.slug || "")
        .trim()
        .replace(/^\/+|\/+$/g, "");

      return {
        id: page.id,
        slug,
        title: page.title || "Page",
        path: slug
          ? `${root}/${encodeURIComponent(slug)}`
          : root,
        displayOrder: index,
      };
    });
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

function runtimeBrandAssets(payload) {
  const assets = payload?.runtime?.brand?.assets;

  if (!assets || typeof assets !== "object" || Array.isArray(assets)) {
    return {};
  }

  return assets;
}

function previewPageKey(page) {
  if (!page) return "";
  return JSON.stringify({
    id: page.id || null,
    slug: page.slug || "",
    status: page.status || "draft",
    published: page.published === true,
    seoTitle: page.seoTitle || "",
    seoDescription: page.seoDescription || "",
    blocks: page.blocks || [],
  });
}

export default function PublicPagePreview({ page, site }) {
  const pageKey = useMemo(() => previewPageKey(page), [page]);
  const [hydratedPreview, setHydratedPreview] = useState(null);
  const [brandRuntimeState, setBrandRuntimeState] = useState(null);
  const [hoursState, setHoursState] = useState(null);

  useEffect(() => {
    if (!site?.slug || !page) return undefined;

    let active = true;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/public-site-preview/${encodeURIComponent(site.slug)}`,
          {
            method: "POST",
            headers: {
              accept: "application/json",
              "content-type": "application/json",
            },
            body: JSON.stringify({ page }),
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) return;

        const payload = await response.json();

        if (active && payload?.page) {
          setHydratedPreview({ key: pageKey, page: payload.page });
        }
      } catch (error) {
        if (error?.name !== "AbortError") {
          // L'aperçu local reste utilisable si l'hydratation dynamique échoue.
        }
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, pageKey, site?.slug]);

  const hydratedPage = hydratedPreview?.key === pageKey
    ? hydratedPreview.page
    : page || null;

  const previewPage = useMemo(
    () => (hydratedPage ? toPublicPreviewPage(hydratedPage) : null),
    [hydratedPage]
  );

  const navigation = useMemo(
    () => previewNavigation(site, page),
    [site, page]
  );

  const hours = hoursState?.slug === site?.slug
    ? hoursState.hours
    : site?.hours || null;

  const previewSite = useMemo(
    () =>
      site
        ? {
            ...site,
            navigation,
            hours,
          }
        : site,
    [site, navigation, hours]
  );

  const brandRuntime = brandRuntimeState?.slug === site?.slug
    ? brandRuntimeState.payload
    : null;

  const brandVariables = useMemo(
    () => runtimeCssVariables(brandRuntime),
    [brandRuntime]
  );

  const brandAssets = useMemo(
    () => runtimeBrandAssets(brandRuntime),
    [brandRuntime]
  );

  useEffect(() => {
    if (!site?.slug) return undefined;

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

        if (!response.ok) return;

        const payload = await response.json();
        if (active) setBrandRuntimeState({ slug: site.slug, payload });
      } catch {
        // La preview reste utilisable sans runtime de marque distant.
      }
    }

    loadBrandRuntime();

    return () => {
      active = false;
    };
  }, [site?.slug]);

  useEffect(() => {
    if (!site?.slug) return undefined;

    let active = true;
    const controller = new AbortController();

    async function loadHours() {
      try {
        const response = await fetch(
          `/api/public-site-hours/${encodeURIComponent(site.slug)}`,
          {
            headers: {
              accept: "application/json",
              "x-tenant-slug": "mondescale",
            },
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) return;

        const payload = await response.json();

        if (active && payload?.hours) {
          setHoursState({ slug: site.slug, hours: payload.hours });
        }
      } catch (error) {
        if (error?.name !== "AbortError") {
          // Le reste de la preview ne dépend pas du service horaires.
        }
      }
    }

    loadHours();

    return () => {
      active = false;
      controller.abort();
    };
  }, [site?.slug]);

  if (!previewSite || !previewPage) {
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
      <PublicSiteHeader
        brand={brandRuntime?.runtime?.brand || null}
        brandRuntime={brandRuntime}
        brandAssets={brandAssets}
        site={previewSite}
        hours={hours}
      />

      <main>
        <PublicSiteSections
          page={previewPage}
          site={previewSite}
        />
      </main>

      <PublicSiteFooter site={previewSite} />
    </div>
  );
}

export {
  previewNavigation,
  toPublicPreviewPage,
};
