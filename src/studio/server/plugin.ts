import { join } from 'node:path'
import type { Plugin } from 'vite'
import { createHandler } from './http'
import { createStore } from './store'

export function studioPlugin(): Plugin {
  return {
    name: 'token-campaign-studio',
    apply: 'serve',
    configureServer(server) {
      const store = createStore(join(server.config.root, 'data'))
      const handle = createHandler(store)
      const timer = setInterval(() => {
        void store.pump()
      }, 400)
      timer.unref()
      server.httpServer?.on('close', () => clearInterval(timer))
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        if (path === '/studio' || path === '/studio/') {
          req.url = '/studio.html'
          next()
          return
        }
        if (path.startsWith('/api/')) {
          void handle(req, res)
          return
        }
        next()
      })
    },
  }
}
