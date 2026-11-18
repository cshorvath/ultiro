import { describe, expect, it } from 'vitest'
import { aiTurn } from './ai'
import { deck, shuffled, type Card } from './cards'
import { bidRank, evaluate, marriages, type Bid } from './contracts'
import { availableBids, bid, moves, newDeal, pass, pickup, play, type Deal } from './deal'
import { legalMoves, winningPlay, type Trick } from './rules'
import { buy, leaveSummary, newRun, nextDeal, stages, withDeal } from './run'
import { decode, encode } from './save'
import { scoreDeal } from './scoring'

const c = (id: Card['id']) => deck.find(card => card.id === id)!
const p = (id: Card['id'], seat: 0 | 1 | 2 = 0) => ({ card: c(id), seat })
const offer: Bid = { kind: 'parti', trump: 'makk', doubled: false }
const sweep: Bid = { kind: 'durchmars', trump: null, doubled: false }
const ids = (value: ReturnType<typeof legalMoves>) => value.cards.map(card => card.id)
function complete(deal: Deal) {
  for (let i = 0; i < 60 && deal.phase !== 'done'; i++) {
    const resolved = aiTurn(deal)
    expect(resolved).not.toBe(deal)
    deal = resolved
  }
  expect(deal.phase).toBe('done')
  return deal
}

describe('deck and auction', () => {
  it('deals 32 distinct cards in a deterministic 10/10/10/2 split', () => {
    const [deal] = newDeal(42, 1)
    expect(deal.hands.map(hand => hand.length)).toEqual([10, 10, 10])
    expect(deal.turn).toBe(1)
    expect(new Set([...deal.hands.flat(), ...deal.talon].map(card => card.id)).size).toBe(32)
    expect(newDeal(42, 1)).toEqual(newDeal(42, 1))
    expect(shuffled(42)).not.toEqual(shuffled(43))
  })
  it('requires the opener to bid, requires two unique discards after pickup and forbids a tied bid', () => {
    let [deal] = newDeal(1, 0)
    expect(pass(deal)).toBe(deal)
    expect(bid(deal, offer)).toBe(deal)
    deal = pickup(deal)
    expect(deal.hands[0]).toHaveLength(12)
    expect(pass(deal)).toBe(deal)
    expect(bid(deal, offer, [deal.hands[0][0].id, deal.hands[0][0].id])).toBe(deal)
    const ids = deal.hands[0].slice(0, 2).map(card => card.id)
    deal = bid(deal, offer, ids)
    expect(deal.talon.map(card => card.id)).toEqual(ids)
    expect(bid(deal, { ...offer, trump: 'zold' })).toBe(deal)
    deal = pass(pass(deal))
    expect(deal.phase).toBe('play')
    expect(deal.turn).toBe(0)
  })
  it('supports a three-pass auction and keeps the traditional bid order', () => {
    let [deal] = newDeal(1, 0, { passesToClose: 3, protectTrumpSeven: true })
    deal = pickup(deal)
    deal = bid(deal, offer, deal.hands[0].slice(0, 2).map(card => card.id))
    expect(pass(pass(deal)).phase).toBe('auction')
    expect(pass(pass(pass(deal))).phase).toBe('play')
    expect([
      bidRank({ ...offer, kind: 'ulti' }),
      bidRank({ kind: 'betli', trump: null, doubled: false }),
      bidRank(sweep),
      bidRank({ kind: 'ulti', trump: 'piros', doubled: true }),
      bidRank({ kind: 'betli', trump: null, doubled: true }),
      bidRank({ ...sweep, doubled: true }),
    ]).toEqual([4, 5, 6, 8, 10, 12])
  })
  it('lets Durchmarsch overcall Betli but not red Ulti, and closes above red Durchmarsch', () => {
    let [deal] = newDeal(1, 0)
    deal = pickup(deal)
    deal = bid(deal, { kind: 'betli', trump: null, doubled: false }, deal.hands[0].slice(0, 2).map(card => card.id))
    expect(availableBids(deal)).toContainEqual(sweep)
    deal = bid(deal, { kind: 'ulti', trump: 'piros', doubled: true })
    expect(bid(deal, sweep)).toBe(deal)
    deal = bid(deal, { ...sweep, doubled: true })
    expect(availableBids(deal)).toEqual([])
    expect(pass(pass(deal)).declaration).toMatchObject({ kind: 'durchmars', trump: null, doubled: true })
  })
  it('returns the opening and remaining bids in ascending order, keeping equal suits together', () => {
    let [deal] = newDeal(1, 0)
    expect(availableBids(deal).map(bidRank)).toEqual([1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 10, 12])
    deal = pickup(deal)
    deal = bid(deal, sweep, deal.hands[0].slice(0, 2).map(card => card.id))
    expect(availableBids(deal).map(bidRank)).toEqual([8, 10, 12])
  })
})

describe('trick play', () => {
  it('requires a follower even when a trump has already been played', () => {
    expect(ids(legalMoves([c('makk-Á'), c('piros-Á'), c('tok-VII')], [p('makk-VII'), p('piros-VII', 1)], 'piros'))).toEqual(['makk-Á'])
  })
  it('requires an overtrump with no followers, even over a defender partner', () => {
    expect(ids(legalMoves([c('piros-VII'), c('piros-Á'), c('tok-VII')], [p('makk-VII'), p('piros-IX', 1)], 'piros'))).toEqual(['piros-Á'])
  })
  it('does not require an overtake that contradicts follow suit, or a nonexistent overtake', () => {
    expect(ids(legalMoves([c('makk-VII'), c('makk-IX'), c('piros-Á')], [p('makk-Á')], 'piros'))).toEqual(['makk-VII', 'makk-IX'])
    expect(ids(legalMoves([c('piros-VII'), c('piros-VIII'), c('tok-Á')], [p('makk-Á'), p('piros-IX', 1)], 'piros'))).toEqual(['piros-VII', 'piros-VIII'])
  })
  it('uses the no-trump rank order and allows a free discard when void', () => {
    expect(ids(legalMoves([c('makk-X'), c('makk-K')], [p('makk-F')], null))).toEqual(['makk-K'])
    expect(ids(legalMoves([c('makk-X'), c('makk-K')], [p('makk-F')], 'tok'))).toEqual(['makk-X', 'makk-K'])
    expect(ids(legalMoves([c('piros-Á'), c('tok-K')], [p('makk-F')], null))).toEqual(['piros-Á', 'tok-K'])
  })
  it('protects the trump seven only when another legal choice exists', () => {
    expect(ids(legalMoves([c('makk-VII'), c('tok-K')], [], 'makk', true))).toEqual(['tok-K'])
    expect(ids(legalMoves([c('makk-VII'), c('tok-K')], [p('makk-K')], 'makk', true))).toEqual(['makk-VII'])
  })
  it('resolves trump and plain-suit winners separately', () => {
    const cards = [p('zold-K'), p('zold-X', 1), p('piros-VII', 2)] as const
    expect(winningPlay(cards, 'piros').seat).toBe(2)
    expect(winningPlay(cards, 'makk').seat).toBe(1)
    expect(winningPlay(cards, null).seat).toBe(0)
  })
  it('finishes seeded games with only legal moves and consumes each card once', () => {
    for (let seed = 0; seed < 28; seed++) {
      let [state] = newDeal(seed, 0)
      while (state.phase === 'auction') {
        const updated = aiTurn(state)
        expect(updated).not.toBe(state)
        state = updated
      }
      while (state.phase === 'play') {
        const updated = aiTurn(state)
        const played = (updated.trick.at(-1) ?? updated.tricks.at(-1)?.plays.at(-1))!
        expect(moves(state)?.cards.map(card => card.id)).toContain(played.card.id)
        expect(played.seat).toBe(state.turn)
        expect(play(state, played.card.id)).toEqual(updated)
        state = updated
      }
      const cards = [...state.talon, ...state.tricks.flatMap(t => t.plays.map(p => p.card))]
      expect(new Set(cards.map(card => card.id)).size).toBe(32)
    }
  })
  it('has the AI bid and play a no-trump Durchmarsch on a genuine strong hand', () => {
    const [initial] = newDeal(1, 0)
    const top = ['Á', 'K', 'F', 'A', 'X']
    const strong = deck.filter(card => (card.suit === 'piros' || card.suit === 'makk') && top.includes(card.rank))
    const outside = deck.filter(card => !strong.includes(card))
    const auction = aiTurn({ ...initial, hands: [strong, outside.slice(0, 10), outside.slice(10, 20)], talon: outside.slice(20) })
    expect(auction.declaration).toMatchObject({ kind: 'durchmars', declarer: 0, trump: null })
    expect(auction.hands[0]).toEqual(strong)
    const final = complete(pass(pass(auction)))
    expect(final.announced).toEqual([0, 0, 0])
    expect(final.tricks.map(trick => trick.winner)).toEqual(Array(10).fill(0))
  })
})

// Focused settlement fixture; these completed trick records need not be an actual deal.
const outcomes = (winner: 0 | 1, last: Trick = { winner, plays: [p('makk-VII', winner)] }): Trick[] =>
  [...Array.from({ length: 9 }, (): Trick => ({ winner, plays: [p('piros-VIII', winner)] })), last]

describe('contract settlement', () => {
  it('counts marriages, last trick and discarded points and recognizes a sweep', () => {
    expect(marriages([c('makk-K'), c('makk-F'), c('piros-K'), c('piros-F')], 'makk')).toBe(60)
    expect(evaluate({ ...offer, declarer: 0 }, outcomes(0), [c('tok-X')], [0, 40, 0])).toMatchObject({
      declarerPoints: 10, defenderPoints: 50, components: [{ kind: 'parti', success: true }],
    })
    expect(evaluate({ ...offer, declarer: 0 }, outcomes(1), [], [40, 0, 0]).components[0].success).toBe(false)
  })
  it('settles the Parti and Ulti components independently', () => {
    expect(evaluate({ ...offer, kind: 'ulti', declarer: 0 }, outcomes(1, { winner: 0, plays: [p('makk-VII')] }),
      [c('piros-X'), c('tok-X')], [0, 20, 0]).components).toEqual([
      { kind: 'parti', success: false }, { kind: 'ulti', success: true },
    ])
    expect(evaluate({ ...offer, kind: 'ulti', declarer: 0 }, outcomes(0, { winner: 0, plays: [p('makk-VIII')] }),
      [], [0, 0, 0]).components).toEqual([{ kind: 'parti', success: true }, { kind: 'ulti', success: false }])
  })
  it('rejects an Ulti when the opposing trump beats the seven in the final trick', () => {
    const last: Trick = { winner: 1, plays: [p('makk-VII'), p('makk-IX', 1), p('piros-Á', 2)] }
    expect(evaluate({ ...offer, kind: 'ulti', declarer: 0 }, outcomes(0, last), [], [40, 0, 0]).components)
      .toEqual([{ kind: 'parti', success: true }, { kind: 'ulti', success: false }])
  })
  it('wins Betli only with zero tricks', () => {
    const betli = { kind: 'betli', declarer: 0, trump: null, doubled: false } as const
    expect(evaluate(betli, outcomes(1), [], [0, 0, 0]).components[0].success).toBe(true)
    expect(evaluate(betli, outcomes(0), [], [0, 0, 0]).components[0].success).toBe(false)
  })
  it.each([false, true])('requires all ten tricks in Durchmarsch (red: %s)', doubled => {
    const declaration = { ...sweep, declarer: 0, doubled } as const
    expect(evaluate(declaration, outcomes(0), [c('tok-X')], [0, 0, 0])).toEqual({
      components: [{ kind: 'durchmars', success: true }], declarerTricks: 10,
      declarerPoints: null, defenderPoints: null,
    })
    expect(evaluate(declaration, outcomes(0, { winner: 1, plays: [p('makk-Á', 1)] }), [], [0, 0, 0]))
      .toMatchObject({ components: [{ kind: 'durchmars', success: false }], declarerTricks: 9 })
  })
})

describe('roguelike scoring and persistence', () => {
  it('scores a Durchmarsch using its own upgrade and rewards a defender for breaking it', () => {
    const run = newRun(5)
    const build = { ...run.build, kibicek: [], upgrades: { ...run.build.upgrades, durchmars: 1 } }
    const fixture: Deal = { ...run.deal, phase: 'done', declaration: { ...sweep, declarer: 0 }, tricks: outcomes(0) }
    const win = scoreDeal(fixture, build, run.seed)
    expect(win.success).toBe(true)
    expect(win.multiplier).toBe(2)
    expect(win.additive.slice(0, 2).map(line => line.value)).toEqual([280, 40])
    const defended: Deal = { ...fixture, declaration: { ...sweep, declarer: 1 },
      tricks: outcomes(1, { winner: 0, plays: [p('makk-Á')] }) }
    expect(scoreDeal(defended, build, run.seed)).toMatchObject({ success: true, score: 192 })
  })
  it('adds before multiplying, triggers a seeded enhancement and blocks only the first Kibic at the boss', () => {
    const run = newRun(3)
    const trick = { winner: 0, plays: [p('piros-Á')] } as const satisfies Trick
    const fixture: Deal = { ...run.deal, phase: 'done', declaration: { ...offer, declarer: 0 },
      tricks: [...outcomes(1).slice(0, 9), trick], talon: [], announced: [20, 0, 0] }
    const build = { ...run.build, kibicek: ['fox', 'innkeeper'] as const, enhancements: { 'piros-Á': 'glass' } as const }
    const loadout = { ...build, kibicek: [...build.kibicek] }
    const normal = scoreDeal(fixture, loadout, 3)
    expect(normal.subtotal).toBe(142)
    expect(normal.multiplier).toBe(3)
    expect(normal.score).toBe(426)
    expect(scoreDeal(fixture, loadout, 3)).toEqual(normal)
    expect(scoreDeal(fixture, loadout, 3, true).score).toBe(396)
    expect(scoreDeal(fixture, loadout, 3, true).result).toEqual(normal.result)
  })
  it('consumes one shield per run without changing contract outcome', () => {
    const run = newRun(3)
    const fixture: Deal = { ...run.deal, phase: 'done', declaration: { ...offer, declarer: 0 }, tricks: outcomes(1) }
    const initial = scoreDeal(fixture, { ...run.build, kibicek: ['cheat'] }, 5)
    expect(initial.success).toBe(false)
    expect(initial.score).toBe(0)
    expect(scoreDeal(fixture, initial.updated, 5).score).toBe(-60)
  })
  it('progresses through stage shops, debits purchases once and can win or lose', () => {
    let run = newRun(5)
    run = withDeal(run, complete(run.deal))
    expect(run.phase).toBe('summary')
    expect(withDeal(run, run.deal)).toBe(run)
    run = leaveSummary({ ...run, total: stages[0].target, coins: 20 })
    expect(run.phase).toBe('shop')
    const item = run.stock.find(item => item.type === 'enhancement')!
    const target = deck[0].id
    const bought = buy(run, item, target)
    expect(bought.build.enhancements[target]).toBe(item.id)
    expect(bought.coins).toBeLessThan(run.coins)
    expect(buy(bought, item, target)).toBe(bought)
    expect(nextDeal(bought)).toMatchObject({ stage: 1, phase: 'deal', total: 0, used: 0 })
    expect(leaveSummary({ ...run, phase: 'summary', stage: 2, total: stages[2].target }))
      .toMatchObject({ phase: 'won', coins: run.coins + stages[2].reward })
    expect(leaveSummary({ ...run, phase: 'summary', stage: 2, total: 0, used: stages[2].deals }).phase).toBe('lost')
  })
  it('restores dealt and mid-pickup runs identically and rejects a corrupt or unknown save', () => {
    const original = newRun(9)
    const mid = withDeal(original, pickup(original.deal))
    expect(decode(encode(original))).toEqual(original)
    expect(decode(encode(mid))).toEqual(mid)
    expect(complete(decode(encode(original))!.deal)).toEqual(complete(original.deal))
    expect(decode(encode(mid).replace('"version":1', '"version":2'))).toBeNull()
    expect(decode(encode({ ...mid, deal: { ...mid.deal, hands: [[], [], []] } }))).toBeNull()
    expect(decode('{broken')).toBeNull()
  })
  it('adds a zero-level Durchmarsch upgrade to existing saves', () => {
    const run = newRun(13)
    const oldSave = encode(run).replace(',"durchmars":0', '')
    expect(oldSave).not.toContain('"durchmars"')
    expect(decode(oldSave)).toEqual(run)
  })
})
