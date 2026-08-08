"use client";

import AiComposerPanel from "../content-composer/AiComposerPanel";


import {
  useCallback,
  useMemo,
  useState,
} from "react";

import BrandAgencySelector from "./BrandAgencySelector";
import BrandMediaManager from "./BrandMediaManager";
import LegalProfileManager from "./LegalProfileManager";

import BrandIdentityManager from "./BrandIdentityManager";

import BrandReadinessPanel from "./BrandReadinessPanel";

import TemplateManager from "../template-library/TemplateManager";

const WORKSPACE_SECTIONS =
  Object.freeze([
    {
      id:
        "identity",

      label:
        "Identité visuelle",

      description:
        "Vue d’ensemble de la charte et de son application.",
    },

    {
      id:
        "media",

      label:
        "Médiathèque",

      description:
        "Logos, favicon, Hero et image OpenGraph.",
    },

    {
      id:
        "legal",

      label:
        "Profil juridique",

      description:
        "Mentions légales, confidentialité et cookies.",
    },

    {
      id:
        "readiness",

      label:
        "Préparation",

      description:
        "Contrôles avant publication du mini-site.",
    },
  ]);

function BrandIdentityOverview({
  agency,
  agencyId,
  onOpenSection,
}) {
  const siteUrl =
    agency?.siteSlug
      ? `/sites/${agency.siteSlug}`
      : null;

  return (
    <section className="brand-overview">
      <header className="brand-overview__header">
        <div>
          <p className="brand-overview__eyebrow">
            Configuration active
          </p>

          <h2>
            Identité du mini-site
          </h2>

          <p>
            Les paramètres du Brand Studio sont consommés
            automatiquement par le renderer public.
          </p>
        </div>

        {siteUrl ? (
          <a
            href={
              siteUrl
            }
            target="_blank"
            rel="noreferrer"
            className="brand-overview__public-link"
          >
            Ouvrir le mini-site
          </a>
        ) : null}
      </header>

      <div className="brand-overview__agency">
        <span>
          Agence configurée
        </span>

        <strong>
          {agency?.name ||
            `Agence #${agencyId}`}
        </strong>

        {agency?.city ? (
          <small>
            {[
              agency.postalCode,
              agency.city,
            ]
              .filter(Boolean)
              .join(" ")}
          </small>
        ) : null}
      </div>

      <div className="brand-overview__cards">
        <article className="brand-capability-card">
          <span className="brand-capability-card__number">
            01
          </span>

          <h3>
            Charte graphique
          </h3>

          <p>
            Couleurs, typographies, arrière-plans et styles
            utilisés par les pages publiques.
          </p>

          <span className="brand-capability-card__status">
            Runtime connecté
          </span>
        </article>

        <article className="brand-capability-card">
          <span className="brand-capability-card__number">
            02
          </span>

          <h3>
            Médias
          </h3>

          <p>
            Logo principal, variantes, favicon, Hero par défaut
            et image OpenGraph.
          </p>

          <button
            type="button"
            onClick={
              () =>
                onOpenSection(
                  "media"
                )
            }
          >
            Gérer les médias
          </button>
        </article>

        <article className="brand-capability-card">
          <span className="brand-capability-card__number">
            03
          </span>

          <h3>
            Profil juridique
          </h3>

          <p>
            Identité de la société, mentions légales,
            confidentialité, cookies et conditions générales.
          </p>

          <button
            type="button"
            onClick={
              () =>
                onOpenSection(
                  "legal"
                )
            }
          >
            Gérer le juridique
          </button>
        </article>

        <article className="brand-capability-card">
          <span className="brand-capability-card__number">
            04
          </span>

          <h3>
            Publication publique
          </h3>

          <p>
            Le contrat Brand + Legal est injecté dans le renderer
            sans modifier les blocs éditoriaux en base.
          </p>

          <span className="brand-capability-card__status">
            Contrat public actif
          </span>
        </article>
      </div>

      <aside className="brand-runtime-panel">
        <div>
          <h3>
            Éléments appliqués automatiquement
          </h3>

          <p>
            Le Website Builder conserve les contenus spécifiques
            de chaque page tandis que le Brand Studio fournit
            l’identité commune.
          </p>
        </div>

        <ul>
          <li>
            variables CSS de marque ;
          </li>

          <li>
            logo dans l’en-tête ;
          </li>

          <li>
            favicon ;
          </li>

          <li>
            image OpenGraph ;
          </li>

          <li>
            Hero par défaut ;
          </li>

          <li>
            contenus juridiques mutualisés.
          </li>
        </ul>
      </aside>
    </section>
  );
}

export default function BrandStudioWorkspace({
  initialAgencyId = 6,
}) {
  const [
    agencyId,
    setAgencyId,
  ] =
    useState(
      Number(
        initialAgencyId
      ) || 6
    );

  const [
    selectedAgency,
    setSelectedAgency,
  ] =
    useState(
      null
    );

  const [
    activeSection,
    setActiveSection,
  ] =
    useState(
      "identity"
    );

  const handleAgencyChange =
    useCallback(
      (
        nextAgencyId,
        agency
      ) => {
        const normalizedId =
          Number(
            nextAgencyId
          );

        if (
          !Number.isInteger(
            normalizedId
          ) ||
          normalizedId <= 0
        ) {
          return;
        }

        setAgencyId(
          normalizedId
        );

        setSelectedAgency(
          agency ||
          null
        );
      },
      []
    );

  const activeDefinition =
    useMemo(
      () =>
        WORKSPACE_SECTIONS.find(
          (section) =>
            section.id ===
            activeSection
        ) ||
        WORKSPACE_SECTIONS[0],
      [
        activeSection,
      ]
    );

  return (
    <main className="brand-workspace">
      <header className="brand-workspace__hero">
        <div className="brand-workspace__title">
          <p>
            Mondescale Platform
          </p>

          <h1>
            Brand Studio
          </h1>

          <span>
            Identité visuelle, médias et informations juridiques
            des mini-sites.
          </span>
        </div>


        <div className="brand-workspace__agency-selector">
          <span className="brand-workspace__agency-selector-label">
            Agence sélectionnée
          </span>

<BrandAgencySelector
          value={
            agencyId
          }
          fallbackAgencyId={
            Number(
              initialAgencyId
            ) || 6
          }
          onChange={
            handleAgencyChange
          }
        />
        </div>
      </header>

      <nav
        className="brand-workspace__tabs"
        aria-label="Sections du Brand Studio"
      >
        {WORKSPACE_SECTIONS.map(
          (section) => (
            <button
              key={
                section.id
              }
              type="button"
              className={
                section.id ===
                activeSection
                  ? "brand-workspace-tab brand-workspace-tab--active"
                  : "brand-workspace-tab"
              }
              onClick={
                () =>
                  setActiveSection(
                    section.id
                  )
              }
            >
              <strong>
                {section.label}
              </strong>

              <span>
                {section.description}
              </span>
            </button>
          )
        )}
      </nav>

      <section
        className="brand-workspace__content"
        aria-label={
          activeDefinition.label
        }
      >
        {activeSection ===
        "identity" ? (
          <BrandIdentityManager
            key={
              `identity-${agencyId}`
            }
            initialAgencyId={
              agencyId
            }
            agency={
              selectedAgency
            }
          />
        ) : null}

        {activeSection ===
        "media" ? (
          <BrandMediaManager
            key={
              `media-${agencyId}`
            }
            initialAgencyId={
              agencyId
            }
          />
        ) : null}

        {activeSection ===
        "legal" ? (
          <LegalProfileManager
            key={
              `legal-${agencyId}`
            }
            initialAgencyId={
              agencyId
            }
          />
        ) : null}

        {activeSection ===
        "readiness" ? (
          <BrandReadinessPanel
            key={
              `readiness-${agencyId}`
            }
            agencyId={
              agencyId
            }
            agency={
              selectedAgency
            }
            onOpenSection={
              setActiveSection
            }
          />
        ) : null}

      <TemplateManager
        agencyId={initialAgencyId}
      />
      <div data-mse-ai-composer-integration="true">
        <AiComposerPanel
          agencyId={initialAgencyId}
        />
      </div>

</section>

      <style jsx>{`
        .brand-workspace {
          min-height: 100vh;
          padding: 32px;
          background:
            radial-gradient(
              circle at 88% 0%,
              rgb(255 255 255 / 0.95),
              transparent 32%
            ),
            #f2f3f5;
          color: #17191f;
        }

        .brand-workspace__hero {
          display: grid;
          grid-template-columns: minmax(300px, 1fr) minmax(420px, 0.9fr);
          gap: 32px;
          max-width: 1500px;
          margin: 0 auto 24px;
          padding: 30px;
          border: 1px solid #dfe3e8;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 22px 58px rgb(20 25 35 / 0.07);
        }

        .brand-workspace__title > p {
          margin: 0 0 10px;
          color: #68707d;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .brand-workspace__title h1 {
          margin: 0;
          font-size: clamp(38px, 5vw, 62px);
          line-height: 0.98;
        }

        .brand-workspace__title > span {
          display: block;
          max-width: 680px;
          margin-top: 19px;
          color: #59616e;
          font-size: 17px;
          line-height: 1.6;
        }


        .brand-workspace__agency-selector {
          display: grid;
          gap: 8px;
        }

        .brand-workspace__agency-selector-label {
          color: #68707d;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

.brand-workspace__tabs {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          max-width: 1500px;
          margin: 0 auto 24px;
        }

        .brand-workspace-tab {
          display: grid;
          gap: 7px;
          min-height: 112px;
          padding: 20px;
          border: 1px solid #dfe3e8;
          border-radius: 14px;
          background: #fff;
          color: #17191f;
          text-align: left;
          cursor: pointer;
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            border-color 160ms ease;
        }

        .brand-workspace-tab:hover {
          transform: translateY(-2px);
          border-color: #9da5b1;
          box-shadow: 0 13px 30px rgb(20 25 35 / 0.08);
        }

        .brand-workspace-tab strong {
          font-size: 18px;
        }

        .brand-workspace-tab span {
          color: #626a77;
          line-height: 1.45;
        }

        .brand-workspace-tab--active {
          border-color: #17191f;
          background: #17191f;
          color: #fff;
        }

        .brand-workspace-tab--active span {
          color: #d2d5dc;
        }

        .brand-workspace__content {
          max-width: 1500px;
          margin: 0 auto;
        }

        .brand-overview {
          padding: 28px;
          border: 1px solid #dfe3e8;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 20px 50px rgb(20 25 35 / 0.06);
        }

        .brand-overview__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 20px;
        }

        .brand-overview__eyebrow {
          margin: 0 0 7px;
          color: #69717f;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .brand-overview__header h2 {
          margin: 0 0 10px;
          font-size: clamp(28px, 4vw, 42px);
        }

        .brand-overview__header p {
          max-width: 760px;
          margin: 0;
          color: #5d6572;
          line-height: 1.6;
        }

        .brand-overview__public-link {
          flex: none;
          padding: 11px 15px;
          border-radius: 9px;
          background: #17191f;
          color: #fff;
          font-weight: 750;
          text-decoration: none;
        }

        .brand-overview__agency {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 22px;
          padding: 14px 16px;
          border-radius: 11px;
          background: #f3f4f6;
        }

        .brand-overview__agency > span {
          color: #6b7380;
          font-size: 13px;
        }

        .brand-overview__agency > strong {
          font-size: 17px;
        }

        .brand-overview__agency > small {
          color: #646c78;
        }

        .brand-overview__cards {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
        }

        .brand-capability-card {
          display: flex;
          flex-direction: column;
          min-height: 245px;
          padding: 21px;
          border: 1px solid #e0e4e9;
          border-radius: 13px;
          background: #f8f9fa;
        }

        .brand-capability-card__number {
          color: #7a8290;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .brand-capability-card h3 {
          margin: 25px 0 10px;
          font-size: 21px;
        }

        .brand-capability-card p {
          margin: 0;
          color: #5d6571;
          line-height: 1.55;
        }

        .brand-capability-card button {
          margin-top: auto;
          padding: 10px 13px;
          border: 0;
          border-radius: 8px;
          background: #17191f;
          color: #fff;
          font-weight: 750;
          cursor: pointer;
        }

        .brand-capability-card__status {
          display: inline-flex;
          align-self: flex-start;
          margin-top: auto;
          padding: 7px 9px;
          border-radius: 999px;
          background: #dff3e5;
          color: #175d2d;
          font-size: 12px;
          font-weight: 750;
        }

        .brand-runtime-panel {
          display: grid;
          grid-template-columns: minmax(260px, 0.8fr) minmax(380px, 1.2fr);
          gap: 30px;
          margin-top: 20px;
          padding: 25px;
          border-radius: 14px;
          background: #17191f;
          color: #fff;
        }

        .brand-runtime-panel h3 {
          margin-top: 0;
        }

        .brand-runtime-panel p {
          margin-bottom: 0;
          color: #cfd3da;
          line-height: 1.55;
        }

        .brand-runtime-panel ul {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 24px;
          margin: 0;
          padding-left: 20px;
          color: #d7dae0;
          line-height: 1.5;
        }

        :global(
          .brand-workspace__content
          .brand-media-manager
        ),
        :global(
          .brand-workspace__content
          .legal-profile-manager
        ) {
          min-height: auto;
          padding: 0;
          background: transparent;
        }

        :global(
          .brand-workspace__content
          .brand-media-manager__header
        ),
        :global(
          .brand-workspace__content
          .legal-profile-manager__header
        ) {
          display: none;
        }

        @media (max-width: 1150px) {
          .brand-overview__cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .brand-workspace {
            padding: 20px;
          }

          .brand-workspace__hero {
            grid-template-columns: 1fr;
          }

          .brand-workspace__tabs {
            grid-template-columns: 1fr;
          }

          .brand-workspace-tab {
            min-height: auto;
          }

          .brand-runtime-panel {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .brand-overview__header {
            display: grid;
          }

          .brand-overview__agency {
            display: grid;
          }

          .brand-overview__cards {
            grid-template-columns: 1fr;
          }

          .brand-runtime-panel ul {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
