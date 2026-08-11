"use client";

import { useEffect, useState } from "react";

const MODE_LABELS = {
  reinforce_existing: "Renforcer la page existante",
  enrich_existing: "Enrichir la page existante",
  consider_new_page: "Nouvelle page à valider",
  monitor: "Surveillance SEO",
};

export default function SeoDesignerContext({ pageSlug, keyword, mode }) {
  const [pageOpened, setPageOpened] = useState(false);

  useEffect(() => {
    if (!pageSlug || pageOpened) return undefined;

    const normalizedTarget = `/${String(pageSlug).replace(/^\/+|\/+$/g, "")}`;

    const openTargetPage = () => {
      const buttons = Array.from(document.querySelectorAll("nav button"));
      const target = buttons.find((button) => {
        const slug = button.querySelector("small")?.textContent?.trim();
        return slug === normalizedTarget;
      });

      if (!target) return false;

      target.click();
      setPageOpened(true);
      return true;
    };

    if (openTargetPage()) return undefined;

    const observer = new MutationObserver(() => {
      if (openTargetPage()) observer.disconnect();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const timeout = window.setTimeout(() => observer.disconnect(), 8000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [pageSlug, pageOpened]);

  if (!keyword && !pageSlug) return null;

  return (
    <aside
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 120,
        width: "min(390px, calc(100vw - 40px))",
        border: "1px solid #c7d2fe",
        borderRadius: 14,
        background: "#eef2ff",
        color: "#1e1b4b",
        padding: 16,
        boxShadow: "0 16px 40px rgba(30, 41, 59, .18)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", opacity: .65 }}>
        Contexte SEO local
      </div>
      <strong style={{ display: "block", marginTop: 6, fontSize: 16 }}>
        {keyword || "Opportunité éditoriale"}
      </strong>
      <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
        {MODE_LABELS[mode] || MODE_LABELS.monitor}
        {pageSlug ? ` · page cible /${pageSlug}` : " · page cible à valider"}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5, opacity: .75 }}>
        Le Designer reste en mode édition : aucune publication automatique n’est déclenchée par cette recommandation.
      </div>
    </aside>
  );
}
