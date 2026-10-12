import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { applyMetadata } from './src/config/metadata.ts'
import { tokenConfig } from './src/config/token.ts'

function metadataPlugin(): Plugin {
  return {
    name: 'bfram-metadata',
    transformIndexHtml(html) {
      return applyMetadata(html, tokenConfig)
    },
  }
}

export default defineConfig({
  base: '/BFRAM/',
  plugins: [react(), metadataPlugin()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
