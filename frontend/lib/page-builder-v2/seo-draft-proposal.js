"use strict";

import {
  createBlock,
  deepClone,
  reorderBlocks,
} from "./page-builder-state";

function cleanText(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function placeholderHtml(section, brief) {
  const purpose = cleanText(section?.purpose);
  const proofs = Array.isArray(brief?.localProofsRequired)
    ? brief.localProofsRequired.filter(Boolean)
    : [];

  const lines = [
    purpose
      ? `Objectif éditorial : ${purpose}`
      : "Objectif éditorial à préciser.",
    "",
    "À rédiger avec des informations réelles et spécifiques à cette agence.",
  ];

  if (proofs.length) {
    lines.push(
      "",
      `Preuves locales à intégrer si elles sont vérifiées : ${proofs.join(" · ")}`
    );
  }

  return lines
    .map((line) => `<p>${line ? escapeHtml(line) : "&nbsp;"}</p>`)
    .join("");
}

function seoDraftBlocks(page, brief) {
  const existing = Array.isArray(page?.blocks) ? page.blocks : [];
  const keywordId = String(brief?.keywordId || "");
  const alreadyPrepared = existing.some(
    (block) =>
      String(block?.settings?.seoBriefKeywordId || "") === keywordId &&
      keywordId
  );

  if (alreadyPrepared) {
    return { blocks: existing, inserted: 0, duplicate: true };
  }

  const sections = Array.isArray(brief?.sections)
    ? brief.sections.filter((section) => cleanText(section?.title))
    : [];

  const generated = sections.map((section, index) => {
    const block = createBlock(
      "rich_text",
      existing.length + index
    );

    return {
      ...block,
      status: "draft",
      content: {
        ...block.content,
        title: cleanText(section.title),
        html: placeholderHtml(section, brief),
      },
      settings: {
        ...(block.settings || {}),
        seoBriefKeywordId: keywordId || null,
        seoBriefSectionCode: cleanText(section.code) || null,
        seoDraftProposal: true,
      },
    };
  });

  return {
    blocks: reorderBlocks([...existing, ...generated]),
    inserted: generated.length,
    duplicate: false,
  };
}

export function buildSeoDraftProposal(page, brief, mode) {
  if (!page?.id) {
    throw new Error("La page cible SEO est introuvable.");
  }

  if (!brief || !Array.isArray(brief.sections) || !brief.sections.length) {
    throw new Error("Le brief SEO ne contient aucune section exploitable.");
  }

  const result = seoDraftBlocks(page, brief);
  const next = deepClone(page);
  next.blocks = result.blocks;

  // Une optimisation d'une page déjà publiée ne doit jamais la dépublier.
  // Seuls les nouveaux blocs restent en brouillon jusqu'à validation humaine.
  next.status = page.status;
  next.published = page.published;

  return {
    page: next,
    inserted: result.inserted,
    duplicate: result.duplicate,
    mode: mode || "monitor",
    note: result.duplicate
      ? "Une proposition issue de ce brief existe déjà dans cette page."
      : `${result.inserted} bloc(s) brouillon préparé(s). Aucun contenu n'est publié automatiquement.`,
  };
}

export { escapeHtml, placeholderHtml, seoDraftBlocks };
