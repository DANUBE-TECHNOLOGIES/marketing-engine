"use client";

import {
  useCallback,
  useState,
} from "react";

import styles from "./VisualBuilderV3.module.css";

import {
  moveDirection,
  reorderBlocksByDrop,
} from "../../lib/page-builder-v3/index.mjs";

function DropZone({
  active,
  onDragEnter,
  onDragOver,
  onDrop,
}) {
  return (
    <div
      className={`${styles.dropZone} ${
        active ? styles.activeDropZone : ""
      }`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
      aria-hidden="true"
    >
      <span>Déposer ici</span>
    </div>
  );
}

export default function DraggableCanvas({
  editor,
  registry,
  selectedBlockIds,
  onSelect,
  onCommit,
  onDuplicate,
  onRemove,
  renderBlock,
}) {
  const [draggedId, setDraggedId] =
    useState(null);

  const [dropTarget, setDropTarget] =
    useState(null);

  const clearDrag = useCallback(() => {
    setDraggedId(null);
    setDropTarget(null);
  }, []);

  const commitDrop = useCallback(
    (targetId, position) => {
      if (
        !draggedId ||
        !targetId ||
        draggedId === targetId
      ) {
        clearDrag();
        return;
      }

      const blocks = reorderBlocksByDrop(
        editor.page.blocks,
        draggedId,
        targetId,
        position
      );

      onCommit({
        ...editor,
        page: {
          ...editor.page,
          blocks,
        },
        selection: {
          blockIds: [draggedId],
        },
        dirty: true,
        revision: editor.revision + 1,
      });

      clearDrag();
    },
    [
      draggedId,
      editor,
      onCommit,
      clearDrag,
    ]
  );

  const keyboardMove = useCallback(
    (event, blockId) => {
      if (!event.altKey) return;

      let direction = null;

      if (event.key === "ArrowUp") {
        direction = -1;
      }

      if (event.key === "ArrowDown") {
        direction = 1;
      }

      if (direction === null) return;

      event.preventDefault();
      event.stopPropagation();

      const blocks = moveDirection(
        editor.page.blocks,
        blockId,
        direction
      );

      onCommit({
        ...editor,
        page: {
          ...editor.page,
          blocks,
        },
        selection: {
          blockIds: [blockId],
        },
        dirty: true,
        revision: editor.revision + 1,
      });
    },
    [editor, onCommit]
  );

  if (!editor.page.blocks.length) {
    return (
      <div className={styles.emptyCanvas}>
        <h2>Cette page est vide</h2>
        <p>
          Ajoutez un bloc depuis la barre supérieure.
        </p>
      </div>
    );
  }

  return editor.page.blocks.map(
    (block, index) => {
      const manifest = registry.has(
        block.type
      )
        ? registry.get(block.type)
        : null;

      const movable =
        manifest?.capabilities?.movable !== false;

      const duplicable =
        manifest?.capabilities?.duplicable !== false;

      const deletable =
        manifest?.capabilities?.deletable !== false;

      const isDragged =
        draggedId === block.id;

      const selected =
        selectedBlockIds.includes(
          block.id
        );

      return (
        <div
          key={block.id}
          className={styles.dragGroup}
        >
          <DropZone
            active={
              dropTarget?.id === block.id &&
              dropTarget?.position === "before"
            }
            onDragEnter={(event) => {
              event.preventDefault();

              if (draggedId !== block.id) {
                setDropTarget({
                  id: block.id,
                  position: "before",
                });
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();

              event.dataTransfer.dropEffect =
                "move";
            }}
            onDrop={(event) => {
              event.preventDefault();

              commitDrop(
                block.id,
                "before"
              );
            }}
          />

          <article
            draggable={movable}
            tabIndex={0}
            aria-label={`Bloc ${
              manifest?.label || block.type
            }, position ${index + 1} sur ${
              editor.page.blocks.length
            }`}
            aria-grabbed={isDragged}
            aria-selected={selected}
            className={[
              selected
                ? styles.selected
                : "",
              isDragged
                ? styles.draggingBlock
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={(event) =>
              onSelect(block.id, {
                toggle:
                  event.metaKey ||
                  event.ctrlKey,
                range:
                  event.shiftKey,
              })
            }
            onKeyDown={(event) =>
              keyboardMove(
                event,
                block.id
              )
            }
            onDragStart={(event) => {
              if (!movable) {
                event.preventDefault();
                return;
              }

              setDraggedId(block.id);

              event.dataTransfer.effectAllowed =
                "move";

              event.dataTransfer.setData(
                "text/plain",
                block.id
              );

              requestAnimationFrame(() => {
                setDropTarget({
                  id: block.id,
                  position: "after",
                });
              });
            }}
            onDragEnd={clearDrag}
          >
            <div
              className={styles.blockTools}
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <span
                className={styles.dragHandle}
                title={
                  movable
                    ? "Déplacer le bloc"
                    : "Bloc non déplaçable"
                }
                aria-hidden="true"
              >
                ⠿
              </span>

              <strong>
                {manifest?.label ||
                  block.type}
              </strong>

              <span>
                <button
                  type="button"
                  disabled={
                    !movable ||
                    index === 0
                  }
                  onClick={() => {
                    const blocks =
                      moveDirection(
                        editor.page.blocks,
                        block.id,
                        -1
                      );

                    onCommit({
                      ...editor,
                      page: {
                        ...editor.page,
                        blocks,
                      },
                      selection: {
                        blockIds: [
                          block.id,
                        ],
                      },
                      dirty: true,
                      revision:
                        editor.revision + 1,
                    });
                  }}
                  title="Monter"
                >
                  ↑
                </button>

                <button
                  type="button"
                  disabled={
                    !movable ||
                    index ===
                      editor.page.blocks
                        .length -
                        1
                  }
                  onClick={() => {
                    const blocks =
                      moveDirection(
                        editor.page.blocks,
                        block.id,
                        1
                      );

                    onCommit({
                      ...editor,
                      page: {
                        ...editor.page,
                        blocks,
                      },
                      selection: {
                        blockIds: [
                          block.id,
                        ],
                      },
                      dirty: true,
                      revision:
                        editor.revision + 1,
                    });
                  }}
                  title="Descendre"
                >
                  ↓
                </button>

                <button
                  type="button"
                  disabled={!duplicable}
                  onClick={() =>
                    onDuplicate(block.id)
                  }
                  title="Dupliquer"
                >
                  ⧉
                </button>

                <button
                  type="button"
                  disabled={!deletable}
                  onClick={() =>
                    onRemove(block.id)
                  }
                  title="Supprimer"
                >
                  ×
                </button>
              </span>
            </div>

            {renderBlock(block)}
          </article>

          <DropZone
            active={
              dropTarget?.id === block.id &&
              dropTarget?.position === "after"
            }
            onDragEnter={(event) => {
              event.preventDefault();

              if (draggedId !== block.id) {
                setDropTarget({
                  id: block.id,
                  position: "after",
                });
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();

              event.dataTransfer.dropEffect =
                "move";
            }}
            onDrop={(event) => {
              event.preventDefault();

              commitDrop(
                block.id,
                "after"
              );
            }}
          />
        </div>
      );
    }
  );
}
