"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function createLogger(root, command) {
  const file = path.join(root, "logs", `${timestamp()}-${command}.log`);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  function write(level, message, details = null) {
    const record = {
      at: new Date().toISOString(),
      level,
      command,
      hostname: os.hostname(),
      user: process.env.USER || process.env.LOGNAME || "unknown",
      message,
      details,
    };

    fs.appendFileSync(file, `${JSON.stringify(record)}\n`);

    const prefix = {
      info: "ℹ",
      success: "✓",
      warn: "!",
      error: "✗",
    }[level] || "•";

    const output = `${prefix} ${message}`;
    level === "error" ? console.error(output) : console.log(output);
  }

  return {
    file,
    info: (message, details) => write("info", message, details),
    success: (message, details) => write("success", message, details),
    warn: (message, details) => write("warn", message, details),
    error: (message, details) => write("error", message, details),
  };
}

module.exports = { createLogger };
