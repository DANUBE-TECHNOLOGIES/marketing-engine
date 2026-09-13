// MSE-25.214 acceptance notes for VM/build validation.
// The recommendation UI is deliberately read-only and consumes the existing
// MSE-25.213 funnel-intelligence endpoint. It never writes telemetry or leads.
// Guardrails: >=20 views per segment; priority is based on the observed worst
// adjacent-stage loss; insufficient samples always recommend continued collection.
