"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  MEDIA_KINDS,
  deleteBrandAsset,
  fetchBrandAssets,
  fetchBrandProfile,
  normalizeAsset,
  saveBrandProfile,
  uploadBrandAsset,
} from "../../lib/brand-studio/media-api";

const FIELD_BY_KIND =
  Object.freeze(
    Object.fromEntries(
      MEDIA_KINDS.map(
        (item) => [
          item.value,
          item.profileField,
        ]
      )
    )
  );

function assetIdFromProfile({
  profile,
  definition,
}) {
  return (
    profile?.[
      definition.profileField
    ] ||
    profile?.[
      definition.profileField
        .replace(
          /Id$/,
          ""
        )
    ]?.id ||
    null
  );
}

function AssetPreview({
  asset,
  label,
}) {
  if (!asset?.publicUrl) {
    return (
      <div className="brand-media-empty">
        Aucun média sélectionné
      </div>
    );
  }

  return (
    <figure className="brand-media-preview">
      <img
        src={
          asset.publicUrl
        }
        alt={
          asset.altText ||
          label
        }
        loading="lazy"
      />

      <figcaption>
        <strong>
          {asset.originalName ||
            asset.title ||
            label}
        </strong>

        {asset.width &&
        asset.height ? (
          <span>
            {asset.width}
            ×
            {asset.height}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

function MediaCard({
  asset,
  selected,
  onSelect,
  onDelete,
  disabled,
}) {
  return (
    <article
      className={
        selected
          ? "brand-media-card brand-media-card--selected"
          : "brand-media-card"
      }
    >
      <button
        type="button"
        className="brand-media-card__select"
        onClick={
          () =>
            onSelect(
              asset
            )
        }
        disabled={
          disabled
        }
      >
        <img
          src={
            asset.publicUrl
          }
          alt={
            asset.altText ||
            asset.originalName ||
            "Média de marque"
          }
          loading="lazy"
        />

        <span>
          {asset.originalName ||
            asset.title ||
            asset.kind}
        </span>
      </button>

      <button
        type="button"
        className="brand-media-card__delete"
        onClick={
          () =>
            onDelete(
              asset
            )
        }
        disabled={
          disabled ||
          selected
        }
        title={
          selected
            ? "Ce média est actuellement utilisé."
            : "Supprimer ce média"
        }
      >
        Supprimer
      </button>
    </article>
  );
}

export default function BrandMediaManager({
  initialAgencyId = 6,
}) {
  const [
    agencyId,
    setAgencyId,
  ] =
    useState(
      initialAgencyId
    );

  const [
    selectedKind,
    setSelectedKind,
  ] =
    useState(
      MEDIA_KINDS[0].value
    );

  const [
    profile,
    setProfile,
  ] =
    useState({});

  const [
    assets,
    setAssets,
  ] =
    useState([]);

  const [
    uploadFile,
    setUploadFile,
  ] =
    useState(null);

  const [
    altText,
    setAltText,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState(null);

  const definition =
    useMemo(
      () =>
        MEDIA_KINDS.find(
          (item) =>
            item.value ===
            selectedKind
        ) ||
        MEDIA_KINDS[0],
      [
        selectedKind,
      ]
    );

  const normalizedAssets =
    useMemo(
      () =>
        assets
          .map(
            normalizeAsset
          )
          .filter(
            (asset) =>
              asset?.id &&
              asset?.publicUrl
          ),
      [
        assets,
      ]
    );

  const selectedAssetId =
    assetIdFromProfile({
      profile,
      definition,
    });

  const selectedAsset =
    normalizedAssets.find(
      (asset) =>
        String(asset.id) ===
        String(
          selectedAssetId
        )
    ) ||
    normalizeAsset(
      profile?.[
        definition.profileField
          .replace(
            /Id$/,
            ""
          )
      ]
    ) ||
    null;

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setMessage(null);

        try {
          const [
            profilePayload,
            assetPayload,
          ] =
            await Promise.all([
              fetchBrandProfile(
                agencyId
              ),

              fetchBrandAssets({
                agencyId,
              }),
            ]);

          setProfile(
            profilePayload?.profile ||
            profilePayload?.data ||
            profilePayload ||
            {}
          );

          setAssets(
            Array.isArray(
              assetPayload
            )
              ? assetPayload
              : []
          );
        } catch (error) {
          setMessage({
            type:
              "error",

            text:
              error.message,
          });
        } finally {
          setLoading(false);
        }
      },
      [
        agencyId,
      ]
    );

  useEffect(
    () => {
      load();
    },
    [
      load,
    ]
  );

  async function selectAsset(
    asset
  ) {
    const field =
      FIELD_BY_KIND[
        selectedKind
      ];

    const nextProfile = {
      ...profile,

      [field]:
        asset.id,
    };

    setProfile(
      nextProfile
    );

    setSaving(true);
    setMessage(null);

    try {
      const saved =
        await saveBrandProfile({
          agencyId,

          profile:
            nextProfile,
        });

      setProfile(
        saved?.profile ||
        saved?.data ||
        saved ||
        nextProfile
      );

      setMessage({
        type:
          "success",

        text:
          `${definition.label} enregistré.`,
      });
    } catch (error) {
      setMessage({
        type:
          "error",

        text:
          error.message,
      });

      await load();
    } finally {
      setSaving(false);
    }
  }

  async function upload() {
    if (!uploadFile) {
      setMessage({
        type:
          "error",

        text:
          "Sélectionnez un fichier avant l’envoi.",
      });

      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const uploaded =
        await uploadBrandAsset({
          agencyId,

          kind:
            selectedKind,

          file:
            uploadFile,

          altText,
        });

      const asset =
        normalizeAsset(
          uploaded?.asset ||
          uploaded?.data ||
          uploaded
        );

      setUploadFile(
        null
      );

      setAltText("");

      await load();

      if (asset?.id) {
        await selectAsset(
          asset
        );
      } else {
        setMessage({
          type:
            "success",

          text:
            "Média déposé. Sélectionnez-le dans la médiathèque.",
        });
      }
    } catch (error) {
      setMessage({
        type:
          "error",

        text:
          error.message,
      });
    } finally {
      setUploading(false);
    }
  }

  async function remove(
    asset
  ) {
    const confirmed =
      window.confirm(
        `Supprimer définitivement « ${
          asset.originalName ||
          asset.title ||
          asset.kind
        } » ?`
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await deleteBrandAsset(
        asset.id
      );

      await load();

      setMessage({
        type:
          "success",

        text:
          "Média supprimé.",
      });
    } catch (error) {
      setMessage({
        type:
          "error",

        text:
          error.message,
      });
    } finally {
      setSaving(false);
    }
  }

  const filteredAssets =
    normalizedAssets.filter(
      (asset) =>
        asset.kind ===
          selectedKind ||
        !asset.kind
    );

  return (
    <main className="brand-media-manager">
      <header className="brand-media-manager__header">
        <div>
          <p className="brand-media-manager__eyebrow">
            Brand Studio
          </p>

          <h1>
            Identité visuelle et médias
          </h1>

          <p>
            Déposez vos logos et visuels sans saisir d’URL.
            Les médias sélectionnés seront utilisés automatiquement
            par les mini-sites publics.
          </p>
        </div>

        <label className="brand-media-manager__agency">
          <span>
            Agence
          </span>

          <input
            type="number"
            min="1"
            value={
              agencyId
            }
            onChange={
              (event) =>
                setAgencyId(
                  Number(
                    event.target.value
                  )
                )
            }
          />
        </label>
      </header>

      <nav
        className="brand-media-tabs"
        aria-label="Types de médias"
      >
        {MEDIA_KINDS.map(
          (item) => (
            <button
              key={
                item.value
              }
              type="button"
              className={
                selectedKind ===
                item.value
                  ? "brand-media-tab brand-media-tab--active"
                  : "brand-media-tab"
              }
              onClick={
                () =>
                  setSelectedKind(
                    item.value
                  )
              }
            >
              {item.label}
            </button>
          )
        )}
      </nav>

      {message ? (
        <div
          className={
            message.type ===
            "error"
              ? "brand-media-message brand-media-message--error"
              : "brand-media-message brand-media-message--success"
          }
          role="status"
        >
          {message.text}
        </div>
      ) : null}

      <section className="brand-media-grid">
        <div className="brand-media-panel">
          <h2>
            {definition.label}
          </h2>

          <AssetPreview
            asset={
              selectedAsset
            }
            label={
              definition.label
            }
          />

          <div className="brand-media-upload">
            <label>
              <span>
                Fichier image
              </span>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                onChange={
                  (event) =>
                    setUploadFile(
                      event.target
                        .files?.[0] ||
                      null
                    )
                }
              />
            </label>

            <label>
              <span>
                Texte alternatif
              </span>

              <input
                type="text"
                value={
                  altText
                }
                maxLength="180"
                onChange={
                  (event) =>
                    setAltText(
                      event.target.value
                    )
                }
                placeholder={`Ex. ${definition.label} Mondescale`}
              />
            </label>

            <button
              type="button"
              onClick={
                upload
              }
              disabled={
                uploading ||
                saving ||
                !uploadFile
              }
            >
              {uploading
                ? "Envoi en cours…"
                : "Déposer et utiliser"}
            </button>
          </div>
        </div>

        <div className="brand-media-panel">
          <div className="brand-media-panel__title">
            <h2>
              Médiathèque
            </h2>

            <button
              type="button"
              onClick={
                load
              }
              disabled={
                loading
              }
            >
              Actualiser
            </button>
          </div>

          {loading ? (
            <p>
              Chargement des médias…
            </p>
          ) : filteredAssets.length ? (
            <div className="brand-media-library">
              {filteredAssets.map(
                (asset) => (
                  <MediaCard
                    key={
                      asset.id
                    }
                    asset={
                      asset
                    }
                    selected={
                      String(
                        selectedAssetId
                      ) ===
                      String(
                        asset.id
                      )
                    }
                    onSelect={
                      selectAsset
                    }
                    onDelete={
                      remove
                    }
                    disabled={
                      saving ||
                      uploading
                    }
                  />
                )
              )}
            </div>
          ) : (
            <div className="brand-media-empty">
              Aucun média de ce type n’a encore été déposé.
            </div>
          )}
        </div>
      </section>

      <style jsx>{`
        .brand-media-manager {
          min-height: 100vh;
          padding: 32px;
          background: #f5f6f8;
          color: #16181d;
        }

        .brand-media-manager__header {
          display: flex;
          justify-content: space-between;
          gap: 32px;
          align-items: flex-start;
          max-width: 1400px;
          margin: 0 auto 28px;
        }

        .brand-media-manager__eyebrow {
          margin: 0 0 8px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #5d6470;
        }

        h1 {
          margin: 0 0 12px;
          font-size: clamp(28px, 4vw, 44px);
        }

        .brand-media-manager__header p {
          max-width: 760px;
          line-height: 1.6;
        }

        .brand-media-manager__agency {
          display: grid;
          gap: 8px;
          min-width: 160px;
          font-weight: 600;
        }

        .brand-media-manager__agency input,
        .brand-media-upload input {
          width: 100%;
          box-sizing: border-box;
          padding: 11px 12px;
          border: 1px solid #cfd3da;
          border-radius: 8px;
          background: #fff;
        }

        .brand-media-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          max-width: 1400px;
          margin: 0 auto 24px;
        }

        .brand-media-tab,
        button {
          border: 0;
          border-radius: 8px;
          padding: 10px 15px;
          font-weight: 650;
          cursor: pointer;
        }

        .brand-media-tab {
          background: #e5e8ed;
        }

        .brand-media-tab--active {
          background: #17191f;
          color: #fff;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .brand-media-message {
          max-width: 1400px;
          margin: 0 auto 20px;
          padding: 13px 16px;
          border-radius: 8px;
        }

        .brand-media-message--success {
          background: #e7f6ec;
          color: #155d2d;
        }

        .brand-media-message--error {
          background: #fdeaea;
          color: #8c1f1f;
        }

        .brand-media-grid {
          display: grid;
          grid-template-columns: minmax(320px, 0.85fr) minmax(420px, 1.6fr);
          gap: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .brand-media-panel {
          padding: 24px;
          border: 1px solid #e1e4e9;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 10px 35px rgb(17 24 39 / 0.06);
        }

        .brand-media-panel h2 {
          margin-top: 0;
        }

        .brand-media-panel__title {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
        }

        .brand-media-preview {
          display: grid;
          gap: 12px;
          margin: 0 0 24px;
        }

        .brand-media-preview img {
          width: 100%;
          max-height: 280px;
          object-fit: contain;
          border-radius: 10px;
          background: #f4f5f7;
        }

        .brand-media-preview figcaption {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
          color: #606774;
        }

        .brand-media-upload {
          display: grid;
          gap: 16px;
        }

        .brand-media-upload label {
          display: grid;
          gap: 7px;
          font-weight: 600;
        }

        .brand-media-upload button {
          background: #17191f;
          color: #fff;
        }

        .brand-media-library {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }

        .brand-media-card {
          overflow: hidden;
          border: 2px solid transparent;
          border-radius: 10px;
          background: #f7f8fa;
        }

        .brand-media-card--selected {
          border-color: #17191f;
        }

        .brand-media-card__select {
          display: grid;
          width: 100%;
          padding: 0;
          overflow: hidden;
          border-radius: 0;
          background: transparent;
          text-align: left;
        }

        .brand-media-card__select img {
          width: 100%;
          height: 135px;
          object-fit: contain;
          background: #fff;
        }

        .brand-media-card__select span {
          padding: 10px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .brand-media-card__delete {
          width: 100%;
          border-radius: 0;
          background: #eceff3;
          color: #741d1d;
          font-size: 12px;
        }

        .brand-media-empty {
          display: grid;
          min-height: 140px;
          place-items: center;
          padding: 20px;
          border: 1px dashed #cbd0d8;
          border-radius: 10px;
          color: #69717e;
          text-align: center;
        }

        @media (max-width: 900px) {
          .brand-media-manager {
            padding: 20px;
          }

          .brand-media-manager__header {
            display: grid;
          }

          .brand-media-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
