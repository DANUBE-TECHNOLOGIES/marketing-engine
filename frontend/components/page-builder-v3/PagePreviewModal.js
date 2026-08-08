"use client";

import {
  useMemo,
  useState,
} from "react";

import styles from "./VisualBuilderV3.module.css";

import {
  validatePublication,
  visibleBlocksForViewport,
} from "../../lib/page-builder-v3/index.mjs";

function PreviewBlock({
  block,
}) {
  const content =
    block.content || {};

  if (block.type === "hero") {
    return (
      <section
        className={
          styles.previewHero
        }
      >
        {content.eyebrow ? (
          <small>
            {content.eyebrow}
          </small>
        ) : null}

        <h1>
          {content.title ||
            "Titre principal"}
        </h1>

        {content.subtitle ? (
          <p>
            {content.subtitle}
          </p>
        ) : null}

        {content.primaryCta?.label ? (
          <a
            href={
              content.primaryCta
                .href || "#"
            }
          >
            {
              content.primaryCta
                .label
            }
          </a>
        ) : null}
      </section>
    );
  }

  if (
    block.type === "rich_text"
  ) {
    return (
      <section
        className={
          styles.previewSection
        }
      >
        {content.title ? (
          <h2>
            {content.title}
          </h2>
        ) : null}

        <div
          dangerouslySetInnerHTML={{
            __html:
              content.html || "",
          }}
        />
      </section>
    );
  }

  if (
    block.type === "image_text"
  ) {
    return (
      <section
        className={
          styles.previewImageText
        }
        data-position={
          content.imagePosition ||
          "left"
        }
      >
        <div>
          {content.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                content.imageUrl
              }
              alt={
                content.imageAlt ||
                ""
              }
            />
          ) : (
            <span>
              Image
            </span>
          )}
        </div>

        <article>
          <h2>
            {content.title}
          </h2>
          <p>
            {content.text}
          </p>
        </article>
      </section>
    );
  }

  if (
    block.type === "features"
  ) {
    return (
      <section
        className={
          styles.previewSection
        }
      >
        <h2>
          {content.title ||
            "Les points forts"}
        </h2>

        <div
          className={
            styles.previewCards
          }
        >
          {(content.items || [])
            .map(
              (item, index) => (
                <article
                  key={index}
                >
                  <span>
                    {item.icon ||
                      "✦"}
                  </span>
                  <h3>
                    {item.title}
                  </h3>
                  <p>
                    {item.text}
                  </p>
                </article>
              )
            )}
        </div>
      </section>
    );
  }

  if (
    block.type === "gallery"
  ) {
    return (
      <section
        className={
          styles.previewSection
        }
      >
        <h2>
          {content.title ||
            "Galerie"}
        </h2>

        <div
          className={
            styles.previewGallery
          }
        >
          {(content.images || [])
            .map(
              (image, index) => (
                <figure
                  key={index}
                >
                  {image.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image.url}
                      alt={
                        image.alt ||
                        ""
                      }
                    />
                  ) : (
                    <span>
                      Image
                    </span>
                  )}

                  {image.caption ? (
                    <figcaption>
                      {
                        image.caption
                      }
                    </figcaption>
                  ) : null}
                </figure>
              )
            )}
        </div>
      </section>
    );
  }

  if (block.type === "faq") {
    return (
      <section
        className={
          styles.previewSection
        }
      >
        <h2>
          {content.title ||
            "Questions fréquentes"}
        </h2>

        {(content.items || [])
          .map(
            (item, index) => (
              <details
                key={index}
              >
                <summary>
                  {
                    item.question
                  }
                </summary>
                <p>
                  {item.answer}
                </p>
              </details>
            )
          )}
      </section>
    );
  }

  if (block.type === "cta") {
    return (
      <section
        className={
          styles.previewCta
        }
      >
        <h2>
          {content.title}
        </h2>

        <p>
          {content.text}
        </p>

        {content.primaryCta?.label ? (
          <a
            href={
              content.primaryCta
                .href || "#"
            }
          >
            {
              content.primaryCta
                .label
            }
          </a>
        ) : null}
      </section>
    );
  }

  if (
    block.type === "agency"
  ) {
    return (
      <section
        className={
          styles.previewAgency
        }
      >
        <h2>
          {content.title ||
            "Votre agence"}
        </h2>

        <p>
          Votre conseiller vous
          accompagne avant, pendant
          et après votre voyage.
        </p>
      </section>
    );
  }

  return null;
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
                    "mini-site.local"}
                  /
                  {editor.page.slug}
                </small>
              </div>

              <div
                className={
                  styles.previewPage
                }
              >
                {blocks.map(
                  (block) => (
                    <PreviewBlock
                      key={
                        block.id
                      }
                      block={
                        block
                      }
                    />
                  )
                )}

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
