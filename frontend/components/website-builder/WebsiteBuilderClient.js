"use client";

import { useEffect, useMemo, useState } from "react";
import SectionLibrary from "./SectionLibrary";
import SectionInspector from "./SectionInspector";
import {
  createSectionBlock,
} from "../../lib/website-builder/section-library";

const BLOCK_LIBRARY = [
  {
    type: "hero",
    label: "Hero",
    description: "Image, titre, accroche et appels à l’action",
    icon: "✦",
  },
  {
    type: "rich-text",
    label: "Texte",
    description: "Présentation éditoriale de l’agence",
    icon: "¶",
  },
  {
    type: "services",
    label: "Services",
    description: "Expertises et services de l’agence",
    icon: "▦",
  },
  {
    type: "team",
    label: "Équipe",
    description: "Conseillers et spécialités",
    icon: "●",
  },
  {
    type: "reviews",
    label: "Avis Google",
    description: "Note et derniers avis clients",
    icon: "★",
  },
  {
    type: "destinations",
    label: "Destinations",
    description: "Inspirations et destinations en avant",
    icon: "⌖",
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Questions fréquentes",
    icon: "?",
  },
  {
    type: "contact",
    label: "Contact",
    description: "Coordonnées et formulaire",
    icon: "✉",
  },
  {
    type: "map",
    label: "Carte",
    description: "Adresse, itinéraire et horaires",
    icon: "⌂",
  },
  {
    type: "cta",
    label: "Appel à l’action",
    description: "Devis ou prise de rendez-vous",
    icon: "→",
  },
];

const INITIAL_BLOCKS = [
  {
    id: "hero-home",
    type: "hero",
    label: "Hero principal",
    enabled: true,
    settings: {
      title: "Votre agence de voyages à Ozoir-la-Ferrière",
      subtitle:
        "Nos conseillers imaginent avec vous des voyages qui vous ressemblent.",
      primaryButton: "Demander un devis",
      secondaryButton: "Prendre rendez-vous",
    },
  },
  {
    id: "agency-presentation",
    type: "rich-text",
    label: "Présentation de l’agence",
    enabled: true,
    settings: {
      title: "Une agence proche de vous",
      text:
        "Notre équipe vous accompagne avant, pendant et après votre voyage.",
    },
  },
  {
    id: "agency-services",
    type: "services",
    label: "Nos services",
    enabled: true,
    settings: {
      title: "Un accompagnement complet",
    },
  },
  {
    id: "agency-team",
    type: "team",
    label: "Notre équipe",
    enabled: true,
    settings: {
      title: "Des conseillers passionnés",
    },
  },
  {
    id: "google-reviews",
    type: "reviews",
    label: "Avis Google",
    enabled: true,
    settings: {
      title: "Ils nous ont confié leurs voyages",
    },
  },
  {
    id: "agency-contact",
    type: "contact",
    label: "Contact et horaires",
    enabled: true,
    settings: {
      title: "Préparons votre prochain voyage",
    },
  },
];


function BlockPreview({ block }) {
  const title = block.settings?.title || block.label;

  if (block.type === "hero") {
    const backgroundImage =
      block.settings?.backgroundImage || "";

    const backgroundPosition =
      block.settings?.backgroundPosition || "center";

    const overlayOpacity =
      Number(block.settings?.overlayOpacity ?? 68) / 100;

    return (
      <div
        className="wb-preview wb-preview-hero"
        style={{
          backgroundImage: backgroundImage
            ? `linear-gradient(
                rgba(8, 31, 52, ${overlayOpacity}),
                rgba(8, 31, 52, ${overlayOpacity})
              ),
              url("${backgroundImage}")`
            : undefined,
          backgroundPosition,
        }}
      >
        <span className="wb-preview-kicker">Agence de voyages</span>
        <h2>{title}</h2>
        <p>{block.settings?.subtitle}</p>
        <div className="wb-preview-actions">
          <span>{block.settings?.primaryButton}</span>
          <span>{block.settings?.secondaryButton}</span>
        </div>
      </div>
    );
  }

  if (block.type === "reviews") {
    return (
      <div className="wb-preview wb-preview-reviews">
        <span className="wb-preview-stars">★★★★★</span>
        <h3>{title}</h3>
        <p>Les derniers avis Google apparaîtront ici.</p>
      </div>
    );
  }

  if (block.type === "team") {
    return (
      <div className="wb-preview">
        <h3>{title}</h3>
        <div className="wb-preview-team">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (block.type === "services") {
    return (
      <div className="wb-preview">
        <h3>{title}</h3>
        <div className="wb-preview-grid">
          <span>Voyages sur mesure</span>
          <span>Circuits</span>
          <span>Croisières</span>
        </div>
      </div>
    );
  }

  if (block.type === "contact" || block.type === "map") {
    return (
      <div className="wb-preview wb-preview-contact">
        <div>
          <h3>{title}</h3>
          <p>Adresse, téléphone, horaires et itinéraire.</p>
        </div>
        <span className="wb-map-placeholder">Carte</span>
      </div>
    );
  }

  return (
    <div className="wb-preview">
      <h3>{title}</h3>
      <p>
        {block.settings?.text ||
          "Le contenu de ce bloc sera affiché ici."}
      </p>
    </div>
  );
}

export default function WebsiteBuilderClient() {
  const [blocks, setBlocks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeLibraryCategory, setActiveLibraryCategory] =
    useState("all");

  const [sites, setSites] = useState([]);
  const [selectedAgencyId, setSelectedAgencyId] =
    useState(null);
  const [selectedPageSlug, setSelectedPageSlug] =
    useState("home");

  const selectedSite = useMemo(
    () =>
      sites.find(
        (site) =>
          String(site.agencyId) ===
          String(selectedAgencyId)
      ) || null,
    [sites, selectedAgencyId]
  );

  const agencyId = selectedAgencyId;
  const pageSlug = selectedPageSlug;

  useEffect(() => {
    let active = true;

    async function loadSites() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          "/api/website-builder/sites",
          {
            cache: "no-store",
          }
        );

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error?.debug?.message ||
            payload?.error?.message ||
            "Impossible de charger les mini-sites."
          );
        }

        const availableSites = Array.isArray(payload)
          ? payload.filter(
              (site) =>
                Number.isInteger(
                  Number(site.agencyId)
                )
            )
          : [];

        if (!active) {
          return;
        }

        setSites(availableSites);

        setSelectedAgencyId((current) => {
          if (
            current &&
            availableSites.some(
              (site) =>
                String(site.agencyId) ===
                String(current)
            )
          ) {
            return String(current);
          }

          return availableSites[0]?.agencyId !== undefined
            ? String(availableSites[0].agencyId)
            : null;
        });

        if (availableSites.length === 0) {
          setLoading(false);
          setError(
            "Aucun mini-site agence n’est disponible."
          );
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
          setLoading(false);
        }
      }
    }

    loadSites();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (
      !agencyId ||
      !pageSlug ||
      !Number.isInteger(Number(agencyId))
    ) {
      return;
    }

    let active = true;

    async function loadPage() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/website-builder/agencies/${agencyId}/pages/${pageSlug}`,
          {
            cache: "no-store",
          }
        );

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error?.debug?.message ||
            payload?.error?.message ||
            "Impossible de charger la page."
          );
        }

        const loadedBlocks = (payload.sections || []).map(
          (section) => ({
            id: section.id,
            type:
              section.jsonContent?.__builderType ||
              String(section.sectionType || "")
                .replace(/--\d+$/, ""),
            label:
              section.jsonContent?.title ||
              section.sectionType,
            templateId:
              section.jsonContent?.__templateId ||
              null,
            variant:
              section.jsonContent?.__variant ||
              null,
            enabled: section.status !== "hidden",
            settings: {
              ...(section.jsonContent || {}),
              title:
                section.jsonContent?.title ||
                section.sectionType,
            },
          })
        );

        if (!active) return;

        setBlocks(
          loadedBlocks.length
            ? loadedBlocks
            : INITIAL_BLOCKS
        );

        setSelectedId(
          (
            loadedBlocks.length
              ? loadedBlocks
              : INITIAL_BLOCKS
          )[0]?.id || null
        );
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

    loadPage();

    return () => {
      active = false;
    };
  }, [agencyId, pageSlug]);

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedId) || null,
    [blocks, selectedId]
  );

  function addBlock(definition) {
    const block = createSectionBlock(definition);
    setBlocks((current) => [...current, block]);
    setSelectedId(block.id);
  }

  function updateSelectedBlock(field, value) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === selectedId
          ? {
              ...block,
              settings: {
                ...block.settings,
                [field]: value,
              },
            }
          : block
      )
    );
  }

  function toggleBlock(id) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id
          ? { ...block, enabled: !block.enabled }
          : block
      )
    );
  }

  function moveBlock(id, direction) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === id);
      const targetIndex = index + direction;

      if (
        index < 0 ||
        targetIndex < 0 ||
        targetIndex >= current.length
      ) {
        return current;
      }

      const copy = [...current];
      [copy[index], copy[targetIndex]] = [
        copy[targetIndex],
        copy[index],
      ];

      return copy;
    });
  }

  function removeBlock(id) {
    setBlocks((current) => current.filter((block) => block.id !== id));

    if (selectedId === id) {
      setSelectedId(null);
    }
  }

  async function saveDraft() {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(
        `/api/website-builder/agencies/${agencyId}/pages/${pageSlug}`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sections: blocks.map((block) => ({
              sectionType: block.type,
              jsonContent: {
                ...block.settings,
                __builderType: block.type,
                __templateId:
                  block.templateId ||
                  block.settings?.__templateId ||
                  null,
                __variant:
                  block.variant ||
                  block.settings?.__variant ||
                  null,
                title:
                  block.settings?.title ||
                  block.label,
              },
              enabled: block.enabled,
            })),
          }),
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error?.debug?.message ||
          payload?.error?.message ||
          "Impossible d’enregistrer la page."
        );
      }

      const savedBlocks = (payload.sections || []).map(
        (section) => ({
          id: section.id,
          type:
            section.jsonContent?.__builderType ||
            String(section.sectionType || "")
              .replace(/--\d+$/, ""),
          label:
            section.jsonContent?.title ||
            section.sectionType,
          enabled: section.status !== "hidden",
          settings: {
            ...(section.jsonContent || {}),
            title:
              section.jsonContent?.title ||
              section.sectionType,
          },
        })
      );

      setBlocks(savedBlocks);

      setSelectedId((current) =>
        savedBlocks.some(
          (block) => block.id === current
        )
          ? current
          : savedBlocks[0]?.id || null
      );

      setSavedAt(
        new Intl.DateTimeFormat("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date())
      );
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="wb-shell">
      <header className="wb-topbar">
        <div className="wb-site-selector">
          <p className="wb-eyebrow">
            Mondescale Website Builder
          </p>

          <div className="wb-selector-row">
            <label>
              Agence
              <select
                value={selectedAgencyId || ""}
                onChange={(event) => {
                  setSelectedAgencyId(
                    event.target.value
                  );
                  setSelectedPageSlug("home");
                  setSavedAt(null);
                }}
              >
                {sites.map((site) => (
                  <option
                    key={site.id}
                    value={site.agencyId}
                  >
                    {site.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Page
              <select
                value={selectedPageSlug}
                onChange={(event) => {
                  setSelectedPageSlug(
                    event.target.value
                  );
                  setSavedAt(null);
                }}
              >
                {(selectedSite?.pages || []).map(
                  (page) => (
                    <option
                      key={page.id}
                      value={
                        page.slug === ""
                          ? "home"
                          : page.slug
                      }
                    >
                      {page.title}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>
        </div>

        <div className="wb-topbar-actions">
          {savedAt ? (
            <span className="wb-save-status">
              Brouillon enregistré à {savedAt}
            </span>
          ) : null}

          <a
            className="wb-button wb-button-secondary"
            href={
              selectedSite
                ? `/sites/${selectedSite.slug}${
                    pageSlug === "home"
                      ? ""
                      : `/${pageSlug}`
                  }`
                : "#"
            }
            target="_blank"
            rel="noreferrer"
          >
            Aperçu public
          </a>

          <button
            type="button"
            className="wb-button"
            onClick={saveDraft}
            disabled={saving || loading}
          >
            {saving
              ? "Enregistrement…"
              : "Enregistrer"}
          </button>
        </div>
      </header>

      {error ? (
        <div className="wb-error-banner">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="wb-loading">
          Chargement de la page d’accueil…
        </div>
      ) : (
      <div className="wb-workspace">
        <aside className="wb-sidebar">
          <div className="wb-panel-heading">
            <span>Blocs disponibles</span>
            <small>Bibliothèque premium</small>
          </div>

          <SectionLibrary
            activeCategory={activeLibraryCategory}
            onCategoryChange={setActiveLibraryCategory}
            onAdd={addBlock}
          />
        </aside>

        <main className="wb-canvas-column">
          <div className="wb-canvas-toolbar">
            <div>
              <strong>Accueil</strong>
              <span>{blocks.length} blocs</span>
            </div>

            <span className="wb-device-selector">
              Bureau · 1440 px
            </span>
          </div>

          <div className="wb-canvas">
            {blocks.map((block, index) => (
              <article
                key={block.id}
                className={[
                  "wb-canvas-block",
                  selectedId === block.id ? "is-selected" : "",
                  !block.enabled ? "is-disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSelectedId(block.id)}
              >
                <div className="wb-block-toolbar">
                  <div>
                    <span className="wb-drag-handle">⠿</span>
                    <strong>{block.label}</strong>
                    <small>{block.type}</small>
                  </div>

                  <div className="wb-block-actions">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(event) => {
                        event.stopPropagation();
                        moveBlock(block.id, -1);
                      }}
                      aria-label="Monter le bloc"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      disabled={index === blocks.length - 1}
                      onClick={(event) => {
                        event.stopPropagation();
                        moveBlock(block.id, 1);
                      }}
                      aria-label="Descendre le bloc"
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleBlock(block.id);
                      }}
                    >
                      {block.enabled ? "Masquer" : "Afficher"}
                    </button>

                    <button
                      type="button"
                      className="wb-delete-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeBlock(block.id);
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                <BlockPreview block={block} />
              </article>
            ))}

            {blocks.length === 0 ? (
              <div className="wb-empty-state">
                <strong>Cette page ne contient aucun bloc.</strong>
                <p>
                  Ajoute un premier bloc depuis la colonne de gauche.
                </p>
              </div>
            ) : null}
          </div>
        </main>

        <aside className="wb-inspector">
          <div className="wb-panel-heading">
            <span>Propriétés</span>

            <small>
              {selectedBlock
                ? selectedBlock.type
                : "Aucune sélection"}
            </small>
          </div>

          <SectionInspector
            block={selectedBlock}
            onRename={(label) =>
              setBlocks((current) =>
                current.map((block) =>
                  block.id === selectedId
                    ? {
                        ...block,
                        label,
                      }
                    : block
                )
              )
            }
            onSettingChange={
              updateSelectedBlock
            }
          />
        </aside>
      </div>
      )}
    </div>
  );
}
