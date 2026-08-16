"use strict";

const INSTALLED = Symbol.for("mse-25.30.summary-consistency-installed");

function metadataSummary(plans = []) {
  let pages = 0;
  let fields = 0;

  for (const plan of plans || []) {
    for (const page of plan?.pages || []) {
      const metadataChanges = (page?.changes || []).filter(
        (change) => change?.blockType === "page"
      );
      if (metadataChanges.length > 0) pages += 1;
      fields += metadataChanges.length;
    }
  }

  return {
    metadataPagesChanged: pages,
    metadataFieldsChanged: fields,
  };
}

function installSummaryConsistency(ServiceClass) {
  if (!ServiceClass?.prototype || ServiceClass.prototype[INSTALLED]) return ServiceClass;
  const prototype = ServiceClass.prototype;
  const originalBuildNetwork = prototype.buildNetworkContentOptimization;

  if (typeof originalBuildNetwork !== "function") {
    throw new Error("MSE-25.30 summary consistency requires network content optimization.");
  }

  prototype.buildNetworkContentOptimization = async function buildNetworkContentOptimizationWithConsistentSummary(options = {}) {
    const plan = await originalBuildNetwork.call(this, options);
    const metadata = metadataSummary(plan?.plans || []);
    return {
      ...plan,
      summary: {
        ...(plan?.summary || {}),
        ...metadata,
      },
    };
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
  installSummaryConsistency,
  metadataSummary,
};
