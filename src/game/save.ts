import { deck, seats } from './cards'
import { kibicek } from './effects'
import { stages, type Run } from './run'

export const saveKey = 'ultiro.run.v1'
export const encode = (run: Run) => JSON.stringify({ version: 1, run })

export function decode(raw: string | null): Run | null {
  try {
    if (!raw) return null
    const { version, run } = JSON.parse(raw) as { version: number; run: Run }
    if (version !== 1 || !run || !Number.isInteger(run.stage) || !stages[run.stage]
      || !['deal', 'summary', 'shop', 'won', 'lost'].includes(run.phase)
      || ![run.total, run.used, run.coins, run.seed].every(Number.isFinite)
      || !seats.includes(run.opener) || !seats.includes(run.deal.turn)
      || !['auction', 'play', 'done'].includes(run.deal.phase)
      || !Array.isArray(run.deal.auction) || !Array.isArray(run.deal.announced)
      || ![2, 3].includes(run.deal.rules.passesToClose)
      || !run.build.kibicek.every(id => Object.hasOwn(kibicek, id)) || !Array.isArray(run.stock)
      || ((run.phase === 'deal') === (run.deal.phase === 'done'))
      || (run.phase === 'summary' && !run.last)) return null
    const { hands, talon, trick, tricks } = run.deal
    if (hands.length !== 3) return null
    const cards = [...hands.flat(), ...talon, ...trick.map(p => p.card), ...tricks.flatMap(t => t.plays.map(p => p.card))]
    if (cards.length !== 32 || new Set(cards.map(card => card.id)).size !== 32 ||
      cards.some(card => !deck.some(c => c.id === card.id && c.rank === card.rank && c.suit === card.suit))) return null
    run.build.upgrades.durchmars ??= 0
    return run
  } catch {
    return null
  }
}
