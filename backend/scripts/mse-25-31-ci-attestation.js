"use strict";

const GITHUB_REPOSITORY = "DANUBE-TECHNOLOGIES/marketing-engine";
const GITHUB_WORKFLOW_ID = 334395003;
const GITHUB_WORKFLOW_NAME = "MSE-25 Search Console and indexation checks";
const GITHUB_WORKFLOW_PATH = ".github/workflows/mse-25-16.yml";
const EXPECTED_WORKFLOW_BLOB_SHA = "085cdb3549d257f9a02d81914539ecef76343f10";
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
    error.details = {
      head: sha,
      expectedBranch,
      candidateRuns: runs.map((item) => ({
        id: item?.id ?? null,
        headSha: item?.head_sha ?? null,
        headBranch: item?.head_branch ?? null,
        event: item?.event ?? null,
        status: item?.status ?? null,
        conclusion: item?.conclusion ?? null,
        name: item?.name ?? null,
      })),
    };
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

async function attestHead(head, {
  request = jsonRequest,
  githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "",
  githubApiOrigin,
  expectedBranch = "feature/mse-25-31-local-seo-quality-uplift",
} = {}) {
  const sha = assertHeadSha(head);
  const url = workflowRunsUrl(sha, { githubApiOrigin });
  let payload;
  try {
    payload = await request(url, {
      headers: {
        "User-Agent": "mondescale-mse-25-31-preflight",
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch (cause) {
    const error = new Error("Impossible de vérifier le HEAD MSE-25.31 auprès de GitHub Actions.");
    error.code = "MSE_25_31_CI_ATTESTATION_UNAVAILABLE";
    error.details = { head: sha, cause: cause?.message || String(cause), causeCode: cause?.code || null };
    throw error;
  }
  return selectSuccessfulPushRun(payload, sha, { expectedBranch });
}

function assertAttestation(attestation = {}, {
  head,
  branch = "feature/mse-25-31-local-seo-quality-uplift",
  workflowBlobSha = EXPECTED_WORKFLOW_BLOB_SHA,
} = {}) {
  const issues = [];
  const expectedHead = assertHeadSha(head);
  if (attestation.ok !== true) issues.push({ code: "attestation-not-ok" });
  if (attestation.repository !== GITHUB_REPOSITORY) issues.push({ code: "repository-mismatch" });
  if (attestation.workflowId !== GITHUB_WORKFLOW_ID || attestation.workflowName !== GITHUB_WORKFLOW_NAME) issues.push({ code: "workflow-mismatch" });
  if (attestation.workflowPath !== GITHUB_WORKFLOW_PATH || attestation.workflowBlobSha !== workflowBlobSha) issues.push({ code: "workflow-definition-mismatch" });
  if (String(attestation.headSha || "").toLowerCase() !== expectedHead) issues.push({ code: "head-mismatch" });
  if (attestation.headBranch !== branch) issues.push({ code: "branch-mismatch" });
  if (attestation.event !== "push" || attestation.status !== "completed" || attestation.conclusion !== "success") issues.push({ code: "run-result-mismatch" });
  if (!Number.isInteger(Number(attestation.runId))) issues.push({ code: "run-id-missing" });
  if (issues.length) {
    const error = new Error("L'attestation CI MSE-25.31 ne correspond pas au HEAD et au workflow approuvés.");
    error.code = "MSE_25_31_CI_ATTESTATION_INVALID";
    error.details = { issues, expectedHead, branch, workflowBlobSha };
    throw error;
  }
  return attestation;
}

function assertSameAttestation(recorded = {}, live = {}, options = {}) {
  assertAttestation(recorded, options);
  assertAttestation(live, options);
  if (recorded.runId !== live.runId) {
    const error = new Error("Le run CI enregistré par le preflight ne correspond plus au run CI attesté au moment de l'apply.");
    error.code = "MSE_25_31_CI_ATTESTATION_CHANGED";
    error.details = { recordedRunId: recorded.runId ?? null, liveRunId: live.runId ?? null };
    throw error;
  }
  return { ok: true, runId: live.runId, headSha: live.headSha, workflowBlobSha: live.workflowBlobSha };
}

module.exports = {
  DEFAULT_GITHUB_API_ORIGIN,
  EXPECTED_WORKFLOW_BLOB_SHA,
  GITHUB_REPOSITORY,
  GITHUB_WORKFLOW_ID,
  GITHUB_WORKFLOW_NAME,
  GITHUB_WORKFLOW_PATH,
  assertAttestation,
  assertHeadSha,
  assertSameAttestation,
  attestHead,
  jsonRequest,
  selectSuccessfulPushRun,
  workflowRunsUrl,
};
