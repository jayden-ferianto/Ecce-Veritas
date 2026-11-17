<script lang="ts">
  import {
    Archive,
    BookOpenText,
    Check,
    ChevronRight,
    CircleCheck,
    Compass,
    Flame,
    Minus,
    Plus,
    Sparkles,
    Target,
    TrendingUp,
    X
  } from 'lucide-svelte';
  import LogoutButton from '$lib/components/LogoutButton.svelte';
  import type { Habit } from '$lib/types';

  const sidebarSuggestions = [
    { label: 'Today', icon: Target, active: true },
    { label: 'Focus', icon: Compass },
    { label: 'Journal', icon: BookOpenText },
    { label: 'Progress', icon: TrendingUp },
    { label: 'Archive', icon: Archive }
  ];

  export let data: { today: string; habits: Habit[] };
  let habits = data.habits;
  let busyHabitIds = new Set<string>();
  let showCreate = false;
  let saving = false;
  let errorMessage = '';
  let draft = { name: '', description: '', type: 'daily' as 'daily' | 'count', target: 3, color: 'sage' };

  $: completedCount = habits.filter((habit) =>
    habit.type === 'daily' ? habit.completed : habit.value >= habit.target
  ).length;
  $: overallProgress = habits.length ? Math.round((completedCount / habits.length) * 100) : 0;
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

  function progress(habit: Habit) {
    return habit.type === 'daily'
      ? habit.completed ? 100 : 0
      : Math.min(100, Math.round((habit.value / habit.target) * 100));
  }
</script>

<svelte:head>
  <title>Today · Ecce Veritas</title>
  <meta name="description" content="A calm, personal space to grow your daily habits." />
</svelte:head>

<div class="app-shell">
  <aside class="sidebar">
    <a class="brand" href="/" aria-label="Ecce Veritas home">
      <span class="brand-mark"><Sparkles size={19} strokeWidth={2.2} /></span>
      <span>Ecce <span class="brand-light">Veritas</span></span>
    </a>

    <div class="side-label">YOUR SPACE</div>
    <nav class="sidebar-nav" aria-label="Main navigation">
      {#each sidebarSuggestions as link}
        <button type="button" class:active={link.active} class="nav-link" aria-current={link.active ? 'page' : undefined}>
          <svelte:component this={link.icon} size={18} />
          <span>{link.label}</span>
          {#if link.label === 'Progress'}
            <span class="nav-meta">4</span>
          {/if}
        </button>
      {/each}
    </nav>

    <div class="sidebar-divider"></div>
    <div class="side-label secondary-label">SUGGESTIONS</div>
    <button type="button" class="nav-link nav-link-secondary">
      <Sparkles size={17} />
      <span>Habit ideas</span>
    </button>
    <button type="button" class="nav-link nav-link-secondary">
      <BookOpenText size={17} />
      <span>Reflection</span>
    </button>

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

  <main class="main-content">
    <header class="topbar">
      <div class="mobile-brand"><span class="brand-mark"><Sparkles size={17} /></span> Ecce Veritas</div>
      <div class="topbar-date"><span class="live-dot"></span>{formattedDate}</div>
      <LogoutButton />
    </header>

    <section class="page-content">
      <div class="welcome-row">
        <div>
          <div class="eyebrow">YOUR DAILY CHECK-IN</div>
          <h1>A little progress,<br class="mobile-break" /> every day <span class="wave">✳</span></h1>
          <p class="welcome-copy">You don't have to be perfect. Just keep showing up.</p>
        </div>
        <button class="primary-button add-button" on:click={() => (showCreate = true)}>
          <Plus size={18} strokeWidth={2.5} /><span>New habit</span>
        </button>
      </div>

      {#if errorMessage}
        <div class="error-banner" role="alert">{errorMessage}</div>
      {/if}

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

      {#if habits.length}
        <div class="habit-list">
          {#each habits as habit (habit.id)}
            <article class="habit-card">
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
      <footer class="page-footer"><span>One day at a time</span><span>✳</span></footer>
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
