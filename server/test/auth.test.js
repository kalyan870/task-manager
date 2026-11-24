import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequireUser } from '../middleware/auth.js';

const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('Clerk middleware rejects missing tokens', async () => {
  const res = response();
  await createRequireUser({ env: { CLERK_SECRET_KEY: 'test-secret', CLIENT_ORIGINS: 'https://example.test' } })({ headers: {} }, res, () => assert.fail('next must not run'));
  assert.equal(res.statusCode, 401);
});

test('Clerk middleware fails closed without server credentials or allowed parties', async () => {
  const res = response();
  await createRequireUser({ verify: async () => ({ sub: 'user_1' }), env: {} })({ headers: { authorization: 'Bearer token' } }, res, () => assert.fail('next must not run'));
  assert.equal(res.statusCode, 503);
});

test('Clerk middleware verifies token and assigns only the subject as owner identity', async () => {
  let options;
  let req = { headers: { authorization: 'Bearer token.payload_signature' } };
  const res = response();
  let continued = false;
  const requireUser = createRequireUser({
    verify: async (_token, received) => { options = received; return { sub: 'user_123', email: 'ignore@example.test' }; },
    env: { CLERK_SECRET_KEY: 'server-only', CLIENT_ORIGINS: 'https://app.example.test' },
  });
  await requireUser(req, res, () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(req.userId, 'user_123');
  assert.deepEqual(options.authorizedParties, ['https://app.example.test']);
  assert.equal(options.secretKey, 'server-only');
});

test('Clerk middleware rejects tokens without a stable subject', async () => {
  const res = response();
  await createRequireUser({ verify: async () => ({}), env: { CLERK_JWT_KEY: 'test-key', CLIENT_ORIGINS: 'https://example.test' } })({ headers: { authorization: 'Bearer token' } }, res, () => assert.fail('next must not run'));
  assert.equal(res.statusCode, 401);
});
