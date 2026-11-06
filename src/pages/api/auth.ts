// Starts the GitHub login for Decap CMS (/admin). See README → "Publishing new poems".
import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';

export const prerender = false;

export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return new Response('GITHUB_CLIENT_ID is not configured', { status: 500 });

  const state = randomBytes(16).toString('hex');
  cookies.set('decap_oauth_state', state, {
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    path: '/api/',
    maxAge: 600,
  });

  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', new URL('/api/callback/', url.origin).toString());
  authorize.searchParams.set('scope', process.env.GITHUB_OAUTH_SCOPE ?? 'repo,user');
  authorize.searchParams.set('state', state);
  return redirect(authorize.toString(), 302);
};
