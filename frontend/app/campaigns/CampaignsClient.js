"use client";

import { useEffect, useState } from "react";
import { campaignApi } from "../../lib/campaign-api";

const EMPTY_OFFER = {
  title: "",
  description: "",
  price: "",
  currency: "€",
  imageUrl: "",
  href: "",
  badge: "",
};

function campaignAgencyIds(campaign) {
  return (campaign?.agencies || [])
    .map((entry) => Number(entry.agencyId ?? entry.agency?.id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function AgencyChecklist({ agencies, selectedIds, onChange, compact = false }) {
  const selected = new Set(selectedIds.map(Number));

  const toggle = (agencyId) => {
    const id = Number(agencyId);
    const next = selected.has(id)
      ? selectedIds.filter((item) => Number(item) !== id)
      : [...selectedIds, id];

    onChange(next);
  };

  return (
    <div className={`agency-checklist ${compact ? "agency-checklist-compact" : ""}`}>
      {agencies.length ? (
        agencies.map((agency) => (
          <label key={agency.id} className="agency-choice">
            <input
              type="checkbox"
              checked={selected.has(Number(agency.id))}
              onChange={() => toggle(agency.id)}
            />
            <span>
              <strong>{agency.name}</strong>
              <small>{agency.city || "Ville non renseignée"}</small>
            </span>
          </label>
        ))
      ) : (
        <small>Aucune agence disponible pour ce tenant.</small>
      )}
    </div>
  );
}

function AssetStatus({ status }) {
  return (
    <span className={`offer-status offer-status-${status || "review"}`}>
      {status || "review"}
    </span>
  );
}

function GeneratedContentPanel({ campaign, onChanged }) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAssets = async () => {
    setLoading(true);
    setError("");

    try {
      const items = await campaignApi.assets(campaign.id, {
        type: "seo-content",
      });
      setAssets(Array.isArray(items) ? items : []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);

    if (next) {
      await loadAssets();
    }
  };

  const decide = async (asset, decision) => {
    setError("");
    setNotice("");

    try {
      if (decision === "approved") {
        await campaignApi.approveAsset(campaign.id, asset.id, {
          note: "Validation éditoriale depuis Campaign Manager",
        });
        setNotice(
          "Contenu approuvé et publié. Il est maintenant disponible pour les blocs Inspirations du Website Designer."
        );
      } else {
        await campaignApi.rejectAsset(campaign.id, asset.id, {
          note: "Rejet éditorial depuis Campaign Manager",
        });
        setNotice("Contenu rejeté et retiré du catalogue Inspirations.");
      }

      await loadAssets();
      await onChanged();
    } catch (decisionError) {
      setError(decisionError.message);
    }
  };

  return (
    <section className="offer-panel generated-content-panel">
      <button
        type="button"
        className="offer-toggle"
        onClick={toggle}
      >
        {open ? "Masquer les contenus générés" : "Valider les contenus générés"}
      </button>

      {open ? (
        <div className="offer-panel-body">
          <div className="offer-panel-heading">
            <div>
              <strong>Contenus éditoriaux générés</strong>
              <small>
                L’approbation publie le contenu éditorial et le rend disponible pour les blocs Inspirations du Website Designer.
              </small>
            </div>
          </div>

          {error ? <div className="offer-error">{error}</div> : null}
          {notice ? <div className="offer-notice">{notice}</div> : null}

          <div className="offer-list">
            {loading ? (
              <p>Chargement des contenus…</p>
            ) : assets.length ? (
              assets.map((asset) => {
                const payload = asset.payload || {};
                const metadata = asset.metadata || {};

                return (
                  <article className="offer-item" key={asset.id}>
                    <div className="offer-item-main">
                      <div className="offer-item-title">
                        <strong>{asset.title || payload.slug || "Contenu éditorial"}</strong>
                        <AssetStatus status={asset.status} />
                      </div>
                      <p>
                        {asset.channel === "article"
                          ? "Article / inspiration voyage"
                          : `Canal : ${asset.channel || "non renseigné"}`}
                      </p>
                      <small>
                        {payload.seoContentId
                          ? `Contenu lié : ${payload.seoContentId}`
                          : "Référence de contenu manquante"}
                        {metadata.qualityScore
                          ? ` · Qualité ${metadata.qualityScore}/100`
                          : ""}
                      </small>
                    </div>

                    {asset.status === "review" ? (
                      <div className="offer-actions">
                        <button
                          type="button"
                          disabled={!payload.seoContentId}
                          onClick={() => decide(asset, "approved")}
                        >
                          Approuver et publier
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          disabled={!payload.seoContentId}
                          onClick={() => decide(asset, "rejected")}
                        >
                          Rejeter
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <p className="offer-empty">
                Aucun contenu éditorial généré pour cette campagne.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function OfferPanel({ campaign, agencies, onChanged }) {
  const [open, setOpen] = useState(false);
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState(EMPTY_OFFER);
  const [targetIds, setTargetIds] = useState(() => campaignAgencyIds(campaign));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadOffers = async () => {
    setLoading(true);
    setError("");

    try {
      const items = await campaignApi.assets(campaign.id, {
        type: "offer",
      });

      setOffers(Array.isArray(items) ? items : []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);

    if (next) {
      await loadOffers();
    }
  };

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const saveTargets = async () => {
    setSavingTargets(true);
    setError("");
    setNotice("");

    try {
      await campaignApi.update(campaign.id, {
        agencyIds: targetIds,
      });
      setNotice(
        targetIds.length
          ? `Ciblage enregistré pour ${targetIds.length} agence(s).`
          : "Ciblage retiré : aucune offre de cette campagne ne sera diffusée sur les mini-sites."
      );
      await onChanged();
    } catch (targetError) {
      setError(targetError.message);
    } finally {
      setSavingTargets(false);
    }
  };

  const createOffer = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await campaignApi.createOffer(campaign.id, {
        ...form,
        title: form.title.trim(),
      });

      setForm(EMPTY_OFFER);
      setNotice("Offre créée et placée en relecture.");
      await loadOffers();
      await onChanged();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const decide = async (asset, decision) => {
    setError("");
    setNotice("");

    try {
      if (decision === "approved") {
        await campaignApi.approveAsset(campaign.id, asset.id, {
          note: "Validation depuis Campaign Manager",
        });
        setNotice("Offre approuvée. Elle peut désormais alimenter les mini-sites ciblés.");
      } else {
        await campaignApi.rejectAsset(campaign.id, asset.id, {
          note: "Rejet depuis Campaign Manager",
        });
        setNotice("Offre rejetée.");
      }

      await loadOffers();
      await onChanged();
    } catch (decisionError) {
      setError(decisionError.message);
    }
  };

  return (
    <section className="offer-panel">
      <button
        type="button"
        className="offer-toggle"
        onClick={toggle}
      >
        {open ? "Masquer les offres mini-site" : "Gérer les offres mini-site"}
      </button>

      {open ? (
        <div className="offer-panel-body">
          <div className="offer-panel-heading">
            <div>
              <strong>Offres mini-site</strong>
              <small>
                Une offre doit être approuvée et sa campagne doit cibler l’agence pour être visible sur son mini-site.
              </small>
            </div>
          </div>

          {error ? <div className="offer-error">{error}</div> : null}
          {notice ? <div className="offer-notice">{notice}</div> : null}

          <section className="targeting-box">
            <div className="targeting-heading">
              <div>
                <strong>Agences ciblées</strong>
                <small>{targetIds.length} agence(s) sélectionnée(s)</small>
              </div>
              <button
                type="button"
                disabled={savingTargets}
                onClick={saveTargets}
              >
                {savingTargets ? "Enregistrement…" : "Enregistrer le ciblage"}
              </button>
            </div>

            <AgencyChecklist
              agencies={agencies}
              selectedIds={targetIds}
              onChange={setTargetIds}
              compact
            />
          </section>

          {targetIds.length === 0 ? (
            <div className="offer-warning">
              Cette campagne ne cible aucune agence : ses offres approuvées ne seront affichées sur aucun mini-site.
            </div>
          ) : null}

          <form className="offer-form" onSubmit={createOffer}>
            <input
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="Titre de l’offre"
              required
            />

            <textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="Description"
              rows={3}
            />

            <div className="offer-form-row">
              <input
                value={form.price}
                onChange={(event) => update("price", event.target.value)}
                placeholder="Prix, ex. 1 490"
              />
              <input
                value={form.currency}
                onChange={(event) => update("currency", event.target.value)}
                placeholder="Devise"
              />
            </div>

            <input
              value={form.imageUrl}
              onChange={(event) => update("imageUrl", event.target.value)}
              placeholder="URL de l’image"
            />

            <input
              value={form.href}
              onChange={(event) => update("href", event.target.value)}
              placeholder="Lien de l’offre"
            />

            <input
              value={form.badge}
              onChange={(event) => update("badge", event.target.value)}
              placeholder="Badge, ex. Coup de cœur"
            />

            <button type="submit" disabled={saving}>
              {saving ? "Création…" : "Créer l’offre"}
            </button>
          </form>

          <div className="offer-list">
            {loading ? (
              <p>Chargement des offres…</p>
            ) : offers.length ? (
              offers.map((asset) => {
                const payload = asset.payload || {};

                return (
                  <article className="offer-item" key={asset.id}>
                    <div className="offer-item-main">
                      <div className="offer-item-title">
                        <strong>{asset.title}</strong>
                        <AssetStatus status={asset.status} />
                      </div>
                      <p>{payload.description || "Offre sans description."}</p>
                      <small>
                        {payload.price ? `${payload.price}${payload.currency ? ` ${payload.currency}` : ""}` : "Prix non renseigné"}
                      </small>
                    </div>

                    {asset.status === "review" ? (
                      <div className="offer-actions">
                        <button
                          type="button"
                          onClick={() => decide(asset, "approved")}
                        >
                          Approuver
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => decide(asset, "rejected")}
                        >
                          Rejeter
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <p className="offer-empty">Aucune offre mini-site dans cette campagne.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function CampaignsClient() {
  const [items, setItems] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [selectedAgencyIds, setSelectedAgencyIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");

  const load = async () => {
    setLoading(true);

    try {
      const [campaigns, agencyOptions] = await Promise.all([
        campaignApi.list(),
        campaignApi.agencyOptions(),
      ]);
      setItems(campaigns);
      setAgencies(Array.isArray(agencyOptions) ? agencyOptions : []);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      try {
        const [campaigns, agencyOptions] = await Promise.all([
          campaignApi.list(),
          campaignApi.agencyOptions(),
        ]);

        if (!active) return;

        setItems(campaigns);
        setAgencies(
          Array.isArray(agencyOptions)
            ? agencyOptions
            : []
        );
        setError("");
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitial();

    return () => {
      active = false;
    };
  }, []);

  const create = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;

    try {
      await campaignApi.create({
        name: name.trim(),
        objective: "sales",
        agencyIds: selectedAgencyIds,
      });
      setName("");
      setSelectedAgencyIds([]);
      await load();
    } catch (createError) {
      setError(createError.message);
    }
  };

  const generate = async (id) => {
    try {
      await campaignApi.generate(id);
      await load();
    } catch (generateError) {
      setError(generateError.message);
    }
  };

  return (
    <main className="campaign-shell">
      <header className="campaign-header">
        <div>
          <p className="eyebrow">Marketing Engine</p>
          <h1>Campagnes marketing</h1>
          <p>Créez, orchestrez et validez les contenus de chaque campagne.</p>
        </div>

        <form onSubmit={create} className="create-form create-campaign-form">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex. Hiver 2026"
            minLength={3}
          />

          <div className="create-targets">
            <strong>Agences ciblées</strong>
            <AgencyChecklist
              agencies={agencies}
              selectedIds={selectedAgencyIds}
              onChange={setSelectedAgencyIds}
              compact
            />
          </div>

          <button>Nouvelle campagne</button>
        </form>
      </header>

      {error ? <div className="error-box">{error}</div> : null}

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <section className="campaign-grid">
          {items.length === 0 ? (
            <div className="empty">
              Aucune campagne. Créez la première campagne du réseau.
            </div>
          ) : (
            items.map((campaign) => (
              <article key={campaign.id} className="campaign-card">
                <div className="card-top">
                  <span className={`status status-${campaign.status}`}>
                    {campaign.status}
                  </span>
                  <span>{campaign.objective}</span>
                </div>

                <h2>{campaign.name}</h2>
                <p>{campaign.description || "Campagne prête à être configurée."}</p>

                <div className="metrics">
                  <div><strong>{campaign.metrics?.agencies || 0}</strong><span>agences</span></div>
                  <div><strong>{campaign.metrics?.destinations || 0}</strong><span>destinations</span></div>
                  <div><strong>{campaign.metrics?.tasks || 0}</strong><span>tâches</span></div>
                  <div><strong>{campaign.metrics?.assets || 0}</strong><span>contenus</span></div>
                </div>

                <div className="progress">
                  <span style={{ width: `${campaign.metrics?.progress || 0}%` }} />
                </div>

                <footer>
                  <small>{campaign.metrics?.progress || 0}% réalisé</small>
                  <button onClick={() => generate(campaign.id)}>
                    Préparer les tâches
                  </button>
                </footer>

                <GeneratedContentPanel
                  campaign={campaign}
                  onChanged={load}
                />

                <OfferPanel
                  key={`${campaign.id}:${campaignAgencyIds(campaign).join(",")}`}
                  campaign={campaign}
                  agencies={agencies}
                  onChanged={load}
                />
              </article>
            ))
          )}
        </section>
      )}
    </main>
  );
}
