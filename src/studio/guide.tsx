import { useState } from 'react'
import { workspaceRequest } from './api'
import { DILIGENCE_ITEMS, STATUS_LABELS, nextStatus } from './domain/opportunities'
import type { OpportunityGroup, OpportunityStatus, PromotionOpportunity } from './domain/types'
import type { ScreenProps } from './screens'

const GROUPS: { id: OpportunityGroup | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'listing', label: 'Token data profiles' },
  { id: 'advertising', label: 'Ad and creator prospects' },
  { id: 'policy', label: 'Policy references' },
]

export function OpportunitiesScreen(props: ScreenProps) {
  const [group, setGroup] = useState<OpportunityGroup | 'all'>('all')
  const items = props.workspace.opportunities.filter((item) => group === 'all' || item.group === group)
  return (
    <div className="grid">
      <div className="banner">
        These are official forms, ad prospects, and policy pages. Nothing here is posted automatically, and a prepared application is not a submission.
      </div>
      <div className="row-actions">
        {GROUPS.map((item) => (
          <button key={item.id} className={group === item.id ? 'primary' : 'ghost'} type="button" onClick={() => setGroup(item.id)}>{item.label}</button>
        ))}
      </div>
      {items.map((item) => <OpportunityCard key={item.id} item={item} props={props} />)}
    </div>
  )
}

function OpportunityCard({ item, props }: { item: PromotionOpportunity; props: ScreenProps }) {
  const upcoming = nextStatus(item.status)
  function save(patch: Record<string, unknown>, message: string) {
    void workspaceRequest(`/api/opportunities/${item.id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      .then((result) => {
        props.replaceWorkspace(result.workspace)
        props.notify(message)
      })
      .catch((reason: unknown) => props.notify(reason instanceof Error ? reason.message : 'Could not update the opportunity.'))
  }
  return (
    <article className="panel">
      <h2>{item.name}</h2>
      <p>
        <span className={item.blocked ? 'status bad' : 'status warn'}>{item.blocked ? 'Blocked' : STATUS_LABELS[item.status]}</span>
        {' '}
        <span className="hint">{item.providerClaim === 'policy_reference' ? 'Policy reference' : 'Provider-reported until you verify it'}</span>
      </p>
      <p>{item.summary}</p>
      <p><a href={item.url} target="_blank" rel="noreferrer">{item.url}</a></p>
      {item.blocked ? <p className="banner bad">{item.blockReason}</p> : null}
      {item.group !== 'policy' ? (
        <fieldset>
          <legend>Due diligence</legend>
          {DILIGENCE_ITEMS.map(([key, label]) => (
            <label key={key} className="check">
              <input
                type="checkbox"
                checked={item.diligence[key]}
                onChange={(event) => save({ diligence: { [key]: event.target.checked } }, 'Checklist saved.')}
              />
              {label}
            </label>
          ))}
        </fieldset>
      ) : <p className="hint">Recheck this policy for the country and campaign type before any paid or automated action.</p>}
      <div className="fields">
        <BlurField label="Quoted cost, if the provider stated one" value={item.quotedCost} onSave={(quotedCost) => save({ quotedCost }, 'Cost note saved.')} />
        <BlurField label="Confirmation or reference number" value={item.referenceNumber} onSave={(referenceNumber) => save({ referenceNumber }, 'Reference saved.')} />
        <BlurField label="Eligibility notes" value={item.eligibilityNotes} multiline onSave={(eligibilityNotes) => save({ eligibilityNotes }, 'Notes saved.')} />
      </div>
      {item.group === 'advertising' ? (
        <label className="check">
          <input type="checkbox" checked={item.spendApproved} onChange={(event) => save({ spendApproved: event.target.checked }, event.target.checked ? 'Spend approved for this prospect.' : 'Spend approval removed.')} />
          I explicitly approve spend for this prospect. No wallet or seed phrase is involved.
        </label>
      ) : null}
      <div className="row-actions">
        {upcoming && !item.blocked ? <button className="primary" type="button" onClick={() => save({ status: upcoming }, statusMessage(upcoming))}>{advanceLabel(upcoming)}</button> : null}
        {item.status !== 'rejected' && item.status !== 'unreviewed' ? <button className="ghost" type="button" onClick={() => save({ status: 'rejected' }, 'Marked rejected.')}>Mark rejected</button> : null}
        {item.status !== 'expired' && item.status !== 'unreviewed' ? <button className="ghost" type="button" onClick={() => save({ status: 'expired' }, 'Marked expired.')}>Mark expired</button> : null}
      </div>
      {item.submittedAt ? <p className="hint">Owner recorded a submission at {item.submittedAt}.{item.referenceNumber ? ` Reference ${item.referenceNumber}.` : ''}</p> : <p className="hint">Not submitted. Preparing an application does not send it.</p>}
    </article>
  )
}

function BlurField(props: { label: string; value: string; multiline?: boolean; onSave: (value: string) => void }) {
  const [value, setValue] = useState(props.value)
  return (
    <label className="field">{props.label}
      {props.multiline
        ? <textarea value={value} onChange={(event) => setValue(event.target.value)} onBlur={() => { if (value !== props.value) props.onSave(value) }} />
        : <input value={value} onChange={(event) => setValue(event.target.value)} onBlur={() => { if (value !== props.value) props.onSave(value) }} />}
    </label>
  )
}

function advanceLabel(status: OpportunityStatus): string {
  if (status === 'owner_approved') return 'Approve for review'
  if (status === 'requirements_checked') return 'Mark requirements checked'
  if (status === 'application_prepared') return 'Mark application prepared'
  if (status === 'owner_submitted') return 'I submitted this myself'
  if (status === 'provider_confirmed') return 'Provider confirmed it'
  return STATUS_LABELS[status]
}

function statusMessage(status: OpportunityStatus): string {
  if (status === 'owner_submitted') return 'Recorded as submitted by you. The provider has not confirmed it.'
  if (status === 'provider_confirmed') return 'Recorded as provider-confirmed.'
  if (status === 'application_prepared') return 'Application marked prepared. It has not been submitted.'
  return 'Opportunity updated.'
}

export function HelpScreen() {
  return (
    <div className="grid">
      <section className="panel">
        <h2>What this workspace does</h2>
        <p>Token Campaign Studio turns token facts you supply into drafts you can review, approve, and export. Publishing happens only after you connect an account the platform itself authorizes, and only to a destination that account can post in.</p>
        <p>It does not send direct messages, reply to people, join groups, follow accounts, or post into channels just because a link is saved here. A public URL is a reference, not permission.</p>
      </section>
      <section className="panel">
        <h2>Open it</h2>
        <p>The workspace opens directly. There is no password. On the public site, your edits stay in this browser. On your own computer, <span className="mono">npm run studio</span> keeps the same workspace in <span className="mono">data/studio.json</span>.</p>
        <p>The public site cannot publish. A local server can publish to Telegram only after <span className="mono">TELEGRAM_BOT_TOKEN</span> is set and the bot is an administrator of a chat you verify.</p>
      </section>
      <section className="panel">
        <h2>1. Write the campaign</h2>
        <ol>
          <li>Open Campaigns and edit a brief, or create a new one.</li>
          <li>Enter the project name, ticker, chain, and links. Leave the contract blank until you know it, then mark it confirmed only when it is confirmed.</li>
          <li>Add the short and long descriptions, narrative, utility, tokenomics, risks, and disclosures. The form saves itself.</li>
          <li>Add news links with a publisher and a source type: primary, reliable report, or unverified.</li>
          <li>Read the claims checklist. Unsupported promises such as “100x” or guaranteed listings stay visible. Drafts leave those sentences out, and publishing stays blocked until you rewrite or remove them.</li>
          <li>Download the brief when you want a copy.</li>
        </ol>
        <p>Northwind Acorns is a fictional demo. BuffaRumble uses only facts already published on its site; unknown facts stay pending.</p>
      </section>
      <section className="panel">
        <h2>2. Keep links in the library</h2>
        <p>Use Add links on any screen. Paste one URL or handle per line, or import a CSV. Exact repeats merge and keep a duplicate count. The original text is kept.</p>
        <ul>
          <li><strong>Owned publishing account.</strong> A channel you control. It can be queued only after verified admin or OAuth access.</li>
          <li><strong>Authorized partner/paid placement.</strong> Needs budget approval, a sponsorship disclosure, and a verified destination.</li>
          <li><strong>Token listing/data profile, paid ad network, and creator/agency prospect.</strong> Research records. They never enter the publishing queue.</li>
          <li><strong>Research/reference and outreach prospect.</strong> Saved for context. They are not permission to post, mention, or message anyone.</li>
        </ul>
        <p>Invite links stay masked. The app does not join them. Post URLs are someone else’s messages, not places you can publish.</p>
      </section>
      <section className="panel">
        <h2>3. Review promotion opportunities</h2>
        <p>Opportunities are separate from the link library. They are official listing forms, unvetted ad prospects, and policy pages.</p>
        <ol>
          <li>Unreviewed.</li>
          <li>Owner approved.</li>
          <li>Requirements checked, after the due-diligence list.</li>
          <li>Application prepared. This still has not been sent.</li>
          <li>Owner submitted. Use this only after you actually submit it yourself.</li>
          <li>Provider confirmed, rejected, or expired. Confirmation requires a provider response, such as a reference number you record.</li>
        </ol>
        <p>Advertising prospects also need an explicit spend approval. The app will not connect a wallet or ask for a seed phrase. Services that offer wash trading, fake engagement, shill armies, message flooding, or guaranteed buyers are blocked, with a compliant alternative.</p>
        <p>Prices and eligibility are not stored as facts. Recheck the linked page before you pay or apply. CoinMarketCap listings go through its official form only; this app has no guaranteed-listing workflow.</p>
      </section>
      <section className="panel">
        <h2>4. Draft, review, and queue</h2>
        <ol>
          <li>Open a campaign and choose Prepare. Progress counts finished tasks only. 100% appears when every task has succeeded, failed, been skipped, or been canceled.</li>
          <li>In Content Studio, generate a template and edit the versions. Each factual line is marked confirmed, owner-provided, or unverified.</li>
          <li>Sponsored drafts need a disclosure before approval.</li>
          <li>Approve or reject each draft. Editing an approved draft sends it back to review.</li>
          <li>Calendar & Queue lists only approved drafts with a verified destination. Research and prospect links stay out.</li>
          <li>Pause all, or pause one platform, stops new publishing immediately.</li>
        </ol>
        <p>If a provider is not connected, use Copy or the export. The app will not mark that draft published.</p>
      </section>
      <section className="panel">
        <h2>5. Read the results</h2>
        <p>Analytics counts drafts and posts by status. Reach and engagement appear only when a provider API returns them. Nothing here claims that a post changed a token’s price. Download the report from Analytics, the link CSV from Settings, and delete the workspace from Settings when you want to start over.</p>
      </section>
    </div>
  )
}
