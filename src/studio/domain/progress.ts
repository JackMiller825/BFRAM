import type { PublishTask, TaskStatus } from './types'

const TERMINAL = new Set<TaskStatus>(['succeeded', 'failed', 'skipped', 'canceled'])

export interface ProgressBreakdown {
  succeeded: number
  failed: number
  skipped: number
  canceled: number
  pending: number
  running: number
}

export interface JobProgress {
  completed: number
  total: number
  percent: number | null
  indeterminate: boolean
  waitingOnProvider: boolean
  done: boolean
  currentStep: string | null
  breakdown: ProgressBreakdown
}

export function emptyBreakdown(): ProgressBreakdown {
  return { succeeded: 0, failed: 0, skipped: 0, canceled: 0, pending: 0, running: 0 }
}

export function jobProgress(tasks: Pick<PublishTask, 'status' | 'label' | 'waitingOnProvider'>[]): JobProgress {
  const breakdown = emptyBreakdown()
  for (const task of tasks) {
    if (task.status in breakdown) breakdown[task.status] += 1
  }
  const total = tasks.length
  const completed = breakdown.succeeded + breakdown.failed + breakdown.skipped + breakdown.canceled
  if (total === 0) {
    return {
      completed: 0,
      total: 0,
      percent: null,
      indeterminate: true,
      waitingOnProvider: false,
      done: false,
      currentStep: null,
      breakdown,
    }
  }
  const current = tasks.find((task) => task.status === 'running') ?? tasks.find((task) => task.status === 'pending')
  const waitingOnProvider = tasks.some((task) => task.status === 'running' && task.waitingOnProvider)
  return {
    completed,
    total,
    percent: completed === total ? 100 : Math.floor((completed / total) * 100),
    indeterminate: false,
    waitingOnProvider,
    done: completed === total,
    currentStep: current?.label ?? null,
    breakdown,
  }
}

export function compareProgress(
  previous: { completed: number; total: number },
  next: { completed: number; total: number },
): { revised: boolean; monotonic: boolean } {
  if (next.total !== previous.total) return { revised: true, monotonic: next.completed >= previous.completed }
  return { revised: false, monotonic: next.completed >= previous.completed && next.total === previous.total }
}

export function estimateRemainingMs(completed: number, total: number, elapsedMs: number): number | null {
  if (completed >= total && total > 0) return 0
  if (completed < 2 || elapsedMs < 1) return null
  const rate = completed / elapsedMs
  if (rate <= 0) return null
  return Math.round((total - completed) / rate)
}

export function isTerminalStatus(status: TaskStatus): boolean {
  return TERMINAL.has(status)
}
