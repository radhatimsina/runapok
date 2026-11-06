import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getWritings, writingUrl, excerpt, SITE_TITLE, AUTHOR } from '../lib/writings';

export async function GET(context: APIContext) {
  const writings = await getWritings();
  return rss({
    title: SITE_TITLE,
    description: `Poems and stories by ${AUTHOR}`,
    site: context.site!,
    items: writings.map((w) => ({
      title: w.data.title,
      pubDate: w.data.date,
      link: writingUrl(w.id),
      description: excerpt(w.body, 4).join('\n'),
      categories: [w.data.category, w.data.language === 'ne' ? 'Nepali' : 'English'],
      author: AUTHOR,
    })),
    customData: '<language>en</language>',
  });
}
