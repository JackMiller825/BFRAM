import type { ReactNode } from 'react'
import type { LinkState } from '../config/token'

export function ExternalLink({
  link,
  icon,
  className = '',
}: {
  link: LinkState
  icon?: ReactNode
  className?: string
}) {
  if (!link.available) {
    return (
      <button type="button" className={`btn btn-disabled ${className}`.trim()} disabled>
        {icon}
        <span>{link.pendingLabel}</span>
      </button>
    )
  }

  return (
    <a className={`btn btn-external ${className}`.trim()} href={link.href} target="_blank" rel="noopener noreferrer">
      {icon}
      <span>{link.label}</span>
    </a>
  )
}
