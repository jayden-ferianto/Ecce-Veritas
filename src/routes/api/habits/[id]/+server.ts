import { json } from '@sveltejs/kit';
import { deleteHabit, getHabit, setHabitArchived, todayKey } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
  const habit = getHabit(params.id, todayKey());
  return habit ? json({ habit }) : json({ error: 'Habit not found.' }, { status: 404 });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const habit = getHabit(params.id, todayKey());
  if (!habit) return json({ error: 'Habit not found.' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('archived' in body) ||
    typeof body.archived !== 'boolean'
  ) {
    return json({ error: 'Archived status must be true or false.' }, { status: 400 });
  }

  setHabitArchived(params.id, body.archived);
  return json({ success: true, archived: body.archived });
};

export const DELETE: RequestHandler = ({ params }) => {
  const habit = getHabit(params.id, todayKey());
  if (!habit) return json({ error: 'Habit not found.' }, { status: 404 });
  deleteHabit(params.id);
  return json({ success: true });
};
