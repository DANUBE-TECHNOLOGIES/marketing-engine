"use client";

import { useMemo, useState } from "react";
import styles from "./MediaPicker.module.css";

export default function MediaPicker({
  assets = [],
  selectedAssetId = "",
  loading = false,
  onSelect,
  onClear,
}) {
  const [search, setSearch] = useState("");

  const selected = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || null,
    [assets, selectedAssetId]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return assets;

    return assets.filter((asset) =>
      [asset.title, asset.slug, asset.altText]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [assets, search]);

  return (
    <section className={styles.picker}>
      <div className={styles.heading}>
        <div>
          <strong>Image de la médiathèque</strong>
          <small>Asset Engine · MEDIA_IMAGE publié</small>
        </div>

        {selectedAssetId ? (
          <button type="button" onClick={onClear} className={styles.clearButton}>
            Supprimer
          </button>
        ) : null}
      </div>

      {selected ? (
        <figure className={styles.selectedPreview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selected.url} alt={selected.altText || selected.title} />
          <figcaption>
            <strong>{selected.title}</strong>
            <span>{selected.altText || "Sans texte alternatif"}</span>
          </figcaption>
        </figure>
      ) : selectedAssetId ? (
        <div className={styles.missingSelection}>
          Le média sélectionné n’est plus disponible dans la bibliothèque publiée.
        </div>
      ) : null}

      <input
        className={styles.search}
        type="search"
        value={search}
        placeholder="Rechercher une image…"
        onChange={(event) => setSearch(event.target.value)}
      />

      {loading ? (
        <div className={styles.state}>Chargement de la médiathèque…</div>
      ) : filtered.length ? (
        <div className={styles.grid}>
          {filtered.map((asset) => {
            const active = asset.id === selectedAssetId;

            return (
              <button
                type="button"
                key={asset.id}
                className={active ? styles.activeCard : styles.card}
                onClick={() => onSelect(asset)}
                title={asset.altText || asset.title}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt={asset.altText || asset.title} loading="lazy" />
                <span>{asset.title}</span>
                {active ? <i>Sélectionnée</i> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className={styles.state}>Aucune image publiée disponible.</div>
      )}
    </section>
  );
}
