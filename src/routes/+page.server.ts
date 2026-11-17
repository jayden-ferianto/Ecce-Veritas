import { error } from '@sveltejs/kit';
import {
  getJournalEntries,
  getMonthlyHabitStats,
  listArchivedHabits,
  listHabits,
  todayKey
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
  const today = todayKey();
  const todayMonth = today.slice(0, 7);
  const requestedMonth = url.searchParams.get('month') ?? todayMonth;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) || requestedMonth > todayMonth) {
    error(400, 'Choose a valid month up to the current month.');
  }

  const requestedView = url.searchParams.get('view');
  const view = requestedView === 'journal' ||
    requestedView === 'progress' ||
    requestedView === 'archive'
    ? requestedView
    : 'today';
  const monthlyStats = getMonthlyHabitStats(requestedMonth, today);
  const earliestMonth = monthlyStats.reduce(
    (earliest, habit) => habit.createdAt.slice(0, 7) < earliest ? habit.createdAt.slice(0, 7) : earliest,
    todayMonth
  );

  return {
    today,
    view,
    month: requestedMonth,
    earliestMonth,
    habits: listHabits(today),
    archivedHabits: view === 'archive' ? listArchivedHabits(today) : [],
    monthlyStats,
    journalEntries: view === 'journal' ? getJournalEntries(requestedMonth, today) : []
  };
};
