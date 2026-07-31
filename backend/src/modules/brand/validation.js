"use strict";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const DOMAIN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

function optionalString(value, field, max = 500) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).trim();
  if (!normalized || normalized.length > max) {
    throw Object.assign(new Error(`${field} invalide`), { statusCode: 400 });
  }
  return normalized;
}

function color(value, field, fallback) {
  const normalized = value === undefined || value === null || value === "" ? fallback : String(value).trim();
  if (!HEX_COLOR.test(normalized)) {
    throw Object.assign(new Error(`${field} doit être une couleur hexadécimale #RRGGBB`), { statusCode: 400 });
  }
  return normalized.toUpperCase();
}

function validateBrandInput(input = {}, current = {}) {
  const displayName = String(input.displayName ?? current.displayName ?? "").trim();
  if (displayName.length < 2 || displayName.length > 120) {
    throw Object.assign(new Error("Nom de marque invalide"), { statusCode: 400 });
  }

  const rawDomain = input.domain ?? current.domain;
  const domain = rawDomain ? String(rawDomain).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") : null;
  if (domain && !DOMAIN.test(domain)) {
    throw Object.assign(new Error("Domaine de marque invalide"), { statusCode: 400 });
  }

  const socialLinks = input.socialLinks ?? current.socialLinks ?? {};
  const emailSettings = input.emailSettings ?? current.emailSettings ?? {};
  const metadata = input.metadata ?? current.metadata ?? {};
  for (const [name, value] of Object.entries({ socialLinks, emailSettings, metadata })) {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw Object.assign(new Error(`${name} doit être un objet JSON`), { statusCode: 400 });
    }
  }

  return {
    displayName,
    legalName: optionalString(input.legalName ?? current.legalName, "Raison sociale", 160),
    logoUrl: optionalString(input.logoUrl ?? current.logoUrl, "URL du logo", 1000),
    logoDarkUrl: optionalString(input.logoDarkUrl ?? current.logoDarkUrl, "URL du logo sombre", 1000),
    faviconUrl: optionalString(input.faviconUrl ?? current.faviconUrl, "URL du favicon", 1000),
    primaryColor: color(input.primaryColor, "primaryColor", current.primaryColor || "#0B5FFF"),
    secondaryColor: color(input.secondaryColor, "secondaryColor", current.secondaryColor || "#102A43"),
    accentColor: color(input.accentColor, "accentColor", current.accentColor || "#FFB703"),
    backgroundColor: color(input.backgroundColor, "backgroundColor", current.backgroundColor || "#FFFFFF"),
    textColor: color(input.textColor, "textColor", current.textColor || "#102A43"),
    fontFamily: optionalString(input.fontFamily ?? current.fontFamily ?? "Inter, Arial, sans-serif", "Police", 180),
    domain,
    supportEmail: optionalString(input.supportEmail ?? current.supportEmail, "E-mail support", 180),
    supportPhone: optionalString(input.supportPhone ?? current.supportPhone, "Téléphone support", 80),
    address: optionalString(input.address ?? current.address, "Adresse", 500),
    socialLinks,
    emailSettings,
    metadata,
  };
}

module.exports = { validateBrandInput, HEX_COLOR, DOMAIN };
