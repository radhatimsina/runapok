// Writing desk: create pictures with AI (counts against the monthly budget).
import type { APIRoute } from 'astro';
import { HttpError, budgetStatus, createPictures, json, requireAuthor } from '../../../lib/picture-tools';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    await requireAuthor(request);
    const input = (await request.json().catch(() => ({}))) as { prompt?: string; count?: number };
    const prompt = String(input.prompt ?? '').trim().slice(0, 600);
    if (prompt.length < 5) return json({ error: 'Describe the picture you want first.' }, 400);
    const count = Math.min(2, Math.max(1, Number(input.count) || 2));
    const images = await createPictures(prompt, count);
    const budget = await budgetStatus();
    return json({ images, budget: { remainingCents: budget.remainingCents, limitCents: budget.limitCents } });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error('Create picture failed', err);
    const message = String((err as Error)?.message ?? '');
    return json(
      {
        error: /credit|budget|insufficient|quota/i.test(message)
          ? 'AI pictures are unavailable: the AI Gateway has no credit left.'
          : /auth|oidc|token|401|403/i.test(message)
            ? 'AI pictures are not set up yet (AI Gateway is not enabled for this project).'
            : 'The picture could not be created. Please try again.',
      },
      502,
    );
  }
};
