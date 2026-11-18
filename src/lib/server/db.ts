import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Habit, HabitDay, HabitType, JournalEntry, MonthlyHabitStat } from '$lib/types';

const databasePath = resolve(process.env.DATABASE_PATH ?? './data/habits.db');
mkdirSync(dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

interface HabitRow extends Omit<Habit, 'completed' | 'archived'> {
  completed: number;
  archived: number;
}

interface HabitHistoryRow extends Omit<HabitDay, 'completed'> {
  completed: number;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL CHECK (type IN ('daily', 'count')),
    target INTEGER NOT NULL DEFAULT 1 CHECK (target >= 1),
    color TEXT NOT NULL DEFAULT 'sage',
    archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS entries (
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0),
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    note TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (habit_id, day)
  );
`);

const entryColumns = db.pragma('table_info(entries)') as { name: string }[];
if (!entryColumns.some((column) => column.name === 'note')) {
  db.exec("ALTER TABLE entries ADD COLUMN note TEXT NOT NULL DEFAULT ''");
}
const habitColumns = db.pragma('table_info(habits)') as { name: string }[];
if (!habitColumns.some((column) => column.name === 'archived')) {
  db.exec('ALTER TABLE habits ADD COLUMN archived INTEGER NOT NULL DEFAULT 0');
}
if (!habitColumns.some((column) => column.name === 'position')) {
  db.exec('ALTER TABLE habits ADD COLUMN position INTEGER NOT NULL DEFAULT 0');
  db.exec(`
    UPDATE habits
    SET position = (
      SELECT COUNT(*)
      FROM habits AS earlier
      WHERE earlier.created_at < habits.created_at
         OR (earlier.created_at = habits.created_at AND earlier.id < habits.id)
    )
  `);
}

export function listHabits(day: string): Habit[] {
  return db
    .prepare(
      `SELECT h.*, COALESCE(e.value, 0) AS value, COALESCE(e.completed, 0) AS completed
       FROM habits h
       LEFT JOIN entries e ON e.habit_id = h.id AND e.day = ?
       WHERE h.archived = 0
       ORDER BY h.position ASC, h.created_at ASC, h.id ASC`
    )
    .all(day)
    .map((row) => {
      const habit = row as HabitRow;
      return { ...habit, completed: Boolean(habit.completed), archived: Boolean(habit.archived) };
    });
}

export function listArchivedHabits(day: string): Habit[] {
  return db
    .prepare(
      `SELECT h.*, COALESCE(e.value, 0) AS value, COALESCE(e.completed, 0) AS completed
       FROM habits h
       LEFT JOIN entries e ON e.habit_id = h.id AND e.day = ?
       WHERE h.archived = 1
       ORDER BY h.position ASC, h.created_at ASC, h.id ASC`
    )
    .all(day)
    .map((row) => {
      const habit = row as HabitRow;
      return { ...habit, completed: Boolean(habit.completed), archived: Boolean(habit.archived) };
    });
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
    `INSERT INTO habits (id, name, description, type, target, color, position)
     VALUES (@id, @name, @description, @type, @target, @color,
       COALESCE((SELECT MAX(position) + 1 FROM habits), 0))`
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
    .get(day, id) as HabitRow | undefined;
  return row
    ? { ...row, completed: Boolean(row.completed), archived: Boolean(row.archived) }
    : undefined;
}

export function setHabitArchived(id: string, archived: boolean): void {
  db.prepare('UPDATE habits SET archived = ? WHERE id = ?').run(archived ? 1 : 0, id);
}

export function updateHabit(id: string, input: { name: string; description: string }): Habit {
  db.prepare('UPDATE habits SET name = ?, description = ? WHERE id = ?')
    .run(input.name, input.description, id);
  const habit = getHabit(id, todayKey());
  if (!habit) throw new Error('Updated habit could not be loaded from the database.');
  return habit;
}

export function reorderHabits(
  scope: 'active' | 'archived' | 'all',
  habitIds: string[]
): string[] | undefined {
  const reorder = db.transaction(() => {
    const rows = db
      .prepare('SELECT id, archived FROM habits ORDER BY position ASC, created_at ASC, id ASC')
      .all() as { id: string; archived: number }[];
    const scopedRows = scope === 'all'
      ? rows
      : rows.filter((row) => row.archived === (scope === 'archived' ? 1 : 0));
    if (
      habitIds.length !== scopedRows.length ||
      new Set(habitIds).size !== habitIds.length ||
      habitIds.some((id) => !scopedRows.some((row) => row.id === id))
    ) {
      return undefined;
    }

    const orderedIds = rows.map((row) => row.id);
    if (scope === 'all') {
      orderedIds.splice(0, orderedIds.length, ...habitIds);
    } else {
      let nextIndex = 0;
      for (let index = 0; index < rows.length; index += 1) {
        if (rows[index].archived === (scope === 'archived' ? 1 : 0)) {
          orderedIds[index] = habitIds[nextIndex];
          nextIndex += 1;
        }
      }
    }

    const updatePosition = db.prepare('UPDATE habits SET position = ? WHERE id = ?');
    orderedIds.forEach((id, position) => updatePosition.run(position, id));
    return orderedIds;
  });
  return reorder();
}

export function saveEntry(
  habit: Habit,
  day: string,
  value: number,
  completed: boolean,
  note?: string
): HabitDay {
  db.prepare(
    `INSERT INTO entries (habit_id, day, value, completed, note)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (habit_id, day) DO UPDATE SET
       value = excluded.value,
       completed = excluded.completed,
       note = CASE WHEN ? = 1 THEN excluded.note ELSE entries.note END`
  ).run(habit.id, day, value, completed ? 1 : 0, note ?? '', note === undefined ? 0 : 1);
  const entry = db
    .prepare('SELECT day AS date, value, completed, note FROM entries WHERE habit_id = ? AND day = ?')
    .get(habit.id, day) as HabitHistoryRow | undefined;
  if (!entry) throw new Error('Saved entry could not be loaded from the database.');
  return { ...entry, completed: Boolean(entry.completed) };
}

export function getHabitHistory(id: string, start: string, end: string): HabitDay[] {
  return db
    .prepare(
      `SELECT day AS date, value, completed, note
       FROM entries
       WHERE habit_id = ? AND day BETWEEN ? AND ?
       ORDER BY day ASC`
    )
    .all(id, start, end)
    .map((row) => {
      const entry = row as HabitHistoryRow;
      return { ...entry, completed: Boolean(entry.completed) };
    });
}

export function getMonthlyHabitStats(month: string, today: string): MonthlyHabitStat[] {
  const start = `${month}-01`;
  const currentMonth = today.slice(0, 7);
  const end = month === currentMonth
    ? today
    : new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))
        .toISOString()
        .slice(0, 10);
  const rows = db
    .prepare(
      `SELECT h.id, h.name, h.color, h.type, h.target, h.archived, h.created_at,
              e.day, e.value, e.completed
       FROM habits h
       LEFT JOIN entries e ON e.habit_id = h.id AND e.day BETWEEN ? AND ?
       ORDER BY h.position ASC, e.day ASC`
    )
    .all(start, end) as {
      id: string;
      name: string;
      color: string;
      type: HabitType;
      target: number;
      archived: number;
      created_at: string;
      day: string | null;
      value: number | null;
      completed: number | null;
    }[];
  const byHabit = new Map<string, MonthlyHabitStat>();
  const createdDays = new Map<string, string>();

  for (const row of rows) {
    let stat = byHabit.get(row.id);
    if (!stat) {
      const createdDay = row.created_at.slice(0, 10);
      createdDays.set(row.id, createdDay);
      const trackedStart = createdDay > start ? createdDay : start;
      const trackedDays = trackedStart > end
        ? 0
        : Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${trackedStart}T00:00:00Z`)) / 86400000) + 1;
      stat = {
        id: row.id,
        name: row.name,
        color: row.color,
        type: row.type,
        target: row.target,
        archived: Boolean(row.archived),
        createdAt: row.created_at,
        successfulDays: 0,
        trackedDays,
        completionRate: 0,
        totalCount: 0
      };
      byHabit.set(row.id, stat);
    }

    if (row.day !== null && row.day >= (createdDays.get(row.id) ?? start)) {
      stat.totalCount += row.value ?? 0;
      if (row.type === 'daily' ? row.completed === 1 : (row.value ?? 0) >= row.target) {
        stat.successfulDays += 1;
      }
    }
  }

  return Array.from(byHabit.values()).map((stat) => ({
    ...stat,
    completionRate: stat.trackedDays
      ? Math.round((stat.successfulDays / stat.trackedDays) * 100)
      : 0
  }));
}

export function getJournalEntries(month: string, today: string): JournalEntry[] {
  const start = `${month}-01`;
  const end = month === today.slice(0, 7)
    ? today
    : new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))
        .toISOString()
        .slice(0, 10);

  return db
    .prepare(
      `SELECT h.id AS habitId, h.name AS habitName, h.color AS habitColor,
              e.day AS date, e.value, e.completed, e.note
       FROM entries e
       JOIN habits h ON h.id = e.habit_id
       WHERE e.day BETWEEN ? AND ? AND trim(e.note) <> ''
       ORDER BY e.day DESC, h.position ASC, h.created_at ASC, h.id ASC`
    )
    .all(start, end)
    .map((row) => {
      const entry = row as JournalEntry;
      return { ...entry, completed: Boolean(entry.completed) };
    });
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
