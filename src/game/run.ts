import { deck, next, type Card, type Seat } from './cards'
import { newDeal, type Deal } from './deal'
import { type Build, type Kibic } from './effects'
import { defaultRules, type Rules } from './rules'
import { scoreDeal, type Score } from './scoring'
import { describe, equip, itemKey, stock, type Item } from './shop'

export const stages = [
  { name: 'A söntés', target: 145, deals: 2, reward: 4, boss: false },
  { name: 'A törzsasztal', target: 320, deals: 3, reward: 5, boss: false },
  { name: 'A hátsó asztal', target: 440, deals: 3, reward: 8, boss: true },
] as const
export type Run = {
  phase: 'deal' | 'summary' | 'shop' | 'won' | 'lost'
  stage: number
  total: number
  used: number
  coins: number
  opener: Seat
  seed: number
  build: Build
  deal: Deal
  last: Score | null
  stock: Item[]
}

export function newRun(seed: number, rules: Rules = defaultRules): Run {
  const [deal, cursor] = newDeal(seed, 0, rules)
  return { phase: 'deal', stage: 0, total: 0, used: 0, opener: 0, coins: 2, seed: cursor,
    build: { kibicek: ['fox'], enhancements: {}, upgrades: { parti: 0, ulti: 0, betli: 0 }, shieldUsed: false },
    deal, last: null, stock: [] }
}

export function withDeal(run: Run, deal: Deal): Run {
  if (run.phase !== 'deal' || deal === run.deal) return run
  if (deal.phase !== 'done') return { ...run, deal }
  const { updated, seed, ...last } = scoreDeal(deal, run.build, run.seed, stages[run.stage].boss)
  return { ...run, deal, phase: 'summary', last, seed, build: updated,
    total: run.total + last.score, used: run.used + 1, coins: run.coins + last.coins }
}

export function leaveSummary(run: Run): Run {
  if (run.phase !== 'summary') return run
  const stage = stages[run.stage]
  const cleared = run.total >= stage.target
  if (cleared && run.stage === stages.length - 1) return { ...run, phase: 'won', coins: run.coins + stage.reward }
  if (!cleared && run.used >= stage.deals) return { ...run, phase: 'lost' }
  const [items, seed] = stock(run.build, run.seed)
  return { ...run, phase: 'shop', stock: items, seed, coins: run.coins + (cleared ? stage.reward : 0) }
}

export function buy(run: Run, item: Item, target?: Card['id']): Run {
  if (run.phase !== 'shop' || !run.stock.some(offer => itemKey(offer) === itemKey(item))) return run
  if (item.type === 'enhancement' && !deck.some(card => card.id === target)) return run
  const { price } = describe(item)
  if (run.coins < price) return run
  const build = equip(run.build, item, target)
  return build ? { ...run, build, coins: run.coins - price, stock: run.stock.filter(offer => itemKey(offer) !== itemKey(item)) } : run
}

export function dismiss(run: Run, id: Kibic): Run {
  return run.phase === 'shop' && run.build.kibicek.includes(id)
    ? { ...run, build: { ...run.build, kibicek: run.build.kibicek.filter(k => k !== id) } } : run
}

export function nextDeal(run: Run): Run {
  if (run.phase !== 'shop') return run
  const cleared = run.total >= stages[run.stage].target
  const opener = next(run.opener)
  const [deal, seed] = newDeal(run.seed, opener, run.deal.rules)
  return { ...run, phase: 'deal', stage: run.stage + Number(cleared), used: cleared ? 0 : run.used,
    total: cleared ? 0 : run.total, opener, deal, seed, stock: [], last: null }
}
