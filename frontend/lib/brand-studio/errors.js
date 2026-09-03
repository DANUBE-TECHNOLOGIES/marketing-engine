export class BrandStudioApiError extends Error {
  constructor({
    message,
    code = "BRAND_STUDIO_API_ERROR",
    status = 500,
    details = {},
  }) {
    super(
      message ||
      "Une erreur Brand Studio est survenue."
    );

    this.name =
      "BrandStudioApiError";

    this.code =
      code;

    this.status =
      status;

    this.details =
      details;
  }
}

export function normalizeBrandStudioError(
  error
) {
  if (
    error instanceof
    BrandStudioApiError
  ) {
    return error;
  }

  return new BrandStudioApiError({
    message:
      error?.message ||
      "Une erreur inattendue est survenue.",

    code:
      error?.code ||
      "BRAND_STUDIO_UNKNOWN_ERROR",

    status:
      error?.status ||
      error?.statusCode ||
      500,

    details:
      error?.details ||
      {},
  });
}
