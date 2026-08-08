"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const PAGE_TYPES = [
  "HOME",
  "AGENCY",
  "SERVICES",
  "CONTACT",
];

const PAGE_LABELS = {
  HOME:
    "Accueil",

  AGENCY:
    "Agence",

  SERVICES:
    "Services",

  CONTACT:
    "Contact",
};

const SOURCE_LABELS = {
  agency:
    "Agence",

  tenant:
    "Mondescale",

  platform:
    "Plateforme",

  builtin:
    "Builtin",
};

function sourceBadgeClass(
  source
) {
  switch (
    source
  ) {
    case "agency":
      return "bg-emerald-100 text-emerald-800";

    case "tenant":
      return "bg-blue-100 text-blue-800";

    case "platform":
      return "bg-violet-100 text-violet-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

async function api(
  path,
  options = {}
) {
  const response =
    await fetch(
      `/api/template-library/${path}`,
      {
        ...options,

        headers: {
          "content-type":
            "application/json",

          "x-tenant-slug":
            "mondescale",

          ...(options.headers ||
            {}),
        },

        cache:
          "no-store",
      }
    );

  const payload =
    await response
      .json()
      .catch(
        () => ({})
      );

  if (!response.ok) {
    const error =
      new Error(
        payload.message ||
        "Erreur Template Library"
      );

    error.payload =
      payload;

    throw error;
  }

  return payload;
}

export default function TemplateManager({
  agencyId,
}) {
  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState(
      null
    );

  const [
    templates,
    setTemplates,
  ] =
    useState(
      []
    );

  const [
    resolved,
    setResolved,
  ] =
    useState(
      {}
    );

  const [
    preview,
    setPreview,
  ] =
    useState(
      null
    );

  const [
    previewLoading,
    setPreviewLoading,
  ] =
    useState(
      false
    );

  const [
    assignmentLoading,
    setAssignmentLoading,
  ] =
    useState(
      null
    );

  const [
    drafts,
    setDrafts,
  ] =
    useState(
      []
    );

  const [
    cloneLoading,
    setCloneLoading,
  ] =
    useState(
      null
    );

  const [
    editingDraft,
    setEditingDraft,
  ] =
    useState(
      null
    );

  const [
    draftJson,
    setDraftJson,
  ] =
    useState(
      ""
    );

  const [
    draftDiff,
    setDraftDiff,
  ] =
    useState(
      null
    );

  const [
    draftSaving,
    setDraftSaving,
  ] =
    useState(
      false
    );

  const [
    draftActivating,
    setDraftActivating,
  ] =
    useState(
      false
    );

  const [
    history,
    setHistory,
  ] =
    useState(
      {}
    );

  const [
    historyLoading,
    setHistoryLoading,
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

  const load =
    useCallback(
      async () => {
        if (
          !Number.isInteger(
            normalizedAgencyId
          ) ||
          normalizedAgencyId <=
            0
        ) {
          return;
        }

        setLoading(
          true
        );

        setError(
          null
        );

        try {
          const list =
            await api(
              `templates?agencyId=${normalizedAgencyId}`
            );

          setTemplates(
            list.templates ||
            []
          );

          const draftList =
            await api(
              `drafts?agencyId=${normalizedAgencyId}`
            );

          setDrafts(
            draftList.drafts ||
            []
          );

          const resolutionEntries =
            await Promise.all(
              PAGE_TYPES.map(
                async pageType => {
                  const value =
                    await api(
                      `resolve?agencyId=${normalizedAgencyId}&pageType=${pageType}&variant=default`
                    );

                  return [
                    pageType,
                    value,
                  ];
                }
              )
            );

          setResolved(
            Object.fromEntries(
              resolutionEntries
            )
          );
        } catch (loadError) {
          setError(
            loadError.message
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        normalizedAgencyId,
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

  const templatesByPage =
    useMemo(
      () => {
        const output =
          {};

        for (
          const pageType
          of PAGE_TYPES
        ) {
          output[
            pageType
          ] =
            templates.filter(
              template =>
                template.pageType ===
                pageType
            );
        }

        return output;
      },
      [
        templates,
      ]
    );

  async function openPreview(
    pageType
  ) {
    setPreviewLoading(
      true
    );

    setError(
      null
    );

    try {
      const value =
        await api(
          `preview?agencyId=${normalizedAgencyId}&pageType=${pageType}&variant=default`
        );

      setPreview(
        value
      );
    } catch (previewError) {
      setError(
        previewError.message
      );
    } finally {
      setPreviewLoading(
        false
      );
    }
  }

  async function cloneAgencyDraft(
    pageType
  ) {
    setCloneLoading(
      pageType
    );

    setError(
      null
    );

    try {
      await api(
        "clone-draft",
        {
          method:
            "POST",

          body:
            JSON.stringify({
              agencyId:
                normalizedAgencyId,

              pageType,

              variant:
                "default",
            }),
        }
      );

      await load();
    } catch (cloneError) {
      setError(
        cloneError.message
      );
    } finally {
      setCloneLoading(
        null
      );
    }
  }

  async function openDraftPreview(
    draft
  ) {
    setPreviewLoading(
      true
    );

    setError(
      null
    );

    try {
      const value =
        await api(
          `drafts/${draft.id}/preview?agencyId=${normalizedAgencyId}`
        );

      setPreview(
        value
      );
    } catch (previewError) {
      setError(
        previewError.message
      );
    } finally {
      setPreviewLoading(
        false
      );
    }
  }

  async function editDraft(
    draft
  ) {
    setError(
      null
    );

    try {
      const value =
        await api(
          `drafts/${draft.id}/preview?agencyId=${normalizedAgencyId}`
        );

      /*
       * Le preview contient le template rendu.
       * Pour l'éditeur nous récupérons la définition brute
       * depuis la liste complète des templates.
       */
      const fullList =
        await api(
          `templates?agencyId=${normalizedAgencyId}`
        );

      const fullDraft =
        (
          fullList.templates ||
          []
        ).find(
          item =>
            item.id ===
            draft.id
        );

      /*
       * La liste publique peut ne pas inclure definition.
       * On utilise donc un endpoint GET template/:id.
       */
      const raw =
        await api(
          `templates/${draft.id}`
        );

      setEditingDraft(
        draft
      );

      setDraftJson(
        JSON.stringify(
          raw.definition,
          null,
          2
        )
      );

      setDraftDiff(
        null
      );

      void value;
      void fullDraft;
    } catch (editError) {
      setError(
        editError.message
      );
    }
  }

  async function saveDraft() {
    if (!editingDraft) {
      return;
    }

    setDraftSaving(
      true
    );

    setError(
      null
    );

    try {
      let parsed;

      try {
        parsed =
          JSON.parse(
            draftJson
          );
      } catch {
        throw new Error(
          "Le JSON du template n'est pas valide."
        );
      }

      await api(
        `drafts/${editingDraft.id}`,
        {
          method:
            "PUT",

          body:
            JSON.stringify({
              agencyId:
                normalizedAgencyId,

              definition:
                parsed,
            }),
        }
      );

      const diff =
        await api(
          `drafts/${editingDraft.id}/diff?agencyId=${normalizedAgencyId}`
        );

      setDraftDiff(
        diff
      );

      await load();
    } catch (saveError) {
      setError(
        saveError.message
      );
    } finally {
      setDraftSaving(
        false
      );
    }
  }

  async function refreshDraftDiff() {
    if (!editingDraft) {
      return;
    }

    setError(
      null
    );

    try {
      const diff =
        await api(
          `drafts/${editingDraft.id}/diff?agencyId=${normalizedAgencyId}`
        );

      setDraftDiff(
        diff
      );
    } catch (diffError) {
      setError(
        diffError.message
      );
    }
  }

  async function activateDraft() {
    if (!editingDraft) {
      return;
    }

    const confirmed =
      window.confirm(
        "Activer cet override pour cette agence ? Le mini-site ne sera pas publié automatiquement."
      );

    if (!confirmed) {
      return;
    }

    setDraftActivating(
      true
    );

    setError(
      null
    );

    try {
      const result =
        await api(
          `drafts/${editingDraft.id}/activate`,
          {
            method:
              "POST",

            body:
              JSON.stringify({
                agencyId:
                  normalizedAgencyId,
              }),
          }
        );

      if (
        result.publishing !==
        false
      ) {
        throw new Error(
          "Activation refusée : état de publication inattendu."
        );
      }

      setEditingDraft(
        null
      );

      setDraftJson(
        ""
      );

      setDraftDiff(
        null
      );

      await load();
    } catch (activateError) {
      setError(
        activateError.message
      );
    } finally {
      setDraftActivating(
        false
      );
    }
  }

  async function loadHistory(
    pageType
  ) {
    setHistoryLoading(
      pageType
    );

    setError(
      null
    );

    try {
      const value =
        await api(
          `history?agencyId=${normalizedAgencyId}&pageType=${pageType}&variant=default`
        );

      setHistory(
        current => ({
          ...current,

          [pageType]:
            value,
        })
      );
    } catch (historyError) {
      setError(
        historyError.message
      );
    } finally {
      setHistoryLoading(
        null
      );
    }
  }

  async function rollbackTemplate(
    pageType,
    templateId
  ) {
    const confirmed =
      window.confirm(
        "Revenir à cette version ? Le mini-site ne sera pas publié automatiquement."
      );

    if (!confirmed) {
      return;
    }

    setError(
      null
    );

    try {
      await api(
        "rollback",
        {
          method:
            "POST",

          body:
            JSON.stringify({
              agencyId:
                normalizedAgencyId,

              templateId,
            }),
        }
      );

      await load();

      await loadHistory(
        pageType
      );
    } catch (rollbackError) {
      setError(
        rollbackError.message
      );
    }
  }

  async function revertToInheritance(
    pageType
  ) {
    const confirmed =
      window.confirm(
        "Supprimer l'override actif et revenir à l'héritage Mondescale ? Aucune publication automatique."
      );

    if (!confirmed) {
      return;
    }

    setError(
      null
    );

    try {
      const result =
        await api(
          "inherit",
          {
            method:
              "POST",

            body:
              JSON.stringify({
                agencyId:
                  normalizedAgencyId,

                pageType,

                variant:
                  "default",
              }),
          }
        );

      if (
        result.publishing !==
        false
      ) {
        throw new Error(
          "Etat de publication inattendu."
        );
      }

      await load();

      await loadHistory(
        pageType
      );
    } catch (inheritError) {
      setError(
        inheritError.message
      );
    }
  }

  async function assignAgencyTemplate(
    pageType,
    templateId
  ) {
    if (!templateId) {
      return;
    }

    setAssignmentLoading(
      pageType
    );

    setError(
      null
    );

    try {
      await api(
        "assignments",
        {
          method:
            "POST",

          body:
            JSON.stringify({
              scope:
                "agency",

              agencyId:
                normalizedAgencyId,

              pageType,

              variant:
                "default",

              templateId,
            }),
        }
      );

      await load();
    } catch (assignmentError) {
      setError(
        assignmentError.message
      );
    } finally {
      setAssignmentLoading(
        null
      );
    }
  }

  if (
    !Number.isInteger(
      normalizedAgencyId
    )
  ) {
    return null;
  }

  return (
    <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Template Library
        </div>

        <h2 className="text-2xl font-semibold text-slate-950">
          Templates du mini-site
        </h2>

        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Visualisez le modèle réellement utilisé pour chaque page.
          Les affectations sont indépendantes de la publication du site.
        </p>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 text-sm text-slate-500">
          Chargement de la Template Library…
        </div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {PAGE_TYPES.map(
            pageType => {
              const effective =
                resolved[
                  pageType
                ];

              const available =
                templatesByPage[
                  pageType
                ] ||
                [];

              return (
                <article
                  key={
                    pageType
                  }
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {
                          pageType
                        }
                      </div>

                      <h3 className="mt-1 text-lg font-semibold text-slate-950">
                        {
                          PAGE_LABELS[
                            pageType
                          ]
                        }
                      </h3>
                    </div>

                    {effective ? (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${sourceBadgeClass(
                          effective.source
                        )}`}
                      >
                        {
                          SOURCE_LABELS[
                            effective.source
                          ] ||
                          effective.source
                        }
                      </span>
                    ) : null}
                  </div>

                  {effective ? (
                    <div className="mt-5 space-y-3 text-sm">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          Template utilisé
                        </div>

                        <div className="mt-1 font-medium text-slate-900">
                          {
                            effective
                              .template
                              .name
                          }
                        </div>

                        <div className="mt-1 break-all text-xs text-slate-500">
                          {
                            effective
                              .template
                              .id
                          }
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-400">
                            Version
                          </div>

                          <div className="mt-1 font-medium text-slate-800">
                            {
                              effective
                                .template
                                .version
                            }
                          </div>
                        </div>

                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-400">
                            Héritage
                          </div>

                          <div className="mt-1 font-medium text-slate-800">
                            {
                              effective.inherited
                                ? "Oui"
                                : "Non"
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 text-sm text-slate-500">
                      Aucun template résolu.
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={
                        () =>
                          openPreview(
                            pageType
                          )
                      }
                      disabled={
                        previewLoading
                      }
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Prévisualiser
                    </button>

                    <button
                      type="button"
                      onClick={
                        () =>
                          cloneAgencyDraft(
                            pageType
                          )
                      }
                      disabled={
                        cloneLoading ===
                        pageType
                      }
                      className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      {
                        cloneLoading ===
                        pageType
                          ? "Clonage…"
                          : "Cloner en brouillon"
                      }
                    </button>

                    <button
                      type="button"
                      onClick={
                        () =>
                          loadHistory(
                            pageType
                          )
                      }
                      disabled={
                        historyLoading ===
                        pageType
                      }
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {
                        historyLoading ===
                        pageType
                          ? "Chargement…"
                          : "Historique"
                      }
                    </button>

                    {
                      effective?.source ===
                      "agency"
                        ? (
                          <button
                            type="button"
                            onClick={
                              () =>
                                revertToInheritance(
                                  pageType
                                )
                            }
                            className="rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800"
                          >
                            Revenir à l'héritage Mondescale
                          </button>
                        )
                        : null
                    }

                  </div>

                  {
                    drafts
                      .filter(
                        draft =>
                          draft.pageType ===
                          pageType
                      )
                      .length >
                    0
                      ? (
                        <div className="mt-5 border-t border-slate-100 pt-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Brouillons agence
                          </div>

                          <div className="mt-3 space-y-2">
                            {
                              drafts
                                .filter(
                                  draft =>
                                    draft.pageType ===
                                    pageType
                                )
                                .map(
                                  draft => (
                                    <div
                                      key={
                                        draft.id
                                      }
                                      className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-3"
                                    >
                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-amber-950">
                                          {
                                            draft.name
                                          }
                                        </div>

                                        <div className="mt-1 text-xs text-amber-700">
                                          Draft · v{
                                            draft.version
                                          }
                                        </div>
                                      </div>

                                      <div className="flex shrink-0 gap-2">
                                        <button
                                          type="button"
                                          onClick={
                                            () =>
                                              openDraftPreview(
                                                draft
                                              )
                                          }
                                          className="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-medium text-amber-900"
                                        >
                                          Preview
                                        </button>

                                        <button
                                          type="button"
                                          onClick={
                                            () =>
                                              editDraft(
                                                draft
                                              )
                                          }
                                          className="rounded-lg bg-amber-900 px-2.5 py-1.5 text-xs font-medium text-white"
                                        >
                                          Modifier
                                        </button>
                                      </div>
                                    </div>
                                  )
                                )
                            }
                          </div>
                        </div>
                      )
                      : null
                  }

                  {history[pageType] ? (
                    <div
                      data-mse-template-history="true"
                      className="mt-5 border-t border-slate-100 pt-4"
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Historique des versions
                      </div>

                      <div className="mt-3 space-y-2">
                        {
                          history[
                            pageType
                          ].versions?.length
                            ? history[
                                pageType
                              ].versions.map(
                                version => (
                                  <div
                                    key={
                                      version.id
                                    }
                                    className="flex flex-col gap-3 rounded-xl bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div>
                                      <div className="text-sm font-medium text-slate-900">
                                        {version.name}
                                      </div>

                                      <div className="mt-1 text-xs text-slate-500">
                                        v{version.version} · {version.status}
                                      </div>
                                    </div>

                                    {
                                      version.status !==
                                      "draft"
                                        ? (
                                          <button
                                            type="button"
                                            onClick={
                                              () =>
                                                rollbackTemplate(
                                                  pageType,
                                                  version.id
                                                )
                                            }
                                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                                          >
                                            Revenir à cette version
                                          </button>
                                        )
                                        : null
                                    }
                                  </div>
                                )
                              )
                            : (
                              <div className="text-sm text-slate-500">
                                Aucun historique agence.
                              </div>
                            )
                        }
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Override agence
                    </label>

                    <div className="mt-2 flex gap-2">
                      <select
                        defaultValue=""
                        disabled={
                          assignmentLoading ===
                          pageType
                        }
                        onChange={
                          event => {
                            const value =
                              event
                                .target
                                .value;

                            if (
                              value
                            ) {
                              assignAgencyTemplate(
                                pageType,
                                value
                              );

                              event.target.value =
                                "";
                            }
                          }
                        }
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                      >
                        <option value="">
                          Choisir un template…
                        </option>

                        {available.map(
                          template => (
                            <option
                              key={
                                template.id
                              }
                              value={
                                template.id
                              }
                            >
                              {
                                template.name
                              } — {
                                template.scope
                              } — v{
                                template.version
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      L'affectation ne publie rien et ne modifie aucune section existante.
                    </p>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}

      {editingDraft ? (
        <div
          data-mse-template-draft-editor="true"
          className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                Draft Editor
              </div>

              <h3 className="mt-1 text-lg font-semibold text-slate-950">
                {editingDraft.name}
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                Modifiez le brouillon puis comparez-le au template actif.
                Aucun changement n'est publié automatiquement.
              </p>
            </div>

            <button
              type="button"
              onClick={
                () => {
                  setEditingDraft(
                    null
                  );

                  setDraftJson(
                    ""
                  );

                  setDraftDiff(
                    null
                  );
                }
              }
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-white"
            >
              Fermer
            </button>
          </div>

          <textarea
            value={draftJson}
            onChange={
              event =>
                setDraftJson(
                  event.target.value
                )
            }
            spellCheck={false}
            className="mt-5 min-h-[420px] w-full rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveDraft}
              disabled={draftSaving}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {
                draftSaving
                  ? "Enregistrement…"
                  : "Enregistrer le brouillon"
              }
            </button>

            <button
              type="button"
              onClick={refreshDraftDiff}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Comparer au template actif
            </button>

            <button
              type="button"
              onClick={activateDraft}
              disabled={draftActivating}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {
                draftActivating
                  ? "Activation…"
                  : "Activer cet override"
              }
            </button>
          </div>

          <div className="mt-3 rounded-xl border border-amber-200 bg-white px-4 py-3 text-xs leading-5 text-amber-900">
            L'activation modifie uniquement le TemplateAssignment de cette agence.
            Elle ne publie pas le mini-site.
          </div>

          {draftDiff ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-950">
                Diff avec le template effectif
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Modifications
                  </div>

                  <div className="mt-1 font-medium text-slate-900">
                    {
                      draftDiff.diff?.changed
                        ? "Oui"
                        : "Non"
                    }
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    SEO modifié
                  </div>

                  <div className="mt-1 font-medium text-slate-900">
                    {
                      draftDiff.diff?.seoChanged
                        ? "Oui"
                        : "Non"
                    }
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Source active
                  </div>

                  <div className="mt-1 font-medium text-slate-900">
                    {draftDiff.effective?.source}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {
                  draftDiff.diff?.sections?.map(
                    section => (
                      <div
                        key={section.sectionType}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
                      >
                        <span className="font-medium text-slate-700">
                          {section.sectionType}
                        </span>

                        <span className="text-slate-500">
                          {section.status}
                        </span>
                      </div>
                    )
                  )
                }
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {preview ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Preview
              </div>

              <h3 className="mt-1 text-lg font-semibold text-slate-950">
                {
                  preview
                    .template
                    ?.name
                }
              </h3>
            </div>

            <button
              type="button"
              onClick={
                () =>
                  setPreview(
                    null
                  )
              }
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-white"
            >
              Fermer
            </button>
          </div>

          <div className="mt-4 grid gap-4">
            {preview
              .preview
              ?.sections
              ?.map(
                (
                  section,
                  index
                ) => (
                  <div
                    key={`${section.sectionType}-${index}`}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {
                        section.sectionType
                      }
                    </div>

                    <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
                      {
                        JSON.stringify(
                          section.content,
                          null,
                          2
                        )
                      }
                    </pre>
                  </div>
                )
              )}
          </div>

          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
            Prévisualisation uniquement — aucune publication.
          </div>
        </div>
      ) : null}
    </section>
  );
}
