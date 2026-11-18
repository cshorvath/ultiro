import type { Card, Seat, Suit } from './cards'

export type Play = { seat: Seat; card: Card }
export type Trick = { plays: Play[]; winner: Seat }
export type LegalReason = 'lead' | 'follow' | 'trump' | 'discard' | 'overtake' | 'preserve'
export type Rules = { passesToClose: 2 | 3; protectTrumpSeven: boolean }
export const defaultRules: Rules = { passesToClose: 2, protectTrumpSeven: true }

const trumpRanks = ['VII', 'VIII', 'IX', 'A', 'F', 'K', 'X', 'Á']
const plainRanks = ['VII', 'VIII', 'IX', 'X', 'A', 'F', 'K', 'Á']
export const strength = (card: Card, trump: Suit | null) =>
  (trump ? trumpRanks : plainRanks).indexOf(card.rank)

export function beats(card: Card, incumbent: Card, trump: Suit | null): boolean {
  return card.suit === incumbent.suit
    ? strength(card, trump) > strength(incumbent, trump)
    : card.suit === trump
}

export function winningPlay(plays: readonly [Play, ...Play[]], trump: Suit | null): Play {
  return plays.slice(1).reduce((best, play) => beats(play.card, best.card, trump) ? play : best, plays[0])
}

export function legalMoves(hand: readonly Card[], trick: readonly Play[], trump: Suit | null, protectSeven = false) {
  const [lead, ...rest] = trick
  let cards = [...hand]
  let reason: LegalReason = 'lead'
  if (lead) {
    const followers = cards.filter(card => card.suit === lead.card.suit)
    const trumps = cards.filter(card => card.suit === trump)
    if (followers.length) {
      cards = followers
      reason = 'follow'
    } else if (trumps.length) {
      cards = trumps
      reason = 'trump'
    } else {
      reason = 'discard'
    }
    const winner = winningPlay([lead, ...rest], trump)
    const higher = cards.filter(card => beats(card, winner.card, trump))
    if (higher.length) {
      cards = higher
      reason = 'overtake'
    }
  }
  const withoutSeven = cards.filter(card => !(card.suit === trump && card.rank === 'VII'))
  if (protectSeven && withoutSeven.length && withoutSeven.length < cards.length) {
    cards = withoutSeven
    reason = 'preserve'
  }
  return { cards, reason }
}
