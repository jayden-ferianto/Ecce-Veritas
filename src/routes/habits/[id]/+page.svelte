<script lang="ts">
  import { Archive, ArrowLeft, Check, ChevronLeft, ChevronRight, Flame, PanelLeftClose, PanelLeftOpen, Pencil, RotateCcw, TrendingUp, X } from 'lucide-svelte';
  import LogoutButton from '$lib/components/LogoutButton.svelte';
  import WorkspaceNavigation from '$lib/components/WorkspaceNavigation.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { onMount } from 'svelte';
  import type { Habit, HabitDay } from '$lib/types';

  export let data: {
    habit: Habit;
    today: string;
    days: { date: string; value: number; completed: boolean }[];
    successfulDays: number;
    streak: number;
    historyDays: HabitDay[];
    calendarOffset: number;
    month: string;
    previousMonth: string | null;
    nextMonth: string | null;
  };

  let selectedDate: string | null = null;
  let entryValue = 0;
  let entryCompleted = false;
  let entryNote = '';
  let savingEntry = false;
  let entryError = '';
  let archiving = false;
  let sidebarCollapsed = false;
  let sidebarHoverExpanded = false;
  let showEdit = false;
  let savingHabit = false;
  let habitEditError = '';
  let habitEdit = { name: '', description: '' };

  onMount(() => {
    sidebarCollapsed = localStorage.getItem('ecce-sidebar-collapsed') === 'true';
  });

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    sidebarHoverExpanded = false;
    localStorage.setItem('ecce-sidebar-collapsed', String(sidebarCollapsed));
  }

  function setSidebarHoverExpanded(expanded: boolean) {
    sidebarHoverExpanded = sidebarCollapsed && expanded;
  }

  function openHabitEdit() {
    habitEdit = { name: data.habit.name, description: data.habit.description };
    habitEditError = '';
    showEdit = true;
  }

  async function saveHabitEdit(event: SubmitEvent) {
    event.preventDefault();
    if (savingHabit) return;
    savingHabit = true;
    habitEditError = '';
    try {
      const response = await fetch(`/api/habits/${data.habit.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(habitEdit)
      });
      const result = await response.json();
      if (!response.ok) {
        habitEditError = result.error ?? 'Could not update this habit.';
        return;
      }
      data = { ...data, habit: result.habit };
      showEdit = false;
    } catch {
      habitEditError = 'Could not connect to the server. Please try again.';
    } finally {
      savingHabit = false;
    }
  }

  $: successfulDays = data.days.filter((day) =>
    data.habit.type === 'daily' ? day.completed : day.value >= data.habit.target
  ).length;
  $: completionRate = Math.round((successfulDays / data.days.length) * 100);
  $: monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${data.month}-01T12:00:00Z`));
  $: dayLabels = data.historyDays.slice(-7).map((day) => ({
    ...day,
    weekday: new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' })
      .format(new Date(`${day.date}T12:00:00Z`))
  }));
  $: bestValue = Math.max(1, ...data.historyDays.map((day) => day.value));
  $: streak = calculateStreak(data.days);

  function calculateStreak(days: typeof data.days) {
    let count = 0;
    const today = days[days.length - 1];
    const todayIsSuccessful = today && daySucceeded(today);
    for (let index = days.length - (todayIsSuccessful ? 1 : 2); index >= 0; index -= 1) {
      if (daySucceeded(days[index])) count += 1;
      else break;
    }
    return count;
  }

  function daySucceeded(day: { value: number; completed: boolean }) {
    return data.habit.type === 'daily' ? day.completed : day.value >= data.habit.target;
  }

  function selectDay(day: HabitDay) {
    selectedDate = day.date;
    entryValue = day.value;
    entryCompleted = day.completed;
    entryNote = day.note;
    entryError = '';
  }

  async function saveEntry(event: SubmitEvent) {
    event.preventDefault();
    if (!selectedDate || savingEntry) return;
    savingEntry = true;
    entryError = '';
    try {
      const body = data.habit.type === 'daily'
        ? { completed: entryCompleted, note: entryNote }
        : { value: entryValue, note: entryNote };
      const response = await fetch(`/api/habits/${data.habit.id}/entries/${selectedDate}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) {
        entryError = result.error ?? 'Could not save this entry. Please try again.';
        return;
      }

      const savedEntry = result.entry as HabitDay;
      data = {
        ...data,
        days: data.days.map((day) => day.date === savedEntry.date ? savedEntry : day),
        historyDays: data.historyDays.map((day) => day.date === savedEntry.date ? savedEntry : day)
      };
    } catch {
      entryError = 'Could not save this entry. Please try again.';
    } finally {
      savingEntry = false;
    }
  }

  async function removeHabit() {
    if (!window.confirm(`Delete "${data.habit.name}" and all its history? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/habits/${data.habit.id}`, { method: 'DELETE' });
      if (!response.ok) {
        window.alert('Could not delete the habit. Please try again.');
        return;
      }
      window.location.href = '/';
    } catch {
      window.alert('Could not delete the habit. Please try again.');
    }
  }

  async function toggleArchive() {
    if (archiving) return;
    archiving = true;
    try {
      const response = await fetch(`/api/habits/${data.habit.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ archived: !data.habit.archived })
      });
      if (!response.ok) {
        window.alert('Could not update this habit. Please try again.');
        return;
      }
      window.location.href = data.habit.archived ? '/' : '/?view=archive';
    } catch {
      window.alert('Could not connect to the server. Please try again.');
    } finally {
      archiving = false;
    }
  }
</script>

<svelte:head>
  <title>{data.habit.name} · Ecce Veritas</title>
  <meta name="description" content={`Progress and history for ${data.habit.name}.`} />
</svelte:head>

<div class:sidebar-collapsed={sidebarCollapsed} class="app-shell">
  <aside
    class:collapsed={sidebarCollapsed}
    class:temporarily-expanded={sidebarHoverExpanded}
    class="sidebar"
    on:pointerleave={() => setSidebarHoverExpanded(false)}
  >
    <a class="brand" href="/" aria-label="Ecce Veritas home">
      <span class="brand-mark"><span>✳</span></span>
      <span>Ecce <span class="brand-light">Veritas</span></span>
    </a>
    <div class="side-label">YOUR SPACE</div>
    <WorkspaceNavigation view="today" month={data.month} progress={completionRate} />
    <div class="sidebar-note">
      <span class="note-icon"><span>✳</span></span>
      <p class="note-title">Small steps count.</p>
      <p class="note-copy">Show up for yourself, one day at a time.</p>
      <div class="note-decoration"><span></span><span></span><span></span></div>
    </div>
    <div class="sidebar-bottom"><span class="status-dot"></span><span>A private space, at your pace</span></div>
    <button
      class="sidebar-collapse"
      type="button"
      aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      on:click={toggleSidebar}
      on:pointerenter={() => setSidebarHoverExpanded(true)}
      on:focus={() => setSidebarHoverExpanded(true)}
      on:blur={() => setSidebarHoverExpanded(false)}
    >
      {#if sidebarCollapsed}<PanelLeftOpen size={17} />{:else}<PanelLeftClose size={17} />{/if}
      <span>{sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
    </button>
  </aside>

  <WorkspaceNavigation mobileOnly view="today" month={data.month} progress={completionRate} />

  <main class="main-content">
    <header class="topbar">
      <div class="mobile-brand"><span class="brand-mark">✳</span> Ecce Veritas</div>
      <a class="back-link" href="/"><ArrowLeft size={17} /> All habits</a>
      <ThemeToggle />
      <LogoutButton />
    </header>

    <section class="page-content detail-page">
      <div class="eyebrow">YOUR HABIT, UP CLOSE</div>
      <div class="detail-title-row">
        <div class={`detail-symbol ${data.habit.color}`}>
          {#if data.habit.type === 'daily'}<Check size={24} />{:else}<Flame size={24} />{/if}
        </div>
        <div>
          <h1>{data.habit.name}</h1>
          <p class="detail-description">{data.habit.description || (data.habit.type === 'daily' ? 'A daily check-in' : `Aiming for ${data.habit.target} times each day`)}</p>
        </div>
      </div>
      <div class="detail-actions">
        <span class="habit-type-pill">{data.habit.type === 'daily' ? 'Once a day' : `${data.habit.target} times a day`}</span>
        <div class="detail-action-buttons">
          <button class="archive-link" on:click={openHabitEdit}><Pencil size={14} /> Edit habit</button>
          <button class="archive-link" disabled={archiving} on:click={toggleArchive}>
            {#if data.habit.archived}<RotateCcw size={14} />{archiving ? 'Restoring…' : 'Restore habit'}{:else}<Archive size={14} />{archiving ? 'Archiving…' : 'Archive habit'}{/if}
          </button>
          <button class="delete-link" on:click={removeHabit}>Delete habit</button>
        </div>
      </div>

      <section class="detail-summary">
        <div class="summary-copy">
          <span class="eyebrow">THE BIG PICTURE</span>
          <h2>Look how far you've come.</h2>
          <p>Every little effort is adding up. Keep growing in your own time.</p>
        </div>
        <div class="summary-metrics">
          <div><Flame size={18} /><strong>{streak}</strong><span>day streak</span></div>
          <div><TrendingUp size={18} /><strong>{completionRate}%</strong><span>30-day rhythm</span></div>
          <div><Check size={18} /><strong>{successfulDays}</strong><span>days reached</span></div>
        </div>
      </section>

      <section class="history-section">
        <div class="section-heading">
          <div><h2>Your history</h2><p>Select any day to add or edit its entry.</p></div>
          <nav class="history-month-nav" aria-label="Browse habit history by month">
            {#if data.previousMonth}
              <a
                class="history-month-button"
                href={`/habits/${data.habit.id}?month=${data.previousMonth}`}
                aria-label="Previous month"
                title="Previous month"
                on:click={() => (selectedDate = null)}
              ><ChevronLeft size={17} /></a>
            {:else}
              <span class="history-month-button disabled" aria-hidden="true"><ChevronLeft size={17} /></span>
            {/if}
            <span class="month-tag">{monthLabel}</span>
            {#if data.nextMonth}
              <a
                class="history-month-button"
                href={`/habits/${data.habit.id}?month=${data.nextMonth}`}
                aria-label="Next month"
                title="Next month"
                on:click={() => (selectedDate = null)}
              ><ChevronRight size={17} /></a>
            {:else}
              <span class="history-month-button disabled" aria-hidden="true"><ChevronRight size={17} /></span>
            {/if}
          </nav>
        </div>
        <div class="history-card">
          <div class="calendar-weekdays" aria-hidden="true">
            {#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as weekday}
              <span>{weekday}</span>
            {/each}
          </div>
          <div class="history-divider"></div>
          <div class="calendar-grid" aria-label={`${monthLabel} habit history`}>
            {#each [0, 1, 2, 3, 4, 5, 6] as offset}
              {#if offset < data.calendarOffset}<span class="calendar-spacer" aria-hidden="true"></span>{/if}
            {/each}
            {#each data.historyDays as day}
              <button
                type="button"
                class:calendar-done={daySucceeded(day)}
                class:calendar-today={day.date === data.today}
                class:calendar-selected={day.date === selectedDate}
                class={`calendar-cell ${data.habit.color}`}
                aria-label={`${day.date}: ${data.habit.type === 'daily' ? day.completed ? 'done' : 'not done' : `${day.value} of ${data.habit.target}`}. Select to edit.`}
                aria-pressed={day.date === selectedDate}
                title={`${day.date}: ${data.habit.type === 'daily' ? day.completed ? 'done' : 'not done' : `${day.value} of ${data.habit.target}`}`}
                on:click={() => selectDay(day)}
              ><span class="calendar-date">{Number(day.date.slice(-2))}</span></button>
            {/each}
          </div>
          <div class="calendar-legend"><span>Just starting</span><span class="legend-swatch"></span><span>Reached your goal</span></div>
          {#if selectedDate}
            <form class="history-editor" on:submit={saveEntry}>
              <div class="history-editor-title">
                <strong>Edit entry</strong>
                <span>{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${selectedDate}T12:00:00Z`))}</span>
              </div>
              {#if data.habit.type === 'daily'}
                <label class="history-completed">
                  <input type="checkbox" bind:checked={entryCompleted} disabled={savingEntry} />
                  <span>Completed this habit</span>
                </label>
              {:else}
                <div class="history-count-field">
                  <label for="history-count">Times completed</label>
                  <input
                    id="history-count"
                    class="history-count-input"
                    type="number"
                    bind:value={entryValue}
                    min="0"
                    max="999999"
                    step="1"
                    required
                    disabled={savingEntry}
                  />
                </div>
              {/if}
              <div class="history-note-field">
                <label for="history-note">Note or reflection <span class="optional">(optional)</span></label>
                <textarea
                  id="history-note"
                  bind:value={entryNote}
                  maxlength="2000"
                  rows="3"
                  placeholder="How did it go? Anything you want to remember?"
                  disabled={savingEntry}
                ></textarea>
              </div>
              {#if entryError}<div class="auth-error" role="alert">{entryError}</div>{/if}
              <button class="primary-button history-save" type="submit" disabled={savingEntry}>
                {savingEntry ? 'Saving…' : 'Save entry'}
              </button>
            </form>
          {/if}
        </div>
      </section>

      {#if data.habit.type === 'count'}
        <section class="history-section count-section">
          <div class="section-heading"><div><h2>Daily count</h2><p>How many times you logged each day.</p></div></div>
          <div class="chart-card">
            <div class="bar-chart">
              {#each dayLabels as day}
                <div class="bar-column">
                  <span class="bar-value">{day.value || ''}</span>
                  <div class="bar-track"><span class={`bar-fill ${data.habit.color}`} style={`height: ${Math.min(100, (day.value / bestValue) * 100)}%`}></span></div>
                  <small>{day.weekday.slice(0, 1)}</small>
                </div>
              {/each}
            </div>
          </div>
        </section>
      {/if}
      <footer class="page-footer"><span>One day at a time</span><span>✳</span></footer>
    </section>
  </main>
</div>

{#if showEdit}
  <div class="modal-backdrop" role="presentation">
    <dialog open class="modal" aria-modal="true" aria-labelledby="edit-habit-title">
      <button class="modal-close" aria-label="Close" on:click={() => (showEdit = false)}><X size={20} /></button>
      <div class="modal-kicker">MAKE IT YOURS</div>
      <h2 id="edit-habit-title">Edit habit</h2>
      <p class="modal-description">Update the name or description for this habit.</p>
      <form on:submit={saveHabitEdit}>
        <label for="edit-habit-name">Habit name</label>
        <input id="edit-habit-name" bind:value={habitEdit.name} maxlength="80" required disabled={savingHabit} />
        <label for="edit-habit-description">Description <span class="optional">(optional)</span></label>
        <textarea id="edit-habit-description" bind:value={habitEdit.description} maxlength="240" rows="3" disabled={savingHabit}></textarea>
        {#if habitEditError}<div class="error-banner modal-error" role="alert">{habitEditError}</div>{/if}
        <button class="primary-button modal-submit" type="submit" disabled={savingHabit}>
          {savingHabit ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </dialog>
  </div>
{/if}
