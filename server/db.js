import pg from 'pg';
let pool;
export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada.');
  return pool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 15000, idleTimeoutMillis: 10000 });
}
