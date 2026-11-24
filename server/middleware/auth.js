import { verifyToken } from '@clerk/backend';

export const authorizedParties = (env = process.env) =>
  (env.CLERK_AUTHORIZED_PARTIES || env.CLIENT_ORIGINS || '')
    .split(',').map((origin) => origin.trim()).filter(Boolean);

const verifyOptions = (env = process.env) => ({
  secretKey: env.CLERK_SECRET_KEY,
  jwtKey: env.CLERK_JWT_KEY,
  authorizedParties: authorizedParties(env),
});

export function createRequireUser({ verify = verifyToken, env = process.env } = {}) {
  return async function requireUser(req, res, next) {
    const match = /^Bearer\s+([A-Za-z0-9._-]+)$/i.exec(req.headers.authorization || '');
    const token = match?.[1];
    if (!token) return res.status(401).json({ error: 'Sign in required' });
    if ((!env.CLERK_SECRET_KEY && !env.CLERK_JWT_KEY) || !authorizedParties(env).length) {
      return res.status(503).json({ error: 'Authentication is not configured' });
    }
    try {
      const claims = await verify(token, verifyOptions(env));
      if (typeof claims.sub !== 'string' || !claims.sub) {
        return res.status(401).json({ error: 'Invalid session' });
      }
      req.userId = claims.sub;
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
  };
}

export const authenticateToken = createRequireUser();
export { verifyOptions };
