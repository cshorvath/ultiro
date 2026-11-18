import { cardPoints, suits, type Card, type Seat, type Suit } from './cards'
import type { Trick } from './rules'

export type Contract = 'parti' | 'ulti' | 'betli'
export type Bid =
  | { kind: 'parti' | 'ulti'; trump: Suit; doubled: boolean }
  | { kind: 'betli'; trump: null; doubled: boolean }
export type Declaration = Bid & { declarer: Seat }
export const contractNames: Record<Contract, string> = { parti: 'Parti', ulti: 'Ulti', betli: 'Betli' }
export const bids: Bid[] = [
  ...suits.flatMap((trump): Bid[] => [
    { kind: 'parti', trump, doubled: trump === 'piros' },
    { kind: 'ulti', trump, doubled: trump === 'piros' },
  ]),
  { kind: 'betli', trump: null, doubled: false },
  { kind: 'betli', trump: null, doubled: true },
]
export const bidRank = (bid: Bid) =>
  ({ parti: 1, ulti: 3, betli: 4 })[bid.kind] + (bid.doubled ? (bid.kind === 'parti' ? 1 : 2) : 0)

export function marriages(hand: readonly Card[], trump: Suit | null): number {
  return trump === null ? 0 : suits.reduce((sum, suit) =>
    hand.some(c => c.suit === suit && c.rank === 'K') && hand.some(c => c.suit === suit && c.rank === 'F')
      ? sum + (suit === trump ? 40 : 20) : sum, 0)
}

export type ContractResult = {
  components: { kind: Contract; success: boolean }[]
  declarerPoints: number | null
  defenderPoints: number | null
  declarerTricks: number
}

export function evaluate(declaration: Declaration, tricks: readonly Trick[], talon: readonly Card[], announced: readonly number[]): ContractResult {
  if (tricks.length !== 10) throw new Error('Contract evaluation requires ten tricks')
  const { declarer, trump, kind } = declaration
  const won = tricks.filter(trick => trick.winner === declarer).length
  if (kind === 'betli') {
    return { components: [{ kind, success: won === 0 }], declarerPoints: null, defenderPoints: null, declarerTricks: won }
  }
  let declarerPoints = announced[declarer]
  let defenderPoints = announced.reduce((sum, value, seat) => seat === declarer ? sum : sum + value, 0)
    + talon.reduce((sum, card) => sum + cardPoints(card), 0)
  for (const [i, trick] of tricks.entries()) {
    const points = trick.plays.reduce((sum, play) => sum + cardPoints(play.card), i === 9 ? 10 : 0)
    if (trick.winner === declarer) declarerPoints += points
    else defenderPoints += points
  }
  const components: ContractResult['components'] = [
    { kind: 'parti', success: won === 10 || (won > 0 && declarerPoints > defenderPoints) },
  ]
  if (kind === 'ulti') {
    const last = tricks[9]
    components.push({ kind, success: last.winner === declarer &&
      last.plays.some(play => play.seat === declarer && play.card.suit === trump && play.card.rank === 'VII') })
  }
  return { components, declarerPoints, defenderPoints, declarerTricks: won }
}
