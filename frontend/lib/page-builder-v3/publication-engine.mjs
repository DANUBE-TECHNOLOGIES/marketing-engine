"use strict";

import {
  BlockSdkError,
} from "./sdk/index.mjs";

import {
  auditPageSeo,
} from "./seo-engine.mjs";

const PUBLISHABLE_BLOCK_STATUSES =
  new Set([
    "published",
    "review",
    "draft",
  ]);

export function visibleBlocksForViewport(
  page,
  viewport = "desktop",
  options = {}
) {
  const includeDrafts =
    options.includeDrafts !== false;

  const blocks = Array.isArray(
    page?.blocks
  )
    ? page.blocks
    : [];

  return blocks
    .filter((block) => {
      if (
        !includeDrafts &&
        block.status !== "published"
      ) {
        return false;
      }

      if (
        !PUBLISHABLE_BLOCK_STATUSES.has(
          String(
            block.status || "draft"
          )
        )
      ) {
        return false;
      }

      if (
        viewport === "mobile" &&
        block.visibleMobile === false
      ) {
        return false;
      }

      if (
        viewport !== "mobile" &&
        block.visibleDesktop === false
      ) {
        return false;
      }

      return true;
    })
    .sort(
      (left, right) =>
        Number(left.position || 0) -
        Number(right.position || 0)
    );
}

export function validatePublication(
  page,
  options = {}
) {
  if (!page) {
    throw new BlockSdkError(
      "Aucune page à publier.",
      "PUBLICATION_PAGE_REQUIRED"
    );
  }

  const audit = auditPageSeo(page);

  const minimumScore =
    Number.isFinite(
      Number(options.minimumScore)
    )
      ? Number(options.minimumScore)
      : 50;

  const blocks =
    visibleBlocksForViewport(
      page,
      "desktop",
      {
        includeDrafts: true,
      }
    );

  const blockers = [];
  const warnings = [];

  if (
    !String(page.title || "").trim()
  ) {
    blockers.push({
      code:
        "PUBLICATION_TITLE_REQUIRED",
      message:
        "Le titre de la page est obligatoire.",
    });
  }

  if (
    page.slug === undefined ||
    page.slug === null
  ) {
    blockers.push({
      code:
        "PUBLICATION_SLUG_REQUIRED",
      message:
        "Le slug de la page est obligatoire.",
    });
  }

  if (!blocks.length) {
    blockers.push({
      code:
        "PUBLICATION_BLOCK_REQUIRED",
      message:
        "La page doit contenir au moins un bloc.",
    });
  }

  if (
    !blocks.some(
      (block) =>
        block.type === "hero"
    )
  ) {
    warnings.push({
      code:
        "PUBLICATION_HERO_RECOMMENDED",
      message:
        "La page ne contient pas de bloc Hero.",
    });
  }

  if (
    !blocks.some(
      (block) =>
        block.type === "cta"
    )
  ) {
    warnings.push({
      code:
        "PUBLICATION_CTA_RECOMMENDED",
      message:
        "La page ne contient pas d’appel à l’action.",
    });
  }

  if (audit.score < minimumScore) {
    blockers.push({
      code:
        "PUBLICATION_SEO_SCORE_TOO_LOW",
      message:
        `Le score SEO est de ${audit.score}/100. Le minimum requis est ${minimumScore}/100.`,
      score: audit.score,
      minimumScore,
    });
  }

  for (
    const recommendation
    of audit.recommendations
  ) {
    warnings.push({
      code:
        `SEO_${recommendation.id
          .toUpperCase()
          .replace(/-/g, "_")}`,
      message:
        recommendation.recommendation,
    });
  }

  return {
    allowed:
      blockers.length === 0,
    blockers,
    warnings,
    audit,
    blockCount:
      blocks.length,
  };
}

export function preparePageForPublication(
  editor,
  options = {}
) {
  if (!editor?.page) {
    throw new BlockSdkError(
      "Aucune page active.",
      "EDITOR_PAGE_REQUIRED"
    );
  }

  const validation =
    validatePublication(
      editor.page,
      options
    );

  if (!validation.allowed) {
    const error =
      new BlockSdkError(
        "La page ne peut pas être publiée.",
        "PUBLICATION_BLOCKED",
        validation
      );

    error.validation =
      validation;

    throw error;
  }

  return {
    editor: {
      ...editor,
      page: {
        ...editor.page,
        status: "published",
        blocks:
          editor.page.blocks.map(
            (block) => ({
              ...block,
              status:
                block.status ===
                "archived"
                  ? "archived"
                  : "published",
            })
          ),
      },
      dirty: true,
      revision:
        editor.revision + 1,
    },
    validation,
  };
}

export function returnPageToDraft(
  editor
) {
  if (!editor?.page) {
    throw new BlockSdkError(
      "Aucune page active.",
      "EDITOR_PAGE_REQUIRED"
    );
  }

  return {
    ...editor,
    page: {
      ...editor.page,
      status: "draft",
    },
    dirty: true,
    revision:
      editor.revision + 1,
  };
}
