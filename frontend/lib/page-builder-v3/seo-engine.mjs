"use strict";

import {
  BlockSdkError,
} from "./sdk/index.mjs";

export function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function textFromHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function blockText(block) {
  const content = block?.content || {};

  const parts = [
    content.eyebrow,
    content.title,
    content.subtitle,
    content.text,
    textFromHtml(content.html),
    content.imageAlt,
  ];

  if (Array.isArray(content.items)) {
    for (const item of content.items) {
      parts.push(
        item?.title,
        item?.text,
        item?.question,
        item?.answer
      );
    }
  }

  return parts
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function calculatePageWordCount(page) {
  if (!page?.blocks) return 0;

  const text = page.blocks
    .map(blockText)
    .join(" ")
    .trim();

  if (!text) return 0;

  return text
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

export function pageHasBlock(page, type) {
  return Boolean(
    page?.blocks?.some(
      (block) =>
        String(block.type) === String(type)
    )
  );
}

export function auditPageSeo(page) {
  if (!page) {
    throw new BlockSdkError(
      "Aucune page à auditer.",
      "SEO_PAGE_REQUIRED"
    );
  }

  const title = String(
    page.title || ""
  ).trim();

  const slug = String(
    page.slug || ""
  ).trim();

  const seoTitle = String(
    page.seoTitle || ""
  ).trim();

  const seoDescription = String(
    page.seoDescription || ""
  ).trim();

  const wordCount =
    calculatePageWordCount(page);

  const checks = [
    {
      id: "page-title",
      label: "Titre de page renseigné",
      passed:
        title.length >= 10 &&
        title.length <= 180,
      weight: 8,
      recommendation:
        "Renseignez un titre de page clair et descriptif.",
    },

    {
      id: "slug",
      label: "Slug propre et lisible",
      passed:
        slug === normalizeSlug(slug) &&
        slug.length <= 100,
      weight: 7,
      recommendation:
        "Utilisez un slug court, sans accent ni caractère spécial.",
    },

    {
      id: "seo-title",
      label: "Titre SEO optimisé",
      passed:
        seoTitle.length >= 30 &&
        seoTitle.length <= 60,
      weight: 15,
      recommendation:
        "Le titre SEO doit idéalement contenir entre 30 et 60 caractères.",
    },

    {
      id: "seo-description",
      label: "Méta-description optimisée",
      passed:
        seoDescription.length >= 120 &&
        seoDescription.length <= 160,
      weight: 15,
      recommendation:
        "La méta-description doit idéalement contenir entre 120 et 160 caractères.",
    },

    {
      id: "hero",
      label: "Présence d’un Hero",
      passed:
        pageHasBlock(page, "hero"),
      weight: 10,
      recommendation:
        "Ajoutez une bannière Hero présentant clairement le sujet de la page.",
    },

    {
      id: "cta",
      label: "Présence d’un appel à l’action",
      passed:
        pageHasBlock(page, "cta"),
      weight: 10,
      recommendation:
        "Ajoutez un CTA pour convertir les visiteurs en demandes de devis.",
    },

    {
      id: "faq",
      label: "Présence d’une FAQ",
      passed:
        pageHasBlock(page, "faq"),
      weight: 10,
      recommendation:
        "Ajoutez une FAQ pour enrichir la page et répondre aux recherches longues.",
    },

    {
      id: "content-volume",
      label: "Volume éditorial suffisant",
      passed:
        wordCount >= 300,
      weight: 15,
      recommendation:
        `La page contient ${wordCount} mot(s). Visez au minimum 300 mots utiles.`,
    },

    {
      id: "image-alt",
      label: "Images avec texte alternatif",
      passed:
        !page.blocks.some((block) => {
          const content =
            block.content || {};

          if (
            !content.imageUrl &&
            !Array.isArray(content.images)
          ) {
            return false;
          }

          if (
            content.imageUrl &&
            !String(
              content.imageAlt || ""
            ).trim()
          ) {
            return true;
          }

          return (
            Array.isArray(content.images) &&
            content.images.some(
              (image) =>
                image?.url &&
                !String(
                  image.alt || ""
                ).trim()
            )
          );
        }),
      weight: 10,
      recommendation:
        "Renseignez un texte alternatif descriptif pour chaque image.",
    },
  ];

  const score = checks.reduce(
    (total, check) =>
      total +
      (check.passed
        ? check.weight
        : 0),
    0
  );

  const grade =
    score >= 90
      ? "A"
      : score >= 75
        ? "B"
        : score >= 60
          ? "C"
          : score >= 40
            ? "D"
            : "E";

  return {
    score,
    grade,
    wordCount,
    passed:
      checks.filter(
        (check) => check.passed
      ).length,
    failed:
      checks.filter(
        (check) => !check.passed
      ).length,
    checks,
    recommendations:
      checks
        .filter(
          (check) => !check.passed
        )
        .map((check) => ({
          id: check.id,
          label: check.label,
          recommendation:
            check.recommendation,
          weight: check.weight,
        })),
  };
}

export function updatePageSettings(
  editor,
  input
) {
  if (!editor?.page) {
    throw new BlockSdkError(
      "Aucune page active.",
      "EDITOR_PAGE_REQUIRED"
    );
  }

  const statuses = new Set([
    "draft",
    "review",
    "published",
    "archived",
  ]);

  const status = String(
    input.status ||
    editor.page.status ||
    "draft"
  );

  if (!statuses.has(status)) {
    throw new BlockSdkError(
      `Statut invalide : ${status}.`,
      "INVALID_PAGE_STATUS",
      {
        status,
        allowed:
          [...statuses],
      }
    );
  }

  return {
    ...editor,

    page: {
      ...editor.page,

      title: String(
        input.title ??
        editor.page.title
      ).trim(),

      slug: normalizeSlug(
        input.slug ??
        editor.page.slug
      ),

      status,

      seoTitle: String(
        input.seoTitle ??
        editor.page.seoTitle
      ).trim(),

      seoDescription: String(
        input.seoDescription ??
        editor.page.seoDescription
      ).trim(),
    },

    dirty: true,
    revision:
      editor.revision + 1,
  };
}
