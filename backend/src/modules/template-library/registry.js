"use strict";

const {
  assertTemplateDefinition,
  normalizeTemplateId,
  normalizePageType,
} =
  require(
    "./contract"
  );

class TemplateRegistry {
  constructor({
    templates =
      [],
  } = {}) {
    this.templates =
      new Map();

    for (
      const template
      of templates
    ) {
      this.register(
        template
      );
    }
  }

  key(
    id,
    version
  ) {
    return `${normalizeTemplateId(id)}@${String(version)}`;
  }

  register(
    definition
  ) {
    const normalized =
      assertTemplateDefinition(
        definition
      );

    const key =
      this.key(
        normalized.id,
        normalized.version
      );

    if (
      this.templates.has(
        key
      )
    ) {
      const error =
        new Error(
          `Template déjà enregistré : ${key}`
        );

      error.code =
        "TEMPLATE_ALREADY_REGISTERED";

      error.statusCode =
        409;

      throw error;
    }

    this.templates.set(
      key,
      Object.freeze({
        ...normalized,
      })
    );

    return this.templates.get(
      key
    );
  }

  get(
    id,
    version
  ) {
    return (
      this.templates.get(
        this.key(
          id,
          version
        )
      ) ||
      null
    );
  }

  list({
    pageType,
    status,
    scope,
    variant,
  } = {}) {
    const normalizedPageType =
      pageType
        ? normalizePageType(
            pageType
          )
        : null;

    return [
      ...this.templates.values(),
    ]
      .filter(
        template => {
          if (
            normalizedPageType &&
            template.pageType !==
              normalizedPageType
          ) {
            return false;
          }

          if (
            status &&
            template.status !==
              status
          ) {
            return false;
          }

          if (
            scope &&
            template.scope !==
              scope
          ) {
            return false;
          }

          if (
            variant &&
            template.variant !==
              variant
          ) {
            return false;
          }

          return true;
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          `${a.pageType}:${a.variant}:${a.id}:${a.version}`
            .localeCompare(
              `${b.pageType}:${b.variant}:${b.id}:${b.version}`
            )
      );
  }

  latest({
    pageType,
    variant =
      "default",
    status =
      "active",
  } = {}) {
    const candidates =
      this.list({
        pageType,
        variant,
        status,
      });

    if (
      candidates.length ===
      0
    ) {
      return null;
    }

    return candidates[
      candidates.length -
      1
    ];
  }

  has(
    id,
    version
  ) {
    return this.templates.has(
      this.key(
        id,
        version
      )
    );
  }

  count() {
    return this.templates.size;
  }
}

module.exports = {
  TemplateRegistry,
};
