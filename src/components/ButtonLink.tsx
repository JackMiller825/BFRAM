import type { MouseEvent, ReactNode } from 'react'

type Variant = 'primary' | 'secondary'

export function ButtonLink({
  href,
  variant = 'primary',
  children,
  className = '',
  onClick,
}: {
  href: string
  variant?: Variant
  children: ReactNode
  className?: string
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <a className={`btn btn-${variant} ${className}`.trim()} href={href} onClick={onClick}>
      {children}
    </a>
  )
}
