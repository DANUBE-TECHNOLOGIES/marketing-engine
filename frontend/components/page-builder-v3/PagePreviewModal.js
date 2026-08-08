"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./VisualBuilderV3.module.css";
import PublicSiteSections from "../public-site/PublicSiteSections";

import {
  validatePublication,
  visibleBlocksForViewport,
} from "../../lib/page-builder-v3/index.mjs";

function toPublicPreviewPage(
  page,
  blocks
) {
  return {
    ...page,

    sections: blocks.map(
      (block, index) => ({
        id:
          block.id ||
          `preview-${index}`,

        sectionType:
          block.type ||
          "rich_text",

        status:
          block.status === "hidden"
            ? "hidden"
            : "draft",

        displayOrder:
          block.position ??
          index,

        jsonContent: {
          ...(block.content || {}),

          __builderType:
            block.type ||
            "rich_text",
        },
      })
    ),
  };
}

function runtimeCssVariables(
  payload
) {
  const variables =
    payload?.runtime?.brand
      ?.cssVariables;

  if (
    !variables ||
    typeof variables !== "object" ||
    Array.isArray(variables)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(variables)
      .filter(
        ([key, value]) =>
          /^--[a-zA-Z0-9_-]+$/.test(key) &&
          value !== null &&
          value !== undefined &&
          value !== ""
      )
      .map(
        ([key, value]) => [
          key,
          String(value),
        ]
      )
  );
}

export default function PagePreviewModal({
  open,
  editor,
  site,
  publishing = false,
  onClose,
  onPublish,
}) {
  const [viewport, setViewport] =
    useState("desktop");

  const [brandVariables, setBrandVariables] =
    useState({});

  const validation = useMemo(
    () =>
      editor?.page
        ? validatePublication(
            editor.page
          )
        : null,
    [editor?.page]
  );

  const blocks = useMemo(
    () =>
      editor?.page
        ? visibleBlocksForViewport(
            editor.page,
            viewport,
            {
              includeDrafts:
                true,
            }
          )
        : [],
    [
      editor?.page,
      viewport,
    ]
  );

  const previewPage = useMemo(
    () =>
      editor?.page
        ? toPublicPreviewPage(
            editor.page,
            blocks
          )
        : null,
    [
      editor?.page,
      blocks,
    ]
  );

  useEffect(() => {
    if (
      !open ||
      !site?.slug
    ) {
      setBrandVariables({});
      return;
    }

    let active = true;

    async function loadBrandRuntime() {
      try {
        const response =
          await fetch(
            `/api/public-brand-legal/sites/${encodeURIComponent(
              site.slug
            )}`,
            {
              headers: {
                accept:
                  "application/json",

                "x-tenant-slug":
                  "mondescale",
              },

              cache:
                "no-store",
            }
          );

        if (
          !response.ok
        ) {
          if (active) {
            setBrandVariables({});
          }

          return;
        }

        const payload =
          await response.json();

        if (active) {
          setBrandVariables(
            runtimeCssVariables(
              payload
            )
          );
        }
      } catch {
        if (active) {
          setBrandVariables({});
        }
      }
    }

    loadBrandRuntime();

    return () => {
      active = false;
    };
  }, [
    open,
    site?.slug,
  ]);

  if (
    !open ||
    !editor?.page ||
    !validation
  ) {
    return null;
  }

  return (
    <div
      className={
        styles.previewBackdrop
      }
    >
      <section
        className={
          styles.previewModal
        }
      >
        <header>
          <div>
            <strong>
              Prévisualisation
            </strong>

            <small>
              {editor.page.title}
            </small>
          </div>

          <nav>
            {[
              "desktop",
              "tablet",
              "mobile",
            ].map((item) => (
              <button
                type="button"
                key={item}
                data-active={
                  viewport === item
                }
                onClick={() =>
                  setViewport(item)
                }
              >
                {item === "desktop"
                  ? "Ordinateur"
                  : item ===
                      "tablet"
                    ? "Tablette"
                    : "Mobile"}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div
          className={
            styles.previewWorkspace
          }
        >
          <aside>
            <div
              className={
                styles.publishScore
              }
              data-allowed={
                validation.allowed
                  ? "true"
                  : "false"
              }
            >
              <strong>
                {
                  validation.audit
                    .score
                }
              </strong>
              <span>
                /100
              </span>
              <small>
                SEO
              </small>
            </div>

            <h3>
              Contrôle de publication
            </h3>

            {validation.allowed ? (
              <p
                className={
                  styles.publishAllowed
                }
              >
                La page peut être
                publiée.
              </p>
            ) : (
              <p
                className={
                  styles.publishBlocked
                }
              >
                La publication est
                bloquée.
              </p>
            )}

            {validation.blockers
              .map(
                (item) => (
                  <article
                    key={item.code}
                    data-level="blocker"
                  >
                    <strong>
                      Bloquant
                    </strong>
                    <p>
                      {item.message}
                    </p>
                  </article>
                )
              )}

            {validation.warnings
              .slice(0, 8)
              .map(
                (item) => (
                  <article
                    key={item.code}
                    data-level="warning"
                  >
                    <strong>
                      Recommandation
                    </strong>
                    <p>
                      {item.message}
                    </p>
                  </article>
                )
              )}
          </aside>

          <main>
            <div
              className={
                styles.previewDevice
              }
              data-viewport={
                viewport
              }
            >
              <div
                className={
                  styles.previewBrowser
                }
              >
                <span />
                <span />
                <span />

                <small>
                  {site?.domain ||
                    site?.customDomain ||
                    "agences.mondescale.com"}
                  /
                  {editor.page.slug}
                </small>
              </div>

              <div
                className={
                  styles.previewPage
                }
              >
                <div
                  className="public-site-shell"
                  style={
                    Object.keys(
                      brandVariables
                    ).length
                      ? brandVariables
                      : undefined
                  }
                >
                  {site &&
                  previewPage ? (
                    <PublicSiteSections
                      page={
                        previewPage
                      }
                      site={
                        site
                      }
                    />
                  ) : null}

                  {!blocks.length ? (
                    <div
                      className={
                        styles.previewEmpty
                      }
                    >
                      Aucun bloc visible
                      dans ce format.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </main>
        </div>

        <footer>
          <button
            type="button"
            onClick={onClose}
          >
            Retour à l’éditeur
          </button>

          <button
            type="button"
            className={
              styles.publishButton
            }
            disabled={
              publishing ||
              !validation.allowed
            }
            onClick={onPublish}
          >
            {publishing
              ? "Publication…"
              : "Publier la page"}
          </button>
        </footer>
      </section>
    </div>
  );
}
