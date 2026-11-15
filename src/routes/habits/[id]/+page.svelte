<script lang="ts">
  import { ArrowLeft, Check, Flame, Target, TrendingUp } from 'lucide-svelte';
  import type { Habit } from '$lib/types';

  export let data: {
    habit: Habit;
    today: string;
    days: { date: string; value: number; completed: boolean }[];
    successfulDays: number;
    streak: number;
  };

  $: completionRate = Math.round((data.successfulDays / data.days.length) * 100);
  $: monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${data.today}T12:00:00Z`));
  $: dayLabels = data.days.slice(-7).map((day) => ({
    ...day,
    weekday: new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' })
      .format(new Date(`${day.date}T12:00:00Z`))
  }));
  $: bestValue = Math.max(1, ...data.days.map((day) => day.value));

  function daySucceeded(day: { value: number; completed: boolean }) {
    return data.habit.type === 'daily' ? day.completed : day.value >= data.habit.target;
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
</script>

<svelte:head>
  <title>{data.habit.name} · Ecce Veritas</title>
  <meta name="description" content={`Progress and history for ${data.habit.name}.`} />
</svelte:head>

<div class="app-shell">
  <aside class="sidebar">
    <a class="brand" href="/" aria-label="Ecce Veritas home">
      <span class="brand-mark"><span>✳</span></span>
      <span>Ecce <span class="brand-light">Veritas</span></span>
    </a>
    <div class="side-label">YOUR SPACE</div>
    <a class="nav-link" href="/"><Target size={18} /><span>Today</span></a>
    <div class="sidebar-note">
      <span class="note-icon"><span>✳</span></span>
      <p class="note-title">Small steps count.</p>
      <p class="note-copy">Show up for yourself, one day at a time.</p>
      <div class="note-decoration"><span></span><span></span><span></span></div>
    </div>
    <div class="sidebar-bottom"><span class="status-dot"></span><span>Just you, growing at your pace</span></div>
  </aside>

  <main class="main-content">
    <header class="topbar">
      <div class="mobile-brand"><span class="brand-mark">✳</span> Ecce Veritas</div>
      <a class="back-link" href="/"><ArrowLeft size={17} /> All habits</a>
      <div class="profile-chip"><span class="profile-avatar">🌱</span><span>My garden</span></div>
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
        <button class="delete-link" on:click={removeHabit}>Delete habit</button>
      </div>

      <section class="detail-summary">
        <div class="summary-copy">
          <span class="eyebrow">THE BIG PICTURE</span>
          <h2>Look how far you've come.</h2>
          <p>Every little effort is adding up. Keep growing in your own time.</p>
        </div>
        <div class="summary-metrics">
          <div><Flame size={18} /><strong>{data.streak}</strong><span>day streak</span></div>
          <div><TrendingUp size={18} /><strong>{completionRate}%</strong><span>30-day rhythm</span></div>
          <div><Check size={18} /><strong>{data.successfulDays}</strong><span>days reached</span></div>
        </div>
      </section>

      <section class="history-section">
        <div class="section-heading">
          <div><h2>Your rhythm</h2><p>A gentle look at the past 30 days.</p></div>
          <span class="month-tag">{monthLabel}</span>
        </div>
        <div class="history-card">
          <div class="history-week">
            {#each dayLabels as day}
              <div class="week-day">
                <span>{day.weekday}</span>
                <div class:day-done={daySucceeded(day)} class="week-dot">
                  {#if daySucceeded(day)}<Check size={14} />{:else}<span></span>{/if}
                </div>
                <small>{day.date.slice(8)}</small>
              </div>
            {/each}
          </div>
          <div class="history-divider"></div>
          <div class="calendar-grid" aria-label="30 day habit history">
            {#each data.days as day}
              <div
                class:calendar-done={daySucceeded(day)}
                class:calendar-today={day.date === data.today}
                class={`calendar-cell ${data.habit.color}`}
                title={`${day.date}: ${data.habit.type === 'daily' ? day.completed ? 'done' : 'not done' : `${day.value} of ${data.habit.target}`}`}
              ></div>
            {/each}
          </div>
          <div class="calendar-legend"><span>Just starting</span><span class="legend-swatch"></span><span>Reached your goal</span></div>
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
      <footer class="page-footer"><span>Made for steady growth</span><span>✳</span></footer>
    </section>
  </main>
</div>
