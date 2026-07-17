const { AppError } = require("./app-error");

function errorMiddleware(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const isOperationalError =
    error instanceof AppError ||
    error?.isOperational === true;

  const statusCode =
    Number.isInteger(error?.statusCode)
      ? error.statusCode
      : 500;

  const response = {
    error: {
      code:
        error?.code ||
        (isOperationalError
          ? "APPLICATION_ERROR"
          : "INTERNAL_ERROR"),

      message:
        isOperationalError
          ? error.message
          : "Une erreur interne est survenue.",
    },
  };

  if (error?.details !== undefined && error?.details !== null) {
    response.error.details = error.details;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    !isOperationalError
  ) {
    response.error.debug = {
      name: error?.name || null,
      message: error?.message || null,
      stack: error?.stack || null,
    };
  }

  if (!isOperationalError) {
    console.error("[UNHANDLED_ERROR]", {
      method: req.method,
      path: req.originalUrl,
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });
  }

  return res.status(statusCode).json(response);
}

module.exports = errorMiddleware;
