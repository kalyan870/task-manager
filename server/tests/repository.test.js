import test from 'node:test';
import assert from 'node:assert/strict';
import { createTaskRepository } from '../db.js';

function fakeSql(result = []) {
  const calls = [];
  return { calls, query: async (...args) => { calls.push(args); return result; } };
}

test('task listing scopes by verified owner and parameterizes filters', async () => {
  const sql = fakeSql([]);
  const repo = createTaskRepository(sql);
  await repo.list('user_123', { status: "pending' OR 1=1 --", priority: 'high', sort: 'due_date; DROP TABLE tasks' });
  assert.deepEqual(sql.calls[0][1], ['user_123', "pending' OR 1=1 --", 'high']);
  assert.match(sql.calls[0][0], /owner_id = \$1 AND status = \$2 AND priority = \$3/);
  assert.match(sql.calls[0][0], /ORDER BY created_at DESC$/);
  assert.doesNotMatch(sql.calls[0][0], /DROP TABLE/);
});

test('get and update always constrain both record id and verified owner', async () => {
  const sql = fakeSql([{ id: '5', owner_id: 'user_123' }]);
  const repo = createTaskRepository(sql);
  await repo.get('user_123', '5');
  await repo.update('user_123', '5', { title: 'T', description: '', status: 'pending', priority: 'medium', due_date: null });
  for (const [query, params] of sql.calls) {
    assert.match(query, /owner_id = \$1 AND id = \$2/);
    assert.deepEqual(params.slice(0, 2), ['user_123', '5']);
  }
});

test('delete reports success only for a row owned by the signed-in user', async () => {
  const sql = fakeSql([]);
  const repo = createTaskRepository(sql);
  assert.equal(await repo.remove('user_a', '99'), false);
  assert.deepEqual(sql.calls[0][1], ['user_a', '99']);
  sql.query = async () => [{ id: '99' }];
  assert.equal(await repo.remove('user_a', '99'), true);
});
