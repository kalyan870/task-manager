import test from 'node:test';
import assert from 'node:assert/strict';
import { createTaskRepository, getSql } from '../db.js';

test('Neon configuration is mandatory and server-side', () => {
  assert.throws(() => getSql({}), { code: 'DATABASE_NOT_CONFIGURED' });
});

test('task repository scopes every read and mutation by Clerk owner id', async () => {
  const calls = [];
  const sql = { async query(query, params) { calls.push({ query, params }); return []; } };
  const repo = createTaskRepository(sql);
  await repo.list('user_a');
  await repo.find('user_a', '5');
  await repo.create('user_a', { title: 'a', description: '', status: 'pending', priority: 'low', due_date: null });
  await repo.update('user_a', '5', { title: 'a', description: '', status: 'pending', priority: 'low', due_date: null });
  await repo.remove('user_a', '5');
  assert.equal(calls.length, 5);
  assert.ok(calls.every(({ query }) => query.includes('owner_id')));
  assert.deepEqual(calls[0].params, ['user_a']);
  assert.deepEqual(calls[1].params, ['user_a', '5']);
  assert.deepEqual(calls[4].params, ['user_a', '5']);
  assert.equal(calls[2].params[0], 'user_a');
  assert.equal(calls[3].params[0], 'user_a');
});

test('task repository uses only fixed sort expressions and parameterized filters', async () => {
  let query;
  let params;
  const repo = createTaskRepository({ async query(text, values) { query = text; params = values; return []; } });
  await repo.list('user_a', { status: "pending' OR 1=1 --", priority: 'high', sort: 'created_at; DROP TABLE tasks' });
  assert.match(query, /ORDER BY created_at DESC$/);
  assert.deepEqual(params, ['user_a', "pending' OR 1=1 --", 'high']);
});
