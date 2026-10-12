import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'
import { sectionHref } from '../config/paths'
import type { TokenConfig } from '../config/token'
import { useActiveSection, type SectionId } from '../hooks/useActiveSection'
import { BrandMark } from './BrandMark'
import { ButtonLink } from './ButtonLink'

const NAV_ITEMS: { id: SectionId; label: string; href: string }[] = [
  { id: 'story', label: 'Story', href: sectionHref('story') },
  { id: 'token', label: 'Tokenomics', href: sectionHref('token') },
  { id: 'how-to-buy', label: 'How to buy', href: sectionHref('how-to-buy') },
  { id: 'community', label: 'Community', href: sectionHref('community') },
]

export function Header({ config }: { config: TokenConfig }) {
  const active = useActiveSection()
  const menuId = useId()
  const headerRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      menuButtonRef.current?.focus()
    }

    function onPointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  function closeFromLink(event: MouseEvent<HTMLAnchorElement>) {
    setOpen(false)
    const hash = event.currentTarget.hash.replace(/^#/, '')
    const target = document.getElementById(hash)
    if (!target) return
    window.requestAnimationFrame(() => {
      target.focus()
    })
  }

  return (
    <header className="site-header" ref={headerRef}>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <div className="container header-bar">
        <a className="brand-link" href={sectionHref('top')} onClick={closeFromLink}>
          <BrandMark config={config} />
        </a>
        <button
          ref={menuButtonRef}
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Close menu' : 'Open menu'}
        </button>
        <nav id={menuId} className={open ? 'site-nav is-open' : 'site-nav'} aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              className="nav-link"
              href={item.href}
              aria-current={active === item.id ? 'location' : undefined}
              onClick={closeFromLink}
            >
              {item.label}
            </a>
          ))}
          <ButtonLink href={sectionHref('community')} className="nav-cta" onClick={closeFromLink}>
            Meet the herd
          </ButtonLink>
        </nav>
      </div>
    </header>
  )
}
