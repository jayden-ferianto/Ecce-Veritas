import { json } from '@sveltejs/kit';
import { SESSION_COOKIE, sessionCookieIsSecure } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ cookies }) => {
  cookies.delete(SESSION_COOKIE, {
    httpOnly: true,
    secure: sessionCookieIsSecure(),
    sameSite: 'strict',
    path: '/'
  });
  return json({ success: true });
};
