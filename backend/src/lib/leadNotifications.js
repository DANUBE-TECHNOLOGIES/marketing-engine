"use strict";

const nodemailer = require("nodemailer");

const PROJECT_LABELS = {
  leisure: "Voyage & vacances",
  group: "Voyage en groupe",
  business: "Business Travel",
};

function clean(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function smtpConfiguration() {
  const enabled = String(process.env.LEAD_NOTIFICATIONS_ENABLED || "true").toLowerCase() !== "false";
  const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"];
  const missing = required.filter((key) => !clean(process.env[key]));
  return {
    enabled,
    missing,
    host: clean(process.env.SMTP_HOST),
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    user: clean(process.env.SMTP_USER),
    pass: clean(process.env.SMTP_PASS),
    from: clean(process.env.LEAD_NOTIFICATION_FROM || process.env.SMTP_FROM || process.env.SMTP_USER),
    cc: clean(process.env.LEAD_NOTIFICATION_CC),
    cockpitUrl: clean(process.env.LEAD_COCKPIT_URL || "https://localengine.mondescale.com/leads"),
  };
}

function buildLeadMessage({ lead, agency }) {
  const project = PROJECT_LABELS[lead.projectType] || lead.projectType || "Projet de voyage";
  const agencyLabel = agency?.city || agency?.name || lead.siteSlug || "Agence";
  const subject = `[Nouvelle demande web] ${project} - ${agencyLabel}`;

  const lines = [
    "Une nouvelle demande client vient d’être reçue depuis le mini-site.",
    "",
    `Agence : ${agency?.name || agencyLabel}`,
    `Type de projet : ${project}`,
    `Client : ${lead.name}`,
    `Téléphone : ${lead.phone}`,
    `E-mail : ${lead.email}`,
    `Destination / besoin : ${lead.destination}`,
    `Dates / période : ${lead.travelDates}`,
    `Voyageurs : ${lead.travellers}`,
    `Budget : ${lead.budget || "Non précisé"}`,
    `Précisions : ${lead.wishes || "Aucune précision complémentaire"}`,
    `Source : ${lead.source}`,
    `Référence : ${lead.id}`,
    "",
    `Cockpit : ${smtpConfiguration().cockpitUrl}`,
  ];

  const text = lines.join("\n");
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family:Arial,sans-serif;background:#f4f7fa;margin:0;padding:24px;color:#102a43;">
  <div style="max-width:720px;margin:auto;background:#fff;border-radius:18px;padding:28px;box-shadow:0 8px 30px rgba(15,46,70,.08);">
    <p style="margin:0 0 8px;color:#42aeb4;font-weight:700;text-transform:uppercase;font-size:12px;">Nouvelle demande client</p>
    <h1 style="margin:0 0 6px;font-size:26px;">${escapeHtml(project)}</h1>
    <p style="margin:0 0 24px;color:#64748b;">${escapeHtml(agency?.name || agencyLabel)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#64748b;width:180px;">Client</td><td style="padding:8px 0;font-weight:700;">${escapeHtml(lead.name)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Téléphone</td><td style="padding:8px 0;">${escapeHtml(lead.phone)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">E-mail</td><td style="padding:8px 0;">${escapeHtml(lead.email)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Destination / besoin</td><td style="padding:8px 0;">${escapeHtml(lead.destination)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Dates / période</td><td style="padding:8px 0;">${escapeHtml(lead.travelDates)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Voyageurs</td><td style="padding:8px 0;">${escapeHtml(lead.travellers)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Budget</td><td style="padding:8px 0;">${escapeHtml(lead.budget || "Non précisé")}</td></tr>
    </table>
    <div style="margin-top:22px;background:#f8fafc;border-radius:14px;padding:18px;">
      <div style="font-size:12px;color:#64748b;margin-bottom:6px;">Précisions</div>
      <div style="white-space:pre-wrap;">${escapeHtml(lead.wishes || "Aucune précision complémentaire.")}</div>
    </div>
    <div style="margin-top:24px;">
      <a href="${escapeHtml(smtpConfiguration().cockpitUrl)}" style="display:inline-block;background:#0f2e46;color:#fff;text-decoration:none;border-radius:12px;padding:13px 18px;font-weight:700;">Ouvrir les demandes clients</a>
    </div>
    <p style="margin:22px 0 0;color:#94a3b8;font-size:12px;">Référence ${escapeHtml(lead.id)} · Source ${escapeHtml(lead.source)}</p>
  </div>
</body></html>`;

  return { subject, text, html };
}

async function sendLeadNotification({ lead, agency }) {
  const config = smtpConfiguration();
  const to = clean(agency?.email);

  if (!config.enabled) {
    return { sent: false, status: "DISABLED", reason: "LEAD_NOTIFICATIONS_DISABLED", to };
  }
  if (!to) {
    return { sent: false, status: "SKIPPED", reason: "AGENCY_EMAIL_MISSING", to };
  }
  if (config.missing.length) {
    return { sent: false, status: "SKIPPED", reason: `SMTP_MISSING:${config.missing.join(",")}`, to };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  const message = buildLeadMessage({ lead, agency });
  const info = await transporter.sendMail({
    from: config.from,
    to,
    cc: config.cc || undefined,
    replyTo: lead.email || undefined,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  return { sent: true, status: "SENT", messageId: info.messageId || null, to, cc: config.cc || null };
}

module.exports = {
  PROJECT_LABELS,
  buildLeadMessage,
  sendLeadNotification,
  smtpConfiguration,
};
