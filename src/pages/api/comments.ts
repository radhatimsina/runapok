import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { createHash, timingSafeEqual } from 'node:crypto';
import { sql } from '../../lib/db';
import { AUTHOR } from '../../lib/writings';

export const prerender = false;

const MAX_PER_WINDOW = 5; // comments per visitor…
const WINDOW_MINUTES = 10; // …in this many minutes
const MIN_SECONDS_ON_PAGE = 3; // faster than this is almost certainly a bot

type Row = {
  id: number;
  parent_id: number | null;
  author_name: string;
  author_url: string | null;
  body: string;
  is_author: boolean;
  created_at: string;
};

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });

let knownPosts: Set<string> | undefined;
async function postExists(id: string) {
  knownPosts ??= new Set(['about', ...(await getCollection('writings')).map((w) => w.id)]);
  return knownPosts.has(id);
}

function sameSecret(given: string, expected: string | undefined) {
  if (!expected || !given) return false;
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-zऀ-ॿ]/g, '');

export const GET: APIRoute = async ({ url }) => {
  const postId = url.searchParams.get('post') ?? '';
  if (!(await postExists(postId))) return json({ error: 'Unknown post' }, 404);
  try {
    const rows = (await sql()`
      SELECT id, parent_id, author_name, author_url, body, is_author, created_at
      FROM comments
      WHERE post_id = ${postId} AND status = 'approved'
      ORDER BY created_at ASC
    `) as Row[];
    return json(
      {
        comments: rows.map((r) => ({
          id: r.id,
          parentId: r.parent_id,
          authorName: r.author_name,
          authorUrl: r.author_url,
          body: r.body,
          isAuthor: r.is_author,
          createdAt: new Date(r.created_at).toISOString(),
        })),
      },
      200,
      { 'cache-control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300' },
    );
  } catch (err) {
    console.error('Loading comments failed', err);
    return json({ error: 'Comments are unavailable right now.' }, 503);
  }
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const str = (key: string) => (typeof input[key] === 'string' ? (input[key] as string).trim() : '');

  // Bots fill in the hidden field; pretend it worked and store nothing.
  if (str('website')) return json({ ok: true, pending: true });

  const postId = str('postId');
  const name = str('name').replace(/\s+/g, ' ');
  const body = str('body').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  const authorUrl = str('url');
  const passcode = str('passcode');
  const parentId = Number.parseInt(str('parentId'), 10) || null;
  const startedAt = Number(str('startedAt'));

  if (!(await postExists(postId))) return json({ error: 'Unknown post.' }, 400);
  if (!name || name.length > 80) return json({ error: 'Please enter your name (up to 80 characters).' }, 400);
  if (!body || body.length > 5000) return json({ error: 'Please write a comment (up to 5000 characters).' }, 400);
  if (authorUrl && (!/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(authorUrl) || authorUrl.length > 200)) {
    return json({ error: 'The website should be a full address starting with https://' }, 400);
  }
  if (startedAt && Date.now() - startedAt < MIN_SECONDS_ON_PAGE * 1000) {
    return json({ error: 'That was quick! Please wait a moment and try again.' }, 429);
  }

  const isAuthor = sameSecret(passcode, process.env.AUTHOR_PASSCODE);
  if (passcode && !isAuthor) return json({ error: 'The author passcode is not correct.' }, 403);
  if (!isAuthor && normalise(name) === normalise(AUTHOR)) {
    return json({ error: 'That name is reserved for the author. Open “Are you the author?” to sign in.' }, 403);
  }

  const ip = clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const ipHash = createHash('sha256')
    .update(`${process.env.COMMENT_SALT ?? 'runapok'}:${ip}`)
    .digest('hex');

  const tooManyLinks = (body.match(/https?:\/\//g) ?? []).length > 2;
  const needsApproval = process.env.COMMENTS_REQUIRE_APPROVAL === 'true' || tooManyLinks;
  const status = isAuthor || !needsApproval ? 'approved' : 'pending';

  try {
    const db = sql();
    if (!isAuthor) {
      const [recent] = (await db`
        SELECT count(*)::int AS n FROM comments
        WHERE ip_hash = ${ipHash} AND created_at > now() - make_interval(mins => ${WINDOW_MINUTES})
      `) as { n: number }[];
      if (recent.n >= MAX_PER_WINDOW) {
        return json({ error: 'You have posted several comments just now. Please try again in a few minutes.' }, 429);
      }
    }
    if (parentId) {
      const parent = (await db`
        SELECT id FROM comments WHERE id = ${parentId} AND post_id = ${postId} AND status = 'approved'
      `) as { id: number }[];
      if (!parent.length) return json({ error: 'The comment you are replying to no longer exists.' }, 400);
    }
    await db`
      INSERT INTO comments (post_id, parent_id, author_name, author_url, body, is_author, status, ip_hash)
      VALUES (${postId}, ${parentId}, ${isAuthor ? AUTHOR : name}, ${authorUrl || null}, ${body},
              ${isAuthor}, ${status}, ${ipHash})
    `;
    return json({ ok: true, pending: status !== 'approved' }, 201);
  } catch (err) {
    console.error('Saving comment failed', err);
    return json({ error: 'Your comment could not be saved right now. Please try again later.' }, 503);
  }
};
