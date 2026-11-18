import { names, type Suit } from '../game/cards'

export function SuitSymbol({ suit, decorative = false }: { suit: Suit; decorative?: boolean }) {
  return <svg viewBox="0 0 24 24" className={`suit-symbol ${suit}`} focusable="false"
    role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : names[suit]} aria-hidden={decorative || undefined}>
    {suit === 'piros' && <path d="M12 21C7 17 2 13 2 8a5.2 5.2 0 0 1 10-2 5.2 5.2 0 0 1 10 2c0 5-5 9-10 13Z" />}
    {suit === 'tok' && <>
      <path d="M12 6c7-3 11 3 10 8-1 6-6 7-10 6-4 1-9 0-10-6C1 9 5 3 12 6Z" />
      <path d="M12 7c0-2 1-4 3-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 9c-2 3-2 6 0 9m8-9c2 3 2 6 0 9" className="suit-detail" />
    </>}
    {suit === 'zold' && <>
      <path d="M4 18C2 10 10 5 21 3c1 12-6 18-14 17l-3 3-2-2Z" />
      <path d="m6 18 11-10m-8 7-1-4m5 1 4 1" className="suit-detail" />
    </>}
    {suit === 'makk' && <>
      <path d="M5 13h14c0 5-3 8-7 10-4-2-7-5-7-10ZM3 10c0-4 4-6 8-6V1h2v3c4 0 8 2 8 6v2H3Z" />
      <path d="m6 8 3 2 3-3 3 3 3-2" className="suit-detail" />
    </>}
  </svg>
}
