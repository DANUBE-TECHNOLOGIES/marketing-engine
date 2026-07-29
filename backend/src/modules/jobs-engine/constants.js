"use strict";

const JOB_STATUS = Object.freeze({
  QUEUED: "queued",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELLED: "cancelled",
  DEAD: "dead",
});

const DEFAULTS = Object.freeze({
  maxAttempts: 3,
  retryDelaySeconds: 60,
  leaseSeconds: 300,
});

module.exports = { JOB_STATUS, DEFAULTS };
