import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { aiTurn } from '../game/ai'
import { cardName, deck, names, sorted, type Card } from '../game/cards'
import { bidRank, contractNames, type Bid } from '../game/contracts'
import { availableBids, bid, moves, pass, pickup, play, type Deal } from '../game/deal'
import { kibicek } from '../game/effects'
import { buy, dismiss, leaveSummary, newRun, nextDeal, stages, withDeal, type Run } from '../game/run'
import { decode, encode, saveKey } from '../game/save'
import { scoreValues } from '../game/scoring'
import { describe, itemKey } from '../game/shop'
import { Manual } from './Manual'
import { BrandMark, CardBacks, PlayingCard } from './PlayingCard'
import { SuitSymbol } from './SuitSymbol'
import { isTutorialDeal, practiceSeed, tutorialStep, tutorialStorageKey } from './tutorial'

const players = ['Te', 'Ilonka', 'Bandi']
const num = (n: number) => n.toLocaleString('hu-HU', { maximumFractionDigits: 2 })
const bidName = (bid: Bid, reveal = false) => bid.trump === null
  ? bid.doubled ? `Piros ${contractNames[bid.kind].toLocaleLowerCase('hu')}` : contractNames[bid.kind]
  : `${contractNames[bid.kind]}${reveal ? ` · ${names[bid.trump]}` : bid.doubled ? ' · Piros' : ''}`
const reasons = {
  lead: 'Te hívsz: bármelyik lapot kijátszhatod.',
  follow: 'Színre színt: a hívott színből kell tenned.',
  trump: 'Nincs hívott színed, ezért adut kell tenned.',
  discard: 'Nincs hívott színed és adud sem: bármelyik lapot eldobhatod.',
  overtake: 'Ha a hívott szín vagy az adu szabálya szerint tudsz, felül kell ütnöd.',
  preserve: 'Ulti: az adu hetest meg kell tartanod, amíg van más szabályos lapod.',
}
function restore() {
  try { return decode(localStorage.getItem(saveKey)) } catch { return null }
}
function tutorialUnseen() {
  try { return localStorage.getItem(tutorialStorageKey) !== '1' } catch { return true }
}

export function App() {
  const [savedRun, setSavedRun] = useState<Run | null>(restore)
  const [practiceRun, setPracticeRun] = useState<Run | null>(null)
  const [firstRunGuide, setFirstRunGuide] = useState(tutorialUnseen)
  const [fast, setFast] = useState(false)
  const [forced, setForced] = useState(true)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [seedInput, setSeedInput] = useState('')
  const [savedDiscard, setSavedDiscard] = useState<Card['id'][]>([])
  const [practiceDiscard, setPracticeDiscard] = useState<Card['id'][]>([])
  const [savedTarget, setSavedTarget] = useState<Card['id'] | undefined>()
  const [practiceTarget, setPracticeTarget] = useState<Card['id'] | undefined>()
  const [restart, setRestart] = useState(false)
  const run = practiceRun ?? savedRun
  const setRun = practiceRun ? setPracticeRun : setSavedRun
  const discard = practiceRun ? practiceDiscard : savedDiscard
  const setDiscard = practiceRun ? setPracticeDiscard : setSavedDiscard
  const target = practiceRun ? practiceTarget : savedTarget
  const setTarget = practiceRun ? setPracticeTarget : setSavedTarget
  const guiding = !!run && (practiceRun !== null || (firstRunGuide && isTutorialDeal(run)))
  const guide = guiding ? tutorialStep(run, discard.length) : null
  const deal = run?.deal
  const declaration = deal?.declaration
  const sweepWins = deal && declaration?.kind === 'durchmars'
    ? deal.tricks.filter(trick => trick.winner === declaration.declarer).length : null
  const playerTurn = run?.phase === 'deal' && deal?.turn === 0
  const offers = deal?.phase === 'auction' && playerTurn ? availableBids(deal) : []
  const currentMoves = deal && playerTurn ? moves(deal) : null
  const hand = sorted(deal?.hands[0] ?? [])
  const takingTalon = !!playerTurn && deal?.phase === 'auction' && deal.pickedUp
  const handRef = useRef<HTMLDivElement>(null)
  const stage = run && stages[run.stage]
  const latest = deal?.tricks.at(-1)
  const visible = deal?.trick.length ? deal.trick : latest?.plays ?? []

  useLayoutEffect(() => {
    const element = handRef.current
    if (!takingTalon || !element) return
    element.focus({ preventScroll: true })
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [takingTalon])

  useEffect(() => {
    if (!savedRun) return
    try { localStorage.setItem(saveKey, encode(savedRun)) } catch { /* storage is optional */ }
  }, [savedRun])

  useEffect(() => {
    if (!run || run.phase !== 'deal' || rulesOpen || restart) return
    const { deal } = run
    const automatic = deal.turn === 0 && forced && !guiding && moves(deal)?.cards
    if (deal.turn === 0 && (!automatic || automatic.length !== 1)) return
    const pause = deal.phase === 'play' && !deal.trick.length && deal.tricks.length > 0
    const timer = window.setTimeout(() => setRun(current => {
      if (current !== run) return current
      return withDeal(run, automatic ? play(deal, automatic[0].id) : aiTurn(deal))
    }), fast ? 65 : pause ? 840 : 350)
    return () => window.clearTimeout(timer)
  }, [run, setRun, fast, forced, guiding, rulesOpen, restart])

  function act(update: (d: NonNullable<typeof deal>) => NonNullable<typeof deal>) {
    setRun(current => current?.phase === 'deal' && current.deal.turn === 0
      ? withDeal(current, update(current.deal)) : current)
  }
  function pickCard(card: Card) {
    if (deal?.phase === 'auction') {
      if (deal.pickedUp) setDiscard(previous => previous.includes(card.id) ? previous.filter(id => id !== card.id)
        : previous.length < 2 ? [...previous, card.id] : previous)
    } else act(d => play(d, card.id))
  }
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || rulesOpen || restart ||
        (event.target instanceof HTMLElement && event.target.closest('input, select, button, textarea'))) return
      if (playerTurn && /^[0-9]$/.test(event.key)) {
        const card = hand[(Number(event.key) + 9) % 10]
        if (card) pickCard(card)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function start(event?: FormEvent) {
    event?.preventDefault()
    const seed = seedInput.trim() ? Number(seedInput) >>> 0 : crypto.getRandomValues(new Uint32Array(1))[0]
    setSavedDiscard([])
    setSavedTarget(undefined)
    setRestart(false)
    setSavedRun(newRun(seed))
  }
  function submitBid(offer: Bid) {
    act(d => bid(d, offer, discard))
    setDiscard([])
  }
  function finishFirstGuide() {
    setFirstRunGuide(false)
    try { localStorage.setItem(tutorialStorageKey, '1') } catch { /* storage is optional */ }
  }
  function startPractice() {
    setPracticeDiscard([])
    setPracticeTarget(undefined)
    setPracticeRun(newRun(practiceSeed))
  }
  function continueFromShop() {
    if (!run) return
    if (practiceRun) {
      setPracticeRun(null)
      return
    }
    if (guide) finishFirstGuide()
    setSavedRun(nextDeal(run))
  }
  const coach = guide && <section className="coach" aria-label="Oktató">
    <div><p className="eyebrow">{practiceRun ? 'GYAKORLÁS' : 'ELSŐ FUTAM'} · {guide.number}/7</p>
      <h3 aria-live="polite">{guide.title}</h3><p>{guide.text}</p></div>
    {!practiceRun && <button onClick={finishFirstGuide}>Oktató kihagyása</button>}
  </section>

  return <div className={`shell${fast ? ' fast' : ''}`}>
    <header className="mast">
      <div className="brand"><BrandMark /><span>ULTIRÓ<small>KÁRTYA A SÖNTÉSBEN</small></span></div>
      <nav aria-label="Beállítások">
        <label><input type="checkbox" checked={fast} onChange={e => setFast(e.target.checked)} /> Gyors játék</label>
        <label title={guide ? 'Az oktatóban minden lapot te játszol ki.' : undefined}><input type="checkbox" checked={forced && !guide} disabled={!!guide}
          onChange={e => setForced(e.target.checked)} /> Kényszerlap automatikus</label>
        <button onClick={() => setRulesOpen(true)}>Kézikönyv</button>
        {practiceRun ? <button onClick={() => setPracticeRun(null)}>Kilépés a gyakorlásból</button>
          : <button onClick={startPractice}>Oktató újrajátszása</button>}
        {savedRun && !practiceRun && <button onClick={() => setRestart(true)}>Új futam</button>}
      </nav>
    </header>
    {!run ? <main className="panel splash">
      <p className="eyebrow">HÁROM JÁTÉKOS · EGY HÁTSÓ ASZTAL</p>
      <h1>Van egy hely<br />az asztalnál.</h1>
      <p>Rablóulti két ellenféllel, három fordulóban. Válassz vállalást, gyűjts kibiceket, és juss el a hátsó asztalig.</p>
      <form onSubmit={start}><button className="primary">Leülök játszani</button>
        <label className="seed">Futamkód (nem kötelező) <input value={seedInput} onChange={e => setSeedInput(e.target.value)} type="number" min="0" max="4294967295" /></label>
      </form>
    </main> : stage && deal && <main className="layout">
      <aside className="rail">
        <section className="panel ledger">
          <p className="eyebrow">0{run.stage + 1} / 0{stages.length} · FORDULÓ</p><h2>{stage.name}</h2>
          <div className="points"><strong>{num(run.total)}</strong><span> / {num(stage.target)} pont</span></div>
          <progress value={Math.max(0, run.total)} max={stage.target} aria-label="A célhoz gyűjtött pontok" />
          <p>{stage.deals - run.used} osztás maradt <span className="coins">◆ {run.coins} korona</span></p>
          {stage.boss && <small className="warning">Házi szabály: az első kibic hatása szünetel.</small>}
        </section>
        <section className="panel bench">
          <p className="eyebrow">KIBICEK · {run.build.kibicek.length}/5</p>
          {!run.build.kibicek.length && <p>Még senki sem ül melletted.</p>}
          {run.build.kibicek.map((id, i) => <div key={id} className={`kibic${stage.boss && i === 0 ? ' blocked' : ''}`}>
            <b>{kibicek[id].name}</b><small>{kibicek[id].text}</small>
            {run.phase === 'shop' && <button onClick={() => setRun(dismiss(run, id))}>Elküldés</button>}
          </div>)}
        </section>
      </aside>
      <div className="main-column">
        {run.phase !== 'deal' && coach}
        {run.phase === 'deal' && <>
          <section className={`table${takingTalon ? ' table--talon-in-hand' : ''}`} aria-label="Játékasztal">
            <div className="opponents">{([2, 1] as const).map(seat => <div key={seat} className={`opponent${deal.turn === seat ? ' active' : ''}`}>
              <b>{players[seat]}</b><small>{deal.declaration?.declarer === seat && deal.phase !== 'auction' ? 'Felvállaló · ' : ''}{deal.hands[seat].length} lap</small>
              <CardBacks count={Math.min(5, deal.hands[seat].length)} />
            </div>)}</div>
            <div className="contract">
              <span className="eyebrow">{deal.phase === 'auction' ? 'LICIT' : `${deal.tricks.length + 1}. ÜTÉS / 10`}</span>
              {deal.declaration && <><strong><BidLabel offer={deal.declaration} reveal={deal.phase === 'play'} /></strong>
                {deal.phase === 'auction' && <small>Licitérték: {bidRank(deal.declaration)}</small>}
                {deal.phase === 'play' && <small>{deal.declaration.trump
                  ? <>Adu: <SuitSymbol suit={deal.declaration.trump} /></> : 'Nincs adu'} · {players[deal.declaration.declarer]} · ×{deal.declaration.declarer === 0 ? scoreValues[deal.declaration.kind].multiplier : 1} alap</small>}</>}
              {deal.phase === 'play' && sweepWins !== null && <small className="sweep-progress">
                {sweepWins}/10 ütés a felvállalónál{deal.tricks.length > sweepWins ? ' · a vállalás már elbukott' : ' · mind a tíz kell'}
              </small>}
            </div>
            {deal.phase === 'auction' ? <div className="table-center">
              {!!deal.talon.length && <CardBacks count={deal.talon.length} talon />}
              <p>{deal.pickedUp ? 'A talon az aktuális licitáló kezében van.' : 'Két lap a talonban.'}</p>
            </div> : <div className="table-center">
              <div className="trick" key={`${deal.tricks.length}:${deal.trick.length > 0}`}>
                {visible.map(({ seat, card }) => <div key={card.id} className={!deal.trick.length && latest?.winner === seat ? 'winning' : ''}>
                  <PlayingCard card={card} /><small>{players[seat]}</small>
                </div>)}
              </div>
              <p aria-live="polite">{!deal.trick.length && latest
                ? `${players[latest.winner]} nyert: ${cardName(latest.plays.find(p => p.seat === latest.winner)!.card)} (${latest.plays.find(p => p.seat === latest.winner)!.card.suit === deal.declaration?.trump ? 'a legerősebb adu' : 'a hívott szín legerősebb lapja'}).`
                : deal.trick.length ? `Hívott szín: ${names[deal.trick[0].card.suit]}` : 'Az első ütést a felvállaló hívja.'}</p>
            </div>}
          </section>
          <section className="panel controls" aria-label="A kezed és a lépéseid">
            {coach}
            <p className="turn" aria-live="polite">{!playerTurn ? `${players[deal.turn]} következik…` : deal.phase === 'play'
              ? reasons[currentMoves!.reason] : deal.pickedUp ? `Jelölj ki két lapot a talonba, majd licitálj. (${discard.length}/2)`
              : deal.declaration ? 'Passzolhatsz, vagy emelhetsz. Ha felveszed a talont, emelned kell.' : 'Elsőként kötelező licitálnod. Vedd fel a talont!'}</p>
            <div ref={handRef} className={`hand${takingTalon ? ' hand--talon' : ''}`} role="group"
              aria-label={`${hand.length} lap a kezedben`} tabIndex={takingTalon ? -1 : undefined}>
              {hand.map((card, i) => <PlayingCard key={card.id} card={card} index={i}
              enhancement={run.build.enhancements[card.id]} selected={deal.phase === 'auction' ? discard.includes(card.id) : undefined}
              legal={!!playerTurn && (deal.phase === 'auction' ? deal.pickedUp : !!currentMoves?.cards.some(c => c.id === card.id))}
              onClick={() => pickCard(card)} />)}</div>
            {playerTurn && deal.phase === 'auction' && <div className="bid-controls">
              {!deal.pickedUp && <div className="bid-actions">
                {!!offers.length && <button className="primary" onClick={() => act(pickup)}>Talon felvétele</button>}
                {deal.declaration && <button onClick={() => act(pass)}>Passz</button>}
              </div>}
              {(deal.declaration || deal.pickedUp) && <BidOptions offers={offers}
                disabled={deal.pickedUp && discard.length !== 2} onBid={submitBid} />}
            </div>}
          </section>
          <GameLog deal={deal} />
        </>}
        {run.phase === 'summary' && run.last && deal.declaration && <section className="panel screen">
          <p className="eyebrow">OSZTÁS EREDMÉNYE · <BidLabel offer={deal.declaration} reveal /></p>
          <h1>{run.last.success ? 'Sikerült!' : 'Ez most elment.'}</h1>
          <p>Felvállaló: {players[deal.declaration.declarer]} · {run.last.result.declarerTricks} megszerzett ütés</p>
          <ul>{run.last.result.components.map(c => <li key={c.kind}>{contractNames[c.kind]}: {c.success ? 'teljesült' : 'nem teljesült'}</li>)}</ul>
          {run.last.result.declarerPoints !== null && <p>Kártyapont: {run.last.result.declarerPoints} (felvállaló) – {run.last.result.defenderPoints} (védők)</p>}
          {latest && <p>Utolsó ütés: {players[latest.winner]} – {cardName(latest.plays.find(p => p.seat === latest.winner)!.card)}.</p>}
          <div className="formula">{num(run.last.subtotal)} <em>×</em> {num(run.last.multiplier)}
            {!!run.last.penalty && <> <em>−</em> {run.last.penalty}</>} <em>{Number.isInteger(run.last.subtotal * run.last.multiplier) ? '=' : '≈'}</em> {num(run.last.score)} pont</div>
          <details open><summary>Pontbontás</summary><ul className="breakdown">
            {run.last.additive.map((line, i) => <li key={`a${i}`}>{line.label} <b>+{num(line.value)}</b></li>)}
            {run.last.multipliers.map((line, i) => <li key={`m${i}`}>{line.label} <b>×{num(line.value)}</b></li>)}
            {!!run.last.penalty && <li>Kudarc <b>−{run.last.penalty}</b></li>}
            {run.last.notes.map((note, i) => <li key={`n${i}`}>{note}</li>)}
            <li>Osztás jutalma <b>+{run.last.coins} korona</b></li>
          </ul></details>
          <button className="primary" onClick={() => { setTarget(undefined); setRun(leaveSummary(run)) }}>
            {(run.total >= stage.target && run.stage === stages.length - 1) || (run.total < stage.target && run.used >= stage.deals)
              ? 'Futam eredménye' : 'A söntés boltja'}
          </button>
        </section>}
        {run.phase === 'summary' && <GameLog deal={deal} />}
        {run.phase === 'shop' && <section className="panel screen">
          <p className="eyebrow">KÉT OSZTÁS KÖZÖTT</p><h1>A söntés boltja</h1>
          <p>{run.total >= stage.target ? `A forduló kész. Jutalom: +${stage.reward} korona.` : 'A forduló még tart. Mire költöd a koronáidat?'}</p>
          <label className="target">Javítandó lap <select value={target ?? ''} onChange={e => setTarget((e.target.value || undefined) as Card['id'] | undefined)}>
            <option value="">Válassz lapot</option>{deck.filter(c => !run.build.enhancements[c.id]).map(c => <option key={c.id} value={c.id}>{cardName(c)}</option>)}</select></label>
          <div className="shop-grid">{run.stock.map(item => {
            const value = describe(item)
            return <article className="kibic" key={itemKey(item)}><b>{value.name}</b><small>{value.text}</small>
              <button disabled={run.coins < value.price || (item.type === 'kibic' && run.build.kibicek.length >= 5) ||
                (item.type === 'enhancement' && (!target || !!run.build.enhancements[target]))}
                onClick={() => { setRun(buy(run, item, target)); if (item.type === 'enhancement') setTarget(undefined) }}>◆ {value.price} · Megveszem</button></article>
          })}</div>
          <button className="primary" onClick={continueFromShop}>{practiceRun ? 'Gyakorlás befejezése'
            : run.total >= stage.target ? 'Következő forduló' : 'Következő osztás'}</button>
        </section>}
        {(run.phase === 'won' || run.phase === 'lost') && <section className="panel screen">
          <p className="eyebrow">FUTAM VÉGE</p>
          <h1>{run.phase === 'won' ? 'Tiéd a hátsó asztal.' : 'Ma a ház nyert.'}</h1>
          <p>{stage.name}: {num(run.total)} / {num(stage.target)} pont.</p>
          {run.phase === 'won' && <p>Fordulójutalom: +{stage.reward} korona.</p>}
          <button className="primary" onClick={() => start()}>Még egy futam</button>
        </section>}
      </div>
    </main>}
    {rulesOpen && <Modal title="ULTIRÓ kézikönyv" close={() => setRulesOpen(false)}><Manual /></Modal>}
    {restart && <Modal title="Új futam?" close={() => setRestart(false)}>
      <p>A mentett futamot felülírja a következő.</p>
      <form onSubmit={start}><label className="seed">Futamkód (nem kötelező) <input type="number" min="0" max="4294967295" value={seedInput} onChange={e => setSeedInput(e.target.value)} /></label>
        <button className="primary">Új futam indítása</button></form>
    </Modal>}
    <footer>ULTIRÓ <span>·</span> RABLÓULTI A HÁTSÓ ASZTALNÁL <span>·</span> <a href="https://github.com/tomasdrus/hungarian-playing-cards">Kártyaképek: tomasdrus</a></footer>
  </div>
}

function BidLabel({ offer, reveal = false, decorative = false }: { offer: Bid; reveal?: boolean; decorative?: boolean }) {
  if (!offer.trump) return bidName(offer)
  return <span className="bid-label">{contractNames[offer.kind]}{(reveal || offer.doubled) &&
    <SuitSymbol suit={offer.trump} decorative={decorative} />}</span>
}

function BidOptions({ offers, disabled, onBid }: { offers: Bid[]; disabled: boolean; onBid: (offer: Bid) => void }) {
  const groups = new Map<number, Bid[]>()
  for (const offer of offers) {
    const rank = bidRank(offer)
    const group = groups.get(rank)
    if (group) group.push(offer)
    else groups.set(rank, [offer])
  }
  if (!groups.size) return <p className="bid-empty">Nincs magasabb licit.</p>
  return <section className="bid-options" aria-label="Licitálható vállalások">
    <p className="eyebrow">LICITÉRTÉK · NÖVEKVŐ SORREND</p>
    <ol className="bid-list" role="list">
      {Array.from(groups, ([rank, group]) => <li key={rank}>
        <div className="bid-group" role="group" aria-label={`Licitérték: ${rank}`}>
          <span className="bid-rank" aria-hidden="true">{rank}</span>
          {group.map(offer => <button key={`${offer.kind}:${offer.trump}:${offer.doubled}`} disabled={disabled}
            aria-label={bidName(offer, true)}
            title={offer.trump ? `Adu: ${names[offer.trump]}` : offer.kind === 'durchmars'
              ? 'Adu nélkül mind a tíz ütést el kell vinned.' : 'Adu nélkül nem vihetsz el egyetlen ütést sem.'}
            onClick={() => onBid(offer)}><BidLabel offer={offer} reveal decorative /></button>)}
        </div>
      </li>)}
    </ol>
  </section>
}

function GameLog({ deal }: { deal: Deal }) {
  return <details className="panel log"><summary>Játéknapló</summary>
    <ol>{deal.auction.map(({ seat, bid }, i) => <li key={i}>{players[seat]}: {bid ? <BidLabel offer={bid} /> : 'passz'}</li>)}
      {deal.announced.map((value, seat) => value > 0 && <li key={`a${seat}`}>{players[seat]}: {value} bemondott kártyapont</li>)}
      {deal.tricks.map((trick, i) => <li key={`t${i}`}>{i + 1}. ütés: {trick.plays.map(p => `${players[p.seat]} – ${cardName(p.card)}`).join(' · ')}. Nyertes: {players[trick.winner]}.</li>)}</ol>
  </details>
}

function Modal({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  return <dialog aria-label={title} ref={dialog => {
    if (dialog && !dialog.open) {
      dialog.showModal()
      dialog.querySelector('h2')?.focus({ preventScroll: true })
      dialog.scrollTop = 0
    }
  }} onCancel={e => { e.preventDefault(); close() }}>
    <h2 tabIndex={-1}>{title}</h2>{children}<button onClick={close}>Vissza</button>
  </dialog>
}
