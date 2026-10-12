import type { SVGProps } from 'react'

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props} />
  )
}

export function ArrowIcon() {
  return (
    <Icon>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Icon>
  )
}

export function SwapIcon() {
  return (
    <Icon>
      <path d="M7 7h11l-3-3" />
      <path d="M17 17H6l3 3" />
    </Icon>
  )
}

export function ChartIcon() {
  return (
    <Icon>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 14 4-4 3 2 5-6" />
    </Icon>
  )
}

export function ExplorerIcon() {
  return (
    <Icon>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M18 13v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </Icon>
  )
}

export function CopyIcon() {
  return (
    <Icon>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </Icon>
  )
}

export function TelegramIcon() {
  return (
    <Icon fill="currentColor" stroke="none">
      <path d="M21 4 2.8 11.2c-.9.4-.9 1.6.1 1.9l4.6 1.4 1.8 5.5c.2.7 1.1.9 1.6.4l2.6-2.5 4.8 3.5c.6.5 1.6.1 1.7-.7L22.2 5.2c.2-1-.8-1.8-1.2-1.2ZM9 14.2l8.8-6.7c.2-.2.5.1.3.3L10.6 16l-.2 3.2-1.4-5Z" />
    </Icon>
  )
}

export function XIcon() {
  return (
    <Icon fill="currentColor" stroke="none">
      <path d="M14.7 10.3 21.4 3h-1.6l-5.8 6.4L9.3 3H3.2l7 10.1L3.2 21h1.6l6.2-6.8 4.9 6.8h6.1l-7.3-10.7Zm-2.2 2.4-.7-1-5.7-7.8h2.4l4.6 6.3.7 1 6 8.2h-2.4l-4.9-6.7Z" />
    </Icon>
  )
}

export function CheckIcon() {
  return (
    <Icon>
      <path d="m5 12 5 5L20 7" />
    </Icon>
  )
}

export function UpIcon() {
  return (
    <Icon>
      <path d="m6 14 6-6 6 6" />
    </Icon>
  )
}

export function WalletIcon() {
  return (
    <Icon>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function EthIcon() {
  return (
    <Icon>
      <path d="m12 3 6 9-6 3-6-3 6-9Z" />
      <path d="m12 21 6-9-6 3-6-3 6 9Z" />
    </Icon>
  )
}

export function SearchIcon() {
  return (
    <Icon>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  )
}

export function LockIcon() {
  return (
    <Icon>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Icon>
  )
}

export function CoinIcon() {
  return (
    <Icon>
      <ellipse cx="12" cy="7" rx="7" ry="3" />
      <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
      <path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
    </Icon>
  )
}

export function SupplyIcon() {
  return (
    <Icon>
      <path d="M12 3v3" />
      <path d="M12 21a8 8 0 1 0-8-8" />
      <path d="M4 14h4v4" />
    </Icon>
  )
}

export function TaxIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v10" />
      <path d="M15 9.5c0-1-1.2-1.8-3-1.8s-3 .8-3 1.8 1.3 1.6 3 1.8 3 .8 3 1.8-1.2 1.8-3 1.8-3-.7-3-1.7" />
    </Icon>
  )
}

export function PeopleIcon() {
  return (
    <Icon>
      <circle cx="9" cy="9" r="3" />
      <circle cx="16" cy="10" r="2.2" />
      <path d="M4.5 18c.6-2.4 2.4-3.5 4.5-3.5s3.9 1.1 4.5 3.5" />
      <path d="M14 14.6c1.4-.3 2.6.1 3.4 1.1.7.8 1 1.6 1.1 2.3" />
    </Icon>
  )
}

export function DocumentIcon() {
  return (
    <Icon>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </Icon>
  )
}
