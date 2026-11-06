// Creates the comments table and loads the comments from the old WordPress blog.
// Usage: DATABASE_URL=postgres://... npm run db:setup   (safe to run more than once)

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from '@neondatabase/serverless';

const ROOT = path.resolve(import.meta.dirname, '..');
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy it from Vercel → Storage → your Neon database → .env.local');
  process.exit(1);
}

const AUTHOR = 'rup pokharel';
const pool = new Pool({ connectionString: url });

try {
  await pool.query(await readFile(path.join(ROOT, 'db/schema.sql'), 'utf8'));
  console.log('Schema ready.');

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
  console.log(`Imported ${added} old comments (${legacy.length - added} were already there).`);
} finally {
  await pool.end();
}
