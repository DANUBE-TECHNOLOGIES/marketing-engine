"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_IDENTITY,
  FONT_OPTIONS,
  fetchBrandIdentity,
  saveBrandIdentity,
  validateBrandIdentity,
} from "../../lib/brand-studio/identity-api";

const COLOR_FIELDS = Object.freeze([
  {
    name:
      "primaryColor",

    label:
      "Couleur principale",

    description:
      "Navigation, titres majeurs et éléments structurants.",
  },

  {
    name:
      "secondaryColor",

    label:
      "Couleur secondaire",

    description:
      "Éléments complémentaires et surfaces secondaires.",
  },

  {
    name:
      "accentColor",

    label:
      "Couleur d’accent",

    description:
      "Boutons, liens et éléments de conversion.",
  },

  {
    name:
      "backgroundColor",

    label:
      "Arrière-plan",

    description:
      "Couleur générale des pages publiques.",
  },

  {
    name:
      "textColor",

    label:
      "Couleur du texte",

    description:
      "Paragraphes et contenus éditoriaux.",
  },
]);

function ColorField({
  definition,
  value,
  error,
  onChange,
}) {
  return (
    <label className="brand-color-field">
      <div>
        <strong>
          {definition.label}
        </strong>

        <span>
          {definition.description}
        </span>
      </div>

      <div className="brand-color-field__controls">
        <input
          type="color"
          name={
            definition.name
          }
          value={
            value
          }
          onChange={
            onChange
          }
          aria-label={
            definition.label
          }
        />

        <input
          type="text"
          name={
            definition.name
          }
          value={
            value
          }
          maxLength="7"
          onChange={
            onChange
          }
        />
      </div>

      {error ? (
        <small>
          {error}
        </small>
      ) : null}
    </label>
  );
}

function BrandPreview({
  identity,
  agency,
  agencyId,
}) {
  const style = {
    "--preview-primary":
      identity.primaryColor,

    "--preview-secondary":
      identity.secondaryColor,

    "--preview-accent":
      identity.accentColor,

    "--preview-background":
      identity.backgroundColor,

    "--preview-text":
      identity.textColor,

    "--preview-heading-font":
      identity.headingFont,

    "--preview-body-font":
      identity.bodyFont,
  };

  return (
    <article
      className="brand-identity-preview"
      style={
        style
      }
    >
      <header>
        <span className="brand-identity-preview__logo">
          {agency?.name ||
            `Agence #${agencyId}`}
        </span>

        <nav>
          <span>
            Accueil
          </span>

          <span>
            Destinations
          </span>

          <span>
            Contact
          </span>
        </nav>
      </header>

      <section>
        <p className="brand-identity-preview__eyebrow">
          Votre agence de voyages
        </p>

        <h2>
          Imaginons ensemble votre prochain voyage
        </h2>

        <p>
          Un exemple d’application des couleurs et typographies
          sélectionnées dans le Brand Studio.
        </p>

        <div className="brand-identity-preview__actions">
          <button type="button">
            Demander un devis
          </button>

          <a href="#preview">
            Découvrir l’agence
          </a>
        </div>
      </section>

      <footer>
        <strong>
          Conseil personnalisé
        </strong>

        <span>
          Une identité cohérente sur toutes les pages.
        </span>
      </footer>
    </article>
  );
}

export default function BrandIdentityManager({
  initialAgencyId = 6,
  agency = null,
}) {
  const [
    profile,
    setProfile,
  ] =
    useState({});

  const [
    identity,
    setIdentity,
  ] =
    useState(
      DEFAULT_IDENTITY
    );

  const [
    initialIdentity,
    setInitialIdentity,
  ] =
    useState(
      DEFAULT_IDENTITY
    );

  const [
    errors,
    setErrors,
  ] =
    useState({});

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
    message,
    setMessage,
  ] =
    useState(null);

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setMessage(null);

        try {
          const result =
            await fetchBrandIdentity(
              initialAgencyId
            );

          setProfile(
            result
          );

          const normalized = {
            primaryColor:
              result.primaryColor,

            secondaryColor:
              result.secondaryColor,

            accentColor:
              result.accentColor,

            backgroundColor:
              result.backgroundColor,

            textColor:
              result.textColor,

            headingFont:
              result.headingFont,

            bodyFont:
              result.bodyFont,
          };

          setIdentity(
            normalized
          );

          setInitialIdentity(
            normalized
          );

          setErrors({});
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
        initialAgencyId,
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

  const modified =
    useMemo(
      () =>
        JSON.stringify(
          identity
        ) !==
        JSON.stringify(
          initialIdentity
        ),
      [
        identity,
        initialIdentity,
      ]
    );

  function updateField(
    event
  ) {
    const {
      name,
      value,
    } =
      event.target;

    setIdentity(
      (current) => ({
        ...current,

        [name]:
          value,
      })
    );

    setErrors(
      (current) => ({
        ...current,

        [name]:
          undefined,
      })
    );
  }

  function reset() {
    setIdentity(
      initialIdentity
    );

    setErrors({});

    setMessage({
      type:
        "success",

      text:
        "Les modifications non enregistrées ont été annulées.",
    });
  }

  async function save() {
    const validation =
      validateBrandIdentity(
        identity
      );

    setErrors(
      validation
    );

    if (
      Object.keys(
        validation
      ).length
    ) {
      setMessage({
        type:
          "error",

        text:
          "Certaines valeurs doivent être corrigées.",
      });

      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const saved =
        await saveBrandIdentity({
          agencyId:
            initialAgencyId,

          profile,

          identity,
        });

      setProfile(
        saved
      );

      const normalized = {
        primaryColor:
          saved.primaryColor,

        secondaryColor:
          saved.secondaryColor,

        accentColor:
          saved.accentColor,

        backgroundColor:
          saved.backgroundColor,

        textColor:
          saved.textColor,

        headingFont:
          saved.headingFont,

        bodyFont:
          saved.bodyFont,
      };

      setIdentity(
        normalized
      );

      setInitialIdentity(
        normalized
      );

      setMessage({
        type:
          "success",

        text:
          "Identité visuelle enregistrée.",
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

  if (loading) {
    return (
      <div className="brand-identity-loading">
        Chargement de l’identité visuelle…
      </div>
    );
  }

  return (
    <section className="brand-identity-manager">
      <header className="brand-identity-manager__header">
        <div>
          <p>
            Identité visuelle
          </p>

          <h2>
            Couleurs et typographies
          </h2>

          <span>
            Ces paramètres sont appliqués automatiquement au
            mini-site public de l’agence sélectionnée.
          </span>
        </div>

        <div
          className={
            modified
              ? "brand-identity-manager__status brand-identity-manager__status--modified"
              : "brand-identity-manager__status"
          }
        >
          {modified
            ? "Modifications non enregistrées"
            : "Profil à jour"}
        </div>
      </header>

      {message ? (
        <div
          className={
            message.type ===
            "error"
              ? "brand-identity-message brand-identity-message--error"
              : "brand-identity-message brand-identity-message--success"
          }
          role="status"
        >
          {message.text}
        </div>
      ) : null}

      <div className="brand-identity-manager__layout">
        <div className="brand-identity-panel">
          <h3>
            Palette
          </h3>

          <div className="brand-color-list">
            {COLOR_FIELDS.map(
              (definition) => (
                <ColorField
                  key={
                    definition.name
                  }
                  definition={
                    definition
                  }
                  value={
                    identity[
                      definition.name
                    ]
                  }
                  error={
                    errors[
                      definition.name
                    ]
                  }
                  onChange={
                    updateField
                  }
                />
              )
            )}
          </div>

          <h3 className="brand-identity-panel__fonts-title">
            Typographies
          </h3>

          <div className="brand-font-grid">
            <label>
              <span>
                Police des titres
              </span>

              <select
                name="headingFont"
                value={
                  identity.headingFont
                }
                onChange={
                  updateField
                }
              >
                {FONT_OPTIONS.map(
                  (font) => (
                    <option
                      key={
                        font
                      }
                      value={
                        font
                      }
                    >
                      {font}
                    </option>
                  )
                )}
              </select>

              {errors.headingFont ? (
                <small>
                  {errors.headingFont}
                </small>
              ) : null}
            </label>

            <label>
              <span>
                Police du texte
              </span>

              <select
                name="bodyFont"
                value={
                  identity.bodyFont
                }
                onChange={
                  updateField
                }
              >
                {FONT_OPTIONS.map(
                  (font) => (
                    <option
                      key={
                        font
                      }
                      value={
                        font
                      }
                    >
                      {font}
                    </option>
                  )
                )}
              </select>

              {errors.bodyFont ? (
                <small>
                  {errors.bodyFont}
                </small>
              ) : null}
            </label>
          </div>
        </div>

        <div className="brand-identity-panel">
          <div className="brand-identity-panel__preview-title">
            <div>
              <h3>
                Aperçu
              </h3>

              <p>
                Simulation d’une page publique.
              </p>
            </div>
          </div>

          <BrandPreview
            identity={
              identity
            }
            agency={
              agency
            }
            agencyId={
              initialAgencyId
            }
          />
        </div>
      </div>

      <footer className="brand-identity-actions">
        <button
          type="button"
          className="brand-identity-actions__secondary"
          onClick={
            reset
          }
          disabled={
            saving ||
            !modified
          }
        >
          Annuler
        </button>

        <button
          type="button"
          className="brand-identity-actions__primary"
          onClick={
            save
          }
          disabled={
            saving ||
            !modified
          }
        >
          {saving
            ? "Enregistrement…"
            : "Enregistrer l’identité visuelle"}
        </button>
      </footer>

      <style jsx>{`
        .brand-identity-manager {
          padding: 28px;
          border: 1px solid #dfe3e8;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 20px 50px rgb(20 25 35 / 0.06);
        }

        .brand-identity-loading {
          padding: 30px;
          border-radius: 14px;
          background: #fff;
        }

        .brand-identity-manager__header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 22px;
        }

        .brand-identity-manager__header p {
          margin: 0 0 7px;
          color: #69717f;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .brand-identity-manager__header h2 {
          margin: 0 0 10px;
          font-size: clamp(28px, 4vw, 42px);
        }

        .brand-identity-manager__header span {
          color: #5e6673;
          line-height: 1.55;
        }

        .brand-identity-manager__status {
          flex: none;
          align-self: flex-start;
          padding: 8px 11px;
          border-radius: 999px;
          background: #dff3e5;
          color: #175d2d;
          font-size: 12px;
          font-weight: 750;
        }

        .brand-identity-manager__status--modified {
          background: #fff0c7;
          color: #785900;
        }

        .brand-identity-message {
          margin-bottom: 20px;
          padding: 13px 15px;
          border-radius: 9px;
        }

        .brand-identity-message--success {
          background: #e5f5ea;
          color: #145b2b;
        }

        .brand-identity-message--error {
          background: #fde9e9;
          color: #8c1e1e;
        }

        .brand-identity-manager__layout {
          display: grid;
          grid-template-columns: minmax(360px, 0.8fr) minmax(480px, 1.2fr);
          gap: 22px;
        }

        .brand-identity-panel {
          padding: 23px;
          border: 1px solid #e0e4e9;
          border-radius: 14px;
          background: #f8f9fa;
        }

        .brand-identity-panel h3 {
          margin-top: 0;
        }

        .brand-color-list {
          display: grid;
          gap: 13px;
        }

        .brand-color-field {
          display: grid;
          grid-template-columns: minmax(180px, 1fr) 160px;
          gap: 15px;
          align-items: center;
          padding: 13px;
          border-radius: 10px;
          background: #fff;
        }

        .brand-color-field > div:first-child {
          display: grid;
          gap: 4px;
        }

        .brand-color-field span {
          color: #68707c;
          font-size: 12px;
          line-height: 1.4;
        }

        .brand-color-field__controls {
          display: grid;
          grid-template-columns: 48px 1fr;
          gap: 8px;
        }

        .brand-color-field input[type="color"] {
          width: 48px;
          height: 42px;
          padding: 3px;
          border: 1px solid #ccd1d8;
          border-radius: 8px;
          background: #fff;
        }

        .brand-color-field input[type="text"],
        select {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 11px;
          border: 1px solid #ccd1d8;
          border-radius: 8px;
          background: #fff;
          font: inherit;
        }

        .brand-color-field small,
        .brand-font-grid small {
          grid-column: 1 / -1;
          color: #a12626;
        }

        .brand-identity-panel__fonts-title {
          margin-top: 26px !important;
        }

        .brand-font-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 13px;
        }

        .brand-font-grid label {
          display: grid;
          gap: 7px;
          font-weight: 700;
        }

        .brand-identity-panel__preview-title p {
          margin-top: -5px;
          color: #68707c;
        }

        .brand-identity-preview {
          overflow: hidden;
          border: 1px solid #dce0e6;
          border-radius: 14px;
          background: var(--preview-background);
          color: var(--preview-text);
          font-family: var(--preview-body-font), sans-serif;
          box-shadow: 0 14px 40px rgb(20 25 35 / 0.09);
        }

        .brand-identity-preview > header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 20px;
          background: var(--preview-primary);
          color: #fff;
        }

        .brand-identity-preview__logo {
          font-family: var(--preview-heading-font), sans-serif;
          font-weight: 800;
        }

        .brand-identity-preview nav {
          display: flex;
          gap: 15px;
          font-size: 13px;
        }

        .brand-identity-preview > section {
          min-height: 330px;
          padding: 48px 36px;
          background:
            linear-gradient(
              120deg,
              color-mix(
                in srgb,
                var(--preview-secondary) 16%,
                var(--preview-background)
              ),
              var(--preview-background)
            );
        }

        .brand-identity-preview__eyebrow {
          color: var(--preview-secondary);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .brand-identity-preview h2 {
          max-width: 600px;
          margin: 13px 0;
          color: var(--preview-primary);
          font-family: var(--preview-heading-font), sans-serif;
          font-size: clamp(30px, 5vw, 52px);
          line-height: 1.05;
        }

        .brand-identity-preview > section > p {
          max-width: 570px;
          line-height: 1.6;
        }

        .brand-identity-preview__actions {
          display: flex;
          gap: 15px;
          align-items: center;
          margin-top: 28px;
        }

        .brand-identity-preview__actions button {
          padding: 11px 15px;
          border: 0;
          border-radius: 8px;
          background: var(--preview-accent);
          color: #111;
          font-weight: 800;
        }

        .brand-identity-preview__actions a {
          color: var(--preview-primary);
          font-weight: 750;
        }

        .brand-identity-preview > footer {
          display: grid;
          gap: 4px;
          padding: 17px 20px;
          background: var(--preview-secondary);
          color: #fff;
        }

        .brand-identity-preview > footer span {
          font-size: 13px;
          opacity: 0.85;
        }

        .brand-identity-actions {
          display: flex;
          justify-content: flex-end;
          gap: 11px;
          margin-top: 22px;
        }

        .brand-identity-actions button {
          padding: 11px 15px;
          border: 0;
          border-radius: 8px;
          font-weight: 750;
          cursor: pointer;
        }

        .brand-identity-actions button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .brand-identity-actions__secondary {
          background: #e5e8ed;
        }

        .brand-identity-actions__primary {
          background: #17191f;
          color: #fff;
        }

        @media (max-width: 1050px) {
          .brand-identity-manager__layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 680px) {
          .brand-identity-manager {
            padding: 20px;
          }

          .brand-identity-manager__header {
            display: grid;
          }

          .brand-color-field {
            grid-template-columns: 1fr;
          }

          .brand-font-grid {
            grid-template-columns: 1fr;
          }

          .brand-identity-preview > header {
            display: grid;
          }

          .brand-identity-preview nav {
            flex-wrap: wrap;
          }

          .brand-identity-preview > section {
            padding: 34px 23px;
          }
        }
      `}</style>
    </section>
  );
}
