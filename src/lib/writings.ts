import { getCollection, type CollectionEntry } from 'astro:content';

export type Writing = CollectionEntry<'writings'>;

export const SITE_TITLE = 'Live and Let Live';
export const SITE_TAGLINE = 'Storm and problem do not last long, but, may cause damage.';
export const AUTHOR = 'Rup Pokharel';

export const LANGUAGES = {
  en: { label: 'English', native: 'English', path: 'english' },
  ne: { label: 'Nepali', native: 'नेपाली', path: 'nepali' },
} as const;

export const CATEGORIES = {
  poem: { label: 'Poem', plural: 'Poems', path: 'poems' },
  story: { label: 'Story', plural: 'Stories', path: 'stories' },
} as const;

/** All published writings, newest first. */
export async function getWritings(): Promise<Writing[]> {
  const all = await getCollection('writings', ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** Splits an id like "2016-06-18-colors-in-happiness" into URL parts. */
export function urlParts(id: string) {
  const m = id.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
  if (!m) throw new Error(`Writing file name must start with YYYY-MM-DD-: "${id}"`);
  const [, year, month, day, slug] = m;
  return { year, month, day, slug };
}

/** Same permalink shape as the old WordPress site: /YYYY/MM/DD/slug/ */
export function writingUrl(id: string) {
  const { year, month, day, slug } = urlParts(id);
  return `/${year}/${month}/${day}/${encodeURIComponent(slug)}/`;
}

export function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** The first few lines of a piece, for previews and share cards. */
export function excerpt(body: string | undefined, lines = 3) {
  return (body ?? '')
    .split('\n')
    .map((l) => l.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/[\\*_`#>]/g, '').trim())
    .filter(Boolean)
    .slice(0, lines);
}

/** First image in a piece, used for its share card. */
export function firstImage(body: string | undefined) {
  return body?.match(/!\[[^\]]*\]\(([^)\s]+)\)/)?.[1];
}

export function groupByYear(items: Writing[]) {
  const groups = new Map<string, Writing[]>();
  for (const item of items) {
    const year = String(item.data.date.getUTCFullYear());
    groups.set(year, [...(groups.get(year) ?? []), item]);
  }
  return [...groups];
}

/** Card/share thumbnail: the chosen thumbnail, else the first image in the text. */
export function thumbnail(entry: Writing) {
  return entry.data.image || firstImage(entry.body);
}

/** Addresses already used by the site; a page can't use these names. */
const RESERVED_PAGE_NAMES = new Set([
  'admin', 'api', 'category', 'language', 'images', 'feed', 'comments', 'author',
  'tag', 'page', 'wp-content', 'rss.xml', '404', '_astro', 'favicon.ico',
]);

/** Standalone pages written by the author (About, Books, Contact, ...). */
export async function getPages() {
  const pages = await getCollection('pages', ({ data }) => import.meta.env.DEV || !data.draft);
  for (const page of pages) {
    if (RESERVED_PAGE_NAMES.has(page.id) || /^\d{4}$/.test(page.id)) {
      throw new Error(`The page "${page.id}" uses an address the site already needs. Rename src/content/pages/${page.id}.md.`);
    }
  }
  return pages;
}

export function pageUrl(id: string) {
  return `/${encodeURIComponent(id)}/`;
}

/** Pages marked "Show in the top menu", in menu order. */
export async function getMenuPages() {
  return (await getPages())
    .filter((p) => p.data.showInMenu)
    .sort((a, b) => a.data.menuOrder - b.data.menuOrder || a.data.title.localeCompare(b.data.title));
}
