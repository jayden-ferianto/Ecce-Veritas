import { json } from '@sveltejs/kit';
import { reorderHabits } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('scope' in body) ||
    (body.scope !== 'active' && body.scope !== 'archived' && body.scope !== 'all') ||
    !('habitIds' in body) ||
    !Array.isArray(body.habitIds) ||
    !body.habitIds.every((id) => typeof id === 'string')
  ) {
    return json({ error: 'Provide a valid habit list and reorder scope.' }, { status: 400 });
  }

  const habitIds = reorderHabits(body.scope, body.habitIds);
  if (!habitIds) {
    return json({ error: 'Habit order must include each habit in the selected list exactly once.' }, { status: 400 });
  }
  return json({ habitIds });
};
