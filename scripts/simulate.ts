import { aiTurn } from '../src/game/ai'
import { buy, leaveSummary, newRun, nextDeal, withDeal } from '../src/game/run'

const samples = 500
const reached = [0, 0, 0]
const contracts = new Map<string, { total: number; won: number; declaredByPlayer: number }>()
let wins = 0
for (let seed = 1; seed <= samples; seed++) {
  let run = newRun(seed)
  let lastStage = -1
  for (let step = 0; step < 450; step++) {
    if (run.stage !== lastStage) { reached[run.stage]++; lastStage = run.stage }
    if (run.phase === 'won' || run.phase === 'lost') {
      if (run.phase === 'won') wins++
      break
    }
    if (run.phase === 'deal') {
      const deal = aiTurn(run.deal)
      if (deal === run.deal) throw new Error(`Stalled: ${seed}`)
      run = withDeal(run, deal)
    } else if (run.phase === 'summary') {
      const declaration = run.deal.declaration!
      const stats = contracts.get(declaration.kind) ?? { total: 0, won: 0, declaredByPlayer: 0 }
      stats.total++
      stats.won += Number(run.last!.result.components.every(c => c.success))
      stats.declaredByPlayer += Number(declaration.declarer === 0)
      contracts.set(declaration.kind, stats)
      run = leaveSummary(run)
    } else {
      for (const id of ['innkeeper', 'palinka', 'kingmaker', 'cheat', 'seven', 'professor', 'parti']) {
        const item = run.stock.find(offer => offer.id === id)
        if (item) run = buy(run, item)
      }
      run = nextDeal(run)
    }
    if (step === 449) throw new Error(`Run did not finish: ${seed}`)
  }
}
console.log({ samples, reached, won: wins, contracts: Object.fromEntries(contracts) })
