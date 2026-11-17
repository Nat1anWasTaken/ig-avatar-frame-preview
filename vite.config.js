import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// served from https://sitcon.org/social-kit/
export default defineConfig({
  base: '/social-kit/',
  plugins: [svelte()],
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        campaign2027: resolve(import.meta.dirname, '2027/index.html'),
      },
    },
  },
});
