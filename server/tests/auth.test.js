import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequireUser } from '../middleware/auth.js';

test('Clerk-provided user id is required and attached by middleware', () => {
  const req = {};
  let nextCalled = false;
  const middleware = createRequireUser(() => ({ isAuthenticated: true, userId: 'user_verified_42' }));
  middleware(req, { status() { throw new Error('unexpected response'); }, json() {} }, () => { nextCalled = true; });
  assert.equal(req.userId, 'user_verified_42');
  assert.equal(nextCalled, true);
});

test('unauthenticated requests are rejected before reaching the route', () => {
  const res = { code: 0, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  let nextCalled = false;
  createRequireUser(() => ({ isAuthenticated: false, userId: null }))({}, res, () => { nextCalled = true; });
  assert.equal(res.code, 401);
  assert.deepEqual(res.body, { error: 'Authentication required' });
  assert.equal(nextCalled, false);
});
