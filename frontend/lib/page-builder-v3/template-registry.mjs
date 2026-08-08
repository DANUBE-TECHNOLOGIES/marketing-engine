"use strict";

import {
  BlockSdkError,
  clone,
} from "./sdk/index.mjs";

function normalizeTemplate(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new BlockSdkError(
      "Le modèle doit être un objet.",
      "INVALID_PAGE_TEMPLATE"
    );
  }

  const id = String(input.id || "")
    .trim()
    .toLowerCase();

  if (!/^[a-z][a-z0-9_-]*$/.test(id)) {
    throw new BlockSdkError(
      `Identifiant de modèle invalide : ${id || "(vide)"}.`,
      "INVALID_PAGE_TEMPLATE_ID",
      { id }
    );
  }

  const label = String(
    input.label || ""
  ).trim();

  if (!label) {
    throw new BlockSdkError(
      `Le modèle ${id} doit posséder un libellé.`,
      "PAGE_TEMPLATE_LABEL_REQUIRED",
      { id }
    );
  }

  if (
    !Array.isArray(input.blocks) ||
    !input.blocks.length
  ) {
    throw new BlockSdkError(
      `Le modèle ${id} doit contenir au moins un bloc.`,
      "PAGE_TEMPLATE_BLOCKS_REQUIRED",
      { id }
    );
  }

  return Object.freeze({
    id,
    label,
    description: String(
      input.description || ""
    ).trim(),
    category: String(
      input.category || "destination"
    ),
    icon: String(input.icon || "▤"),
    tags: Array.isArray(input.tags)
      ? [...new Set(input.tags.map(String))]
      : [],
    variables:
      input.variables &&
      typeof input.variables === "object"
        ? clone(input.variables)
        : {},
    page: {
      title: String(
        input.page?.title || label
      ),
      seoTitle: String(
        input.page?.seoTitle || ""
      ),
      seoDescription: String(
        input.page?.seoDescription || ""
      ),
    },
    blocks: clone(input.blocks),
  });
}

function interpolate(value, variables) {
  if (typeof value === "string") {
    return value.replace(
      /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
      (_, key) =>
        variables[key] === undefined
          ? ""
          : String(variables[key])
    );
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      interpolate(item, variables)
    );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.entries(value).map(
        ([key, item]) => [
          key,
          interpolate(item, variables),
        ]
      )
    );
  }

  return value;
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `block-${crypto.randomUUID()}`;
  }

  return `block-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export class PageTemplateRegistry {
  constructor(templates = []) {
    this.templates = new Map();

    for (const template of templates) {
      this.register(template);
    }
  }

  register(input) {
    const template =
      normalizeTemplate(input);

    if (this.templates.has(template.id)) {
      throw new BlockSdkError(
        `Le modèle ${template.id} est déjà enregistré.`,
        "DUPLICATE_PAGE_TEMPLATE",
        { id: template.id }
      );
    }

    this.templates.set(
      template.id,
      template
    );

    return this;
  }

  has(id) {
    return this.templates.has(
      String(id || "").toLowerCase()
    );
  }

  get(id) {
    const normalized = String(id || "")
      .trim()
      .toLowerCase();

    const template =
      this.templates.get(normalized);

    if (!template) {
      throw new BlockSdkError(
        `Modèle inconnu : ${normalized || "(vide)"}.`,
        "UNKNOWN_PAGE_TEMPLATE",
        { id: normalized }
      );
    }

    return template;
  }

  list(options = {}) {
    const category = options.category
      ? String(options.category)
      : null;

    const query = String(
      options.query || ""
    )
      .trim()
      .toLowerCase();

    return [...this.templates.values()]
      .filter(
        (template) =>
          !category ||
          template.category === category
      )
      .filter((template) => {
        if (!query) return true;

        const haystack = [
          template.label,
          template.description,
          ...template.tags,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((left, right) =>
        left.label.localeCompare(
          right.label,
          "fr"
        )
      );
  }

  categories() {
    return [
      ...new Set(
        this.list().map(
          (template) => template.category
        )
      ),
    ].sort();
  }

  instantiate(
    id,
    variables = {},
    options = {}
  ) {
    const template = this.get(id);

    const resolvedVariables = {
      ...template.variables,
      ...variables,
    };

    const blocks = template.blocks.map(
      (block, index) => ({
        id:
          typeof options.createId ===
          "function"
            ? options.createId(
                block,
                index
              )
            : createId(),

        type: block.type,
        status:
          block.status || "draft",
        position: index,

        content: interpolate(
          block.content || {},
          resolvedVariables
        ),

        settings: interpolate(
          block.settings || {},
          resolvedVariables
        ),
      })
    );

    return {
      templateId: template.id,

      page: {
        title: interpolate(
          template.page.title,
          resolvedVariables
        ),

        seoTitle: interpolate(
          template.page.seoTitle,
          resolvedVariables
        ),

        seoDescription: interpolate(
          template.page.seoDescription,
          resolvedVariables
        ),
      },

      blocks,
    };
  }
}

export function applyTemplateToState(
  state,
  instance,
  mode = "replace"
) {
  if (!["replace", "append"].includes(mode)) {
    throw new BlockSdkError(
      "Le mode doit être replace ou append.",
      "INVALID_TEMPLATE_APPLY_MODE",
      { mode }
    );
  }

  const existing =
    mode === "append"
      ? [...state.page.blocks]
      : [];

  const singletonTypes = new Set([
    "hero",
    "agency",
  ]);

  const existingTypes = new Set(
    existing.map(
      (block) => block.type
    )
  );

  const accepted = [];

  for (const block of instance.blocks) {
    if (
      mode === "append" &&
      singletonTypes.has(block.type) &&
      existingTypes.has(block.type)
    ) {
      continue;
    }

    accepted.push(block);
    existingTypes.add(block.type);
  }

  const blocks = [
    ...existing,
    ...accepted,
  ].map((block, index) => ({
    ...clone(block),
    position: index,
  }));

  return {
    ...state,

    page: {
      ...state.page,

      title:
        mode === "replace"
          ? instance.page.title ||
            state.page.title
          : state.page.title,

      seoTitle:
        mode === "replace"
          ? instance.page.seoTitle ||
            state.page.seoTitle
          : state.page.seoTitle,

      seoDescription:
        mode === "replace"
          ? instance.page
              .seoDescription ||
            state.page.seoDescription
          : state.page.seoDescription,

      blocks,
    },

    selection: {
      blockIds:
        accepted.map(
          (block) => block.id
        ),
      anchorId:
        accepted.at(-1)?.id || null,
    },

    dirty: true,
    revision:
      state.revision + 1,
  };
}

export {
  interpolate,
  normalizeTemplate,
};
