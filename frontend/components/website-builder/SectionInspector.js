"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getInspectorDefinition,
} from "../../lib/website-builder/inspector-registry";
import {
  fetchPublishedDestinations,
  fetchPublishedInspirations,
} from "../../lib/page-builder-v2/page-builder-api";

function FieldControl({
  field,
  value,
  onChange,
}) {
  if (field.control === "textarea") {
    return (
      <textarea
        rows={field.rows || 4}
        value={value || ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    );
  }

  if (field.control === "select") {
    return (
      <select
        value={value || ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {(field.options || []).map(
          ([optionValue, optionLabel]) => (
            <option
              key={optionValue}
              value={optionValue}
            >
              {optionLabel}
            </option>
          )
        )}
      </select>
    );
  }

  if (field.control === "range") {
    return (
      <div className="wb-range-field">
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={field.step}
          value={value ?? field.min}
          onChange={(event) =>
            onChange(Number(event.target.value))
          }
        />

        <span>{value ?? field.min} %</span>
      </div>
    );
  }

  return (
    <input
      type={field.control === "url" ? "url" : "text"}
      value={value || ""}
      onChange={(event) =>
        onChange(event.target.value)
      }
    />
  );
}

function CollectionEditor({
  definition,
  items,
  onChange,
}) {
  const currentItems = Array.isArray(items)
    ? items
    : [];

  function addItem() {
    const emptyItem = Object.fromEntries(
      definition.fields.map((field) => [
        field.key,
        "",
      ])
    );

    onChange([
      ...currentItems,
      emptyItem,
    ]);
  }

  function updateItem(index, key, value) {
    onChange(
      currentItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item
      )
    );
  }

  function removeItem(index) {
    onChange(
      currentItems.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );
  }

  function moveItem(index, direction) {
    const targetIndex = index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >= currentItems.length
    ) {
      return;
    }

    const copy = [...currentItems];

    [copy[index], copy[targetIndex]] = [
      copy[targetIndex],
      copy[index],
    ];

    onChange(copy);
  }

  return (
    <div className="wb-collection-editor">
      <div className="wb-collection-heading">
        <strong>{definition.label}</strong>

        <button
          type="button"
          onClick={addItem}
        >
          + Ajouter
        </button>
      </div>

      {currentItems.map((item, index) => (
        <section
          className="wb-collection-item"
          key={item.id || index}
        >
          <div className="wb-collection-item-heading">
            <strong>
              {definition.itemLabel} {index + 1}
            </strong>

            <div>
              <button
                type="button"
                disabled={index === 0}
                onClick={() =>
                  moveItem(index, -1)
                }
              >
                ↑
              </button>

              <button
                type="button"
                disabled={
                  index ===
                  currentItems.length - 1
                }
                onClick={() =>
                  moveItem(index, 1)
                }
              >
                ↓
              </button>

              <button
                type="button"
                className="wb-collection-delete"
                onClick={() =>
                  removeItem(index)
                }
              >
                Supprimer
              </button>
            </div>
          </div>

          {definition.fields.map((field) => (
            <label key={field.key}>
              {field.label}

              <FieldControl
                field={field}
                value={item[field.key]}
                onChange={(value) =>
                  updateItem(
                    index,
                    field.key,
                    value
                  )
                }
              />
            </label>
          ))}
        </section>
      ))}

      {!currentItems.length ? (
        <div className="wb-collection-empty">
          Aucun élément. Clique sur « Ajouter ».
        </div>
      ) : null}
    </div>
  );
}

function DestinationReferenceSelector({
  selectedIds,
  onChange,
}) {
  const [destinations, setDestinations] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState(null);

  useEffect(() => {
    let active = true;

    async function loadDestinations() {
      try {
        setLoading(true);
        setError(null);

        const items =
          await fetchPublishedDestinations();

        if (active) {
          setDestinations(items);
        }
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

    loadDestinations();

    return () => {
      active = false;
    };
  }, []);

  const currentIds = Array.isArray(selectedIds)
    ? selectedIds.map(String)
    : [];

  function toggleDestination(id) {
    const normalizedId = String(id);

    if (currentIds.includes(normalizedId)) {
      onChange(
        currentIds.filter(
          (entry) => entry !== normalizedId
        )
      );
      return;
    }

    onChange([
      ...currentIds,
      normalizedId,
    ]);
  }

  return (
    <div className="wb-collection-editor">
      <div className="wb-collection-heading">
        <strong>Destinations publiées</strong>
        <span>{currentIds.length} sélectionnée(s)</span>
      </div>

      {loading ? (
        <div className="wb-collection-empty">
          Chargement du référentiel destinations…
        </div>
      ) : null}

      {error ? (
        <div className="wb-collection-empty">
          {error}
        </div>
      ) : null}

      {!loading && !error && destinations.length ? (
        <div className="wb-destination-selector">
          {destinations.map((destination) => (
            <label
              key={destination.id}
              className="wb-destination-option"
            >
              <input
                type="checkbox"
                checked={currentIds.includes(
                  String(destination.id)
                )}
                onChange={() =>
                  toggleDestination(destination.id)
                }
              />

              <span>
                <strong>{destination.name}</strong>
                <small>
                  {[destination.country, destination.region]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </span>
            </label>
          ))}
        </div>
      ) : null}

      {!loading && !error && !destinations.length ? (
        <div className="wb-collection-empty">
          Aucune destination publiée n’est disponible.
        </div>
      ) : null}
    </div>
  );
}

function InspirationReferenceSelector({
  selectedIds,
  onChange,
}) {
  const [inspirations, setInspirations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadInspirations() {
      try {
        setLoading(true);
        setError(null);
        const items = await fetchPublishedInspirations({
          limit: 100,
          channel: "article",
        });

        if (active) {
          setInspirations(items);
        }
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

    loadInspirations();

    return () => {
      active = false;
    };
  }, []);

  const currentIds = Array.isArray(selectedIds)
    ? selectedIds.map(String)
    : [];

  function toggleInspiration(id) {
    const normalizedId = String(id);

    if (currentIds.includes(normalizedId)) {
      onChange(
        currentIds.filter(entry => entry !== normalizedId)
      );
      return;
    }

    onChange([...currentIds, normalizedId]);
  }

  return (
    <div className="wb-collection-editor">
      <div className="wb-collection-heading">
        <strong>Articles publiés</strong>
        <span>{currentIds.length} sélectionné(s)</span>
      </div>

      {loading ? (
        <div className="wb-collection-empty">
          Chargement du catalogue éditorial…
        </div>
      ) : null}

      {error ? (
        <div className="wb-collection-empty">
          {error}
        </div>
      ) : null}

      {!loading && !error && inspirations.length ? (
        <div className="wb-destination-selector">
          {inspirations.map((item) => (
            <label
              key={item.id}
              className="wb-destination-option"
            >
              <input
                type="checkbox"
                checked={currentIds.includes(String(item.id))}
                onChange={() => toggleInspiration(item.id)}
              />

              <span>
                <strong>{item.title}</strong>
                <small>
                  {[item.category, item.publishedAt]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </span>
            </label>
          ))}
        </div>
      ) : null}

      {!loading && !error && !inspirations.length ? (
        <div className="wb-collection-empty">
          Aucun article publié n’est disponible.
        </div>
      ) : null}
    </div>
  );
}

export default function SectionInspector({
  block,
  onRename,
  onSettingChange,
}) {
  if (!block) {
    return (
      <div className="wb-inspector-empty">
        Sélectionne un bloc dans le canevas pour
        modifier ses propriétés.
      </div>
    );
  }

  const definition =
    getInspectorDefinition(block.type);

  const destinationSource =
    block.type === "destinations"
      ? block.settings?.__dataSource || "travel-core"
      : null;

  const inspirationSource =
    block.type === "inspirations"
      ? block.settings?.__dataSource || "content-generation"
      : null;

  const inspirationSelectionMode =
    block.type === "inspirations"
      ? block.settings?.selectionMode || "automatic"
      : null;

  return (
    <div className="wb-inspector-form">
      <label>
        Nom interne
        <input
          value={block.label || ""}
          onChange={(event) =>
            onRename(event.target.value)
          }
        />
      </label>

      {definition.fields.map((field) => (
        <label key={field.key}>
          {field.label}

          <FieldControl
            field={field}
            value={
              field.key === "__dataSource" &&
              block.type === "destinations"
                ? destinationSource
                : field.key === "__dataSource" &&
                  block.type === "inspirations"
                  ? inspirationSource
                  : field.key === "selectionMode" &&
                    block.type === "inspirations"
                    ? inspirationSelectionMode
                    : block.settings?.[field.key]
            }
            onChange={(value) =>
              onSettingChange(
                field.key,
                value
              )
            }
          />
        </label>
      ))}

      {block.type === "destinations" &&
      destinationSource === "travel-core" ? (
        <DestinationReferenceSelector
          selectedIds={
            block.settings?.destinationIds
          }
          onChange={(destinationIds) =>
            onSettingChange(
              "destinationIds",
              destinationIds
            )
          }
        />
      ) : null}

      {block.type === "inspirations" &&
      inspirationSource === "content-generation" &&
      inspirationSelectionMode === "manual" ? (
        <InspirationReferenceSelector
          selectedIds={block.settings?.contentIds}
          onChange={(contentIds) =>
            onSettingChange("contentIds", contentIds)
          }
        />
      ) : null}

      {definition.collection &&
      !(
        (
          block.type === "offers" &&
          block.settings?.__dataSource === "campaigns"
        ) ||
        (
          block.type === "reviews" &&
          block.settings?.__dataSource === "google-reviews"
        ) ||
        (
          block.type === "destinations" &&
          destinationSource === "travel-core"
        ) ||
        (
          block.type === "inspirations" &&
          inspirationSource === "content-generation"
        )
      ) ? (
        <CollectionEditor
          definition={definition.collection}
          items={
            block.settings?.[
              definition.collection.key
            ]
          }
          onChange={(items) =>
            onSettingChange(
              definition.collection.key,
              items
            )
          }
        />
      ) : null}

      {block.settings?.__dataSource ||
      destinationSource === "travel-core" ||
      inspirationSource === "content-generation" ? (
        <div className="wb-data-source-panel">
          <strong>Source automatique</strong>

          <span>
            {destinationSource ||
              inspirationSource ||
              block.settings.__dataSource}
          </span>

          <p>
            {block.type === "offers" &&
            block.settings.__dataSource === "campaigns"
              ? "Les offres approuvées du Campaign Manager alimentent automatiquement ce bloc."
              : block.type === "reviews" &&
                block.settings.__dataSource === "google-reviews"
                ? "Les avis Google publiés de cette agence alimentent automatiquement ce bloc."
                : block.type === "destinations" &&
                  destinationSource === "travel-core"
                  ? "Les destinations publiées du Destination Engine alimentent automatiquement ce bloc."
                  : block.type === "inspirations" &&
                    inspirationSource === "content-generation"
                    ? inspirationSelectionMode === "manual"
                      ? "Le bloc utilise uniquement les articles publiés sélectionnés dans le catalogue éditorial."
                      : "Les articles publiés les plus récents du moteur de contenu alimentent automatiquement ce bloc."
                    : "Cette section utilise une source de données automatique."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
