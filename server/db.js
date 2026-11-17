import { neon } from '@neondatabase/serverless';

let client;

export function getSql() {
  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL is required for persistent task storage.');
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }
  client ??= neon(process.env.DATABASE_URL);
  return client;
}

export function createTaskRepository(sql) {
  return {
    async list(userId, { status, priority, sort }) {
      const clauses = ['owner_id = $1'];
      const params = [userId];
      if (status) { params.push(status); clauses.push(`status = $${params.length}`); }
      if (priority) { params.push(priority); clauses.push(`priority = $${params.length}`); }
      const orderBy = sort === 'due_date'
        ? 'due_date ASC NULLS LAST, created_at DESC'
        : sort === 'priority'
          ? "CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC"
          : 'created_at DESC';
      return sql.query(
        `SELECT id, owner_id, title, description, status, priority, due_date, created_at, updated_at FROM tasks WHERE ${clauses.join(' AND ')} ORDER BY ${orderBy}`,
        params,
      );
    },

    async get(userId, id) {
      const rows = await sql.query(
        'SELECT id, owner_id, title, description, status, priority, due_date, created_at, updated_at FROM tasks WHERE owner_id = $1 AND id = $2',
        [userId, id],
      );
      return rows[0] ?? null;
    },

    async create(userId, values) {
      const rows = await sql.query(
        `INSERT INTO tasks (owner_id, title, description, status, priority, due_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, owner_id, title, description, status, priority, due_date, created_at, updated_at`,
        [userId, values.title, values.description, values.status, values.priority, values.due_date],
      );
      return rows[0];
    },

    async update(userId, id, values) {
      const rows = await sql.query(
        `UPDATE tasks SET title = $3, description = $4, status = $5, priority = $6, due_date = $7, updated_at = now()
         WHERE owner_id = $1 AND id = $2
         RETURNING id, owner_id, title, description, status, priority, due_date, created_at, updated_at`,
        [userId, id, values.title, values.description, values.status, values.priority, values.due_date],
      );
      return rows[0] ?? null;
    },

    async remove(userId, id) {
      const rows = await sql.query('DELETE FROM tasks WHERE owner_id = $1 AND id = $2 RETURNING id', [userId, id]);
      return rows.length > 0;
    },
  };
}

export const taskRepository = {
  list: (...args) => createTaskRepository(getSql()).list(...args),
  get: (...args) => createTaskRepository(getSql()).get(...args),
  create: (...args) => createTaskRepository(getSql()).create(...args),
  update: (...args) => createTaskRepository(getSql()).update(...args),
  remove: (...args) => createTaskRepository(getSql()).remove(...args),
};
