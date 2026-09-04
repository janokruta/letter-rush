# Na Literę (letter-rush)

A pass-the-phone Polish party word game. One player holds the device, a category
and a countdown appear, and the active player must say a word fitting the category
and tap the letter it starts with before the timer runs out. Tapped letters are
claimed for the rest of the round — say them before someone else does.

The whole UI is in Polish.

## How to play

1. On the setup screen pick the players, seconds per turn, lives, and the miss rule.
2. Hand the phone to the named player, tap to start, and say a word for the shown
   category.
3. Tap the letter your word starts with before the timer hits zero.
   - Correct in time: +1 point, the letter is claimed.
   - Time out: −1 life (and, with the "skip" miss rule, you sit out the rest of the round).
4. A round ends when the board is full or one player is left standing; the survivor
   gets a bonus point and a fresh category is drawn.
5. The game ends when only one player still has lives.

Options: **Tryb dla dzieci** (kids mode) uses an easier category pool and gentler
defaults, and **Bez przerwy** (instant) skips the hand-off screen between turns.

## Running locally

Requires Node 18+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev      # dev server at http://localhost:5173
pnpm build    # production build into dist/
pnpm preview  # serve the production build
```

## Project layout

| File | Purpose |
| --- | --- |
| `letter-rush.jsx` | The entire game — a single React component (`NaLitere`), styled with an inline `<style>` block. No external CSS or component dependencies. |
| `main.jsx` | Mounts the component into `#root`. |
| `index.html` | Vite entry point. |
| `CLAUDE.md` | Architecture notes: the `phase` state machine, turn resolution, and the non-obvious bits. |

The component renders full-screen (`position: fixed; inset: 0`) and needs React
16.8+ for hooks. It uses the Web Audio API for sound (no audio files) and
`navigator.wakeLock` to keep the screen on during play — both degrade quietly
where unsupported.

## License

Apache License 2.0 — see [LICENSE](LICENSE).
