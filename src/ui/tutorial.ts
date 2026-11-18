import type { Run } from '../game/run'

export const tutorialStorageKey = 'ultiro.tutorial.seen.v1'
export const practiceSeed = 42

export function isTutorialDeal(run: Run) {
  return run.stage === 0 && (run.phase === 'deal' ? run.used === 0
    : (run.phase === 'summary' || run.phase === 'shop') && run.used === 1)
}

export function tutorialStep(run: Run, selected: number) {
  if (run.phase === 'summary') return {
    number: 6, title: 'Olvasd el a pontbontást',
    text: 'A kártyapontok a vállalást döntik el. A futampontok külön számolódnak: az alaphoz jönnek a bónuszok, aztán a szorzók és az esetleges levonás. Innen nyílik a bolt.',
  }
  if (run.phase === 'shop') return {
    number: 7, title: 'Nézz körül a boltban',
    text: 'A koronáidból kibicet, lapjavítást vagy vállalásfejlesztést vehetsz. Lapjavításhoz előbb válassz lapot a listából. Vásárolni nem kötelező.',
  }
  const { deal } = run
  if (deal.phase === 'auction') {
    if (!deal.declaration && !deal.pickedUp) return {
      number: 1, title: 'Vedd fel a talont',
      text: 'Tíz lap van a kezedben, középen pedig két tartalék lap. A „Talon felvétele” gombbal nézd meg őket; elsőként kötelező licitálnod.',
    }
    if (deal.pickedUp && selected < 2) return {
      number: 2, title: 'Tegyél vissza két lapot',
      text: 'Kattints két lapra a kezedben. Ugyanarra újra kattintva visszavonhatod a kijelölést. Partihoz érdemes megtartani az ászokat, a tízeseket és az aduidat.',
    }
    return {
      number: 3, title: 'Válassz vállalást',
      text: deal.turn !== 0 ? 'A többiek emelhetnek vagy passzolhatnak. Két egymást követő passz lezárja a licitet.'
        : deal.declaration && !deal.pickedUp
          ? 'Egy ellenfél emelt. Emelhetsz te is, vagy passzolhatsz. Ha ő lesz a felvállaló, a másik játékossal együtt védekezel.'
          : 'Kezdésnek próbálj egy Partit abban a színben, amelyikből sok erős lapod van. Ez lesz az adu. A gépi ellenfelek emelhetnek; két passz lezárja a licitet.',
    }
  }
  if (!deal.tricks.length) return {
    number: 4, title: 'Játssz ki egy világos lapot',
    text: 'A felvállaló hív először. Ha rád kerül a sor, a világos lapok szabályosak; a kéz fölötti szöveg megmondja, mit kell követned. A kényszerlapot is te játszod ki az oktató alatt.',
  }
  return {
    number: 5, title: 'Figyeld, ki viszi az ütést',
    text: 'Az adu megelőzi a hívott színt; ha nincs adu az ütésben, a hívott szín legerősebb lapja nyer. Az ütés nyertese hív a következő körben. Játssz az osztás végéig!',
  }
}
