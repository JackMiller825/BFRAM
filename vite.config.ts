import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { applyMetadata } from './src/config/metadata.ts'
import { tokenConfig } from './src/config/token.ts'
import { studioPlugin } from './src/studio/server/plugin.ts'

const pagesPreview = process.env.VITE_SITE === 'studio'

function metadataPlugin(): Plugin {
  return {
    name: 'bfram-metadata',
    transformIndexHtml(html) {
      return applyMetadata(html, tokenConfig)
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), metadataPlugin(), studioPlugin()],
  resolve: pagesPreview
    ? {
        alias: [
          { find: 'node:fs', replacement: fileURLToPath(new URL('./src/studio/browser/node-fs.ts', import.meta.url)) },
          { find: 'node:crypto', replacement: fileURLToPath(new URL('./src/studio/browser/node-crypto.ts', import.meta.url)) },
          { find: 'node:path', replacement: fileURLToPath(new URL('./src/studio/browser/node-path.ts', import.meta.url)) },
        ],
      }
    : undefined,
  build: pagesPreview
    ? {
        rollupOptions: {
          input: {
            main: fileURLToPath(new URL('./index.html', import.meta.url)),
            studio: fileURLToPath(new URL('./studio.html', import.meta.url)),
          },
        },
      }
    : undefined,
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
