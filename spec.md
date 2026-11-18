# Project: ULTIRÓ — A Balatro-Inspired Hungarian Card Game

You are a senior game developer, game designer, and software architect. Your task is to design and implement a playable browser-based prototype of **ULTIRÓ**, a single-player roguelike card game combining traditional Hungarian Ulti with the deckbuilding, scoring, and progression mechanics of Balatro.

The reference design document is `ultiro_jatekkoncepcio.md`. Read it if available. The requirements below are sufficient to begin if the document is unavailable.

**Your objective is to deliver a working, enjoyable game, not merely a technical demonstration.**

## 1. Game concept

ULTIRÓ combines two systems:

- **Hungarian Ulti:** Three-player trick-taking with a 32-card Hungarian deck, bidding, contracts, trump suits, and tactical card play.
- **Balatro-inspired roguelike:** Increasing score requirements, passive modifiers, multiplicative scoring, a shop, upgrades, and strategic builds.

The player competes against two AI opponents in successive Ulti deals, attempting to accumulate sufficient points to advance through increasingly difficult stages.

The game must preserve meaningful Ulti decisions while creating opportunities for powerful, occasionally absurd scoring combinations.

## 2. Technology

Use the following stack unless the existing repository establishes another appropriate architecture:

- TypeScript
- React
- Vite
- CSS for styling and animations
- Vitest for automated tests
- LocalStorage for run persistence

The game must run entirely in the browser without a backend or external AI service.

Keep the game engine framework-independent and separate from React components.

Prioritize maintainability, deterministic simulation, and rapid iteration.

## 3. Core Ulti mechanics

Implement a genuine, rule-consistent three-player trick-taking game.

The deck contains 32 Hungarian cards:

- Suits: Hearts (Piros), Bells (Tök), Leaves (Zöld), Acorns (Makk).
- Ranks: VII, VIII, IX, X, Under (Alsó), Over (Felső), King (Király), Ace (Ász).

Implement:

1. Shuffling and dealing.
2. Ten-card hands with the traditional two-card talon.
3. Bidding and contract selection.
4. Trump and no-trump games.
5. Legal card selection and trick-taking.
6. Contract evaluation.
7. AI opponents that make legal, strategically reasonable moves.

For the MVP, support:

- Simple Parti
- Ulti
- Betli

Design the contract system to support later additions such as 40–100, Durchmars, and compound contracts.

**Important:** Research or verify traditional Hungarian Ulti rules before implementing the engine. Do not invent rules or confuse the real contract conditions with the roguelike scoring system.

Where Ulti has multiple rule variants, document the chosen variant and make the relevant rules configurable.

## 4. Roguelike scoring

Traditional contract success and roguelike points are separate concepts.

A contract must be evaluated according to Ulti rules. Roguelike modifiers affect the resulting score, not whether a contract is legally fulfilled.

Start with this provisional formula:

`Final Score = (Base Contract Points + Trick Bonuses) × Multipliers`

Example initial values:

| Contract | Base points | Multiplier |
|---|---:|---:|
| Parti | 100 | ×1 |
| Ulti | 200 | ×3 |
| Betli | 250 | ×4 |

These are game-design values, not traditional Ulti monetary scores.

Support scoring events such as:

- Winning a trick with an ace.
- Winning the final trick.
- Successfully completing an Ulti.
- Winning consecutive tricks.
- Completing specific contracts.

The scoring engine must support additive bonuses, multiplicative modifiers, conditional triggers, and clearly defined evaluation order.

Display a detailed breakdown showing exactly how the final score was calculated.

## 5. Kibicek — passive abilities

Implement a system similar to Balatro's Jokers.

Players can own up to five simultaneously active **Kibicek**.

Each Kibic modifies scoring or another clearly defined aspect of the game.

Initial examples:

| Kibic | Ability |
|---|---|
| Öreg róka | +10 points per won trick |
| Kocsmáros | ×1.5 score for tricks won with red cards |
| Királycsináló | Bonus when winning with a King |
| Pálinkás | Increasing multiplier for consecutive won tricks |
| Hamiskártyás | Negates one failed-contract penalty per run |
| Professzor | Permanently upgrades Betli after successful completion |
| Piros hetes | Extra multiplier for a successful Ulti |

Implement Kibicek as data-driven definitions with event-based triggers rather than hardcoding their behavior into the UI.

Abilities must be composable and produce interesting synergies.

## 6. Card enhancements

Individual cards can acquire persistent enhancements during a run.

Examples:

- **Golden:** Earn extra currency when used to win a trick.
- **Lucky:** Chance of additional points.
- **Glass:** Large multiplier with a chance of losing its enhancement.
- **Sealed:** Extra bonus when contributing to a particular contract.

Keep the traditional 32-card composition and trick-taking rules intact.

Enhancements should affect scoring and rewards, not card identity, suit, rank, or legal trick resolution.

## 7. Roguelike progression

Implement a short run containing three increasingly difficult stages.

Each stage has:

- A target score.
- A limited number of deals.
- One or more opponents.
- A reward for success.
- Access to a shop between stages.

The player loses the run if the score requirement is not reached.

The shop should sell:

- Kibicek.
- Card enhancements.
- Contract upgrades.

Use an in-game currency earned through successful play.

Introduce at least one boss modifier that changes scoring or ability availability without breaking traditional Ulti rules.

Make stage thresholds and item prices configurable.

## 8. AI opponents

The game must include two computer-controlled players.

Begin with a heuristic-based AI capable of:

- Following legal trick-taking rules.
- Recognizing trump strength.
- Conserving strong cards where appropriate.
- Attempting to defeat the declarer's contract.
- Playing differently in Betli.
- Making decisions using only information the AI is legitimately allowed to know.

Do not use an LLM for runtime AI decisions.

Build the AI behind an interface so stronger strategies can be added later.

## 9. User interface

Create a polished, desktop-first browser game.

Visual direction:

- Retro Hungarian pub atmosphere.
- Traditional Hungarian playing cards.
- Dark wooden table and warm lighting.
- Pixel-art-inspired or restrained retro typography.
- Clear card animations.
- Balatro-like visual emphasis on score, multipliers, and combinations.

The main game screen should include:

- The player's hand.
- The two opponents.
- The current trick.
- Trump suit and active contract.
- Score and multiplier.
- Active Kibicek.
- Game log.
- Controls for bidding, playing cards, and viewing rules.

The shop and run progression screens should have the same visual identity.

Use Hungarian for the player-facing UI. Code and technical documentation can be in English.

**Most importantly, the game state must always be understandable.** Show why a move is legal or illegal, why a trick was won, and where score bonuses originated.

## 10. Game speed

Traditional Ulti can be significantly slower than Balatro.

Implement:

- Fast card animations.
- Automatic resolution of forced moves.
- Optional accelerated AI turns.
- Skippable animations.
- Keyboard shortcuts where practical.

Never automatically make a meaningful strategic decision on the player's behalf unless the player explicitly enables that behavior.

## 11. Architecture

Separate the implementation into modules for:

- Card and deck definitions.
- Rules and legal moves.
- Bidding and contracts.
- Trick resolution.
- AI strategies.
- Scoring.
- Kibic effects.
- Card enhancements.
- Run progression.
- Shop and economy.
- UI components.

Use explicit types for game state, events, contracts, and effects.

Keep the core engine deterministic when given a seeded random number generator.

Implement tests for:

- Deck integrity.
- Legal card selection.
- Trick winners.
- Contract success and failure.
- Scoring modifiers and their order.
- AI move legality.
- Run progression.
- Save and restore behavior.

## 12. Implementation sequence

Work incrementally:

**Phase 1 — Core game**

Implement the card engine, legal moves, trick resolution, simple AI, and a playable Parti.

**Phase 2 — Contracts**

Implement bidding, Ulti, Betli, and contract evaluation.

**Phase 3 — Roguelike**

Add scoring, Kibicek, upgrades, shop, and stage progression.

**Phase 4 — Presentation**

Improve the visual design, animations, feedback, and usability.

**Phase 5 — Balancing**

Run deterministic simulations to identify broken contracts, uncompetitive AI, unachievable score targets, and overpowered combinations.

At the end of every phase, keep the application runnable.

## 13. Acceptance criteria

The MVP is complete when:

- A player can start a new run.
- All cards are correctly dealt and rendered.
- The player can bid and play legal cards.
- Two AI opponents complete each deal.
- Parti, Ulti, and Betli can succeed or fail correctly.
- Roguelike scores are correctly calculated and explained.
- Kibicek modify scoring during gameplay.
- The player can purchase upgrades between deals.
- At least three stages can be completed.
- A run can be won or lost.
- The game can be restarted and saved locally.
- Automated tests pass.
- The application runs locally using documented commands.

## 14. Working principles

- Prioritize a playable vertical slice over speculative features.
- Do not implement an entire sophisticated game framework before the first playable deal.
- Prefer simple, extensible systems over excessive abstraction.
- Make reasonable design decisions independently and document them.
- Do not silently change traditional Ulti rules to simplify implementation.
- If something is technically challenging, first implement the simplest correct version.
- Do not leave core game mechanics as mock functionality.
- Treat scoring values as provisional until playtested.

## 15. Your first task

Inspect the repository and the reference design document if available.

Then:

1. Establish the project structure.
2. Define the game state and rule-engine interfaces.
3. Implement the traditional card deck, dealing, legal moves, and trick resolution.
4. Build the first playable browser-based deal against two AI opponents.
5. Add basic tests.
6. Run the application and tests, fixing errors encountered.

Once the first playable deal works, proceed through the remaining implementation phases.

**Begin implementation immediately. Do not stop after writing a plan or a design document.**

The ultimate goal is an original, tactically interesting, replayable roguelike that feels simultaneously like authentic Hungarian Ulti and a satisfying Balatro-style combination-building game.
