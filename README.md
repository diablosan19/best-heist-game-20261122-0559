# Amber Vault — The Meridian Heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/diablosan19/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/diablosan19/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down heist game that runs entirely in the browser: three night-shift floors of the Meridian Museum, guards sweeping red vision cones across marble halls, wall cameras that pan and blink, display cases and pillars to break line of sight, and one amber prize per floor to lift before you walk out the green exit unseen. No asset files, no network requests — all art drawn on canvas, all sound synthesized live.

## How to play

- **WASD / arrows** — move Rook, the thief.
- **Shift** — sneak: slower, quieter, harder to spot.
- **Click** — toss a noise-maker (3 per floor) and pull a nearby guard off its route to investigate the clatter.
- **Q** — fire the EMP (2 per floor): cameras go dark for 6 seconds.
- **E** — slip on the curator's disguise (1 per floor, 8 seconds): guards look straight through you unless you get very close.
- **P** — pause. **R** — restart the floor. **M** — mute.

A guard's vision cone is its whole world: step into it and its suspicion climbs — faster up close, faster while you run, slower while you sneak or hide behind a case. At 50 it stops and stares, at 80 it walks over to look, at 100 it runs you down. Cameras feed the same alarm meter: let it hit 100 and every guard in the building converges on you. Break line of sight and suspicion drains, the guard gives up and goes back to its patrol — a near miss is a scare, not a sentence. Get caught and you lose a life and restart the floor.

## The three floors

1. **The Amber Gallery** — two guards, one long hall, the Sun of Meridian glowing on its plinth. Learn the rhythm, then walk it.
2. **The Vault Hall** — a wall splits the hall, three guards cross it, two cameras pan the doors. Use the cases, not the open floor.
3. **The Sun Vault** — four guards, three cameras, a tight vault, no easy line. The Crown of Tides waits at the far end.

Coins are a risk worth taking (+50 each), the prize is the job (+500), finishing a floor never spotted pays a ghost bonus (+300), and beating par time pays a little more. Lose all three lives and the whole job starts over.

## Run it

Serve the game locally:

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Click (or press Enter) to begin.

Package the entry the way the judge receives it:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```
