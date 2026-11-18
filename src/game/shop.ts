import { random, type Card } from './cards'
import { contractNames, type Contract } from './contracts'
import { enhancements, kibicek, type Build, type Enhancement, type Kibic } from './effects'

export type Item = { type: 'kibic'; id: Kibic } | { type: 'enhancement'; id: Enhancement } | { type: 'upgrade'; id: Contract }
export const upgradePrice = 5
export const itemKey = (item: Item) => `${item.type}:${item.id}`
export function describe(item: Item) {
  if (item.type === 'kibic') return kibicek[item.id]
  if (item.type === 'enhancement') return enhancements[item.id]
  return { name: `${contractNames[item.id]} +`, text: 'A vállalás alapértéke tartósan +40 pont.', price: upgradePrice }
}

export function stock(build: Build, seed: number): [Item[], number] {
  const take = <T>(values: T[], count: number) => {
    const result: T[] = []
    while (values.length && result.length < count) {
      const [roll, cursor] = random(seed)
      seed = cursor
      result.push(values.splice(Math.floor(roll * values.length), 1)[0])
    }
    return result
  }
  const available = (Object.keys(kibicek) as Kibic[]).filter(id => !build.kibicek.includes(id))
  return [[
    ...take(available, 3).map((id): Item => ({ type: 'kibic', id })),
    ...take(Object.keys(enhancements) as Enhancement[], 2).map((id): Item => ({ type: 'enhancement', id })),
    ...take(Object.keys(contractNames) as Contract[], 1).map((id): Item => ({ type: 'upgrade', id })),
  ], seed]
}

export function equip(build: Build, item: Item, target?: Card['id']): Build | null {
  switch (item.type) {
    case 'kibic':
      return build.kibicek.length < 5 && !build.kibicek.includes(item.id)
        ? { ...build, kibicek: [...build.kibicek, item.id] } : null
    case 'enhancement':
      return target && !build.enhancements[target]
        ? { ...build, enhancements: { ...build.enhancements, [target]: item.id } } : null
    case 'upgrade':
      return { ...build, upgrades: { ...build.upgrades, [item.id]: build.upgrades[item.id] + 1 } }
  }
}
