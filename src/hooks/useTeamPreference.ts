import { useState } from 'react'

export type Team = 'buffalo' | 'ram'

const STORAGE_KEY = 'bfram-team'

function readStoredTeam(): Team | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'buffalo' || stored === 'ram') return stored
  } catch {
    // Storage can be blocked. The selector still works for this visit.
  }
  return null
}

export function useTeamPreference(): { team: Team | null; choose: (team: Team) => void } {
  const [team, setTeam] = useState<Team | null>(readStoredTeam)

  function choose(next: Team) {
    setTeam(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Keep the in-memory choice when storage is unavailable.
    }
  }

  return { team, choose }
}
