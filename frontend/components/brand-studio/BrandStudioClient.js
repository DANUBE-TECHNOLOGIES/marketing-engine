"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

const DEFAULT_BRAND = {
  displayName: "Mondescale Voyages",
  logoUrl: "",
  logoDarkUrl: "",
  faviconUrl: "",
  domain: "",
  primaryColor: "#0B5FFF",
  secondaryColor: "#102A43",
  accentColor: "#FFB703",
  backgroundColor: "#FFFFFF",
  textColor: "#102A43",
  fontFamily: "Inter, Arial, sans-serif",
};

const FONT_OPTIONS = [
  "Inter, Arial, sans-serif",
  "Poppins, Arial, sans-serif",
  "Montserrat, Arial, sans-serif",
  "Playfair Display, Georgia, serif",
  "Georgia, serif",
];

export default function BrandStudioClient() {
  const [brand, setBrand] =
    useState(DEFAULT_BRAND);

  const [initialBrand, setInitialBrand] =
    useState(DEFAULT_BRAND);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [savedAt, setSavedAt] =
    useState(null);

  const isDirty = useMemo(
    () =>
      JSON.stringify(brand) !==
      JSON.stringify(initialBrand),
    [brand, initialBrand]
  );

  useEffect(() => {
    let active = true;

    async function loadBrand() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          "/api/brand-studio",
          {
            cache: "no-store",
          }
        );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error?.debug?.message ||
            payload?.error?.message ||
            "Impossible de charger la marque."
          );
        }

        if (!active) {
          return;
        }

        const normalized = {
          ...DEFAULT_BRAND,
          ...payload,
        };

        setBrand(normalized);
        setInitialBrand(normalized);
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadBrand();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function beforeUnload(event) {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener(
      "beforeunload",
      beforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        beforeUnload
      );
    };
  }, [isDirty]);

  function updateField(field, value) {
    setBrand((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveBrand() {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(
        "/api/brand-studio",
        {
          method: "PUT",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify(brand),
        }
      );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error?.debug?.message ||
          payload?.error?.message ||
          "Impossible d’enregistrer la marque."
        );
      }

      const normalized = {
        ...DEFAULT_BRAND,
        ...payload,
      };

      setBrand(normalized);
      setInitialBrand(normalized);

      setSavedAt(
        new Intl.DateTimeFormat(
          "fr-FR",
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }
        ).format(new Date())
      );
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  function resetChanges() {
    setBrand(initialBrand);
    setError(null);
  }

  if (loading) {
    return (
      <div className="bs-loading">
        Chargement du Brand Studio…
      </div>
    );
  }

  return (
    <div
      className="bs-shell"
      style={{
        "--bs-primary":
          brand.primaryColor,
        "--bs-secondary":
          brand.secondaryColor,
        "--bs-accent":
          brand.accentColor,
        "--bs-background":
          brand.backgroundColor,
        "--bs-text":
          brand.textColor,
        "--bs-font":
          brand.fontFamily,
      }}
    >
      <header className="bs-topbar">
        <div>
          <p className="bs-eyebrow">
            Mondescale Brand Engine
          </p>

          <h1>Brand Studio</h1>

          <p className="bs-intro">
            Identité globale utilisée par les
            mini-sites, templates et futures
            campagnes marketing.
          </p>
        </div>

        <div className="bs-topbar-actions">
          {isDirty ? (
            <span className="bs-dirty">
              Modifications non enregistrées
            </span>
          ) : savedAt ? (
            <span className="bs-saved">
              Enregistré à {savedAt}
            </span>
          ) : null}

          <button
            type="button"
            className="bs-button-secondary"
            disabled={!isDirty || saving}
            onClick={resetChanges}
          >
            Annuler
          </button>

          <button
            type="button"
            className="bs-button-primary"
            disabled={!isDirty || saving}
            onClick={saveBrand}
          >
            {saving
              ? "Enregistrement…"
              : "Enregistrer"}
          </button>
        </div>
      </header>

      {error ? (
        <div className="bs-error">
          {error}
        </div>
      ) : null}

      <main className="bs-workspace">
        <section className="bs-editor">
          <div className="bs-panel">
            <div className="bs-panel-heading">
              <div>
                <span>Identité</span>
                <small>
                  Nom, domaine et logos
                </small>
              </div>
            </div>

            <div className="bs-form-grid">
              <label className="bs-field-wide">
                Nom affiché
                <input
                  value={
                    brand.displayName || ""
                  }
                  onChange={(event) =>
                    updateField(
                      "displayName",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="bs-field-wide">
                Domaine principal
                <input
                  type="text"
                  placeholder="mondescale.com"
                  value={brand.domain || ""}
                  onChange={(event) =>
                    updateField(
                      "domain",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="bs-field-wide">
                URL du logo principal
                <input
                  type="url"
                  placeholder="https://..."
                  value={brand.logoUrl || ""}
                  onChange={(event) =>
                    updateField(
                      "logoUrl",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="bs-field-wide">
                URL du logo sombre
                <input
                  type="url"
                  placeholder="https://..."
                  value={
                    brand.logoDarkUrl || ""
                  }
                  onChange={(event) =>
                    updateField(
                      "logoDarkUrl",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="bs-field-wide">
                URL du favicon
                <input
                  type="url"
                  placeholder="https://..."
                  value={
                    brand.faviconUrl || ""
                  }
                  onChange={(event) =>
                    updateField(
                      "faviconUrl",
                      event.target.value
                    )
                  }
                />
              </label>
            </div>
          </div>

          <div className="bs-panel">
            <div className="bs-panel-heading">
              <div>
                <span>Palette</span>
                <small>
                  Couleurs du Visual Engine
                </small>
              </div>
            </div>

            <div className="bs-color-grid">
              {[
                [
                  "primaryColor",
                  "Couleur principale",
                ],
                [
                  "secondaryColor",
                  "Couleur secondaire",
                ],
                [
                  "accentColor",
                  "Couleur d’accent",
                ],
                [
                  "backgroundColor",
                  "Arrière-plan",
                ],
                [
                  "textColor",
                  "Texte",
                ],
              ].map(
                ([field, label]) => (
                  <label
                    className="bs-color-field"
                    key={field}
                  >
                    <span>{label}</span>

                    <div>
                      <input
                        type="color"
                        value={
                          brand[field] ||
                          "#000000"
                        }
                        onChange={(event) =>
                          updateField(
                            field,
                            event.target.value
                          )
                        }
                      />

                      <input
                        type="text"
                        value={
                          brand[field] || ""
                        }
                        onChange={(event) =>
                          updateField(
                            field,
                            event.target.value
                          )
                        }
                      />
                    </div>
                  </label>
                )
              )}
            </div>
          </div>

          <div className="bs-panel">
            <div className="bs-panel-heading">
              <div>
                <span>Typographie</span>
                <small>
                  Police principale
                </small>
              </div>
            </div>

            <div className="bs-form-grid">
              <label className="bs-field-wide">
                Famille de caractères
                <select
                  value={
                    brand.fontFamily || ""
                  }
                  onChange={(event) =>
                    updateField(
                      "fontFamily",
                      event.target.value
                    )
                  }
                >
                  {FONT_OPTIONS.map(
                    (font) => (
                      <option
                        key={font}
                        value={font}
                      >
                        {font}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>
          </div>
        </section>

        <aside className="bs-preview-column">
          <div className="bs-preview-heading">
            <div>
              <span>Aperçu en direct</span>
              <small>
                Identité visuelle globale
              </small>
            </div>
          </div>

          <div className="bs-preview">
            <div className="bs-preview-browser">
              <div className="bs-preview-browser-bar">
                <span />
                <span />
                <span />

                <small>
                  {brand.domain ||
                    "mondescale.com"}
                </small>
              </div>

              <div className="bs-preview-site">
                <header>
                  <div className="bs-preview-logo">
                    {brand.logoUrl ? (
                      <img
                        src={brand.logoUrl}
                        alt=""
                      />
                    ) : (
                      <span>M</span>
                    )}

                    <strong>
                      {brand.displayName}
                    </strong>
                  </div>

                  <button type="button">
                    Demander un devis
                  </button>
                </header>

                <section className="bs-preview-hero">
                  <p>
                    Agence de voyages
                  </p>

                  <h2>
                    Votre prochain voyage
                    commence ici
                  </h2>

                  <span>
                    Une expérience personnalisée
                    créée avec votre conseiller.
                  </span>

                  <div>
                    <button type="button">
                      Demander un devis
                    </button>

                    <button
                      type="button"
                      className="is-secondary"
                    >
                      Nous contacter
                    </button>
                  </div>
                </section>

                <section className="bs-preview-cards">
                  <article>
                    <i>✦</i>
                    <strong>
                      Voyages sur mesure
                    </strong>
                    <span>
                      Une proposition adaptée à
                      chaque voyageur.
                    </span>
                  </article>

                  <article>
                    <i>★</i>
                    <strong>
                      Expertise locale
                    </strong>
                    <span>
                      Une équipe disponible avant,
                      pendant et après.
                    </span>
                  </article>
                </section>
              </div>
            </div>

            <div className="bs-token-summary">
              <div>
                <span>Principale</span>
                <i
                  style={{
                    background:
                      brand.primaryColor,
                  }}
                />
              </div>

              <div>
                <span>Secondaire</span>
                <i
                  style={{
                    background:
                      brand.secondaryColor,
                  }}
                />
              </div>

              <div>
                <span>Accent</span>
                <i
                  style={{
                    background:
                      brand.accentColor,
                  }}
                />
              </div>

              <div>
                <span>Police</span>
                <strong>
                  {brand.fontFamily}
                </strong>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
