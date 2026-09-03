"use strict";

const {
  resolveTemplate,
} =
  require(
    "./resolver"
  );

const {
  resolveObjectTemplates,
} =
  require(
    "./object-resolver"
  );

const {
  variableRegistry,
  isRegisteredVariable,
} =
  require(
    "./registry"
  );

class ContentVariablesEngine {
  constructor({
    strictRegistry =
      false,
  } = {}) {
    this.strictRegistry =
      strictRegistry ===
      true;
  }

  validateVariables(
    variables = []
  ) {
    const unknown =
      variables.filter(
        key =>
          !isRegisteredVariable(
            key
          )
      );

    if (
      this.strictRegistry &&
      unknown.length >
        0
    ) {
      const error =
        new Error(
          `Variables non enregistrées : ${unknown.join(", ")}`
        );

      error.code =
        "CONTENT_VARIABLES_NOT_REGISTERED";

      error.statusCode =
        400;

      error.variables =
        unknown;

      throw error;
    }

    return {
      valid:
        unknown.length ===
        0,

      unknown,
    };
  }

  render(
    template,
    context,
    options = {}
  ) {
    const output =
      resolveTemplate(
        template,
        context,
        options
      );

    this.validateVariables(
      output.variables
    );

    return output;
  }

  renderObject(
    object,
    context,
    options = {}
  ) {
    const output =
      resolveObjectTemplates(
        object,
        context,
        options
      );

    this.validateVariables(
      output.variables
    );

    return output;
  }

  registry() {
    return variableRegistry();
  }
}

module.exports = {
  ContentVariablesEngine,
};
