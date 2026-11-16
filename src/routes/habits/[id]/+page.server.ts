import { error } from '@sveltejs/kit';
import { getHabit, getHabitHistory, todayKey } from '$lib/server/db';
import type { HabitDay } from '$lib/types';
import type { PageServerLoad } from './$types';

function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function shiftMonth(month: string, offset: number): string {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export const load: PageServerLoad = ({ params, url }) => {
  const today = todayKey();
  const habit = getHabit(params.id, today);
  if (!habit) error(404, 'Habit not found');

  const todayMonth = today.slice(0, 7);
  const firstMonth = habit.created_at.slice(0, 7);
  const month = url.searchParams.get('month') ?? todayMonth;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month < firstMonth || month > todayMonth) {
    error(400, "Month is outside this habit's history.");
  }

  const recentStart = shiftDay(today, -29);
  const recentHistory = getHabitHistory(habit.id, recentStart, today);
  const recentByDate = new Map(recentHistory.map((entry) => [entry.date, entry]));
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = shiftDay(today, index - 29);
    const entry = recentByDate.get(date);
    return { date, value: entry?.value ?? 0, completed: entry?.completed ?? false, note: entry?.note ?? '' };
  });
  const monthStart = `${month}-01`;
  const monthEnd = month === todayMonth
    ? today
    : shiftDay(`${shiftMonth(month, 1)}-01`, -1);
  const calendarOffset = new Date(`${monthStart}T12:00:00Z`).getUTCDay();
  const monthHistory = getHabitHistory(habit.id, monthStart, monthEnd);
  const monthByDate = new Map(monthHistory.map((entry) => [entry.date, entry]));
  const historyDays: HabitDay[] = [];
  for (let date = monthStart; date <= monthEnd; date = shiftDay(date, 1)) {
    const entry = monthByDate.get(date);
    historyDays.push({
      date,
      value: entry?.value ?? 0,
      completed: entry?.completed ?? false,
      note: entry?.note ?? ''
    });
  }

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
  return {
    habit,
    today,
    days,
    successfulDays,
    streak,
    historyDays,
    calendarOffset,
    month,
    previousMonth: month > firstMonth ? shiftMonth(month, -1) : null,
    nextMonth: month < todayMonth ? shiftMonth(month, 1) : null
  };
};
