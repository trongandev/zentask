export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  if (statusCode >= 500) console.error(err.stack || err);
  else console.warn(`[${statusCode}] ${err.code || "REQUEST_BLOCKED"}: ${err.message}`);

  res.status(statusCode).json({
    success: false,
    error: err.message || "Internal Server Error",
    code: err.code,
    details: {
      limit: err.limit,
      used: err.used,
      remaining: err.remaining,
      matches: process.env.NODE_ENV === "production" ? undefined : err.matches,
      libraries: process.env.NODE_ENV === "production" ? undefined : err.libraryMatches,
    },
  });
};
