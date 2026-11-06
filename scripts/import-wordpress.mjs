// One-off importer for the old WordPress.com blog (runapok.wordpress.com).
//
// Uses the public WordPress.com REST API, so no login is needed. It writes:
//   src/content/writings/<YYYY-MM-DD>-<original-slug>.md   one file per post
//   src/content/pages/about.md                             the About page
//   public/images/wp/...                                   the original images
//   db/legacy-comments.json                                comments, seeded by `npm run db:setup`
//
// Run with: npm run import:wordpress
// Re-running overwrites the imported files, so only do it before editing them.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import TurndownService from 'turndown';
import domino from '@mixmark-io/domino';

const SITE = 'runapok.wordpress.com';
const API = `https://public-api.wordpress.com/rest/v1.1/sites/${SITE}`;
const ROOT = path.resolve(import.meta.dirname, '..');

const DEVANAGARI = /[ऀ-ॿ]/;

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

function decodeEntities(str) {
  const doc = domino.createDocument(`<p>${str}</p>`);
  return doc.querySelector('p').textContent;
}

/** Local path for a WordPress upload, e.g. /images/wp/2009/11/images-14.jpg */
function localImagePath(src) {
  const url = new URL(src.replace(/&#0?38;/g, '&'));
  const m = url.pathname.match(/\/wp-content\/uploads\/(.+)$/) ?? url.pathname.match(/\/(\d{4}\/\d{2}\/.+)$/);
  if (!m) return null;
  return `/images/wp/${m[1]}`;
}

const images = new Map(); // original url -> local path

const turndown = new TurndownService({ headingStyle: 'atx', emDelimiter: '*' });
// Poems rely on line breaks; remark-breaks turns single newlines back into <br>.
turndown.addRule('lineBreak', { filter: 'br', replacement: () => '\n' });
turndown.addRule('image', {
  filter: 'img',
  replacement(_content, node) {
    const orig = node.getAttribute('data-orig-file') || node.getAttribute('src').split('?')[0];
    const local = localImagePath(orig);
    if (!local) return '';
    images.set(orig.split('?')[0], local);
    // WordPress alt text was the file name ("images (14)"), so treat images as decorative.
    return `![](${local})`;
  },
});
// Links that only wrap an image point at the image file itself; keep just the image.
turndown.addRule('imageLink', {
  filter: (node) => node.nodeName === 'A' && node.querySelector('img') && !node.textContent.trim(),
  replacement: (content) => content,
});
// Copy-paste leftovers from poemhunter.com ad links ("KonaLink"): keep only the text.
turndown.addRule('adLink', {
  filter: (node) => node.nodeName === 'A' && /^KonaLink/.test(node.getAttribute('id') || ''),
  replacement: (content) => content,
});

const CROSS_POST =
  /^(?:(?:Source|Published at|Reproduced from)\s*:\s*)?(?:\[[^\]]*\]\()?(https?:\/\/(?:www\.)?bhutaneseliterature\.com[^)\s]*)\)?\s*$/i;

/**
 * Many posts end with "Source: <bhutaneseliterature.com link>". Pull that into the
 * alsoPublishedAt field so the site shows it consistently.
 */
function extractAlsoPublishedAt(markdown) {
  const blocks = markdown.split(/\n{2,}/);
  const m = blocks.at(-1).match(CROSS_POST);
  if (!m) return { body: markdown, alsoPublishedAt: null };
  return { body: blocks.slice(0, -1).join('\n\n'), alsoPublishedAt: m[1] };
}

// Move images out of the verse lines into their own paragraph before the stanza,
// so the poem text itself stays clean for editing in the CMS.
function liftImages(markdown) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => {
      const imgs = block.match(/!\[\]\([^)]+\)/g);
      if (!imgs) return block;
      const text = block
        .replace(/!\[\]\([^)]+\)/g, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{2,}/g, '\n')
        .trim();
      return [imgs.join('\n'), text].filter(Boolean).join('\n\n');
    })
    .join('\n\n');
}

function htmlToMarkdown(html) {
  return liftImages(turndown.turndown(html))
    .replace(/[ \t]+\n/g, '\n') // trailing spaces would also force <br>
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function commentToText(html) {
  const doc = domino.createDocument(
    `<div>${html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p>/gi, '\n\n')}</div>`,
  );
  return doc.querySelector('div').textContent.trim();
}

function yaml(value) {
  return JSON.stringify(value); // JSON strings are valid YAML scalars
}

async function download(url, local) {
  const dest = path.join(ROOT, 'public', local);
  await mkdir(path.dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  ! could not download ${url} (${res.status})`);
    return;
  }
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const [{ posts }, { posts: pages }, { comments }] = await Promise.all([
    getJson(`${API}/posts?number=100&type=post&order=ASC`),
    getJson(`${API}/posts?number=100&type=page`),
    getJson(`${API}/comments?number=100&order=ASC`),
  ]);
  console.log(`Fetched ${posts.length} posts, ${pages.length} pages, ${comments.length} comments`);

  const writingsDir = path.join(ROOT, 'src/content/writings');
  const pagesDir = path.join(ROOT, 'src/content/pages');
  await mkdir(writingsDir, { recursive: true });
  await mkdir(pagesDir, { recursive: true });

  const idByWpId = new Map();

  for (const post of posts) {
    const url = new URL(post.URL);
    const m = url.pathname.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)\/$/);
    if (!m) throw new Error(`Unexpected permalink ${post.URL}`);
    const [, y, mo, d, rawSlug] = m;
    const slug = decodeURIComponent(rawSlug);
    const id = `${y}-${mo}-${d}-${slug}`;
    idByWpId.set(post.ID, id);

    const title = decodeEntities(post.title).replace(/\s+/g, ' ').trim();
    const categories = Object.keys(post.categories);
    const { body, alsoPublishedAt } = extractAlsoPublishedAt(htmlToMarkdown(post.content));
    const language = DEVANAGARI.test(title + body) ? 'ne' : 'en';
    const tags = Object.keys(post.tags);

    const frontmatter = [
      '---',
      `title: ${yaml(title)}`,
      `date: ${post.date.replace('+00:00', 'Z')}`,
      `category: ${categories.includes('Stories') ? 'story' : 'poem'}`,
      `language: ${language}`,
      tags.length ? `tags: ${yaml(tags)}` : null,
      alsoPublishedAt ? `alsoPublishedAt: ${yaml(alsoPublishedAt)}` : null,
      `legacyUrl: ${yaml(post.URL)}`,
      '---',
    ]
      .filter(Boolean)
      .join('\n');

    await writeFile(path.join(writingsDir, `${id}.md`), `${frontmatter}\n\n${body}\n`);
  }

  const about = pages.find((p) => p.slug === 'about');
  if (about) {
    idByWpId.set(about.ID, 'about');
    await writeFile(
      path.join(pagesDir, 'about.md'),
      `---\ntitle: ${yaml(decodeEntities(about.title))}\n---\n\n${htmlToMarkdown(about.content)}\n`,
    );
  }

  const legacyComments = comments
    .filter((c) => c.status === 'approved' && c.type === 'comment' && idByWpId.has(c.post.ID))
    .map((c) => ({
      legacy_id: c.ID,
      parent_legacy_id: c.parent ? c.parent.ID : null,
      post_id: idByWpId.get(c.post.ID),
      author_name: decodeEntities(c.author.name).trim() || 'Anonymous',
      author_url: /^https?:\/\/[^/]+\.[a-z]{2,}/i.test(c.author.URL) ? c.author.URL : null,
      body: commentToText(c.content),
      created_at: c.date,
    }));
  await mkdir(path.join(ROOT, 'db'), { recursive: true });
  await writeFile(path.join(ROOT, 'db/legacy-comments.json'), JSON.stringify(legacyComments, null, 2) + '\n');
  console.log(`Kept ${legacyComments.length} comments`);

  console.log(`Downloading ${images.size} images…`);
  await Promise.all([...images].map(([url, local]) => download(url, local)));
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
