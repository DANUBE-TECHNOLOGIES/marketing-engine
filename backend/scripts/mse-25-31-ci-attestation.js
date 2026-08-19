"use strict";

const GITHUB_REPOSITORY = "DANUBE-TECHNOLOGIES/marketing-engine";
const GITHUB_WORKFLOW_ID = 334395003;
const GITHUB_WORKFLOW_NAME = "MSE-25 Search Console and indexation checks";
const GITHUB_WORKFLOW_PATH = ".github/workflows/mse-25-16.yml";
const EXPECTED_WORKFLOW_BLOB_SHA = "141f7d48c78933267075316b31b73176beae1749";
const DEFAULT_GITHUB_API_ORIGIN = "https://api.github.com";
const SHA40 = /^[0-9a-f]{40}$/i;

function normalizeOrigin(value) {
  return String(value || DEFAULT_GITHUB_API_ORIGIN).trim().replace(/\/+$/g, "");
}

function assertHeadSha(value) {
  const sha = String(value || "").trim().toLowerCase();
  if (!SHA40.test(sha)) {
    const error = new Error("Le HEAD MSE-25.31 doit être une SHA Git complète.");
    error.code = "MSE_25_31_CI_HEAD_INVALID";
    error.details = { head: value || null };
    throw error;
  }
  return sha;
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: "application/vnd.github+json", ...(options.headers || {}) },
  });
  let payload = null;
  try { payload = await response.json(); } catch (_error) { payload = null; }
  if (!response.ok) {
    const error = new Error(payload?.message || `HTTP ${response.status}`);
    error.code = "MSE_25_31_CI_HTTP_ERROR";
    error.statusCode = response.status;
    error.details = payload || {};
    throw error;
  }
  return payload;
}

function workflowRunsUrl(head, {
  githubApiOrigin = DEFAULT_GITHUB_API_ORIGIN,
  repository = GITHUB_REPOSITORY,
  workflowId = GITHUB_WORKFLOW_ID,
} = {}) {
  const sha = assertHeadSha(head);
  return `${normalizeOrigin(githubApiOrigin)}/repos/${repository}/actions/workflows/${workflowId}/runs?head_sha=${encodeURIComponent(sha)}&status=success&per_page=10`;
}

function selectSuccessfulPushRun(payload, head, {
  expectedBranch = "feature/mse-25-31-local-seo-quality-uplift",
  workflowName = GITHUB_WORKFLOW_NAME,
} = {}) {
  const sha = assertHeadSha(head);
  const runs = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs : [];
  const run = runs.find((item) =>
    String(item?.head_sha || "").trim().toLowerCase() === sha
    && item?.status === "completed"
    && item?.conclusion === "success"
    && item?.name === workflowName
    && item?.event === "push"
    && item?.head_branch === expectedBranch
  );
  if (!run) {
    const error = new Error(`Aucun run push GitHub Actions réussi ne certifie le HEAD ${sha}.`);
    error.code = "MSE_25_31_CI_NOT_ATTESTED";
    error.details = { head: sha, expectedBranch };
    throw error;
  }
  return {
    ok: true,
    repository: GITHUB_REPOSITORY,
    workflowId: GITHUB_WORKFLOW_ID,
    workflowName: run.name,
    workflowPath: GITHUB_WORKFLOW_PATH,
    workflowBlobSha: EXPECTED_WORKFLOW_BLOB_SHA,
    runId: run.id,
    headSha: String(run.head_sha).toLowerCase(),
    headBranch: run.head_branch,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    htmlUrl: run.html_url || null,
    createdAt: run.created_at || null,
    updatedAt: run.updated_at || null,
  };
}

async function attestHead(head, options = {}) {
  const url = workflowRunsUrl(head, options);
  const payload = await jsonRequest(url, options.fetchOptions || {});
  return selectSuccessfulPushRun(payload, head, options);
}

function assertAttestation(attestation = {}, { head, branch } = {}) {
  const expectedHead = assertHeadSha(head);
  if (
    attestation?.ok !== true
    || String(attestation.headSha || "").toLowerCase() !== expectedHead
    || (branch && attestation.headBranch !== branch)
    || attestation.event !== "push"
    || attestation.status !== "completed"
    || attestation.conclusion !== "success"
    || attestation.workflowName !== GITHUB_WORKFLOW_NAME
    || attestation.workflowPath !== GITHUB_WORKFLOW_PATH
    || attestation.workflowBlobSha !== EXPECTED_WORKFLOW_BLOB_SHA
  ) {
    const error = new Error("L'attestation CI MSE-25.31 ne correspond pas exactement au HEAD et au workflow approuvés.");
    error.code = "MSE_25_31_CI_ATTESTATION_INVALID";
    error.details = { expectedHead, branch: branch || null, attestation };
    throw error;
  }
  return attestation;
}

function assertSameAttestation(sealed = {}, live = {}, context = {}) {
  const sealedProof = assertAttestation(sealed, context);
  const liveProof = assertAttestation(live, context);
  const same = ["repository", "workflowId", "workflowName", "workflowPath", "workflowBlobSha", "runId", "headSha", "headBranch", "event", "status", "conclusion"]
    .every((key) => sealedProof[key] === liveProof[key]);
  if (!same) {
    const error = new Error("L'attestation CI active diffère de celle scellée au preflight MSE-25.31.");
    error.code = "MSE_25_31_CI_ATTESTATION_CHANGED";
    error.details = { sealed: sealedProof, live: liveProof };
    throw error;
  }
  return liveProof;
}

module.exports = {
  DEFAULT_GITHUB_API_ORIGIN,
  EXPECTED_WORKFLOW_BLOB_SHA,
  GITHUB_REPOSITORY,
  GITHUB_WORKFLOW_ID,
  GITHUB_WORKFLOW_NAME,
  GITHUB_WORKFLOW_PATH,
  assertAttestation,
  assertSameAttestation,
  assertHeadSha,
  attestHead,
  jsonRequest,
  normalizeOrigin,
  selectSuccessfulPushRun,
  workflowRunsUrl,
};