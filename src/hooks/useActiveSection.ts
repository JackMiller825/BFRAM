import { useEffect, useState } from 'react'

export const SECTION_IDS = ['top', 'story', 'token', 'how-to-buy', 'community', 'faq'] as const

export type SectionId = (typeof SECTION_IDS)[number]

function readHash(): SectionId {
  const id = window.location.hash.replace(/^#/, '')
  return SECTION_IDS.includes(id as SectionId) ? (id as SectionId) : 'top'
}

export function useActiveSection(): SectionId {
  const [active, setActive] = useState<SectionId>('top')

  useEffect(() => {
    let frame = 0

    const update = () => {
      const boxes = SECTION_IDS.map((id) => {
        const el = document.getElementById(id)
        const rect = el?.getBoundingClientRect()
        return { id, top: rect?.top ?? Number.POSITIVE_INFINITY, height: rect?.height ?? 0 }
      })

      if (boxes.every((box) => box.height === 0)) {
        setActive(readHash())
        return
      }

      const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 80
      const marker = header + 140
      let current: SectionId = 'top'
      for (const box of boxes) {
        if (box.top <= marker) current = box.id
      }
      setActive(current)
    }

    const onChange = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onChange, { passive: true })
    window.addEventListener('hashchange', onChange)
    window.addEventListener('resize', onChange)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onChange)
      window.removeEventListener('hashchange', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [])

  return active
}
