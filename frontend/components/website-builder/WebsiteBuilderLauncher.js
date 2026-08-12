"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function statusLabel(site) {
  if (site?.status === "published") return "Publié";
  if (site?.status === "draft") return "Brouillon";
  return site?.status || "Statut inconnu";
}

function homeState(site) {
  const pages = Array.isArray(site?.pages) ? site.pages : [];
  const home = pages.find((page) => page?.slug === "home") || pages.find((page) => page?.slug === "");
  if (!home) return "Accueil à créer";
  if (home.published || home.status === "published") return "Accueil publié";
  return "Accueil en brouillon";
}

export default function WebsiteBuilderLauncher() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSites() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/website-builder/sites", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            payload?.error?.debug?.message ||
              payload?.error?.message ||
              payload?.message ||
              "Impossible de charger les mini-sites."
          );
        }
        if (!active) return;
        setSites(Array.isArray(payload) ? payload : []);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSites();
    return () => {
      active = false;
    };
  }, []);

  const filteredSites = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sites;
    return sites.filter((site) => {
      const haystack = [site?.name, site?.slug, site?.agency?.name, site?.agency?.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, sites]);

  return (
    <main className="wb-launcher">
      <section className="wb-launcher-hero">
        <p className="wb-launcher-kicker">Website Builder</p>
        <h1>Designer V2</h1>
        <p>
          Sélectionnez une agence pour ouvrir son mini-site dans le Designer V2,
          désormais source de vérité pour les pages et leurs blocs.
        </p>
      </section>

      <section className="wb-launcher-panel" aria-label="Mini-sites disponibles">
        <div className="wb-launcher-toolbar">
          <div>
            <strong>{sites.length} mini-site{sites.length > 1 ? "s" : ""}</strong>
            <span> — choisissez l’agence à modifier</span>
          </div>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une agence ou une ville"
            aria-label="Rechercher une agence"
          />
        </div>

        {loading ? <p className="wb-launcher-state">Chargement des mini-sites…</p> : null}
        {error ? <p className="wb-launcher-state wb-launcher-error">{error}</p> : null}

        {!loading && !error ? (
          <div className="wb-launcher-grid">
            {filteredSites.map((site) => (
              <article className="wb-launcher-card" key={site.id}>
                <div className="wb-launcher-card-copy">
                  <p className="wb-launcher-city">{site?.agency?.city || "Agence"}</p>
                  <h2>{site.name}</h2>
                  <div className="wb-launcher-badges">
                    <span>{statusLabel(site)}</span>
                    <span>{homeState(site)}</span>
                  </div>
                </div>
                <Link className="wb-launcher-open" href={`/website-builder/editor/${encodeURIComponent(site.id)}`}>
                  Ouvrir le Designer V2
                </Link>
              </article>
            ))}
          </div>
        ) : null}

        {!loading && !error && filteredSites.length === 0 ? (
          <p className="wb-launcher-state">Aucun mini-site ne correspond à cette recherche.</p>
        ) : null}
      </section>
    </main>
  );
}
