"use client";

import {
  useMemo,
  useState,
} from "react";

const PAGE_TYPES = [
  {
    value:
      "HOME",

    label:
      "Accueil",
  },

  {
    value:
      "AGENCY",

    label:
      "Agence",
  },

  {
    value:
      "SERVICES",

    label:
      "Services",
  },

  {
    value:
      "CONTACT",

    label:
      "Contact",
  },
];

function scoreClass(
  score
) {
  const value =
    Number(
      score ||
      0
    );

  if (
    value >=
    80
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (
    value >=
    55
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-red-200 bg-red-50 text-red-800";
}

function statusLabel(
  accepted
) {
  return accepted
    ? "Proposition acceptable"
    : "Révision nécessaire";
}

function issueLabel(
  code
) {
  const labels = {
    UNVERIFIED_PHONE:
      "Téléphone non vérifié",

    UNVERIFIED_EMAIL:
      "E-mail non vérifié",

    UNSOURCED_PRICE:
      "Prix non sourcé",

    UNVERIFIED_GUARANTEE:
      "Garantie non vérifiée",

    UNVERIFIED_BEST_PRICE:
      "Promesse de meilleur prix non vérifiée",

    UNVERIFIED_PRICE_CLAIM:
      "Promesse tarifaire non vérifiée",

    UNVERIFIED_NUMBER_ONE_CLAIM:
      "Claim « numéro 1 » non vérifié",

    MISSING_SECTION:
      "Section obligatoire manquante",

    EMPTY_SECTION:
      "Section presque vide",

    DUPLICATE_SECTIONS:
      "Sections trop similaires",
  };

  return labels[
    code
  ] ||
    code;
}

function SectionPreview({
  section,
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
        {
          section.sectionType
        }
      </div>

      <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-700">
        {
          JSON.stringify(
            section.content ||
            {},
            null,
            2
          )
        }
      </pre>
    </article>
  );
}

export default function AiComposerPanel({
  agencyId,
}) {
  const [
    pageType,
    setPageType,
  ] =
    useState(
      "HOME"
    );

  const [
    instructions,
    setInstructions,
  ] =
    useState(
      ""
    );

  const [
    primaryKeyword,
    setPrimaryKeyword,
  ] =
    useState(
      "agence de voyages"
    );

  const [
    secondaryKeywords,
    setSecondaryKeywords,
  ] =
    useState(
      "voyage sur mesure, séjours, circuits"
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState(
      null
    );

  const [
    result,
    setResult,
  ] =
    useState(
      null
    );

  const [
    draftLoading,
    setDraftLoading,
  ] =
    useState(
      false
    );

  const [
    createdDraft,
    setCreatedDraft,
  ] =
    useState(
      null
    );

  const normalizedAgencyId =
    useMemo(
      () =>
        Number(
          agencyId
        ),
      [
        agencyId,
      ]
    );

  const factualIssues =
    result?.quality
      ?.factual
      ?.issues ||
    [];

  const structuralIssues =
    result?.quality
      ?.structural
      ?.issues ||
    [];

  const duplicateIssues =
    result?.quality
      ?.duplication
      ?.issues ||
    [];

  const allIssues = [
    ...factualIssues,
    ...structuralIssues,
    ...duplicateIssues,
  ];

  async function transformToDraft() {
    if (
      !result ||
      result.accepted !==
        true
    ) {
      setError(
        "Cette proposition ne passe pas encore le Quality Guard."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Transformer cette proposition en brouillon agence ? Le brouillon ne sera ni activé ni publié."
      );

    if (!confirmed) {
      return;
    }

    setDraftLoading(
      true
    );

    setCreatedDraft(
      null
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/content-composer/draft",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",

              "x-tenant-slug":
                "mondescale",
            },

            cache:
              "no-store",

            body:
              JSON.stringify({
                agencyId:
                  normalizedAgencyId,

                generation:
                  result,
              }),
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          payload.message ||
          "La création du brouillon a échoué."
        );
      }

      if (
        payload.created !==
          true ||
        payload.assignmentChanged !==
          false ||
        payload.activation !==
          false ||
        payload.publishing !==
          false ||
        payload.draft?.status !==
          "draft" ||
        payload.draft?.scope !==
          "agency"
      ) {
        throw new Error(
          "Le brouillon créé ne respecte pas le contrat de sécurité."
        );
      }

      setCreatedDraft(
        payload
      );
    } catch (
      draftError
    ) {
      setError(
        draftError?.message ||
        "Erreur lors de la création du brouillon."
      );
    } finally {
      setDraftLoading(
        false
      );
    }
  }

  async function generate() {
    if (
      !Number.isInteger(
        normalizedAgencyId
      ) ||
      normalizedAgencyId <=
        0
    ) {
      setError(
        "Agence invalide."
      );

      return;
    }

    setLoading(
      true
    );

    setError(
      null
    );

    setResult(
      null
    );

    setCreatedDraft(
      null
    );

    try {
      const response =
        await fetch(
          "/api/content-composer/compose",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",

              "x-tenant-slug":
                "mondescale",
            },

            cache:
              "no-store",

            body:
              JSON.stringify({
                agencyId:
                  normalizedAgencyId,

                pageType,

                variant:
                  "default",

                instructions,

                seo: {
                  primaryKeyword:
                    primaryKeyword.trim(),

                  secondaryKeywords:
                    secondaryKeywords
                      .split(",")
                      .map(
                        value =>
                          value.trim()
                      )
                      .filter(
                        Boolean
                      ),
                },
              }),
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          payload.message ||
          "La génération a échoué."
        );
      }

      if (
        payload.persistence !==
        false ||
        payload.publishing !==
        false
      ) {
        throw new Error(
          "Réponse Content Composer non conforme aux garanties de sécurité."
        );
      }

      setResult(
        payload
      );
    } catch (
      generationError
    ) {
      setError(
        generationError?.message ||
        "Erreur Content Composer."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  if (
    !Number.isInteger(
      normalizedAgencyId
    ) ||
    normalizedAgencyId <=
      0
  ) {
    return null;
  }

  return (
    <section
      data-mse-ai-composer="preview"
      className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">
          AI Composer
        </div>

        <h2 className="text-2xl font-semibold text-slate-950">
          Générer une proposition de contenu
        </h2>

        <p className="max-w-4xl text-sm leading-6 text-slate-600">
          Le Content Composer utilise le template effectif et le contexte
          de l'agence pour préparer une proposition. Cette étape est
          exclusivement une prévisualisation : aucune donnée du mini-site
          n'est modifiée.
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Page
          </label>

          <select
            value={
              pageType
            }
            onChange={
              event =>
                setPageType(
                  event.target.value
                )
            }
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800"
          >
            {
              PAGE_TYPES.map(
                page => (
                  <option
                    key={
                      page.value
                    }
                    value={
                      page.value
                    }
                  >
                    {
                      page.label
                    }
                  </option>
                )
              )
            }
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mot-clé SEO principal
          </label>

          <input
            value={
              primaryKeyword
            }
            onChange={
              event =>
                setPrimaryKeyword(
                  event.target.value
                )
            }
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800"
            placeholder="agence de voyages"
          />
        </div>
      </div>

      <div className="mt-5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Mots-clés secondaires
        </label>

        <input
          value={
            secondaryKeywords
          }
          onChange={
            event =>
              setSecondaryKeywords(
                event.target.value
              )
          }
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800"
          placeholder="voyage sur mesure, séjours, circuits"
        />

        <p className="mt-1 text-xs text-slate-400">
          Séparez les expressions par des virgules.
        </p>
      </div>

      <div className="mt-5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Instructions éditoriales
        </label>

        <textarea
          value={
            instructions
          }
          onChange={
            event =>
              setInstructions(
                event.target.value
              )
          }
          className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-800"
          placeholder="Ex. Mettre en avant le conseil personnalisé, la proximité et l'expertise des conseillers."
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={
            generate
          }
          disabled={
            loading
          }
          className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {
            loading
              ? "Génération…"
              : "Générer une proposition"
          }
        </button>

        <div className="text-xs text-slate-500">
          Aucun enregistrement · aucune activation · aucune publication
        </div>
      </div>

      {
        error
          ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {
                error
              }
            </div>
          )
          : null
      }

      {
        result
          ? (
            <div className="mt-8 border-t border-slate-200 pt-7">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Résultat
                  </div>

                  <h3 className="mt-1 text-xl font-semibold text-slate-950">
                    {
                      statusLabel(
                        result.accepted
                      )
                    }
                  </h3>

                  <p className="mt-1 text-sm text-slate-600">
                    Template : {
                      result.sourceTemplate
                        ?.name ||
                      result.sourceTemplate
                        ?.id
                    }
                  </p>
                </div>

                <span
                  className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${scoreClass(
                    result.quality
                      ?.score
                  )}`}
                >
                  Qualité {
                    result.quality
                      ?.score ??
                    0
                  } / 100
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Score global
                  </div>

                  <div className="mt-2 text-2xl font-semibold text-slate-950">
                    {
                      result.quality
                        ?.score ??
                      0
                    }
                    <span className="text-sm font-normal text-slate-400">
                      /100
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    SEO
                  </div>

                  <div className="mt-2 text-2xl font-semibold text-slate-950">
                    {
                      result.quality
                        ?.seo
                        ?.score ??
                      0
                    }
                    <span className="text-sm font-normal text-slate-400">
                      /100
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Factual Safety
                  </div>

                  <div className="mt-2 text-lg font-semibold text-slate-950">
                    {
                      result.quality
                        ?.factual
                        ?.safe
                        ? "✓ Conforme"
                        : "⚠ À vérifier"
                    }
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Provider
                  </div>

                  <div className="mt-2 text-sm font-semibold text-slate-950">
                    {
                      result.provider
                        ?.name ||
                      "inconnu"
                    }
                  </div>

                  {
                    result.provider
                      ?.fallbackUsed
                      ? (
                        <div className="mt-1 text-xs text-amber-700">
                          Fallback utilisé
                        </div>
                      )
                      : (
                        <div className="mt-1 text-xs text-emerald-700">
                          Provider principal
                        </div>
                      )
                  }
                </div>
              </div>

              {
                allIssues.length >
                0
                  ? (
                    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                      <div className="text-sm font-semibold text-amber-950">
                        Points de contrôle
                      </div>

                      <div className="mt-3 space-y-2">
                        {
                          allIssues.map(
                            (
                              issue,
                              index
                            ) => (
                              <div
                                key={`${issue.code}-${index}`}
                                className="rounded-xl bg-white px-3 py-2 text-sm text-amber-900"
                              >
                                <span className="font-medium">
                                  {
                                    issueLabel(
                                      issue.code
                                    )
                                  }
                                </span>

                                {
                                  issue.value
                                    ? (
                                      <span className="ml-2 text-xs text-amber-700">
                                        {
                                          issue.value
                                        }
                                      </span>
                                    )
                                    : null
                                }
                              </div>
                            )
                          )
                        }
                      </div>
                    </div>
                  )
                  : (
                    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Aucun problème structurel, factuel ou de duplication détecté.
                    </div>
                  )
              }

              <div className="mt-7">
                <div className="text-sm font-semibold text-slate-950">
                  Aperçu des sections générées
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {
                    result.content
                      ?.sections
                      ?.map(
                        (
                          section,
                          index
                        ) => (
                          <SectionPreview
                            key={`${section.sectionType}-${index}`}
                            section={
                              section
                            }
                          />
                        )
                      )
                  }
                </div>
              </div>

              <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-semibold text-slate-950">
                  SEO proposé
                </div>

                <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
                  {
                    JSON.stringify(
                      result.content
                        ?.seo ||
                      {},
                      null,
                      2
                    )
                  }
                </pre>
              </div>

              <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                La proposition n'est jamais activée ni publiée automatiquement.
              </div>

              {
                result.accepted
                  ? (
                    <div
                      data-mse-ai-draft-bridge="true"
                      className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-5"
                    >
                      <div className="text-sm font-semibold text-violet-950">
                        Proposition validée par le Quality Guard
                      </div>

                      <p className="mt-1 text-sm leading-6 text-violet-800">
                        Vous pouvez maintenant créer une copie de travail
                        dans la Template Library. Elle restera au statut
                        brouillon jusqu'à une activation manuelle distincte.
                      </p>

                      <button
                        type="button"
                        onClick={
                          transformToDraft
                        }
                        disabled={
                          draftLoading
                        }
                        className="mt-4 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:opacity-50"
                      >
                        {
                          draftLoading
                            ? "Création du brouillon…"
                            : "Transformer en brouillon"
                        }
                      </button>
                    </div>
                  )
                  : (
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                      La transformation en brouillon est désactivée tant que
                      la proposition ne passe pas le Quality Guard.
                    </div>
                  )
              }

              {
                createdDraft
                  ? (
                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                      <div className="text-sm font-semibold text-emerald-950">
                        Brouillon créé
                      </div>

                      <div className="mt-2 text-sm text-emerald-800">
                        {
                          createdDraft.draft?.name
                        }
                      </div>

                      <div className="mt-1 text-xs text-emerald-700">
                        {
                          createdDraft.draft?.pageType
                        }
                        {" · "}
                        {
                          createdDraft.draft?.status
                        }
                        {" · "}
                        aucune activation
                        {" · "}
                        aucune publication
                      </div>
                    </div>
                  )
                  : null
              }
            </div>
          )
          : null
      }
    </section>
  );
}
