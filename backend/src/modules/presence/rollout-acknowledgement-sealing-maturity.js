"use strict";

function evaluateAcknowledgementSealingMaturity(chainAudit = {}) {
  const versioned = chainAudit.versioned === true;
  const integrityReady = chainAudit.ready !== false;
  const coverage = Number(chainAudit.explicitCoveragePercent || 0);
  const fullyExplicit = chainAudit.fullyExplicit === true;
  const legacyCount = Number(chainAudit.legacyRootDeclarations || 0);
  const explicitCount = Number(chainAudit.explicitRootDeclarations || 0);
  const status = !versioned
    ? "not_started"
    : !integrityReady
      ? "invalid"
      : fullyExplicit
        ? "fully_explicit"
        : coverage > 0
          ? "progressing"
          : "legacy_valid";
  const warning = integrityReady && versioned && !fullyExplicit
    ? "acknowledgement_chain_not_fully_explicit"
    : null;
  return Object.freeze({
    status,
    integrityReady,
    versioned,
    fullyExplicit,
    explicitCoveragePercent: coverage,
    explicitRootDeclarations: explicitCount,
    legacyRootDeclarations: legacyCount,
    sealedFromSnapshotId: chainAudit.sealedFromSnapshotId || null,
    warning,
    blocking: integrityReady === false
  });
}

module.exports = { evaluateAcknowledgementSealingMaturity };
