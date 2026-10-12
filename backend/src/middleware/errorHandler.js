import { ApiError } from "../utils/ApiError.js";

export function notFound(request, response, next) {
  next(new ApiError(404, "The requested API route was not found."));
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error);

  let statusCode = error.statusCode || 500;
  let message = error.message || "An unexpected server error occurred.";
  let details = error.details;

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Request data is invalid.";
    details = Object.fromEntries(
      Object.entries(error.errors).map(([field, item]) => [field, item.message])
    );
  } else if (error.code === 11000) {
    statusCode = 409;
    message = "A record with these details already exists.";
  } else if (error.name === "CastError") {
    statusCode = 400;
    message = "A supplied identifier or value is invalid.";
  } else if (error.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body is too large.";
  } else if (error instanceof SyntaxError && "body" in error) {
    statusCode = 400;
    message = "Request body must contain valid JSON.";
  }

  if (statusCode >= 500) {
    const isDevelopment = process.env.NODE_ENV === "development" ||
      (process.env.NODE_ENV === undefined && process.execArgv.includes("--watch"));
    if (isDevelopment) {
      console.error("Unhandled API error", {
        method: request.method,
        path: request.path,
        name: error.name,
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
    }
    message = "An unexpected server error occurred.";
    details = undefined;
  }

  response.status(statusCode).json({
    error: {
      message,
      ...(details ? { details } : {}),
    },
  });
}
