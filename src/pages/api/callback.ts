// Finishes the GitHub login for Decap CMS and hands the token back to the /admin window.
import type { APIRoute } from 'astro';

export const prerender = false;

function page(status: 'success' | 'error', payload: unknown, origin: string) {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  // Only ever deliver the token to this site's own /admin window.
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Signing in…</title></head><body>
<p>${status === 'success' ? 'Signed in. You can close this window.' : 'Sign-in failed. Close this window and try again.'}</p>
<script>
(function () {
  var origin = ${JSON.stringify(origin)};
  var message = ${JSON.stringify(message)};
  if (!window.opener) return;
  window.addEventListener('message', function (e) {
    if (e.origin !== origin || e.data !== 'authorizing:github') return;
    window.opener.postMessage(message, origin);
  });
  window.opener.postMessage('authorizing:github', origin);
})();
</script></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = cookies.get('decap_oauth_state')?.value;
  cookies.delete('decap_oauth_state', { path: '/api/' });

  if (!code || !state || state !== expected) {
    return page('error', { message: 'Login expired or was started elsewhere. Please try again.' }, url.origin);
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: new URL('/api/callback/', url.origin).toString(),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!data.access_token) {
    return page('error', { message: data.error_description ?? 'GitHub did not return a token.' }, url.origin);
  }
  return page('success', { token: data.access_token, provider: 'github' }, url.origin);
};
