const rateLimit = new Map();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 100;
const AUTH_MAX = 10;

const limiter =
  (maxRequests = MAX_REQUESTS) =>
  (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `${ip}_${req.path}`;
    const now = Date.now();

    if (!rateLimit.has(key)) {
      rateLimit.set(key, { count: 1, start: now });
      return next();
    }

    const record = rateLimit.get(key);

    if (now - record.start > WINDOW_MS) {
      rateLimit.set(key, { count: 1, start: now });
      return next();
    }

    record.count++;

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: "Prea multe cereri. Încearca din nou în câteva momente.",
      });
    }

    next();
  };

const authLimiter = limiter(AUTH_MAX);
const generalLimiter = limiter(MAX_REQUESTS);

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimit.entries()) {
    if (now - record.start > WINDOW_MS * 2) {
      rateLimit.delete(key);
    }
  }
}, 60 * 1000);

module.exports = { authLimiter, generalLimiter, limiter };
