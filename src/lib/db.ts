import { neon } from '@neondatabase/serverless';

let client: ReturnType<typeof neon> | undefined;

/** Neon/Postgres client. DATABASE_URL is added automatically by Vercel's Neon integration. */
export function sql() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  client ??= neon(url);
  return client;
}
