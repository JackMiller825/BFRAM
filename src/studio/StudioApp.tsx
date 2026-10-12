import { useEffect, useState } from 'react'
import { workspaceRequest } from './api'
import type { ClientWorkspace } from './domain/types'
import { HelpScreen, OpportunitiesScreen } from './guide'
import {
  AddLinksDialog,
  AnalyticsScreen,
  CampaignEditor,
  CampaignList,
  ContentStudio,
  IntegrationsScreen,
  LinkLibrary,
  Overview,
  QueueScreen,
  SettingsScreen,
} from './screens'
import './styles.css'

const NAV = [
  ['overview', 'Overview'],
  ['campaigns', 'Campaigns'],
  ['links', 'Link Library'],
  ['opportunities', 'Opportunities'],
  ['studio', 'Content Studio'],
  ['queue', 'Calendar & Queue'],
  ['analytics', 'Analytics'],
  ['integrations', 'Integrations'],
  ['help', 'Help'],
  ['settings', 'Settings'],
] as const

function readRoute(): { name: string; id?: string } {
  const parts = window.location.hash.replace(/^#/, '').split('/').filter(Boolean)
  if (parts[0] === 'campaigns' && parts[1]) return { name: 'campaign', id: decodeURIComponent(parts[1]) }
  if (parts[0] === 'studio' && parts[1]) return { name: 'studio', id: decodeURIComponent(parts[1]) }
  const known = new Set<string>(NAV.map(([name]) => name))
  const name = parts[0] && known.has(parts[0]) ? parts[0] : 'overview'
  return { name }
}

export function StudioApp() {
  const [workspace, setWorkspace] = useState<ClientWorkspace | null>(null)
  const [notice, setNotice] = useState('')
  const [route, setRoute] = useState(readRoute)
  const [adding, setAdding] = useState(false)
  const [offline, setOffline] = useState(false)
  const pagesPreview = import.meta.env.VITE_SITE === 'studio'

  useEffect(() => {
    const onHash = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    void workspaceRequest('/api/workspace')
      .then((result) => {
        setWorkspace(result.workspace)
        setOffline(false)
      })
      .catch(() => setOffline(true))
  }, [])

  const ready = workspace !== null
  useEffect(() => {
    if (!ready) return undefined
    const source = new EventSource('/api/jobs/stream')
    source.addEventListener('progress', (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { jobs: ClientWorkspace['jobs'] }
      setWorkspace((current) => (current ? { ...current, jobs: data.jobs } : current))
      if (data.jobs.some((job) => job.status === 'completed' || job.status === 'canceled')) {
        void workspaceRequest('/api/workspace').then((result) => setWorkspace(result.workspace)).catch(() => undefined)
      }
    })
    return () => source.close()
  }, [ready])

  function navigate(hash: string) {
    window.location.hash = hash
  }

  if (offline) {
    return (
      <main className="auth">
        <section className="gate">
          <h1>Campaign API unavailable</h1>
          <p>Start the local studio with <span className="mono">npm run dev</span> and open /studio. The public marketing site does not include this server.</p>
        </section>
      </main>
    )
  }
  if (!workspace) {
    return <main className="auth"><p className="gate">Opening the workspace…</p></main>
  }

  const screenProps = {
    workspace,
    replaceWorkspace: setWorkspace,
    notify: setNotice,
    navigate,
    routeId: route.id,
  }
  const title = route.name === 'campaign' ? 'Campaign brief' : NAV.find(([name]) => name === route.name)?.[1] ?? 'Overview'

  return (
    <>
      <a className="skip" href="#studio-main">Skip to content</a>
      <div className="shell">
        <nav className="nav" aria-label="Studio">
          <div className="brand">
            <strong>Token Campaign Studio</strong>
            <span>Authorized drafts only</span>
            <small>{pagesPreview ? 'Browser preview' : 'Local workspace'}</small>
          </div>
          <div className="nav-links">
            {NAV.map(([name, label]) => (
              <button key={name} type="button" aria-current={route.name === name ? 'page' : undefined} onClick={() => navigate(`#/${name}`)}>{label}</button>
            ))}
          </div>
          <p className="nav-foot">Publishing requires a connected account and verified admin or OAuth access. Reference links stay in the library.</p>
        </nav>
        <main className="main" id="studio-main" tabIndex={-1}>
          <header className="topbar">
            <div>
              <h1>{title}</h1>
              <p className="hint">{workspace.settings.globalPause ? 'Publishing is paused.' : 'Manual approval is required for every post.'}</p>
          {pagesPreview ? <p className="banner warn">Browser preview. Reference links stay out of the queue, and nothing is marked published from this site.</p> : null}
            </div>
            <div className="top-actions">
              <button className="ghost" type="button" onClick={() => setAdding(true)}>Add links</button>
              <button className="primary" type="button" onClick={() => void workspaceRequest('/api/campaigns', { method: 'POST', body: JSON.stringify({ name: 'New campaign', token: { projectName: 'New campaign', timezone: 'UTC' }, timezone: 'UTC' }) }).then((result) => {
                setWorkspace(result.workspace)
                const created = result.workspace.campaigns[0]
                if (created) navigate(`#/campaigns/${created.id}`)
              })}>New campaign</button>
            </div>
          </header>
          <p className="live" aria-live="polite">{notice}</p>
          {route.name === 'overview' ? <Overview {...screenProps} /> : null}
          {route.name === 'campaigns' ? <CampaignList {...screenProps} /> : null}
          {route.name === 'campaign' ? <CampaignEditor key={route.id} {...screenProps} /> : null}
          {route.name === 'links' ? <LinkLibrary {...screenProps} /> : null}
          {route.name === 'opportunities' ? <OpportunitiesScreen {...screenProps} /> : null}
          {route.name === 'studio' ? <ContentStudio {...screenProps} /> : null}
          {route.name === 'queue' ? <QueueScreen {...screenProps} /> : null}
          {route.name === 'analytics' ? <AnalyticsScreen {...screenProps} /> : null}
          {route.name === 'integrations' ? <IntegrationsScreen {...screenProps} /> : null}
          {route.name === 'help' ? <HelpScreen /> : null}
          {route.name === 'settings' ? <SettingsScreen {...screenProps} /> : null}
        </main>
      </div>
      {adding ? <AddLinksDialog {...screenProps} onClose={() => setAdding(false)} /> : null}
    </>
  )
}
