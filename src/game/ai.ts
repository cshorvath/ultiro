import { cardPoints, deck, next, suits, type Card, type Seat } from './cards'
import { bidRank, marriages, type Bid, type Declaration } from './contracts'
import { availableBids, bid, moves, pass, pickup, play, type Deal } from './deal'
import { beats, strength, winningPlay, type Play, type Trick } from './rules'

type View = {
  seat: Seat; hand: readonly Card[]; trick: readonly Play[]; history: readonly Trick[]
  declaration: Declaration; legal: readonly Card[]
}
type AuctionView = { hand: readonly Card[]; offers: readonly Bid[]; opening: boolean; pickedUp: boolean }
export type Strategy = {
  wantsTalon(view: AuctionView): boolean
  offer(view: AuctionView): { bid: Bid; discards: Card['id'][] } | null
  card(view: View): Card['id']
}

// Count top sequences, then credit the rest of a suit only if those winners
// can draw every outside card even when they are all in one opponent's hand.
function sweepPotential(hand: readonly Card[]) {
  return suits.reduce((total, suit) => {
    const ranks = hand.filter(card => card.suit === suit).map(card => strength(card, null)).sort((a, b) => b - a)
    let top = 0
    while (ranks[top] === 7 - top) top++
    return total + (top >= 8 - ranks.length ? ranks.length : top)
  }, 0)
}

function sweepOption(hand: readonly Card[]) {
  let best = { discards: [] as Card[], potential: sweepPotential(hand), rankSum: -1 }
  if (hand.length !== 12) return best
  best.potential = -1
  for (let i = 0; i < hand.length - 1; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      const kept = hand.filter((_, index) => index !== i && index !== j)
      const potential = sweepPotential(kept)
      const rankSum = kept.reduce((sum, card) => sum + strength(card, null), 0)
      if (potential > best.potential || (potential === best.potential && rankSum > best.rankSum)) {
        best = { discards: [hand[i], hand[j]], potential, rankSum }
      }
    }
  }
  return best
}

function candidates({ offers, hand }: AuctionView) {
  const sweep = offers.some(offer => offer.kind === 'durchmars') ? sweepOption(hand) : null
  return offers.map(offer => {
    if (offer.kind === 'durchmars' && sweep) return {
      bid: offer, discards: sweep.discards.map(card => card.id),
      merit: sweep.potential * 3, threshold: offer.doubled ? 30 : 27,
    }
    const discardCost = (card: Card) => offer.kind === 'betli'
      ? -strength(card, null) * 2 + (hand.filter(c => c.suit === card.suit).length === 1 ? -2 : 0)
      : strength(card, offer.trump) + cardPoints(card) / 2 + (card.suit === offer.trump ? 12 : 0)
        + (card.rank === 'K' || card.rank === 'F' ? 2 : 0)
    const discards = hand.length === 12 ? [...hand].sort((a, b) => discardCost(a) - discardCost(b)).slice(0, 2) : []
    const kept = hand.filter(card => !discards.includes(card))
    const trumps = kept.filter(card => card.suit === offer.trump)
    const high = kept.filter(card => card.rank === 'Á' || card.rank === 'X').length
    const seven = trumps.some(card => card.rank === 'VII')
    const parti = trumps.length * 2 + high + marriages(kept, offer.trump) / 12
    const betli = 14 - kept.reduce((sum, card) => sum + Math.max(0, strength(card, null) - 1), 0) / 2
      - suits.filter(suit => kept.filter(c => c.suit === suit).length >= 5).length * 3
    const merit = offer.kind === 'betli' ? betli + 1
      : offer.kind === 'ulti' ? parti + (seven && trumps.length >= 4 ? 1 : -18) : parti
    const threshold = (offer.kind === 'parti' ? 11 : offer.kind === 'ulti' ? 16 : 10) + (offer.doubled ? 2 : 0)
    return { bid: offer, discards: discards.map(card => card.id), merit, threshold }
  }).sort((a, b) => b.merit - a.merit || bidRank(a.bid) - bidRank(b.bid))
}

export const heuristic: Strategy = {
  wantsTalon(view) {
    return !!candidates(view).find(option => option.merit >= option.threshold - 1)
  },
  offer(view) {
    const options = candidates(view)
    return options.find(option => option.merit >= option.threshold)
      ?? (view.opening || view.pickedUp ? options.find(option => option.bid.kind !== 'durchmars') ?? options[0] : null)
  },
  card({ seat, hand, trick, history, declaration, legal }) {
    const { trump, kind, declarer } = declaration
    const [lead, ...rest] = trick
    const incumbent = lead && winningPlay([lead, ...rest], trump)
    const exposed = new Set([...history.flatMap(t => t.plays), ...trick].map(p => p.card.id))
    const missing = deck.filter(card => !exposed.has(card.id) && !hand.some(c => c.id === card.id))
    const voidIn = (player: Seat, suit: Card['suit']) => history.some(t => t.plays[0].card.suit === suit &&
      t.plays.some(p => p.seat === player && p.card.suit !== suit))
    const value = (card: Card) => {
      const rank = strength(card, trump)
      const wins = incumbent && beats(card, incumbent.card, trump)
      if (kind === 'betli') {
        if (seat === declarer) {
          if (!lead) return -rank * 3 - hand.filter(c => c.suit === card.suit).length
          return (wins ? -20 : 20) + rank
        }
        if (!lead) {
          const danger = missing.filter(c => c.suit === card.suit && strength(c, trump) > rank).length
          return (voidIn(declarer, card.suit) ? -20 : 0) + danger * 3 - rank
        }
        if (incumbent.seat === declarer && wins) return -20 - rank
        return wins && next(seat) === declarer ? 10 - rank * 2 : -rank
      }
      if (kind === 'durchmars') {
        const suitOutside = missing.filter(c => c.suit === card.suit)
        const top = !suitOutside.some(c => strength(c, null) > rank)
        if (seat === declarer) {
          // Cash a long suit of high cards first to promote its lower cards.
          const length = hand.filter(c => c.suit === card.suit).length
          return (!incumbent || wins ? 30 : 0) + (top ? 20 + length : 0) + rank
        }
        // A single defending trick is enough; keep high off-suit stoppers.
        if (!incumbent || wins) return 30 + (top || trick.length === 2 ? 20 : 0) + rank
        return -rank
      }
      if (!lead) {
        const top = !missing.some(c => c.suit === card.suit && strength(c, trump) > rank)
        return (top ? 12 : 0) + (card.suit === trump ? (seat === declarer ? 5 : kind === 'ulti' ? 8 : -6) : 0)
          + rank - (top ? 0 : cardPoints(card) / 3)
      }
      const teammateWinning = seat !== declarer && incumbent.seat !== declarer
      const pot = trick.reduce((sum, p) => sum + cardPoints(p.card), 0)
      if (!wins) return teammateWinning && trick.length === 2 ? cardPoints(card) - rank : -rank - cardPoints(card)
      const secure = trick.length === 2 || !missing.some(c => c.suit === card.suit && strength(c, trump) > rank)
      return 20 + (secure ? 6 + pot / 3 + cardPoints(card) / 3 : 0) - rank
    }
    return [...legal].sort((a, b) => value(b) - value(a))[0].id
  },
}

export function aiTurn(deal: Deal, strategy: Strategy = heuristic): Deal {
  if (deal.phase === 'auction') {
    const view = (d: Deal): AuctionView => ({
      hand: d.hands[d.turn], offers: availableBids(d), opening: !d.declaration, pickedUp: d.pickedUp,
    })
    if (!deal.declaration || (!deal.pickedUp && strategy.wantsTalon(view(deal)))) deal = pickup(deal)
    const offer = strategy.offer(view(deal))
    return offer ? bid(deal, offer.bid, offer.discards) : pass(deal)
  }
  const legal = moves(deal)
  return legal && deal.declaration ? play(deal, strategy.card({
    seat: deal.turn, hand: deal.hands[deal.turn], declaration: deal.declaration, trick: deal.trick,
    history: deal.tricks, legal: legal.cards,
  })) : deal
}
