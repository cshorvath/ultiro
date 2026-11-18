# ULTIRÓ

A Hungarian-language, browser-only Rablóulti roguelike against two computer players.

```sh
npm ci
npm run dev
npm test
npm run build
npm run simulate
```

Use Node.js 22.12+ (or a newer supported release). Vite prints the local address. Enter a numeric **Futamkód** to replay a seed; the same actions produce the same draws, store inventory and enhancement rolls. The run autosaves in LocalStorage. The **Gyors játék** switch speeds up AI and skips animations; **Kényszerlap automatikus** only plays when there is exactly one legal card. The first ten cards are keyboard-accessible via **1–0**.

The [Hungarian PNG deck](public/cards/tell/README.md) is bundled in both development and production builds, with no extra setup. Keep this checkout and its builds private; the uploader has not granted redistribution rights for the card images.

Use **Kézikönyv** for the Hungarian player manual. The first run guides you through the opening deal and shop; you can skip it at any time. **Oktató újrajátszása** starts a separate practice deal without overwriting your save.

## Rules and scope

Reference: [Pagat’s Rablóulti rules and variants](https://www.pagat.com/marriage/ulti.html).

- **Auction:** The deal is presented as 10/10/10 plus a two-card talon. The opener must pick up and bid, equivalent to having twelve cards before the opening discard. Later bidders can pass without seeing the talon, raise without the talon, or pick up and commit to raising after putting two back. Minor trump selection is entered with the bid for convenience but only revealed when play begins; hearts are announced. The prototype uses the historical two-pass close. `src/game/rules.ts` supports the modern three-pass close and configures the obligation to preserve the trump seven. The opener rotates in anticlockwise play order between deals.
- **Tricks and settlement:** Declarer leads first. Follow suit, trump if void, and overtake if possible within those constraints, including over a partner. Tens rank below Alsó in Betli and above King in trump contracts. For Parti, both sides automatically announce eligible King–Felső pairs during the first trick; aces and tens in the talon go to the defenders. The side that sweeps wins regardless of points. An Ulti bid includes Parti and the separate last-trick trump-seven component. Betli requires zero tricks.
- **Out of scope:** Kontra, traditional monetary settlement and unbid monetary bonuses, open contracts, 40–100, Durchmars and other compound bids. Hearts affects bid rank, not the run multiplier.

## Run scoring

Contract components settle before and independently of all run effects. Winning as declarer or defeating at least one component as a defender earns a base score and a crown reward. A partial declarer Ulti uses the fulfilled component for scoring (half base if only the seven succeeds), but still incurs the failure penalty and does not get the success crown reward.

Add base, contract upgrades and eligible bonuses first, then multiply all eligible factors, round once, and subtract the failure penalty unless shielded. Currency effects and timed build changes are separate; Professzor’s upgrade applies to future deals. The final stage blocks the first equipped Kibic only. Stage targets, prices and score values are data in `src/game/run.ts`, `src/game/shop.ts`, `src/game/effects.ts` and `src/game/scoring.ts`.

## Implementation plan and status

| Milestone | Implementation |
| --- | --- |
| 1. Playable Parti | Pure seeded deck/deal and legal-move engine; heuristic opponents; React table |
| 2. Auction and contracts | Talon exchange, ranked bids, separate Parti/Ulti settlement, no-trump Betli |
| 3. Run loop | Event-triggered Kibicek and enhancements, shop, three stages, boss, versioned saves |
| 4. Presentation | Hungarian rules, legal-move hints, trick history, score breakdown, speed controls |
| 5. Balance pass | Deterministic heuristic self-play; next step is human playtesting of bidding, shop choices and stage targets |

The engine is framework-independent under `src/game/`. `src/game/ai.ts` gives the strategy only its own hand, public play and legal actions; the strategy never receives the table state. `src/ui/` renders and dispatches engine actions. `scripts/simulate.ts` runs the same heuristic in all three seats with a fixed shopping policy. The current baseline reaches stage two in **323/500** seeds, stage three in **228/500**, and wins **145/500**. Those are regression baselines, not predictions for human players.
