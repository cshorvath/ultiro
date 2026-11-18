import type { Card } from './cards'
import type { Contract } from './contracts'

export type ScoreEvent =
  | { type: 'trick'; card: Card; final: boolean; streak: number }
  | { type: 'contract'; kind: Contract; success: boolean }
  | { type: 'failure' }
export type Effect =
  | { type: 'add' | 'multiply' | 'coins'; value: number }
  | { type: 'shield' }
  | { type: 'upgrade'; kind: Contract }
type Definition = { name: string; text: string; price: number }
type KibicDefinition = Definition & { trigger: (event: ScoreEvent) => Effect | undefined }
const add = (value: number): Effect => ({ type: 'add', value })
const multiply = (value: number): Effect => ({ type: 'multiply', value })

export const kibicek = {
  fox: { name: 'Öreg róka', text: '+10 pont minden saját ütésért.', price: 4,
    trigger: e => e.type === 'trick' ? add(10) : undefined },
  innkeeper: { name: 'Kocsmáros', text: '×1,5 minden piros lappal nyert ütésért.', price: 6,
    trigger: e => e.type === 'trick' && e.card.suit === 'piros' ? multiply(1.5) : undefined },
  kingmaker: { name: 'Királycsináló', text: '+35 pont királlyal nyert ütésért.', price: 4,
    trigger: e => e.type === 'trick' && e.card.rank === 'K' ? add(35) : undefined },
  palinka: { name: 'Pálinkás', text: 'A sorozat második ütésétől ×1,15, ×1,20, és így tovább.', price: 7,
    trigger: e => e.type === 'trick' && e.streak > 1 ? multiply(1.05 + e.streak * .05) : undefined },
  cheat: { name: 'Hamiskártyás', text: 'Futamonként egyszer elengedi a kudarc −60 pontját.', price: 4,
    trigger: e => e.type === 'failure' ? { type: 'shield' } : undefined },
  professor: { name: 'Professzor', text: 'Sikeres saját Betli után a Betli alapja tartósan +40.', price: 5,
    trigger: e => e.type === 'contract' && e.success && e.kind === 'betli' ? { type: 'upgrade', kind: 'betli' } : undefined },
  seven: { name: 'Piros hetes', text: '×1,75, ha az Ulti vállalásod sikerül.', price: 6,
    trigger: e => e.type === 'contract' && e.kind === 'ulti' && e.success ? multiply(1.75) : undefined },
} satisfies Record<string, KibicDefinition>
export type Kibic = keyof typeof kibicek

type EnhancementDefinition = Definition & { trigger: (roll: () => number, contract: Contract) =>
  { effect: Effect; breaks?: boolean } | undefined }
export const enhancements = {
  golden: { name: 'Arany', text: '+2 korona, ha elviszi az ütést.', price: 4,
    trigger: () => ({ effect: { type: 'coins', value: 2 } }) },
  lucky: { name: 'Szerencsés', text: 'Nyertes ütésnél 1/3 eséllyel +45 pont.', price: 3,
    trigger: roll => roll() < 1 / 3 ? { effect: add(45) } : undefined },
  glass: { name: 'Üveg', text: 'Nyertes ütésnél ×2; 1/4 eséllyel lekopik a javítás.', price: 6,
    trigger: roll => ({ effect: multiply(2), breaks: roll() < 1 / 4 }) },
  sealed: { name: 'Pecsételt', text: '+55 pont Parti során, ha elviszi az ütést.', price: 4,
    trigger: (_roll, contract) => contract === 'parti' ? { effect: add(55) } : undefined },
} satisfies Record<string, EnhancementDefinition>
export type Enhancement = keyof typeof enhancements
export type Build = {
  kibicek: Kibic[]
  enhancements: Partial<Record<Card['id'], Enhancement>>
  upgrades: Record<Contract, number>
  shieldUsed: boolean
}
