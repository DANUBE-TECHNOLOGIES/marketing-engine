"use client";

import {
  getInspectorDefinition,
} from "../../lib/website-builder/inspector-registry";

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
              block.settings?.[field.key]
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

      {definition.collection &&
      !(
        (
          block.type === "offers" &&
          block.settings?.__dataSource === "campaigns"
        ) ||
        (
          block.type === "reviews" &&
          block.settings?.__dataSource === "google-reviews"
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

      {block.settings?.__dataSource ? (
        <div className="wb-data-source-panel">
          <strong>Source automatique</strong>

          <span>
            {block.settings.__dataSource}
          </span>

          <p>
            {block.type === "offers" &&
            block.settings.__dataSource === "campaigns"
              ? "Les offres approuvées du Campaign Manager alimentent automatiquement ce bloc."
              : block.type === "reviews" &&
                block.settings.__dataSource === "google-reviews"
                ? "Les avis Google publiés de cette agence alimentent automatiquement ce bloc."
                : "Cette section utilise une source de données automatique."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
