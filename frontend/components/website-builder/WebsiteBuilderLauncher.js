"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./WebsiteBuilderLauncher.module.css";

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
    <main className={styles.root}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Website Builder</p>
        <h1>Designer V2</h1>
        <p>
          Sélectionnez une agence pour ouvrir son mini-site dans le Designer V2,
          désormais source de vérité pour les pages et leurs blocs.
        </p>
      </section>

      <section className={styles.panel} aria-label="Mini-sites disponibles">
        <div className={styles.toolbar}>
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

        {loading ? <p className={styles.state}>Chargement des mini-sites…</p> : null}
        {error ? <p className={`${styles.state} ${styles.error}`}>{error}</p> : null}

        {!loading && !error ? (
          <div className={styles.grid}>
            {filteredSites.map((site) => (
              <article className={styles.card} key={site.id}>
                <div>
                  <p className={styles.city}>{site?.agency?.city || "Agence"}</p>
                  <h2>{site.name}</h2>
                  <div className={styles.badges}>
                    <span>{statusLabel(site)}</span>
                    <span>{homeState(site)}</span>
                  </div>
                </div>
                <Link className={styles.open} href={`/website-builder/editor/${encodeURIComponent(site.id)}`}>
                  Ouvrir le Designer V2
                </Link>
              </article>
            ))}
          </div>
        ) : null}

        {!loading && !error && filteredSites.length === 0 ? (
          <p className={styles.state}>Aucun mini-site ne correspond à cette recherche.</p>
        ) : null}
      </section>
    </main>
  );
}
