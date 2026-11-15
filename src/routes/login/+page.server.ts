import { redirect } from '@sveltejs/kit';
import { isAuthConfigured, isValidSession, SESSION_COOKIE } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies }) => {
  if (isValidSession(cookies.get(SESSION_COOKIE))) redirect(303, '/');
  return { configured: isAuthConfigured() };
};
