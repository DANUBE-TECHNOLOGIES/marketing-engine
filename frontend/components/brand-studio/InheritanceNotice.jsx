"use client";

import React from "react";

export function InheritanceNotice({
  inherited,
  scope = "agency",
  onRemoveOverride,
  removing = false,
}) {
  if (
    scope !== "agency"
  ) {
    return null;
  }

  return (
    <section
      aria-live="polite"
      className="brand-studio-inheritance-notice"
    >
      <div>
        <strong>
          {inherited
            ? "Valeurs héritées de la société"
            : "Profil propre à l’agence"}
        </strong>

        <p>
          Les champs laissés vides utilisent automatiquement
          les paramètres communs de la société.
        </p>
      </div>

      {onRemoveOverride ? (
        <button
          type="button"
          onClick={
            onRemoveOverride
          }
          disabled={
            removing
          }
        >
          {removing
            ? "Suppression…"
            : "Supprimer la surcharge"}
        </button>
      ) : null}
    </section>
  );
}
