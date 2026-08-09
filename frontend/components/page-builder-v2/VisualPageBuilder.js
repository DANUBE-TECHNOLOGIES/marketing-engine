"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "./VisualPageBuilder.module.css";
import PreviewCanvas from "./PreviewCanvas";

import {
  BLOCK_CATALOG,
  getBlockDefinition,
  groupBlockCatalog,
} from "../../lib/page-builder-v2/block-catalog";

import {
  createBlock,
  deepClone,
  reorderBlocks,
  updateBlockInPage,
} from "../../lib/page-builder-v2/page-builder-state";

import {
  fetchPageDetails,
  fetchSite,
  savePage,
} from "../../lib/page-builder-v2/page-builder-api";

import {
  readLocalDraft,
  removeLocalDraft,
  saveLocalDraft,
} from "../../lib/page-builder-v2/draft-storage";

import {
  FaqEditor,
  FeaturesEditor,
  GalleryEditor,
  StringListEditor,
  TestimonialsEditor,
} from "./BlockListEditors";

const HISTORY_LIMIT = 50;

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function BlockPreview({ block }) {
  const content = block.content || {};

  switch (block.type) {
    case "hero":
      return (
        <section
          className={styles.heroPreview}
          style={
            content.imageUrl
              ? {
                  backgroundImage:
                    `linear-gradient(90deg, rgba(10,20,35,.74), rgba(10,20,35,.25)), url("${content.imageUrl}")`,
                }
              : undefined
          }
        >
          <div>
            {content.eyebrow ? (
              <div className={styles.eyebrow}>
                {content.eyebrow}
              </div>
            ) : null}

            <h1>
              {content.title ||
                "Titre de la bannière"}
            </h1>

            {content.subtitle ? (
              <p>{content.subtitle}</p>
            ) : null}

            {content.primaryCta?.label ? (
              <button type="button">
                {content.primaryCta.label}
              </button>
            ) : null}
          </div>
        </section>
      );

    case "rich_text":
      return (
        <section className={styles.contentPreview}>
          {content.title ? <h2>{content.title}</h2> : null}
          <p>
            {stripHtml(content.html) ||
              "Ajoutez votre contenu éditorial."}
          </p>
        </section>
      );

    case "image_text":
      return (
        <section className={styles.imageTextPreview}>
          <div className={styles.previewImage}>
            {content.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.imageUrl}
                alt={content.imageAlt || ""}
              />
            ) : (
              <span>Image</span>
            )}
          </div>

          <div>
            <h2>{content.title || "Image et texte"}</h2>
            <p>{content.text}</p>
          </div>
        </section>
      );

    case "features":
      return (
        <section className={styles.contentPreview}>
          <h2>{content.title || "Les points forts"}</h2>
          <div className={styles.featureGrid}>
            {(content.items || []).map((item, index) => (
              <article key={`${item.title}-${index}`}>
                <strong>{item.icon || "✦"}</strong>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      );

    case "gallery":
      return (
        <section className={styles.contentPreview}>
          <h2>{content.title || "Galerie"}</h2>
          <div className={styles.galleryGrid}>
            {(content.images || []).length ? (
              content.images.map((image, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${image.url}-${index}`}
                  src={image.url}
                  alt={image.alt || ""}
                />
              ))
            ) : (
              <>
                <span>Image 1</span>
                <span>Image 2</span>
                <span>Image 3</span>
              </>
            )}
          </div>
        </section>
      );

    case "faq":
      return (
        <section className={styles.contentPreview}>
          <h2>{content.title || "Questions fréquentes"}</h2>

          <div className={styles.faqPreview}>
            {(content.items || []).map((item, index) => (
              <details
                key={`${item.question}-${index}`}
                open={index === 0}
              >
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      );

    case "cta":
      return (
        <section className={styles.ctaPreview}>
          <h2>{content.title}</h2>
          <p>{content.text}</p>
          <button type="button">
            {content.primaryCta?.label ||
              "Demander un devis"}
          </button>
        </section>
      );

    case "agency":
      return (
        <section className={styles.agencyPreview}>
          <div>
            <span>⌂</span>
            <h2>{content.title || "Votre agence"}</h2>
            <p>
              Retrouvez les coordonnées, horaires et moyens
              de contact de votre agence.
            </p>
          </div>
        </section>
      );

    case "offers":
      return (
        <section className={styles.contentPreview}>
          <h2>{content.title || "Nos offres"}</h2>
          <div className={styles.cardGrid}>
            {[1, 2, 3].map((item) => (
              <article key={item}>
                <div className={styles.cardImage}>Offre</div>
                <h3>Voyage sélectionné</h3>
                <p>À partir de 999 €</p>
              </article>
            ))}
          </div>
        </section>
      );

    case "destinations":
      return (
        <section className={styles.contentPreview}>
          <h2>
            {content.title || "À découvrir également"}
          </h2>
          <div className={styles.cardGrid}>
            {[1, 2, 3].map((item) => (
              <article key={item}>
                <div className={styles.cardImage}>
                  Destination
                </div>
                <h3>Destination associée</h3>
              </article>
            ))}
          </div>
        </section>
      );

    case "testimonials":
      return (
        <section className={styles.contentPreview}>
          <h2>
            {content.title || "Ils nous font confiance"}
          </h2>
          <blockquote>
            “Une équipe disponible et de très bons conseils.”
          </blockquote>
        </section>
      );

    case "separator":
      return (
        <div
          className={`${styles.separatorPreview} ${
            content.line ? styles.separatorLine : ""
          }`}
          data-size={content.size || "medium"}
        />
      );

    default:
      return (
        <section className={styles.contentPreview}>
          <strong>{block.type}</strong>
        </section>
      );
  }
}

function TextInput({
  label,
  value,
  onChange,
  multiline = false,
  placeholder = "",
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>

      {multiline ? (
        <textarea
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(event.target.value)
          }
          rows={5}
        />
      ) : (
        <input
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      )}
    </label>
  );
}

function ToggleInput({
  label,
  checked,
  onChange,
}) {
  return (
    <label className={styles.toggleField}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function BlockProperties({
  block,
  onContentChange,
  onStatusChange,
}) {
  if (!block) {
    return (
      <div className={styles.emptyPanel}>
        <strong>Aucun bloc sélectionné</strong>
        <p>
          Sélectionnez un bloc dans l’aperçu pour modifier
          ses propriétés.
        </p>
      </div>
    );
  }

  const definition = getBlockDefinition(block.type);
  const content = block.content || {};

  const set = (key, value) => {
    onContentChange({
      ...content,
      [key]: value,
    });
  };

  return (
    <div className={styles.propertiesContent}>
      <div className={styles.panelTitle}>
        <span>{definition?.icon || "□"}</span>
        <div>
          <strong>
            {definition?.label || block.type}
          </strong>
          <small>{block.type}</small>
        </div>
      </div>

      <label className={styles.field}>
        <span>Statut du bloc</span>
        <select
          value={block.status}
          onChange={(event) =>
            onStatusChange(event.target.value)
          }
        >
          <option value="draft">Brouillon</option>
          <option value="published">Publié</option>
          <option value="hidden">Masqué</option>
        </select>
      </label>

      {"eyebrow" in content ? (
        <TextInput
          label="Surtitre"
          value={content.eyebrow}
          onChange={(value) => set("eyebrow", value)}
        />
      ) : null}

      {"title" in content ? (
        <TextInput
          label="Titre"
          value={content.title}
          onChange={(value) => set("title", value)}
        />
      ) : null}

      {"subtitle" in content ? (
        <TextInput
          label="Sous-titre"
          value={content.subtitle}
          multiline
          onChange={(value) => set("subtitle", value)}
        />
      ) : null}

      {"text" in content ? (
        <TextInput
          label="Texte"
          value={content.text}
          multiline
          onChange={(value) => set("text", value)}
        />
      ) : null}

      {"introduction" in content ? (
        <TextInput
          label="Introduction"
          value={content.introduction}
          multiline
          onChange={(value) => set("introduction", value)}
        />
      ) : null}

      {"html" in content ? (
        <TextInput
          label="Contenu"
          value={stripHtml(content.html)}
          multiline
          onChange={(value) =>
            set(
              "html",
              `<p>${value
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replace(/\n+/g, "</p><p>")}</p>`
            )
          }
        />
      ) : null}

      {"imageUrl" in content ? (
        <>
          <TextInput
            label="URL de l’image"
            value={content.imageUrl}
            onChange={(value) => set("imageUrl", value)}
          />

          <TextInput
            label="Texte alternatif"
            value={content.imageAlt}
            onChange={(value) => set("imageAlt", value)}
          />
        </>
      ) : null}

      {"alignment" in content ? (
        <SelectInput
          label="Alignement"
          value={content.alignment || "left"}
          onChange={(value) => set("alignment", value)}
          options={[
            { value: "left", label: "Gauche" },
            { value: "center", label: "Centré" },
            { value: "right", label: "Droite" },
          ]}
        />
      ) : null}

      {"imagePosition" in content ? (
        <SelectInput
          label="Position de l’image"
          value={content.imagePosition || "left"}
          onChange={(value) => set("imagePosition", value)}
          options={[
            { value: "left", label: "À gauche" },
            { value: "right", label: "À droite" },
          ]}
        />
      ) : null}

      {"columns" in content ? (
        <SelectInput
          label="Nombre de colonnes"
          value={String(content.columns || 3)}
          onChange={(value) => set("columns", Number(value))}
          options={[
            { value: "1", label: "1 colonne" },
            { value: "2", label: "2 colonnes" },
            { value: "3", label: "3 colonnes" },
            { value: "4", label: "4 colonnes" },
          ]}
        />
      ) : null}

      {"limit" in content ? (
        <SelectInput
          label="Nombre maximum d’éléments"
          value={String(content.limit || 6)}
          onChange={(value) => set("limit", Number(value))}
          options={[
            { value: "3", label: "3 éléments" },
            { value: "6", label: "6 éléments" },
            { value: "9", label: "9 éléments" },
            { value: "12", label: "12 éléments" },
          ]}
        />
      ) : null}

      {block.type === "testimonials" &&
      "source" in content ? (
        <SelectInput
          label="Source des avis"
          value={content.source || "google"}
          onChange={(value) => set("source", value)}
          options={[
            { value: "google", label: "Avis Google" },
            { value: "manual", label: "Témoignages manuels" },
          ]}
        />
      ) : null}

      {block.type === "offers" ? (
        <SelectInput
          label="Source des offres"
          value={content.source || "campaign"}
          onChange={(value) => set("source", value)}
          options={[
            {
              value: "campaign",
              label: "Campagnes approuvées",
            },
            {
              value: "manual",
              label: "Sélection manuelle",
            },
          ]}
        />
      ) : null}

      {"size" in content ? (
        <SelectInput
          label="Espacement"
          value={content.size || "medium"}
          onChange={(value) => set("size", value)}
          options={[
            { value: "small", label: "Petit" },
            { value: "medium", label: "Moyen" },
            { value: "large", label: "Grand" },
          ]}
        />
      ) : null}

      {"line" in content ? (
        <ToggleInput
          label="Afficher une ligne"
          checked={content.line}
          onChange={(value) => set("line", value)}
        />
      ) : null}

      {content.primaryCta ? (
        <>
          <TextInput
            label="Texte du bouton"
            value={content.primaryCta.label}
            onChange={(value) =>
              set("primaryCta", {
                ...content.primaryCta,
                label: value,
              })
            }
          />

          <TextInput
            label="Lien du bouton"
            value={content.primaryCta.href}
            onChange={(value) =>
              set("primaryCta", {
                ...content.primaryCta,
                href: value,
              })
            }
          />
        </>
      ) : null}

      {"showAddress" in content ? (
        <>
          <ToggleInput
            label="Afficher l’adresse"
            checked={content.showAddress}
            onChange={(value) =>
              set("showAddress", value)
            }
          />
          <ToggleInput
            label="Afficher le téléphone"
            checked={content.showPhone}
            onChange={(value) =>
              set("showPhone", value)
            }
          />
          <ToggleInput
            label="Afficher l’e-mail"
            checked={content.showEmail}
            onChange={(value) =>
              set("showEmail", value)
            }
          />
          <ToggleInput
            label="Afficher les horaires"
            checked={content.showHours}
            onChange={(value) =>
              set("showHours", value)
            }
          />
          {"showMap" in content ? (
            <ToggleInput
              label="Afficher la carte"
              checked={content.showMap}
              onChange={(value) =>
                set("showMap", value)
              }
            />
          ) : null}
        </>
      ) : null}

      {block.type === "faq" ? (
        <FaqEditor
          items={content.items}
          onChange={(items) => set("items", items)}
        />
      ) : null}

      {block.type === "features" ? (
        <FeaturesEditor
          items={content.items}
          onChange={(items) => set("items", items)}
        />
      ) : null}

      {block.type === "gallery" ? (
        <GalleryEditor
          images={content.images}
          onChange={(images) => set("images", images)}
        />
      ) : null}

      {block.type === "testimonials" &&
      content.source === "manual" ? (
        <TestimonialsEditor
          items={content.items}
          onChange={(items) => set("items", items)}
        />
      ) : null}

      {block.type === "offers" &&
      content.source === "manual" ? (
        <StringListEditor
          items={content.offerIds}
          label="Identifiant de l’offre"
          addLabel="Ajouter une offre"
          onChange={(offerIds) =>
            set("offerIds", offerIds)
          }
        />
      ) : null}

      {block.type === "destinations" ? (
        <StringListEditor
          items={content.destinationIds}
          label="Identifiant de la destination"
          addLabel="Ajouter une destination"
          onChange={(destinationIds) =>
            set("destinationIds", destinationIds)
          }
        />
      ) : null}
    </div>
  );
}

export default function VisualPageBuilder({ siteId }) {
  const [site, setSite] = useState(null);
  const [activePageId, setActivePageId] = useState(null);
  const [selectedBlockId, setSelectedBlockId] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [pageSettingsOpen, setPageSettingsOpen] =
    useState(false);

  const [viewport, setViewport] = useState("desktop");
  const [dirty, setDirty] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);
  const [localSavedAt, setLocalSavedAt] = useState(null);
  const [draftNotice, setDraftNotice] = useState("");

  const historyRef = useRef([]);
  const futureRef = useRef([]);
  const initialLoadRef = useRef(true);
  const autosaveTimerRef = useRef(null);

  const catalogGroups = useMemo(
    () => groupBlockCatalog(),
    []
  );

  const activePage = useMemo(
    () =>
      site?.pages.find(
        (page) => page.id === activePageId
      ) || null,
    [site, activePageId]
  );

  const selectedBlock = useMemo(
    () =>
      activePage?.blocks.find(
        (block) => block.id === selectedBlockId
      ) || null,
    [activePage, selectedBlockId]
  );

  const pushHistory = useCallback((currentSite) => {
    if (!currentSite) return;

    historyRef.current.push(deepClone(currentSite));

    if (historyRef.current.length > HISTORY_LIMIT) {
      historyRef.current.shift();
    }

    futureRef.current = [];
  }, []);

  const commitSite = useCallback(
    (updater) => {
      setSite((current) => {
        if (!current) return current;

        pushHistory(current);
        setDirty(true);

        return typeof updater === "function"
          ? updater(deepClone(current))
          : updater;
      });
    },
    [pushHistory]
  );

  const undo = useCallback(() => {
    setSite((current) => {
      const previous = historyRef.current.pop();

      if (!previous || !current) return current;

      futureRef.current.push(deepClone(current));
      setDirty(true);

      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setSite((current) => {
      const next = futureRef.current.pop();

      if (!next || !current) return current;

      historyRef.current.push(deepClone(current));
      setDirty(true);

      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const loadedSite = await fetchSite(siteId);

        if (cancelled) return;

        let firstPage = loadedSite.pages[0] || null;

        if (firstPage) {
          const localDraft = readLocalDraft(
            loadedSite.id,
            firstPage.id
          );

          if (localDraft?.page) {
            firstPage = localDraft.page;

            loadedSite.pages = loadedSite.pages.map(
              (page) =>
                page.id === firstPage.id
                  ? firstPage
                  : page
            );

            setDraftNotice(
              "Un brouillon local a été restauré."
            );
            setDirty(true);
            setLocalSavedAt(localDraft.savedAt);
          }
        }

        setSite(loadedSite);
        initialLoadRef.current = false;

        setActivePageId(firstPage?.id || null);
        setSelectedBlockId(
          firstPage?.blocks?.[0]?.id || null
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.message ||
              "Impossible de charger le mini-site."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [siteId]);

  useEffect(() => {
    if (
      initialLoadRef.current ||
      !dirty ||
      !site ||
      !activePage
    ) {
      return undefined;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    setLocalSaving(true);

    autosaveTimerRef.current = setTimeout(() => {
      saveLocalDraft(site.id, activePage);

      const savedAt = new Date().toISOString();

      setLocalSavedAt(savedAt);
      setLocalSaving(false);
    }, 800);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [site, activePage, dirty]);

  useEffect(() => {
    const beforeUnload = (event) => {
      if (!dirty) return;

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
  }, [dirty]);

  const selectPage = useCallback(
    async (pageId) => {
      if (!site || pageId === activePageId) return;

      const page = site.pages.find(
        (item) => item.id === pageId
      );

      if (!page) return;

      setActivePageId(pageId);
      setSelectedBlockId(page.blocks?.[0]?.id || null);
      setLoadingPage(true);
      setError("");

      try {
        let detailedPage = await fetchPageDetails(
          site,
          page
        );

        const localDraft = readLocalDraft(
          site.id,
          pageId
        );

        if (localDraft?.page) {
          detailedPage = localDraft.page;
          setDraftNotice(
            "Le brouillon local de cette page a été restauré."
          );
          setDirty(true);
          setLocalSavedAt(localDraft.savedAt);
        } else {
          setDirty(false);
          setLocalSavedAt(null);
        }

        setSite((current) => ({
          ...current,
          pages: current.pages.map((item) =>
            item.id === pageId ? detailedPage : item
          ),
        }));

        setSelectedBlockId(
          detailedPage.blocks?.[0]?.id || null
        );
      } catch (pageError) {
        setError(
          pageError?.message ||
            "Impossible de charger la page."
        );
      } finally {
        setLoadingPage(false);
      }
    },
    [site, activePageId]
  );

  const updatePage = useCallback(
    (pageUpdater) => {
      if (!activePageId) return;

      commitSite((current) => ({
        ...current,
        pages: current.pages.map((page) =>
          page.id === activePageId
            ? pageUpdater(page)
            : page
        ),
      }));
    },
    [activePageId, commitSite]
  );

  const addBlock = useCallback(
    (type) => {
      if (!activePage) return;

      const definition = getBlockDefinition(type);

      if (
        definition?.singleton &&
        activePage.blocks.some(
          (block) => block.type === type
        )
      ) {
        setError(
          `Le bloc « ${definition.label} » existe déjà sur cette page.`
        );
        return;
      }

      const block = createBlock(
        type,
        activePage.blocks.length
      );

      updatePage((page) => ({
        ...page,
        blocks: reorderBlocks([
          ...page.blocks,
          block,
        ]),
      }));

      setSelectedBlockId(block.id);
      setLibraryOpen(false);
      setError("");
    },
    [activePage, updatePage]
  );

  const updateSelectedBlock = useCallback(
    (updater) => {
      if (!selectedBlockId) return;

      updatePage((page) =>
        updateBlockInPage(
          page,
          selectedBlockId,
          updater
        )
      );
    },
    [selectedBlockId, updatePage]
  );

  const moveBlock = useCallback(
    (blockId, direction) => {
      updatePage((page) => {
        const blocks = [...page.blocks];
        const index = blocks.findIndex(
          (block) => block.id === blockId
        );

        const targetIndex = index + direction;

        if (
          index < 0 ||
          targetIndex < 0 ||
          targetIndex >= blocks.length
        ) {
          return page;
        }

        [blocks[index], blocks[targetIndex]] = [
          blocks[targetIndex],
          blocks[index],
        ];

        return {
          ...page,
          blocks: reorderBlocks(blocks),
        };
      });
    },
    [updatePage]
  );

  const duplicateBlock = useCallback(
    (blockId) => {
      if (!activePage) return;

      const source = activePage.blocks.find(
        (block) => block.id === blockId
      );

      if (!source) return;

      const definition = getBlockDefinition(source.type);

      if (definition?.singleton) {
        setError(
          `Le bloc « ${definition.label} » ne peut pas être dupliqué.`
        );
        return;
      }

      const duplicate = {
        ...deepClone(source),
        id:
          typeof crypto !== "undefined" &&
          crypto.randomUUID
            ? `block-${crypto.randomUUID()}`
            : `block-${Date.now()}`,
      };

      updatePage((page) => {
        const blocks = [...page.blocks];
        const sourceIndex = blocks.findIndex(
          (block) => block.id === blockId
        );

        blocks.splice(sourceIndex + 1, 0, duplicate);

        return {
          ...page,
          blocks: reorderBlocks(blocks),
        };
      });

      setSelectedBlockId(duplicate.id);
    },
    [activePage, updatePage]
  );

  const deleteBlock = useCallback(
    (blockId) => {
      updatePage((page) => ({
        ...page,
        blocks: reorderBlocks(
          page.blocks.filter(
            (block) => block.id !== blockId
          )
        ),
      }));

      setSelectedBlockId(null);
    },
    [updatePage]
  );

  const handleSave = useCallback(async () => {
    if (!site || !activePage) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const savedPage = await savePage(
        site,
        activePage
      );

      setSite((current) => ({
        ...current,
        pages: current.pages.map((page) =>
          page.id === activePage.id
            ? {
                ...activePage,
                ...savedPage,
                blocks:
                  savedPage.blocks?.length
                    ? savedPage.blocks
                    : activePage.blocks,
              }
            : page
        ),
      }));

      historyRef.current = [];
      futureRef.current = [];

      removeLocalDraft(site.id, activePage.id);
      setDirty(false);
      setLocalSavedAt(null);
      setDraftNotice("");

      setNotice("Page sauvegardée sur le serveur.");
    } catch (saveError) {
      setError(
        saveError?.message ||
          "Impossible de sauvegarder la page."
      );
    } finally {
      setSaving(false);
    }
  }, [site, activePage]);

  if (loading) {
    return (
      <main className={styles.stateScreen}>
        <div className={styles.loader} />
        <h1>Chargement de l’éditeur</h1>
        <p>Préparation du mini-site…</p>
      </main>
    );
  }

  if (!site) {
    return (
      <main className={styles.stateScreen}>
        <span className={styles.errorIcon}>!</span>
        <h1>Mini-site indisponible</h1>
        <p>{error}</p>
        <a href="/website-builder">
          Retour aux mini-sites
        </a>
      </main>
    );
  }

  return (
    <main
      className={`${styles.builder} ${
        previewMode ? styles.previewMode : ""
      }`}
    >
      <header className={styles.toolbar}>
        <div className={styles.brand}>
          <a href="/website-builder">←</a>
          <div>
            <strong>{site.name}</strong>
            <small>
              {activePage?.title || "Aucune page"}
            </small>
          </div>
        </div>

        <div className={styles.toolbarActions}>
          <div
            className={styles.saveState}
            data-dirty={dirty ? "true" : "false"}
          >
            <i />

            <span>
              {saving
                ? "Sauvegarde serveur…"
                : localSaving
                  ? "Brouillon local…"
                  : dirty
                    ? localSavedAt
                      ? "Brouillon local sauvegardé"
                      : "Modifications non sauvegardées"
                    : "Sauvegardé"}
            </span>
          </div>

          <div className={styles.viewportSelector}>
            <button
              type="button"
              className={
                viewport === "desktop"
                  ? styles.activeViewport
                  : ""
              }
              onClick={() => setViewport("desktop")}
              title="Ordinateur"
            >
              ▱
            </button>

            <button
              type="button"
              className={
                viewport === "tablet"
                  ? styles.activeViewport
                  : ""
              }
              onClick={() => setViewport("tablet")}
              title="Tablette"
            >
              ▯
            </button>

            <button
              type="button"
              className={
                viewport === "mobile"
                  ? styles.activeViewport
                  : ""
              }
              onClick={() => setViewport("mobile")}
              title="Mobile"
            >
              ▯
            </button>
          </div>

          <button
            type="button"
            className={styles.iconButton}
            onClick={undo}
            title="Annuler"
          >
            ↶
          </button>

          <button
            type="button"
            className={styles.iconButton}
            onClick={redo}
            title="Rétablir"
          >
            ↷
          </button>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() =>
              setPageSettingsOpen(true)
            }
          >
            Réglages SEO
          </button>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() =>
              setPreviewMode((value) => !value)
            }
          >
            {previewMode
              ? "Quitter l’aperçu"
              : "Aperçu"}
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            disabled={saving || !activePage}
            onClick={handleSave}
          >
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </div>
      </header>

      {error || notice || draftNotice ? (
        <div
          className={
            error
              ? styles.errorBanner
              : styles.noticeBanner
          }
        >
          <span>{error || notice || draftNotice}</span>

          <button
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
              setDraftNotice("");
            }}
          >
            ×
          </button>
        </div>
      ) : null}

      <div className={styles.workspace}>
        <aside className={styles.pageSidebar}>
          <div className={styles.sidebarHeading}>
            <div>
              <strong>Pages</strong>
              <small>{site.pages.length} page(s)</small>
            </div>
          </div>

          <nav className={styles.pageList}>
            {site.pages.map((page) => (
              <button
                type="button"
                key={page.id}
                onClick={() => selectPage(page.id)}
                className={
                  page.id === activePageId
                    ? styles.activePage
                    : ""
                }
              >
                <span className={styles.pageIcon}>▤</span>

                <span>
                  <strong>{page.title}</strong>
                  <small>/{page.slug}</small>
                </span>

                <i data-status={page.status} />
              </button>
            ))}
          </nav>
        </aside>

        <section className={styles.canvasArea}>
          <div className={styles.canvasToolbar}>
            <div>
              <strong>
                {activePage?.title || "Page"}
              </strong>
              <span>
                {activePage?.blocks.length || 0} bloc(s)
              </span>
            </div>

            {!previewMode ? (
              <button
                type="button"
                className={styles.addButton}
                onClick={() => setLibraryOpen(true)}
              >
                + Ajouter un bloc
              </button>
            ) : null}
          </div>

          <div className={styles.canvasViewport}>
            <div
              className={`${styles.browserFrame} ${
                styles[`viewport_${viewport}`]
              }`}
            >
              <div className={styles.browserBar}>
                <span />
                <span />
                <span />
                <div>
                  /{site.slug}/{activePage?.slug}
                </div>
              </div>

              <div className={styles.pageCanvas}>
                <PreviewCanvas
                  previewMode={previewMode}
                  page={activePage}
                  site={site}
                >
                  {loadingPage ? (
                    <div className={styles.canvasLoading}>
                      Chargement de la page…
                    </div>
                  ) : null}

                  {!activePage?.blocks.length ? (
                    <div className={styles.emptyCanvas}>
                      <span>＋</span>
                      <h2>Cette page est vide</h2>
                      <p>
                        Ajoutez un premier bloc pour commencer
                        sa construction.
                      </p>
                      <button
                        type="button"
                        onClick={() => setLibraryOpen(true)}
                      >
                        Ajouter un bloc
                      </button>
                    </div>
                  ) : (
                    activePage.blocks.map(
                      (block, index) => (
                        <article
                          key={block.id}
                          className={`${styles.blockWrapper} ${
                            selectedBlockId === block.id
                              ? styles.selectedBlock
                              : ""
                          } ${
                            block.status === "hidden"
                              ? styles.hiddenBlock
                              : ""
                          }`}
                          onClick={() =>
                            !previewMode &&
                            setSelectedBlockId(block.id)
                          }
                        >
                          {!previewMode ? (
                            <div
                              className={styles.blockToolbar}
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                            >
                              <span>
                                {getBlockDefinition(block.type)
                                  ?.label || block.type}
                              </span>

                              <div>
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() =>
                                    moveBlock(block.id, -1)
                                  }
                                  title="Monter"
                                >
                                  ↑
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    index ===
                                    activePage.blocks.length - 1
                                  }
                                  onClick={() =>
                                    moveBlock(block.id, 1)
                                  }
                                  title="Descendre"
                                >
                                  ↓
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    duplicateBlock(block.id)
                                  }
                                  title="Dupliquer"
                                >
                                  ⧉
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteBlock(block.id)
                                  }
                                  title="Supprimer"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ) : null}

                          <BlockPreview block={block} />
                        </article>
                      )
                    )
                  )}
                </PreviewCanvas>
              </div>
            </div>
          </div>
        </section>

        <aside className={styles.propertiesPanel}>
          <div className={styles.sidebarHeading}>
            <div>
              <strong>Propriétés</strong>
              <small>Bloc sélectionné</small>
            </div>
          </div>

          <BlockProperties
            block={selectedBlock}
            onContentChange={(content) =>
              updateSelectedBlock((block) => ({
                ...block,
                content,
              }))
            }
            onStatusChange={(status) =>
              updateSelectedBlock((block) => ({
                ...block,
                status,
              }))
            }
          />
        </aside>
      </div>

      {pageSettingsOpen && activePage ? (
        <div
          className={styles.modalBackdrop}
          onMouseDown={() =>
            setPageSettingsOpen(false)
          }
        >
          <section
            className={styles.settingsModal}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <header>
              <div>
                <h2>Réglages de la page</h2>
                <p>
                  Informations éditoriales et SEO.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPageSettingsOpen(false)
                }
              >
                ×
              </button>
            </header>

            <div className={styles.settingsContent}>
              <TextInput
                label="Titre de la page"
                value={activePage.title}
                onChange={(title) =>
                  updatePage((page) => ({
                    ...page,
                    title,
                  }))
                }
              />

              <TextInput
                label="Slug"
                value={activePage.slug}
                onChange={(slug) =>
                  updatePage((page) => ({
                    ...page,
                    slug: slug
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, ""),
                  }))
                }
              />

              <label className={styles.field}>
                <span>Statut</span>

                <select
                  value={activePage.status}
                  onChange={(event) =>
                    updatePage((page) => ({
                      ...page,
                      status: event.target.value,
                    }))
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
              </label>

              <TextInput
                label="Titre SEO"
                value={activePage.seoTitle}
                onChange={(seoTitle) =>
                  updatePage((page) => ({
                    ...page,
                    seoTitle,
                  }))
                }
              />

              <div className={styles.characterCount}>
                <span>
                  {activePage.seoTitle.length}/60
                </span>

                <i
                  data-valid={
                    activePage.seoTitle.length >= 30 &&
                    activePage.seoTitle.length <= 60
                      ? "true"
                      : "false"
                  }
                />
              </div>

              <TextInput
                label="Méta-description"
                value={activePage.seoDescription}
                multiline
                onChange={(seoDescription) =>
                  updatePage((page) => ({
                    ...page,
                    seoDescription,
                  }))
                }
              />

              <div className={styles.characterCount}>
                <span>
                  {activePage.seoDescription.length}/160
                </span>

                <i
                  data-valid={
                    activePage.seoDescription.length >=
                      120 &&
                    activePage.seoDescription.length <=
                      160
                      ? "true"
                      : "false"
                  }
                />
              </div>

              <div className={styles.googlePreview}>
                <small>
                  {site.name}
                </small>

                <strong>
                  {activePage.seoTitle ||
                    activePage.title}
                </strong>

                <span>
                  /{site.slug}/{activePage.slug}
                </span>

                <p>
                  {activePage.seoDescription ||
                    "Ajoutez une méta-description pour améliorer la visibilité de cette page."}
                </p>
              </div>
            </div>

            <footer>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() =>
                  setPageSettingsOpen(false)
                }
              >
                Terminer
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {libraryOpen ? (
        <div
          className={styles.modalBackdrop}
          onMouseDown={() => setLibraryOpen(false)}
        >
          <section
            className={styles.libraryModal}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <header>
              <div>
                <h2>Ajouter un bloc</h2>
                <p>
                  Sélectionnez un composant à ajouter à la
                  page.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
              >
                ×
              </button>
            </header>

            <div className={styles.libraryContent}>
              {Object.entries(catalogGroups).map(
                ([category, blocks]) => (
                  <section key={category}>
                    <h3>{category}</h3>

                    <div className={styles.libraryGrid}>
                      {blocks.map((block) => {
                        const alreadyExists =
                          block.singleton &&
                          activePage?.blocks.some(
                            (item) =>
                              item.type === block.type
                          );

                        return (
                          <button
                            type="button"
                            key={block.type}
                            disabled={alreadyExists}
                            onClick={() =>
                              addBlock(block.type)
                            }
                          >
                            <span>{block.icon}</span>
                            <strong>{block.label}</strong>
                            <small>
                              {alreadyExists
                                ? "Déjà utilisé"
                                : block.type}
                            </small>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
