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
}

export interface HabitDay {
  date: string;
  value: number;
  completed: boolean;
  note: string;
}
