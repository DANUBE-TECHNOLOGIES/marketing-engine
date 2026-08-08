"use strict";

const VARIABLE_DEFINITIONS =
  Object.freeze([
    {
      key:
        "agency.id",

      type:
        "number",

      label:
        "Identifiant agence",
    },
    {
      key:
        "agency.name",

      type:
        "string",

      label:
        "Nom de l'agence",
    },
    {
      key:
        "agency.city",

      type:
        "string",

      label:
        "Ville",
    },
    {
      key:
        "agency.address",

      type:
        "string",

      label:
        "Adresse",
    },
    {
      key:
        "agency.postalCode",

      type:
        "string",

      label:
        "Code postal",
    },
    {
      key:
        "agency.fullAddress",

      type:
        "string",

      label:
        "Adresse complète",
    },
    {
      key:
        "agency.phone",

      type:
        "string",

      label:
        "Téléphone",
    },
    {
      key:
        "agency.phoneHref",

      type:
        "string",

      label:
        "Lien téléphone",
    },
    {
      key:
        "agency.email",

      type:
        "string",

      label:
        "Email",
    },
    {
      key:
        "agency.emailHref",

      type:
        "string",

      label:
        "Lien email",
    },
    {
      key:
        "agency.website",

      type:
        "string",

      label:
        "Site internet",
    },
    {
      key:
        "agency.googleReviewUrl",

      type:
        "string",

      label:
        "URL avis Google",
    },
    {
      key:
        "site.slug",

      type:
        "string",

      label:
        "Slug mini-site",
    },
    {
      key:
        "site.basePath",

      type:
        "string",

      label:
        "Chemin mini-site",
    },
    {
      key:
        "computed.localAgencyLabel",

      type:
        "string",

      label:
        "Libellé local agence",
    },
    {
      key:
        "computed.contactPath",

      type:
        "string",

      label:
        "Chemin contact",
    },
    {
      key:
        "computed.agencyPath",

      type:
        "string",

      label:
        "Chemin présentation",
    },
    {
      key:
        "computed.servicesPath",

      type:
        "string",

      label:
        "Chemin services",
    },
  ]);

function variableRegistry() {
  return VARIABLE_DEFINITIONS.map(
    definition => ({
      ...definition,
    })
  );
}

function isRegisteredVariable(
  key
) {
  return VARIABLE_DEFINITIONS
    .some(
      definition =>
        definition.key ===
        key
    );
}

module.exports = {
  VARIABLE_DEFINITIONS,
  variableRegistry,
  isRegisteredVariable,
};
