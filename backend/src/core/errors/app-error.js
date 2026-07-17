class AppError extends Error {
  constructor(message, options = {}) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.code = options.code || "INTERNAL_ERROR";
    this.details = options.details || null;
    this.isOperational = options.isOperational !== false;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details,
    });
  }
}

class NotFoundError extends AppError {
  constructor(message = "Ressource introuvable", details = null) {
    super(message, {
      statusCode: 404,
      code: "NOT_FOUND",
      details,
    });
  }
}

class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, {
      statusCode: 409,
      code: "CONFLICT",
      details,
    });
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
};
