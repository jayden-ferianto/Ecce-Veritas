import { json, redirect, type Handle } from '@sveltejs/kit';
import { isAuthConfigured, isValidSession, SESSION_COOKIE } from '$lib/server/auth';

const publicPaths = new Set(['/login', '/api/auth/login', '/api/auth/logout']);
const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;
  const isPublicPath = publicPaths.has(pathname);

  if (mutationMethods.has(event.request.method)) {
    const requestOrigin = event.request.headers.get('origin');
    const expectedOrigin = process.env.ORIGIN
      ? new URL(process.env.ORIGIN).origin
      : event.url.origin;
    if (!requestOrigin || requestOrigin !== expectedOrigin) {
      return json({ error: 'Request origin is not allowed.' }, { status: 403 });
    }
  }

  if (!isAuthConfigured() && !isPublicPath) {
    if (pathname.startsWith('/api/')) {
      return json({ error: 'Authentication is not configured on this server.' }, { status: 503 });
    }
    redirect(303, '/login');
  }

  if (!isPublicPath && !isValidSession(event.cookies.get(SESSION_COOKIE))) {
    if (pathname.startsWith('/api/')) {
      return json({ error: 'Authentication required.' }, { status: 401 });
    }
    redirect(303, '/login');
  }

  return resolve(event);
};
