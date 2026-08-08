"use client";

import {
  returnPageToDraft,
  preparePageForPublication,
  updatePageSettings,
  auditPageSeo,
  serializeEditorPage,
  saveEditorDraft,
  removeEditorDraft,
  readEditorDraft,
  applySavedPage,
  createTravelTemplateRegistry,
  applyTemplateToState,
  toggleSelection,
  selectedBlocks,
  selectRange,
  selectAllBlocks,
  saveClipboard,
  removeSelectedBlocks,
  readClipboard,
  pasteClipboardBlocks,
  moveSelectedBlocks,
  duplicateSelectedBlocks,
  createClipboardPayload,
  clearBlockSelection,
  appendSelection,
  useEffect,
  useMemo,
  useRef,
  useState,
  } from "react";

import styles from "./VisualBuilderV3.module.css";

import DraggableCanvas from "./DraggableCanvas";
import TemplateLibraryModal from "./TemplateLibraryModal";
import PageSettingsModal from "./PageSettingsModal";
import InlineEditable from "./InlineEditable";
import BlockInspectorV3 from "./BlockInspectorV3";
import PagePreviewModal from "./PagePreviewModal";
import VersionHistoryModal from "./VersionHistoryModal";
import EditorialAssistantModal from "./EditorialAssistantModal";

import {
  updateBlockContentField,
  inlineFieldDefinition,
  htmlToInlineText,
  EditorHistory,
  addBlock,
  createCoreRegistry,
  createEditorState,
  duplicateBlock,
  removeBlock,
  selectBlock,
  setViewport,
  updateBlock,
  applyEditorialPatchToEditor,
} from "../../lib/page-builder-v3/index.mjs";

import {
  fetchPageDetails,
  fetchSite,
  savePage,
  fetchPageVersions,
  rollbackPageVersion,
} from "../../lib/page-builder-v2/page-builder-api";

function textFromHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeExistingPage(page) {
  const blocks =
    page?.blocks ||
    page?.sections ||
    [];

  return {
    id: String(page?.id || ""),
    title: String(
      page?.title || "Page"
    ),
    slug: String(page?.slug || ""),
    status: String(
      page?.status || "draft"
    ),
    seoTitle: String(
      page?.seoTitle || ""
    ),
    seoDescription: String(
      page?.seoDescription ||
      page?.metaDescription ||
      ""
    ),

    blocks: blocks.map(
      (block, index) => ({
        id: String(
          block.id ||
          `legacy-${index}`
        ),

        type: String(
          block.type ||
          block.blockType ||
          block.jsonContent?.__builderType ||
          block.sectionType ||
          "rich_text"
        )
          .replace(/--\d+$/, "")
          .toLowerCase(),

        status: String(
          block.status || "draft"
        ),

        position: Number(
          block.position ??
          block.displayOrder ??
          index
        ),

        content:
          block.content ||
          block.jsonContent ||
          {},

        settings:
          block.settings || {},
      })
    ),
  };
}

function BlockPreview({
  block,
  onInlineChange,
}) {
  const content =
    block.content || {};

  const editable = (
    field,
    options = {}
  ) => {
    const definition =
      inlineFieldDefinition(
        block.type,
        field
      );

    const rawValue =
      field === "html"
        ? htmlToInlineText(
            content[field]
          )
        : String(
            content[field] ?? ""
          );

    return {
      value: rawValue,
      multiline:
        options.multiline ??
        definition.multiline,
      maxLength:
        options.maxLength ??
        definition.maxLength,
      onCommit: (value) =>
        onInlineChange(
          field,
          value,
          {
            ...definition,
            ...options,
          }
        ),
    };
  };

  if (block.type === "hero") {
    return (
      <section className={styles.hero}>
        <InlineEditable
          as="small"
          placeholder="Ajouter un surtitre"
          {...editable("eyebrow")}
        />

        <InlineEditable
          as="h1"
          placeholder="Titre principal"
          {...editable("title")}
        />

        <InlineEditable
          as="p"
          placeholder="Ajouter un sous-titre"
          {...editable(
            "subtitle",
            {
              multiline: true,
            }
          )}
        />

        <button type="button">
          {content.primaryCta?.label ||
            "Demander un devis"}
        </button>
      </section>
    );
  }

  if (block.type === "faq") {
    return (
      <section className={styles.section}>
        <InlineEditable
          as="h2"
          placeholder="Titre de la FAQ"
          {...editable("title")}
        />

        {(content.items || []).map(
          (item, index) => (
            <details
              key={`${item.question}-${index}`}
              open={index === 0}
            >
              <summary>
                {item.question}
              </summary>

              <p>{item.answer}</p>
            </details>
          )
        )}
      </section>
    );
  }

  if (block.type === "cta") {
    return (
      <section className={styles.cta}>
        <InlineEditable
          as="h2"
          placeholder="Titre de l’appel à l’action"
          {...editable("title")}
        />

        <InlineEditable
          as="p"
          placeholder="Texte de l’appel à l’action"
          {...editable(
            "text",
            {
              multiline: true,
            }
          )}
        />

        <button type="button">
          {content.primaryCta?.label ||
            "Nous contacter"}
        </button>
      </section>
    );
  }

  if (block.type === "features") {
    return (
      <section className={styles.section}>
        <InlineEditable
          as="h2"
          placeholder="Titre des points forts"
          {...editable("title")}
        />

        <div className={styles.cards}>
          {(content.items || []).map(
            (item, index) => (
              <article key={index}>
                <strong>
                  {item.icon || "✦"}
                </strong>

                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            )
          )}
        </div>
      </section>
    );
  }

  if (block.type === "gallery") {
    return (
      <section className={styles.section}>
        <InlineEditable
          as="h2"
          placeholder="Titre de la galerie"
          {...editable("title")}
        />

        <div className={styles.gallery}>
          {(content.images || []).length
            ? content.images.map(
                (image, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={index}
                    src={image.url}
                    alt={image.alt || ""}
                  />
                )
              )
            : [1, 2, 3].map(
                (item) => (
                  <span key={item}>
                    Image {item}
                  </span>
                )
              )}
        </div>
      </section>
    );
  }

  if (block.type === "agency") {
    return (
      <section className={styles.agency}>
        <InlineEditable
          as="h2"
          placeholder="Titre de l’agence"
          {...editable("title")}
        />

        <p>
          Coordonnées, horaires et moyens
          de contact.
        </p>
      </section>
    );
  }

  if (block.type === "image_text") {
    return (
      <section className={styles.imageText}>
        <div>Image</div>

        <article>
          <InlineEditable
            as="h2"
            placeholder="Titre de la section"
            {...editable("title")}
          />

          <InlineEditable
            as="p"
            placeholder="Texte de la section"
            {...editable(
              "text",
              {
                multiline: true,
              }
            )}
          />
        </article>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <InlineEditable
        as="h2"
        placeholder="Titre de la section"
        {...editable("title")}
      />

      <InlineEditable
        as="p"
        placeholder="Contenu éditorial"
        {...editable(
          "html",
          {
            multiline: true,
            html: true,
          }
        )}
      />
    </section>
  );
}

export default function VisualBuilderV3({
  siteId,
}) {
  const registry = useMemo(
    () => createCoreRegistry(),
    []
  );

  const templateRegistry = useMemo(
    () =>
      createTravelTemplateRegistry(),
    []
  );

  const historyRef = useRef(null);


  const autosaveTimerRef =


    useRef(null);


  const [site, setSite] = useState(null);
  const [pageId, setPageId] = useState(null);
  const [editor, setEditor] = useState(null);

  const [loading, setLoading] =
    useState(true);


  const [saving, setSaving] = useState(false);


  const [localSaving, setLocalSaving] =


    useState(false);


  const [localSavedAt, setLocalSavedAt] =


    useState(null);


  const [notice, setNotice] = useState("");



  const [templatesOpen, setTemplatesOpen] =


    useState(false);




  const [pageSettingsOpen, setPageSettingsOpen] =




    useState(false);





  const [previewOpen, setPreviewOpen] =





    useState(false);






  const [historyOpen, setHistoryOpen] =






    useState(false);







  const [editorialOpen, setEditorialOpen] =







    useState(false);







  const [versionsLoading, setVersionsLoading] =






    useState(false);






  const [versions, setVersions] =






    useState([]);






  const [restoringVersionId, setRestoringVersionId] =






    useState(null);






  const [publishing, setPublishing] =





    useState(false);




  const [error, setError] =
    useState("");


  const [clipboardCount, setClipboardCount] =


    useState(0);


  const selectedBlockIds =
    editor?.selection?.blockIds || [];

  const selectedBlockId =
    selectedBlockIds[0] || null;

  const selectedBlock =
    editor?.page?.blocks?.find(
      (block) =>
        block.id === selectedBlockId
    ) || null;

  const selectedCount =
    selectedBlockIds.length;

  const currentSeoAudit = useMemo(
    () =>
      editor?.page
        ? auditPageSeo(
            editor.page
          )
        : null,
    [editor?.page]
  );

  function commit(nextState) {
    if (!historyRef.current) {
      historyRef.current =
        new EditorHistory(nextState);
    } else {
      historyRef.current.commit(
        nextState
      );
    }

    setEditor(
      historyRef.current.current()
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const loadedSite =
          await fetchSite(siteId);

        if (cancelled) return;

        setSite(loadedSite);

        const firstPage =
          loadedSite.pages[0];

        if (!firstPage) {
          throw new Error(
            "Ce mini-site ne contient aucune page."
          );
        }

        const detailed =
          await fetchPageDetails(
            loadedSite,
            firstPage
          );

        let state =
          createEditorState(
            normalizeExistingPage(
              detailed
            )
          );

        const localDraft =
          readEditorDraft(
            loadedSite.id,
            firstPage.id
          );

        if (localDraft?.editor?.page) {
          state = localDraft.editor;

          setNotice(
            "Un brouillon local a été restauré."
          );

          setLocalSavedAt(
            localDraft.savedAt
          );
        }

        historyRef.current =
          new EditorHistory(state);

        setPageId(firstPage.id);
        setEditor(state);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.message ||
            "Impossible de charger le Visual Builder V3."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [siteId]);

  async function changePage(nextPageId) {
    if (
      editor?.dirty &&
      !window.confirm(
        "Cette page contient des modifications non sauvegardées sur le serveur. Changer de page ?"
      )
    ) {
      return;
    }

    const page = site.pages.find(
      (item) => item.id === nextPageId
    );

    if (!page) return;

    setLoading(true);
    setError("");

    try {
      const detailed =
        await fetchPageDetails(
          site,
          page
        );

      let state =
        createEditorState(
          normalizeExistingPage(
            detailed
          )
        );

      const localDraft =
        readEditorDraft(
          site.id,
          page.id
        );

      if (localDraft?.editor?.page) {
        state = localDraft.editor;

        setNotice(
          "Le brouillon local de cette page a été restauré."
        );

        setLocalSavedAt(
          localDraft.savedAt
        );
      } else {
        setLocalSavedAt(null);
      }

      historyRef.current.reset(state);

      setPageId(nextPageId);
      setEditor(state);
    } catch (pageError) {
      setError(
        pageError?.message ||
        "Impossible de charger cette page."
      );
    } finally {
      setLoading(false);
    }
  }


  function copySelection() {
    const blocks = selectedBlocks(
      editor
    );

    if (!blocks.length) {
      setError(
        "Sélectionnez au moins un bloc."
      );
      return;
    }

    const payload =
      createClipboardPayload(
        blocks,
        {
          sourcePageId:
            editor.page.id,
          sourceSiteId:
            site.id,
        }
      );

    saveClipboard(payload);
    setClipboardCount(
      payload.blocks.length
    );
    setError("");
  }

  function cutSelection() {
    copySelection();

    if (
      editor.selection.blockIds.length
    ) {
      commit(
        removeSelectedBlocks(
          editor
        )
      );
    }
  }

  function pasteSelection() {
    try {
      const payload =
        readClipboard();

      if (!payload?.blocks?.length) {
        setError(
          "Le presse-papiers est vide."
        );
        return;
      }

      commit(
        pasteClipboardBlocks(
          editor,
          payload
        )
      );

      setClipboardCount(
        payload.blocks.length
      );
      setError("");
    } catch (clipboardError) {
      setError(
        clipboardError?.message ||
          "Impossible de coller les blocs."
      );
    }
  }

  function duplicateSelection() {
    if (!selectedCount) {
      setError(
        "Sélectionnez au moins un bloc."
      );
      return;
    }

    commit(
      duplicateSelectedBlocks(
        editor
      )
    );
  }

  function deleteSelection() {
    if (!selectedCount) {
      return;
    }

    const confirmed =
      window.confirm(
        selectedCount === 1
          ? "Supprimer ce bloc ?"
          : `Supprimer les ${selectedCount} blocs sélectionnés ?`
      );

    if (!confirmed) return;

    commit(
      removeSelectedBlocks(
        editor
      )
    );
  }




  function applyEditorialSuggestions(
    suggestions,
    selection
  ) {
    try {
      const next =
        applyEditorialPatchToEditor(
          editor,
          suggestions,
          selection
        );

      commit(next);
      setEditorialOpen(false);
      setError("");
      setNotice(
        "Suggestions éditoriales appliquées."
      );
    } catch (editorialError) {
      setError(
        editorialError?.message ||
          "Impossible d’appliquer les suggestions."
      );
    }
  }

  function applyPageSettings(settings) {
    try {
      const next =
        updatePageSettings(
          editor,
          settings
        );

      commit(next);
      setPageSettingsOpen(false);
      setError("");
    } catch (settingsError) {
      setError(
        settingsError?.message ||
          "Impossible d’appliquer les réglages."
      );
    }
  }

  function applyPageTemplate(
    templateId,
    variables,
    mode
  ) {
    try {
      const instance =
        templateRegistry.instantiate(
          templateId,
          variables
        );

      const next =
        applyTemplateToState(
          editor,
          instance,
          mode
        );

      commit(next);
      setTemplatesOpen(false);
      setError("");
    } catch (templateError) {
      setError(
        templateError?.message ||
          "Impossible d’appliquer le modèle."
      );
    }
  }




  async function loadVersionHistory() {
    if (
      !site ||
      !editor?.page
    ) {
      return;
    }

    setVersionsLoading(true);
    setError("");

    try {
      const result =
        await fetchPageVersions(
          site,
          editor.page
        );

      setVersions(
        result.items || []
      );
    } catch (historyError) {
      setError(
        historyError?.message ||
          "Impossible de charger l’historique."
      );
    } finally {
      setVersionsLoading(false);
    }
  }

  async function openVersionHistory() {
    setHistoryOpen(true);
    await loadVersionHistory();
  }

  async function handleVersionRollback(
    versionId
  ) {
    if (
      !site ||
      !editor?.page ||
      !versionId
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Restaurer cette version ? La page actuelle sera conservée dans l’historique."
      );

    if (!confirmed) {
      return;
    }

    setRestoringVersionId(
      versionId
    );

    setError("");
    setNotice("");

    try {
      const restored =
        await rollbackPageVersion(
          site,
          editor.page,
          versionId
        );

      const next =
        createEditorState(
          normalizeExistingPage(
            restored
          )
        );

      historyRef.current.reset(
        next
      );

      setEditor(next);

      setSite((current) => ({
        ...current,
        pages:
          current.pages.map(
            (page) =>
              page.id ===
              next.page.id
                ? {
                    ...page,
                    ...next.page,
                  }
                : page
          ),
      }));

      removeEditorDraft(
        site.id,
        editor.page.id
      );

      setLocalSavedAt(null);

      setNotice(
        "Version restaurée avec succès."
      );

      const result =
        await fetchPageVersions(
          site,
          next.page
        );

      setVersions(
        result.items || []
      );
    } catch (rollbackError) {
      setError(
        rollbackError?.message ||
          "Impossible de restaurer cette version."
      );
    } finally {
      setRestoringVersionId(
        null
      );
    }
  }

  async function handlePublish() {
    if (
      !site ||
      !editor?.page
    ) {
      return;
    }

    setPublishing(true);
    setError("");
    setNotice("");

    try {
      const prepared =
        preparePageForPublication(
          editor
        );

      const serialized =
        serializeEditorPage(
          prepared.editor
        );

      const saved =
        await savePage(
          site,
          serialized
        );

      const next =
        applySavedPage(
          prepared.editor,
          saved
        );

      historyRef.current.reset(
        next
      );

      setEditor(next);

      removeEditorDraft(
        site.id,
        editor.page.id
      );

      setLocalSavedAt(null);
      setPreviewOpen(false);
      setNotice(
        "Page publiée avec succès."
      );
    } catch (publishError) {
      const blockers =
        publishError
          ?.validation
          ?.blockers;

      if (
        Array.isArray(blockers) &&
        blockers.length
      ) {
        setError(
          blockers
            .map(
              (item) =>
                item.message
            )
            .join(" ")
        );
      } else {
        setError(
          publishError?.message ||
            "Impossible de publier la page."
        );
      }
    } finally {
      setPublishing(false);
    }
  }

  function handleReturnToDraft() {
    commit(
      returnPageToDraft(
        editor
      )
    );

    setNotice(
      "La page est repassée en brouillon. Sauvegardez pour confirmer."
    );
  }

  async function handleSave() {
    if (
      !site ||
      !editor ||
      !editor.page
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const serialized =
        serializeEditorPage(
          editor
        );

      const saved =
        await savePage(
          site,
          serialized
        );

      const next =
        applySavedPage(
          editor,
          saved
        );

      historyRef.current.reset(next);
      setEditor(next);

      removeEditorDraft(
        site.id,
        editor.page.id
      );

      setLocalSavedAt(null);
      setNotice(
        "Page sauvegardée sur le serveur."
      );
    } catch (saveError) {
      setError(
        saveError?.message ||
          "Impossible de sauvegarder la page."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleAdd(type) {
    const manifest = registry.get(type);

    if (
      manifest.singleton &&
      editor.page.blocks.some(
        (block) => block.type === type
      )
    ) {
      setError(
        `Le bloc « ${manifest.label} » existe déjà.`
      );

      return;
    }

    const block = registry.create(type, {
      position:
        editor.page.blocks.length,
    });

    commit(
      addBlock(editor, block)
    );
  }


  useEffect(() => {
    if (!editor) return undefined;

    const handleGlobalShortcut = (
      event
    ) => {
      const modifier =
        event.metaKey ||
        event.ctrlKey;

      const target =
        event.target;

      const editing =
        target instanceof
          HTMLInputElement ||
        target instanceof
          HTMLTextAreaElement ||
        target?.isContentEditable;

      if (editing) return;

      if (
        modifier &&
        event.key.toLowerCase() === "a"
      ) {
        event.preventDefault();

        setEditor(
          selectAllBlocks(
            editor
          )
        );
        return;
      }

      if (
        modifier &&
        event.key.toLowerCase() === "c"
      ) {
        event.preventDefault();
        copySelection();
        return;
      }

      if (
        modifier &&
        event.key.toLowerCase() === "x"
      ) {
        event.preventDefault();
        cutSelection();
        return;
      }

      if (
        modifier &&
        event.key.toLowerCase() === "v"
      ) {
        event.preventDefault();
        pasteSelection();
        return;
      }

      if (
        modifier &&
        event.key.toLowerCase() === "d"
      ) {
        event.preventDefault();
        duplicateSelection();
        return;
      }

      if (
        event.key === "Delete" ||
        event.key === "Backspace"
      ) {
        event.preventDefault();
        deleteSelection();
        return;
      }

      if (
        event.key === "Escape"
      ) {
        setEditor(
          clearBlockSelection(
            editor
          )
        );
      }
    };

    window.addEventListener(
      "keydown",
      handleGlobalShortcut
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleGlobalShortcut
      );
    };
  }, [
    editor,
    selectedCount,
    site,
  ]);


  useEffect(() => {
    if (
      !site ||
      !editor?.page ||
      !editor.dirty
    ) {
      return undefined;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(
        autosaveTimerRef.current
      );
    }

    setLocalSaving(true);

    autosaveTimerRef.current =
      setTimeout(() => {
        const payload =
          saveEditorDraft(
            site.id,
            editor
          );

        setLocalSavedAt(
          payload?.savedAt ||
          new Date().toISOString()
        );

        setLocalSaving(false);
      }, 800);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(
          autosaveTimerRef.current
        );
      }
    };
  }, [site, editor]);

  useEffect(() => {
    const beforeUnload = (event) => {
      if (!editor?.dirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

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
  }, [editor?.dirty]);

  if (loading && !editor) {
    return (
      <main className={styles.state}>
        <div className={styles.loader} />
        <h1>
          Chargement du Visual Builder V3
        </h1>
      </main>
    );
  }

  if (!editor || !site) {
    return (
      <main className={styles.state}>
        <h1>
          Visual Builder indisponible
        </h1>
        <p>{error}</p>
      </main>
    );
  }

  return (
    <main className={styles.builder}>
      <header className={styles.toolbar}>
        <div>
          <a href="/website-builder">
            ←
          </a>

          <span>
            <strong>
              Visual Builder V3
            </strong>
            <small>{site.name}</small>
          </span>
        </div>

        <div
          className={styles.persistenceState}
          data-dirty={
            editor.dirty
              ? "true"
              : "false"
          }
        >
          <i />

          <span>
            {saving
              ? "Sauvegarde serveur…"
              : localSaving
                ? "Brouillon local…"
                : editor.dirty
                  ? localSavedAt
                    ? "Brouillon local sauvegardé"
                    : "Modifications en cours"
                  : "Sauvegardé"}
          </span>
        </div>

        <nav>
          <button
            type="button"
            disabled={
              !historyRef.current?.canUndo()
            }
            onClick={() =>
              setEditor(
                historyRef.current.undo()
              )
            }
          >
            ↶ Annuler
          </button>

          <button
            type="button"
            disabled={
              !historyRef.current?.canRedo()
            }
            onClick={() =>
              setEditor(
                historyRef.current.redo()
              )
            }
          >
            ↷ Rétablir
          </button>

          {[
            "desktop",
            "tablet",
            "mobile",
          ].map((viewport) => (
            <button
              type="button"
              key={viewport}
              data-active={
                editor.viewport === viewport
              }
              onClick={() =>
                setEditor(
                  setViewport(
                    editor,
                    viewport
                  )
                )
              }
            >
              {viewport === "desktop"
                ? "Ordinateur"
                : viewport === "tablet"
                  ? "Tablette"
                  : "Mobile"}
            </button>
          ))}

          <div className={styles.batchActions}>
            <span>
              {selectedCount
                ? `${selectedCount} sélectionné(s)`
                : "Aucune sélection"}
            </span>

            <button
              type="button"
              disabled={!selectedCount}
              onClick={copySelection}
              title="Copier — Ctrl/Cmd+C"
            >
              Copier
            </button>

            <button
              type="button"
              disabled={!selectedCount}
              onClick={cutSelection}
              title="Couper — Ctrl/Cmd+X"
            >
              Couper
            </button>

            <button
              type="button"
              onClick={pasteSelection}
              title="Coller — Ctrl/Cmd+V"
            >
              Coller
              {clipboardCount
                ? ` (${clipboardCount})`
                : ""}
            </button>

            <button
              type="button"
              disabled={!selectedCount}
              onClick={duplicateSelection}
              title="Dupliquer — Ctrl/Cmd+D"
            >
              Dupliquer
            </button>

            <button
              type="button"
              disabled={!selectedCount}
              onClick={() =>
                commit(
                  moveSelectedBlocks(
                    editor,
                    -1
                  )
                )
              }
              title="Monter la sélection"
            >
              ↑
            </button>

            <button
              type="button"
              disabled={!selectedCount}
              onClick={() =>
                commit(
                  moveSelectedBlocks(
                    editor,
                    1
                  )
                )
              }
              title="Descendre la sélection"
            >
              ↓
            </button>

            <button
              type="button"
              disabled={!selectedCount}
              onClick={deleteSelection}
              title="Supprimer"
            >
              Supprimer
            </button>
          </div>

          <button
            type="button"
            className={styles.editorialToolbarButton}
            onClick={() =>
              setEditorialOpen(true)
            }
          >
            Assistant
          </button>

          <button
            type="button"
            className={styles.historyToolbarButton}
            onClick={openVersionHistory}
          >
            Historique
          </button>

          <button
            type="button"
            className={styles.previewToolbarButton}
            onClick={() =>
              setPreviewOpen(true)
            }
          >
            Aperçu
          </button>

          <button
            type="button"
            className={styles.seoToolbarButton}
            onClick={() =>
              setPageSettingsOpen(true)
            }
          >
            SEO
            {currentSeoAudit ? (
              <span
                data-grade={
                  currentSeoAudit.grade
                }
              >
                {currentSeoAudit.score}
              </span>
            ) : null}
          </button>

          {editor.page.status === "published" ? (
            <button
              type="button"
              className={styles.draftToolbarButton}
              onClick={handleReturnToDraft}
            >
              Repasser en brouillon
            </button>
          ) : null}

          <button
            type="button"
            className={styles.save}
            disabled={
              saving ||
              !editor.dirty
            }
            onClick={handleSave}
          >
            {saving
              ? "Sauvegarde…"
              : editor.dirty
                ? "Sauvegarder"
                : "Sauvegardé"}
          </button>
        </nav>
      </header>

      {error || notice ? (
        <div
          className={
            error
              ? styles.error
              : styles.notice
          }
        >
          {error || notice}

          <button
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            ×
          </button>
        </div>
      ) : null}

      <div className={styles.workspace}>
        <aside className={styles.pages}>
          <header>
            <strong>Pages</strong>
            <small>
              {site.pages.length}
            </small>
          </header>

          {site.pages.map((page) => (
            <button
              type="button"
              key={page.id}
              data-active={
                page.id === pageId
              }
              onClick={() =>
                changePage(page.id)
              }
            >
              <span>▤</span>

              <span>
                <strong>
                  {page.title}
                </strong>
                <small>
                  /{page.slug}
                </small>
              </span>
            </button>
          ))}
        </aside>

        <section className={styles.center}>
          <div className={styles.canvasHeader}>
            <div>
              <strong>
                {editor.page.title}
              </strong>
              <small>
                {editor.page.blocks.length}
                {" "}bloc(s)
              </small>
            </div>

            <button
              type="button"
              className={styles.templateButton}
              onClick={() =>
                setTemplatesOpen(true)
              }
            >
              Modèles de pages
            </button>

            <select
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) {
                  handleAdd(
                    event.target.value
                  );

                  event.target.value = "";
                }
              }}
            >
              <option value="">
                + Ajouter un bloc
              </option>

              {registry.list().map(
                (manifest) => (
                  <option
                    key={manifest.type}
                    value={manifest.type}
                  >
                    {manifest.label}
                  </option>
                )
              )}
            </select>
          </div>

          <div className={styles.viewport}>
            <div
              className={styles.canvas}
              data-viewport={
                editor.viewport
              }
            >
              <DraggableCanvas
                editor={editor}
                registry={registry}
                selectedBlockIds={selectedBlockIds}
                onSelect={(blockId, options = {}) => {
                  if (options.range) {
                    setEditor(
                      selectRange(
                        editor,
                        blockId
                      )
                    );
                    return;
                  }

                  if (options.toggle) {
                    setEditor(
                      toggleSelection(
                        editor,
                        blockId
                      )
                    );
                    return;
                  }

                  setEditor(
                    selectBlock(
                      editor,
                      blockId
                    )
                  );
                }}
                onCommit={commit}
                onDuplicate={(blockId) =>
                  commit(
                    duplicateBlock(
                      editor,
                      blockId
                    )
                  )
                }
                onRemove={(blockId) =>
                  commit(
                    removeBlock(
                      editor,
                      blockId
                    )
                  )
                }
                renderBlock={(block) => (
                  <BlockPreview
                    block={block}
                    onInlineChange={(
                      field,
                      value,
                      options
                    ) =>
                      commit(
                        updateBlock(
                          editor,
                          block.id,
                          (current) =>
                            updateBlockContentField(
                              current,
                              field,
                              value,
                              options
                            )
                        )
                      )
                    }
                  />
                )}
              />
            </div>
          </div>
        </section>

        <aside className={styles.inspector}>
          <header>
            <strong>Inspecteur</strong>
            <small>
              {selectedCount > 1
                ? `${selectedCount} blocs`
                : selectedBlock
                  ? selectedBlock.type
                  : "Aucune sélection"}
            </small>
          </header>

          <BlockInspectorV3
            block={selectedBlock}
            selectedCount={selectedCount}
            onCommit={(nextBlock) =>
              commit(
                updateBlock(
                  editor,
                  nextBlock.id,
                  nextBlock
                )
              )
            }
          />
        </aside>
      </div>
      <TemplateLibraryModal
        open={templatesOpen}
        registry={templateRegistry}
        onClose={() =>
          setTemplatesOpen(false)
        }
        onApply={applyPageTemplate}
      />

      <PageSettingsModal
        open={pageSettingsOpen}
        editor={editor}
        site={site}
        onClose={() =>
          setPageSettingsOpen(false)
        }
        onApply={applyPageSettings}
      />

      <PagePreviewModal
        open={previewOpen}
        editor={editor}
        site={site}
        publishing={publishing}
        onClose={() =>
          setPreviewOpen(false)
        }
        onPublish={handlePublish}
      />

      <VersionHistoryModal
        open={historyOpen}
        currentPage={editor.page}
        versions={versions}
        loading={versionsLoading}
        restoringId={restoringVersionId}
        onClose={() =>
          setHistoryOpen(false)
        }
        onReload={loadVersionHistory}
        onRestore={handleVersionRollback}
      />

      <EditorialAssistantModal
        open={editorialOpen}
        editor={editor}
        site={site}
        onClose={() =>
          setEditorialOpen(false)
        }
        onApply={applyEditorialSuggestions}
      />

    </main>
  );
}
