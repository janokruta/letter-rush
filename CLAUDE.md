# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`letter-rush.jsx` is a single-file React component (default export `NaLitere`) — a
pass-the-phone Polish party word game ("Na Literę"). One player holds the device,
a category and a countdown appear, and the active player must say a word fitting the
category and tap the letter it starts with before the timer runs out. All UI text is
Polish; keep it that way.

There is no build tooling, `package.json`, test suite, or lint config in this repo —
just the one `.jsx` file. It expects a React 16.8+ host (uses hooks) and is styled
entirely via an inline `<style>` block, so it drops into any React app with no external
CSS or component dependencies. To run it, import the default export into a React project
and render it full-screen (the root is `position:fixed; inset:0`).

## Domain constraints (don't "fix" these)

- `ALPHABET` deliberately omits **Q, V, X, Y** — no Polish word starts with them — and
  treats Ł/Ś/Ż as L/S/Z (no diacritics). Changing the alphabet changes `BULBS`-independent
  layout math and the board-cleared win condition.
- Two category pools: `CATEGORIES_ALL` and `CATEGORIES_KIDS`. Kids mode (`kids` state) also
  forces easier defaults (`limit=10`, `missRule="life"`) when selected in setup.

## Architecture: the phase state machine

All game flow is driven by the `phase` state variable. Understanding the transitions is the
key to the file:

`setup → ready → live → result → (roundend →) ready|live → … → over`

- **setup** — configuration screen (players, seconds/turn, lives, miss rule, kids mode).
  `startGame()` seeds `players`, shuffles the category `deck`, and moves to `ready`.
- **ready** — hand-off screen naming the next player. Skipped when `instant` ("Bez przerwy")
  is on; then turns go straight to `live`. `goLive()` advances to `live`.
- **live** — the timer runs and letter tiles are tappable. Ends either by `claim(letter)`
  (player tapped a letter) or by the timer hitting zero.
- **result** — the green/red flash. Always entered via `resolve()`.
- **roundend** — the between-rounds banner (survivor or "all letters taken").
- **over** — final scoreboard.

### Turn resolution — `resolve(letter)`

`letter === null` means the **timer won** (miss); a real letter means success.
`resolve` is guarded by the `locked` ref so a tap and a simultaneous timer expiry can't
both fire. On success: +1 score, letter recorded in `taken` (letter → player name).
On miss: -1 life, and if `missRule === "skip"` the player is benched for the rest of the
round (`skipped = true`). After a delay it calls `advance()`.

### Round/game progression — `advance(list, takenNow)`

This is the trickiest logic; read it whole before editing:

- **Game over** when only one player has lives left (or, in solo play, zero) → `over`.
- **Round over** when the board is full (`taken` has all letters) or ≤1 player is still
  "in" (alive and not skipped). On round end: the round survivor gets a bonus point, every
  player with lives left is un-benched (`skipped` reset, revived for the next category),
  `taken` clears, a new `category` is drawn, and it shows the `roundend` banner before
  resuming.
- Otherwise it's just the next player's turn via `nextInPlay()`.

`nextInPlay(list, from)` finds the next player who is both alive (`lives > 0`) and not
`skipped`, wrapping around the list.

## Non-obvious implementation details

- **Timer** (`useEffect` on `phase`/`turnId.current`): a `setInterval` compares against a
  `Date.now()` deadline rather than counting down, so it stays accurate. `turnId` is a ref
  bumped on every new turn — incrementing it is what *restarts* the timer effect for the
  next `live` turn (phase stays `"live"` between consecutive instant turns, so `phase`
  alone wouldn't retrigger it).
- **Refs vs state**: `deck` (remaining categories), `turnId`, `locked`, and `wakeLock` are
  refs precisely because changing them must **not** trigger a re-render. Don't convert them
  to state.
- **`useSound`** builds tones with the Web Audio API on the fly (no audio files). The
  AudioContext is lazily created and resumed on first user gesture (`sfx.unlock()` is called
  from `startGame`/`goLive`) to satisfy browser autoplay policies.
- **Wake lock**: `navigator.wakeLock` keeps the screen awake during play (any phase that
  isn't `setup`/`over`); failures are swallowed since support varies.
- **Visual timer**: the `marquee` row of `BULBS` (20) bulbs empties as time runs out;
  `panic` (≤2s left) turns them red and buzzes the hint.
- The "Nowa kategoria" foot button is intentionally disabled during play (`skipCategory`
  exists but is wired only to a disabled button).
