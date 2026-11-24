import { neon } from '@neondatabase/serverless';

let client;

export function getSql(env = process.env) {
  if (!env.DATABASE_URL) {
    const error = new Error('DATABASE_URL is required for persistent task storage.');
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }
  if (env === process.env) client ??= neon(env.DATABASE_URL);
  return client || neon(env.DATABASE_URL);
}

export async function initDb() {
  await getSql().query(`CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    owner_id TEXT NOT NULL,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await getSql().query('CREATE INDEX IF NOT EXISTS tasks_owner_created_idx ON tasks (owner_id, created_at DESC)');
}

const toTask = (row) => row && ({
  id: String(row.id), user_id: row.owner_id, title: row.title,
  description: row.description, status: row.status, priority: row.priority,
  due_date: row.due_date ? new Date(row.due_date).toISOString() : null,
  created_at: new Date(row.created_at).toISOString(),
  updated_at: new Date(row.updated_at).toISOString(),
});

const fields = 'id, owner_id, title, description, status, priority, due_date, created_at, updated_at';

export function createTaskRepository(sql) {
  return {
  async list(ownerId, { status, priority, sort } = {}) {
    const where = ['owner_id = $1'];
    const values = [ownerId];
    if (status) { values.push(status); where.push(`status = $${values.length}`); }
    if (priority) { values.push(priority); where.push(`priority = $${values.length}`); }
    const orderBy = {
      due_date: 'due_date ASC NULLS LAST, created_at DESC',
      priority: "CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC",
      created_at: 'created_at DESC',
    }[sort] || 'created_at DESC';
    const rows = await sql.query(`SELECT ${fields} FROM tasks WHERE ${where.join(' AND ')} ORDER BY ${orderBy}`, values);
    return rows.map(toTask);
  },
  async find(ownerId, id) {
    const rows = await sql.query(`SELECT ${fields} FROM tasks WHERE owner_id = $1 AND id = $2`, [ownerId, id]);
    return toTask(rows[0]);
  },
  async create(ownerId, values) {
    const rows = await sql.query(
      `INSERT INTO tasks (owner_id,title,description,status,priority,due_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${fields}`,
      [ownerId, values.title, values.description, values.status, values.priority, values.due_date],
    );
    return toTask(rows[0]);
  },
  async update(ownerId, id, values) {
    const rows = await sql.query(
      `UPDATE tasks SET title=$3, description=$4, status=$5, priority=$6, due_date=$7, updated_at=now() WHERE owner_id=$1 AND id=$2 RETURNING ${fields}`,
      [ownerId, id, values.title, values.description, values.status, values.priority, values.due_date],
    );
    return toTask(rows[0]);
  },
  async remove(ownerId, id) {
    const rows = await sql.query('DELETE FROM tasks WHERE owner_id=$1 AND id=$2 RETURNING id', [ownerId, id]);
    return rows.length > 0;
  },
  };
}

export const taskRepository = Object.fromEntries(
  ['list', 'find', 'create', 'update', 'remove'].map((method) => [method, (...args) => createTaskRepository(getSql())[method](...args)]),
);
