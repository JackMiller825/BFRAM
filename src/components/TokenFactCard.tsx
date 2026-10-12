import type { ReactNode } from 'react'

export function TokenFactCard({
  label,
  value,
  icon,
  accent = 'orange',
}: {
  label: string
  value: string
  icon: ReactNode
  accent?: 'orange' | 'teal'
}) {
  return (
    <article className={`fact-card accent-${accent}`}>
      <div className="fact-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <h3>{label}</h3>
        <p>{value}</p>
      </div>
    </article>
  )
}
