const express = require("express");
const nodemailer = require("nodemailer");

module.exports = function createSeoEmailRoutes(prisma) {
  const router = express.Router();

  async function getReport() {
    const res = await fetch("http://localhost:4000/seo-report/daily");
    return await res.json();
  }

  function buildHtml(report) {
    const top3 = report.top3 || [];
    const weakest = report.weakest || [];
    const actions = report.priorityActions || [];

    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Mondescale SEO Report</title>
</head>
<body style="font-family:Arial,sans-serif;background:#f6f7fb;margin:0;padding:24px;color:#111827;">
  <div style="max-width:780px;margin:auto;background:white;border-radius:18px;padding:28px;box-shadow:0 8px 30px rgba(0,0,0,.06);">
    <h1 style="margin:0 0 8px;">Mondescale SEO Report</h1>
    <p style="margin:0 0 24px;color:#6b7280;">Rapport quotidien du réseau</p>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
      <div style="background:#f9fafb;border-radius:14px;padding:16px;">
        <div style="font-size:12px;color:#6b7280;">Score réseau</div>
        <div style="font-size:30px;font-weight:bold;">${report.networkScore}/100</div>
      </div>
      <div style="background:#f9fafb;border-radius:14px;padding:16px;">
        <div style="font-size:12px;color:#6b7280;">Actions ouvertes</div>
        <div style="font-size:30px;font-weight:bold;">${report.totalActions}</div>
      </div>
      <div style="background:#f9fafb;border-radius:14px;padding:16px;">
        <div style="font-size:12px;color:#6b7280;">Prioritaires</div>
        <div style="font-size:30px;font-weight:bold;">${report.highActions}</div>
      </div>
    </div>

    <h2>Top agences</h2>
    <ul>
      ${top3.map((a, i) => `<li><strong>${i + 1}. ${a.city}</strong> — ${a.score}/100</li>`).join("")}
    </ul>

    <h2>Agences à surveiller</h2>
    <ul>
      ${weakest.map((a, i) => `<li><strong>${i + 1}. ${a.city}</strong> — ${a.score}/100</li>`).join("")}
    </ul>

    <h2>Actions prioritaires</h2>
    ${
      actions.length
        ? actions.map((a) => `
          <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:10px;">
            <div style="font-size:12px;color:#6b7280;text-transform:uppercase;">${a.city || "Réseau"} · ${a.lever}</div>
            <div style="font-weight:bold;margin-top:4px;">${a.title}</div>
            <div style="font-size:14px;color:#374151;margin-top:6px;">${a.description || ""}</div>
          </div>
        `).join("")
        : `<p>Aucune action prioritaire ouverte.</p>`
    }

    <h2>Version texte</h2>
    <pre style="background:#f9fafb;border-radius:12px;padding:16px;white-space:pre-wrap;font-size:13px;">${report.reportText || ""}</pre>
  </div>
</body>
</html>`;
  }

  router.get("/seo-email/preview", async (req, res) => {
    try {
      const report = await getReport();

      res.json({
        ok: true,
        subject: `Mondescale SEO Report — Score réseau ${report.networkScore}/100`,
        to: process.env.SEO_REPORT_TO || "",
        html: buildHtml(report),
        text: report.reportText,
        report
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  });

  router.post("/seo-email/send-daily", async (req, res) => {
    try {
      const report = await getReport();

      const required = [
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASS",
        "SEO_REPORT_TO"
      ];

      const missing = required.filter((key) => !process.env[key]);

      const subject = `Mondescale SEO Report — Score réseau ${report.networkScore}/100`;
      const html = buildHtml(report);
      const text = report.reportText;

      if (missing.length) {
        return res.json({
          ok: true,
          sent: false,
          mode: "preview",
          reason: "SMTP non configuré",
          missing,
          subject,
          to: process.env.SEO_REPORT_TO || "",
          text,
          html
        });
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || "false") === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.SEO_REPORT_TO,
        subject,
        text,
        html
      });

      res.json({
        ok: true,
        sent: true,
        messageId: info.messageId,
        to: process.env.SEO_REPORT_TO
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
