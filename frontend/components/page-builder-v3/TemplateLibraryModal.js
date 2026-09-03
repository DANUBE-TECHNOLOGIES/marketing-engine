"use client";

import {
  useMemo,
  useState,
} from "react";

import styles from "./VisualBuilderV3.module.css";

export default function TemplateLibraryModal({
  open,
  registry,
  onClose,
  onApply,
}) {
  const [query, setQuery] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [selectedId, setSelectedId] =
    useState(null);

  const [destination, setDestination] =
    useState("");

  const [agency, setAgency] =
    useState("");

  const [mode, setMode] =
    useState("replace");

  const templates = useMemo(
    () =>
      registry.list({
        query,
        category:
          category || undefined,
      }),
    [registry, query, category]
  );

  const selected =
    selectedId &&
    registry.has(selectedId)
      ? registry.get(selectedId)
      : null;

  if (!open) return null;

  function submit() {
    if (!selected) return;

    onApply(
      selected.id,
      {
        ...(destination.trim()
          ? {
              destination:
                destination.trim(),
            }
          : {}),
        ...(agency.trim()
          ? {
              agency:
                agency.trim(),
            }
          : {}),
      },
      mode
    );
  }

  return (
    <div
      className={styles.templateBackdrop}
      onMouseDown={onClose}
    >
      <section
        className={styles.templateModal}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header>
          <div>
            <h2>
              Modèles de pages
            </h2>
            <p>
              Créez rapidement une page
              spécialisée voyage.
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
            styles.templateWorkspace
          }
        >
          <aside
            className={
              styles.templateFilters
            }
          >
            <input
              type="search"
              value={query}
              placeholder="Rechercher un modèle"
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
            />

            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
            >
              <option value="">
                Toutes les catégories
              </option>

              {registry
                .categories()
                .map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
            </select>

            <div
              className={
                styles.templateList
              }
            >
              {templates.map(
                (template) => (
                  <button
                    type="button"
                    key={template.id}
                    data-active={
                      selectedId ===
                      template.id
                    }
                    onClick={() =>
                      setSelectedId(
                        template.id
                      )
                    }
                  >
                    <span>
                      {template.icon}
                    </span>

                    <span>
                      <strong>
                        {template.label}
                      </strong>

                      <small>
                        {template.category}
                      </small>
                    </span>
                  </button>
                )
              )}
            </div>
          </aside>

          <div
            className={
              styles.templatePreview
            }
          >
            {!selected ? (
              <div
                className={
                  styles.templateEmpty
                }
              >
                <span>▤</span>
                <h3>
                  Sélectionnez un modèle
                </h3>
                <p>
                  Sa structure apparaîtra ici
                  avant son insertion.
                </p>
              </div>
            ) : (
              <>
                <div
                  className={
                    styles.templateSummary
                  }
                >
                  <span>
                    {selected.icon}
                  </span>

                  <div>
                    <h3>
                      {selected.label}
                    </h3>
                    <p>
                      {
                        selected.description
                      }
                    </p>
                  </div>
                </div>

                <div
                  className={
                    styles.templateVariables
                  }
                >
                  <label>
                    <span>
                      Destination
                    </span>
                    <input
                      value={destination}
                      placeholder={
                        selected.variables
                          .destination ||
                        "Destination"
                      }
                      onChange={(event) =>
                        setDestination(
                          event.target
                            .value
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
                        selected.variables
                          .agency ||
                        "Votre agence"
                      }
                      onChange={(event) =>
                        setAgency(
                          event.target
                            .value
                        )
                      }
                    />
                  </label>
                </div>

                <div
                  className={
                    styles.templateMode
                  }
                >
                  <label>
                    <input
                      type="radio"
                      name="template-mode"
                      value="replace"
                      checked={
                        mode === "replace"
                      }
                      onChange={() =>
                        setMode("replace")
                      }
                    />

                    <span>
                      <strong>
                        Remplacer la page
                      </strong>
                      <small>
                        Efface les blocs actuels
                        et applique le modèle.
                      </small>
                    </span>
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="template-mode"
                      value="append"
                      checked={
                        mode === "append"
                      }
                      onChange={() =>
                        setMode("append")
                      }
                    />

                    <span>
                      <strong>
                        Ajouter à la suite
                      </strong>
                      <small>
                        Conserve les blocs déjà
                        présents.
                      </small>
                    </span>
                  </label>
                </div>

                <div
                  className={
                    styles.templateBlocks
                  }
                >
                  <h4>
                    Structure du modèle
                  </h4>

                  {selected.blocks.map(
                    (block, index) => (
                      <div
                        key={`${block.type}-${index}`}
                      >
                        <span>
                          {index + 1}
                        </span>
                        <strong>
                          {block.type}
                        </strong>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>
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
            disabled={!selected}
            onClick={submit}
          >
            Appliquer le modèle
          </button>
        </footer>
      </section>
    </div>
  );
}
