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

test("MSE-25.44 payment band advertises supported means, brand artwork and qualified instalments", () => {
  for (const token of ["Carte bancaire", "Visa", "Mastercard", "American Express", "Virement bancaire", "Chèque", "Chèques-Vacances ANCV"]) {
    assert.match(payments, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(payments, /logoSrc:[\s\S]*Visa_2021\.svg/);
  assert.match(payments, /logoSrc:[\s\S]*Mastercard_2019_logo\.svg/);
  assert.match(payments, /logoSrc:[\s\S]*American_Express_logo_\(2018\)\.svg/);
  assert.match(payments, /ANCV\.jpg/);
  assert.match(payments, /className="public-payment-logo"/);
  assert.match(payments, /INSTALLMENT_COUNTS = Object\.freeze\(\[3, 4, 10\]\)/);
  assert.match(payments, /selon les conditions applicables/);
  assert.match(paymentCss, /public-payment-logo-wrap/);
  assert.match(paymentCss, /object-fit: contain/);
  assert.match(paymentCss, /@media \(max-width: 620px\)/);
});

test("MSE-25.44 institutional band keeps legal runtime authoritative, renders trust artwork and falls back to Mondescale Groupama", () => {
  assert.match(institutions, /runtime\?\.runtime\?\.legal\?\.values/);
  assert.match(institutions, /legal\?\.travelRegistration/);
  assert.match(institutions, /legal\?\.financialGuarantee/);
  assert.match(institutions, /legal\?\.professionalInsurance/);
  assert.match(institutions, /MONDESCALE_TRUST_DEFAULTS = Object\.freeze/);
  assert.match(institutions, /financialGuaranteeProvider: "GROUPAMA Assurance & Caution"/);
  assert.match(institutions, /professionalInsuranceProvider: "GROUPAMA Assurance & Caution"/);
  assert.match(institutions, /financialGuarantee \|\| MONDESCALE_TRUST_DEFAULTS\.financialGuaranteeProvider/);
  assert.match(institutions, /professionalInsurance \|\| MONDESCALE_TRUST_DEFAULTS\.professionalInsuranceProvider/);
  assert.match(institutions, /TRUST_LOGOS = Object\.freeze/);
  assert.match(institutions, /Logo-Cediv-Travel\.jpg/);
  assert.match(institutions, /les_entreprises_du_voyage_logo\.png/);
  assert.match(institutions, /Atout_France\.jpg/);
  assert.match(institutions, /Groupama_logo\.svg/);
  assert.match(institutions, /className="public-institutional-logo"/);
  assert.match(institutions, /title: "Garantie financière"/);
  assert.match(institutions, /title: "Responsabilité civile professionnelle"/);
  assert.match(institutions, /Atout France/);
  assert.match(institutions, /CEDIV Travel/);
  assert.match(institutions, /Les Entreprises du Voyage/);
  assert.match(institutionCss, /public-institutional-logo-wrap/);
  assert.match(institutionCss, /grid-template-columns: repeat\(auto-fit, minmax\(210px, 1fr\)\)/);
});
