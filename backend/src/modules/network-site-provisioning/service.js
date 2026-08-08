"use strict";

const {
  AgencySiteProvisioningAdapter,
} = require(
  "./agency-site-adapter"
);

const {
  validateProvisionPayload,
} = require(
  "./validation"
);

function normalizeResult(
  operation,
  invocation
) {
  return {
    operation,

    delegatedMethod:
      invocation.method,

    generatedAt:
      new Date()
        .toISOString(),

    data:
      invocation.result,
  };
}

/**
 * Extrait uniquement le contexte multi-tenant.
 *
 * Important :
 * validateProvisionPayload() nettoie volontairement
 * le payload métier et ne conserve pas tenantId.
 *
 * Le tenant n'est donc PAS une option de provisioning :
 * c'est un contexte d'exécution séparé.
 */
function provisioningContext(
  input = {}
) {
  const tenantId =
    typeof input?.tenantId ===
      "string"
      ? input.tenantId.trim()
      : input?.tenantId || null;

  return {
    tenantId:
      tenantId ||
      null,
  };
}

class NetworkSiteProvisioningService {
  constructor({
    prisma,
    siteProvisioningService,
    agencySiteService,
    adapter,
  } = {}) {
    this.adapter =
      adapter ||
      new AgencySiteProvisioningAdapter({
        prisma,

        service:
          siteProvisioningService ||
          agencySiteService,
      });
  }

  health() {
    return {
      module:
        "network-site-provisioning",

      ready:
        true,

      safeDefaults: {
        dryRun:
          true,

        globalConfirmation:
          true,

        overwrite:
          false,

        publish:
          false,
      },

      capabilities:
        this.adapter
          .capabilities(),
    };
  }

  async status(
    input = {}
  ) {
    /*
     * status() ne passe pas par validateProvisionPayload().
     *
     * On lui transmet néanmoins explicitement le contexte
     * pour que le provider Site Provisioning soit instancié
     * avec le bon tenant.
     */
    const context =
      provisioningContext(
        input
      );

    const invocation =
      await this.adapter.status(
        input,
        context
      );

    return normalizeResult(
      "status",
      invocation
    );
  }

  async preview(
    input = {}
  ) {
    /*
     * Capturer le tenant AVANT validation.
     *
     * validateProvisionPayload() retourne volontairement
     * uniquement les options de provisioning et retirerait
     * tenantId du nouvel objet.
     */
    const context =
      provisioningContext(
        input
      );

    const payload =
      validateProvisionPayload({
        ...input,

        dryRun:
          true,
      });

    const invocation =
      await this.adapter.preview(
        payload,
        context
      );

    return {
      ...normalizeResult(
        "preview",
        invocation
      ),

      request:
        payload,
    };
  }

  async execute(
    input = {}
  ) {
    /*
     * Même règle :
     * tenant = contexte
     * payload = contrat métier validé
     */
    const context =
      provisioningContext(
        input
      );

    const payload =
      validateProvisionPayload(
        input
      );

    if (
      payload.dryRun
    ) {
      /*
       * Ne pas appeler this.preview(payload),
       * car payload ne contient plus tenantId.
       *
       * On appelle directement l'adaptateur en conservant
       * le contexte tenant déjà capturé.
       */
      const invocation =
        await this.adapter.preview(
          {
            ...payload,

            dryRun:
              true,
          },
          context
        );

      return {
        ...normalizeResult(
          "preview",
          invocation
        ),

        request: {
          ...payload,

          dryRun:
            true,
        },
      };
    }

    const invocation =
      await this.adapter.execute(
        payload,
        context
      );

    return {
      ...normalizeResult(
        "execute",
        invocation
      ),

      request:
        payload,
    };
  }
}

module.exports = {
  NetworkSiteProvisioningService,
  normalizeResult,
  provisioningContext,
};
