import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// served from https://sitcon.org/social-kit/
export default defineConfig({
  base: '/social-kit/',
  plugins: [svelte()],
});
