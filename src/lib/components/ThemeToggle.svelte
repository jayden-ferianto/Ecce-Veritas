<script lang="ts">
  import { Moon, Sun } from 'lucide-svelte';
  import { onMount } from 'svelte';

  let theme: 'light' | 'dark' = 'light';

  onMount(() => {
    const stored = localStorage.getItem('ecce-theme');
    theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(theme);
  });

  function applyTheme(nextTheme: 'light' | 'dark') {
    theme = nextTheme;
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem('ecce-theme', nextTheme);
  }
</script>

<button
  class="theme-toggle"
  type="button"
  aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
  title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
  on:click={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
>
  {#if theme === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}
</button>
