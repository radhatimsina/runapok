// Writing desk: save the chosen picture (found, AI-made or uploaded) to the site.
import type { APIRoute } from 'astro';
import {
  HttpError,
  commitPicture,
  download,
  fileNameFor,
  json,
  requireAuthor,
  toThumbnail,
  verifySignature,
  type Credit,
} from '../../../lib/picture-tools';

export const prerender = false;

type Input = {
  title?: string;
  kind?: 'found' | 'ai' | 'upload';
  url?: string;
  sig?: string;
  data?: string; // base64 image for "ai" and "upload"
  credit?: Credit;
};

const clean = (s: unknown, max = 200) => (typeof s === 'string' ? s.trim().slice(0, max) : undefined);
const cleanUrl = (s: unknown) => {
  const v = clean(s, 500);
  return v && /^https:\/\//i.test(v) ? v : undefined;
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const token = await requireAuthor(request);
    const input = (await request.json().catch(() => ({}))) as Input;
    const title = clean(input.title, 120) || 'picture';

    let source: Buffer;
    let credit: Credit | null = null;
    if (input.kind === 'found') {
      if (!input.url || !input.sig || !verifySignature(input.url, input.sig)) {
        throw new HttpError(400, 'That picture link is not valid. Search again and pick it from the results.');
      }
      source = await download(input.url);
      credit = {
        credit: clean(input.credit?.credit) || 'Unknown',
        creditUrl: cleanUrl(input.credit?.creditUrl),
        source: clean(input.credit?.source, 60),
        license: clean(input.credit?.license, 60),
        licenseUrl: cleanUrl(input.credit?.licenseUrl),
        pageUrl: cleanUrl(input.credit?.pageUrl),
      };
    } else if (input.kind === 'ai' || input.kind === 'upload') {
      if (!input.data || input.data.length > 6_000_000) throw new HttpError(400, 'The picture is missing or too large.');
      source = Buffer.from(input.data, 'base64');
      if (input.kind === 'ai') credit = { credit: 'AI-generated illustration', source: 'AI' };
    } else {
      throw new HttpError(400, 'Unknown picture type.');
    }

    let jpeg: Buffer;
    try {
      jpeg = await toThumbnail(source);
    } catch {
      throw new HttpError(422, 'That file is not a picture this site can use. Try a JPG or PNG.');
    }
    const path = await commitPicture(token, fileNameFor(title), jpeg, credit, title);
    return json({ path, credit, preview: `data:image/jpeg;base64,${jpeg.toString('base64')}` });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error('Save picture failed', err);
    return json({ error: 'The picture could not be saved. Please try again.' }, 500);
  }
};
