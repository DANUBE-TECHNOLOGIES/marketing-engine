"use client";

import {
  useMemo,
  useState,
} from "react";

import styles from "./VisualBuilderV3.module.css";

import {
  classifyVersionReason,
  comparePageVersions,
  normalizeVersionItem,
} from "../../lib/page-builder-v3/index.mjs";

function formatDate(value) {
  if (!value) {
    return "Date inconnue";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function VersionPreview({
  snapshot,
}) {
  return (
    <div
      className={
        styles.historySnapshot
      }
    >
      <header>
        <div>
          <strong>
            {snapshot.title ||
              "Page sans titre"}
          </strong>

          <small>
            /{snapshot.slug}
          </small>
        </div>

        <span>
          {snapshot.status}
        </span>
      </header>

      <div>
        {snapshot.blocks.map(
          (block, index) => (
            <article
              key={
                block.id ||
                index
              }
            >
              <span>
                {index + 1}
              </span>

              <div>
                <strong>
                  {block.type}
                </strong>

                <small>
                  {block.content
                    ?.title ||
                    block.content
                      ?.question ||
                    "Bloc sans titre"}
                </small>
              </div>
            </article>
          )
        )}

        {!snapshot.blocks.length ? (
          <p>
            Cette version ne contient
            aucun bloc.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function VersionHistoryModal({
  open,
  currentPage,
  versions,
  loading,
  restoringId,
  onClose,
  onReload,
  onRestore,
}) {
  const normalized =
    useMemo(
      () =>
        versions.map(
          normalizeVersionItem
        ),
      [versions]
    );

  const [selectedId, setSelectedId] =
    useState(null);

  const selected =
    normalized.find(
      (version) =>
        version.id ===
        selectedId
    ) ||
    normalized[0] ||
    null;

  const comparison =
    useMemo(
      () =>
        selected
          ? comparePageVersions(
              currentPage,
              selected.snapshot
            )
          : null,
      [currentPage, selected]
    );

  if (!open) {
    return null;
  }

  return (
    <div
      className={
        styles.historyBackdrop
      }
      onMouseDown={onClose}
    >
      <section
        className={
          styles.historyModalV3
        }
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header>
          <div>
            <h2>
              Historique de la page
            </h2>

            <p>
              Consultez et restaurez une
              sauvegarde serveur.
            </p>
          </div>

          <nav>
            <button
              type="button"
              onClick={onReload}
              disabled={loading}
            >
              Actualiser
            </button>

            <button
              type="button"
              onClick={onClose}
            >
              ×
            </button>
          </nav>
        </header>

        <div
          className={
            styles.historyWorkspace
          }
        >
          <aside>
            {loading ? (
              <div
                className={
                  styles.historyLoading
                }
              >
                Chargement de
                l’historique…
              </div>
            ) : null}

            {!loading &&
            !normalized.length ? (
              <div
                className={
                  styles.historyLoading
                }
              >
                <strong>
                  Aucune version
                </strong>

                <p>
                  Sauvegardez la page pour
                  créer une première version.
                </p>
              </div>
            ) : null}

            {!loading
              ? normalized.map(
                  (
                    version,
                    index
                  ) => {
                    const category =
                      classifyVersionReason(
                        version.reason
                      );

                    return (
                      <button
                        type="button"
                        key={
                          version.id
                        }
                        data-active={
                          selected?.id ===
                          version.id
                        }
                        onClick={() =>
                          setSelectedId(
                            version.id
                          )
                        }
                      >
                        <span
                          data-category={
                            category
                          }
                        >
                          {category ===
                          "publication"
                            ? "P"
                            : category ===
                                "rollback"
                              ? "R"
                              : category ===
                                  "autosave"
                                ? "A"
                                : "S"}
                        </span>

                        <div>
                          <strong>
                            {index === 0
                              ? "Version la plus récente"
                              : `Version ${version.version}`}
                          </strong>

                          <small>
                            {formatDate(
                              version.createdAt
                            )}
                          </small>

                          <em>
                            {version.reason}
                          </em>
                        </div>
                      </button>
                    );
                  }
                )
              : null}
          </aside>

          <main>
            {!selected ||
            !comparison ? (
              <div
                className={
                  styles.historyEmpty
                }
              >
                Sélectionnez une version.
              </div>
            ) : (
              <>
                <div
                  className={
                    styles.historyComparison
                  }
                >
                  <article
                    data-kind="added"
                  >
                    <strong>
                      {
                        comparison
                          .summary
                          .added
                      }
                    </strong>
                    <span>
                      bloc(s) ajouté(s)
                    </span>
                  </article>

                  <article
                    data-kind="removed"
                  >
                    <strong>
                      {
                        comparison
                          .summary
                          .removed
                      }
                    </strong>
                    <span>
                      bloc(s) supprimé(s)
                    </span>
                  </article>

                  <article
                    data-kind="modified"
                  >
                    <strong>
                      {
                        comparison
                          .summary
                          .modified
                      }
                    </strong>
                    <span>
                      bloc(s) modifié(s)
                    </span>
                  </article>

                  <article
                    data-kind="metadata"
                  >
                    <strong>
                      {
                        comparison
                          .summary
                          .metadata
                      }
                    </strong>
                    <span>
                      réglage(s) modifié(s)
                    </span>
                  </article>
                </div>

                <VersionPreview
                  snapshot={
                    selected.snapshot
                  }
                />

                {comparison.metadata
                  .length ? (
                    <section
                      className={
                        styles.historyMetadata
                      }
                    >
                      <h3>
                        Réglages différents
                      </h3>

                      {comparison.metadata.map(
                        (item) => (
                          <article
                            key={
                              item.field
                            }
                          >
                            <strong>
                              {item.field}
                            </strong>

                            <span>
                              {String(
                                item.current ||
                                "—"
                              )}
                            </span>

                            <span>
                              →
                            </span>

                            <span>
                              {String(
                                item.target ||
                                "—"
                              )}
                            </span>
                          </article>
                        )
                      )}
                    </section>
                  ) : null}
              </>
            )}
          </main>
        </div>

        <footer>
          <p>
            La version actuelle sera
            conservée avant toute
            restauration.
          </p>

          <button
            type="button"
            onClick={onClose}
          >
            Fermer
          </button>

          <button
            type="button"
            className={
              styles.historyRestoreButton
            }
            disabled={
              !selected ||
              restoringId ===
                selected.id
            }
            onClick={() =>
              onRestore(
                selected.id
              )
            }
          >
            {restoringId ===
            selected?.id
              ? "Restauration…"
              : "Restaurer cette version"}
          </button>
        </footer>
      </section>
    </div>
  );
}
