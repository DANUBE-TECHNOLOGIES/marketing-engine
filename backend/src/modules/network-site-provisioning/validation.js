"use strict";

const {
  createProvisioningError,
} = require("./errors");

function normalizeIds(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw createProvisioningError(
      "agencyIds doit être un tableau.",
      "PROVISIONING_INVALID_AGENCY_IDS"
    );
  }

  return [
    ...new Set(
      value
        .map(
          (item) =>
            String(item || "")
              .trim()
        )
        .filter(Boolean)
    ),
  ].slice(0, 100);
}

function validateProvisionPayload(
  input = {}
) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw createProvisioningError(
      "Le payload de provisionnement est invalide.",
      "PROVISIONING_INVALID_PAYLOAD"
    );
  }

  const agencyIds =
    normalizeIds(
      input.agencyIds
    );

  const dryRun =
    input.dryRun !== false;

  const confirm =
    input.confirm === true;

  if (
    !dryRun &&
    agencyIds.length === 0 &&
    !confirm
  ) {
    throw createProvisioningError(
      "Le provisionnement global réel nécessite confirm=true.",
      "PROVISIONING_CONFIRMATION_REQUIRED",
      409
    );
  }

  return {
    agencyIds,
    dryRun,
    confirm,

    overwrite:
      input.overwrite === true,

    seedBlocks:
      input.seedBlocks !== false,

    publish:
      input.publish === true,
  };
}

module.exports = {
  normalizeIds,
  validateProvisionPayload,
};
