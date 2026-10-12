import { useEffect, useRef, useState } from 'react'
import { workspaceRequest } from './api'
import { scanCampaignClaims, scanClaims } from './domain/claims'
import { TEMPLATES } from './domain/drafts'
import { linkPublishBlock } from './domain/links'
import { ADAPTERS } from './domain/adapters'
import { campaignBriefMarkdown, requiredFieldProgress } from './domain/brief'
import type { Campaign, ClientWorkspace, Draft, LinkCategory, LinkRecord, PlatformId, SourceType } from './domain/types'
import { formatWhen } from './format'
import { Dialog, Field, ProgressBlock } from './widgets'

export interface ScreenProps {
  workspace: ClientWorkspace
  replaceWorkspace: (workspace: ClientWorkspace) => void
  notify: (message: string) => void
  navigate: (hash: string) => void
  routeId?: string
}

const categories: LinkCategory[] = ['research', 'prospect', 'owned', 'partner']

async function mutate(path: string, init: RequestInit, props: ScreenProps, message?: string) {
  const result = await workspaceRequest(path, init)
  props.replaceWorkspace(result.workspace)
  if (message) props.notify(message)
  return result.workspace
}

export function Overview(props: ScreenProps) {
  const { workspace } = props
  const review = workspace.drafts.filter((draft) => draft.status === 'needs_review').length
  const queued = workspace.posts.filter((post) => post.status === 'scheduled' || post.status === 'publishing').length
  const blocked = workspace.links.filter((link) => !link.archived && linkPublishBlock(link)).length
  return (
    <div className="grid">
      <div className="banner">
        Supplied channel and profile links are research or prospect records. Nothing in that library is scheduled to post.
      </div>
      <div className="grid cards">
        <article className="card"><h2>Campaigns</h2><p className="stat">{workspace.campaigns.length}</p></article>
        <article className="card"><h2>Needs review</h2><p className="stat">{review}</p></article>
        <article className="card"><h2>In the queue</h2><p className="stat">{queued}</p></article>
        <article className="card"><h2>Blocked destinations</h2><p className="stat">{blocked}</p><p className="hint">Reference links cannot enter the publishing queue.</p></article>
      </div>
      <div className="grid">
        {workspace.jobs.slice(0, 3).map((job) => <ProgressBlock key={job.id} job={job} />)}
        {workspace.jobs.length === 0 ? <p className="empty">No preparation or publishing jobs yet. Open a campaign and run preparation.</p> : null}
      </div>
      <div className="grid cards">
        {workspace.campaigns.map((campaign) => {
          const progress = requiredFieldProgress(campaign)
          return (
            <article className="card" key={campaign.id}>
              <h2>{campaign.name} {campaign.demo ? <span className="pill demo">Demo</span> : null}</h2>
              <p className="hint">{progress.done} of {progress.total} required fields</p>
              <div className="row-actions">
                <button className="ghost" type="button" onClick={() => props.navigate(`#/campaigns/${campaign.id}`)}>Edit brief</button>
                <button className="ghost" type="button" onClick={() => void mutate(`/api/campaigns/${campaign.id}/prepare`, { method: 'POST' }, props, 'Preparation started.')}>Prepare</button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export function CampaignList(props: ScreenProps) {
  return (
    <div className="grid">
      {props.workspace.campaigns.map((campaign) => (
        <article className="card" key={campaign.id}>
          <h2>{campaign.name} {campaign.demo ? <span className="pill demo">Demo</span> : null}</h2>
          <p>{campaign.token.shortDescription || 'No short description yet.'}</p>
          <button className="primary" type="button" onClick={() => props.navigate(`#/campaigns/${campaign.id}`)}>Open</button>
        </article>
      ))}
      {props.workspace.campaigns.length === 0 ? <p className="empty">No campaigns yet. Create one to start a brief.</p> : null}
    </div>
  )
}

export function CampaignEditor(props: ScreenProps) {
  const existing = props.workspace.campaigns.find((item) => item.id === props.routeId)
  const [form, setForm] = useState<Campaign | null>(existing ?? null)
  const [saveState, setSaveState] = useState('Saved')
  const [error, setError] = useState('')
  const saved = useRef(form)
  const replaceWorkspace = props.replaceWorkspace
  useEffect(() => {
    if (!form || form === saved.current) return
    const snapshot = form
    const handle = setTimeout(() => {
      setSaveState('Saving')
      void workspaceRequest(`/api/campaigns/${snapshot.id}`, { method: 'PUT', body: JSON.stringify(snapshot) })
        .then((result) => {
          saved.current = snapshot
          replaceWorkspace(result.workspace)
          setSaveState('Saved')
          setError('')
        })
        .catch((reason: unknown) => {
          setSaveState('Save failed')
          setError(reason instanceof Error ? reason.message : 'Save failed')
        })
    }, 700)
    return () => clearTimeout(handle)
  }, [form, replaceWorkspace])
  if (!form) return <p className="empty">That campaign is not in this workspace.</p>
  const claims = scanCampaignClaims(form)
  const progress = requiredFieldProgress(form)
  const patchToken = (key: keyof Campaign['token'], value: string | boolean | null) => {
    setForm({ ...form, token: { ...form.token, [key]: value }, name: key === 'projectName' && typeof value === 'string' && value ? value : form.name })
  }
  return (
    <div className="grid">
      <p className="live" aria-live="polite">{saveState}{error ? ` · ${error}` : ''} · {progress.done} of {progress.total} required fields</p>
      {form.demo ? <div className="banner warn">Demo campaign. The copy is fictional sample content, not a live token.</div> : null}
      <section className="panel" id="token">
        <h2>Token facts</h2>
        <div className="fields">
          <Field label="Project name"><input value={form.token.projectName} onChange={(event) => patchToken('projectName', event.target.value)} /></Field>
          <Field label="Ticker"><input value={form.token.ticker} onChange={(event) => patchToken('ticker', event.target.value)} /></Field>
          <Field label="Chain"><input value={form.token.chain} onChange={(event) => patchToken('chain', event.target.value)} /></Field>
          <Field label="Contract address" hint="Leave blank until it is known. Copy stays unconfirmed until you mark it confirmed.">
            <input value={form.token.contractAddress ?? ''} onChange={(event) => patchToken('contractAddress', event.target.value || null)} />
          </Field>
          <label className="field"><span>Contract confirmed</span><input type="checkbox" checked={form.token.contractConfirmed} onChange={(event) => patchToken('contractConfirmed', event.target.checked)} /></label>
          <Field label="Launch time"><input value={form.token.launchAt ?? ''} onChange={(event) => patchToken('launchAt', event.target.value || null)} placeholder="2026-10-12T15:00:00Z" /></Field>
          <Field label="Timezone"><input value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value, token: { ...form.token, timezone: event.target.value } })} /></Field>
          <Field label="Website"><input value={form.token.websiteUrl ?? ''} onChange={(event) => patchToken('websiteUrl', event.target.value || null)} /></Field>
        </div>
      </section>
      <section className="panel">
        <h2>Story, utility, and disclosures</h2>
        <div className="fields">
          <Field label="Short description"><textarea value={form.token.shortDescription} onChange={(event) => patchToken('shortDescription', event.target.value)} /></Field>
          <Field label="Long description"><textarea value={form.token.longDescription} onChange={(event) => patchToken('longDescription', event.target.value)} /></Field>
          <Field label="Origin / narrative"><textarea value={form.token.narrative} onChange={(event) => patchToken('narrative', event.target.value)} /></Field>
          <Field label="Utility"><textarea value={form.token.utility} onChange={(event) => patchToken('utility', event.target.value)} /></Field>
          <Field label="Tokenomics"><textarea value={form.token.tokenomics} onChange={(event) => patchToken('tokenomics', event.target.value)} /></Field>
          <Field label="Risks"><textarea value={form.token.risks} onChange={(event) => patchToken('risks', event.target.value)} /></Field>
          <Field label="Disclosures"><textarea value={form.token.disclosures} onChange={(event) => patchToken('disclosures', event.target.value)} /></Field>
        </div>
      </section>
      <section className="panel">
        <h2>Claims checklist</h2>
        {claims.length === 0 ? <p>No unsupported-claim patterns in the brief.</p> : (
          <ul className="list">
            {claims.map((claim) => (
              <li className="claim" key={claim.id}>
                <strong>{claim.excerpt}</strong>
                <div>{claim.concern}</div>
              </li>
            ))}
          </ul>
        )}
        <p className="hint">The original wording stays in the brief. Drafts leave those sentences out, and publishing stays blocked if a draft still contains them.</p>
      </section>
      <SourceEditor form={form} setForm={setForm} />
      <section className="panel">
        <h2>Plan</h2>
        <div className="fields">
          <Field label="Objective"><textarea value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} /></Field>
          <Field label="Audience"><input value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })} /></Field>
          <Field label="Tone"><input value={form.tone} onChange={(event) => setForm({ ...form, tone: event.target.value })} /></Field>
          <Field label="Languages" hint="Comma separated."><input value={form.languages.join(', ')} onChange={(event) => setForm({ ...form, languages: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></Field>
          <Field label="Start date"><input type="date" value={form.startDate ?? ''} onChange={(event) => setForm({ ...form, startDate: event.target.value || null })} /></Field>
          <Field label="End date"><input type="date" value={form.endDate ?? ''} onChange={(event) => setForm({ ...form, endDate: event.target.value || null })} /></Field>
          <Field label="Posting frequency"><input value={form.postingFrequency} onChange={(event) => setForm({ ...form, postingFrequency: event.target.value })} /></Field>
        </div>
      </section>
      <AssetEditor {...props} campaign={form} />
      <section className="panel">
        <h2>Preview</h2>
        <pre className="mono">{campaignBriefMarkdown(form, props.workspace.links)}</pre>
        <button className="ghost" type="button" onClick={() => void fetch(`/api/campaigns/${form.id}/brief`, { credentials: 'same-origin' }).then((response) => response.blob()).then((blob) => {
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = `${form.name}-brief.md`
          anchor.click()
          URL.revokeObjectURL(url)
        })}>Download brief</button>
      </section>
    </div>
  )
}

function SourceEditor({ form, setForm }: { form: Campaign; setForm: (campaign: Campaign) => void }) {
  const [url, setUrl] = useState('')
  const [publisher, setPublisher] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('unverified')
  return (
    <section className="panel">
      <h2>News and catalysts</h2>
      <ul className="list">
        {form.sources.map((source) => (
          <li key={source.id}>{source.sourceType}: {source.publisher || 'Publisher pending'} — {source.url}</li>
        ))}
        {form.sources.length === 0 ? <li>No sources yet.</li> : null}
      </ul>
      <div className="fields">
        <Field label="Source URL"><input value={url} onChange={(event) => setUrl(event.target.value)} /></Field>
        <Field label="Publisher"><input value={publisher} onChange={(event) => setPublisher(event.target.value)} /></Field>
        <Field label="Source type">
          <select value={sourceType} onChange={(event) => setSourceType(event.target.value as SourceType)}>
            <option value="primary">Primary</option>
            <option value="reliable_report">Reliable report</option>
            <option value="unverified">Unverified</option>
          </select>
        </Field>
        <button className="ghost" type="button" onClick={() => {
          if (!url.trim()) return
          setForm({ ...form, sources: [...form.sources, { id: `src_${Date.now()}`, url, publisher, publishedAt: null, eventAt: null, sourceType, verificationNotes: '' }] })
          setUrl('')
          setPublisher('')
        }}>Add source</button>
      </div>
    </section>
  )
}

function AssetEditor(props: ScreenProps & { campaign: Campaign }) {
  const [pack, setPack] = useState('')
  const [alt, setAlt] = useState('')
  return (
    <section className="panel">
      <h2>Assets</h2>
      <ul className="list">
        {props.campaign.assets.map((asset) => (
          <li key={asset.id}>{asset.kind}: {asset.fileName} {asset.altText ? `· alt: ${asset.altText}` : '· alt text missing'}</li>
        ))}
        {props.campaign.assets.length === 0 ? <li>No logo, banner, sticker pack, or clip yet.</li> : null}
      </ul>
      <div className="fields">
        <Field label="Telegram sticker or emoji pack URL" hint="Stored as a reference. The pack is not edited or published automatically.">
          <input value={pack} onChange={(event) => setPack(event.target.value)} />
        </Field>
        <Field label="Alt text"><input value={alt} onChange={(event) => setAlt(event.target.value)} /></Field>
        <button className="ghost" type="button" onClick={() => void mutate(`/api/campaigns/${props.campaign.id}/assets`, { method: 'POST', body: JSON.stringify({ kind: 'sticker_pack', fileName: 'sticker-pack', externalUrl: pack, altText: alt }) }, props, 'Asset link saved.')}>Save pack link</button>
        <Field label="Upload image or video" hint="PNG, JPEG, GIF, WEBP, or MP4. 8 MB maximum.">
          <input type="file" accept="image/png,image/jpeg,image/gif,image/webp,video/mp4" onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            void fetch(`/api/campaigns/${props.campaign.id}/uploads`, {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'content-type': file.type, 'x-file-name': file.name, 'x-asset-kind': file.type.startsWith('video/') ? 'video' : 'image', 'x-alt-text': alt },
              body: file,
            }).then(async (response) => {
              const data = await response.json() as { error?: string; workspace?: ClientWorkspace }
              if (!response.ok || !data.workspace) throw new Error(data.error || 'Upload failed')
              props.replaceWorkspace(data.workspace)
              props.notify('Upload saved.')
            }).catch((reason: unknown) => props.notify(reason instanceof Error ? reason.message : 'Upload failed'))
          }} />
        </Field>
      </div>
    </section>
  )
}

export function LinkLibrary(props: ScreenProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [archived, setArchived] = useState(false)
  const [editing, setEditing] = useState<LinkRecord | null>(null)
  const links = props.workspace.links.filter((link) => {
    if (!archived && link.archived) return false
    if (category !== 'all' && link.category !== category) return false
    const haystack = `${link.displayName} ${link.original} ${link.notes} ${link.tags.join(' ')}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })
  return (
    <div className="grid">
      <div className="banner">These records are references or prospects. A Telegram post, invite, profile, or directory URL is not permission to post.</div>
      <div className="filters">
        <input aria-label="Search links" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
        <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <label><input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} /> Show archived</label>
      </div>
      <p className="hint">{links.length} shown · {props.workspace.links.length} in the library</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Platform</th><th>Category</th><th>Authorization</th><th>Flags</th><th></th></tr>
          </thead>
          <tbody>
            {links.slice(0, 400).map((link) => (
              <tr key={link.id}>
                <td>{link.displayName}<div className="hint mono">{link.original}</div></td>
                <td>{link.platform}</td>
                <td>{link.category}</td>
                <td>{link.authorizationStatus}</td>
                <td>
                  {link.duplicateCount > 1 ? <span className="pill">×{link.duplicateCount}</span> : null}{' '}
                  {link.likelyDuplicate ? <span className="pill">related handle</span> : null}{' '}
                  {link.privateInvite ? <span className="pill">private invite</span> : null}{' '}
                  {link.checkStatus === 'unsupported' ? <span className="status bad">unsupported</span> : null}
                </td>
                <td className="row-actions">
                  <button className="text-button" type="button" onClick={() => setEditing(link)}>Edit</button>
                  <button className="text-button" type="button" onClick={() => void mutate(`/api/links/${link.id}/archive`, { method: 'POST', body: JSON.stringify({ archived: !link.archived }) }, props)}>{link.archived ? 'Restore' : 'Archive'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {links.length === 0 ? <p className="empty">No links match this view.</p> : null}
      {editing ? <LinkDialog link={editing} onClose={() => setEditing(null)} {...props} /> : null}
    </div>
  )
}

function LinkDialog(props: ScreenProps & { link: LinkRecord; onClose: () => void }) {
  const [link, setLink] = useState(props.link)
  return (
    <Dialog title="Edit link" onClose={props.onClose}>
      <Field label="Display name"><input value={link.displayName} onChange={(event) => setLink({ ...link, displayName: event.target.value })} /></Field>
      <Field label="Category" hint="Changing category clears any verification. Research and prospect records cannot be queued.">
        <select value={link.category} onChange={(event) => setLink({ ...link, category: event.target.value as LinkCategory })}>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </Field>
      <Field label="Notes"><textarea value={link.notes} onChange={(event) => setLink({ ...link, notes: event.target.value })} /></Field>
      <Field label="Contact notes"><textarea value={link.contactNotes} onChange={(event) => setLink({ ...link, contactNotes: event.target.value })} /></Field>
      {link.category === 'partner' ? (
        <label><input type="checkbox" checked={link.budgetApproved} onChange={(event) => setLink({ ...link, budgetApproved: event.target.checked })} /> Budget approved for a disclosed paid placement</label>
      ) : null}
      <p className="hint">{linkPublishBlock(link) || 'This record passes the link-level publishing checks. It still needs a connected account and an approved draft.'}</p>
      <div className="row-actions">
        <button className="primary" type="button" onClick={() => void mutate(`/api/links/${link.id}`, { method: 'PATCH', body: JSON.stringify(link) }, props, 'Link saved.').then(() => props.onClose())}>Save</button>
        {link.privateInvite ? <button className="ghost" type="button" onClick={() => void fetch(`/api/links/${link.id}/reveal`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: '{}' }).then((response) => response.json()).then((data: { url?: string; error?: string }) => props.notify(data.url || data.error || 'Could not reveal the link.'))}>Reveal invite</button> : null}
        <button className="ghost" type="button" onClick={() => void mutate(`/api/links/${link.id}/verify`, { method: 'POST' }, props).then(() => props.onClose()).catch((reason: unknown) => props.notify(reason instanceof Error ? reason.message : 'Verification failed'))}>Verify admin access</button>
      </div>
    </Dialog>
  )
}

export function ContentStudio(props: ScreenProps) {
  const campaigns = props.workspace.campaigns
  const [campaignId, setCampaignId] = useState(props.routeId || campaigns[0]?.id || '')
  const campaign = campaigns.find((item) => item.id === campaignId)
  const drafts = props.workspace.drafts.filter((draft) => draft.campaignId === campaignId)
  const [selected, setSelected] = useState<string>(drafts[0]?.id ?? '')
  const draft = drafts.find((item) => item.id === selected) ?? drafts[0]
  return (
    <div className="grid">
      <div className="filters">
        <label>Campaign
          <select value={campaignId} onChange={(event) => { setCampaignId(event.target.value); props.navigate(`#/studio/${event.target.value}`) }}>
            {campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>
      {campaign ? <TemplateBar {...props} campaignId={campaign.id} /> : <p className="empty">Create a campaign before writing drafts.</p>}
      <div className="split">
        <div className="panel">
          <h2>Drafts</h2>
          {drafts.length === 0 ? <p className="empty">No drafts yet. Generate a template or run preparation.</p> : null}
          <ul className="list">
            {drafts.map((item) => (
              <li key={item.id}><button className="text-button draft-row" type="button" onClick={() => setSelected(item.id)}>{item.title || item.template} · {item.platform} · {item.variant} · {item.status}</button></li>
            ))}
          </ul>
        </div>
        {draft ? <DraftEditor key={`${draft.id}:${draft.updatedAt}`} {...props} draft={draft} /> : null}
      </div>
    </div>
  )
}

function TemplateBar(props: ScreenProps & { campaignId: string }) {
  const [template, setTemplate] = useState(TEMPLATES[0].id)
  const [platform, setPlatform] = useState<PlatformId>(TEMPLATES[0].platforms[0])
  const option = TEMPLATES.find((item) => item.id === template) ?? TEMPLATES[0]
  return (
    <div className="panel">
      <h2>Generate</h2>
      <div className="filters">
        <select aria-label="Template" value={template} onChange={(event) => {
          const next = TEMPLATES.find((item) => item.id === event.target.value) ?? TEMPLATES[0]
          setTemplate(next.id)
          setPlatform(next.platforms[0])
        }}>
          {TEMPLATES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <select aria-label="Platform" value={platform} onChange={(event) => setPlatform(event.target.value as PlatformId)}>
          {option.platforms.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="primary" type="button" onClick={() => void mutate(`/api/campaigns/${props.campaignId}/drafts`, { method: 'POST', body: JSON.stringify({ template, platform }) }, props, 'Drafts generated.')}>Generate versions</button>
      </div>
      <p className="hint">{option.description} Versions use the brief only. Unsupported sentences are withheld and listed.</p>
    </div>
  )
}

function DraftEditor(props: ScreenProps & { draft: Draft }) {
  const [draft, setDraft] = useState(props.draft)
  const bodyIssues = scanClaims(`${draft.title}\n${draft.body}\n${draft.disclosure}`)
  return (
    <div className="panel">
      <h2>{draft.platform} preview · {draft.status}</h2>
      <div className="fields">
        <Field label="Title"><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></Field>
        <Field label="Post" hint={`${draft.body.length} characters`}>
          <textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
        </Field>
        <label><input type="checkbox" checked={draft.sponsored} onChange={(event) => setDraft({ ...draft, sponsored: event.target.checked })} /> Paid or sponsored placement</label>
        {draft.sponsored ? <Field label="Disclosure" hint="Required before approval."><input value={draft.disclosure} onChange={(event) => setDraft({ ...draft, disclosure: event.target.value })} /></Field> : null}
        <Field label="Alt text"><input value={draft.altText} onChange={(event) => setDraft({ ...draft, altText: event.target.value })} /></Field>
      </div>
      <h3>Factuality</h3>
      <ul className="list">
        {draft.factuality.map((item) => <li key={item.id}><span className="pill">{item.basis}</span> {item.text}</li>)}
      </ul>
      {draft.withheld.length > 0 ? <div className="banner warn">Withheld: {draft.withheld.join(' ')}</div> : null}
      {bodyIssues.length > 0 ? <div className="banner bad">{bodyIssues.map((issue) => issue.concern).join(' ')}</div> : null}
      {draft.versions.length > 0 ? <p className="hint">{draft.versions.length} earlier version{draft.versions.length === 1 ? '' : 's'} saved.</p> : null}
      <div className="row-actions">
        <button className="ghost" type="button" onClick={() => void mutate(`/api/drafts/${draft.id}`, { method: 'PATCH', body: JSON.stringify(draft) }, props, 'Draft saved.')}>Save</button>
        <button className="primary" type="button" onClick={() => void mutate(`/api/drafts/${draft.id}/approve`, { method: 'POST', body: JSON.stringify({ note: '' }) }, props, 'Draft approved.').catch((reason: unknown) => props.notify(reason instanceof Error ? reason.message : 'Approval blocked'))}>Approve</button>
        <button className="ghost" type="button" onClick={() => void mutate(`/api/drafts/${draft.id}/reject`, { method: 'POST', body: JSON.stringify({ note: 'Needs another pass.' }) }, props, 'Sent back to review.')}>Reject</button>
        <button className="ghost" type="button" onClick={() => void navigator.clipboard.writeText(draft.body).then(() => props.notify('Copied. This does not publish the post.'))}>Copy text</button>
      </div>
    </div>
  )
}

export function QueueScreen(props: ScreenProps) {
  const approved = props.workspace.drafts.filter((draft) => draft.status === 'approved')
  const [draftId, setDraftId] = useState(approved[0]?.id ?? '')
  const [linkId, setLinkId] = useState('')
  const [when, setWhen] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    date.setHours(15, 0, 0, 0)
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  })
  const eligible = props.workspace.links.filter((link) => !linkPublishBlock(link))
  return (
    <div className="grid">
      <div className="row-actions">
        <button className="danger" type="button" onClick={() => void mutate('/api/pause', { method: 'POST', body: JSON.stringify({ global: !props.workspace.settings.globalPause, paused: !props.workspace.settings.globalPause }) }, props, props.workspace.settings.globalPause ? 'Publishing resumed.' : 'Publishing paused.')}>{props.workspace.settings.globalPause ? 'Resume all' : 'Pause all'}</button>
        {(['telegram', 'x', 'youtube', 'tiktok', 'instagram', 'reddit', 'discord'] as PlatformId[]).map((platform) => (
          <button key={platform} className="ghost" type="button" onClick={() => void mutate('/api/pause', { method: 'POST', body: JSON.stringify({ platform, paused: !props.workspace.settings.platformPause[platform] }) }, props)}>
            {props.workspace.settings.platformPause[platform] ? `Resume ${platform}` : `Pause ${platform}`}
          </button>
        ))}
      </div>
      <section className="panel">
        <h2>Schedule</h2>
        {approved.length === 0 || eligible.length === 0 ? (
          <p className="empty">No approved draft has a verified publishing destination. Research and prospect links stay out of this queue. Connect an account and verify a chat you administer, or keep the copy as an export.</p>
        ) : (
          <div className="fields">
            <Field label="Approved draft">
              <select value={draftId} onChange={(event) => setDraftId(event.target.value)}>
                {approved.map((draft) => <option key={draft.id} value={draft.id}>{draft.title}</option>)}
              </select>
            </Field>
            <Field label="Verified destination">
              <select value={linkId} onChange={(event) => setLinkId(event.target.value)}>
                <option value="">Choose</option>
                {eligible.map((link) => <option key={link.id} value={link.id}>{link.displayName}</option>)}
              </select>
            </Field>
            <Field label="Time"><input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} /></Field>
            <button className="primary" type="button" disabled={!draftId || !linkId} onClick={() => void mutate('/api/queue', { method: 'POST', body: JSON.stringify({ draftId, linkId, scheduledFor: new Date(when).toISOString() }) }, props, 'Added to the queue.').catch((reason: unknown) => props.notify(reason instanceof Error ? reason.message : 'Not queued'))}>Add to queue</button>
          </div>
        )}
      </section>
      <section className="panel">
        <h2>Upcoming</h2>
        {props.workspace.posts.length === 0 ? <p className="empty">The publishing queue is empty.</p> : (
          <ul className="list">
            {props.workspace.posts.map((post) => (
              <li key={post.id}>{formatWhen(post.scheduledFor)} · {post.platform} · {post.status}{post.providerUrl ? ` · ${post.providerUrl}` : ''}{post.errorSummary ? ` · ${post.errorSummary}` : ''}</li>
            ))}
          </ul>
        )}
      </section>
      {props.workspace.jobs.map((job) => (
        <div key={job.id} className="grid">
          <ProgressBlock job={job} />
          <div className="row-actions">
            <button className="ghost" type="button" onClick={() => void mutate(`/api/jobs/${job.id}/pause`, { method: 'POST' }, props)}>Pause job</button>
            <button className="ghost" type="button" onClick={() => void mutate(`/api/jobs/${job.id}/resume`, { method: 'POST' }, props).catch((reason: unknown) => props.notify(reason instanceof Error ? reason.message : 'Could not resume'))}>Resume job</button>
            <button className="ghost" type="button" onClick={() => void mutate(`/api/jobs/${job.id}/cancel`, { method: 'POST' }, props)}>Cancel job</button>
            <button className="ghost" type="button" onClick={() => void mutate(`/api/jobs/${job.id}/retry`, { method: 'POST' }, props).catch((reason: unknown) => props.notify(reason instanceof Error ? reason.message : 'Nothing to retry'))}>Retry failed</button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function AnalyticsScreen(props: ScreenProps) {
  const counts = new Map<string, number>()
  for (const post of props.workspace.posts) counts.set(post.status, (counts.get(post.status) ?? 0) + 1)
  for (const draft of props.workspace.drafts) counts.set(draft.status, (counts.get(draft.status) ?? 0) + 1)
  return (
    <div className="grid">
      <div className="banner">Reach, likes, and trading outcomes stay blank until a connected provider returns them. This page does not infer price impact.</div>
      <div className="grid cards">
        {[...counts.entries()].map(([status, count]) => <article className="card" key={status}><h2>{status}</h2><p className="stat">{count}</p></article>)}
        {counts.size === 0 ? <p className="empty">No posts or drafts to count yet.</p> : null}
      </div>
      <section className="panel">
        <h2>Provider metrics</h2>
        <p>Not reported by a provider.</p>
        <button className="ghost" type="button" onClick={() => void fetch('/api/report', { credentials: 'same-origin' }).then((response) => response.blob()).then((blob) => {
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = 'campaign-report.md'
          anchor.click()
          URL.revokeObjectURL(url)
        })}>Download report</button>
      </section>
    </div>
  )
}

export function IntegrationsScreen(props: ScreenProps) {
  return (
    <div className="grid cards">
      {props.workspace.integrations.map((item) => (
        <article className="card" key={item.platform}>
          <h2>{item.name}</h2>
          <p><span className={item.state === 'connected' ? 'status ok' : 'status warn'}>{item.state === 'unavailable' ? 'Integration unavailable' : item.state === 'connected' ? 'Connected' : 'Connect account'}</span></p>
          <p>{item.detail}</p>
          {item.missingEnv.length > 0 ? <p className="hint">Environment: {item.missingEnv.join(', ')}</p> : null}
          <p className="hint">{ADAPTERS.find((adapter) => adapter.platform === item.platform)?.summary}</p>
          <div className="row-actions">
            {item.platform === 'telegram' && item.state !== 'connected' ? <button className="primary" type="button" onClick={() => void mutate('/api/integrations/telegram/connect', { method: 'POST' }, props, 'Telegram bot connected.').catch((reason: unknown) => props.notify(reason instanceof Error ? reason.message : 'Integration unavailable'))}>Connect account</button> : null}
            {item.platform !== 'telegram' ? <button className="ghost" type="button" onClick={() => void mutate(`/api/integrations/${item.platform}/connect`, { method: 'POST' }, props).catch((reason: unknown) => props.notify(reason instanceof Error ? reason.message : 'Integration unavailable'))}>Connect account</button> : null}
            {props.workspace.accounts.filter((account) => account.platform === item.platform && account.status === 'authorized').map((account) => (
              <button key={account.id} className="ghost" type="button" onClick={() => void mutate(`/api/integrations/${account.id}/disconnect`, { method: 'POST' }, props, 'Disconnected. Revoke the token at the provider if you want it invalidated there.')}>Disconnect {account.label}</button>
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}

export function SettingsScreen(props: ScreenProps) {
  const [timezone, setTimezone] = useState(props.workspace.settings.timezone)
  const [password, setPassword] = useState('')
  const quiet = props.workspace.settings.quietHours
  return (
    <div className="grid">
      <section className="panel">
        <h2>Workspace</h2>
        <div className="fields">
          <Field label="Default timezone"><input value={timezone} onChange={(event) => setTimezone(event.target.value)} /></Field>
          <button className="ghost" type="button" onClick={() => void mutate('/api/settings', { method: 'PATCH', body: JSON.stringify({ timezone, quietHours: quiet }) }, props, 'Settings saved.')}>Save settings</button>
          <p className="hint">Quiet hours {quiet.enabled ? 'on' : 'off'} {quiet.start}–{quiet.end}. The queue rejects times inside that window.</p>
        </div>
      </section>
      <section className="panel">
        <h2>Export and delete</h2>
        <p className="hint">Exports omit API tokens and mask private invite links. Deleting clears campaigns, drafts, uploads, and connections, then loads the reference library again.</p>
        <div className="row-actions">
          <button className="ghost" type="button" onClick={() => void fetch('/api/links.csv', { credentials: 'same-origin' }).then((response) => response.blob()).then((blob) => {
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = 'link-library.csv'
            anchor.click()
            URL.revokeObjectURL(url)
          })}>Export links</button>
        </div>
        <Field label="Confirm with the owner password">
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </Field>
        <button className="danger" type="button" onClick={() => void mutate('/api/reset', { method: 'POST', body: JSON.stringify({ password }) }, props, 'Workspace reset.').catch((reason: unknown) => props.notify(reason instanceof Error ? reason.message : 'Reset failed'))}>Delete workspace data</button>
      </section>
      <section className="panel">
        <h2>Recent activity</h2>
        <ul className="list">
          {props.workspace.audit.map((event) => <li key={event.id}>{formatWhen(event.at)} · {event.summary}</li>)}
          {props.workspace.audit.length === 0 ? <li>No activity yet.</li> : null}
        </ul>
      </section>
    </div>
  )
}

export function AddLinksDialog(props: ScreenProps & { onClose: () => void }) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState<LinkCategory>('research')
  return (
    <Dialog title="Add links" onClose={props.onClose}>
      <p className="hint">Paste one URL or handle per line. New records default to research unless you choose another category. Verification is never inferred from the URL.</p>
      <Field label="Links"><textarea value={text} onChange={(event) => setText(event.target.value)} /></Field>
      <Field label="Category">
        <select value={category} onChange={(event) => setCategory(event.target.value as LinkCategory)}>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </Field>
      <button className="primary" type="button" onClick={() => void workspaceRequest('/api/links/import', { method: 'POST', body: JSON.stringify({ text, category, tags: ['manual'] }) }).then((result) => {
        props.replaceWorkspace(result.workspace)
        props.notify('Links added. Exact duplicates were merged.')
        props.onClose()
      }).catch((reason: unknown) => props.notify(reason instanceof Error ? reason.message : 'Import failed'))}>Import</button>
    </Dialog>
  )
}
