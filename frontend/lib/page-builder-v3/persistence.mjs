"use strict";

import {
  BlockSdkError,
  clone,
} from "./sdk/index.mjs";

const DRAFT_PREFIX =
  "mondescale-page-builder-v3-draft";

function draftKey(siteId, pageId) {
  return `${DRAFT_PREFIX}:${siteId}:${pageId}`;
}

function normalizeStatus(status) {
  const value = String(
    status || "draft"
  ).toLowerCase();

  if (
    [
      "draft",
      "review",
      "published",
      "archived",
    ].includes(value)
  ) {
    return value;
  }

  return "draft";
}

export function serializeEditorPage(
  editor
) {
  if (!editor?.page) {
    throw new BlockSdkError(
      "Aucune page active à sérialiser.",
      "EDITOR_PAGE_REQUIRED"
    );
  }

  return {
    id: String(editor.page.id || ""),
    title: String(
      editor.page.title || "Page"
    ),
    slug: String(
      editor.page.slug || ""
    ),
    status: normalizeStatus(
      editor.page.status
    ),
    seoTitle: String(
      editor.page.seoTitle || ""
    ),
    seoDescription: String(
      editor.page.seoDescription || ""
    ),

    blocks: (
      Array.isArray(editor.page.blocks)
        ? editor.page.blocks
        : []
    ).map((block, index) => ({
      id: String(block.id || ""),
      type: String(
        block.type || "rich_text"
      ),
      status: String(
        block.status || "draft"
      ),
      position: index,
      content:
        block.content &&
        typeof block.content === "object"
          ? clone(block.content)
          : {},
      settings:
        block.settings &&
        typeof block.settings === "object"
          ? clone(block.settings)
          : {},
      seo:
        block.seo &&
        typeof block.seo === "object"
          ? clone(block.seo)
          : {},
      visibleDesktop:
        block.visibleDesktop !== false,
      visibleMobile:
        block.visibleMobile !== false,
    })),
  };
}

export function applySavedPage(
  editor,
  savedPage
) {
  if (!savedPage) {
    return {
      ...editor,
      dirty: false,
    };
  }

  const blocks = Array.isArray(
    savedPage.blocks
  )
    ? savedPage.blocks.map(
        (block, index) => ({
          id: String(
            block.id ||
            editor.page.blocks[index]?.id ||
            `block-${index}`
          ),
          type: String(
            block.type ||
            block.blockType ||
            "rich_text"
          ),
          status: String(
            block.status || "draft"
          ),
          position: index,
          content:
            block.content &&
            typeof block.content === "object"
              ? clone(block.content)
              : {},
          settings:
            block.settings &&
            typeof block.settings === "object"
              ? clone(block.settings)
              : {},
          seo:
            block.seo &&
            typeof block.seo === "object"
              ? clone(block.seo)
              : {},
          visibleDesktop:
            block.visibleDesktop !== false,
          visibleMobile:
            block.visibleMobile !== false,
        })
      )
    : editor.page.blocks;

  return {
    ...editor,

    page: {
      ...editor.page,
      id: String(
        savedPage.id ||
        editor.page.id
      ),
      title: String(
        savedPage.title ??
        editor.page.title
      ),
      slug: String(
        savedPage.slug ??
        editor.page.slug
      ),
      status: normalizeStatus(
        savedPage.status ??
        editor.page.status
      ),
      seoTitle: String(
        savedPage.seoTitle ??
        editor.page.seoTitle
      ),
      seoDescription: String(
        savedPage.seoDescription ??
        savedPage.metaDescription ??
        editor.page.seoDescription
      ),
      blocks,
    },

    selection: {
      blockIds: blocks.some(
        (block) =>
          editor.selection?.blockIds?.includes(
            block.id
          )
      )
        ? editor.selection.blockIds.filter(
            (id) =>
              blocks.some(
                (block) =>
                  block.id === id
              )
          )
        : blocks[0]?.id
          ? [blocks[0].id]
          : [],

      anchorId:
        blocks[0]?.id || null,
    },

    dirty: false,
  };
}

export function createDraftPayload(
  siteId,
  editor
) {
  return {
    version: 1,
    siteId: String(siteId),
    pageId: String(
      editor?.page?.id || ""
    ),
    savedAt:
      new Date().toISOString(),
    editor: clone(editor),
  };
}

export function saveEditorDraft(
  siteId,
  editor
) {
  if (
    typeof window === "undefined" ||
    !siteId ||
    !editor?.page?.id
  ) {
    return null;
  }

  const payload =
    createDraftPayload(
      siteId,
      editor
    );

  window.localStorage.setItem(
    draftKey(
      siteId,
      editor.page.id
    ),
    JSON.stringify(payload)
  );

  return payload;
}

export function readEditorDraft(
  siteId,
  pageId
) {
  if (
    typeof window === "undefined" ||
    !siteId ||
    !pageId
  ) {
    return null;
  }

  const raw =
    window.localStorage.getItem(
      draftKey(siteId, pageId)
    );

  if (!raw) return null;

  try {
    const payload =
      JSON.parse(raw);

    if (
      payload?.version !== 1 ||
      String(payload.siteId) !==
        String(siteId) ||
      String(payload.pageId) !==
        String(pageId) ||
      !payload.editor?.page
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function removeEditorDraft(
  siteId,
  pageId
) {
  if (
    typeof window === "undefined" ||
    !siteId ||
    !pageId
  ) {
    return;
  }

  window.localStorage.removeItem(
    draftKey(siteId, pageId)
  );
}
