"use strict";

const siteProvisioningModule =
  require(
    "../site-provisioning"
  );

function normalizeAgencyIds(
  value
) {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  const normalized =
    [];

  const seen =
    new Set();

  for (
    const raw
    of value
  ) {
    if (
      raw ===
        null ||
      raw ===
        undefined
    ) {
      continue;
    }

    let agencyId =
      null;

    /*
     * Contrat historique réel :
     *
     * - Int Prisma : 6
     * - chaîne numérique : "7" -> 7
     * - identifiant opaque : "agency-1"
     * - identifiant opaque court : "a", "b"
     *
     * Toute chaîne non vide est donc valide.
     */
    if (
      typeof raw ===
      "number"
    ) {
      if (
        Number.isInteger(
          raw
        ) &&
        raw >
          0
      ) {
        agencyId =
          raw;
      }
    } else {
      const stringValue =
        String(
          raw
        ).trim();

      if (!stringValue) {
        continue;
      }

      if (
        /^\d+$/.test(
          stringValue
        )
      ) {
        const numeric =
          Number(
            stringValue
          );

        if (
          Number.isInteger(
            numeric
          ) &&
          numeric >
            0
        ) {
          agencyId =
            numeric;
        }
      } else {
        agencyId =
          stringValue;
      }
    }

    if (
      agencyId ===
      null
    ) {
      continue;
    }

    const key =
      `${typeof agencyId}:${String(
        agencyId
      )}`;

    if (
      seen.has(
        key
      )
    ) {
      continue;
    }

    seen.add(
      key
    );

    normalized.push(
      agencyId
    );
  }

  return normalized;
}

function safeOptions(
  input = {}
) {
  return {
    agencyIds:
      normalizeAgencyIds(
        input.agencyIds
      ),

    dryRun:
      input.dryRun !==
      false,

    overwrite:
      input.overwrite ===
      true,

    publish:
      input.publish ===
      true,

    globalConfirmation:
      input.globalConfirmation ===
      true,
  };
}

function resolveTenantId(
  context = {}
) {
  return (
    context.tenantId ||
    context.tenant?.id ||
    context.request?.tenantId ||
    context.request?.tenant?.id ||
    null
  );
}

function instantiateCandidate(
  Candidate,
  {
    prisma,
    tenantId,
  }
) {
  if (
    typeof Candidate !==
    "function"
  ) {
    return null;
  }

  const attempts = [
    () =>
      new Candidate(
        prisma,
        tenantId
      ),

    () =>
      new Candidate({
        prisma,
        tenantId,
      }),

    () =>
      Candidate({
        prisma,
        tenantId,
      }),

    () =>
      new Candidate(
        prisma
      ),

    () =>
      Candidate(
        prisma
      ),
  ];

  for (
    const attempt
    of attempts
  ) {
    try {
      const result =
        attempt();

      if (
        result &&
        typeof result ===
          "object"
      ) {
        return result;
      }
    } catch {
      // Essai suivant.
    }
  }

  return null;
}

function resolveSiteProvisioningService({
  prisma,
  tenantId,
  service,
} = {}) {
  if (
    service &&
    (
      typeof service ===
        "object" ||
      typeof service ===
        "function"
    )
  ) {
    if (
      typeof service ===
      "object"
    ) {
      return service;
    }

    const injected =
      instantiateCandidate(
        service,
        {
          prisma,
          tenantId,
        }
      );

    if (injected) {
      return injected;
    }
  }

  if (!prisma) {
    throw Object.assign(
      new Error(
        "Le client Prisma est requis lorsqu'aucun service n'est injecté."
      ),
      {
        code:
          "SITE_PROVISIONING_PRISMA_REQUIRED",

        statusCode:
          503,
      }
    );
  }

  const candidates = [
    siteProvisioningModule
      ?.SiteProvisioningService,

    siteProvisioningModule
      ?.Service,

    siteProvisioningModule
      ?.service,

    siteProvisioningModule
      ?.createService,

    siteProvisioningModule
      ?.default,

    typeof siteProvisioningModule ===
      "function"
      ? siteProvisioningModule
      : null,
  ].filter(Boolean);

  for (
    const candidate
    of candidates
  ) {
    if (
      candidate &&
      typeof candidate ===
        "object"
    ) {
      return candidate;
    }

    const instance =
      instantiateCandidate(
        candidate,
        {
          prisma,
          tenantId,
        }
      );

    if (instance) {
      return instance;
    }
  }

  throw Object.assign(
    new Error(
      "Service site-provisioning introuvable."
    ),
    {
      code:
        "SITE_PROVISIONING_SERVICE_UNAVAILABLE",

      statusCode:
        503,
    }
  );
}

function availableMethods(
  service
) {
  const methods =
    new Set();

  let current =
    service;

  while (
    current &&
    current !==
      Object.prototype
  ) {
    for (
      const name
      of Object.getOwnPropertyNames(
        current
      )
    ) {
      if (
        name ===
        "constructor"
      ) {
        continue;
      }

      try {
        if (
          typeof service[name] ===
          "function"
        ) {
          methods.add(
            name
          );
        }
      } catch {
        // Getter non pertinent.
      }
    }

    current =
      Object.getPrototypeOf(
        current
      );
  }

  return Array.from(
    methods
  ).sort();
}

function findMethod(
  service,
  candidates
) {
  for (
    const name
    of candidates
  ) {
    if (
      typeof service?.[name] ===
      "function"
    ) {
      return {
        name,

        fn:
          service[name]
            .bind(
              service
            ),
      };
    }
  }

  return null;
}

async function invokeProvisioningMethod({
  service,
  method,
  input,
  tenantId,
}) {
  const payload = {
    ...safeOptions(
      input
    ),

    tenantId:
      tenantId ||
      undefined,
  };

  if (
    payload.agencyIds
      .length ===
    0
  ) {
    throw Object.assign(
      new Error(
        "Aucune agence valide n'a été fournie."
      ),
      {
        code:
          "INVALID_AGENCY_IDS",

        statusCode:
          400,
      }
    );
  }

  /*
   * Contrat officiel :
   *
   * site-provisioning travaille avec un payload :
   *
   * {
   *   agencyIds: [1, 2],
   *   dryRun,
   *   overwrite,
   *   publish
   * }
   *
   * On transmet donc le payload complet.
   *
   * On ne transforme surtout PAS agencyIds en objet
   * agence ni en appel sans identifiant.
   */
  return method.fn(
    payload
  );
}

class AgencySiteProvisioningAdapter {
  constructor({
    prisma,
    tenantId,
    service,
  } = {}) {
    /*
     * Deux modes sont supportés :
     *
     * 1. Production :
     *    prisma est fourni et permet de résoudre
     *    le vrai SiteProvisioningService.
     *
     * 2. Injection / tests :
     *    un service est fourni directement.
     *    Dans ce cas Prisma n'est pas obligatoire.
     */
    if (
      !prisma &&
      !service
    ) {
      throw new Error(
        "Le client Prisma ou un service de provisioning est obligatoire."
      );
    }

    this.prisma =
      prisma ||
      null;

    this.tenantId =
      tenantId ||
      null;

    this.service =
      service ||
      null;
  }

  resolveService(
    context = {}
  ) {
    const tenantId =
      resolveTenantId(
        context
      ) ||
      this.tenantId;

    return {
      tenantId,

      service:
        resolveSiteProvisioningService({
          prisma:
            this.prisma,

          tenantId,

          service:
            this.service,
        }),
    };
  }

  capabilities(
    context = {}
  ) {
    const {
      service,
    } =
      this.resolveService(
        context
      );

    return {
      provider:
        "site-provisioning",

      availableMethods:
        availableMethods(
          service
        ),

      operations: {
        status: [
          "status",
          "getProvisioningStatus",
          "provisioningStatus",
          "getStatus",
        ],

        preview: [
          "provisionBatch",
          "previewProvisioning",
          "preview",
          "dryRun",
          "buildProvisioningPlan",
          "plan",
          "listMissing",
        ],

        execute: [
          "provisionAgency",
          "provisionBatch",
          "provisionMissing",
          "provisionAll",
          "provisionAgencies",
          "provision",
          "executeProvisioning",
          "execute",
        ],
      },
    };
  }

  async status(
    input = {},
    context = {}
  ) {
    const {
      service,
      tenantId,
    } =
      this.resolveService(
        context
      );

    const method =
      findMethod(
        service,
        [
          "status",
          "getProvisioningStatus",
          "provisioningStatus",
          "getStatus",
        ]
      );

    if (!method) {
      return {
        supported:
          false,

        status:
          501,

        reason:
          "STATUS_NOT_SUPPORTED",
      };
    }

    /*
     * Le contrat historique status() ne nécessite
     * pas agencyIds.
     *
     * Il s'agit d'une opération de lecture globale.
     * On ne passe donc PAS par invokeProvisioningMethod(),
     * qui exige légitimement des agencyIds pour
     * les opérations de provisioning ciblées.
     */
    const payload = {
      ...input,

      tenantId:
        tenantId ||
        undefined,

      dryRun:
        true,

      overwrite:
        false,

      publish:
        false,
    };

    const agencyIds =
      normalizeAgencyIds(
        input.agencyIds
      );

    if (
      agencyIds.length >
      0
    ) {
      payload.agencyIds =
        agencyIds;
    } else {
      delete payload.agencyIds;
    }

    const result =
      await method.fn(
        payload
      );

    return {
      method:
        method.name,

      result,
    };
  }

  async preview(
    input = {},
    context = {}
  ) {
    const {
      service,
      tenantId,
    } =
      this.resolveService(
        context
      );

    const options = {
      ...input,

      dryRun:
        true,

      overwrite:
        false,

      publish:
        false,
    };

    const agencyIds =
      normalizeAgencyIds(
        options.agencyIds
      );

    /*
     * Contrat historique A :
     *
     * Aucun agencyIds fourni.
     *
     * Le service provisionMissing() détermine lui-même
     * les agences / éléments à préparer.
     */
    if (
      agencyIds.length ===
        0 &&
      typeof service
        ?.provisionMissing ===
        "function"
    ) {
      const payload = {
        ...options,

        tenantId:
          tenantId ||
          undefined,
      };

      /*
       * Ne pas injecter agencyIds: []
       * afin de conserver le contrat historique exact.
       */
      delete payload.agencyIds;

      const result =
        await service.provisionMissing(
          payload
        );

      return {
        method:
          "provisionMissing",

        result,
      };
    }

    /*
     * Contrat historique B :
     *
     * Une ou plusieurs agences explicitement ciblées.
     *
     * La prévisualisation utilise provisionBatch()
     * avec dryRun=true.
     */
    if (
      agencyIds.length >
        0 &&
      typeof service
        ?.provisionBatch ===
        "function"
    ) {
      const payload = {
        ...options,

        agencyIds,

        tenantId:
          tenantId ||
          undefined,
      };

      const result =
        await service.provisionBatch(
          payload
        );

      return {
        method:
          "provisionBatch",

        result,
      };
    }

    /*
     * Fallback vers une méthode dédiée de preview
     * si l'implémentation en fournit une.
     */
    const method =
      findMethod(
        service,
        [
          "previewProvisioning",
          "preview",
          "dryRun",
          "buildProvisioningPlan",
          "plan",
          "listMissing",

          /*
           * Compatibilité des services injectés qui
           * utilisent provision(payload) pour preview
           * et execute, le comportement étant piloté
           * par dryRun.
           */
          "provision",
          "provisionAgencies",
          "executeProvisioning",
          "execute",
        ]
      );

    if (method) {
      const payload = {
        ...options,

        tenantId:
          tenantId ||
          undefined,
      };

      if (
        agencyIds.length >
        0
      ) {
        payload.agencyIds =
          agencyIds;
      } else {
        delete payload.agencyIds;
      }

      const result =
        await method.fn(
          payload
        );

      return {
        method:
          method.name,

        result,
      };
    }

    throw Object.assign(
      new Error(
        "Le service ne possède aucune méthode de prévisualisation compatible."
      ),
      {
        code:
          "SITE_PROVISIONING_PREVIEW_NOT_SUPPORTED",

        statusCode:
          501,
      }
    );
  }

  async execute(
    input = {},
    context = {}
  ) {
    const {
      service,
      tenantId,
    } =
      this.resolveService(
        context
      );

    const options = {
      ...input,

      dryRun:
        false,

      overwrite:
        false,

      publish:
        false,
    };

    const agencyIds =
      normalizeAgencyIds(
        options.agencyIds
      );

    /*
     * Contrat historique Network Site Provisioning :
     *
     * 1 agence          -> provisionAgency()
     * plusieurs agences -> provisionBatch()
     *
     * Ces deux méthodes sont prioritaires lorsqu'elles
     * existent sur le service injecté.
     */

    if (
      agencyIds.length ===
        1 &&
      typeof service
        ?.provisionAgency ===
        "function"
    ) {
      const agencyId =
        agencyIds[0];

      const payload = {
        ...options,

        agencyId,

        /*
         * On conserve aussi agencyIds pour compatibilité
         * avec les implémentations qui lisent le payload
         * complet.
         */
        agencyIds,

        tenantId:
          tenantId ||
          undefined,
      };

      const result =
        await service.provisionAgency(
          payload
        );

      return {
        method:
          "provisionAgency",

        result,

        ...(
          result &&
          typeof result ===
            "object" &&
          !Array.isArray(
            result
          )
            ? result
            : {}
        ),
      };
    }

    if (
      agencyIds.length >
        1 &&
      typeof service
        ?.provisionBatch ===
        "function"
    ) {
      const payload = {
        ...options,

        agencyIds,

        tenantId:
          tenantId ||
          undefined,
      };

      const result =
        await service.provisionBatch(
          payload
        );

      return {
        method:
          "provisionBatch",

        result,

        ...(
          result &&
          typeof result ===
            "object" &&
          !Array.isArray(
            result
          )
            ? result
            : {}
        ),
      };
    }

    const method =
      findMethod(
        service,
        [
          "provisionAgency",
          "provisionMissing",
          "provisionAgencies",
          "provisionAll",
          "provision",
          "executeProvisioning",
          "execute",
          /*
           * Fallback :
           * certains services n'exposent que provisionBatch,
           * même pour une agence.
           */
          "provisionBatch",
        ]
      );

    if (!method) {
      throw Object.assign(
        new Error(
          "Le service ne possède aucune méthode d'exécution."
        ),
        {
          code:
            "SITE_PROVISIONING_EXECUTE_NOT_SUPPORTED",

          statusCode:
            501,
        }
      );
    }

    return invokeProvisioningMethod({
      service,
      method,

      input: {
        ...options,

        agencyIds,
      },

      tenantId,
    });
  }
}

function createAgencySiteAdapter(
  options
) {
  return new AgencySiteProvisioningAdapter(
    options
  );
}

module.exports = {
  AgencySiteProvisioningAdapter,
  createAgencySiteAdapter,
  normalizeAgencyIds,
  safeOptions,
  resolveTenantId,
  resolveSiteProvisioningService,
  availableMethods,
  findMethod,
  invokeProvisioningMethod,
};
