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

No `npm install`, no compilation. Just edit, refresh, ship.

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

## Coding style

- **Vanilla ES5/ES6 only** — no jQuery, no React, no bundler. (Yes, jQuery is allowed per project policy, but the
  existing games don't use it — keep it that way for consistency.)
- **CSS variables for theming** — never hardcode colors. Always use `var(--accent)`, `var(--bg-elev)`, etc. so the 4
  themes + light/dark all work.
- **Respect reduced motion** — wrap animations in `@media (prefers-reduced-motion: no-preference)` where aggressive.
- **Always clean up** — your `mount()` MUST return a cleanup function that removes event listeners, clears
  `setInterval`/`setTimeout`, and cancels `requestAnimationFrame`. Use the `alive` flag pattern shown above.
- **No external API keys.** Wikipedia + Open Trivia DB are fine (no key). Anything else, ask first.

## Pull request checklist

- [ ] Game mounts cleanly (no console errors)
- [ ] Game cleans up properly (no dangling intervals, listeners, or rAF loops)
- [ ] Game works in all 4 themes (Modern Minimal, Retro Arcade, Playful Cartoon, Dark Neon Casino) × both modes
  (light/dark)
- [ ] Game is keyboard-operable (where it makes sense)
- [ ] Game is mobile-friendly (responsive, swipe where applicable)
- [ ] Game registered in `js/catalog.js` and thumbnail generated via `tools/generate-thumbnails.js`
  (`node tools/generate-thumbnails.js --check` passes)
- [ ] README updated if the game list changed

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
