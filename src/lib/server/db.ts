import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Habit, HabitDay, HabitType } from '$lib/types';

const databasePath = resolve(process.env.DATABASE_PATH ?? './data/habits.db');
mkdirSync(dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL CHECK (type IN ('daily', 'count')),
    target INTEGER NOT NULL DEFAULT 1 CHECK (target >= 1),
    color TEXT NOT NULL DEFAULT 'sage',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS entries (
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0),
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    PRIMARY KEY (habit_id, day)
  );
`);

export function listHabits(day: string): Habit[] {
  return db
    .prepare(
      `SELECT h.*, COALESCE(e.value, 0) AS value, COALESCE(e.completed, 0) AS completed
       FROM habits h
       LEFT JOIN entries e ON e.habit_id = h.id AND e.day = ?
       ORDER BY h.created_at ASC`
    )
    .all(day)
    .map((row) => ({ ...row, completed: Boolean(row.completed) }) as Habit);
}

export function createHabit(input: {
  name: string;
  description: string;
  type: HabitType;
  target: number;
  color: string;
}): Habit {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO habits (id, name, description, type, target, color)
     VALUES (@id, @name, @description, @type, @target, @color)`
  ).run({ ...input, id });
  const habit = getHabit(id, todayKey());
  if (!habit) throw new Error('Created habit could not be loaded from the database.');
  return habit;
}

export function getHabit(id: string, day: string): Habit | undefined {
  const row = db
    .prepare(
      `SELECT h.*, COALESCE(e.value, 0) AS value, COALESCE(e.completed, 0) AS completed
       FROM habits h
       LEFT JOIN entries e ON e.habit_id = h.id AND e.day = ?
       WHERE h.id = ?`
    )
    .get(day, id) as (Omit<Habit, 'completed'> & { completed: number }) | undefined;
  return row ? { ...row, completed: Boolean(row.completed) } : undefined;
}

export function saveEntry(
  habit: Habit,
  day: string,
  value: number,
  completed: boolean
): HabitDay {
  db.prepare(
    `INSERT INTO entries (habit_id, day, value, completed)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (habit_id, day) DO UPDATE SET value = excluded.value, completed = excluded.completed`
  ).run(habit.id, day, value, completed ? 1 : 0);
  return { date: day, value, completed };
}

export function getHabitHistory(id: string, start: string, end: string): HabitDay[] {
  return db
    .prepare(
      `SELECT day AS date, value, completed
       FROM entries
       WHERE habit_id = ? AND day BETWEEN ? AND ?
       ORDER BY day ASC`
    )
    .all(id, start, end)
    .map((row) => ({
      ...(row as { date: string; value: number; completed: number }),
      completed: Boolean((row as { completed: number }).completed)
    }));
}

export function deleteHabit(id: string): void {
  db.prepare('DELETE FROM habits WHERE id = ?').run(id);
}

export function todayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
