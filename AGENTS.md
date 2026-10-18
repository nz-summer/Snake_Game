# Snake: notes for future AI models and developers

Read this before changing the game. It records what the project is, how it is built, the decisions made, and the known gaps.

## What this is

A classic Snake game for the moonstar.games portal, embedded as an iframe (16:9 frame, about 880px wide, 360px on phones). It was derived from the MIT-licensed OpenGames.dev project (`opengames-dev/opengames-dev.github.io`), then made fully standalone and restyled. `LICENSE` in this folder must stay (MIT notice).

The folder is self-contained. It imports nothing from sibling games or the repo root, and it can be zipped and served on its own. Keep it that way (see `../ARCHITECTURE.md`; the portal rules are in `../Games guide.txt`).

## Stack

Plain HTML, CSS and vanilla JavaScript. No framework, bundler, npm or build step. Scripts are ordinary `defer` tags, not ES modules, so `index.html` works from `file://`. Canvas 2D draws the board. Web Audio synthesizes all sound (there are no audio or image files). Artwork is inline SVG and canvas drawing.

To run: open `index.html`, or serve the folder (`python -m http.server 8080`).

## Files

| File | Role |
| --- | --- |
| `index.html` | Page markup: top bar (Score, Best Score, Pause, Sound, hidden Settings and Fullscreen), board canvas, Ready/Paused/Game over overlay, on-screen arrows. |
| `logic.js` | Pure game rules (`SnakeLogic`), no DOM. `create(cols, rows)`, `turn`, `step`, `resize` (moves a game onto a new grid size), `foodFor`, `vectors`. Also exported with `module.exports` for Node tests. |
| `game.js` | Responsive board sizing, game loop, drawing, scoring, crash animation, wiring of everything. |
| `tests/logic.test.cjs` | Node tests for `logic.js` (`node --test tests/logic.test.cjs`). |
| `shared/ui.js` | `window.OG`: storage helper, `createUI` (overlay, pause button, settings, fullscreen), `canvasView` (sharp canvas resize). |
| `shared/input.js` | `window.OGInput.bind`: keyboard, swipe, on-screen arrow buttons (`[data-direction]`), gamepad. |
| `shared/style.css` | All styling. |
| `shared/favicon.svg` | Tab icon. |
| `sound/audio.js` | `window.OGAudio`: `play(name)`, `toggle()`, `enabled`. Effects: move, flip, hit, eat, success, failure, crash. |

`shared/` and `sound/` are this game's own copies. Other games have their own, and they have diverged from Snake's. Do not assume a change here applies there.

## Game rules and behaviour

- Board: a `cols x rows` grid of square cells whose size comes from the available space (see Responsive board). `SnakeLogic.create(cols, rows)`; one argument gives a square grid. Snake starts with 3 segments in the middle heading right.
- Fixed-timestep simulation. Step time = `max(65, 140 - score * 2)` ms (140 ms is Normal). The code in `game.js` `tick` still has an `{ easy: 185, normal: 140, hard: 105 }` table, but only Normal is reachable (see Hidden features).
- Input queue holds up to 2 turns. Instant 180-degree reversals are rejected. Entering the cell the tail just left is allowed.
- Wall or body hit ends the game. Filling the board is a win (`state.won`).
- Score: +1 per apple. Best score is saved.
- Pauses automatically when the tab is hidden or the window loses focus. Esc pauses, R restarts, Space/Enter starts or resumes.

## Responsive board

The game sizes itself from its **own viewport** (the iframe), never from the parent site. `game.js` (`computeGrid` / `applyLayout`):

- `.game-main` fills the viewport (`100dvh`, no page scroll). A `ResizeObserver` on it plus `window.resize` call `scheduleLayout` (one `requestAnimationFrame` per burst).
- Space for the board = viewport minus page padding, the frame padding and everything above or below the board (top bar, on-screen arrows), which is **measured**, not hardcoded.
- Preferred board shape by viewport width (width / height): 1200+ is 1.6 (16:10), 768-1199 is 1.5 (3:2), 600-767 is 1 (square), under 600 is 0.75 (3:4). The shape may stretch by `SLACK_WIDE` (1.6) or `SLACK_PORTRAIT` (1.35, phones) either way so little space is wasted. These are constants at the top of the section.
- Cells are always square: `cell` is 18-40 CSS px (about board height / 17), `cols = floor(w / cell)`, `rows = floor(h / cell)`, minimum 8x8. The board is exactly `cols * cell` by `rows * cell`; the result is written to `--board-w` / `--board-h` on `.game-layout`, which the CSS uses for the top bar and `.play-area`. There is no fixed max width.
- When the grid size changes mid-game, `SnakeLogic.resize` shifts the whole snake and the apple together (so shape and collisions stay valid) and re-rolls the apple only if it ends up off-grid or on the snake. A game in progress then auto-pauses. If the snake cannot fit at all it returns `'reset'` and `restart()` runs.
- Overlays: `.play-area` is a size container; the Ready card hides its illustration under 360 px board height and its arrow keys and best score under 300 px.
- Mobile test sizes used: 390x844 and 375x667 with touch emulation. Real phones were not used.
## UI behaviour worth knowing

- **Top bar:** Score card (green, apple icon) and Best Score card (cream, crown icon) on the left. Pause and Sound icon buttons on the right. Pause button swaps icon by `aria-pressed`; Sound button swaps by `aria-pressed` (true = on). Labels are updated through `aria-label`, not text.
- **Ready screen:** overlay with class `is-ready`: a small card with an illustration, the saved best score (`#ready-best`, copied from `#best` in `ui.showOverlay`), four clickable arrow keys (`#overlay-keys`, they carry `data-direction` so `input.js` binds them and a tap starts the game), and a Play button. The board stays visible behind a light dark layer. The card shows only when the overlay title is exactly `'Ready'`; other overlays (Paused, Game over) use the plain style.
- **Crash sequence (wall or self hit):** `game.js` `end()` does not show Game over at once. It sets `crashing`, plays the `crash` sound, and `crashLoop` animates for `CRASH_MS` (1100 ms): X eyes, long tongue, impact burst, short shake (skipped with reduced motion), then `showEnd()`. `restart()` cancels the crash. A win skips the crash and shows the end screen directly.
- **On-screen arrow buttons** (`.dpad`) are a compact diamond below the board (up on top, left and right beside, down underneath; 46px soft green buttons with SVG arrows, about 148x116 px in all). They are hidden on devices with a mouse (`hover: hover` and `pointer: fine`); phones and tablets see them. `computeGrid` measures their height, so the board shrinks to make room. The Ready card also has its own small arrow keys.
- **Layout:** one framed card; see Responsive board. Fullscreen styles exist (`.is-focused`) and were checked through the focus view, but the button is hidden.

## Hidden features (deliberate, may return)

Both are kept in the code but have the `hidden` attribute in `index.html`:

- **Settings gear** (`#settings`): holds difficulty buttons (Easy / Normal / Hard), a Restart button and the controls hint. While hidden, `ui.js` forces difficulty to Normal and ignores any saved difficulty. To bring difficulty back, remove `hidden` from `#settings`.
- **Fullscreen button** (`#fullscreen`): remove `hidden` to show it. The iframe also needs `allowfullscreen`.

## Storage keys (localStorage)

- Best score: `moonstar:snake:best:<difficulty>` (so `moonstar:snake:best:normal` today).
- Difficulty: `moonstar:snake:difficulty`.
- Sound: `snake:sound` (`'on'` or `'off'`). Sound is **on by default**; only an explicit `'off'` turns it off. Audio still starts only after the first click, tap or key press (browser rule).

All keys are game-prefixed because every MoonStar-hosted game shares one origin (see `../Games guide.txt`). The sound key lacks the `moonstar:` prefix that the others use; it is still namespaced, but keep new keys consistent with the `moonstar:snake:` form.

## Constraints from the portal (`../Games guide.txt`)

Relative paths only (the game is served from a versioned subfolder). Entry point is `index.html`. Be responsive from about 360px to 1920px wide. Audio only after a user gesture. No external requests, ads or trackers. Pause when the tab loses focus. Keys and space must not scroll the parent page. The frame is 16:9, so the board is sized by height as well as width.

## Known gaps

- Not tested on real phones. Touch behaviour and layouts were checked only with Chrome device emulation (sizes listed under Responsive board).
- Only the logic is covered by committed tests (`tests/logic.test.cjs`). Layout and gameplay were checked with a throwaway Chrome DevTools script that is not in the repo.
- The `easy` and `hard` speeds and the difficulty UI are untested since being hidden.
- Cache-busting query strings (`?v=2026-10-09`) on script and style tags are static. Bump them when deploying changes if browsers serve stale files.

## When you change something

- Keep `logic.js` free of DOM and randomness other than the injected `random` parameter.
- Keep the page working from `file://` (no modules, no fetch of local files).
- Update this file when you change behaviour, files, storage keys or hidden features.
- Do not tell the user something was verified on a phone unless it actually was.
