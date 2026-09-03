"use client";

import {
  SECTION_CATEGORIES,
  SECTION_LIBRARY,
} from "../../lib/website-builder/section-library";

export default function SectionLibrary({
  activeCategory,
  onCategoryChange,
  onAdd,
}) {
  const visibleSections =
    activeCategory === "all"
      ? SECTION_LIBRARY
      : SECTION_LIBRARY.filter(
          (section) =>
            section.category === activeCategory
        );

  return (
    <div className="wb-section-library">
      <div className="wb-category-tabs">
        <button
          type="button"
          className={
            activeCategory === "all"
              ? "is-active"
              : ""
          }
          onClick={() =>
            onCategoryChange("all")
          }
        >
          Toutes
        </button>

        {SECTION_CATEGORIES.map((category) => (
          <button
            type="button"
            key={category.id}
            className={
              activeCategory === category.id
                ? "is-active"
                : ""
            }
            onClick={() =>
              onCategoryChange(category.id)
            }
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="wb-template-grid">
        {visibleSections.map((section) => (
          <button
            type="button"
            key={section.id}
            className={[
              "wb-template-card",
              section.featured
                ? "is-featured"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onAdd(section)}
          >
            <div
              className={`wb-template-preview wb-template-preview-${section.type}`}
            >
              <span className="wb-template-icon">
                {section.icon}
              </span>

              {section.featured ? (
                <span className="wb-template-badge">
                  Recommandé
                </span>
              ) : null}
            </div>

            <div className="wb-template-copy">
              <strong>{section.label}</strong>
              <small>{section.description}</small>

              {section.dataSource ? (
                <span className="wb-data-source">
                  Données automatiques
                </span>
              ) : null}
            </div>

            <span className="wb-template-add">
              +
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
