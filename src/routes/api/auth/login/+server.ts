import { json } from '@sveltejs/kit';
import { createSessionToken, isAuthConfigured, passwordMatches, SESSION_COOKIE, SESSION_TTL_SECONDS, sessionCookieIsSecure } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  if (!isAuthConfigured()) {
    return json({ error: 'Set APP_PASSWORD and APP_SECRET in the server environment first.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('password' in body) ||
    typeof body.password !== 'string' ||
    body.password.length > 1024
  ) {
    return json({ error: 'Enter a valid password.' }, { status: 400 });
  }

  if (!passwordMatches(body.password)) {
    return json({ error: 'Incorrect password.' }, { status: 401 });
  }

  cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: sessionCookieIsSecure(),
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS
  });
  return json({ success: true });
};
