<script lang="ts">
  import { Archive, BookOpenText, Target, TrendingUp } from 'lucide-svelte';

  export let view: 'today' | 'journal' | 'progress' | 'archive';
  export let month: string;
  export let progress: number;
  export let mobileOnly = false;

  const links = [
    { label: 'Today', view: 'today', href: '/', icon: Target },
    { label: 'Journal', view: 'journal', href: '', icon: BookOpenText },
    { label: 'Monthly Overview', view: 'progress', href: '', icon: TrendingUp },
    { label: 'Archive', view: 'archive', href: '/?view=archive', icon: Archive }
  ];

  function linkHref(link: (typeof links)[number]) {
    if (link.view === 'journal' || link.view === 'progress') {
      return `/?view=${link.view}&month=${month}`;
    }
    return link.href;
  }
</script>

<div class:mobile-nav-only={mobileOnly} class="workspace-navigation">
{#if !mobileOnly}
<nav class="sidebar-nav" aria-label="Main navigation">
  {#each links as link}
    <a
      href={linkHref(link)}
      class:active={view === link.view}
      class="nav-link"
      aria-current={view === link.view ? 'page' : undefined}
    >
      <svelte:component this={link.icon} size={18} strokeWidth={2} />
      <span>{link.label}</span>
      {#if link.view === 'progress'}<span class="nav-meta">{progress}%</span>{/if}
    </a>
  {/each}
</nav>
{/if}

<nav class="mobile-nav" aria-label="Main navigation">
  {#each links as link}
    <a
      href={linkHref(link)}
      class:active={view === link.view}
      aria-current={view === link.view ? 'page' : undefined}
    >
      <svelte:component this={link.icon} size={20} strokeWidth={2} />
      <span>{link.label}</span>
    </a>
  {/each}
</nav>
</div>
