"use strict";

const { cleanString, normalizePhone, normalizeWebsite } = require("./canonical-identity");

function fold(value) {
  return cleanString(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase() || null;
}

function comparableAddress(address = {}) {
  return [address.street, address.postalCode, address.city, address.countryCode]
    .map(fold)
    .filter(Boolean)
    .join("|");
}

function diffField(field, expected, actual, normalize = (value) => cleanString(value)) {
  const normalizedExpected = normalize(expected);
  const normalizedActual = normalize(actual);
  return {
    field,
    expected,
    actual,
    match: normalizedExpected === normalizedActual
  };
}

function compareNap(canonical, observed = {}) {
  const checks = [
    diffField("name", canonical.name, observed.name, fold),
    diffField("address", canonical.address, observed.address, comparableAddress),
    diffField("phone", canonical.phone, observed.phone, normalizePhone),
    diffField("website", canonical.website, observed.website, normalizeWebsite)
  ];

  const matched = checks.filter((check) => check.match).length;
  return Object.freeze({
    agencyId: canonical.agencyId,
    match: matched === checks.length,
    score: Math.round((matched / checks.length) * 100),
    checks: Object.freeze(checks),
    drift: Object.freeze(checks.filter((check) => !check.match).map((check) => check.field))
  });
}

module.exports = {
  compareNap
};
