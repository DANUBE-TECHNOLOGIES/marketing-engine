"use client";

import styles from "./VisualPageBuilder.module.css";

function Field({ label, value, onChange, placeholder = "" }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function OptionalCtaEditor({
  label,
  value,
  onChange,
  defaultLabel = "En savoir plus",
  defaultHref = "#contact",
}) {
  const enabled = Boolean(value);

  return (
    <div className={styles.listEditor}>
      <label className={styles.toggleField}>
        <span>{label}</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            if (event.target.checked) {
              onChange({
                label: defaultLabel,
                href: defaultHref,
              });
            } else {
              onChange(null);
            }
          }}
        />
      </label>

      {enabled ? (
        <>
          <Field
            label="Texte du bouton"
            value={value?.label}
            onChange={(nextLabel) =>
              onChange({
                ...(value || {}),
                label: nextLabel,
              })
            }
          />

          <Field
            label="Lien du bouton"
            value={value?.href}
            placeholder="#contact"
            onChange={(href) =>
              onChange({
                ...(value || {}),
                href,
              })
            }
          />
        </>
      ) : null}
    </div>
  );
}
