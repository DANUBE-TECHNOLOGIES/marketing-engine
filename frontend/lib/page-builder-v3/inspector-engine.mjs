"use strict";

import {
  BlockSdkError,
  clone,
} from "./sdk/index.mjs";

export function setNestedValue(
  source,
  path,
  value
) {
  const segments = Array.isArray(path)
    ? path
    : String(path || "")
        .split(".")
        .filter(Boolean);

  if (!segments.length) {
    throw new BlockSdkError(
      "Le chemin de propriété est vide.",
      "INSPECTOR_PATH_REQUIRED"
    );
  }

  const result = clone(source || {});
  let cursor = result;

  segments.forEach(
    (segment, index) => {
      const last =
        index === segments.length - 1;

      if (last) {
        cursor[segment] = value;
        return;
      }

      if (
        !cursor[segment] ||
        typeof cursor[segment] !== "object" ||
        Array.isArray(cursor[segment])
      ) {
        cursor[segment] = {};
      }

      cursor = cursor[segment];
    }
  );

  return result;
}

export function updateBlockField(
  block,
  path,
  value
) {
  if (!block?.id) {
    throw new BlockSdkError(
      "Le bloc est invalide.",
      "INSPECTOR_BLOCK_REQUIRED"
    );
  }

  return {
    ...clone(block),
    content: setNestedValue(
      block.content || {},
      path,
      value
    ),
  };
}

export function updateBlockSettings(
  block,
  path,
  value
) {
  if (!block?.id) {
    throw new BlockSdkError(
      "Le bloc est invalide.",
      "INSPECTOR_BLOCK_REQUIRED"
    );
  }

  return {
    ...clone(block),
    settings: setNestedValue(
      block.settings || {},
      path,
      value
    ),
  };
}

export function addArrayItem(
  block,
  field,
  item
) {
  const current = Array.isArray(
    block?.content?.[field]
  )
    ? block.content[field]
    : [];

  return updateBlockField(
    block,
    field,
    [
      ...current,
      clone(item),
    ]
  );
}

export function updateArrayItem(
  block,
  field,
  index,
  updater
) {
  const current = Array.isArray(
    block?.content?.[field]
  )
    ? block.content[field]
    : [];

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= current.length
  ) {
    throw new BlockSdkError(
      "Index d’élément invalide.",
      "INVALID_INSPECTOR_ITEM_INDEX",
      {
        field,
        index,
      }
    );
  }

  const items = current.map(
    (item, currentIndex) => {
      if (currentIndex !== index) {
        return clone(item);
      }

      const source = clone(item);

      return typeof updater === "function"
        ? updater(source)
        : {
            ...source,
            ...clone(updater),
          };
    }
  );

  return updateBlockField(
    block,
    field,
    items
  );
}

export function removeArrayItem(
  block,
  field,
  index
) {
  const current = Array.isArray(
    block?.content?.[field]
  )
    ? block.content[field]
    : [];

  return updateBlockField(
    block,
    field,
    current.filter(
      (_, currentIndex) =>
        currentIndex !== index
    )
  );
}

export function moveArrayItem(
  block,
  field,
  index,
  direction
) {
  const current = Array.isArray(
    block?.content?.[field]
  )
    ? block.content[field]
    : [];

  const target = index + direction;

  if (
    !Number.isInteger(index) ||
    ![-1, 1].includes(direction) ||
    index < 0 ||
    index >= current.length ||
    target < 0 ||
    target >= current.length
  ) {
    return clone(block);
  }

  const items = current.map(clone);

  [
    items[index],
    items[target],
  ] = [
    items[target],
    items[index],
  ];

  return updateBlockField(
    block,
    field,
    items
  );
}

export function normalizeInspectorUrl(
  value,
  options = {}
) {
  const input = String(
    value || ""
  ).trim();

  if (!input) return "";

  if (
    options.allowAnchor !== false &&
    input.startsWith("#")
  ) {
    return input;
  }

  if (
    options.allowRelative !== false &&
    input.startsWith("/")
  ) {
    return input;
  }

  let url;

  try {
    url = new URL(input);
  } catch {
    throw new BlockSdkError(
      `URL invalide : ${input}.`,
      "INVALID_INSPECTOR_URL",
      {
        value: input,
      }
    );
  }

  if (
    !["http:", "https:"].includes(
      url.protocol
    )
  ) {
    throw new BlockSdkError(
      "Seules les URL HTTP et HTTPS sont autorisées.",
      "UNSAFE_INSPECTOR_URL",
      {
        protocol: url.protocol,
      }
    );
  }

  return url.toString();
}

export function inspectorDefinition(
  blockType
) {
  const definitions = {
    hero: {
      title: "Bannière principale",
      sections: [
        "content",
        "image",
        "actions",
        "display",
      ],
    },

    rich_text: {
      title: "Texte enrichi",
      sections: [
        "content",
        "display",
      ],
    },

    image_text: {
      title: "Image et texte",
      sections: [
        "content",
        "image",
        "display",
      ],
    },

    features: {
      title: "Points forts",
      sections: [
        "content",
        "items",
        "display",
      ],
    },

    gallery: {
      title: "Galerie",
      sections: [
        "content",
        "images",
        "display",
      ],
    },

    faq: {
      title: "Questions fréquentes",
      sections: [
        "content",
        "items",
        "display",
      ],
    },

    cta: {
      title: "Appel à l’action",
      sections: [
        "content",
        "actions",
        "display",
      ],
    },

    agency: {
      title: "Votre agence",
      sections: [
        "content",
        "agency",
        "display",
      ],
    },
  };

  return (
    definitions[blockType] || {
      title: blockType,
      sections: [
        "content",
        "display",
      ],
    }
  );
}
