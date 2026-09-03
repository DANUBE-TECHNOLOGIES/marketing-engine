"use client";

import {
  PAGE_TEMPLATES,
} from "../../lib/website-builder/page-templates";

export default function TemplateLibrary({
  open,
  onClose,
  onApply,
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="wb-template-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="wb-template-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wb-template-title"
      >
        <header className="wb-template-modal-header">
          <div>
            <p className="wb-eyebrow">
              Template Engine
            </p>

            <h2 id="wb-template-title">
              Choisir un modèle de page
            </h2>

            <p>
              Le modèle remplacera la composition
              actuelle de la page.
            </p>
          </div>

          <button
            type="button"
            className="wb-template-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </header>

        <div className="wb-page-template-grid">
          {PAGE_TEMPLATES.map(
            (template) => (
              <article
                className={[
                  "wb-page-template-card",
                  template.featured
                    ? "is-featured"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={template.id}
              >
                <div
                  className="wb-page-template-cover"
                  style={{
                    "--template-primary":
                      template.palette.primary,
                    "--template-secondary":
                      template.palette.secondary,
                    "--template-accent":
                      template.palette.accent,
                  }}
                >
                  <span className="wb-page-template-icon">
                    {template.icon}
                  </span>

                  {template.featured ? (
                    <span className="wb-page-template-featured">
                      Recommandé
                    </span>
                  ) : null}

                  <div className="wb-page-template-wireframe">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>

                <div className="wb-page-template-content">
                  <h3>{template.name}</h3>

                  <p>
                    {template.description}
                  </p>

                  <div className="wb-page-template-meta">
                    <span>
                      {template.sections.length}
                      {" "}sections
                    </span>

                    <span className="wb-template-colors">
                      {Object.values(
                        template.palette
                      ).map((color) => (
                        <i
                          key={color}
                          style={{
                            backgroundColor:
                              color,
                          }}
                        />
                      ))}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onApply(template)
                    }
                  >
                    Appliquer ce modèle
                  </button>
                </div>
              </article>
            )
          )}
        </div>
      </section>
    </div>
  );
}
