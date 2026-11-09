/* ============================================================
   registry.js — Game registry pattern
   A game registers itself with metadata + a mount function.
   App.js renders the grid from the registry and mounts games on demand.

   GameRegistry.register({
     id: 'wordle',          // unique slug, also used in URL hash
     name: 'Wordle',
     icon: '🔤',             // emoji or short text
     category: 'word',      // word | logic | arcade | strategy | quiz
     description: 'Guess the 5-letter word in 6 tries',
     tags: ['keyboard', 'word', 'popular'],
     // Optional metadata used by the advanced filter UI:
     age: 'all',            // 'all' | 'kids' | 'teens' | 'adults' (or array of those)
     difficulty: 'medium',  // 'easy' | 'medium' | 'hard'
     duration: 'medium',    // 'quick' (<2 min) | 'medium' (2-10 min) | 'long' (>10 min)
     players: 'single',     // 'single' | '2p' | 'either'
     // mount(rootEl, ctx) — build your UI inside rootEl, return a cleanup fn
     mount: function(root, ctx) { ... return function cleanup() {...}; },
     // help() — optional, opens a help modal explaining the game
     help: function() { App.showModal('How to play Wordle', '...'); },
     // hint() — optional, gives the player a nudge (e.g. reveal one letter)
     hint: function() { ... },
     // solve() — optional, reveals the full solution (for when player gives up)
     solve: function() { ... },
   });
   ============================================================ */
(function (global) {
  "use strict";

  const games = [];
  const byId = {};
  const pendingAugment = {}; // id -> extra metadata, applied when the game registers

  function asArray(v) {
    return Array.isArray(v) ? v : [v];
  }

  const Registry = {
    register(meta) {
      if (!meta || !meta.id) throw new Error("Game must have an id");
      const lazyPrev = byId[meta.id] || null;
      // Replace a lazy placeholder IN PLACE (same index) so loading a game's
      // script never reshuffles the grid. Splicing + pushing to the end used
      // to teleport every opened/hovered game to the bottom of the grid on
      // the next render, which made the ordering feel shuffled.
      let insertAt = games.length;
      if (lazyPrev) {
        const idx = games.indexOf(lazyPrev);
        if (idx >= 0) {
          games.splice(idx, 1);
          insertAt = idx;
        }
      }
      // Inherit richer metadata (age/difficulty/duration/players) from the
      // catalog's lazy declaration so the game file itself can stay lean.
      if (lazyPrev) {
        for (const k of ["age", "difficulty", "duration", "players", "description", "tags", "icon", "category"]) {
          if (meta[k] === undefined && lazyPrev[k] !== undefined) meta[k] = lazyPrev[k];
        }
      }
      const full = Object.assign({
        category: "logic",
        icon: "🎮",
        description: "",
        tags: [],
        age: "all",
        difficulty: "medium",
        duration: "medium",
        players: "single",
      }, meta);
      // Normalise age to an array (e.g. ['all'] or ['kids','teens'])
      full.age = asArray(full.age);
      const pend = pendingAugment[full.id];
      if (pend) {
        for (const k in pend) {
          if (k === "age") full.age = asArray(pend.age);
          else full[k] = pend[k];
        }
        delete pendingAugment[full.id];
      }
      games.splice(insertAt, 0, full);
      byId[full.id] = full;
    },
    // Declare metadata-only entries. The app renders the grid from these
    // and lazy-loads each game's real script (js/games/<id>.js) on open.
    declare(list) {
      list.forEach(meta => {
        if (!meta || !meta.id) return;
        if (byId[meta.id]) return; // already registered for real
        const full = Object.assign({
          category: "logic",
          icon: "🎮",
          description: "",
          tags: [],
          age: "all",
          difficulty: "medium",
          duration: "medium",
          players: "single",
        }, meta);
        full.age = asArray(full.age);
        full.lazy = true;
        games.push(full);
        byId[full.id] = full;
      });
    },
    // Is a game's script loaded yet? (declared but not registered)
    isLazy(id) {
      const g = byId[id];
      return !!(g && g.lazy);
    },
    // Load a game's script on demand. Resolves when register() ran.
    load(id) {
      const g = byId[id];
      if (!g || !g.lazy) return Promise.resolve();
      if (g._loading) return g._loading;
      g._loading = new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.src = "js/games/" + id + ".js";
        el.onload = () => resolve();
        el.onerror = () => reject(new Error("Failed to load " + id));
        document.head.appendChild(el);
      });
      return g._loading;
    },
    // Augment an already-registered game with extra metadata (used by
    // game-metadata.js to add age/difficulty/duration/players to legacy games
    // without editing each file).
    augment(id, extra) {
      let g = byId[id];
      if (!g) {
        // Lazy games aren't registered yet — queue the augmentation.
        pendingAugment[id] = Object.assign(pendingAugment[id] || {}, extra);
        return;
      }
      for (const k in extra) {
        if (k === "age") g.age = asArray(extra.age);
        else g[k] = extra[k];
      }
    },
    all() {
      return games.slice();
    },
    get(id) {
      return byId[id] || null;
    },
    byCategory(cat) {
      if (cat === "all") return games.slice();
      return games.filter(g => g.category === cat);
    },
    // Multi-dimensional filter. Pass an object like:
    // { category: 'word', age: 'kids', difficulty: 'easy', duration: 'quick', players: 'single' }
    // Any dimension set to 'all' (or undefined) is ignored.
    filter(opts) {
      opts = opts || {};
      return games.filter(g => {
        if (opts.category && opts.category !== "all" && g.category !== opts.category) return false;
        if (opts.age && opts.age !== "all") {
          const list = asArray(g.age);
          // 'all' age games match every age filter
          if (!list.includes("all") && !list.includes(opts.age)) return false;
        }
        if (opts.difficulty && opts.difficulty !== "all" && g.difficulty !== opts.difficulty) return false;
        if (opts.duration && opts.duration !== "all" && g.duration !== opts.duration) return false;
        if (opts.players && opts.players !== "all") {
          if (g.players === "either") { /* matches both */
          } else if (g.players !== opts.players) return false;
        }
        if (opts.search) {
          const s = opts.search.toLowerCase();
          if (!(
            g.name.toLowerCase().includes(s) ||
            g.description.toLowerCase().includes(s) ||
            g.tags.some(t => t.toLowerCase().includes(s))
          )) return false;
        }
        if (opts.favOnly && !global.Storage.isFavorite(g.id)) return false;
        return true;
      });
    },
    // Legacy search kept for backward compatibility
    search(q) {
      const s = q.toLowerCase().trim();
      if (!s) return games.slice();
      return games.filter(g =>
        g.name.toLowerCase().includes(s) ||
        g.description.toLowerCase().includes(s) ||
        g.tags.some(t => t.toLowerCase().includes(s))
      );
    },
    // Suggest up to `n` games similar to the given id, scored by category,
    // difficulty, duration, players, and shared tags. Excludes the source game
    // and any games not currently registered.
    similar(id, n) {
      n = n || 4;
      const g = byId[id];
      if (!g) return [];
      const scored = games
        .filter(x => x.id !== id)
        .map(x => {
          let score = 0;
          if (x.category === g.category) score += 5;
          if (x.difficulty === g.difficulty) score += 2;
          if (x.duration === g.duration) score += 1;
          if (x.players === g.players) score += 1;
          // shared tags
          const shared = (x.tags || []).filter(t => (g.tags || []).includes(t)).length;
          score += shared * 2;
          // small randomness so the list isn't always identical
          score += Math.random() * 0.5;
          return {game: x, score};
        })
        .sort((a, b) => b.score - a.score);
      return scored.slice(0, n).map(s => s.game);
    },
    // Return the most-recently-played games (Storage-driven), filtered to only
    // games that still exist in the registry. Returns up to `n` game objects.
    recent(n) {
      n = n || 6;
      const ids = (global.Storage && global.Storage.getRecent) ? global.Storage.getRecent() : [];
      const out = [];
      for (const id of ids) {
        const g = byId[id];
        if (g) out.push(g);
        if (out.length >= n) break;
      }
      return out;
    },
  };

  global.GameRegistry = Registry;
})(window);
