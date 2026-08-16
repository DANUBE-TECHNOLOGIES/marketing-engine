"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_VALIDATED_BASE_SHA,
  EXPECTED_BRANCH,
  GITHUB_REPOSITORY,
  GITHUB_WORKFLOW_ID,
  GITHUB_WORKFLOW_NAME,
  REQUIRED_HEALTH_FLAGS,
  RUNTIME_PROTECTED_PATHS,
  assertHealth,
  assertRepositoryState,
  attestValidatedBaseline,
  baselineWorkflowRunsUrl,
  selectSuccessfulBaselineRun,
} = require("../scripts/mse-25-30-preflight");

const PREFLIGHT_PATH = "backend/scripts/mse-25-30-preflight.js";
const PACKAGE_PATH = "backend/package.json";
const VALIDATED_SHA = "f2bc860dfaf3887560ae0da7a18ea884a1dce1ad";

function validState(overrides = {}) {
  return {
    branch: EXPECTED_BRANCH,
    head: "1627cfca69ae02a7ea5c3a356cd3ebb6762a4bd4",
    dirty: false,
    validatedBaseSha: DEFAULT_VALIDATED_BASE_SHA,
    baselineAncestor: true,
    protectedChanges: [],
    ...overrides,
  };
}

function validHealth(overrides = {}) {
  return {
    status: "ok",
    capability: "minisite-seo-enrichment",
    ...Object.fromEntries(REQUIRED_HEALTH_FLAGS.map((flag) => [flag, true])),
    ...overrides,
  };
}

function successfulWorkflowRun(overrides = {}) {
  return {
    id: 31952176736,
    name: GITHUB_WORKFLOW_NAME,
    head_sha: VALIDATED_SHA,
    head_branch: EXPECTED_BRANCH,
    event: "push",
    status: "completed",
    conclusion: "success",
    html_url: "https://github.com/DANUBE-TECHNOLOGIES/marketing-engine/actions/runs/31952176736",
    created_at: "2026-08-16T14:15:24Z",
    updated_at: "2026-08-16T14:16:00Z",
    ...overrides,
  };
}

test("preflight autorise des commits sans rapport apres la baseline validee", () => {
  assert.doesNotThrow(() => assertRepositoryState(validState()));
});

test("preflight refuse une baseline validee absente de l'historique courant", () => {
  assert.throws(
    () => assertRepositoryState(validState({ baselineAncestor: false })),
    (error) => {
      assert.equal(error.code, "MSE_25_30_PREFLIGHT_BASELINE_MISMATCH");
      assert.equal(error.details.validatedBaseSha, DEFAULT_VALIDATED_BASE_SHA);
      return true;
    },
  );
});

test("preflight refuse un runtime MSE-25.30 modifie depuis la baseline validee", () => {
  const protectedChanges = [
    "backend/src/modules/minisite-seo-enrichment/service.js",
  ];
  assert.throws(
    () => assertRepositoryState(validState({ protectedChanges })),
    (error) => {
      assert.equal(error.code, "MSE_25_30_PREFLIGHT_RUNTIME_CHANGED");
      assert.deepEqual(error.details.protectedChanges, protectedChanges);
      return true;
    },
  );
});

test("preflight protege aussi sa propre chaine de securite contre une derive de baseline", () => {
  assert.ok(
    RUNTIME_PROTECTED_PATHS.includes(PREFLIGHT_PATH),
    `${PREFLIGHT_PATH} doit rester protege par le preflight`,
  );

  assert.throws(
    () => assertRepositoryState(validState({ protectedChanges: [PREFLIGHT_PATH] })),
    (error) => {
      assert.equal(error.code, "MSE_25_30_PREFLIGHT_RUNTIME_CHANGED");
      assert.deepEqual(error.details.protectedChanges, [PREFLIGHT_PATH]);
      return true;
    },
  );
});

test("preflight protege les commandes npm qui choisissent les wrappers operateur", () => {
  assert.ok(
    RUNTIME_PROTECTED_PATHS.includes(PACKAGE_PATH),
    `${PACKAGE_PATH} doit rester protege par le preflight`,
  );

  assert.throws(
    () => assertRepositoryState(validState({ protectedChanges: [PACKAGE_PATH] })),
    (error) => {
      assert.equal(error.code, "MSE_25_30_PREFLIGHT_RUNTIME_CHANGED");
      assert.deepEqual(error.details.protectedChanges, [PACKAGE_PATH]);
      return true;
    },
  );
});

test("les gardes branche et working tree restent actives", () => {
  assert.throws(
    () => assertRepositoryState(validState({ branch: "develop" })),
    (error) => error.code === "MSE_25_30_PREFLIGHT_BRANCH_MISMATCH",
  );
  assert.throws(
    () => assertRepositoryState(validState({ dirty: true })),
    (error) => error.code === "MSE_25_30_PREFLIGHT_DIRTY_WORKTREE",
  );
});

test("preflight exige toutes les garanties runtime annoncees par health", () => {
  assert.doesNotThrow(() => assertHealth(validHealth()));

  for (const flag of REQUIRED_HEALTH_FLAGS) {
    assert.throws(
      () => assertHealth(validHealth({ [flag]: false })),
      (error) => {
        assert.equal(error.code, "MSE_25_30_PREFLIGHT_HEALTH_CAPABILITY_MISSING");
        assert.deepEqual(error.details.missingCapabilities, [flag]);
        return true;
      },
    );
  }
});

test("preflight refuse un endpoint health qui n'est pas MSE-25.30", () => {
  assert.throws(
    () => assertHealth(validHealth({ capability: "other-capability" })),
    (error) => error.code === "MSE_25_30_PREFLIGHT_HEALTH_NOT_READY",
  );
});

test("preflight exige une SHA complete avant de consulter GitHub Actions", () => {
  assert.throws(
    () => baselineWorkflowRunsUrl("f2bc860"),
    (error) => {
      assert.equal(error.code, "MSE_25_30_PREFLIGHT_BASELINE_SHA_INVALID");
      return true;
    },
  );

  const url = baselineWorkflowRunsUrl(VALIDATED_SHA);
  assert.match(url, new RegExp(`/repos/${GITHUB_REPOSITORY}/actions/workflows/${GITHUB_WORKFLOW_ID}/runs`));
  assert.match(url, new RegExp(`head_sha=${VALIDATED_SHA}`));
  assert.match(url, /status=success/);
});

test("preflight accepte uniquement le run push reussi exact de la baseline", () => {
  const attestation = selectSuccessfulBaselineRun({
    workflow_runs: [successfulWorkflowRun()],
  }, VALIDATED_SHA);

  assert.equal(attestation.ok, true);
  assert.equal(attestation.runId, 31952176736);
  assert.equal(attestation.headSha, VALIDATED_SHA);
  assert.equal(attestation.headBranch, EXPECTED_BRANCH);
  assert.equal(attestation.event, "push");
  assert.equal(attestation.conclusion, "success");
});

test("preflight refuse une baseline seulement validee manuellement, sur une autre branche ou en echec", () => {
  for (const run of [
    successfulWorkflowRun({ event: "workflow_dispatch" }),
    successfulWorkflowRun({ head_branch: "develop" }),
    successfulWorkflowRun({ conclusion: "failure" }),
    successfulWorkflowRun({ status: "in_progress", conclusion: null }),
    successfulWorkflowRun({ head_sha: "a".repeat(40) }),
  ]) {
    assert.throws(
      () => selectSuccessfulBaselineRun({ workflow_runs: [run] }, VALIDATED_SHA),
      (error) => {
        assert.equal(error.code, "MSE_25_30_PREFLIGHT_BASELINE_CI_NOT_ATTESTED");
        return true;
      },
    );
  }
});

test("preflight transforme une indisponibilite GitHub en blocage explicite", async () => {
  await assert.rejects(
    () => attestValidatedBaseline(VALIDATED_SHA, {
      request: async () => {
        const error = new Error("rate limited");
        error.code = "HTTP_403";
        throw error;
      },
      githubToken: "",
    }),
    (error) => {
      assert.equal(error.code, "MSE_25_30_PREFLIGHT_BASELINE_CI_ATTESTATION_UNAVAILABLE");
      assert.equal(error.details.validatedBaseSha, VALIDATED_SHA);
      assert.equal(error.details.causeCode, "HTTP_403");
      return true;
    },
  );
});

test("preflight construit et conserve l'attestation GitHub Actions certifiee", async () => {
  let requestedUrl = null;
  let requestedOptions = null;
  const attestation = await attestValidatedBaseline(VALIDATED_SHA, {
    request: async (url, options) => {
      requestedUrl = url;
      requestedOptions = options;
      return { workflow_runs: [successfulWorkflowRun()] };
    },
    githubToken: "token-test",
  });

  assert.match(requestedUrl, new RegExp(`head_sha=${VALIDATED_SHA}`));
  assert.equal(requestedOptions.headers.Authorization, "Bearer token-test");
  assert.equal(attestation.repository, GITHUB_REPOSITORY);
  assert.equal(attestation.workflowId, GITHUB_WORKFLOW_ID);
  assert.equal(attestation.workflowName, GITHUB_WORKFLOW_NAME);
  assert.equal(attestation.runId, 31952176736);
});
