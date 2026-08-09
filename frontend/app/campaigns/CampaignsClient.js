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

function OfferStatus({ status }) {
  return (
    <span className={`offer-status offer-status-${status || "review"}`}>
      {status || "review"}
    </span>
  );
}

function OfferPanel({ campaign, onChanged }) {
  const [open, setOpen] = useState(false);
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState(EMPTY_OFFER);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
                Les offres doivent être approuvées avant d’être visibles sur les sites ciblés.
              </small>
            </div>
          </div>

          {error ? <div className="offer-error">{error}</div> : null}
          {notice ? <div className="offer-notice">{notice}</div> : null}

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
                        <OfferStatus status={asset.status} />
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");

  const load = async () => {
    setLoading(true);

    try {
      setItems(await campaignApi.list());
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;

    try {
      await campaignApi.create({
        name: name.trim(),
        objective: "sales",
      });
      setName("");
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

        <form onSubmit={create} className="create-form">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex. Hiver 2026"
            minLength={3}
          />
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

                <OfferPanel campaign={campaign} onChanged={load} />
              </article>
            ))
          )}
        </section>
      )}
    </main>
  );
}
