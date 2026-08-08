"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./VisualBuilderV3.module.css";

import {
  normalizeInlineText,
} from "../../lib/page-builder-v3/index.mjs";

export default function InlineEditable({
  as: Component = "span",
  value = "",
  displayValue,
  multiline = false,
  maxLength = 5000,
  placeholder = "Cliquer pour modifier",
  className = "",
  onCommit,
}) {
  const elementRef = useRef(null);

  const [editing, setEditing] =
    useState(false);

  const [draft, setDraft] =
    useState(String(value ?? ""));

  useEffect(() => {
    if (!editing) {
      setDraft(
        String(value ?? "")
      );
    }
  }, [value, editing]);

  function beginEditing(event) {
    event.stopPropagation();

    setDraft(
      String(value ?? "")
    );

    setEditing(true);

    requestAnimationFrame(() => {
      const element =
        elementRef.current;

      if (!element) return;

      element.focus();

      const selection =
        window.getSelection();

      const range =
        document.createRange();

      range.selectNodeContents(
        element
      );

      selection.removeAllRanges();
      selection.addRange(range);
    });
  }

  function cancel() {
    setDraft(
      String(value ?? "")
    );

    setEditing(false);
  }

  function commit() {
    const normalized =
      normalizeInlineText(
        draft,
        {
          multiline,
          maxLength,
        }
      );

    setEditing(false);

    if (
      normalized !==
      String(value ?? "")
    ) {
      onCommit(normalized);
    }
  }

  function handleInput(event) {
    const next =
      multiline
        ? event.currentTarget.innerText
        : event.currentTarget.textContent;

    setDraft(
      String(next || "").slice(
        0,
        maxLength
      )
    );
  }

  function handlePaste(event) {
    event.preventDefault();

    const text =
      event.clipboardData.getData(
        "text/plain"
      );

    const normalized =
      normalizeInlineText(
        text,
        {
          multiline,
          maxLength,
        }
      );

    document.execCommand(
      "insertText",
      false,
      normalized
    );
  }

  function handleKeyDown(event) {
    event.stopPropagation();

    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }

    if (
      event.key === "Enter" &&
      !multiline
    ) {
      event.preventDefault();
      commit();
      return;
    }

    if (
      event.key === "Enter" &&
      (event.metaKey ||
        event.ctrlKey)
    ) {
      event.preventDefault();
      commit();
    }
  }

  const visibleValue =
    editing
      ? draft
      : displayValue ??
        value ??
        "";

  return (
    <Component
      ref={elementRef}
      className={[
        styles.inlineEditable,
        editing
          ? styles.inlineEditing
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      contentEditable={editing}
      suppressContentEditableWarning
      role="textbox"
      tabIndex={editing ? 0 : -1}
      data-placeholder={placeholder}
      data-empty={
        !String(visibleValue).trim()
          ? "true"
          : "false"
      }
      onDoubleClick={
        editing
          ? undefined
          : beginEditing
      }
      onInput={handleInput}
      onPaste={handlePaste}
      onBlur={() => {
        if (editing) {
          commit();
        }
      }}
      onKeyDown={handleKeyDown}
      title={
        editing
          ? multiline
            ? "Ctrl/Cmd + Entrée pour valider, Échap pour annuler"
            : "Entrée pour valider, Échap pour annuler"
          : "Double-cliquer pour modifier"
      }
    >
      {visibleValue}
    </Component>
  );
}
