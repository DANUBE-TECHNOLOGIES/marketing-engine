"use strict";

const dataForSeoConfig = require("../../config/dataForSeo");

function authHeader(config = dataForSeoConfig) {
  const login = config.credentials?.login || "";
  const password = config.credentials?.password || "";
  if (!login || !password) return null;
  return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
}

function assertConfigured(config = dataForSeoConfig) {
  const authorization = authHeader(config);
  if (!config.enabled || !authorization) {
    const error = new Error("DataForSEO citation discovery is not configured");
    error.status = 503;
    throw error;
  }
  return authorization;
}

async function requestJson(url, options = {}, fetchImpl = global.fetch) {
  if (typeof fetchImpl !== "function") throw new Error("Fetch API indisponible");
  const response = await fetchImpl(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.status_message || `DataForSEO HTTP ${response.status}`);
    error.status = response.status;
    error.details = body;
    throw error;
  }
  return body;
}

async function submitDiscoveryTask(query, { config = dataForSeoConfig, fetchImpl = global.fetch } = {}) {
  const authorization = assertConfigured(config);
  const url = `${config.endpoints.baseUrl}${config.endpoints.serpTaskPost}`;
  const body = [{
    keyword: query,
    location_code: 2250,
    language_code: "fr",
    device: "desktop",
    os: "windows"
  }];
  const response = await requestJson(url, {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  }, fetchImpl);
  const task = response?.tasks?.[0];
  if (!task?.id) {
    const error = new Error(task?.status_message || "DataForSEO task id missing");
    error.status = 502;
    error.details = response;
    throw error;
  }
  return { taskId: task.id, raw: response };
}

async function readDiscoveryTask(taskId, { config = dataForSeoConfig, fetchImpl = global.fetch } = {}) {
  const authorization = assertConfigured(config);
  if (!taskId) throw new Error("taskId is required");
  const url = `${config.endpoints.baseUrl}${config.endpoints.serpTaskGet}/${encodeURIComponent(taskId)}`;
  const response = await requestJson(url, { headers: { authorization } }, fetchImpl);
  const task = response?.tasks?.[0] || null;
  const result = task?.result?.[0] || null;
  const items = Array.isArray(result?.items)
    ? result.items.filter((item) => item?.type === "organic" && (item.url || item.link))
    : [];
  return {
    taskId,
    ready: Boolean(result),
    statusCode: task?.status_code || null,
    statusMessage: task?.status_message || null,
    items,
    raw: response
  };
}

module.exports = {
  authHeader,
  assertConfigured,
  submitDiscoveryTask,
  readDiscoveryTask
};
