import { stages } from '../game/run'
import { failurePenalty, scoreValues } from '../game/scoring'

export function Manual() {
  return <div className="manual">
    <section>
      <h3>1. Mi a cél?</h3>
      <p>Ilonka és Bandi ellen játszol. Osztásonként tíz ütés van. Minden fordulóban el kell érned a pontcélt, mielőtt elfogynak az osztásaid. A következő forduló új pontszámmal indul, de a koronák és a fejlesztések megmaradnak.</p>
      <ul>{stages.map(stage => <li key={stage.name}><b>{stage.name}:</b> {stage.target} pont, legfeljebb {stage.deals} osztás.</li>)}</ul>
      <p>A hátsó asztalnál az első kibiced hatása szünetel; a kártyajáték szabályai nem változnak.</p>
    </section>
    <section>
      <h3>2. Osztás és licit</h3>
      <p>Mindenki tíz lapot kap. Az első játékos felveszi a kétlapos <b>talont</b>, két lapot letesz, és vállalást tesz. Ezután passzolhatsz, emelhetsz talon nélkül, vagy felveheted a talont — ha felveszed, emelned kell. Két egymást követő passz lezárja a licitet. A legmagasabb licit játékosa a <b>felvállaló</b>, a többiek együtt védekeznek.</p>
      <p>Növekvő licitsorrend: Parti, piros Parti, Ulti, Betli, piros Ulti, piros Betli. A piros Betlinek sincs aduja.</p>
    </section>
    <section>
      <h3>3. Így zajlik egy ütés</h3>
      <ol>
        <li>Az első ütést a felvállaló hívja; utána mindig az előző ütés nyertese.</li>
        <li>Ha van a hívott színből lapod, abból kell tenned. Ha nincs, adut kell tenned, ha van. Ha egyik sincs, bármelyik lapot eldobhatod.</li>
        <li>Ha e szabályok mellett felül tudod ütni az addigi legerősebb lapot, kötelező — akkor is, ha a társadé az.</li>
        <li>A legerősebb adu nyer. Ha nem tettek adut, a hívott szín legerősebb lapja nyer.</li>
      </ol>
      <p><b>Erősség felülről lefelé:</b><br />Aduval: Á, X, K, F, A, IX, VIII, VII.<br />Adu nélkül: Á, K, F, A, X, IX, VIII, VII.<br />Á = ász; A = alsó; F = felső; K = király.</p>
    </section>
    <section>
      <h3>4. Mit kell teljesíteni?</h3>
      <p><b>Parti:</b> felvállalóként több kártyapontot szerezz, mint a két védő együtt. Az ász, a tízes és az utolsó ütés egyenként 10 pont. A király–felső párokat a játék az első ütésben bejelenti: aduban 40, más színben 20. A talon pontjai a védőké. Amelyik oldal mind a tíz ütést elviszi, a pontoktól függetlenül nyer.</p>
      <p><b>Ulti:</b> a Parti mellett az utolsó ütést is nyerd meg az adu hetessel. A két vállalás külön teljesülhet. Az adu hetest őrizned kell, ameddig szabályosan megteheted.</p>
      <p><b>Betli:</b> felvállalóként egyetlen ütést se vigyél el. Nincs adu, de a színkövetés és a felülütés kötelező marad.</p>
    </section>
    <section>
      <h3>5. Futampont, korona és a bolt</h3>
      <p>A kártyapont nem futampont. Sikeres felvállalóként a Parti alapja {scoreValues.parti.base} × {scoreValues.parti.multiplier}, az Ultié {scoreValues.ulti.base} × {scoreValues.ulti.multiplier}, a Betlié {scoreValues.betli.base} × {scoreValues.betli.multiplier}. Védőként akkor számít sikernek az osztás, ha legalább egy vállalást megbuktattok.</p>
      <p>Az alaphoz előbb hozzáadódnak a pontbónuszok, majd jönnek a szorzók, a kerekítés és az esetleges {failurePenalty} pontos kudarc-levonás. Részben teljesített Ultiért is járhat pont. Az összesítést az osztás után a Pontbontás mutatja meg.</p>
      <p>A sikeres osztásokért és fordulókért koronát kapsz. A boltban legfeljebb öt aktív kibiced lehet. Vehetsz tartós vállalásfejlesztést, vagy kijelölhetsz egy lapot a pakliból, és javítást vehetsz rá. Ez a jutalmat módosítja, nem a lap erejét.</p>
    </section>
    <section>
      <h3>6. Kezelés és gyakorlás</h3>
      <p>A világos lapok választhatók. Kattints rájuk, vagy használd az <kbd>1</kbd>–<kbd>0</kbd> billentyűket a kéz első tíz lapjához, amikor nem egy kezelőelemen áll a fókusz. A Gyors játék felpörgeti a gépi köröket és kihagyja az animációkat. A kényszerlap kapcsoló csak az egyetlen szabályos lapot játssza ki magától.</p>
      <p>A játék automatikusan menti a futamodat ebben a böngészőben. Az „Oktató újrajátszása” külön gyakorlóosztást nyit; a mentett futamod változatlan marad.</p>
    </section>
  </div>
}
