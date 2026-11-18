import { json } from '@sveltejs/kit';
import { deleteHabit, getHabit, setHabitArchived, todayKey, updateHabit } from '$lib/server/db';
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
  if (typeof body !== 'object' || body === null) {
    return json({ error: 'Request body must be a JSON object.' }, { status: 400 });
  }

  if ('archived' in body) {
    if (typeof body.archived !== 'boolean') {
      return json({ error: 'Archived status must be true or false.' }, { status: 400 });
    }
    setHabitArchived(params.id, body.archived);
    return json({ success: true, archived: body.archived });
  }

  if (!('name' in body) || !('description' in body)) {
    return json({ error: 'Name and description are required.' }, { status: 400 });
  }
  if (typeof body.name !== 'string' || typeof body.description !== 'string') {
    return json({ error: 'Name and description must be strings.' }, { status: 400 });
  }
  const name = body.name.trim();
  const description = body.description.trim();
  if (!name) return json({ error: 'Habit name cannot be empty.' }, { status: 400 });
  if (name.length > 80) return json({ error: 'Habit name must be 80 characters or fewer.' }, { status: 400 });
  if (description.length > 240) return json({ error: 'Description must be 240 characters or fewer.' }, { status: 400 });

  const updated = updateHabit(params.id, { name, description });
  return json({ success: true, habit: updated });
};

export const DELETE: RequestHandler = ({ params }) => {
  const habit = getHabit(params.id, todayKey());
  if (!habit) return json({ error: 'Habit not found.' }, { status: 404 });
  deleteHabit(params.id);
  return json({ success: true });
};
