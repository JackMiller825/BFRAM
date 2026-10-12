import { useEffect } from 'react'
import { Community } from './components/Community'
import { Faq } from './components/Faq'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { HowToBuy } from './components/HowToBuy'
import { Story } from './components/Story'
import { TokenSection } from './components/TokenSection'
import { getConfigDiagnostics, tokenConfig, type TokenConfig } from './config/token'

export function App({ config = tokenConfig }: { config?: TokenConfig }) {
  useEffect(() => {
    if (!import.meta.env.DEV) return
    for (const issue of getConfigDiagnostics(config)) {
      console.warn(`[BuffaRumble config] ${issue.field}: ${issue.message}`)
    }
  }, [config])

  return (
    <>
      <Header config={config} />
      <main id="content" tabIndex={-1}>
        <Hero config={config} />
        <Story />
        <TokenSection config={config} />
        <HowToBuy config={config} />
        <Community config={config} />
        <Faq config={config} />
      </main>
      <Footer config={config} />
    </>
  )
}
