import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = path.resolve(import.meta.dirname, "..");
function read(relative) { return fs.readFileSync(path.join(ROOT, relative), "utf8"); }

const layout = read("app/agence/[siteSlug]/layout.js");
const payments = read("components/public-site/PublicPaymentMethodsBand.js");
const paymentCss = read("components/public-site/payment-methods-band.css");
const institutions = read("components/public-site/PublicInstitutionalTrustBand.js");
const institutionCss = read("components/public-site/institutional-trust-band.css");

test("MSE-25.44 exposes the payment reassurance band globally before the footer", () => {
  assert.match(layout, /<PublicPaymentMethodsBand \/>/);
  assert.match(layout, /<PublicInstitutionalTrustBand runtime=\{publicBrandLegalRuntime\} \/>/);
  assert.match(layout, /<PublicPaymentMethodsBand \/>[\s\S]*<PublicInstitutionalTrustBand[\s\S]*<PublicSiteFooter/);
  assert.match(layout, /payment-methods-band\.css/);
  assert.match(layout, /institutional-trust-band\.css/);
});

test("MSE-25.44 payment band advertises supported means and qualified instalments", () => {
  for (const token of ["Carte bancaire", "Visa", "Mastercard", "American Express", "Virement bancaire", "Chèque", "Chèques-Vacances ANCV"]) {
    assert.match(payments, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(payments, /INSTALLMENT_COUNTS = Object\.freeze\(\[3, 4, 10\]\)/);
  assert.match(payments, /selon les conditions applicables/);
  assert.match(paymentCss, /@media \(max-width: 620px\)/);
});

test("MSE-25.44 institutional band keeps legal runtime authoritative and falls back to the Mondescale Groupama network guarantee", () => {
  assert.match(institutions, /runtime\?\.runtime\?\.legal\?\.values/);
  assert.match(institutions, /legal\?\.travelRegistration/);
  assert.match(institutions, /legal\?\.financialGuarantee/);
  assert.match(institutions, /legal\?\.professionalInsurance/);
  assert.match(institutions, /MONDESCALE_TRUST_DEFAULTS = Object\.freeze/);
  assert.match(institutions, /financialGuaranteeProvider: "GROUPAMA Assurance & Caution"/);
  assert.match(institutions, /professionalInsuranceProvider: "GROUPAMA Assurance & Caution"/);
  assert.match(institutions, /financialGuarantee \|\| MONDESCALE_TRUST_DEFAULTS\.financialGuaranteeProvider/);
  assert.match(institutions, /professionalInsurance \|\| MONDESCALE_TRUST_DEFAULTS\.professionalInsuranceProvider/);
  assert.match(institutions, /mark: "GROUPAMA"/);
  assert.match(institutions, /title: "Garantie financière"/);
  assert.match(institutions, /title: "Responsabilité civile professionnelle"/);
  assert.match(institutions, /Atout France/);
  assert.match(institutions, /CEDIV Travel/);
  assert.match(institutions, /Les Entreprises du Voyage/);
  assert.match(institutionCss, /grid-template-columns: repeat\(auto-fit, minmax\(210px, 1fr\)\)/);
});
