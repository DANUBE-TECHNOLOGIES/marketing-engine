"use strict";

const INSTALLED = Symbol.for("mse-25.30.idempotence-installed");
const DIFFERENTIATION_PURPOSE = "local-agency-differentiation";

function sameValue(left, right) {
  if (left === right) return true;
  if (left === null || left === undefined || right === null || right === undefined) return false;
  if (typeof left !== typeof right) return false;
  if (typeof left !== "object") return false;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch (_error) {
    return false;
  }
}

function normalizeBlockType(block = {}) {
  return String(block.type || block.blockType || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function sameDifferentiationContent(block = {}, expected = {}) {
  if (normalizeBlockType(block) !== "rich-text") return false;
  const content = block.content || {};
  return String(content.title || "").trim() === String(expected.title || "").trim()
    && String(content.html || "").trim() === String(expected.html || "").trim();
}

function reconcileDifferentiation(page = {}) {
  let blocks = Array.isArray(page.optimizedBlocks) ? [...page.optimizedBlocks] : [];
  let changes = Array.isArray(page.changes) ? [...page.changes] : [];

  for (const change of [...changes]) {
    if (
      change?.purpose !== DIFFERENTIATION_PURPOSE
      || change?.blockType !== "rich-text"
      || change?.field !== "block"
      || !change?.next
    ) {
      continue;
    }

    const matches = blocks
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => sameDifferentiationContent(block, change.next));

    /*
     * Les premiers rollouts MSE-25.30 ont persisté le contenu mais le Core
     * historique a perdu seo.purpose. Editorial hardening ajoute alors un
     * deuxième bloc identique. S'il existe déjà un bloc historique au contenu
     * déterministe exact, on conserve celui-ci et on retire uniquement le
     * duplicat généré dans le plan courant.
     */
    const historical = matches.find(({ block }) => block?.seo?.purpose !== DIFFERENTIATION_PURPOSE);
    const generated = matches.find(({ block }) => block?.seo?.purpose === DIFFERENTIATION_PURPOSE);
    if (!historical || !generated || historical.index === generated.index) continue;

    blocks.splice(generated.index, 1);
    changes = changes.filter((candidate) => candidate !== change);
  }

  return { ...page, optimizedBlocks: blocks, changes };
}

function reconcilePage(page = {}) {
  const differentiated = reconcileDifferentiation(page);
  const changes = (differentiated.changes || []).filter(
    (change) => !sameValue(change?.previous, change?.next)
  );
  return {
    ...differentiated,
    changes,
    changed: changes.length > 0,
  };
}

function reconcileAgencyPlan(plan = {}) {
  const pages = (plan.pages || []).map(reconcilePage);
  return {
    ...plan,
    pages,
    summary: {
      ...(plan.summary || {}),
      pagesChanged: pages.filter((page) => page.changed).length,
      blockFieldsChanged: pages.reduce((sum, page) => sum + (page.changes || []).length, 0),
    },
  };
}

function reconcileNetworkPlan(plan = {}) {
  const plans = (plan.plans || []).map(reconcileAgencyPlan);
  return {
    ...plan,
    plans,
    summary: {
      ...(plan.summary || {}),
      pagesChanged: plans.reduce((sum, agencyPlan) => sum + Number(agencyPlan.summary?.pagesChanged || 0), 0),
    },
  };
}

function installIdempotenceGuard(ServiceClass) {
  if (!ServiceClass?.prototype || ServiceClass.prototype[INSTALLED]) return ServiceClass;
  const prototype = ServiceClass.prototype;
  const originalBuildNetwork = prototype.buildNetworkContentOptimization;
  if (typeof originalBuildNetwork !== "function") {
    throw new Error("MSE-25.30 idempotence guard requires network content optimization.");
  }

  prototype.buildNetworkContentOptimization = async function buildNetworkContentOptimizationIdempotent(options = {}) {
    return reconcileNetworkPlan(await originalBuildNetwork.call(this, options));
  };

  Object.defineProperty(prototype, INSTALLED, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return ServiceClass;
}

module.exports = {
  DIFFERENTIATION_PURPOSE,
  installIdempotenceGuard,
  reconcileAgencyPlan,
  reconcileDifferentiation,
  reconcileNetworkPlan,
  reconcilePage,
  sameDifferentiationContent,
  sameValue,
};
