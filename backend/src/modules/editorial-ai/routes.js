"use strict";

const {
  EditorialAiService,
} = require("./service");

function sendError(
  response,
  error
) {
  response
    .status(
      Number(
        error?.status ||
        500
      )
    )
    .json({
      error:
        error?.code ||
        "EDITORIAL_AI_ERROR",

      message:
        error?.message ||
        "Erreur de l’assistant éditorial.",

      details:
        error?.details ||
        {},
    });
}

function createEditorialAiRouter({
  express,
  service =
    new EditorialAiService(),
}) {
  const router =
    express.Router();

  router.get(
    "/health",
    (_request, response) => {
      response.json(
        service.health()
      );
    }
  );

  router.post(
    "/generate",
    async (
      request,
      response
    ) => {
      try {
        const result =
          await service.generate(
            request.body
          );

        response.json(
          result
        );
      } catch (error) {
        sendError(
          response,
          error
        );
      }
    }
  );

  return router;
}

module.exports = {
  createEditorialAiRouter,
  sendError,
};
