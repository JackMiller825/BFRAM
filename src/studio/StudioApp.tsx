import { useEffect, useState } from 'react'
import { api, workspaceRequest } from './api'
import type { ClientWorkspace } from './domain/types'
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
  ['studio', 'Content Studio'],
  ['queue', 'Calendar & Queue'],
  ['analytics', 'Analytics'],
  ['integrations', 'Integrations'],
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
  const [session, setSession] = useState<{ needsSetup: boolean; authenticated: boolean } | null>(null)
  const [workspace, setWorkspace] = useState<ClientWorkspace | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [password, setPassword] = useState('')
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
    void api<{ needsSetup: boolean; authenticated: boolean }>('/api/session')
      .then((next) => {
        setSession(next)
        setOffline(false)
        if (next.authenticated) return workspaceRequest('/api/workspace')
        return null
      })
      .then((result) => {
        if (result) setWorkspace(result.workspace)
      })
      .catch(() => {
        setOffline(true)
        setSession({ needsSetup: false, authenticated: false })
      })
  }, [])

  useEffect(() => {
    if (!session?.authenticated) return
    const source = new EventSource('/api/jobs/stream')
    source.addEventListener('progress', (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { jobs: ClientWorkspace['jobs'] }
      setWorkspace((current) => (current ? { ...current, jobs: data.jobs } : current))
      if (data.jobs.some((job) => job.status === 'completed' || job.status === 'canceled')) {
        void workspaceRequest('/api/workspace').then((result) => setWorkspace(result.workspace)).catch(() => undefined)
      }
    })
    return () => source.close()
  }, [session?.authenticated])

  function navigate(hash: string) {
    window.location.hash = hash
  }

  async function submitAuth(path: '/api/setup' | '/api/login') {
    setError('')
    try {
      const result = await workspaceRequest(path, { method: 'POST', body: JSON.stringify({ password }) })
      setWorkspace(result.workspace)
      setSession({ needsSetup: false, authenticated: true })
      setPassword('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in failed')
    }
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
  if (!session || (session.authenticated && !workspace)) {
    return <main className="auth"><p className="gate">Checking the workspace…</p></main>
  }
  if (!session.authenticated) {
    return (
      <main className="auth">
        <form className="gate" onSubmit={(event) => { event.preventDefault(); void submitAuth(session.needsSetup ? '/api/setup' : '/api/login') }}>
          <h1>Token Campaign Studio</h1>
          <p>Prepare disclosed drafts for accounts you control. This workspace does not send unsolicited messages, join groups, or post from a public link.</p>
          {pagesPreview ? <p className="banner warn">This GitHub Pages preview keeps the workspace in this browser. It has no server credentials and cannot publish.</p> : null}
          <label className="field">
            <span>{session.needsSetup ? 'Create the owner password' : 'Owner password'}</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={session.needsSetup ? 'new-password' : 'current-password'} required minLength={10} />
          </label>
          {error ? <p className="banner bad" role="alert">{error}</p> : null}
          <button className="primary" type="submit">{session.needsSetup ? 'Create workspace login' : 'Sign in'}</button>
        </form>
      </main>
    )
  }
  if (!workspace) return null

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
          {route.name === 'studio' ? <ContentStudio {...screenProps} /> : null}
          {route.name === 'queue' ? <QueueScreen {...screenProps} /> : null}
          {route.name === 'analytics' ? <AnalyticsScreen {...screenProps} /> : null}
          {route.name === 'integrations' ? <IntegrationsScreen {...screenProps} /> : null}
          {route.name === 'settings' ? <SettingsScreen {...screenProps} /> : null}
        </main>
      </div>
      {adding ? <AddLinksDialog {...screenProps} onClose={() => setAdding(false)} /> : null}
    </>
  )
}
