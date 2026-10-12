import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PublishJob } from './domain/types'
import { ProgressBlock } from './widgets'

function job(statuses: PublishJob['tasks'][number]['status'][]): PublishJob {
  return {
    id: 'job_1',
    campaignId: 'camp_demo',
    kind: 'publishing',
    status: 'running',
    createdAt: '2026-10-12T15:00:00.000Z',
    startedAt: '2026-10-12T15:00:00.000Z',
    finishedAt: null,
    planRevision: 1,
    planTotal: statuses.length,
    tasks: statuses.map((status, index) => ({
      id: `task_${index}`,
      idempotencyKey: `key_${index}`,
      label: status === 'running' ? 'Publish to Telegram' : 'Validate',
      platform: 'telegram',
      kind: 'publish',
      status,
      attempts: 0,
      maxAttempts: 3,
      errorClass: null,
      errorSummary: null,
      waitingOnProvider: status === 'running',
      scheduledPostId: null,
      result: null,
      logs: [],
      nextAttemptAt: null,
    })),
  }
}

describe('progress panel', () => {
  it('shows the completed ratio and waits without a fake percentage', () => {
    const { rerender } = render(<ProgressBlock job={job(['succeeded', 'running'])} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByText(/50%/)).toBeInTheDocument()
    expect(screen.getByText(/1 of 2/)).toBeInTheDocument()
    expect(screen.getByText('Waiting for platform response.')).toBeInTheDocument()

    rerender(<ProgressBlock job={{ ...job([]), tasks: [], planTotal: 0 }} />)
    expect(screen.getByText(/Waiting for platform response. The total number of tasks is not known yet./)).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
