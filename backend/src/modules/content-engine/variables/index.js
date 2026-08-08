"use strict";

const {
  ContentVariablesEngine,
} =
  require(
    "./engine"
  );

const {
  VARIABLE_PATTERN,
  extractVariables,
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
  normalizePath,
  getPath,
} =
  require(
    "./path"
  );

const {
  stringifyVariableValue,
} =
  require(
    "./value"
  );

const {
  VARIABLE_DEFINITIONS,
  variableRegistry,
  isRegisteredVariable,
} =
  require(
    "./registry"
  );

module.exports = {
  ContentVariablesEngine,
  VARIABLE_PATTERN,
  extractVariables,
  resolveTemplate,
  resolveObjectTemplates,
  normalizePath,
  getPath,
  stringifyVariableValue,
  VARIABLE_DEFINITIONS,
  variableRegistry,
  isRegisteredVariable,
};
