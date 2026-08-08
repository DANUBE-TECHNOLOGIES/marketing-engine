"use client";

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  BRAND_ASSET_KIND_LABELS,
  deleteBrandAsset,
  fetchBrandAssets,
} from "../../lib/brand-studio/index.js";

export function AssetLibrary({
  tenantId,
  tenantSlug,
  agencyId,
  kind,
  baseUrl = "",
  selectedId,
  onSelect,
  refreshKey,
}) {
  const [
    assets,
    setAssets,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const result =
            await fetchBrandAssets({
              tenantId,
              tenantSlug,
              agencyId,
              kind,
              baseUrl,
            });

          setAssets(
            result.assets ||
            []
          );
        } catch (loadError) {
          setError(
            loadError.message
          );
        } finally {
          setLoading(false);
        }
      },
      [
        tenantId,
        tenantSlug,
        agencyId,
        kind,
        baseUrl,
      ]
    );

  useEffect(
    () => {
      load();
    },
    [
      load,
      refreshKey,
    ]
  );

  async function remove(
    asset
  ) {
    const confirmed =
      window.confirm(
        `Supprimer définitivement « ${asset.originalName} » ?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteBrandAsset({
        tenantId,
        tenantSlug,
        assetId:
          asset.id,
        baseUrl,
      });

      await load();
    } catch (deleteError) {
      setError(
        deleteError.message
      );
    }
  }

  if (loading) {
    return (
      <p>
        Chargement de la médiathèque…
      </p>
    );
  }

  return (
    <section className="brand-studio-asset-library">
      <h3>
        {BRAND_ASSET_KIND_LABELS[
          kind
        ] || "Médiathèque"}
      </h3>

      {error ? (
        <p role="alert">
          {error}
        </p>
      ) : null}

      {!assets.length ? (
        <p>
          Aucun média disponible.
        </p>
      ) : (
        <div className="brand-studio-asset-grid">
          {assets.map(
            (asset) => (
              <article
                key={
                  asset.id
                }
                data-selected={
                  selectedId ===
                  asset.id
                }
              >
                {asset.mimeType?.startsWith(
                  "image/"
                ) ? (
                  <img
                    src={
                      asset.publicUrl
                    }
                    alt={
                      asset.altText ||
                      asset.originalName
                    }
                    loading="lazy"
                  />
                ) : (
                  <div>
                    Document
                  </div>
                )}

                <p>
                  {asset.originalName}
                </p>

                <div>
                  <button
                    type="button"
                    onClick={
                      () =>
                        onSelect?.(
                          asset
                        )
                    }
                  >
                    {selectedId ===
                    asset.id
                      ? "Sélectionné"
                      : "Utiliser"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      () =>
                        remove(
                          asset
                        )
                    }
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            )
          )}
        </div>
      )}
    </section>
  );
}
