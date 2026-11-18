<script lang="ts">
  import './app.css';
  import { onMount } from 'svelte';

  onMount(() => {
    const stored = localStorage.getItem('ecce-theme');
    document.documentElement.dataset.theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });
</script>

<slot />
