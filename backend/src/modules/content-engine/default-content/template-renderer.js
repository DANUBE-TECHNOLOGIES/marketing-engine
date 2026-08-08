"use strict";

const {
  ContentVariablesEngine,
} =
  require(
    "../variables"
  );

const engine =
  new ContentVariablesEngine({
    strictRegistry:
      false,
  });

function renderTemplate(
  template,
  context,
  options = {}
) {
  return engine.render(
    template,
    context,
    options
  ).value;
}

function renderContentObject(
  object,
  context,
  options = {}
) {
  return engine.renderObject(
    object,
    context,
    options
  );
}

module.exports = {
  renderTemplate,
  renderContentObject,
};
