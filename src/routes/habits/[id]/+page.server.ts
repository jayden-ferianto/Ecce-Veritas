import { error } from '@sveltejs/kit';
import { getHabit, getHabitHistory, todayKey } from '$lib/server/db';
import type { PageServerLoad } from './$types';

function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export const load: PageServerLoad = ({ params }) => {
  const today = todayKey();
  const habit = getHabit(params.id, today);
  if (!habit) error(404, 'Habit not found');
  const start = shiftDay(today, -29);
  const history = getHabitHistory(habit.id, start, today);
  const byDate = new Map(history.map((entry) => [entry.date, entry]));
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = shiftDay(today, index - 29);
    const entry = byDate.get(date);
    return { date, value: entry?.value ?? 0, completed: entry?.completed ?? false };
  });
  const successfulDays = days.filter((day) =>
    habit.type === 'daily' ? day.completed : day.value >= habit.target
  ).length;
  let streak = 0;
  const todayIsSuccessful = habit.type === 'daily'
    ? days[days.length - 1].completed
    : days[days.length - 1].value >= habit.target;
  for (let index = days.length - (todayIsSuccessful ? 1 : 2); index >= 0; index -= 1) {
    const day = days[index];
    if (habit.type === 'daily' ? day.completed : day.value >= habit.target) streak += 1;
    else break;
  }
  return { habit, today, days, successfulDays, streak };
};
