<script lang="ts">
  import { Sparkles } from 'lucide-svelte';

  export let data: { configured: boolean };
  let password = '';
  let errorMessage = '';
  let submitting = false;

  async function signIn(event: SubmitEvent) {
    event.preventDefault();
    submitting = true;
    errorMessage = '';
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const result = await response.json();
      if (!response.ok) {
        errorMessage = result.error ?? 'Could not sign in.';
        return;
      }
      window.location.assign('/');
    } catch {
      errorMessage = 'Could not connect to the server. Please try again.';
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Sign in · Ecce Veritas</title>
  <meta name="description" content="Sign in to your private habit tracker." />
</svelte:head>

<main class="auth-page">
  <section class="auth-card">
    <a class="auth-brand" href="/" aria-label="Ecce Veritas">
      <span class="brand-mark"><Sparkles size={19} /></span>
      <span>Ecce <span class="brand-light">Veritas</span></span>
    </a>
    <div class="auth-kicker">YOUR PRIVATE SPACE</div>
    <h1>Welcome back.</h1>
    <p class="auth-copy">A little progress, every day.</p>

    {#if data.configured}
      <form class="auth-form" on:submit={signIn}>
        <label for="password">App password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          autocomplete="current-password"
          required
          maxlength="1024"
          disabled={submitting}
        />
        {#if errorMessage}<div class="auth-error" role="alert">{errorMessage}</div>{/if}
        <button class="primary-button auth-submit" type="submit" disabled={submitting || !password}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    {:else}
      <div class="auth-setup" role="alert">
        <strong>Authentication needs setup.</strong>
        <span>Set APP_PASSWORD and APP_SECRET in the server's .env file, then restart Ecce Veritas.</span>
      </div>
    {/if}
    <div class="auth-footer"><span class="status-dot"></span> Your garden is just for you</div>
  </section>
</main>
