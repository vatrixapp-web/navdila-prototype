const SESSION_COOKIE = 'navdila_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const CHECKLIST_TABLE = 'axaius_deliverables';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (env.REQUIRE_AUTH === 'false') {
            return env.ASSETS.fetch(request);
        }

        if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
            return textResponse('Authentication is not configured.', 503);
        }

        if (url.pathname === '/login' || url.pathname === '/login/') {
            return new Response(loginPage(env), {
                headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
            });
        }

        if (url.pathname === '/auth/session' && request.method === 'POST') {
            return createSession(request, env);
        }

        if (url.pathname === '/auth/logout' && request.method === 'POST') {
            return clearSession(request, env);
        }

        if ((url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/')) &&
            request.method !== 'GET' && request.method !== 'HEAD') {
            if (!isSameOrigin(request)) return jsonResponse({ error: 'Request origin is not allowed.' }, 403);
        }

        let authenticated;
        try {
            authenticated = await authenticateRequest(request, env);
        } catch (error) {
            console.error('Authentication service request failed:', error);
            return textResponse('Sign-in is temporarily unavailable. Please try again.', 503);
        }

        if (!authenticated) {
            if (url.pathname.startsWith('/api/')) {
                return jsonResponse({ error: 'Sign-in required.' }, 401);
            }

            const returnTo = `${url.pathname}${url.search}`;
            const loginUrl = new URL('/login', url.origin);
            loginUrl.searchParams.set('next', returnTo);
            const headers = new Headers({ Location: loginUrl.toString(), 'Cache-Control': 'no-store' });
            if (request.headers.has('Cookie')) headers.append('Set-Cookie', expiredSessionCookie());
            return new Response(null, { status: 303, headers });
        }

        if (url.pathname === `/api/${CHECKLIST_TABLE}`) {
            return proxyChecklistRequest(request, env, authenticated);
        }

        if (url.pathname === '/axaius/config.js') {
            return new Response('window.AXAIUS_USE_PROTECTED_API = true;', {
                headers: {
                    'Content-Type': 'application/javascript; charset=utf-8',
                    'Cache-Control': 'private, no-store'
                }
            });
        }

        const assetResponse = await env.ASSETS.fetch(request);
        if (!assetResponse.headers.get('Content-Type')?.includes('text/html')) {
            return assetResponse;
        }

        const html = await assetResponse.text();
        const securedHtml = html.replace('</body>', `${signOutControl()}</body>`);
        const headers = new Headers(assetResponse.headers);
        headers.set('Cache-Control', 'private, no-store');
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        if (authenticated.setCookie) headers.append('Set-Cookie', authenticated.setCookie);

        return new Response(securedHtml, {
            status: assetResponse.status,
            statusText: assetResponse.statusText,
            headers
        });
    }
};

async function createSession(request, env) {
    if (!isSameOrigin(request)) return jsonResponse({ error: 'Request origin is not allowed.' }, 403);

    const accessToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: 'Invalid sign-in session.' }, 400);
    }

    if (!accessToken || typeof body.refresh_token !== 'string') {
        return jsonResponse({ error: 'Invalid sign-in session.' }, 400);
    }

    try {
        const userResponse = await supabaseAuthRequest(env, '/auth/v1/user', accessToken);
        if (!userResponse.ok) return jsonResponse({ error: 'The sign-in session could not be verified.' }, 401);
        const user = await userResponse.json();
        const refreshedResponse = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: {
                apikey: env.SUPABASE_PUBLISHABLE_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh_token: body.refresh_token })
        });
        if (refreshedResponse.status === 400 || refreshedResponse.status === 401) {
            return jsonResponse({ error: 'The sign-in session could not be verified.' }, 401);
        }
        if (!refreshedResponse.ok) {
            throw new Error(`Supabase token refresh returned ${refreshedResponse.status}.`);
        }
        const refreshedSession = await refreshedResponse.json();
        if (!refreshedSession.access_token || !refreshedSession.refresh_token ||
            refreshedSession.user?.id !== user.id) {
            return jsonResponse({ error: 'The sign-in session could not be verified.' }, 401);
        }

        const cookie = sessionCookie(refreshedSession);
        return new Response(null, {
            status: 204,
            headers: { 'Cache-Control': 'no-store', 'Set-Cookie': cookie }
        });
    } catch (error) {
        console.error('Unable to verify sign-in session:', error);
        return jsonResponse({ error: 'Sign-in is temporarily unavailable.' }, 503);
    }
}

async function clearSession(request, env) {
    if (!isSameOrigin(request)) return jsonResponse({ error: 'Request origin is not allowed.' }, 403);

    const session = readSessionCookie(request);
    if (session?.access_token) {
        try {
            await supabaseAuthRequest(env, '/auth/v1/logout', session.access_token, { method: 'POST' });
        } catch (error) {
            console.error('Unable to revoke sign-out session:', error);
        }
    }

    return new Response(null, {
        status: 204,
        headers: { 'Cache-Control': 'no-store', 'Set-Cookie': expiredSessionCookie() }
    });
}

async function authenticateRequest(request, env) {
    const session = readSessionCookie(request);
    if (!session?.access_token) return null;

    const userResponse = await supabaseAuthRequest(env, '/auth/v1/user', session.access_token);
    if (userResponse.ok) return { session, setCookie: null };
    if (userResponse.status !== 401 && userResponse.status !== 403) {
        throw new Error(`Supabase Auth returned ${userResponse.status}.`);
    }
    if (!session.refresh_token) return null;

    const refreshedResponse = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
            apikey: env.SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if (refreshedResponse.status === 400 || refreshedResponse.status === 401) return null;
    if (!refreshedResponse.ok) throw new Error(`Supabase token refresh returned ${refreshedResponse.status}.`);

    const refreshedSession = await refreshedResponse.json();
    if (!refreshedSession.access_token || !refreshedSession.refresh_token) {
        throw new Error('Supabase returned an incomplete refreshed session.');
    }

    return {
        session: {
            access_token: refreshedSession.access_token,
            refresh_token: refreshedSession.refresh_token
        },
        setCookie: sessionCookie(refreshedSession)
    };
}

async function proxyChecklistRequest(request, env, authenticated) {
    if (request.method !== 'GET' && request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed.' }, 405);
    }

    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(`/rest/v1/${CHECKLIST_TABLE}`, env.SUPABASE_URL);
    upstreamUrl.search = incomingUrl.search;

    const headers = new Headers({
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${authenticated.session.access_token}`
    });
    for (const headerName of ['Content-Type', 'Prefer']) {
        const headerValue = request.headers.get(headerName);
        if (headerValue) headers.set(headerName, headerValue);
    }

    const response = await fetch(upstreamUrl, {
        method: request.method,
        headers,
        ...(request.method === 'POST' ? { body: await request.text() } : {})
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Cache-Control', 'private, no-store');
    if (authenticated.setCookie) responseHeaders.append('Set-Cookie', authenticated.setCookie);
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
    });
}

async function supabaseAuthRequest(env, path, accessToken, options = {}) {
    return fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}${path}`, {
        method: options.method || 'GET',
        headers: {
            apikey: env.SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
            ...(options.method === 'POST' ? { 'Content-Type': 'application/json' } : {})
        }
    });
}

function readSessionCookie(request) {
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookie = cookieHeader.split(';').map(value => value.trim())
        .find(value => value.startsWith(`${SESSION_COOKIE}=`));
    if (!cookie) return null;

    try {
        const encoded = cookie.slice(SESSION_COOKIE.length + 1);
        const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
        const session = JSON.parse(atob(padded));
        return typeof session.access_token === 'string' && typeof session.refresh_token === 'string'
            ? session
            : null;
    } catch {
        return null;
    }
}

function sessionCookie(session) {
    const encoded = btoa(JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token
    })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `${SESSION_COOKIE}=${encoded}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

function expiredSessionCookie() {
    return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function isSameOrigin(request) {
    const origin = request.headers.get('Origin');
    return origin === new URL(request.url).origin;
}

function jsonResponse(body, status) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
}

function textResponse(body, status) {
    return new Response(body, {
        status,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
}

function signOutControl() {
    return `
<button id="privateSignOut" type="button" style="position:fixed;right:16px;bottom:16px;z-index:9999;padding:9px 13px;border:1px solid #87938a;border-radius:10px;background:#18231d;color:#f1f5ef;font:600 12px system-ui;cursor:pointer">Sign out</button>
<script>
document.getElementById('privateSignOut').addEventListener('click', async () => {
    const button = document.getElementById('privateSignOut');
    button.disabled = true;
    button.textContent = 'Signing out...';
    try {
        const response = await fetch('/auth/logout', { method: 'POST' });
        if (!response.ok) throw new Error('Sign-out failed.');
        window.location.replace('/login');
    } catch (error) {
        button.disabled = false;
        button.textContent = 'Sign out';
        window.alert(error.message);
    }
});
</script>
`;
}

function loginPage(env) {
    const supabaseUrl = JSON.stringify(env.SUPABASE_URL).replace(/</g, '\\u003c');
    const publishableKey = JSON.stringify(env.SUPABASE_PUBLISHABLE_KEY).replace(/</g, '\\u003c');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Sign in · Navdila &amp; AXAIUS</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:#101714;color:#f1f5ef}
    *{box-sizing:border-box}body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px}
    main{width:min(100%,400px);padding:30px;border:1px solid #2b3931;border-radius:18px;background:#19231e}
    h1{margin:0 0 8px;font-size:23px}p{margin:0 0 24px;color:#9aa99e;font-size:13px;line-height:1.55}
    label{display:block;margin:16px 0 7px;font-size:12px;color:#c7d2ca}
    input{width:100%;padding:11px 12px;border:1px solid #3b4b40;border-radius:9px;background:#101714;color:#fff;font:inherit}
    button{width:100%;margin-top:22px;padding:11px;border:0;border-radius:9px;background:#b8f36b;color:#17220f;font:inherit;font-weight:700;font-size:13px;cursor:pointer}
    button:disabled{opacity:.6;cursor:wait}#message{min-height:20px;margin-top:14px;color:#ffb4a9;font-size:12px}
  </style>
</head>
<body>
  <main>
    <h1>Sign in</h1>
    <p>Use your invited account to access the Navdila and AXAIUS project pages.</p>
    <form id="loginForm">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" autocomplete="username" required>
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <button id="submitButton" type="submit">Continue</button>
      <div id="message" role="status" aria-live="polite"></div>
    </form>
  </main>
  <script>
    const supabaseUrl = ${supabaseUrl};
    const publishableKey = ${publishableKey};
    const form = document.getElementById('loginForm');
    const button = document.getElementById('submitButton');
    const message = document.getElementById('message');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      button.disabled = true;
      message.textContent = 'Signing in...';
      try {
        const authResponse = await fetch(supabaseUrl + '/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.elements.email.value,
            password: form.elements.password.value
          })
        });
        const session = await authResponse.json();
        if (!authResponse.ok) throw new Error(session.msg || session.message || session.error_description || 'Check your email and password.');

        const cookieResponse = await fetch('/auth/session', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + session.access_token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refresh_token: session.refresh_token })
        });
        if (!cookieResponse.ok) {
          const result = await cookieResponse.json();
          throw new Error(result.error || 'Unable to start a secure session.');
        }

        const requestedPath = new URLSearchParams(window.location.search).get('next') || '/';
        const nextUrl = new URL(requestedPath, window.location.origin);
        const nextPath = requestedPath.startsWith('/') &&
          nextUrl.origin === window.location.origin &&
          !nextUrl.pathname.startsWith('/auth/')
          ? nextUrl.pathname + nextUrl.search + nextUrl.hash
          : '/';
        window.location.replace(nextPath);
      } catch (error) {
        message.textContent = error.message || 'Sign-in failed. Please try again.';
        button.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}
