const express = require("express");
const fs = require("fs");
const path = require("path");

module.exports = function createAutomationLogsRoutes() {
  const router = express.Router();

  const logPath = path.join(process.env.HOME || "/home/admin1", "mondescale-local-engine/logs/daily-automation.log");

  router.get("/automation/logs", async (req, res) => {
    try {
      if (!fs.existsSync(logPath)) {
        return res.json({
          exists: false,
          lines: [],
          raw: ""
        });
      }

      const raw = fs.readFileSync(logPath, "utf8");
      const lines = raw.split("\n").slice(-250);

      res.json({
        exists: true,
        path: logPath,
        totalLines: raw.split("\n").length,
        lines,
        raw: lines.join("\n")
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  router.post("/automation/run-now", async (req, res) => {
    try {
      const response = await fetch("http://localhost:4000/automation/daily-run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const text = await response.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      res.json({
        ok: response.ok,
        status: response.status,
        data
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  });

  return router;
};
