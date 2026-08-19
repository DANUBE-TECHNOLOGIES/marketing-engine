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

function partnerStateLabel(state, rolloutEligible = true, ready = false) {
  if (state === "published") return ready ? "Partenaires publiée — prête" : "Partenaires publiée — à corriger";
  if (state === "missing" && rolloutEligible === false) return "Partenaires bloquée : page agence absente";
  if (state === "missing") return "Partenaires à créer";
  if (state === "review") return ready ? "Partenaires en révision — prête" : "Partenaires en révision — à corriger";
  if (state === "draft") return ready ? "Partenaires en brouillon — prête à publier" : "Partenaires en brouillon — à corriger";
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

  const partnerRowBySiteId = useMemo(
    () => new Map((partnerRollout?.sites || []).map((row) => [String(row.siteId), row])),
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

  const eligibleMissing = Number(partnerRollout?.summary?.eligibleMissing || 0);
  const blockedMissing = Number(partnerRollout?.summary?.blockedMissing || 0);
  const publishedReady = Number(partnerRollout?.summary?.publishedReady || 0);
  const publishedNotReady = Number(partnerRollout?.summary?.publishedNotReady || 0);
  const draftOrReviewReady = Number(partnerRollout?.summary?.draftOrReviewReady || 0);

  const applyPartnerRollout = useCallback(async () => {
    if (partnerApplying || eligibleMissing <= 0) return;
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
      const blocked = Number(result?.blockedSiteCount || 0);
      setPartnerNotice(
        created
          ? `${created} mini-site${created > 1 ? "s" : ""} équipé${created > 1 ? "s" : ""} d’une page Partenaires en brouillon. Aucune page n’a été publiée automatiquement.${blocked ? ` ${blocked} mini-site${blocked > 1 ? "s" : ""} reste${blocked > 1 ? "nt" : ""} bloqué${blocked > 1 ? "s" : ""} car la page /agence est absente.` : ""}`
          : blocked
            ? `Aucune page créée. ${blocked} mini-site${blocked > 1 ? "s" : ""} reste${blocked > 1 ? "nt" : ""} bloqué${blocked > 1 ? "s" : ""} car la page /agence est absente.`
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
  }, [eligibleMissing, loadPartnerRollout, partnerApplying]);

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
            disabled={partnerLoading || partnerApplying || eligibleMissing <= 0}
            onClick={applyPartnerRollout}
          >
            {partnerApplying
              ? "Création des brouillons…"
              : eligibleMissing > 0
                ? `Créer ${eligibleMissing} page${eligibleMissing > 1 ? "s" : ""} éligible${eligibleMissing > 1 ? "s" : ""}`
                : blockedMissing > 0
                  ? "Rollout bloqué"
                  : "Réseau déjà équipé"}
          </button>
        </div>

        {partnerLoading ? (
          <p className={styles.rolloutState}>Audit des pages Partenaires…</p>
        ) : partnerRollout?.summary ? (
          <div className={styles.rolloutStats}>
            <span><strong>{partnerRollout.summary.totalSites}</strong> mini-sites</span>
            <span><strong>{partnerRollout.summary.published}</strong> publiées</span>
            <span><strong>{publishedReady}</strong> publiées prêtes</span>
            {publishedNotReady > 0 ? (
              <span data-alert="true"><strong>{publishedNotReady}</strong> publiées à corriger</span>
            ) : null}
            <span><strong>{partnerRollout.summary.draftOrReview}</strong> en brouillon/révision</span>
            <span><strong>{draftOrReviewReady}</strong> brouillons prêts</span>
            <span data-alert={eligibleMissing > 0 ? "true" : "false"}><strong>{eligibleMissing}</strong> éligibles à créer</span>
            {blockedMissing > 0 ? (
              <span data-alert="true"><strong>{blockedMissing}</strong> bloquées (/agence absente)</span>
            ) : null}
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
              const partnerRow = partnerRowBySiteId.get(String(site.id));
              const partnerState = partnerRow?.partnerPageState;
              const partnerReady = partnerRow?.partnerPageReady === true;
              return (
                <article className={styles.card} key={site.id}>
                  <div>
                    <p className={styles.city}>{site?.agency?.city || "Agence"}</p>
                    <h2>{site.name}</h2>
                    <div className={styles.badges}>
                      <span>{statusLabel(site)}</span>
                      <span>{homeState(site)}</span>
                      <span
                        data-partner-state={partnerState || "unknown"}
                        data-partner-ready={partnerReady ? "true" : "false"}
                      >
                        {partnerStateLabel(partnerState, partnerRow?.rolloutEligible, partnerReady)}
                      </span>
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
