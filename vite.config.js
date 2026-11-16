import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// served from https://sitcon.org/avatar-frame/
export default defineConfig({
  base: '/avatar-frame/',
  plugins: [svelte()],
});
