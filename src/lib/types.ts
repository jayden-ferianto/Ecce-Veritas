export type HabitType = 'daily' | 'count';

export interface Habit {
  id: string;
  name: string;
  description: string;
  type: HabitType;
  target: number;
  color: string;
  created_at: string;
  value: number;
  completed: boolean;
  archived: boolean;
}

export interface HabitDay {
  date: string;
  value: number;
  completed: boolean;
  note: string;
}

export interface MonthlyHabitStat {
  id: string;
  name: string;
  color: string;
  type: HabitType;
  target: number;
  archived: boolean;
  createdAt: string;
  successfulDays: number;
  trackedDays: number;
  completionRate: number;
  totalCount: number;
}

export interface JournalEntry {
  habitId: string;
  habitName: string;
  habitColor: string;
  date: string;
  value: number;
  completed: boolean;
  note: string;
}
