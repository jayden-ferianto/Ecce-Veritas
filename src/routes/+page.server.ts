import { listHabits, todayKey } from '$lib/server/db';

export function load() {
  const today = todayKey();
  return { today, habits: listHabits(today) };
}
