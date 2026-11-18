import { cardName, random } from './cards'
import { contractNames, evaluate, type Contract } from './contracts'
import type { Deal } from './deal'
import { enhancements, kibicek, type Build, type Effect, type ScoreEvent } from './effects'

export const scoreValues: Record<Contract, { base: number; multiplier: number }> = {
  parti: { base: 100, multiplier: 1 }, ulti: { base: 200, multiplier: 3 }, betli: { base: 250, multiplier: 4 },
  durchmars: { base: 280, multiplier: 2 },
}
export const upgradeValue = 40
export const failurePenalty = 60
type Line = { label: string; value: number }
export function scoreDeal(deal: Deal, build: Build, seed: number, boss = false) {
  if (!deal.declaration || deal.phase !== 'done') throw new Error('Deal is not complete')
  const { kind, trump, declarer } = deal.declaration
  const result = evaluate(deal.declaration, deal.tricks, deal.talon, deal.announced)
  const full = result.components.every(c => c.success)
  const playerDeclared = declarer === 0
  const success = playerDeclared ? full : !full
  const partial = playerDeclared && kind === 'ulti' && !full
    ? result.components.find(component => component.success) : undefined
  const eligible = success || !!partial
  const scoringContract = partial?.kind ?? kind
  const additive: Line[] = []
  const multipliers: Line[] = []
  const notes: string[] = []
  let penalty = success ? 0 : failurePenalty
  let coins = success ? 3 : 0
  let streak = 0
  const updated: Build = { ...build, enhancements: { ...build.enhancements }, upgrades: { ...build.upgrades } }
  const apply = (effect: Effect, label: string) => {
    switch (effect.type) {
      case 'add': if (eligible) additive.push({ label, value: effect.value }); break
      case 'multiply': if (eligible) multipliers.push({ label, value: effect.value }); break
      case 'coins': coins += effect.value; notes.push(`${label}: +${effect.value} korona`); break
      case 'shield':
        if (!updated.shieldUsed) {
          updated.shieldUsed = true
          penalty = 0
          notes.push(`${label}: a pontlevonás elmarad`)
        }
        break
      case 'upgrade':
        updated.upgrades[effect.kind]++
        notes.push(`${label}: ${contractNames[effect.kind]} alapja tartósan +${upgradeValue}`)
        break
    }
  }
  const emit = (event: ScoreEvent) => {
    // The boss blocks the first equipped Kibic, never a rule or an enhancement.
    for (const id of boss ? build.kibicek.slice(1) : build.kibicek) {
      const definition = kibicek[id]
      const effect = definition.trigger(event)
      if (effect) apply(effect, definition.name)
    }
  }
  if (eligible) {
    const base = playerDeclared ? scoreValues[scoringContract].base / (partial?.kind === 'ulti' ? 2 : 1) : 160
    additive.push({ label: playerDeclared ? `${contractNames[scoringContract]} alapértéke${partial ? ' · részleges teljesítés' : ''}` : 'Sikeres védekezés', value: base })
    const upgrades = build.upgrades[scoringContract] * upgradeValue
    if (playerDeclared && upgrades) additive.push({ label: 'Szerződésfejlesztés', value: upgrades })
    multipliers.push({ label: playerDeclared ? 'Vállalás szorzója' : 'Védekezés szorzója', value: playerDeclared ? scoreValues[scoringContract].multiplier : 1 })
  }
  if (boss && build.kibicek.length) notes.push(`A hátsó asztal letiltotta: ${kibicek[build.kibicek[0]].name}`)
  for (const [i, trick] of deal.tricks.entries()) {
    if (trick.winner !== 0) { streak = 0; continue }
    streak++
    const card = trick.plays.find(p => p.seat === 0)!.card
    const final = i === 9
    if (card.rank === 'Á') apply({ type: 'add', value: 12 }, 'Ásszal nyert ütés')
    if (final) apply({ type: 'add', value: 20 }, 'Utolsó ütés')
    if (streak > 1) apply({ type: 'add', value: 5 }, 'Sorozat')
    emit({ type: 'trick', card, final, streak })
    const enhancement = build.enhancements[card.id]
    if (enhancement) {
      const definition = enhancements[enhancement]
      const roll = () => {
        const [value, cursor] = random(seed)
        seed = cursor
        return value
      }
      const triggered = definition.trigger(roll, kind)
      if (triggered) {
        apply(triggered.effect, `${definition.name} · ${cardName(card)}`)
        if ('breaks' in triggered && triggered.breaks) {
          delete updated.enhancements[card.id]
          notes.push(`${cardName(card)}: az üveg lekopott`)
        }
      }
    }
  }
  if (playerDeclared) for (const component of result.components) emit({ type: 'contract', ...component })
  if (!success) emit({ type: 'failure' })
  const subtotal = additive.reduce((sum, line) => sum + line.value, 0)
  const multiplier = multipliers.reduce((product, line) => product * line.value, 1)
  return {
    updated, seed, coins, result, success, additive, multipliers, notes, subtotal, multiplier, penalty,
    score: Math.round(subtotal * multiplier) - penalty, trump,
  }
}
export type Score = Omit<ReturnType<typeof scoreDeal>, 'updated' | 'seed'>
