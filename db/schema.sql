-- Comments for the site. Applied by `npm run db:setup` (safe to run more than once).
CREATE TABLE IF NOT EXISTS comments (
  id          SERIAL PRIMARY KEY,
  post_id     TEXT NOT NULL,              -- writing file name without .md, or 'about'
  parent_id   INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_url  TEXT,
  body        TEXT NOT NULL,
  is_author   BOOLEAN NOT NULL DEFAULT false,
  status      TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'spam')),
  ip_hash     TEXT,                       -- salted hash, only used for rate limiting
  legacy_id   INTEGER UNIQUE,             -- comment id on the old WordPress blog
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_post_idx ON comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS comments_ip_idx ON comments (ip_hash, created_at);
