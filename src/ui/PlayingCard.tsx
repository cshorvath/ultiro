import { cardName, names, type Card } from '../game/cards'
import { enhancements, type Enhancement } from '../game/effects'
import { tellBackUrl, tellFaceUrl } from './tellDeck'

export function BrandMark() {
  return <svg viewBox="0 0 40 40" aria-hidden="true" className="brand-mark">
    <path d="M20 33C11 26 4 20 4 13 4 5 14 3 20 10c6-7 16-5 16 3 0 7-7 13-16 20Z" />
  </svg>
}

export function CardBacks({ count, talon = false }: { count: number; talon?: boolean }) {
  return <span aria-hidden="true" className={`backs${talon ? ' talon' : ''}`}>
    {Array.from({ length: count }, (_, i) => <img key={i} src={tellBackUrl} alt="" width={181} height={293} draggable={false} />)}
  </span>
}

export function PlayingCard({ card, index, enhancement, selected, legal, onClick }: {
  card: Card; index?: number; enhancement?: Enhancement; selected?: boolean; legal?: boolean; onClick?: () => void
}) {
  const face = <>
    <img className="card-art" src={tellFaceUrl(card)} alt="" width={181} height={293} draggable={false} />
    <span className="card-foot">{card.rank} · {names[card.suit]}</span>
    {enhancement && <span className="card-enhancement">{enhancements[enhancement].name}</span>}
    {index !== undefined && index < 10 && <kbd aria-hidden="true">{(index + 1) % 10}</kbd>}
  </>
  const label = `${cardName(card)}${enhancement ? ` · ${enhancements[enhancement].name}` : ''}`
  const cls = `card ${card.suit}${selected ? ' selected' : ''}${legal === false ? ' dim' : ''}${enhancement ? ` ${enhancement}` : ''}`
  return onClick
    ? <button className={cls} aria-label={label} title={label} disabled={legal === false} aria-pressed={selected} onClick={onClick}>{face}</button>
    : <div className={cls} role="img" aria-label={label} title={label}>{face}</div>
}
