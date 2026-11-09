/* ============================================================
   storage.js — localStorage helpers for the Game Hub
   Namespaced under "gamehub:" so nothing collides.
   Tracks: theme/mode/sound, favorites, best scores, recent,
   plays + stats, daily streaks, achievements, hidden games,
   weekly play counts (for trending), accessibility settings.
   ============================================================ */
(function (global) {
  "use strict";

  const NS = "gamehub:";
  const KEYS = {
    THEME: NS + "theme",
    MODE: NS + "mode",
    SOUND: NS + "sound",
    FAVS: NS + "favorites",
    BESTS: NS + "best-scores",
    VISITS: NS + "visits",
    A11Y: NS + "a11y",
    RECENT: NS + "recent",
    PLAYS: NS + "plays",          // { gameId: [{ ts, won, score }] }
    STATS: NS + "stats",          // aggregate counters
    STREAK: NS + "streak",        // { current, longest, lastDay }
    ACHV: NS + "achievements",    // [ achievementId, ... ]
    HIDDEN: NS + "hidden",        // [ gameId, ... ]
    WEEKLY: NS + "weekly",        // { gameId: [ ts, ts, ... ] (last 7 days) }
    INSTALL_DISMISS: NS + "install-dismissed",
    STATE_PREFIX: NS + "state:",  // per-game saved JSON state (save/resume)
    PLAYTIME: NS + "playtime",    // { gameId: seconds } — cumulative play time
    EVENTS: NS + "events",        // { shared: n, themeChanged: n, paletteUsed: n, ... } — one-off UI event counters
    CUSTOM_THEME: NS + "custom-theme", // user-built theme { accent, base, font }
  };
  const RECENT_MAX = 20;
  const WEEKLY_DAYS = 7;

  // Build the per-game state key (kept inside Storage so we can list/clear later).
  function stateKey(gameId) {
    return KEYS.STATE_PREFIX + gameId;
  }

  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("storage.get failed", key, e);
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("storage.set failed", key, e);
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
    }
  }

  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  const Storage = {
    // Theme + mode + sound
    getTheme() {
      return get(KEYS.THEME, "minimal");
    },
    setTheme(t) {
      set(KEYS.THEME, t);
    },
    getMode() {
      return get(KEYS.MODE, "light");
    },
    setMode(m) {
      set(KEYS.MODE, m);
    },
    getSound() {
      return get(KEYS.SOUND, true);
    },
    setSound(on) {
      set(KEYS.SOUND, on);
    },

    // Favorites
    getFavorites() {
      return get(KEYS.FAVS, []);
    },
    isFavorite(id) {
      return Storage.getFavorites().includes(id);
    },
    toggleFavorite(id) {
      const favs = Storage.getFavorites();
      const i = favs.indexOf(id);
      if (i === -1) favs.push(id); else favs.splice(i, 1);
      set(KEYS.FAVS, favs);
      return i === -1; // true if newly added
    },

    // Best scores per game
    getBests() {
      return get(KEYS.BESTS, {});
    },
    getBest(id) {
      return Storage.getBests()[id] ?? null;
    },
    setBest(id, value) {
      const bests = Storage.getBests();
      bests[id] = value;
      set(KEYS.BESTS, bests);
    },
    // Submit a score; returns true if it became the new best
    submitScore(id, value, opts) {
      opts = opts || {};
      const cur = Storage.getBest(id);
      let isBest = false;
      if (cur === null) {
        isBest = true;
      } else if (opts.higherBetter !== false && value > cur) {
        isBest = true;
      } else if (opts.higherBetter === false && value < cur) {
        isBest = true;
      }
      if (isBest) Storage.setBest(id, value);
      return isBest;
    },

    // Visit counter
    getVisits() {
      return get(KEYS.VISITS, 0);
    },
    incVisits() {
      set(KEYS.VISITS, Storage.getVisits() + 1);
    },

    // Accessibility settings (font scale, high contrast, reduce motion, dyslexia font, color-blind mode)
    getA11y() {
      return Object.assign({
        fontScale: 100,         // 80 / 90 / 100 / 110 / 120 / 140 (%)
        highContrast: false,
        reduceMotion: false,
        dyslexiaFont: false,
        colorBlind: "off",      // off | protanopia | deuteranopia | tritanopia
        largeFocus: false,
        osPrefersHonored: true, // auto-detect OS settings on first visit
      }, get(KEYS.A11Y, {}));
    },
    setA11y(opts) {
      const cur = Storage.getA11y();
      set(KEYS.A11Y, Object.assign(cur, opts));
    },

    // Recently played games (most-recent-first). Capped at RECENT_MAX.
    getRecent() {
      return get(KEYS.RECENT, []);
    },
    addRecent(id) {
      if (!id) return;
      const recent = Storage.getRecent().filter(x => x !== id);
      recent.unshift(id);
      set(KEYS.RECENT, recent.slice(0, RECENT_MAX));
    },
    clearRecent() {
      set(KEYS.RECENT, []);
    },

    // ---------- Plays & stats ----------
    // Plays log: { gameId: [{ ts, won, score }] }
    getPlays() {
      return get(KEYS.PLAYS, {});
    },
    getPlaysFor(id) {
      return Storage.getPlays()[id] || [];
    },
    // Record a play. won is boolean; score is optional number. Also bumps
    // aggregate stats (totalPlays / totalWins / categoriesPlayed / gamesPlayed)
    // inline so a single call is enough — no monkey-patch wrapper needed.
    recordPlay(id, won, score) {
      const plays = Storage.getPlays();
      if (!plays[id]) plays[id] = [];
      plays[id].push({ts: Date.now(), won: !!won, score: score ?? null});
      // Cap per-game log at 200 entries to avoid unbounded growth
      if (plays[id].length > 200) plays[id] = plays[id].slice(-200);
      set(KEYS.PLAYS, plays);
      // Weekly trending counters
      Storage._recordWeekly(id);
      // Daily streak
      Storage._touchStreak();
      // Aggregate stats — was previously hooked via a wrapper at the bottom
      // of this file; inlined here for clarity.
      Storage._bumpStats(id, won);
    },
    // Update the most recent play entry for a game (used by App.recordResult
    // to set the actual win/score without double-counting the play).
    updateLastPlay(id, won, score) {
      const plays = Storage.getPlays();
      if (!plays[id] || !plays[id].length) {
        // No existing play entry — create one
        Storage.recordPlay(id, won, score);
        return;
      }
      const last = plays[id][plays[id].length - 1];
      const wasWon = last.won;
      last.won = !!won;
      last.score = score ?? last.score;
      set(KEYS.PLAYS, plays);
      // If the result changed from loss to win, bump win count
      if (!wasWon && won) {
        const s = Storage.getStats();
        s.totalWins++;
        set(KEYS.STATS, s);
      }
    },
    _recordWeekly(id) {
      const weekly = get(KEYS.WEEKLY, {});
      if (!weekly[id]) weekly[id] = [];
      weekly[id].push(Date.now());
      // Keep only last 7 days
      const cutoff = Date.now() - WEEKLY_DAYS * 86400000;
      weekly[id] = weekly[id].filter(ts => ts >= cutoff);
      set(KEYS.WEEKLY, weekly);
    },
    // Returns array of { id, count } for the past 7 days, sorted desc.
    getWeeklyTrending() {
      const weekly = get(KEYS.WEEKLY, {});
      const cutoff = Date.now() - WEEKLY_DAYS * 86400000;
      const out = [];
      for (const id in weekly) {
        const count = weekly[id].filter(ts => ts >= cutoff).length;
        if (count > 0) out.push({id, count});
      }
      out.sort((a, b) => b.count - a.count);
      return out;
    },
    // Aggregate stats
    getStats() {
      return Object.assign({
        totalPlays: 0,
        totalWins: 0,
        firstPlayTs: null,
        categoriesPlayed: {}, // { word: 5, logic: 3, ... }
        gamesPlayed: {},      // { wordle: 5, ... }
      }, get(KEYS.STATS, {}));
    },
    _bumpStats(id, won) {
      const s = Storage.getStats();
      const game = (global.GameRegistry && global.GameRegistry.get) ? global.GameRegistry.get(id) : null;
      s.totalPlays++;
      if (won) s.totalWins++;
      if (!s.firstPlayTs) s.firstPlayTs = Date.now();
      if (game) {
        s.categoriesPlayed[game.category] = (s.categoriesPlayed[game.category] || 0) + 1;
      }
      s.gamesPlayed[id] = (s.gamesPlayed[id] || 0) + 1;
      set(KEYS.STATS, s);
    },

    // ---------- Daily streak ----------
    // { current, longest, lastDay }
    getStreak() {
      return Object.assign({current: 0, longest: 0, lastDay: null}, get(KEYS.STREAK, {}));
    },
    _touchStreak() {
      const s = Storage.getStreak();
      const today = dayKey();
      if (s.lastDay === today) return; // already counted today
      const yesterday = dayKey(new Date(Date.now() - 86400000));
      if (s.lastDay === yesterday) s.current++;
      else s.current = 1;
      s.lastDay = today;
      if (s.current > s.longest) s.longest = s.current;
      set(KEYS.STREAK, s);
    },
    resetStreak() {
      set(KEYS.STREAK, {current: 0, longest: 0, lastDay: null});
    },

    // ---------- Achievements ----------
    // Returns the list of unlocked achievement IDs.
    getAchievements() {
      return get(KEYS.ACHV, []);
    },
    isAchievementUnlocked(id) {
      return Storage.getAchievements().includes(id);
    },
    unlockAchievement(id) {
      const list = Storage.getAchievements();
      if (list.includes(id)) return false;
      list.push(id);
      set(KEYS.ACHV, list);
      return true; // newly unlocked
    },

    // ---------- Hidden games ----------
    getHidden() {
      return get(KEYS.HIDDEN, []);
    },
    isHidden(id) {
      return Storage.getHidden().includes(id);
    },
    toggleHidden(id) {
      const list = Storage.getHidden();
      const i = list.indexOf(id);
      if (i === -1) list.push(id); else list.splice(i, 1);
      set(KEYS.HIDDEN, list);
      return i === -1;
    },
    unhideAll() {
      set(KEYS.HIDDEN, []);
    },

    // ---------- Install prompt ----------
    isInstallDismissed() {
      return get(KEYS.INSTALL_DISMISS, false);
    },
    dismissInstall() {
      set(KEYS.INSTALL_DISMISS, true);
    },

    // ---------- Play-time tracking ----------
    // Cumulative seconds spent inside each game. Flushed by app.js every
    // ~15s while a game is open plus on close/visibility-change/unload so
    // an abrupt tab close still records most of the session.
    getPlaytime() {
      return get(KEYS.PLAYTIME, {});
    },
    getPlaytimeFor(id) {
      return Storage.getPlaytime()[id] || 0;
    },
    addPlaytime(id, seconds) {
      if (!id || !seconds || seconds <= 0) return;
      const pt = Storage.getPlaytime();
      pt[id] = Math.round((pt[id] || 0) + seconds);
      set(KEYS.PLAYTIME, pt);
    },
    getTotalPlaytime() {
      const pt = Storage.getPlaytime();
      let total = 0;
      for (const id in pt) total += pt[id];
      return total;
    },

    // ---------- One-off UI event counters (achievements) ----------
    // bumpEvent("shared") → increments and returns the new count.
    getEvents() {
      return get(KEYS.EVENTS, {});
    },
    bumpEvent(name) {
      const ev = Storage.getEvents();
      ev[name] = (ev[name] || 0) + 1;
      set(KEYS.EVENTS, ev);
      return ev[name];
    },

    // ---------- Custom theme (theme builder) ----------
    getCustomTheme() {
      return get(KEYS.CUSTOM_THEME, null);
    },
    setCustomTheme(t) {
      set(KEYS.CUSTOM_THEME, t);
    },

    // ---------- Game state save / resume ----------
    // Games can stash arbitrary JSON state per id so a paused session can be
    // resumed on a later visit. State is intentionally NOT cleared on closeGame
    // — each game decides when to overwrite or wipe its own snapshot.
    saveGameState(gameId, state) {
      if (!gameId) return false;
      const payload = {savedAt: Date.now(), state: state};
      return set(stateKey(gameId), payload);
    },
    loadGameState(gameId) {
      if (!gameId) return null;
      const payload = get(stateKey(gameId), null);
      // Older snapshots may not have the wrapper — return whatever we have.
      if (payload && typeof payload === "object" && "state" in payload && "savedAt" in payload) {
        return payload.state;
      }
      return payload;
    },
    getGameStateMeta(gameId) {
      if (!gameId) return null;
      const payload = get(stateKey(gameId), null);
      if (!payload) return null;
      if (payload && typeof payload === "object" && "savedAt" in payload) {
        return {savedAt: payload.savedAt};
      }
      return {savedAt: null};
    },
    clearGameState(gameId) {
      if (!gameId) return;
      remove(stateKey(gameId));
    },
    // Returns the list of game IDs that currently have a saved state.
    listGameStateIds() {
      const ids = [];
      const prefix = KEYS.STATE_PREFIX;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.indexOf(prefix) === 0) ids.push(k.slice(prefix.length));
        }
      } catch (e) {
      }
      return ids;
    },

    // ---------- Export / import all user data ----------
    // Bundles favorites, bests, recent, plays, stats, streak, achievements,
    // hidden, a11y settings, theme/mode/sound, plus any saved game states —
    // everything except visits.
    exportData() {
      // Include saved game states so a backup can restore in-progress sessions.
      const gameStates = {};
      Storage.listGameStateIds().forEach(id => {
        gameStates[id] = get(stateKey(id), null);
      });
      return {
        version: 2,
        exportedAt: new Date().toISOString(),
        theme: Storage.getTheme(),
        mode: Storage.getMode(),
        sound: Storage.getSound(),
        favorites: Storage.getFavorites(),
        bests: Storage.getBests(),
        recent: Storage.getRecent(),
        plays: Storage.getPlays(),
        stats: Storage.getStats(),
        streak: Storage.getStreak(),
        achievements: Storage.getAchievements(),
        hidden: Storage.getHidden(),
        a11y: Storage.getA11y(),
        gameStates: gameStates,
        // v7 additions — guarded on import so older backups still load.
        playtime: Storage.getPlaytime(),
        events: Storage.getEvents(),
        customTheme: Storage.getCustomTheme(),
      };
    },
    importData(data) {
      if (!data || data.version !== 2) throw new Error("Incompatible backup version");
      if (data.theme) set(KEYS.THEME, data.theme);
      if (data.mode) set(KEYS.MODE, data.mode);
      if (typeof data.sound === "boolean") set(KEYS.SOUND, data.sound);
      if (Array.isArray(data.favorites)) set(KEYS.FAVS, data.favorites);
      if (data.bests) set(KEYS.BESTS, data.bests);
      if (Array.isArray(data.recent)) set(KEYS.RECENT, data.recent.slice(0, RECENT_MAX));
      if (data.plays) set(KEYS.PLAYS, data.plays);
      if (data.stats) set(KEYS.STATS, data.stats);
      if (data.streak) set(KEYS.STREAK, data.streak);
      if (Array.isArray(data.achievements)) set(KEYS.ACHV, data.achievements);
      if (Array.isArray(data.hidden)) set(KEYS.HIDDEN, data.hidden);
      if (data.a11y) set(KEYS.A11Y, data.a11y);
      if (data.playtime && typeof data.playtime === "object") set(KEYS.PLAYTIME, data.playtime);
      if (data.events && typeof data.events === "object") set(KEYS.EVENTS, data.events);
      if (data.customTheme && typeof data.customTheme === "object") set(KEYS.CUSTOM_THEME, data.customTheme);
      if (data.gameStates && typeof data.gameStates === "object") {
        // Clear any existing snapshots first so stale ones don't linger.
        Storage.listGameStateIds().forEach(id => remove(stateKey(id)));
        for (const id in data.gameStates) {
          if (data.gameStates[id] != null) set(stateKey(id), data.gameStates[id]);
        }
      }
    },
    // Wipe everything (used by "reset all data" button)
    wipeAll() {
      [KEYS.FAVS, KEYS.BESTS, KEYS.RECENT, KEYS.PLAYS, KEYS.STATS,
        KEYS.STREAK, KEYS.ACHV, KEYS.HIDDEN, KEYS.WEEKLY, KEYS.INSTALL_DISMISS,
        KEYS.PLAYTIME, KEYS.EVENTS].forEach(remove);
      // Also drop any saved game states.
      Storage.listGameStateIds().forEach(id => remove(stateKey(id)));
    },
  };

  global.Storage = Storage;
})(window);
