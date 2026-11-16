import { json } from '@sveltejs/kit';
import { getHabit, saveEntry } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request }) => {
  const { id, day } = params;
  const parsedDay = new Date(`${day}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    Number.isNaN(parsedDay.getTime()) ||
    parsedDay.toISOString().slice(0, 10) !== day
  ) {
    return json({ error: 'Date must use YYYY-MM-DD format.' }, { status: 400 });
  }
  const habit = getHabit(id, day);
  if (!habit) return json({ error: 'Habit not found.' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const note = body.note;
  if (note !== undefined && (typeof note !== 'string' || note.length > 2000)) {
    return json({ error: 'Notes must be text no longer than 2000 characters.' }, { status: 400 });
  }

  if (habit.type === 'daily') {
    if (typeof body.completed !== 'boolean') {
      return json({ error: 'Daily habits require a completed status.' }, { status: 400 });
    }
    return json({ entry: saveEntry(habit, day, body.completed ? 1 : 0, body.completed, note) });
  }

  if (!Number.isInteger(body.value) || Number(body.value) < 0 || Number(body.value) > 999999) {
    return json({ error: 'Progress must be a whole number between 0 and 999999.' }, { status: 400 });
  }
  const value = Number(body.value);
  return json({ entry: saveEntry(habit, day, value, value >= habit.target, note) });
};
