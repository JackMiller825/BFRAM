import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StudioApp } from './StudioApp'

async function boot(): Promise<void> {
  if (import.meta.env.VITE_SITE === 'studio') {
    const { installPagesApi } = await import('./browser/pages-api')
    installPagesApi()
  }
  const root = document.getElementById('root')
  if (!root) throw new Error('Root element #root is missing.')
  createRoot(root).render(
    <StrictMode>
      <StudioApp />
    </StrictMode>,
  )
}

void boot()
