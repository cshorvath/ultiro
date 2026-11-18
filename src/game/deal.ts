import { next, shuffled, type Card, type Seat } from './cards'
import { bidRank, bids, marriages, type Bid, type Declaration } from './contracts'
import { defaultRules, legalMoves, winningPlay, type Play, type Rules, type Trick } from './rules'

export type AuctionEvent = { seat: Seat; bid: Bid | null }
export type Deal = {
  phase: 'auction' | 'play' | 'done'
  hands: [Card[], Card[], Card[]]
  talon: Card[]
  turn: Seat
  declaration: Declaration | null
  passes: number
  pickedUp: boolean
  auction: AuctionEvent[]
  trick: Play[]
  tricks: Trick[]
  announced: [number, number, number]
  rules: Rules
}

export function newDeal(seed: number, opener: Seat, rules = defaultRules): [Deal, number] {
  const [cards, cursor] = shuffled(seed)
  const hands: Deal['hands'] = [[], [], []]
  hands[opener] = cards.slice(0, 10)
  hands[next(opener)] = cards.slice(10, 20)
  hands[next(next(opener))] = cards.slice(20, 30)
  return [{
    phase: 'auction', hands, talon: cards.slice(30), turn: opener, declaration: null,
    passes: 0, pickedUp: false, auction: [], trick: [], tricks: [], announced: [0, 0, 0], rules,
  }, cursor]
}

export function availableBids(deal: Deal): Bid[] {
  const incumbent = deal.declaration
  return deal.phase !== 'auction' ? [] : bids.filter(bid => !incumbent || bidRank(bid) > bidRank(incumbent))
}

export function pickup(deal: Deal): Deal {
  if (deal.pickedUp || !availableBids(deal).length) return deal
  const hands: Deal['hands'] = [...deal.hands]
  hands[deal.turn] = [...hands[deal.turn], ...deal.talon]
  return { ...deal, hands, talon: [], pickedUp: true }
}

export function bid(deal: Deal, offer: Bid, discards: readonly Card['id'][] = []): Deal {
  const legal = availableBids(deal).find(b =>
    b.kind === offer.kind && b.trump === offer.trump && b.doubled === offer.doubled)
  if (!legal || (!deal.declaration && !deal.pickedUp)) return deal
  const hand = deal.hands[deal.turn]
  const replaced = hand.filter(card => discards.includes(card.id))
  if (deal.pickedUp ? discards.length !== 2 || replaced.length !== 2 : discards.length !== 0) return deal
  const hands: Deal['hands'] = [...deal.hands]
  if (deal.pickedUp) hands[deal.turn] = hand.filter(card => !discards.includes(card.id))
  return {
    ...deal, hands, talon: deal.pickedUp ? replaced : deal.talon,
    declaration: { ...legal, declarer: deal.turn }, passes: 0, pickedUp: false,
    auction: [...deal.auction, { seat: deal.turn, bid: legal }], turn: next(deal.turn),
  }
}

export function pass(deal: Deal): Deal {
  if (deal.phase !== 'auction' || !deal.declaration || deal.pickedUp) return deal
  const passes = deal.passes + 1
  const auction = [...deal.auction, { seat: deal.turn, bid: null }]
  if (passes < deal.rules.passesToClose) return { ...deal, passes, auction, turn: next(deal.turn) }
  return { ...deal, phase: 'play', passes, auction, turn: deal.declaration.declarer }
}

export function moves(deal: Deal) {
  const declaration = deal.declaration
  if (deal.phase !== 'play' || !declaration) return null
  return legalMoves(deal.hands[deal.turn], deal.trick, declaration.trump,
    deal.rules.protectTrumpSeven && declaration.kind === 'ulti' && declaration.declarer === deal.turn)
}

export function play(deal: Deal, id: Card['id']): Deal {
  const card = moves(deal)?.cards.find(c => c.id === id)
  if (!card || !deal.declaration) return deal
  const hands: Deal['hands'] = [...deal.hands]
  const announced: Deal['announced'] = [...deal.announced]
  if (deal.tricks.length === 0) announced[deal.turn] = marriages(hands[deal.turn], deal.declaration.trump)
  hands[deal.turn] = hands[deal.turn].filter(c => c.id !== id)
  const plays = [...deal.trick, { seat: deal.turn, card }]
  if (plays.length < 3) return { ...deal, hands, announced, trick: plays, turn: next(deal.turn) }
  const [lead, ...rest] = plays
  const winner = winningPlay([lead, ...rest], deal.declaration.trump).seat
  const tricks = [...deal.tricks, { plays, winner }]
  return { ...deal, hands, announced, trick: [], tricks, turn: winner, phase: tricks.length === 10 ? 'done' : 'play' }
}
