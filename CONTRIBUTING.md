# Contributing to Pixel Arcade

Thanks for your interest in contributing! This is a small static-HTML game hub — no build step, no dependencies. Adding
a game or fixing a bug should be a 5-minute job.

## Quickstart

```bash
git clone https://github.com/HossamBalaha/Pixel-Arcade.git
cd Pixel-Arcade
python3 -m http.server 8000
# open http://localhost:8000/ in your browser
```

No `npm install` for the site itself, no compilation. Just edit, refresh, ship.

## The toolchain (dev-only, never shipped)

The site stays 100% static, but the repo ships a few developer tools you can run locally:

| Tool                                        | What it does                                                                                                                                          | When to run it                     |
|---------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------|
| `node tools/test-games.js`                  | Headless JSDOM smoke test — mounts all 300 games, calls `hint()`/`solve()`/`help()`/cleanup, fails on any throw. Needs `npm i jsdom` once (dev-only). | After touching any game            |
| `node tools/generate-thumbnails.js --check` | Verifies every catalog game has a valid, font-safe SVG thumbnail.                                                                                     | After adding a game                |
| `python3 tools/audit-colors.py`             | Color-clash audit — computes worst-case WCAG contrast for every canvas element/background pair across all 79 theme variants.                          | After touching canvas drawing code |

Run the relevant ones before opening a PR — it saves everyone time.

## Ways to contribute

- **Add a new game** — see "Adding a new game" below.
- **Improve an existing game** — bug fixes, better AI, mobile gestures, accessibility.
- **Improve themes** — better contrast, new theme presets, better mobile spacing.
- **Improve word/question lists** — more words for Wordle, more trivia questions, etc.
- **Fix typos in the README.**

## Adding a new game

1. Create `js/games/mygame.js`:

```javascript
(function () {
  let live = null;
  GameRegistry.register({
    id: "mygame",                 // unique slug, used in URL hash
    name: "My Game",
    icon: "🎲",                    // single emoji
    category: "logic",            // word | logic | arcade | strategy | quiz
    description: "One short sentence.",
    tags: ["fun", "new"],
    mount: function (root, ctx) {
      const { App, AudioFX, Storage } = ctx;
      let alive = true;
      const pendingTimers = [];
      function later(fn, ms) {
        const id = setTimeout(() => { if (alive) fn(); }, ms);
        pendingTimers.push(id);
        return id;
      }
      // ... build your UI inside root ...
      let state = { /* live state */ };
      function doHint() { /* ... */ }
      function doSolve() { /* ... */ }
      live = { hint: doHint, solve: doSolve };

      function onKey(e) { /* ... */ }
      document.addEventListener("keydown", onKey);

      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        pendingTimers.forEach(clearTimeout);
        live = null;
      };
    },
    hint: function () { if (live && live.hint) live.hint(); },
    solve: function () { if (live && live.solve) live.solve(); },
    help: function () {
      App.showModal("How to play My Game", "...");
    },
  });
})();
```

2. Register the game in `js/catalog.js` (the hub renders from this manifest and lazy-loads each game's script on
   demand), then generate its thumbnail automatically:

   ```bash
   node tools/generate-thumbnails.js --only=mygame   # no flags = regenerate ALL thumbnails
   ```

   The generator writes `assets/thumbnails/mygame.svg` (220×140, icon on a category-coded gradient) and
   overwrites whatever is there. To restyle thumbnails site-wide, edit the CONFIG at the top of
   `tools/generate-thumbnails.js` and re-run it.

3. Test by visiting `http://localhost:8000/#/mygame` (or `?game=mygame` for the shareable deep link).

4. If your game has a "best score" worth tracking, call `Storage.setBest("mygame", value)` when the game ends.
5. Optional — declare difficulty variants so the shell shows a dropdown in the game header:

   ```javascript
   variants: [
     {key: "4", label: "Classic 4×4"},   // first entry = the default
     {key: "3", label: "3×3 Blitz"},
   ],
   // inside mount():
   const SIZE = parseInt(Storage.getVariant("mygame", "4"), 10) || 4;
   ```

   The shell persists the choice per game and re-mounts on change. The first entry MUST match the mount fallback, and
   the default variant must reproduce the classic behavior. If variants make best scores incomparable (different board
   sizes, speeds), key bests as `"mygame:<key>"` for non-default variants and keep the plain id for the default, so
   existing players' bests survive.

## Coding style

- **Vanilla ES5/ES6 only** — no jQuery, no React, no bundler. (Yes, jQuery is allowed per project policy, but the
  existing games don't use it — keep it that way for consistency.)
- **CSS variables for theming** — never hardcode colors in DOM/UI code. Always use `var(--accent)`, `var(--bg-elev)`,
  etc. so all 79 theme variants × light/dark keep working.
- **Canvas color rule** (learned the hard way): a game with a FIXED scene background (a rink, a night sky, a cave)
  must draw its elements in FIXED high-contrast colors — never `var(--text)`/`var(--accent)`, which can collide with
  the scene in some themes. A game that fills its canvas with `var(--bg-soft)` must draw everything with theme
  variables that contrast in every theme. Run `python3 tools/audit-colors.py` if unsure — it checks all 79 themes.
- **Respect reduced motion** — wrap animations in `@media (prefers-reduced-motion: no-preference)` where aggressive.
- **Always clean up** — your `mount()` MUST return a cleanup function that removes event listeners, clears
  `setInterval`/`setTimeout`, and cancels `requestAnimationFrame`. Use the `alive` flag pattern shown above.
- **No external API keys.** Wikipedia + Open Trivia DB are fine (no key). Anything else, ask first.

## Pull request checklist

- [ ] Game mounts cleanly (no console errors)
- [ ] Game cleans up properly (no dangling intervals, listeners, or rAF loops)
- [ ] Game works in the main themes (Modern Minimal, Retro Arcade, Playful Cartoon, Dark Neon Casino) × both modes
  (light/dark) — and looks sane in a couple of the accent themes (Ocean, Candy, …)
- [ ] Game is keyboard-operable (where it makes sense)
- [ ] Game is mobile-friendly (responsive, swipe where applicable)
- [ ] Game registered in `js/catalog.js` and thumbnail generated via `tools/generate-thumbnails.js`
  (`node tools/generate-thumbnails.js --check` passes)
- [ ] `node tools/test-games.js` passes for your game (and ideally the full 300)
- [ ] README updated if the game list changed

## Adding a curated collection

Curated shelves ("5-Minute Breaks", "Two-Player Night", …) live in `js/collections.js`. Add an entry with a unique
`id` (slug — it becomes the `#/collection/<id>` hash route), a display `name`, an `icon`, a one-line `blurb`, and a
cheap `match(g)` predicate over catalog metadata. Keep predicates pure and fast — they run over all 300 games on
route. No server, no build step.

## Reporting bugs

Open an issue with:

- Game ID (e.g. `wordle`)
- Browser + OS
- Steps to reproduce
- Expected vs. actual behavior
- Console errors (if any)

## Reporting security issues

See [SECURITY.md](./SECURITY.md).

## Code of Conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## License

By contributing, you agree your contributions will be licensed under the [MIT License](./LICENSE).
