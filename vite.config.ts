import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Source maps are off deliberately. This bundle is the tool that can
    // rewrite any row in the database; shipping a readable map of it to anyone
    // who opens devtools hands an attacker the map for free.
    sourcemap: false,
  },
});
