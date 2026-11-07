// Creates the comments table and loads the comments from the old WordPress blog.
// Safe to run any number of times: existing tables and comments are left alone.
//
// Runs automatically before every Vercel build (see "build" in package.json) with
// --optional, which skips quietly when no database is configured and never fails
// the deploy. Run it by hand with: DATABASE_URL=postgres://... npm run db:setup

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool, neonConfig } from '@neondatabase/serverless';

const ROOT = path.resolve(import.meta.dirname, '..');
const optional = process.argv.includes('--optional');
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
const AUTHOR = 'rup pokharel';

if (globalThis.WebSocket) neonConfig.webSocketConstructor = globalThis.WebSocket;

async function setup() {
  const pool = new Pool({ connectionString: url });
  try {
    await pool.query(await readFile(path.join(ROOT, 'db/schema.sql'), 'utf8'));
    console.log('[db] Comments table ready.');

    const legacy = JSON.parse(await readFile(path.join(ROOT, 'db/legacy-comments.json'), 'utf8'));
    let added = 0;
    // Oldest first, so a reply's parent is always inserted before the reply.
    for (const c of legacy.sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      const res = await pool.query(
        `INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, legacy_id, created_at)
         VALUES ($1, (SELECT id FROM comments WHERE legacy_id = $2), $3, $4, $5, $6, $7, $8)
         ON CONFLICT (legacy_id) DO NOTHING`,
        [
          c.post_id,
          c.parent_legacy_id,
          c.author_name,
          c.author_url,
          c.body,
          c.author_name.trim().toLowerCase() === AUTHOR,
          c.legacy_id,
          c.created_at,
        ],
      );
      added += res.rowCount ?? 0;
    }
    console.log(`[db] Old WordPress comments: ${added} added, ${legacy.length - added} already there.`);
  } finally {
    await pool.end();
  }
}

if (!url) {
  const msg = '[db] DATABASE_URL is not set; skipping database setup.';
  if (optional) {
    console.log(msg);
  } else {
    console.error(`${msg} Copy it from Vercel → Storage → your Neon database → .env.local`);
    process.exit(1);
  }
} else {
  try {
    await setup();
  } catch (err) {
    console.error('[db] Database setup failed:', err.message ?? err);
    if (!optional) process.exit(1);
    console.log('[db] Continuing the build anyway; comments may be incomplete.');
  }
}
