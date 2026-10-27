import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build also works from a subfolder or inside a Capacitor/Cordova shell.
  base: './',
  server: { host: true, port: 5173 },
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
});
