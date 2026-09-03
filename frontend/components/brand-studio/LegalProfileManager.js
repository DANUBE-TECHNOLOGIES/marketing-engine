"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchLegalProfile,
  saveLegalProfile,
  validateLegalProfile,
} from "../../lib/brand-studio/legal-api";

const EMPTY_PROFILE = {
  companyName:
    "",

  legalForm:
    "",

  shareCapital:
    "",

  registrationNumber:
    "",

  vatNumber:
    "",

  registeredOffice:
    "",

  publicationDirector:
    "",

  hostingProvider:
    "",

  legalEmail:
    "",

  dpoEmail:
    "",

  phone:
    "",

  legalNotice:
    "",

  privacyPolicy:
    "",

  cookiePolicy:
    "",

  terms:
    "",
};

const CONTENT_TABS = [
  {
    value:
      "legalNotice",

    label:
      "Mentions légales",
  },

  {
    value:
      "privacyPolicy",

    label:
      "Confidentialité",
  },

  {
    value:
      "cookiePolicy",

    label:
      "Cookies",
  },

  {
    value:
      "terms",

    label:
      "Conditions générales",
  },
];

function TextField({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
}) {
  return (
    <label className="legal-field">
      <span>
        {label}
      </span>

      <input
        type={
          type
        }
        name={
          name
        }
        value={
          value
        }
        placeholder={
          placeholder
        }
        onChange={
          onChange
        }
      />

      {error ? (
        <small>
          {error}
        </small>
      ) : null}
    </label>
  );
}

function LegalPreview({
  profile,
  contentField,
}) {
  const content =
    profile[
      contentField
    ] ||
    "";

  return (
    <article className="legal-preview">
      <header>
        <p>
          Aperçu public
        </p>

        <h3>
          {
            CONTENT_TABS.find(
              (item) =>
                item.value ===
                contentField
            )?.label
          }
        </h3>
      </header>

      <div className="legal-preview__identity">
        <strong>
          {profile.companyName ||
            "Raison sociale"}
        </strong>

        {profile.legalForm ? (
          <span>
            {profile.legalForm}
          </span>
        ) : null}

        {profile.registeredOffice ? (
          <span>
            {profile.registeredOffice}
          </span>
        ) : null}
      </div>

      {content ? (
        <div
          className="legal-preview__content"
          dangerouslySetInnerHTML={{
            __html:
              content,
          }}
        />
      ) : (
        <div className="legal-preview__empty">
          Aucun contenu renseigné.
        </div>
      )}
    </article>
  );
}

export default function LegalProfileManager({
  initialAgencyId = 6,
}) {
  const [
    agencyId,
    setAgencyId,
  ] =
    useState(
      initialAgencyId
    );

  const [
    profile,
    setProfile,
  ] =
    useState(
      EMPTY_PROFILE
    );

  const [
    activeContent,
    setActiveContent,
  ] =
    useState(
      "legalNotice"
    );

  const [
    errors,
    setErrors,
  ] =
    useState({});

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState(null);

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setMessage(null);

        try {
          const result =
            await fetchLegalProfile(
              agencyId
            );

          setProfile({
            ...EMPTY_PROFILE,
            ...result,
          });

          setErrors({});
        } catch (error) {
          setMessage({
            type:
              "error",

            text:
              error.message,
          });
        } finally {
          setLoading(false);
        }
      },
      [
        agencyId,
      ]
    );

  useEffect(
    () => {
      load();
    },
    [
      load,
    ]
  );

  function updateField(
    event
  ) {
    const {
      name,
      value,
    } =
      event.target;

    setProfile(
      (current) => ({
        ...current,
        [name]:
          value,
      })
    );

    setErrors(
      (current) => ({
        ...current,
        [name]:
          undefined,
      })
    );
  }

  async function save() {
    const validation =
      validateLegalProfile(
        profile
      );

    setErrors(
      validation
    );

    if (
      Object.keys(
        validation
      ).length
    ) {
      setMessage({
        type:
          "error",

        text:
          "Certains champs obligatoires doivent être corrigés.",
      });

      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const saved =
        await saveLegalProfile({
          agencyId,
          profile,
        });

      setProfile({
        ...EMPTY_PROFILE,
        ...saved,
      });

      setMessage({
        type:
          "success",

        text:
          "Profil juridique enregistré.",
      });
    } catch (error) {
      setMessage({
        type:
          "error",

        text:
          error.message,
      });
    } finally {
      setSaving(false);
    }
  }

  const completion =
    useMemo(
      () => {
        const important = [
          "companyName",
          "registeredOffice",
          "publicationDirector",
          "legalEmail",
          "legalNotice",
          "privacyPolicy",
        ];

        const completed =
          important.filter(
            (field) =>
              Boolean(
                String(
                  profile[field] ||
                  ""
                ).trim()
              )
          ).length;

        return Math.round(
          (
            completed /
            important.length
          ) *
          100
        );
      },
      [
        profile,
      ]
    );

  return (
    <main className="legal-profile-manager">
      <header className="legal-profile-manager__header">
        <div>
          <p className="legal-profile-manager__eyebrow">
            Brand Studio
          </p>

          <h1>
            Profil juridique
          </h1>

          <p>
            Centralisez les informations légales de la société.
            Elles seront réutilisées automatiquement par les
            mini-sites concernés.
          </p>
        </div>

        <div className="legal-profile-manager__tools">
          <label>
            <span>
              Agence
            </span>

            <input
              type="number"
              min="1"
              value={
                agencyId
              }
              onChange={
                (event) =>
                  setAgencyId(
                    Number(
                      event.target.value
                    )
                  )
              }
            />
          </label>

          <div className="legal-completion">
            <span>
              Complétion
            </span>

            <strong>
              {completion} %
            </strong>
          </div>
        </div>
      </header>

      {message ? (
        <div
          className={
            message.type ===
            "error"
              ? "legal-message legal-message--error"
              : "legal-message legal-message--success"
          }
          role="status"
        >
          {message.text}
        </div>
      ) : null}

      {loading ? (
        <div className="legal-loading">
          Chargement du profil juridique…
        </div>
      ) : (
        <>
          <section className="legal-layout">
            <div className="legal-panel">
              <h2>
                Identité de la société
              </h2>

              <div className="legal-form-grid">
                <TextField
                  label="Raison sociale"
                  name="companyName"
                  value={
                    profile.companyName
                  }
                  onChange={
                    updateField
                  }
                  error={
                    errors.companyName
                  }
                  placeholder="SAS DANUBE"
                />

                <TextField
                  label="Forme juridique"
                  name="legalForm"
                  value={
                    profile.legalForm
                  }
                  onChange={
                    updateField
                  }
                  placeholder="SAS"
                />

                <TextField
                  label="Capital social"
                  name="shareCapital"
                  value={
                    profile.shareCapital
                  }
                  onChange={
                    updateField
                  }
                  placeholder="10 000 €"
                />

                <TextField
                  label="SIRET / immatriculation"
                  name="registrationNumber"
                  value={
                    profile.registrationNumber
                  }
                  onChange={
                    updateField
                  }
                />

                <TextField
                  label="Numéro de TVA"
                  name="vatNumber"
                  value={
                    profile.vatNumber
                  }
                  onChange={
                    updateField
                  }
                />

                <TextField
                  label="Siège social"
                  name="registeredOffice"
                  value={
                    profile.registeredOffice
                  }
                  onChange={
                    updateField
                  }
                  placeholder="Adresse complète"
                />

                <TextField
                  label="Directeur de publication"
                  name="publicationDirector"
                  value={
                    profile.publicationDirector
                  }
                  onChange={
                    updateField
                  }
                />

                <TextField
                  label="Hébergeur"
                  name="hostingProvider"
                  value={
                    profile.hostingProvider
                  }
                  onChange={
                    updateField
                  }
                />

                <TextField
                  label="E-mail juridique"
                  name="legalEmail"
                  value={
                    profile.legalEmail
                  }
                  onChange={
                    updateField
                  }
                  error={
                    errors.legalEmail
                  }
                  type="email"
                />

                <TextField
                  label="E-mail du DPO"
                  name="dpoEmail"
                  value={
                    profile.dpoEmail
                  }
                  onChange={
                    updateField
                  }
                  error={
                    errors.dpoEmail
                  }
                  type="email"
                />

                <TextField
                  label="Téléphone"
                  name="phone"
                  value={
                    profile.phone
                  }
                  onChange={
                    updateField
                  }
                  type="tel"
                />
              </div>
            </div>

            <div className="legal-panel">
              <nav
                className="legal-tabs"
                aria-label="Contenus juridiques"
              >
                {CONTENT_TABS.map(
                  (item) => (
                    <button
                      key={
                        item.value
                      }
                      type="button"
                      className={
                        activeContent ===
                        item.value
                          ? "legal-tab legal-tab--active"
                          : "legal-tab"
                      }
                      onClick={
                        () =>
                          setActiveContent(
                            item.value
                          )
                      }
                    >
                      {item.label}
                    </button>
                  )
                )}
              </nav>

              <label className="legal-editor">
                <span>
                  {
                    CONTENT_TABS.find(
                      (item) =>
                        item.value ===
                        activeContent
                    )?.label
                  }
                </span>

                <textarea
                  name={
                    activeContent
                  }
                  value={
                    profile[
                      activeContent
                    ]
                  }
                  onChange={
                    updateField
                  }
                  rows="24"
                  placeholder="<h2>Titre</h2><p>Contenu juridique…</p>"
                />

                {errors[
                  activeContent
                ] ? (
                  <small>
                    {
                      errors[
                        activeContent
                      ]
                    }
                  </small>
                ) : null}
              </label>
            </div>

            <div className="legal-panel">
              <LegalPreview
                profile={
                  profile
                }
                contentField={
                  activeContent
                }
              />
            </div>
          </section>

          <footer className="legal-actions">
            <button
              type="button"
              className="legal-actions__secondary"
              onClick={
                load
              }
              disabled={
                loading ||
                saving
              }
            >
              Annuler les modifications
            </button>

            <button
              type="button"
              className="legal-actions__primary"
              onClick={
                save
              }
              disabled={
                saving
              }
            >
              {saving
                ? "Enregistrement…"
                : "Enregistrer le profil juridique"}
            </button>
          </footer>
        </>
      )}

      <style jsx>{`
        .legal-profile-manager {
          min-height: 100vh;
          padding: 32px;
          background: #f5f6f8;
          color: #17191f;
        }

        .legal-profile-manager__header {
          display: flex;
          justify-content: space-between;
          gap: 30px;
          max-width: 1500px;
          margin: 0 auto 28px;
        }

        .legal-profile-manager__eyebrow {
          margin: 0 0 8px;
          font-size: 13px;
          font-weight: 750;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #626975;
        }

        h1 {
          margin: 0 0 12px;
          font-size: clamp(30px, 4vw, 46px);
        }

        .legal-profile-manager__header p {
          max-width: 760px;
          line-height: 1.6;
        }

        .legal-profile-manager__tools {
          display: flex;
          gap: 16px;
          align-items: flex-end;
        }

        .legal-profile-manager__tools label {
          display: grid;
          gap: 7px;
          min-width: 130px;
          font-weight: 650;
        }

        input,
        textarea {
          box-sizing: border-box;
          width: 100%;
          border: 1px solid #cfd4dc;
          border-radius: 8px;
          background: #fff;
          padding: 11px 12px;
          font: inherit;
        }

        textarea {
          resize: vertical;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          line-height: 1.55;
        }

        .legal-completion {
          display: grid;
          gap: 5px;
          min-width: 100px;
          padding: 10px 14px;
          border-radius: 9px;
          background: #17191f;
          color: #fff;
        }

        .legal-completion span {
          font-size: 12px;
        }

        .legal-completion strong {
          font-size: 20px;
        }

        .legal-message,
        .legal-loading {
          max-width: 1500px;
          margin: 0 auto 20px;
          padding: 14px 17px;
          border-radius: 9px;
        }

        .legal-message--success {
          background: #e5f5ea;
          color: #145b2b;
        }

        .legal-message--error {
          background: #fde9e9;
          color: #8c1e1e;
        }

        .legal-loading {
          background: #fff;
        }

        .legal-layout {
          display: grid;
          grid-template-columns: minmax(320px, 0.9fr) minmax(430px, 1.2fr) minmax(320px, 0.9fr);
          gap: 22px;
          max-width: 1500px;
          margin: 0 auto;
          align-items: start;
        }

        .legal-panel {
          padding: 24px;
          border: 1px solid #e0e4ea;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 10px 35px rgb(17 24 39 / 0.05);
        }

        .legal-panel h2 {
          margin-top: 0;
        }

        .legal-form-grid {
          display: grid;
          gap: 15px;
        }

        .legal-field {
          display: grid;
          gap: 7px;
          font-weight: 650;
        }

        .legal-field small,
        .legal-editor small {
          color: #a12626;
        }

        .legal-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 18px;
        }

        button {
          border: 0;
          border-radius: 8px;
          padding: 10px 14px;
          font-weight: 700;
          cursor: pointer;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .legal-tab {
          background: #e7e9ed;
        }

        .legal-tab--active {
          background: #17191f;
          color: #fff;
        }

        .legal-editor {
          display: grid;
          gap: 8px;
          font-weight: 650;
        }

        .legal-preview header {
          border-bottom: 1px solid #e2e5ea;
          margin-bottom: 18px;
        }

        .legal-preview header p {
          margin: 0 0 5px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #68707d;
        }

        .legal-preview header h3 {
          margin: 0 0 16px;
          font-size: 24px;
        }

        .legal-preview__identity {
          display: grid;
          gap: 4px;
          margin-bottom: 20px;
          color: #555d69;
        }

        .legal-preview__identity strong {
          color: #17191f;
        }

        .legal-preview__content {
          overflow-wrap: anywhere;
          line-height: 1.65;
        }

        .legal-preview__empty {
          padding: 35px 20px;
          border: 1px dashed #cbd0d7;
          border-radius: 9px;
          color: #707887;
          text-align: center;
        }

        .legal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          max-width: 1500px;
          margin: 24px auto 0;
          padding: 18px 0;
          position: sticky;
          bottom: 0;
          background: linear-gradient(
            to top,
            #f5f6f8 70%,
            rgb(245 246 248 / 0)
          );
        }

        .legal-actions__secondary {
          background: #e5e8ed;
        }

        .legal-actions__primary {
          background: #17191f;
          color: #fff;
        }

        @media (max-width: 1180px) {
          .legal-layout {
            grid-template-columns: 1fr 1fr;
          }

          .legal-panel:last-child {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 760px) {
          .legal-profile-manager {
            padding: 20px;
          }

          .legal-profile-manager__header,
          .legal-profile-manager__tools {
            display: grid;
          }

          .legal-layout {
            grid-template-columns: 1fr;
          }

          .legal-panel:last-child {
            grid-column: auto;
          }

          .legal-actions {
            display: grid;
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
