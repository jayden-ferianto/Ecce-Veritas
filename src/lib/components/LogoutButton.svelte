<script lang="ts">
  import { LogOut } from 'lucide-svelte';

  let pending = false;

  async function logout() {
    pending = true;
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        window.alert('Could not sign out. Please try again.');
        return;
      }
      window.location.assign('/login');
    } catch {
      window.alert('Could not connect to the server. Please try again.');
    } finally {
      pending = false;
    }
  }
</script>

<button class="profile-chip logout-button" type="button" on:click={logout} disabled={pending}>
  <span class="profile-avatar">🌱</span>
  <span>{pending ? 'Signing out…' : 'Sign out'}</span>
  <LogOut size={14} />
</button>
