"use client";

import {
  useEffect,
  useMemo,
  useState,
  } from "react";

import styles from "./VisualBuilderV3.module.css";

import {
  buildEditorialSuggestions,
  generateEditorialAiSuggestions,
  normalizeFactualityAudit,
} from "../../lib/page-builder-v3/index.mjs";

function ChoiceGroup({
  title,
  values,
  selected,
  onSelect,
}) {
  return (
    <section
      className={
        styles.editorialChoiceGroup
      }
    >
      <h3>{title}</h3>

      {values.map(
        (value, index) => (
          <label
            key={`${index}-${value}`}
            data-active={
              selected === index
                ? "true"
                : "false"
            }
          >
            <input
              type="radio"
              checked={
                selected === index
              }
              onChange={() =>
                onSelect(index)
              }
            />

            <span>{value}</span>
          </label>
        )
      )}
    </section>
  );
}

export default function EditorialAssistantModal({
  open,
  editor,
  site,
  onClose,
  onApply,
}) {
  const [destination, setDestination] =
    useState("");
  const [generationMode, setGenerationMode] =
    useState("auto");

  const [generating, setGenerating] =
    useState(false);

  const [generatedResult, setGeneratedResult] =
    useState(null);

  const [generationError, setGenerationError] =
    useState("");


  const [agency, setAgency] =
    useState("");

  const [
    heroTitleIndex,
    setHeroTitleIndex,
  ] = useState(0);

  const [
    heroSubtitleIndex,
    setHeroSubtitleIndex,
  ] = useState(0);

  const [
    heroCtaIndex,
    setHeroCtaIndex,
  ] = useState(0);

  const [
    includePageSettings,
    setIncludePageSettings,
  ] = useState(true);

  const [
    includeFaq,
    setIncludeFaq,
  ] = useState(true);

  const [
    includeCta,
    setIncludeCta,
  ] = useState(true);

  useEffect(() => {
    setGeneratedResult(null);
    setGenerationError("");
  }, [
    destination,
    agency,
    generationMode,
  ]);

  useEffect(() => {
    if (!open) return;

    setAgency(
      site?.agency?.name ||
      site?.agencyName ||
      site?.name ||
      ""
    );
  }, [open, site]);

  const deterministicSuggestions =
    useMemo(
      () =>
        editor?.page
          ? buildEditorialSuggestions(
              editor.page,
              {
                destination,
                agency,
              }
            )
          : null,
      [
        editor?.page,
        destination,
        agency,
      ]
    );

  const suggestions =
    generatedResult?.suggestions ||
    deterministicSuggestions;

  const factualityAudit =
    normalizeFactualityAudit(
      generatedResult?.factuality
    );

  if (
    !open ||
    !editor?.page ||
    !suggestions
  ) {
    return null;
  }

  async function generateWithProvider() {
    const effectiveDestination =
      destination.trim() ||
      deterministicSuggestions?.destination ||
      "";

    if (!effectiveDestination) {
      setGenerationError(
        "Renseignez une destination."
      );
      return;
    }

    setGenerating(true);
    setGenerationError("");

    try {
      const result =
        await generateEditorialAiSuggestions({
          page: editor.page,
          destination:
            effectiveDestination,
          agency:
            agency.trim() ||
            deterministicSuggestions?.agency ||
            "",
          mode:
            generationMode,
        });

      setGeneratedResult(result);
      setHeroTitleIndex(0);
      setHeroSubtitleIndex(0);
      setHeroCtaIndex(0);
    } catch (error) {
      setGenerationError(
        error?.message ||
        "Impossible de générer les suggestions."
      );
    } finally {
      setGenerating(false);
    }
  }

  function apply() {
    if (
      generatedResult &&
      !factualityAudit.allowed
    ) {
      setGenerationError(
        "Les suggestions contiennent des affirmations non sourcées. Régénérez le contenu ou utilisez le moteur local."
      );

      return;
    }

    onApply(
      suggestions,
      {
        pageSettings:
          includePageSettings,

        heroTitleIndex,
        heroSubtitleIndex,
        heroCtaIndex,

        faq:
          includeFaq,

        cta:
          includeCta,
      }
    );

    onClose();
  }

  return (
    <div
      className={
        styles.editorialBackdrop
      }
      onMouseDown={onClose}
    >
      <section
        className={
          styles.editorialModal
        }
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header>
          <div>
            <h2>
              Assistant éditorial
            </h2>

            <p>
              Enrichissez les contenus
              de votre page voyage.
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
            styles.editorialWorkspace
          }
        >
          <aside>
            <label>
              <span>
                Destination
              </span>

              <input
                value={destination}
                placeholder={
                  suggestions.destination
                }
                onChange={(event) =>
                  setDestination(
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              <span>
                Nom de l’agence
              </span>

              <input
                value={agency}
                placeholder={
                  suggestions.agency
                }
                onChange={(event) =>
                  setAgency(
                    event.target.value
                  )
                }
              />
            </label>

            <div
              className={
                styles.editorialProviderControls
              }
            >
              <label>
                <span>
                  Mode de génération
                </span>

                <select
                  value={generationMode}
                  onChange={(event) =>
                    setGenerationMode(
                      event.target.value
                    )
                  }
                >
                  <option value="auto">
                    Automatique
                  </option>

                  <option value="external">
                    Fournisseur externe
                  </option>

                  <option value="deterministic">
                    Moteur local
                  </option>
                </select>
              </label>

              <button
                type="button"
                disabled={generating}
                onClick={generateWithProvider}
              >
                {generating
                  ? "Génération…"
                  : "Générer les suggestions"}
              </button>

              {generationError ? (
                <p
                  className={
                    styles.editorialProviderError
                  }
                >
                  {generationError}
                </p>
              ) : null}

              {generatedResult ? (
                <div
                  className={
                    styles.editorialProviderStatus
                  }
                  data-fallback={
                    generatedResult.fallbackUsed
                      ? "true"
                      : "false"
                  }
                >
                  <strong>
                    {generatedResult.provider === "external"
                      ? "Fournisseur IA externe"
                      : "Moteur éditorial local"}
                  </strong>

                  <span>
                    {generatedResult.fallbackUsed
                      ? "Repli local utilisé"
                      : "Suggestions générées"}
                  </span>
                </div>
              ) : null}

              {generatedResult ? (
                <div
                  className={
                    styles.editorialGroundingStatus
                  }
                  data-available={
                    generatedResult.grounding
                      ?.available
                      ? "true"
                      : "false"
                  }
                >
                  <strong>
                    {generatedResult.grounding
                      ?.available
                      ? "Données Travel Core utilisées"
                      : "Données Travel Core indisponibles"}
                  </strong>

                  <span>
                    {generatedResult.grounding
                      ?.available
                      ? `${generatedResult.grounding.sourceFields?.length || 0} catégorie(s) factuelle(s)`
                      : "Le contenu reste générique et prudent."}
                  </span>

                  {generatedResult.grounding
                    ?.sourceFields
                    ?.length ? (
                      <div>
                        {generatedResult.grounding.sourceFields.map(
                          (field) => (
                            <em key={field}>
                              {field}
                            </em>
                          )
                        )}
                      </div>
                    ) : null}
                </div>
              ) : null}
            </div>

            {generatedResult ? (
              <div
                className={
                  styles.editorialFactualityStatus
                }
                data-status={
                  factualityAudit.status
                }
              >
                <header>
                  <strong>
                    {factualityAudit.status ===
                    "blocked"
                      ? "Contenu bloqué"
                      : factualityAudit.status ===
                          "warning"
                        ? "Contenu à vérifier"
                        : "Contrôle factuel validé"}
                  </strong>

                  <span>
                    {factualityAudit.blockerCount}
                    {" "}bloquant(s) ·{" "}
                    {factualityAudit.warningCount}
                    {" "}avertissement(s)
                  </span>
                </header>

                {factualityAudit.issues
                  .slice(0, 10)
                  .map((issue) => (
                    <article
                      key={issue.id}
                      data-severity={
                        issue.severity
                      }
                    >
                      <strong>
                        {issue.severity ===
                        "blocked"
                          ? "Bloquant"
                          : "À vérifier"}
                      </strong>

                      <p>
                        {issue.message}
                      </p>

                      {issue.excerpt ? (
                        <small>
                          {issue.excerpt}
                        </small>
                      ) : null}

                      {issue.requiredFields
                        .length ? (
                          <span>
                            Source requise :{" "}
                            {issue.requiredFields.join(
                              ", "
                            )}
                          </span>
                        ) : null}
                    </article>
                  ))}
              </div>
            ) : null}

            <div
              className={
                styles.editorialSelections
              }
            >
              <label>
                <input
                  type="checkbox"
                  checked={
                    includePageSettings
                  }
                  onChange={(event) =>
                    setIncludePageSettings(
                      event.target.checked
                    )
                  }
                />

                <span>
                  Titre, slug et SEO
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={includeFaq}
                  onChange={(event) =>
                    setIncludeFaq(
                      event.target.checked
                    )
                  }
                />

                <span>
                  FAQ complète
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={includeCta}
                  onChange={(event) =>
                    setIncludeCta(
                      event.target.checked
                    )
                  }
                />

                <span>
                  Bloc CTA final
                </span>
              </label>
            </div>

            <section
              className={
                styles.editorialSeoPreview
              }
            >
              <small>
                Aperçu SEO
              </small>

              <strong>
                {
                  suggestions.page
                    .seoTitle
                }
              </strong>

              <span>
                /{
                  suggestions.page
                    .slug
                }
              </span>

              <p>
                {
                  suggestions.page
                    .seoDescription
                }
              </p>
            </section>
          </aside>

          <main>
            <ChoiceGroup
              title="Titre principal"
              values={
                suggestions.hero
                  .titles
              }
              selected={
                heroTitleIndex
              }
              onSelect={
                setHeroTitleIndex
              }
            />

            <ChoiceGroup
              title="Sous-titre"
              values={
                suggestions.hero
                  .subtitles
              }
              selected={
                heroSubtitleIndex
              }
              onSelect={
                setHeroSubtitleIndex
              }
            />

            <ChoiceGroup
              title="Bouton principal"
              values={
                suggestions.hero
                  .ctas
                  .map(
                    (item) =>
                      item.label
                  )
              }
              selected={
                heroCtaIndex
              }
              onSelect={
                setHeroCtaIndex
              }
            />

            <section
              className={
                styles.editorialFaqPreview
              }
            >
              <h3>
                FAQ proposée
              </h3>

              {suggestions.faq.items.map(
                (item, index) => (
                  <article
                    key={index}
                  >
                    <strong>
                      {item.question}
                    </strong>

                    <p>
                      {item.answer}
                    </p>
                  </article>
                )
              )}
            </section>
          </main>
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
            disabled={
              generatedResult &&
              !factualityAudit.allowed
            }
            onClick={apply}
          >
            {generatedResult &&
            !factualityAudit.allowed
              ? "Application bloquée"
              : "Appliquer les suggestions"}
          </button>
        </footer>
      </section>
    </div>
  );
}
