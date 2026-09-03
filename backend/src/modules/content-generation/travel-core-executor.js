"use strict";

const {
  buildDestinationContext,
  buildGenerationBrief,
} = require("../travel-core");

const {
  composeDeterministicContent,
} = require("./deterministic-composer");

function httpError(message, statusCode, code) {
  return Object.assign(
    new Error(message),
    { statusCode, code }
  );
}

function resolveDestination(task, campaign) {
  const payload = task.payload || {};

  const destinationId =
    payload.destinationId || null;

  const destinationSlug =
    payload.destinationSlug || null;

  const relations =
    campaign.destinations || [];

  const match = relations.find(({ destination }) => {
    if (!destination) return false;

    return (
      destination.id === destinationId ||
      destination.slug === destinationSlug
    );
  });

  if (match?.destination) {
    return match.destination;
  }

  /*
   * Les anciennes tâches génériques peuvent ne pas cibler
   * une destination précise.
   */
  if (
    destinationId === "generic" ||
    destinationSlug === "campagne"
  ) {
    return null;
  }

  throw httpError(
    `Destination introuvable pour la tâche ${task.key}.`,
    422,
    "TASK_DESTINATION_NOT_FOUND"
  );
}

function resolveAgency(task, campaign, options = {}) {
  const payload = task.payload || {};

  const requestedAgencyId =
    payload.agencyId ||
    options.agencyId ||
    null;

  const relations =
    campaign.agencies || [];

  if (requestedAgencyId) {
    const match = relations.find(
      ({ agency }) =>
        String(agency?.id) ===
        String(requestedAgencyId)
    );

    if (match?.agency) {
      return match.agency;
    }
  }

  return relations[0]?.agency || null;
}

function assetTypeForChannel(channel) {
  const mapping = {
    "landing-page": "seo-content",
    faq: "seo-content",
    newsletter: "email-content",
    "google-business": "social-content",
    facebook: "social-content",
    instagram: "social-content",
    linkedin: "social-content",
    "hero-image": "visual-brief",
  };

  return mapping[channel] || "content-brief";
}

function buildGenericCampaignBrief(
  task,
  campaign,
  agency
) {
  const payload = task.payload || {};

  return {
    version: "18.1.8",
    channel: task.channel || task.type,

    subject: {
      campaign: campaign.name,
      destination:
        payload.destinationName || null,
    },

    publisher: {
      agencyName:
        agency?.name ||
        "Mondescale Voyages",

      city:
        agency?.city || null,
    },

    objective:
      "Créer un contenu de campagne à partir des informations disponibles.",

    facts: {
      campaignName: campaign.name,
      description:
        campaign.description || null,
      startDate:
        campaign.startDate || null,
      endDate:
        campaign.endDate || null,
    },

    editorialRules: [
      "Ne pas inventer de destination, prix ou promotion.",
      "Demander une validation humaine avant publication.",
    ],

    quality: {
      requiresHumanReview: true,
      publicationStatus: "review",
    },
  };
}

function createTravelCoreExecutor({
  repository,
} = {}) {
  if (!repository) {
    throw new Error(
      "Travel Core executor requires repository"
    );
  }

  return async function executeTravelCoreTask(
    task,
    context = {}
  ) {
    const campaign = context.campaign;

    if (!campaign) {
      throw httpError(
        "La campagne du job est absente.",
        500,
        "GENERATION_CAMPAIGN_CONTEXT_MISSING"
      );
    }

    const options =
      context.job?.options || {};

    const destination =
      resolveDestination(task, campaign);

    const agency =
      resolveAgency(task, campaign, options);

    let destinationContext = null;
    let brief;

    if (destination) {
      destinationContext =
        buildDestinationContext(destination);

      brief = buildGenerationBrief(
        destinationContext,
        {
          channel:
            task.channel ||
            task.type,

          agencyName:
            agency?.name ||
            "Mondescale Voyages",

          city:
            agency?.city || null,

          tone:
            options.tone ||
            "expert, humain et inspirant",
        }
      );
    } else {
      brief = buildGenericCampaignBrief(
        task,
        campaign,
        agency
      );
    }

    const title = destination
      ? `${task.channel || task.type} — ${destination.name}`
      : `${task.channel || task.type} — ${campaign.name}`;

    const generatedContent =
      composeDeterministicContent(brief);

    const asset = await repository.upsertAssetForTask(
      task.id,
      {
        campaignId: campaign.id,
        type: assetTypeForChannel(
          task.channel || task.type
        ),
        channel:
          task.channel ||
          task.type ||
          null,
        status: "review",
        title,

        payload: {
          brief,
          generatedContent,
        },

        metadata: {
          source: "travel-core",
          executorVersion: "18.1.9",
          generator: "deterministic",
          destinationId:
            destination?.id || null,
          destinationSlug:
            destination?.slug || null,
          agencyId:
            agency?.id || null,
          requiresHumanReview: true,
        },
      }
    );

    return {
      taskId: task.id,
      campaignId: campaign.id,
      assetId: asset.id,
      destinationId:
        destination?.id || null,
      channel:
        task.channel ||
        task.type,
      status: asset.status,
      generated: true,
      generator: "deterministic",
      briefCreated: true,
    };
  };
}

module.exports = {
  assetTypeForChannel,
  resolveDestination,
  resolveAgency,
  buildGenericCampaignBrief,
  createTravelCoreExecutor,
};
