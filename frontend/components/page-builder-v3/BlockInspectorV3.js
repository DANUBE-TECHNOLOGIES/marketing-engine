"use client";

import {
  useState,
} from "react";

import styles from "./VisualBuilderV3.module.css";

import {
  addArrayItem,
  inspectorDefinition,
  moveArrayItem,
  normalizeInspectorUrl,
  removeArrayItem,
  updateArrayItem,
  updateBlockField,
} from "../../lib/page-builder-v3/index.mjs";

function TextField({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
  placeholder = "",
}) {
  return (
    <label className={styles.inspectorField}>
      <span>{label}</span>

      {multiline ? (
        <textarea
          value={value ?? ""}
          rows={4}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      ) : (
        <input
          type={type}
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

function SelectField({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <label className={styles.inspectorField}>
      <span>{label}</span>

      <select
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}) {
  return (
    <label className={styles.inspectorToggle}>
      <span>{label}</span>

      <input
        type="checkbox"
        checked={checked === true}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />
    </label>
  );
}

function InspectorSection({
  title,
  children,
  defaultOpen = true,
}) {
  return (
    <details
      className={styles.inspectorSection}
      open={defaultOpen}
    >
      <summary>{title}</summary>

      <div>
        {children}
      </div>
    </details>
  );
}

function ItemToolbar({
  index,
  count,
  onMove,
  onDelete,
}) {
  return (
    <header className={styles.inspectorItemToolbar}>
      <strong>
        Élément {index + 1}
      </strong>

      <span>
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          ↑
        </button>

        <button
          type="button"
          disabled={
            index === count - 1
          }
          onClick={() => onMove(1)}
        >
          ↓
        </button>

        <button
          type="button"
          onClick={onDelete}
        >
          ×
        </button>
      </span>
    </header>
  );
}

function CtaFields({
  content,
  update,
}) {
  const primary =
    content.primaryCta || {};

  const secondary =
    content.secondaryCta || {};

  return (
    <>
      <TextField
        label="Libellé du bouton principal"
        value={primary.label}
        onChange={(label) =>
          update(
            "primaryCta.label",
            label
          )
        }
      />

      <TextField
        label="Lien du bouton principal"
        value={primary.href}
        placeholder="#contact"
        onChange={(href) =>
          update(
            "primaryCta.href",
            href
          )
        }
      />

      <TextField
        label="Libellé secondaire"
        value={secondary.label}
        onChange={(label) =>
          update(
            "secondaryCta.label",
            label
          )
        }
      />

      <TextField
        label="Lien secondaire"
        value={secondary.href}
        onChange={(href) =>
          update(
            "secondaryCta.href",
            href
          )
        }
      />
    </>
  );
}

function FaqItems({
  block,
  commit,
}) {
  const items = Array.isArray(
    block.content?.items
  )
    ? block.content.items
    : [];

  return (
    <>
      {items.map((item, index) => (
        <article
          className={styles.inspectorItem}
          key={`${index}-${item.question}`}
        >
          <ItemToolbar
            index={index}
            count={items.length}
            onMove={(direction) =>
              commit(
                moveArrayItem(
                  block,
                  "items",
                  index,
                  direction
                )
              )
            }
            onDelete={() =>
              commit(
                removeArrayItem(
                  block,
                  "items",
                  index
                )
              )
            }
          />

          <TextField
            label="Question"
            value={item.question}
            onChange={(question) =>
              commit(
                updateArrayItem(
                  block,
                  "items",
                  index,
                  {
                    question,
                  }
                )
              )
            }
          />

          <TextField
            label="Réponse"
            value={item.answer}
            multiline
            onChange={(answer) =>
              commit(
                updateArrayItem(
                  block,
                  "items",
                  index,
                  {
                    answer,
                  }
                )
              )
            }
          />
        </article>
      ))}

      <button
        type="button"
        className={styles.inspectorAddButton}
        onClick={() =>
          commit(
            addArrayItem(
              block,
              "items",
              {
                question:
                  "Nouvelle question",
                answer:
                  "Nouvelle réponse",
              }
            )
          )
        }
      >
        + Ajouter une question
      </button>
    </>
  );
}

function FeatureItems({
  block,
  commit,
}) {
  const items = Array.isArray(
    block.content?.items
  )
    ? block.content.items
    : [];

  return (
    <>
      {items.map((item, index) => (
        <article
          className={styles.inspectorItem}
          key={`${index}-${item.title}`}
        >
          <ItemToolbar
            index={index}
            count={items.length}
            onMove={(direction) =>
              commit(
                moveArrayItem(
                  block,
                  "items",
                  index,
                  direction
                )
              )
            }
            onDelete={() =>
              commit(
                removeArrayItem(
                  block,
                  "items",
                  index
                )
              )
            }
          />

          <TextField
            label="Icône"
            value={item.icon}
            onChange={(icon) =>
              commit(
                updateArrayItem(
                  block,
                  "items",
                  index,
                  {
                    icon,
                  }
                )
              )
            }
          />

          <TextField
            label="Titre"
            value={item.title}
            onChange={(title) =>
              commit(
                updateArrayItem(
                  block,
                  "items",
                  index,
                  {
                    title,
                  }
                )
              )
            }
          />

          <TextField
            label="Description"
            value={item.text}
            multiline
            onChange={(text) =>
              commit(
                updateArrayItem(
                  block,
                  "items",
                  index,
                  {
                    text,
                  }
                )
              )
            }
          />
        </article>
      ))}

      <button
        type="button"
        className={styles.inspectorAddButton}
        onClick={() =>
          commit(
            addArrayItem(
              block,
              "items",
              {
                icon: "✦",
                title:
                  "Nouveau point fort",
                text:
                  "Description du point fort.",
              }
            )
          )
        }
      >
        + Ajouter un point fort
      </button>
    </>
  );
}

function GalleryItems({
  block,
  commit,
  setError,
}) {
  const images = Array.isArray(
    block.content?.images
  )
    ? block.content.images
    : [];

  function updateUrl(
    index,
    value
  ) {
    try {
      const url =
        normalizeInspectorUrl(
          value,
          {
            allowAnchor: false,
            allowRelative: true,
          }
        );

      commit(
        updateArrayItem(
          block,
          "images",
          index,
          {
            url,
          }
        )
      );

      setError("");
    } catch (error) {
      setError(error.message);
    }
  }

  return (
    <>
      {images.map((image, index) => (
        <article
          className={styles.inspectorItem}
          key={`${index}-${image.url}`}
        >
          <ItemToolbar
            index={index}
            count={images.length}
            onMove={(direction) =>
              commit(
                moveArrayItem(
                  block,
                  "images",
                  index,
                  direction
                )
              )
            }
            onDelete={() =>
              commit(
                removeArrayItem(
                  block,
                  "images",
                  index
                )
              )
            }
          />

          {image.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.inspectorImagePreview}
              src={image.url}
              alt={image.alt || ""}
            />
          ) : null}

          <TextField
            label="URL de l’image"
            value={image.url}
            onChange={(url) =>
              commit(
                updateArrayItem(
                  block,
                  "images",
                  index,
                  {
                    url,
                  }
                )
              )
            }
          />

          <button
            type="button"
            className={styles.inspectorValidateUrl}
            onClick={() =>
              updateUrl(
                index,
                image.url
              )
            }
          >
            Valider l’URL
          </button>

          <TextField
            label="Texte alternatif"
            value={image.alt}
            onChange={(alt) =>
              commit(
                updateArrayItem(
                  block,
                  "images",
                  index,
                  {
                    alt,
                  }
                )
              )
            }
          />

          <TextField
            label="Légende"
            value={image.caption}
            multiline
            onChange={(caption) =>
              commit(
                updateArrayItem(
                  block,
                  "images",
                  index,
                  {
                    caption,
                  }
                )
              )
            }
          />
        </article>
      ))}

      <button
        type="button"
        className={styles.inspectorAddButton}
        onClick={() =>
          commit(
            addArrayItem(
              block,
              "images",
              {
                url: "",
                alt: "",
                caption: "",
              }
            )
          )
        }
      >
        + Ajouter une image
      </button>
    </>
  );
}

export default function BlockInspectorV3({
  block,
  selectedCount = 1,
  onCommit,
}) {
  const [error, setError] =
    useState("");

  if (!block) {
    return (
      <div className={styles.emptyInspector}>
        Sélectionnez un bloc pour
        l’éditer.
      </div>
    );
  }

  if (selectedCount > 1) {
    return (
      <div className={styles.emptyInspector}>
        <strong>
          {selectedCount} blocs sélectionnés
        </strong>

        <p>
          Utilisez les actions groupées de
          la barre supérieure.
        </p>
      </div>
    );
  }

  const definition =
    inspectorDefinition(
      block.type
    );

  const content =
    block.content || {};

  function commit(nextBlock) {
    onCommit(nextBlock);
  }

  function update(path, value) {
    commit(
      updateBlockField(
        block,
        path,
        value
      )
    );
  }

  return (
    <div className={styles.advancedInspector}>
      <div className={styles.inspectorIdentity}>
        <strong>
          {definition.title}
        </strong>

        <small>
          {block.type}
        </small>
      </div>

      {error ? (
        <div className={styles.inspectorError}>
          {error}

          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            ×
          </button>
        </div>
      ) : null}

      <InspectorSection title="Contenu">
        {"eyebrow" in content ? (
          <TextField
            label="Surtitre"
            value={content.eyebrow}
            onChange={(value) =>
              update(
                "eyebrow",
                value
              )
            }
          />
        ) : null}

        {"title" in content ? (
          <TextField
            label="Titre"
            value={content.title}
            onChange={(value) =>
              update(
                "title",
                value
              )
            }
          />
        ) : null}

        {"subtitle" in content ? (
          <TextField
            label="Sous-titre"
            value={content.subtitle}
            multiline
            onChange={(value) =>
              update(
                "subtitle",
                value
              )
            }
          />
        ) : null}

        {"text" in content ? (
          <TextField
            label="Texte"
            value={content.text}
            multiline
            onChange={(value) =>
              update(
                "text",
                value
              )
            }
          />
        ) : null}

        {"html" in content ? (
          <TextField
            label="Contenu HTML"
            value={content.html}
            multiline
            onChange={(value) =>
              update(
                "html",
                value
              )
            }
          />
        ) : null}

        {"alignment" in content ? (
          <SelectField
            label="Alignement"
            value={content.alignment}
            options={[
              {
                value: "left",
                label: "Gauche",
              },
              {
                value: "center",
                label: "Centre",
              },
              {
                value: "right",
                label: "Droite",
              },
            ]}
            onChange={(value) =>
              update(
                "alignment",
                value
              )
            }
          />
        ) : null}
      </InspectorSection>

      {[
        "hero",
        "image_text",
      ].includes(block.type) ? (
        <InspectorSection
          title="Image"
          defaultOpen={false}
        >
          <TextField
            label="URL de l’image"
            value={content.imageUrl}
            onChange={(value) =>
              update(
                "imageUrl",
                value
              )
            }
          />

          <TextField
            label="Texte alternatif"
            value={content.imageAlt}
            onChange={(value) =>
              update(
                "imageAlt",
                value
              )
            }
          />

          {block.type === "image_text" ? (
            <SelectField
              label="Position de l’image"
              value={
                content.imagePosition ||
                "left"
              }
              options={[
                {
                  value: "left",
                  label: "À gauche",
                },
                {
                  value: "right",
                  label: "À droite",
                },
              ]}
              onChange={(value) =>
                update(
                  "imagePosition",
                  value
                )
              }
            />
          ) : null}
        </InspectorSection>
      ) : null}

      {[
        "hero",
        "cta",
      ].includes(block.type) ? (
        <InspectorSection
          title="Boutons"
          defaultOpen={false}
        >
          <CtaFields
            content={content}
            update={update}
          />
        </InspectorSection>
      ) : null}

      {block.type === "faq" ? (
        <InspectorSection title="Questions">
          <FaqItems
            block={block}
            commit={commit}
          />
        </InspectorSection>
      ) : null}

      {block.type === "features" ? (
        <InspectorSection title="Points forts">
          <FeatureItems
            block={block}
            commit={commit}
          />
        </InspectorSection>
      ) : null}

      {block.type === "gallery" ? (
        <InspectorSection title="Images">
          <GalleryItems
            block={block}
            commit={commit}
            setError={setError}
          />
        </InspectorSection>
      ) : null}

      {block.type === "agency" ? (
        <InspectorSection title="Informations affichées">
          <ToggleField
            label="Adresse"
            checked={
              content.showAddress !==
              false
            }
            onChange={(value) =>
              update(
                "showAddress",
                value
              )
            }
          />

          <ToggleField
            label="Téléphone"
            checked={
              content.showPhone !==
              false
            }
            onChange={(value) =>
              update(
                "showPhone",
                value
              )
            }
          />

          <ToggleField
            label="E-mail"
            checked={
              content.showEmail !==
              false
            }
            onChange={(value) =>
              update(
                "showEmail",
                value
              )
            }
          />

          <ToggleField
            label="Horaires"
            checked={
              content.showHours !==
              false
            }
            onChange={(value) =>
              update(
                "showHours",
                value
              )
            }
          />

          <ToggleField
            label="Carte"
            checked={
              content.showMap === true
            }
            onChange={(value) =>
              update(
                "showMap",
                value
              )
            }
          />
        </InspectorSection>
      ) : null}

      <InspectorSection
        title="Affichage"
        defaultOpen={false}
      >
        <ToggleField
          label="Visible sur ordinateur"
          checked={
            block.visibleDesktop !==
            false
          }
          onChange={(value) =>
            commit({
              ...block,
              visibleDesktop: value,
            })
          }
        />

        <ToggleField
          label="Visible sur mobile"
          checked={
            block.visibleMobile !==
            false
          }
          onChange={(value) =>
            commit({
              ...block,
              visibleMobile: value,
            })
          }
        />

        <SelectField
          label="Statut du bloc"
          value={
            block.status || "draft"
          }
          options={[
            {
              value: "draft",
              label: "Brouillon",
            },
            {
              value: "review",
              label: "En révision",
            },
            {
              value: "published",
              label: "Publié",
            },
            {
              value: "archived",
              label: "Archivé",
            },
          ]}
          onChange={(status) =>
            commit({
              ...block,
              status,
            })
          }
        />
      </InspectorSection>
    </div>
  );
}
