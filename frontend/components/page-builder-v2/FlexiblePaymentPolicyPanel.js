"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fetchFlexiblePaymentConfiguration,
  previewFlexiblePayment,
  saveFlexiblePaymentPolicy,
} from "../../lib/page-builder-v2/flexible-payment-api";

import styles from "./FlexiblePaymentPolicyPanel.module.css";

const EMPTY_POLICY = {
  enabled: false,
  products: [],
  installmentCounts: [],
  feeMode: "unspecified",
  disclaimer: "",
  ctaLabel: "Contacter mon agence",
};

function toggleValue(items, value, checked) {
  const values = Array.isArray(items) ? items : [];
  if (checked) return [...new Set([...values, value])];
  return values.filter((item) => item !== value);
}

function parseInstallments(value) {
  return [...new Set(
    String(value || "")
      .split(/[;,\s]+/)
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 2 && item <= 24)
  )].sort((a, b) => a - b);
}

export default function FlexiblePaymentPolicyPanel({ siteSlug }) {
  const [policy, setPolicy] = useState(EMPTY_POLICY);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!siteSlug) return;
      setLoading(true);
      setError("");
      try {
        const payload = await fetchFlexiblePaymentConfiguration(siteSlug);
        if (cancelled) return;
        setPolicy(payload?.policy || EMPTY_POLICY);
        setPreview(payload?.preview || null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || "Impossible de charger la configuration de paiement.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [siteSlug]);

  const installmentText = useMemo(
    () => (policy.installmentCounts || []).join(", "),
    [policy.installmentCounts]
  );

  async function runPreview() {
    setError("");
    setNotice("");
    try {
      const payload = await previewFlexiblePayment(siteSlug, policy);
      setPreview(payload.preview);
      setNotice("Aperçu recalculé sans écriture.");
    } catch (previewError) {
      setError(previewError?.message || "Impossible de calculer l’aperçu.");
    }
  }

  async function savePolicy() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = await saveFlexiblePaymentPolicy(siteSlug, policy);
      setPolicy(payload.policy || policy);
      setPreview(payload.preview || null);
      setNotice("Configuration de paiement enregistrée pour cette agence.");
    } catch (saveError) {
      setError(saveError?.message || "Impossible d’enregistrer la configuration.");
    } finally {
      setSaving(false);
    }
  }

  if (!siteSlug) return null;

  return (
    <section className={styles.panel} aria-label="Configuration du paiement en plusieurs fois">
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Service agence</span>
          <h3>Paiement en plusieurs fois</h3>
        </div>
        <label className={styles.switchLine}>
          <input
            type="checkbox"
            checked={policy.enabled === true}
            disabled={loading}
            onChange={(event) =>
              setPolicy((current) => ({ ...current, enabled: event.target.checked }))
            }
          />
          Activer
        </label>
      </div>

      <p className={styles.help}>
        Les mentions publiques restent prudentes : aucune échéance ni promesse « sans frais » n’est affichée sans configuration explicite.
      </p>

      <fieldset className={styles.fieldset} disabled={loading}>
        <legend>Produits concernés</legend>
        <label>
          <input
            type="checkbox"
            checked={policy.products?.includes("flight") || false}
            onChange={(event) =>
              setPolicy((current) => ({
                ...current,
                products: toggleValue(current.products, "flight", event.target.checked),
              }))
            }
          />
          Billetterie aérienne
        </label>
        <label>
          <input
            type="checkbox"
            checked={policy.products?.includes("travel") || false}
            onChange={(event) =>
              setPolicy((current) => ({
                ...current,
                products: toggleValue(current.products, "travel", event.target.checked),
              }))
            }
          />
          Voyages et séjours
        </label>
      </fieldset>

      <label className={styles.field}>
        <span>Échéances autorisées</span>
        <input
          type="text"
          value={installmentText}
          placeholder="Ex. 3, 4"
          disabled={loading}
          onChange={(event) =>
            setPolicy((current) => ({
              ...current,
              installmentCounts: parseInstallments(event.target.value),
            }))
          }
        />
        <small>Entiers de 2 à 24. Laisser vide pour parler uniquement de règlement échelonné.</small>
      </label>

      <label className={styles.field}>
        <span>Frais</span>
        <select
          value={policy.feeMode || "unspecified"}
          disabled={loading}
          onChange={(event) =>
            setPolicy((current) => ({ ...current, feeMode: event.target.value }))
          }
        >
          <option value="unspecified">Ne rien promettre</option>
          <option value="with-fees">Avec frais possibles</option>
          <option value="without-fees">Sans frais</option>
        </select>
      </label>

      <label className={styles.field}>
        <span>Disclaimer</span>
        <textarea
          rows={3}
          value={policy.disclaimer || ""}
          disabled={loading}
          onChange={(event) =>
            setPolicy((current) => ({ ...current, disclaimer: event.target.value }))
          }
        />
      </label>

      <label className={styles.field}>
        <span>Libellé du CTA</span>
        <input
          type="text"
          value={policy.ctaLabel || ""}
          disabled={loading}
          onChange={(event) =>
            setPolicy((current) => ({ ...current, ctaLabel: event.target.value }))
          }
        />
      </label>

      {preview ? (
        <div className={styles.preview}>
          <strong>Aperçu de déploiement</strong>
          <span>{preview.proposals?.length || 0} bloc(s) proposé(s)</span>
          <span>{preview.skipped?.length || 0} page(s) ignorée(s)</span>
          <code>{preview.fingerprint?.slice(0, 12) || "—"}</code>
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}

      <div className={styles.actions}>
        <button type="button" onClick={runPreview} disabled={loading || saving}>
          Prévisualiser
        </button>
        <button type="button" onClick={savePolicy} disabled={loading || saving}>
          {saving ? "Enregistrement…" : "Enregistrer la configuration"}
        </button>
      </div>
    </section>
  );
}

export { EMPTY_POLICY, parseInstallments, toggleValue };
