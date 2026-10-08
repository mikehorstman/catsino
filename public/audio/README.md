# Audio assets

Drop the sound effects here (`.mp3`). Names match `src/stores/audio.ts`:

- `click.mp3` — UI button
- `spin.mp3` — slot spin loop
- `reel-stop.mp3` — reel stop
- `win.mp3` — win
- `big-win.mp3` — big win
- `coin.mp3` — coin collect
- `roulette.mp3` — roulette spin

Missing files degrade silently (Howler swallows load errors), so the app is fully
playable without them.
