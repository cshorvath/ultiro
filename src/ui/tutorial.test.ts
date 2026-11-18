import { describe, expect, it } from 'vitest'
import { bid, pass, pickup } from '../game/deal'
import { newRun } from '../game/run'
import { isTutorialDeal, practiceSeed, tutorialStep } from './tutorial'

describe('first-deal tutorial', () => {
  const initial = newRun(practiceSeed)
  it('follows the actual talon, discard, bid, and trick phases', () => {
    expect(tutorialStep(initial, 0).number).toBe(1)
    const talon = pickup(initial.deal)
    expect(tutorialStep({ ...initial, deal: talon }, 1).number).toBe(2)
    expect(tutorialStep({ ...initial, deal: talon }, 2).number).toBe(3)
    const deal = pass(pass(bid(talon, { kind: 'parti', trump: 'makk', doubled: false },
      talon.hands[0].slice(0, 2).map(card => card.id))))
    expect(tutorialStep({ ...initial, deal }, 0).number).toBe(4)
    expect(tutorialStep({ ...initial, deal: { ...deal, tricks: [{ winner: 0, plays: [] }] } }, 0).number).toBe(5)
  })
  it('covers settlement and shopping but not later deals', () => {
    expect(isTutorialDeal(initial)).toBe(true)
    expect(tutorialStep({ ...initial, phase: 'summary', used: 1 }, 0).number).toBe(6)
    expect(tutorialStep({ ...initial, phase: 'shop', used: 1 }, 0).number).toBe(7)
    expect(isTutorialDeal({ ...initial, used: 1 })).toBe(false)
    expect(isTutorialDeal({ ...initial, stage: 1 })).toBe(false)
  })
})
