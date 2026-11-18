<script lang="ts">
  import {
    Archive,
    BookOpenText,
    Check,
    ChevronRight,
    CircleCheck,
    Flame,
    ChevronLeft,
    GripVertical,
    Minus,
    PanelLeftClose,
    PanelLeftOpen,
    Plus,
    Sparkles,
    X
  } from 'lucide-svelte';
  import LogoutButton from '$lib/components/LogoutButton.svelte';
  import WorkspaceNavigation from '$lib/components/WorkspaceNavigation.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { onMount } from 'svelte';
  import type { Habit, JournalEntry, MonthlyHabitStat } from '$lib/types';

  export let data: {
    today: string;
    view: 'today' | 'journal' | 'progress' | 'archive';
    month: string;
    earliestMonth: string;
    habits: Habit[];
    archivedHabits: Habit[];
    monthlyStats: MonthlyHabitStat[];
    journalEntries: JournalEntry[];
  };
  let habits = data.habits;
  let archivedHabits = data.archivedHabits;
  let monthlyStats = data.monthlyStats;
  let busyHabitIds = new Set<string>();
  let draggedHabitId: string | null = null;
  let reorderingHabits = false;
  let showCreate = false;
  let saving = false;
  let errorMessage = '';
  let draft = { name: '', description: '', type: 'daily' as 'daily' | 'count', target: 3, color: 'sage' };
  let sidebarCollapsed = false;

  onMount(() => {
    sidebarCollapsed = localStorage.getItem('ecce-sidebar-collapsed') === 'true';
  });

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem('ecce-sidebar-collapsed', String(sidebarCollapsed));
  }

  $: completedCount = habits.filter((habit) =>
    habit.type === 'daily' ? habit.completed : habit.value >= habit.target
  ).length;
  $: overallProgress = habits.length ? Math.round((completedCount / habits.length) * 100) : 0;
  $: visibleHabits = habits;
  $: successfulHabitDays = monthlyStats.reduce((total, habit) => total + habit.successfulDays, 0);
  $: trackedHabitDays = monthlyStats.reduce((total, habit) => total + habit.trackedDays, 0);
  $: monthProgress = trackedHabitDays
    ? Math.round((successfulHabitDays / trackedHabitDays) * 100)
    : 0;
  $: monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${data.month}-01T12:00:00Z`));
  $: previousMonth = shiftMonth(data.month, -1);
  $: nextMonth = shiftMonth(data.month, 1);
  $: pageTitle = data.view === 'progress'
    ? 'Monthly Overview'
    : data.view === 'journal'
      ? 'Your journal'
      : data.view === 'archive'
        ? 'Your archive'
        : 'A little progress, every day';
  $: formattedDate = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${data.today}T12:00:00Z`));

  async function updateHabit(habit: Habit, value: number, completed: boolean) {
    if (busyHabitIds.has(habit.id)) return;
    busyHabitIds = new Set(busyHabitIds).add(habit.id);
    errorMessage = '';
    try {
      const response = await fetch(`/api/habits/${habit.id}/entries/${data.today}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value, completed })
      });
      if (!response.ok) {
        errorMessage = 'Could not save your progress. Please try again.';
        return;
      }
      const result = await response.json();
      habits = habits.map((item) =>
        item.id === habit.id
          ? { ...item, value: result.entry.value, completed: result.entry.completed }
          : item
      );
    } catch {
      errorMessage = 'Could not connect to the server. Please try again.';
    } finally {
      busyHabitIds = new Set(busyHabitIds);
      busyHabitIds.delete(habit.id);
    }
  }

  async function createHabit(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    errorMessage = '';
    try {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft)
      });
      const result = await response.json();
      if (!response.ok) {
        errorMessage = result.error ?? 'Could not create this habit.';
        return;
      }
      habits = [...habits, result.habit];
      draft = { name: '', description: '', type: 'daily', target: 3, color: 'sage' };
      showCreate = false;
    } catch {
      errorMessage = 'Could not connect to the server. Please try again.';
    } finally {
      saving = false;
    }
  }

  function reorderList<T extends { id: string }>(items: T[], sourceId: string, targetId: string) {
    const reordered = [...items];
    const sourceIndex = reordered.findIndex((item) => item.id === sourceId);
    const targetIndex = reordered.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return null;
    const [item] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, item);
    return reordered;
  }

  function sortByHabitIds<T extends { id: string }>(items: T[], habitIds: string[]) {
    const positions = new Map(habitIds.map((id, index) => [id, index]));
    return [...items].sort((a, b) => (positions.get(a.id) ?? 0) - (positions.get(b.id) ?? 0));
  }

  function beginHabitDrag(event: DragEvent, habitId: string) {
    if (reorderingHabits) {
      event.preventDefault();
      return;
    }
    draggedHabitId = habitId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', habitId);
    }
  }

  function endHabitDrag() {
    draggedHabitId = null;
  }

  async function dropHabit(event: DragEvent, targetId: string, scope: 'active' | 'archived' | 'all') {
    event.preventDefault();
    const sourceId = draggedHabitId ?? event.dataTransfer?.getData('text/plain');
    draggedHabitId = null;
    if (sourceId && sourceId !== targetId) await changeHabitOrder(scope, sourceId, targetId);
  }

  async function changeHabitOrder(
    scope: 'active' | 'archived' | 'all',
    sourceId: string,
    targetId: string
  ) {
    if (reorderingHabits) return;
    const previousHabits = habits;
    const previousArchivedHabits = archivedHabits;
    const previousMonthlyStats = monthlyStats;
    let reorderedIds: string[];
    if (scope === 'active') {
      const reordered = reorderList(habits, sourceId, targetId);
      if (!reordered) return;
      habits = reordered;
      reorderedIds = reordered.map((habit) => habit.id);
    } else if (scope === 'archived') {
      const reordered = reorderList(archivedHabits, sourceId, targetId);
      if (!reordered) return;
      archivedHabits = reordered;
      reorderedIds = reordered.map((habit) => habit.id);
    } else {
      const reordered = reorderList(monthlyStats, sourceId, targetId);
      if (!reordered) return;
      monthlyStats = reordered;
      reorderedIds = reordered.map((habit) => habit.id);
    }

    reorderingHabits = true;
    errorMessage = '';
    try {
      const response = await fetch('/api/habits/reorder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scope, habitIds: reorderedIds })
      });
      const result: { habitIds?: string[]; error?: string } = await response.json();
      if (!response.ok || !result.habitIds) {
        habits = previousHabits;
        archivedHabits = previousArchivedHabits;
        monthlyStats = previousMonthlyStats;
        errorMessage = result.error ?? 'Could not reorder your habits. Please try again.';
        return;
      }
      habits = sortByHabitIds(habits, result.habitIds);
      archivedHabits = sortByHabitIds(archivedHabits, result.habitIds);
      monthlyStats = sortByHabitIds(monthlyStats, result.habitIds);
    } catch {
      habits = previousHabits;
      archivedHabits = previousArchivedHabits;
      monthlyStats = previousMonthlyStats;
      errorMessage = 'Could not connect to the server. Please try again.';
    } finally {
      reorderingHabits = false;
    }
  }

  function progress(habit: Habit) {
    return habit.type === 'daily'
      ? habit.completed ? 100 : 0
      : Math.min(100, Math.round((habit.value / habit.target) * 100));
  }

  function shiftMonth(month: string, offset: number) {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + offset);
    return date.toISOString().slice(0, 7);
  }

  function monthUrl(month: string) {
    return `/?view=${data.view === 'journal' ? 'journal' : 'progress'}&month=${month}`;
  }

  function formatJournalDate(date: string) {
    return new Intl.DateTimeFormat('en', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    }).format(new Date(`${date}T12:00:00Z`));
  }

  async function restoreHabit(habit: Habit) {
    if (busyHabitIds.has(habit.id)) return;
    busyHabitIds = new Set(busyHabitIds).add(habit.id);
    errorMessage = '';
    try {
      const response = await fetch(`/api/habits/${habit.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ archived: false })
      });
      if (!response.ok) {
        const result = await response.json();
        errorMessage = result.error ?? 'Could not restore this habit.';
        return;
      }
      archivedHabits = archivedHabits.filter((item) => item.id !== habit.id);
    } catch {
      errorMessage = 'Could not connect to the server. Please try again.';
    } finally {
      busyHabitIds = new Set(busyHabitIds);
      busyHabitIds.delete(habit.id);
    }
  }
</script>

<svelte:head>
  <title>{pageTitle} · Ecce Veritas</title>
  <meta name="description" content="A calm, personal space to grow your daily habits." />
</svelte:head>

<div class:sidebar-collapsed={sidebarCollapsed} class="app-shell">
  <aside class:collapsed={sidebarCollapsed} class="sidebar">
    <button class="sidebar-collapse" type="button" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} on:click={toggleSidebar}>
      {#if sidebarCollapsed}<PanelLeftOpen size={17} />{:else}<PanelLeftClose size={17} />{/if}
    </button>
    <a class="brand" href="/" aria-label="Ecce Veritas home">
      <span class="brand-mark"><Sparkles size={19} strokeWidth={2.2} /></span>
      <span>Ecce <span class="brand-light">Veritas</span></span>
    </a>

    <div class="side-label">YOUR SPACE</div>
    <WorkspaceNavigation view={data.view} month={data.month} progress={monthProgress} />

    <div class="sidebar-note">
      <span class="note-icon"><Sparkles size={16} /></span>
      <p class="note-title">Small steps count.</p>
      <p class="note-copy">Show up for yourself, one day at a time.</p>
      <div class="note-decoration"><span></span><span></span><span></span></div>
    </div>
    <div class="sidebar-bottom">
      <span class="status-dot"></span>
      <span>A private space, at your pace</span>
    </div>
  </aside>

  <WorkspaceNavigation mobileOnly view={data.view} month={data.month} progress={monthProgress} />

  <main class="main-content">
    <header class="topbar">
      <div class="mobile-brand"><span class="brand-mark"><Sparkles size={17} /></span> Ecce Veritas</div>
      <div class="topbar-date"><span class="live-dot"></span>{formattedDate}</div>
      <ThemeToggle />
      <LogoutButton />
    </header>

    <section class="page-content">
      <div class="welcome-row">
        <div>
          <div class="eyebrow">
            {data.view === 'progress'
              ? 'YOUR HABIT HISTORY'
              : data.view === 'journal'
                ? 'YOUR DAILY NOTES'
                : data.view === 'archive'
                  ? 'PAST HABITS'
                  : 'YOUR DAILY CHECK-IN'}
          </div>
          <h1>{pageTitle}</h1>
          <p class="welcome-copy">
            {data.view === 'progress'
              ? 'A month at a time, all your habits in one place.'
              : data.view === 'journal'
                ? 'Your notes and reflections, gathered by day.'
                : data.view === 'archive'
                  ? 'Past habits are kept here until you want them back.'
                  : "You don't have to be perfect. Just keep showing up."}
          </p>
        </div>
        <button class="primary-button add-button" on:click={() => (showCreate = true)}>
          <Plus size={18} strokeWidth={2.5} /><span>New habit</span>
        </button>
      </div>

      {#if errorMessage}
        <div class="error-banner" role="alert">{errorMessage}</div>
      {/if}

      {#if data.view === 'today'}
      <section class="overview-card" aria-label="Today's overview">
        <div class="overview-main">
          <div class="overview-icon"><CircleCheck size={21} /></div>
          <div>
            <div class="overview-label">TODAY'S MOMENTUM</div>
            <div class="overview-title">
              {#if habits.length === 0}
                Your space is ready
              {:else if completedCount === habits.length}
                You showed up for yourself today!
              {:else}
                You're building something good
              {/if}
            </div>
            <div class="overview-subtitle">
              {habits.length ? `${completedCount} of ${habits.length} habits reached their goal` : 'Add your first habit to get started'}
            </div>
          </div>
        </div>
        <div class="overview-progress">
          <div class="progress-ring" style={`--progress: ${overallProgress * 3.6}deg`}>
            <div class="ring-inner"><strong>{overallProgress}%</strong><span>done</span></div>
          </div>
        </div>
        <div class="overview-decoration"><span></span><span></span><span></span><span></span></div>
      </section>

      <div class="section-heading">
        <div>
          <h2>Your habits <span class="habit-count">{habits.length}</span></h2>
          <p>A collection of little promises to yourself.</p>
        </div>
        <div class="today-tag"><span></span> TODAY</div>
      </div>

      {#if visibleHabits.length}
        <div class="habit-list">
          {#each visibleHabits as habit (habit.id)}
            <article
              class:dragging={draggedHabitId === habit.id}
              class="habit-card"
              on:dragover={(event) => event.preventDefault()}
              on:drop={(event) => dropHabit(event, habit.id, 'active')}
            >
              <span
                class="drag-handle"
                draggable={!reorderingHabits}
                aria-hidden="true"
                on:dragstart|stopPropagation={(event) => beginHabitDrag(event, habit.id)}
                on:dragend={endHabitDrag}
              ><GripVertical size={17} /></span>
              <div class={`habit-symbol ${habit.color}`}>
                {#if habit.type === 'daily'}<Check size={20} />{:else}<Flame size={20} />{/if}
              </div>
              <div class="habit-info">
                <a class="habit-name" href={`/habits/${habit.id}`}>{habit.name}<ChevronRight size={15} /></a>
                <p>{habit.description || (habit.type === 'daily' ? 'Daily check-in' : `Build up to ${habit.target} times a day`)}</p>
                <div class="mini-progress"><span class={habit.color} style={`width: ${progress(habit)}%`}></span></div>
              </div>
              <div class="habit-action">
                {#if habit.type === 'daily'}
                  <button
                    class:checked={habit.completed}
                    class="check-button"
                    disabled={busyHabitIds.has(habit.id)}
                    aria-label={habit.completed ? `Mark ${habit.name} as not done` : `Mark ${habit.name} as done`}
                    on:click={() => updateHabit(habit, habit.completed ? 0 : 1, !habit.completed)}
                  >
                    {#if habit.completed}<Check size={20} strokeWidth={2.7} />{:else}<span></span>{/if}
                  </button>
                {:else}
                  <div class="counter">
                    <button
                      class="counter-button"
                      aria-label={`Decrease ${habit.name}`}
                      disabled={habit.value === 0 || busyHabitIds.has(habit.id)}
                      on:click={() => updateHabit(habit, Math.max(0, habit.value - 1), false)}
                    ><Minus size={15} /></button>
                    <span class:goal-reached={habit.value >= habit.target} class="counter-value">{habit.value}<small>/{habit.target}</small></span>
                    <button
                      class="counter-button increment"
                      disabled={busyHabitIds.has(habit.id)}
                      aria-label={`Log ${habit.name}`}
                      on:click={() => updateHabit(habit, habit.value + 1, false)}
                    ><Plus size={16} /></button>
                  </div>
                {/if}
              </div>
              <a class="card-open" href={`/habits/${habit.id}`} aria-label={`View ${habit.name} status`}><ChevronRight size={18} /></a>
            </article>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <div class="empty-illustration"><Sparkles size={30} strokeWidth={1.5} /></div>
          <h3>A fresh start</h3>
          <p>Start with one small habit you want to make time for.</p>
          <button class="secondary-button" on:click={() => (showCreate = true)}><Plus size={16} /> Add your first habit</button>
        </div>
      {/if}

      {#if habits.length}
        <button class="add-another" on:click={() => (showCreate = true)}><span><Plus size={17} /></span> Add another habit</button>
      {/if}
      {/if}

      {#if data.view === 'progress'}
        <section class="monthly-section" id="monthly-overview">
          <div class="section-heading monthly-heading">
            <div><h2>Monthly overview</h2><p>Every habit, together, for {monthLabel}.</p></div>
            <div class="history-month-nav" aria-label="Choose month">
              {#if data.month > data.earliestMonth}
                <a class="history-month-button" href={monthUrl(previousMonth)} aria-label="Previous month"><ChevronLeft size={17} /></a>
              {:else}
                <span class="history-month-button disabled" aria-hidden="true"><ChevronLeft size={17} /></span>
              {/if}
              <span class="month-tag">{monthLabel}</span>
              {#if data.month < data.today.slice(0, 7)}
                <a class="history-month-button" href={monthUrl(nextMonth)} aria-label="Next month"><ChevronRight size={17} /></a>
              {:else}
                <span class="history-month-button disabled" aria-hidden="true"><ChevronRight size={17} /></span>
              {/if}
            </div>
          </div>
          <div class="monthly-summary">
            <div><strong>{monthProgress}%</strong><span>overall completion</span></div>
            <div><strong>{successfulHabitDays}<small>/{trackedHabitDays}</small></strong><span>habit-days reached</span></div>
            <div><strong>{monthlyStats.length}</strong><span>habits in your space</span></div>
          </div>
          {#if monthlyStats.length}
            <div class="monthly-habit-list">
              {#each monthlyStats as stat (stat.id)}
                <div
                  class:dragging={draggedHabitId === stat.id}
                  class="monthly-habit-row"
                  on:dragover={(event) => event.preventDefault()}
                  on:drop={(event) => dropHabit(event, stat.id, 'all')}
                >
                  <span
                    class="drag-handle monthly-drag-handle"
                    draggable={!reorderingHabits}
                    aria-hidden="true"
                    on:dragstart|stopPropagation={(event) => beginHabitDrag(event, stat.id)}
                    on:dragend={endHabitDrag}
                  ><GripVertical size={16} /></span>
                  <a
                    class="monthly-habit-link"
                    href={stat.trackedDays ? `/habits/${stat.id}?month=${data.month}` : `/habits/${stat.id}`}
                  >
                    <span class={`monthly-habit-dot ${stat.color}`}></span>
                    <span class="monthly-habit-name">{stat.name}{#if stat.archived}<small>Archived</small>{/if}</span>
                    {#if stat.trackedDays}
                      <span class="monthly-habit-result">
                        {stat.successfulDays}<small>/{stat.trackedDays} days</small>
                        {#if stat.type === 'count'}<small>{stat.totalCount} logged</small>{/if}
                      </span>
                    {:else}
                      <span class="monthly-habit-result not-started">Not started<small>this month</small></span>
                    {/if}
                    <span class="monthly-habit-track"><span class={stat.color} style={`width: ${stat.completionRate}%`}></span></span>
                    <strong class="monthly-habit-rate">{stat.trackedDays ? `${stat.completionRate}%` : '—'}</strong>
                    <ChevronRight size={16} />
                  </a>
                </div>
              {/each}
            </div>
          {:else}
            <div class="monthly-empty">Add a habit to see your monthly progress here.</div>
          {/if}
        </section>
      {/if}

      {#if data.view === 'journal'}
        <section class="journal-section">
          <div class="section-heading monthly-heading">
            <div><h2>Reflections</h2><p>Notes saved from your daily habit check-ins.</p></div>
            <div class="history-month-nav" aria-label="Choose journal month">
              {#if data.month > data.earliestMonth}
                <a class="history-month-button" href={monthUrl(previousMonth)} aria-label="Previous month"><ChevronLeft size={17} /></a>
              {:else}
                <span class="history-month-button disabled" aria-hidden="true"><ChevronLeft size={17} /></span>
              {/if}
              <span class="month-tag">{monthLabel}</span>
              {#if data.month < data.today.slice(0, 7)}
                <a class="history-month-button" href={monthUrl(nextMonth)} aria-label="Next month"><ChevronRight size={17} /></a>
              {:else}
                <span class="history-month-button disabled" aria-hidden="true"><ChevronRight size={17} /></span>
              {/if}
            </div>
          </div>
          {#if data.journalEntries.length}
            <div class="journal-list">
              {#each data.journalEntries as entry}
                <article class="journal-entry">
                  <div class="journal-entry-date">{formatJournalDate(entry.date)}</div>
                  <a class="journal-entry-habit" href={`/habits/${entry.habitId}?month=${data.month}`}>
                    <span class={`monthly-habit-dot ${entry.habitColor}`}></span>{entry.habitName}
                  </a>
                  <p>{entry.note}</p>
                </article>
              {/each}
            </div>
          {:else}
            <div class="empty-state">
              <div class="empty-illustration"><BookOpenText size={30} /></div>
              <h3>No reflections this month</h3>
              <p>Open a habit's history, select a day, and add a note to see it here.</p>
              {#if habits.length}<a class="secondary-button" href={`/habits/${habits[0].id}`}>Open a habit</a>{/if}
            </div>
          {/if}
        </section>
      {/if}

      {#if data.view === 'archive'}
        <section class="archive-section">
          <div class="section-heading"><div><h2>Archived habits <span class="habit-count">{archivedHabits.length}</span></h2><p>Restore one whenever you're ready to start again.</p></div></div>
          {#if archivedHabits.length}
            <div class="habit-list">
              {#each archivedHabits as habit (habit.id)}
                <article
                  class:dragging={draggedHabitId === habit.id}
                  class="habit-card"
                  on:dragover|preventDefault
                  on:drop={(event) => dropHabit(event, habit.id, 'archived')}
                >
                  <span
                    class="drag-handle"
                    draggable={!reorderingHabits}
                    aria-hidden="true"
                    on:dragstart|stopPropagation={(event) => beginHabitDrag(event, habit.id)}
                    on:dragend={endHabitDrag}
                  ><GripVertical size={17} /></span>
                  <div class={`habit-symbol ${habit.color}`}>{#if habit.type === 'daily'}<Check size={20} />{:else}<Flame size={20} />{/if}</div>
                  <div class="habit-info">
                    <a class="habit-name" href={`/habits/${habit.id}`}>{habit.name}<ChevronRight size={15} /></a>
                    <p>{habit.description || (habit.type === 'daily' ? 'Daily check-in' : `Build up to ${habit.target} times a day`)}</p>
                  </div>
                  <button class="secondary-button restore-button" disabled={busyHabitIds.has(habit.id)} on:click={() => restoreHabit(habit)}>
                    {busyHabitIds.has(habit.id) ? 'Restoring…' : 'Restore'}
                  </button>
                </article>
              {/each}
            </div>
          {:else}
            <div class="empty-state">
              <div class="empty-illustration"><Archive size={30} /></div>
              <h3>Your archive is empty</h3>
              <p>Habits you archive will be kept here with their history.</p>
              {#if habits.length}<a class="secondary-button" href={`/habits/${habits[0].id}`}>View a habit</a>{/if}
            </div>
          {/if}
        </section>
      {/if}

      <footer class="page-footer"><span>One day at a time</span></footer>
    </section>
  </main>
</div>

{#if showCreate}
  <div class="modal-backdrop" role="presentation">
    <dialog open class="modal" aria-modal="true" aria-labelledby="modal-title">
      <button class="modal-close" aria-label="Close" on:click={() => (showCreate = false)}><X size={20} /></button>
      <div class="modal-kicker">A NEW COMMITMENT</div>
      <h2 id="modal-title">Add a new habit</h2>
      <p class="modal-description">Start small. You can build from here.</p>
      <form on:submit={createHabit}>
        <label for="habit-name">Habit name</label>
        <input id="habit-name" bind:value={draft.name} maxlength="80" placeholder="e.g. Read a few pages" required />
        <label for="habit-description">A little more about it <span class="optional">(optional)</span></label>
        <textarea id="habit-description" bind:value={draft.description} maxlength="240" rows="2" placeholder="Why does this matter to you?"></textarea>
        <fieldset class="type-fieldset">
          <legend>How will you track it?</legend>
          <div class="type-options">
            <button type="button" class:chosen={draft.type === 'daily'} on:click={() => (draft.type = 'daily')}>
              <span class="type-option-icon"><Check size={17} /></span>
              <span><strong>Once a day</strong><small>Check it off when done</small></span>
            </button>
            <button type="button" class:chosen={draft.type === 'count'} on:click={() => (draft.type = 'count')}>
              <span class="type-option-icon"><Flame size={17} /></span>
              <span><strong>Count it up</strong><small>Log each time you do it</small></span>
            </button>
          </div>
        </fieldset>
        {#if draft.type === 'count'}
          <label for="habit-target">Daily target</label>
          <input id="habit-target" type="number" bind:value={draft.target} min="1" max="999" required />
        {/if}
        <button class="primary-button modal-submit" type="submit" disabled={saving}>
          <Plus size={17} /> {saving ? 'Adding…' : 'Add habit'}
        </button>
        {#if errorMessage}<div class="error-banner modal-error" role="alert">{errorMessage}</div>{/if}
      </form>
    </dialog>
  </div>
{/if}
