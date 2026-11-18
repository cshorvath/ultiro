export const suits = ['piros', 'tok', 'zold', 'makk'] as const
export const ranks = ['VII', 'VIII', 'IX', 'X', 'A', 'F', 'K', 'Á'] as const
export type Suit = typeof suits[number]
export type Rank = typeof ranks[number]
export type Card = Readonly<{ id: `${Suit}-${Rank}`; suit: Suit; rank: Rank }>
export type Seat = 0 | 1 | 2
export const seats = [0, 1, 2] as const
export const next = (seat: Seat): Seat => seats[(seat + 1) % 3]
export const deck: readonly Card[] = suits.flatMap(suit =>
  ranks.map((rank): Card => ({ id: `${suit}-${rank}`, suit, rank })),
)
export const names = { piros: 'Piros', tok: 'Tök', zold: 'Zöld', makk: 'Makk' }
export const rankNames: Record<Rank, string> = {
  VII: 'Hetes', VIII: 'Nyolcas', IX: 'Kilences', X: 'Tízes',
  A: 'Alsó', F: 'Felső', K: 'Király', Á: 'Ász',
}
export const cardName = (card: Card) => `${names[card.suit]} ${rankNames[card.rank].toLowerCase()}`
export const cardPoints = (card: Card) => card.rank === 'Á' || card.rank === 'X' ? 10 : 0
export const sorted = (cards: readonly Card[]) => [...cards].sort((a, b) =>
  suits.indexOf(a.suit) - suits.indexOf(b.suit) || ranks.indexOf(a.rank) - ranks.indexOf(b.rank))

// A serializable PRNG cursor; all callers return rather than mutate it.
export function random(seed: number): [number, number] {
  const cursor = (seed + 0x6d2b79f5) >>> 0
  let x = Math.imul(cursor ^ (cursor >>> 15), cursor | 1)
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
  return [((x ^ (x >>> 14)) >>> 0) / 4294967296, cursor]
}

export function shuffled(seed: number): [Card[], number] {
  const cards = [...deck]
  for (let i = cards.length - 1; i > 0; i--) {
    const [roll, cursor] = random(seed)
    seed = cursor
    const j = Math.floor(roll * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return [cards, seed]
}
