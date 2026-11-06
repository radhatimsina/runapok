// @ts-check
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import remarkBreaks from 'remark-breaks';

// Set SITE_URL in Vercel if you add a custom domain later.
const site = process.env.SITE_URL ?? 'https://runapok.vercel.app';

/**
 * Old WordPress addresses that are not individual posts. Post addresses
 * (/YYYY/MM/DD/slug/) are the same on the new site, so they need nothing.
 */
function wordpressRedirects() {
  /** @type {Record<string, string>} */
  const redirects = {
    '/feed': '/rss.xml',
    '/comments/feed': '/rss.xml',
    '/category/uncategorized': '/',
    '/category/poems/feed': '/rss.xml',
    '/category/stories/feed': '/rss.xml',
    '/author/runapok': '/about/',
  };
  const files = readdirSync('./src/content/writings').filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const m = file.match(/^(\d{4})-(\d{2})-(\d{2})-/);
    if (!m) continue;
    const [, y, mo, d] = m;
    // Date archives (/2016/, /2016/06/, /2016/06/18/) -> that year on the home page
    for (const path of [`/${y}`, `/${y}/${mo}`, `/${y}/${mo}/${d}`]) redirects[path] = `/#year-${y}`;
  }
  return redirects;
}

/**
 * The Vercel adapter matches redirects only without a trailing slash ("^/2016/06$"),
 * but WordPress links end in "/". Let those redirect routes match either form.
 * @type {import('astro').AstroIntegration}
 */
const redirectsWithTrailingSlash = {
  name: 'redirects-with-trailing-slash',
  hooks: {
    'astro:build:done': () => {
      const file = new URL('./.vercel/output/config.json', import.meta.url);
      const config = JSON.parse(readFileSync(file, 'utf8'));
      for (const route of config.routes) {
        if ((route.status === 301 || route.status === 308) && /^\^\/[^(]*[^/]\$$/.test(route.src)) {
          route.src = route.src.replace(/\$$/, '/?$');
        }
      }
      writeFileSync(file, JSON.stringify(config, null, 2));
    },
  },
};

export default defineConfig({
  site,
  trailingSlash: 'always',
  output: 'static', // pages are pre-built; /api/* routes opt into running on demand
  adapter: vercel(),
  redirects: wordpressRedirects(),
  integrations: [sitemap({ filter: (page) => !page.includes('/admin/') }), redirectsWithTrailingSlash],
  markdown: {
    // Every line break typed in a poem is kept as a line break.
    remarkPlugins: [remarkBreaks],
  },
});
