"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

function partnerStateLabel(state) {
  if (state === "published") return "Partenaires publiée";
  if (state === "missing") return "Partenaires à créer";
  if (state === "review") return "Partenaires en révision";
  if (state === "draft") return "Partenaires en brouillon";
  return state ? `Partenaires : ${state}` : "Partenaires : état inconnu";
}

async function readJson(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      payload?.error?.debug?.message ||
        payload?.error?.message ||
        payload?.message ||
        "Une erreur est survenue."
    );
  }
  return payload;
}

export default function WebsiteBuilderLauncher() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [partnerRollout, setPartnerRollout] = useState(null);
  const [partnerLoading, setPartnerLoading] = useState(true);
  const [partnerApplying, setPartnerApplying] = useState(false);
  const [partnerNotice, setPartnerNotice] = useState("");

  const loadPartnerRollout = useCallback(async () => {
    setPartnerLoading(true);
    try {
      const response = await fetch("/api/website-builder/partners/rollout", { cache: "no-store" });
      const payload = await readJson(response);
      setPartnerRollout(payload);
    } catch (rolloutError) {
      setError((current) => current || rolloutError.message);
    } finally {
      setPartnerLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSites() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/website-builder/sites", { cache: "no-store" });
        const payload = await readJson(response);
        if (!active) return;
        setSites(Array.isArray(payload) ? payload : []);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSites();
    loadPartnerRollout();
    return () => {
      active = false;
    };
  }, [loadPartnerRollout]);

  const partnerStateBySiteId = useMemo(
    () => new Map((partnerRollout?.sites || []).map((row) => [String(row.siteId), row.partnerPageState])),
    [partnerRollout]
  );

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

  const applyPartnerRollout = useCallback(async () => {
    if (partnerApplying || !partnerRollout?.summary?.missing) return;
    setPartnerApplying(true);
    setPartnerNotice("");
    setError(null);
    try {
      const response = await fetch("/api/website-builder/partners/rollout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      });
      const result = await readJson(response);
      const created = Number(result?.createdSiteCount || 0);
      setPartnerNotice(
        created
          ? `${created} mini-site${created > 1 ? "s" : ""} équipé${created > 1 ? "s" : ""} d’une page Partenaires en brouillon. Aucune page n’a été publiée automatiquement.`
          : "Aucune page Partenaires manquante : aucun changement appliqué."
      );
      await loadPartnerRollout();
      const sitesResponse = await fetch("/api/website-builder/sites", { cache: "no-store" });
      const sitesPayload = await readJson(sitesResponse);
      setSites(Array.isArray(sitesPayload) ? sitesPayload : []);
    } catch (rolloutError) {
      setError(rolloutError.message);
    } finally {
      setPartnerApplying(false);
    }
  }, [loadPartnerRollout, partnerApplying, partnerRollout]);

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

      <section className={`${styles.panel} ${styles.partnerRollout}`} aria-label="Déploiement de la page Partenaires">
        <div className={styles.rolloutHeading}>
          <div>
            <p className={styles.kicker}>Page Partenaires</p>
            <h2>Déploiement réseau</h2>
            <p>
              Crée uniquement les pages <strong>/partenaires</strong> absentes en brouillon.
              Les pages existantes restent intactes et aucune publication n’est automatique.
            </p>
          </div>
          <button
            type="button"
            className={styles.rolloutButton}
            disabled={partnerLoading || partnerApplying || !partnerRollout?.summary?.missing}
            onClick={applyPartnerRollout}
          >
            {partnerApplying
              ? "Création des brouillons…"
              : partnerRollout?.summary?.missing
                ? `Créer ${partnerRollout.summary.missing} page${partnerRollout.summary.missing > 1 ? "s" : ""} manquante${partnerRollout.summary.missing > 1 ? "s" : ""}`
                : "Réseau déjà équipé"}
          </button>
        </div>

        {partnerLoading ? (
          <p className={styles.rolloutState}>Audit des pages Partenaires…</p>
        ) : partnerRollout?.summary ? (
          <div className={styles.rolloutStats}>
            <span><strong>{partnerRollout.summary.totalSites}</strong> mini-sites</span>
            <span><strong>{partnerRollout.summary.published}</strong> publiées</span>
            <span><strong>{partnerRollout.summary.draftOrReview}</strong> en brouillon/révision</span>
            <span data-alert={partnerRollout.summary.missing > 0 ? "true" : "false"}><strong>{partnerRollout.summary.missing}</strong> manquantes</span>
          </div>
        ) : null}

        {partnerNotice ? <p className={styles.rolloutNotice}>{partnerNotice}</p> : null}
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
            {filteredSites.map((site) => {
              const partnerState = partnerStateBySiteId.get(String(site.id));
              return (
                <article className={styles.card} key={site.id}>
                  <div>
                    <p className={styles.city}>{site?.agency?.city || "Agence"}</p>
                    <h2>{site.name}</h2>
                    <div className={styles.badges}>
                      <span>{statusLabel(site)}</span>
                      <span>{homeState(site)}</span>
                      <span data-partner-state={partnerState || "unknown"}>{partnerStateLabel(partnerState)}</span>
                    </div>
                  </div>
                  <Link className={styles.open} href={`/website-builder/editor/${encodeURIComponent(site.id)}`}>
                    Ouvrir le Designer V2
                  </Link>
                </article>
              );
            })}
          </div>
        ) : null}

        {!loading && !error && filteredSites.length === 0 ? (
          <p className={styles.state}>Aucun mini-site ne correspond à cette recherche.</p>
        ) : null}
      </section>
    </main>
  );
}