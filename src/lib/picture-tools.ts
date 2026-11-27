// Server-side helpers for the writing desk's "Suggest pictures" tool.
// Used only by the /api/images/* routes; nothing here runs in visitors' browsers.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { generateImage, generateText, Output } from 'ai';
import sharp from 'sharp';
import { z } from 'astro/zod';
import { sql } from './db';

const env = (name: string) => process.env[name]?.trim() || undefined;

export const REPO = env('GITHUB_REPO') ?? 'radhatimsina/runapok';
export const BRANCH = env('GITHUB_BRANCH') ?? 'main';
const TEXT_MODEL = env('AI_TEXT_MODEL') ?? 'anthropic/claude-haiku-5.5';
const IMAGE_MODEL = env('AI_IMAGE_MODEL') ?? 'bfl/flux-3-image-klein';
/** Monthly spending limit for AI calls, in US cents (default $1). */
const BUDGET_CENTS = Number(env('AI_MONTHLY_BUDGET_CENTS') ?? 100);
/** Estimated costs used when the gateway doesn't report one, in cents. */
const IMAGE_COST_CENTS = Number(env('AI_IMAGE_COST_CENTS') ?? 1);
const TEXT_COST_CENTS = 0.1;
const STYLE = 'Painterly illustration, muted warm tones, soft light, contemplative mood, no text, no letters, no watermark.';

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Who may use the tool: anyone signed in to the writing desk with write access
// to the repository. The browser sends the GitHub token Decap CMS already holds.

const allowed = new Map<string, number>(); // token hash -> expiry

export async function requireAuthor(request: Request): Promise<string> {
  const token = request.headers.get('x-github-token')?.trim();
  if (!token) throw new HttpError(401, 'Please sign in to the writing desk first.');
  const key = createHash('sha256').update(token).digest('hex');
  if ((allowed.get(key) ?? 0) > Date.now()) return token;
  const res = await fetch(`https://api.github.com/repos/${REPO}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'runapok-cms' },
  });
  const repo = (await res.json().catch(() => ({}))) as { permissions?: { push?: boolean } };
  if (!res.ok || !repo.permissions?.push) {
    throw new HttpError(403, 'Your GitHub account does not have permission to edit this site.');
  }
  allowed.set(key, Date.now() + 10 * 60_000);
  return token;
}

// ---------------------------------------------------------------------------
// Signed result URLs: the save route only downloads pictures our own search
// returned, so it can't be used to fetch arbitrary addresses.

const signingSecret = () => env('IMAGE_SIGNING_SECRET') ?? env('GITHUB_CLIENT_SECRET') ?? 'runapok-dev-secret';

export function sign(value: string) {
  return createHmac('sha256', signingSecret()).update(value).digest('base64url');
}

export function verifySignature(value: string, signature: string) {
  const a = Buffer.from(sign(value));
  const b = Buffer.from(signature ?? '');
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Monthly AI budget, kept in the site's database.

async function ensureUsageTable() {
  await sql()`CREATE TABLE IF NOT EXISTS ai_usage (
    id SERIAL PRIMARY KEY,
    kind TEXT NOT NULL,
    cost_cents NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
}

export async function budgetStatus() {
  try {
    await ensureUsageTable();
    const [row] = (await sql()`
      SELECT COALESCE(SUM(cost_cents), 0)::float AS spent FROM ai_usage
      WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'UTC')
    `) as { spent: number }[];
    const spent = Number(row?.spent ?? 0);
    return { ok: true as const, spentCents: spent, limitCents: BUDGET_CENTS, remainingCents: Math.max(0, BUDGET_CENTS - spent) };
  } catch (err) {
    console.error('Budget check failed', err);
    // Without the database we can't enforce the limit, so AI stays off.
    return { ok: false as const, spentCents: 0, limitCents: BUDGET_CENTS, remainingCents: 0 };
  }
}

async function recordUsage(kind: string, cents: number) {
  await sql()`INSERT INTO ai_usage (kind, cost_cents) VALUES (${kind}, ${cents})`;
}

const gatewayCost = (meta: unknown): number | undefined => {
  const cost = Number((meta as { gateway?: { cost?: string | number } } | undefined)?.gateway?.cost);
  return Number.isFinite(cost) && cost > 0 ? cost * 100 : undefined;
};

// ---------------------------------------------------------------------------
// Understanding the poem.

export type Ideas = { queries: string[]; prompt: string; usedAi: boolean };

const ideasSchema = z.object({
  queries: z.array(z.string()).min(1).max(4),
  prompt: z.string(),
});

export async function pictureIdeas(title: string, body: string): Promise<Ideas> {
  const text = body.replace(/!\[[^\]]*\]\([^)]*\)/g, '').slice(0, 3500);
  const fallback = (): Ideas => {
    const words = title.replace(/[^\p{L}\p{N}\s'-]/gu, ' ').trim();
    return { queries: words && !/[ऀ-ॿ]/.test(words) ? [words] : [], prompt: '', usedAi: false };
  };
  const budget = await budgetStatus();
  if (!budget.ok || budget.remainingCents < TEXT_COST_CENTS) return fallback();
  try {
    const result = await generateText({
      model: TEXT_MODEL,
      output: Output.object({ schema: ideasSchema }),
      maxOutputTokens: 400,
      prompt: `You help a poet choose a picture for a piece on their website. The piece may be in English or Nepali.

Read it and return:
- "queries": 3 short English search phrases (2-4 words each) for stock photo sites. Use concrete, photographable things from the piece (places, objects, nature, light, weather, people's actions), not abstract words.
- "prompt": one English sentence describing a single evocative scene that captures the piece, for an illustrator. No text or lettering in the scene.

Title: ${title}

${text}`,
    });
    await recordUsage('ideas', gatewayCost(result.providerMetadata) ?? TEXT_COST_CENTS);
    const queries = result.output.queries.map((q) => q.trim()).filter(Boolean).slice(0, 3);
    return { queries, prompt: result.output.prompt.trim(), usedAi: true };
  } catch (err) {
    console.error('Picture ideas failed', err);
    return fallback();
  }
}

// ---------------------------------------------------------------------------
// Free picture sources.

export type Found = {
  id: string;
  source: string;
  thumb: string;
  full: string;
  width?: number;
  height?: number;
  credit: string;
  creditUrl?: string;
  license: string;
  licenseUrl?: string;
  pageUrl?: string;
  sig: string;
};

type Unsigned = Omit<Found, 'sig'>;

async function getJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function searchPexels(query: string): Promise<Unsigned[]> {
  const key = env('PEXELS_API_KEY');
  if (!key) throw new Error('not configured');
  const data = await getJson(
    `https://api.pexels.com/v1/search?per_page=8&orientation=landscape&query=${encodeURIComponent(query)}`,
    { headers: { authorization: key } },
  );
  return (data.photos ?? []).map((p: any) => ({
    id: `pexels-${p.id}`,
    source: 'Pexels',
    thumb: p.src?.medium,
    full: p.src?.large2x ?? p.src?.original,
    width: p.width,
    height: p.height,
    credit: p.photographer,
    creditUrl: p.photographer_url,
    license: 'Pexels License',
    licenseUrl: 'https://www.pexels.com/license/',
    pageUrl: p.url,
  }));
}

async function searchPixabay(query: string): Promise<Unsigned[]> {
  const key = env('PIXABAY_API_KEY');
  if (!key) throw new Error('not configured');
  const data = await getJson(
    `https://pixabay.com/api/?key=${encodeURIComponent(key)}&image_type=all&orientation=horizontal&safesearch=true&per_page=8&q=${encodeURIComponent(query.slice(0, 100))}`,
  );
  return (data.hits ?? []).map((p: any) => ({
    id: `pixabay-${p.id}`,
    source: 'Pixabay',
    thumb: p.webformatURL,
    full: p.largeImageURL,
    width: p.imageWidth,
    height: p.imageHeight,
    credit: p.user,
    creditUrl: p.user_id ? `https://pixabay.com/users/${p.user}-${p.user_id}/` : undefined,
    license: 'Pixabay Content License',
    licenseUrl: 'https://pixabay.com/service/license-summary/',
    pageUrl: p.pageURL,
  }));
}

let openverseToken: { value: string; expires: number } | undefined;
async function openverseAuth(): Promise<Record<string, string>> {
  const id = env('OPENVERSE_CLIENT_ID');
  const secret = env('OPENVERSE_CLIENT_SECRET');
  if (!id || !secret) return {};
  if (!openverseToken || openverseToken.expires < Date.now()) {
    const data = await getJson('https://api.openverse.org/v1/auth_tokens/token/', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
    });
    openverseToken = { value: data.access_token, expires: Date.now() + (Number(data.expires_in ?? 3600) - 60) * 1000 };
  }
  return { authorization: `Bearer ${openverseToken.value}` };
}

// Openverse covers Wikimedia Commons, Flickr's Creative Commons photos, museums and more.
// Only licences that allow reuse with changes (we crop and resize).
async function searchOpenverse(query: string): Promise<Unsigned[]> {
  const data = await getJson(
    `https://api.openverse.org/v1/images/?page_size=8&aspect_ratio=wide&mature=false&license=cc0,pdm,by,by-sa&q=${encodeURIComponent(query)}`,
    { headers: { ...(await openverseAuth()), 'user-agent': 'runapok-cms (poetry website)' } },
  );
  return (data.results ?? []).map((p: any) => ({
    id: `openverse-${p.id}`,
    source: p.source === 'wikimedia' ? 'Wikimedia Commons' : p.source === 'flickr' ? 'Flickr' : 'Openverse',
    thumb: p.thumbnail ?? p.url,
    full: p.url,
    width: p.width,
    height: p.height,
    credit: p.creator || 'Unknown',
    creditUrl: p.creator_url ?? undefined,
    license: `${String(p.license ?? '').toUpperCase()} ${p.license_version ?? ''}`.trim(),
    licenseUrl: p.license_url ?? undefined,
    pageUrl: p.foreign_landing_url ?? undefined,
  }));
}

const SOURCES = [
  ['Pexels', searchPexels],
  ['Pixabay', searchPixabay],
  ['Openverse', searchOpenverse],
] as const;

export async function searchFree(queries: string[]) {
  const status: Record<string, string> = {};
  const lists: Unsigned[][] = [];
  await Promise.all(
    SOURCES.map(async ([name, search]) => {
      const found: Unsigned[] = [];
      for (const q of queries.slice(0, 3)) {
        try {
          found.push(...(await search(q)).slice(0, queries.length > 1 ? 4 : 8));
        } catch (err) {
          status[name] = (err as Error).message === 'not configured' ? 'not set up' : 'unavailable right now';
          break;
        }
      }
      status[name] ??= 'ok';
      lists.push(found);
    }),
  );
  // Interleave the sources so the grid mixes them, and drop duplicates.
  const seen = new Set<string>();
  const results: Found[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) {
    for (const list of lists) {
      const r = list[i];
      if (!r?.full || !r.thumb || seen.has(r.id)) continue;
      seen.add(r.id);
      results.push({ ...r, sig: sign(r.full) });
    }
  }
  return { results: results.slice(0, 24), status };
}

// ---------------------------------------------------------------------------
// Creating a picture with AI.

export async function createPictures(prompt: string, count: number) {
  const budget = await budgetStatus();
  const cost = IMAGE_COST_CENTS * count;
  if (!budget.ok) throw new HttpError(503, 'AI pictures are unavailable because the spending limit could not be checked.');
  if (budget.remainingCents < cost) {
    throw new HttpError(
      402,
      `This month's AI budget ($${(budget.limitCents / 100).toFixed(2)}) is used up. It resets on the 1st, or use a free photo instead.`,
    );
  }
  const { images, providerMetadata } = await generateImage({
    model: IMAGE_MODEL,
    prompt: `${prompt.trim()} ${STYLE}`,
    n: count,
    aspectRatio: '16:9',
  });
  await recordUsage('image', gatewayCost(providerMetadata) ?? cost);
  return Promise.all(
    images.map(async (img) => {
      const jpeg = await toThumbnail(Buffer.from(img.uint8Array));
      return { data: jpeg.toString('base64') };
    }),
  );
}

// ---------------------------------------------------------------------------
// Image processing and saving to the repository.

export async function toThumbnail(input: Buffer) {
  return sharp(input, { failOn: 'none' })
    .rotate()
    .resize(1280, 720, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

export async function download(url: string) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'runapok-cms (poetry website)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new HttpError(502, 'The picture could not be downloaded from its website. Try another one.');
  const length = Number(res.headers.get('content-length') ?? 0);
  if (length > 25_000_000) throw new HttpError(413, 'That picture is too large. Try another one.');
  return Buffer.from(await res.arrayBuffer());
}

export function fileNameFor(title: string) {
  const base =
    title
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'picture';
  return `${base}-${Date.now().toString(36)}`;
}

export type Credit = {
  credit?: string;
  creditUrl?: string;
  source?: string;
  license?: string;
  licenseUrl?: string;
  pageUrl?: string;
};

/** Commits the picture (and its credit, if any) to the repository in one commit. */
export async function commitPicture(token: string, name: string, jpeg: Buffer, credit: Credit | null, title: string) {
  const gh = async (path: string, init?: RequestInit) => {
    const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'user-agent': 'runapok-cms',
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(`GitHub ${res.status}: ${data.message ?? ''}`), { status: res.status });
    return data;
  };
  const imagePath = `public/images/uploads/${name}.jpg`;
  const files: { path: string; content: string; encoding: 'base64' | 'utf-8' }[] = [
    { path: imagePath, content: jpeg.toString('base64'), encoding: 'base64' },
  ];
  if (credit?.credit) {
    files.push({ path: `public/images/uploads/${name}.json`, content: JSON.stringify(credit, null, 2) + '\n', encoding: 'utf-8' });
  }
  const blobs = await Promise.all(files.map((f) => gh('/git/blobs', { method: 'POST', body: JSON.stringify(f) })));
  for (let attempt = 0; attempt < 3; attempt++) {
    const ref = await gh(`/git/ref/heads/${BRANCH}`);
    const parent = await gh(`/git/commits/${ref.object.sha}`);
    const tree = await gh('/git/trees', {
      method: 'POST',
      body: JSON.stringify({
        base_tree: parent.tree.sha,
        tree: files.map((f, i) => ({ path: f.path, mode: '100644', type: 'blob', sha: blobs[i].sha })),
      }),
    });
    const commit = await gh('/git/commits', {
      method: 'POST',
      body: JSON.stringify({ message: `Add picture for “${title.slice(0, 60)}”`, tree: tree.sha, parents: [ref.object.sha] }),
    });
    try {
      await gh(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
      return `/images/uploads/${name}.jpg`;
    } catch (err) {
      // Someone else committed in between (e.g. the author published); try again on top.
      if ((err as { status?: number }).status !== 422 || attempt === 2) throw err;
    }
  }
  throw new Error('unreachable');
}
