import { useEffect, useState, type ReactNode } from 'react'
import { estimateRemainingMs, jobProgress } from './domain/progress'
import type { PublishJob } from './domain/types'
import { formatDuration } from './format'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small className="hint">{hint}</small> : null}
    </label>
  )
}

export function ProgressBlock({ job }: { job: PublishJob }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (job.status === 'completed' || job.status === 'canceled') return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [job.status])
  const progress = jobProgress(job.tasks)
  const elapsed = job.startedAt ? now - Date.parse(job.startedAt) : 0
  const remaining = job.startedAt ? estimateRemainingMs(progress.completed, progress.total, elapsed) : null
  const revised = job.planTotal !== progress.total
  return (
    <article className="panel" aria-label={`${job.kind} progress`}>
      <h3>{job.kind === 'preparation' ? 'Campaign preparation' : 'Publishing'} · {job.status}</h3>
      {progress.indeterminate ? (
        <p>Waiting for platform response. The total number of tasks is not known yet.</p>
      ) : (
        <>
          <div
            className="meter"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent ?? 0}
            aria-label={`${progress.completed} of ${progress.total} tasks`}
          >
            <span style={{ width: `${progress.percent ?? 0}%` }} />
          </div>
          <p>
            <strong>{progress.percent}%</strong> · {progress.completed} of {progress.total}
            {progress.currentStep ? ` · ${progress.currentStep}` : ''}
          </p>
        </>
      )}
      {progress.waitingOnProvider ? <p>Waiting for platform response.</p> : null}
      {revised ? <p>Plan revised: {progress.total} tasks.</p> : null}
      <p className="hint">
        {job.startedAt ? `Elapsed ${formatDuration(Math.max(0, elapsed))}. ` : 'Not started. '}
        {remaining === null ? 'Remaining time is unavailable until at least two tasks finish.' : `About ${formatDuration(remaining)} remaining.`}
      </p>
      <p className="hint">
        Succeeded {progress.breakdown.succeeded}, failed {progress.breakdown.failed}, skipped {progress.breakdown.skipped}, canceled {progress.breakdown.canceled}.
      </p>
      <ul className="list">
        {job.tasks.map((task) => (
          <li key={task.id}>
            <strong>{task.label}</strong> · {task.status}
            {task.waitingOnProvider && task.status === 'running' ? ' · Waiting for platform response' : ''}
            {task.logs.length > 0 ? <div className="hint">{task.logs[task.logs.length - 1]?.message}</div> : null}
          </li>
        ))}
      </ul>
    </article>
  )
}

export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="dialog-back" role="presentation" onMouseDown={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}
