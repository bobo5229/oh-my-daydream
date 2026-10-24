import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  output: 'static',
  outDir: fileURLToPath(new URL('./dist/', import.meta.url)),
  cacheDir: fileURLToPath(new URL('./.astro/', import.meta.url)),
  server: { host: '127.0.0.1' },
  devToolbar: { enabled: false },
});
