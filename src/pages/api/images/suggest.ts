// Writing desk: suggest pictures for a poem (free photo search + an AI picture idea).
import type { APIRoute } from 'astro';
import { HttpError, budgetStatus, json, pictureIdeas, requireAuthor, searchFree } from '../../../lib/picture-tools';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    await requireAuthor(request);
    const input = (await request.json().catch(() => ({}))) as { title?: string; body?: string; query?: string };
    const title = String(input.title ?? '').slice(0, 200);
    const body = String(input.body ?? '').slice(0, 20000);
    const query = String(input.query ?? '').trim().slice(0, 100);

    // A typed search skips the AI step; otherwise read the poem for ideas first.
    const ideas = query ? { queries: [query], prompt: '', usedAi: false } : await pictureIdeas(title, body);
    const { results, status } = ideas.queries.length ? await searchFree(ideas.queries) : { results: [], status: {} };
    const budget = await budgetStatus();
    return json({
      queries: ideas.queries,
      prompt: ideas.prompt,
      usedAi: ideas.usedAi,
      results,
      sources: status,
      budget: { remainingCents: budget.remainingCents, limitCents: budget.limitCents, available: budget.ok },
    });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error('Suggest pictures failed', err);
    return json({ error: 'Picture suggestions are unavailable right now.' }, 500);
  }
};
