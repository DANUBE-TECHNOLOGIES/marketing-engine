"use strict";

const {
  TemplateLibraryApiService,
} =
  require(
    "./api-service"
  );

const {
  createTemplateLibraryRouter,
} =
  require(
    "./api-router"
  );


const {
  TemplateLibraryRepository,
  definitionIdentityKey,
  assignmentIdentityKey,
} =
  require(
    "./repository"
  );

const {
  PersistentTemplateLibraryService,
} =
  require(
    "./persistent-service"
  );

const {
  TemplateLibraryService,
} =
  require(
    "./service"
  );

const {
  TemplateRegistry,
} =
  require(
    "./registry"
  );

const {
  TemplateRenderer,
} =
  require(
    "./renderer"
  );

const {
  createBuiltinTemplateRegistry,
} =
  require(
    "./builtins"
  );

const {
  normalizeTemplateId,
  normalizePageType,
  validateTemplateDefinition,
  assertTemplateDefinition,
} =
  require(
    "./contract"
  );

const {
  TEMPLATE_LIBRARY_VERSION,
  TEMPLATE_KINDS,
  TEMPLATE_STATUS,
  TEMPLATE_SCOPES,
  PAGE_TYPES,
} =
  require(
    "./constants"
  );

module.exports = {
  /*
   * Persistence
   */
  TemplateLibraryRepository,
  PersistentTemplateLibraryService,
  definitionIdentityKey,
  assignmentIdentityKey,

  /*
   * Core
   */
  TemplateLibraryService,
  TemplateRegistry,
  TemplateRenderer,
  createBuiltinTemplateRegistry,

  /*
   * Contract
   */
  normalizeTemplateId,
  normalizePageType,
  validateTemplateDefinition,
  assertTemplateDefinition,

  /*
   * Constants
   */
  TEMPLATE_LIBRARY_VERSION,
  TEMPLATE_KINDS,
  TEMPLATE_STATUS,
  TEMPLATE_SCOPES,
  PAGE_TYPES,
};
