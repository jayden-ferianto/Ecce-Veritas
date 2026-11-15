import { json } from '@sveltejs/kit';
import { createHabit, listHabits, todayKey } from '$lib/server/db';
import type { RequestHandler } from './$types';

const colors = new Set(['sage', 'peach', 'lavender', 'blue']);

export const GET: RequestHandler = () => json({ habits: listHabits(todayKey()) });

export const POST: RequestHandler = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const type = body.type;
  const target = type === 'daily' ? 1 : Number(body.target);
  const color = typeof body.color === 'string' && colors.has(body.color) ? body.color : 'sage';

  if (!name || name.length > 80) {
    return json({ error: 'Habit name is required and must be 80 characters or fewer.' }, { status: 400 });
  }
  if (description.length > 240) {
    return json({ error: 'Description must be 240 characters or fewer.' }, { status: 400 });
  }
  if (type !== 'daily' && type !== 'count') {
    return json({ error: 'Choose a supported habit type.' }, { status: 400 });
  }
  if (!Number.isInteger(target) || target < 1 || target > 999) {
    return json({ error: 'Daily target must be a whole number between 1 and 999.' }, { status: 400 });
  }

  const habit = createHabit({ name, description, type, target, color });
  return json({ habit }, { status: 201 });
};
