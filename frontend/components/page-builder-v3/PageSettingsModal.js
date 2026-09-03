"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./VisualBuilderV3.module.css";

import {
  auditPageSeo,
  normalizeSlug,
} from "../../lib/page-builder-v3/index.mjs";

function Field({
  label,
  value,
  onChange,
  multiline = false,
  maxLength,
  help,
}) {
  return (
    <label className={styles.pageSettingsField}>
      <span>
        <strong>{label}</strong>

        {maxLength ? (
          <small>
            {String(value || "").length}
            /{maxLength}
          </small>
        ) : null}
      </span>

      {multiline ? (
        <textarea
          value={value || ""}
          maxLength={maxLength}
          rows={5}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      ) : (
        <input
          value={value || ""}
          maxLength={maxLength}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      )}

      {help ? <em>{help}</em> : null}
    </label>
  );
}

function ScoreRing({ score, grade }) {
  return (
    <div
      className={styles.seoScoreRing}
      style={{
        "--seo-score":
          `${Math.max(
            0,
            Math.min(100, score)
          ) * 3.6}deg`,
      }}
    >
      <div>
        <strong>{score}</strong>
        <span>/100</span>
        <small>Note {grade}</small>
      </div>
    </div>
  );
}

export default function PageSettingsModal({
  open,
  editor,
  site,
  onClose,
  onApply,
}) {
  const [draft, setDraft] =
    useState(null);

  useEffect(() => {
    if (!open || !editor?.page) {
      return;
    }

    setDraft({
      title:
        editor.page.title || "",
      slug:
        editor.page.slug || "",
      status:
        editor.page.status ||
        "draft",
      seoTitle:
        editor.page.seoTitle ||
        "",
      seoDescription:
        editor.page
          .seoDescription ||
        "",
    });
  }, [open, editor]);

  const previewPage = useMemo(
    () =>
      draft
        ? {
            ...editor.page,
            ...draft,
            slug:
              normalizeSlug(
                draft.slug
              ),
          }
        : editor?.page,
    [draft, editor]
  );

  const audit = useMemo(
    () =>
      previewPage
        ? auditPageSeo(
            previewPage
          )
        : null,
    [previewPage]
  );

  if (
    !open ||
    !draft ||
    !audit
  ) {
    return null;
  }

  function apply() {
    onApply({
      ...draft,
      slug:
        normalizeSlug(
          draft.slug
        ),
    });

    onClose();
  }

  const displayTitle =
    draft.seoTitle ||
    draft.title ||
    "Titre de votre page";

  const displayDescription =
    draft.seoDescription ||
    "Ajoutez une méta-description afin de présenter clairement cette page dans les résultats de recherche.";

  const baseUrl =
    site?.domain ||
    site?.customDomain ||
    "www.mondescale-voyages.fr";

  return (
    <div
      className={styles.pageSettingsBackdrop}
      onMouseDown={onClose}
    >
      <section
        className={styles.pageSettingsModal}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header>
          <div>
            <h2>
              Réglages de la page
            </h2>

            <p>
              Informations éditoriales,
              publication et optimisation SEO.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div
          className={
            styles.pageSettingsWorkspace
          }
        >
          <div
            className={
              styles.pageSettingsForm
            }
          >
            <section>
              <h3>
                Informations générales
              </h3>

              <Field
                label="Titre de la page"
                value={draft.title}
                maxLength={180}
                onChange={(title) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      title,
                    })
                  )
                }
                help="Ce titre est utilisé dans l’administration et peut apparaître sur le site."
              />

              <Field
                label="Slug de l’URL"
                value={draft.slug}
                maxLength={100}
                onChange={(slug) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      slug:
                        normalizeSlug(
                          slug
                        ),
                    })
                  )
                }
                help={`URL : /${normalizeSlug(draft.slug)}`}
              />

              <label
                className={
                  styles.pageSettingsField
                }
              >
                <span>
                  <strong>
                    Statut
                  </strong>
                </span>

                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        status:
                          event.target
                            .value,
                      })
                    )
                  }
                >
                  <option value="draft">
                    Brouillon
                  </option>

                  <option value="review">
                    En révision
                  </option>

                  <option value="published">
                    Publié
                  </option>

                  <option value="archived">
                    Archivé
                  </option>
                </select>

                <em>
                  Une page publiée est destinée
                  à apparaître sur le mini-site.
                </em>
              </label>
            </section>

            <section>
              <h3>
                Référencement naturel
              </h3>

              <Field
                label="Titre SEO"
                value={draft.seoTitle}
                maxLength={70}
                onChange={(seoTitle) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      seoTitle,
                    })
                  )
                }
                help="La longueur recommandée est comprise entre 30 et 60 caractères."
              />

              <Field
                label="Méta-description"
                value={
                  draft.seoDescription
                }
                maxLength={180}
                multiline
                onChange={(
                  seoDescription
                ) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      seoDescription,
                    })
                  )
                }
                help="La longueur recommandée est comprise entre 120 et 160 caractères."
              />

              <div
                className={
                  styles.googleSearchPreview
                }
              >
                <small>
                  {baseUrl}
                </small>

                <strong>
                  {displayTitle}
                </strong>

                <span>
                  {baseUrl}/
                  {normalizeSlug(
                    draft.slug
                  )}
                </span>

                <p>
                  {displayDescription}
                </p>
              </div>
            </section>
          </div>

          <aside
            className={
              styles.seoAuditPanel
            }
          >
            <div
              className={
                styles.seoAuditSummary
              }
            >
              <ScoreRing
                score={audit.score}
                grade={audit.grade}
              />

              <div>
                <h3>
                  Audit SEO
                </h3>

                <p>
                  {audit.passed} critère(s)
                  validé(s), {audit.failed} à
                  améliorer.
                </p>

                <span>
                  {audit.wordCount} mot(s)
                  détecté(s)
                </span>
              </div>
            </div>

            <div
              className={
                styles.seoChecks
              }
            >
              {audit.checks.map(
                (check) => (
                  <article
                    key={check.id}
                    data-passed={
                      check.passed
                        ? "true"
                        : "false"
                    }
                  >
                    <span>
                      {check.passed
                        ? "✓"
                        : "!"}
                    </span>

                    <div>
                      <strong>
                        {check.label}
                      </strong>

                      {!check.passed ? (
                        <p>
                          {
                            check.recommendation
                          }
                        </p>
                      ) : null}
                    </div>

                    <small>
                      {check.weight} pts
                    </small>
                  </article>
                )
              )}
            </div>
          </aside>
        </div>

        <footer>
          <button
            type="button"
            onClick={onClose}
          >
            Annuler
          </button>

          <button
            type="button"
            className={styles.save}
            onClick={apply}
          >
            Appliquer les réglages
          </button>
        </footer>
      </section>
    </div>
  );
}
