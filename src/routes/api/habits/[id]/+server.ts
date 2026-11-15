import { json } from '@sveltejs/kit';
import { deleteHabit, getHabit, todayKey } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
  const habit = getHabit(params.id, todayKey());
  return habit ? json({ habit }) : json({ error: 'Habit not found.' }, { status: 404 });
};

export const DELETE: RequestHandler = ({ params }) => {
  const habit = getHabit(params.id, todayKey());
  if (!habit) return json({ error: 'Habit not found.' }, { status: 404 });
  deleteHabit(params.id);
  return json({ success: true });
};
