import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative base so the build also works when served from a subpath (e.g. GitHub Pages)
  base: './',
  // `@/` → src (BoardUI components import from `@/components/...`, `@/utils/cx`)
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
