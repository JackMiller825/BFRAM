import type { ReactNode } from 'react'

export function Section({
  id,
  className,
  labelledBy,
  children,
}: {
  id: string
  className: string
  labelledBy: string
  children: ReactNode
}) {
  return (
    <section id={id} className={`section ${className}`} aria-labelledby={labelledBy} tabIndex={-1}>
      <div className="container">{children}</div>
    </section>
  )
}
