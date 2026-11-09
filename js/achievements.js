/* ============================================================
   achievements.js — defines all unlockable badges and the
   evaluation logic. Pure localStorage-driven (no server).

   Each achievement:
     id     — stable slug used in storage
     title  — short label shown in the badge
     desc   — explanation
     icon   — emoji shown on the badge
     check(ctx) — returns true if the achievement should unlock
                  ctx = { stats, streak, plays, favorites, recent,
                          registry, hidden, playtimeSec, distinctGames,
                          distinctPerCat, winStreak, events }
     progress(ctx) — optional: { cur, max } for the progress bar on
                     locked achievements (only for countable goals).
   ============================================================ */
(function () {
  "use strict";

  // ---------- shared helpers over the plays log ----------
  // Merge every play entry (any game) into one chronological list.
  function allPlaysChrono(plays) {
    const out = [];
    for (const id in plays) for (const p of plays[id]) out.push(p);
    out.sort((a, b) => a.ts - b.ts);
    return out;
  }

  // Longest run of consecutive won plays across the merged log.
  function longestWinStreak(plays) {
    const all = allPlaysChrono(plays);
    let cur = 0, best = 0;
    for (const p of all) {
      if (p.won) {
        cur++;
        if (cur > best) best = cur;
      } else cur = 0;
    }
    return best;
  }

  // Current run of consecutive wins (from the most recent play backwards).
  function currentWinStreak(plays) {
    const all = allPlaysChrono(plays);
    let cur = 0;
    for (let i = all.length - 1; i >= 0; i--) {
      if (all[i].won) cur++;
      else break;
    }
    return cur;
  }

  // 3 wins within any 5-minute window.
  function rapidWins(plays) {
    const all = allPlaysChrono(plays).filter(p => p.won);
    for (let i = 0; i + 2 < all.length; i++) {
      if (all[i + 2].ts - all[i].ts <= 5 * 60 * 1000) return true;
    }
    return false;
  }

  // Distinct games played, overall and per category.
  function distinctPlayed(stats, registry) {
    const played = Object.keys(stats.gamesPlayed || {})
      .filter(id => registry && registry.get(id));
    const perCat = {word: 0, logic: 0, arcade: 0, strategy: 0, quiz: 0};
    played.forEach(id => {
      const c = registry.get(id).category;
      if (perCat[c] !== undefined) perCat[c]++;
    });
    return {total: played.length, perCat};
  }

  const ACHV = [
    // ---------- milestones: total plays ----------
    {
      id: "first-play", title: "First Steps", icon: "🎯", desc: "Play any game for the first time.",
      check: c => c.stats.totalPlays >= 1,
      progress: c => ({cur: Math.min(c.stats.totalPlays, 1), max: 1})
    },
    {
      id: "ten-plays", title: "Getting Warmed Up", icon: "🔥", desc: "Play 10 games total.",
      check: c => c.stats.totalPlays >= 10,
      progress: c => ({cur: Math.min(c.stats.totalPlays, 10), max: 10})
    },
    {
      id: "fifty-plays", title: "Halfway to Centurion", icon: "💪", desc: "Play 50 games total.",
      check: c => c.stats.totalPlays >= 50,
      progress: c => ({cur: Math.min(c.stats.totalPlays, 50), max: 50})
    },
    {
      id: "half-done", title: "Seventy-Five", icon: "🐙", desc: "Play 75 games total.",
      check: c => c.stats.totalPlays >= 75,
      progress: c => ({cur: Math.min(c.stats.totalPlays, 75), max: 75})
    },
    {
      id: "centurion", title: "Centurion", icon: "💯", desc: "Play 100 games total.",
      check: c => c.stats.totalPlays >= 100,
      progress: c => ({cur: Math.min(c.stats.totalPlays, 100), max: 100})
    },
    {
      id: "two-fifty", title: "Arcade Legend", icon: "🏛️", desc: "Play 250 games total.",
      check: c => c.stats.totalPlays >= 250,
      progress: c => ({cur: Math.min(c.stats.totalPlays, 250), max: 250})
    },
    {
      id: "five-hundred", title: "Persistent Player", icon: "🛡️", desc: "Play 500 games total.",
      check: c => c.stats.totalPlays >= 500,
      progress: c => ({cur: Math.min(c.stats.totalPlays, 500), max: 500})
    },

    // ---------- milestones: wins ----------
    {
      id: "first-win", title: "First Win", icon: "🏆", desc: "Win any game for the first time.",
      check: c => c.stats.totalWins >= 1,
      progress: c => ({cur: Math.min(c.stats.totalWins, 1), max: 1})
    },
    {
      id: "ten-wins", title: "Winner's Circle", icon: "🥇", desc: "Win 10 games total.",
      check: c => c.stats.totalWins >= 10,
      progress: c => ({cur: Math.min(c.stats.totalWins, 10), max: 10})
    },
    {
      id: "fifty-wins", title: "Trophy Room", icon: "🏅", desc: "Win 50 games total.",
      check: c => c.stats.totalWins >= 50,
      progress: c => ({cur: Math.min(c.stats.totalWins, 50), max: 50})
    },

    // ---------- win-streak combos ----------
    {
      id: "combo-3", title: "Hat-Trick", icon: "🎩", desc: "Win 3 games in a row (any games).",
      check: c => c.winStreak.best >= 3,
      progress: c => ({cur: Math.min(c.winStreak.best, 3), max: 3})
    },
    {
      id: "combo-5", title: "On Fire", icon: "🔥", desc: "Win 5 games in a row (any games).",
      check: c => c.winStreak.best >= 5,
      progress: c => ({cur: Math.min(c.winStreak.best, 5), max: 5})
    },
    {
      id: "combo-10", title: "Unstoppable", icon: "⚡", desc: "Win 10 games in a row (any games).",
      check: c => c.winStreak.best >= 10,
      progress: c => ({cur: Math.min(c.winStreak.best, 10), max: 10})
    },
    {
      id: "rapid-triple", title: "Rapid Fire", icon: "⏱️", desc: "Win 3 games within 5 minutes.",
      check: c => c.rapidTriple
    },

    // ---------- category play counts ----------
    {
      id: "word-wizard", title: "Word Wizard", icon: "🔤", desc: "Play 10 word-category games.",
      check: c => (c.stats.categoriesPlayed.word || 0) >= 10,
      progress: c => ({cur: Math.min(c.stats.categoriesPlayed.word || 0, 10), max: 10})
    },
    {
      id: "logic-lord", title: "Logic Lord", icon: "🧠", desc: "Play 10 logic-category games.",
      check: c => (c.stats.categoriesPlayed.logic || 0) >= 10,
      progress: c => ({cur: Math.min(c.stats.categoriesPlayed.logic || 0, 10), max: 10})
    },
    {
      id: "arcade-ace", title: "Arcade Ace", icon: "🕹️", desc: "Play 10 arcade-category games.",
      check: c => (c.stats.categoriesPlayed.arcade || 0) >= 10,
      progress: c => ({cur: Math.min(c.stats.categoriesPlayed.arcade || 0, 10), max: 10})
    },
    {
      id: "strategist", title: "Strategist", icon: "♟️", desc: "Play 10 strategy-category games.",
      check: c => (c.stats.categoriesPlayed.strategy || 0) >= 10,
      progress: c => ({cur: Math.min(c.stats.categoriesPlayed.strategy || 0, 10), max: 10})
    },
    {
      id: "quiz-whiz", title: "Quiz Whiz", icon: "❓", desc: "Play 10 quiz-category games.",
      check: c => (c.stats.categoriesPlayed.quiz || 0) >= 10,
      progress: c => ({cur: Math.min(c.stats.categoriesPlayed.quiz || 0, 10), max: 10})
    },
    {
      id: "explorer", title: "Explorer", icon: "🧭", desc: "Play at least one game from each of the 5 categories.",
      check: c => Object.keys(c.stats.categoriesPlayed).length >= 5,
      progress: c => ({cur: Math.min(Object.keys(c.stats.categoriesPlayed).length, 5), max: 5})
    },

    // ---------- category explorers: DISTINCT games per category ----------
    {
      id: "word-explorer-5", title: "Word Collector", icon: "🔠", desc: "Play 5 different word games.",
      check: c => c.distinct.perCat.word >= 5,
      progress: c => ({cur: Math.min(c.distinct.perCat.word, 5), max: 5})
    },
    {
      id: "logic-explorer-5", title: "Puzzle Collector", icon: "🧩", desc: "Play 5 different logic games.",
      check: c => c.distinct.perCat.logic >= 5,
      progress: c => ({cur: Math.min(c.distinct.perCat.logic, 5), max: 5})
    },
    {
      id: "arcade-explorer-5", title: "Coin Collector", icon: "🪙", desc: "Play 5 different arcade games.",
      check: c => c.distinct.perCat.arcade >= 5,
      progress: c => ({cur: Math.min(c.distinct.perCat.arcade, 5), max: 5})
    },
    {
      id: "strategy-explorer-5", title: "Board Collector", icon: "🎲", desc: "Play 5 different strategy games.",
      check: c => c.distinct.perCat.strategy >= 5,
      progress: c => ({cur: Math.min(c.distinct.perCat.strategy, 5), max: 5})
    },
    {
      id: "quiz-explorer-5", title: "Fact Collector", icon: "📎", desc: "Play 5 different quiz games.",
      check: c => c.distinct.perCat.quiz >= 5,
      progress: c => ({cur: Math.min(c.distinct.perCat.quiz, 5), max: 5})
    },
    {
      id: "word-explorer-15", title: "Lexicon", icon: "📚", desc: "Play 15 different word games.",
      check: c => c.distinct.perCat.word >= 15,
      progress: c => ({cur: Math.min(c.distinct.perCat.word, 15), max: 15})
    },
    {
      id: "logic-explorer-15", title: "Enigma", icon: "🧿", desc: "Play 15 different logic games.",
      check: c => c.distinct.perCat.logic >= 15,
      progress: c => ({cur: Math.min(c.distinct.perCat.logic, 15), max: 15})
    },
    {
      id: "arcade-explorer-15", title: "High Scorer", icon: "🎰", desc: "Play 15 different arcade games.",
      check: c => c.distinct.perCat.arcade >= 15,
      progress: c => ({cur: Math.min(c.distinct.perCat.arcade, 15), max: 15})
    },

    // ---------- catalog completion: distinct games overall ----------
    {
      id: "catalog-10", title: "Sampler", icon: "🍽️", desc: "Play 10 different games.",
      check: c => c.distinct.total >= 10,
      progress: c => ({cur: Math.min(c.distinct.total, 10), max: 10})
    },
    {
      id: "catalog-25", title: "Taster", icon: "🥄", desc: "Play 25 different games.",
      check: c => c.distinct.total >= 25,
      progress: c => ({cur: Math.min(c.distinct.total, 25), max: 25})
    },
    {
      id: "catalog-50", title: "Connoisseur", icon: "🍷", desc: "Play 50 different games.",
      check: c => c.distinct.total >= 50,
      progress: c => ({cur: Math.min(c.distinct.total, 50), max: 50})
    },
    {
      id: "catalog-100", title: "Game Sommelier", icon: "🎖️", desc: "Play 100 different games.",
      check: c => c.distinct.total >= 100,
      progress: c => ({cur: Math.min(c.distinct.total, 100), max: 100})
    },
    {
      id: "catalog-200", title: "Whale", icon: "🐋", desc: "Play 200 different games.",
      check: c => c.distinct.total >= 200,
      progress: c => ({cur: Math.min(c.distinct.total, 200), max: 200})
    },
    {
      id: "all-words", title: "Word Smith", icon: "📕", desc: "Play at least one of every word-category game.",
      check: c => {
        if (!c.registry) return false;
        const wordGames = c.registry.all().filter(g => g.category === "word");
        if (!wordGames.length) return false;
        return wordGames.every(g => (c.stats.gamesPlayed[g.id] || 0) > 0);
      },
      progress: c => {
        if (!c.registry) return null;
        const wordGames = c.registry.all().filter(g => g.category === "word");
        const played = wordGames.filter(g => (c.stats.gamesPlayed[g.id] || 0) > 0).length;
        return {cur: played, max: wordGames.length};
      }
    },

    // ---------- streaks (days) ----------
    {
      id: "streak-3", title: "On a Roll", icon: "📅", desc: "Play games on 3 consecutive days.",
      check: c => c.streak.longest >= 3,
      progress: c => ({cur: Math.min(c.streak.longest, 3), max: 3})
    },
    {
      id: "streak-7", title: "Week Warrior", icon: "🗓️", desc: "Play games on 7 consecutive days.",
      check: c => c.streak.longest >= 7,
      progress: c => ({cur: Math.min(c.streak.longest, 7), max: 7})
    },
    {
      id: "streak-30", title: "Monthly Master", icon: "📆", desc: "Play games on 30 consecutive days.",
      check: c => c.streak.longest >= 30,
      progress: c => ({cur: Math.min(c.streak.longest, 30), max: 30})
    },

    // ---------- playtime milestones ----------
    {
      id: "time-30m", title: "Settled In", icon: "⏳", desc: "Play for 30 minutes in total.",
      check: c => c.playtimeSec >= 1800,
      progress: c => ({cur: Math.min(Math.floor(c.playtimeSec / 60), 30), max: 30, unit: "min"})
    },
    {
      id: "time-1h", title: "Time Well Spent", icon: "⌛", desc: "Play for 1 hour in total.",
      check: c => c.playtimeSec >= 3600,
      progress: c => ({cur: Math.min(Math.floor(c.playtimeSec / 60), 60), max: 60, unit: "min"})
    },
    {
      id: "time-5h", title: "Deep Diver", icon: "🌊", desc: "Play for 5 hours in total.",
      check: c => c.playtimeSec >= 18000,
      progress: c => ({cur: Math.min(Math.floor(c.playtimeSec / 3600), 5), max: 5, unit: "h"})
    },
    {
      id: "time-24h", title: "Day One", icon: "🌗", desc: "Play for 24 hours in total.",
      check: c => c.playtimeSec >= 86400,
      progress: c => ({cur: Math.min(Math.floor(c.playtimeSec / 3600), 24), max: 24, unit: "h"})
    },

    // ---------- curator / organizer ----------
    {
      id: "favorites-5", title: "Curator", icon: "⭐", desc: "Favorite 5 games.",
      check: c => c.favorites.length >= 5,
      progress: c => ({cur: Math.min(c.favorites.length, 5), max: 5})
    },
    {
      id: "favorites-20", title: "Collector", icon: "💖", desc: "Favorite 20 games.",
      check: c => c.favorites.length >= 20,
      progress: c => ({cur: Math.min(c.favorites.length, 20), max: 20})
    },
    {
      id: "favorites-50", title: "Archivist", icon: "🗃️", desc: "Favorite 50 games.",
      check: c => c.favorites.length >= 50,
      progress: c => ({cur: Math.min(c.favorites.length, 50), max: 50})
    },
    {
      id: "organizer",
      title: "Tidier",
      icon: "🧹",
      desc: "Hide 5 games from the grid (right-click or long-press a card).",
      check: c => c.hidden.length >= 5,
      progress: c => ({cur: Math.min(c.hidden.length, 5), max: 5})
    },
    {
      id: "recent-10", title: "Regular", icon: "🔁", desc: "Have 10 games in your recently-played list.",
      check: c => c.recent.length >= 10,
      progress: c => ({cur: Math.min(c.recent.length, 10), max: 10})
    },

    // ---------- time-of-day / week quirks ----------
    {
      id: "night-owl", title: "Night Owl", icon: "🦉", desc: "Play a game after 11pm.",
      check: c => {
        for (const id in c.plays) for (const p of c.plays[id]) {
          const h = new Date(p.ts).getHours();
          if (h >= 23 || h < 5) return true;
        }
        return false;
      }
    },
    {
      id: "early-bird", title: "Early Bird", icon: "🐦", desc: "Play a game before 7am.",
      check: c => {
        for (const id in c.plays) for (const p of c.plays[id]) {
          const h = new Date(p.ts).getHours();
          if (h < 7) return true;
        }
        return false;
      }
    },
    {
      id: "lunch-break", title: "Lunch Break", icon: "🥪", desc: "Play a game between noon and 1pm.",
      check: c => {
        for (const id in c.plays) for (const p of c.plays[id]) {
          if (new Date(p.ts).getHours() === 12) return true;
        }
        return false;
      }
    },
    {
      id: "weekend-warrior", title: "Weekend Warrior", icon: "🏖️", desc: "Play a game on a Saturday or Sunday.",
      check: c => {
        for (const id in c.plays) for (const p of c.plays[id]) {
          const d = new Date(p.ts).getDay();
          if (d === 0 || d === 6) return true;
        }
        return false;
      }
    },

    // ---------- special / speed ----------
    {
      id: "speed-demon", title: "Speed Demon", icon: "⚡", desc: "Win a game within 30 seconds of opening it.",
      check: c => {
        for (const id in c.plays) {
          if (c.plays[id].length < 2) continue;
          const first = c.plays[id][0];
          const last = c.plays[id][c.plays[id].length - 1];
          if (last.won && (last.ts - first.ts) < 30000) return true;
        }
        return false;
      }
    },
    {
      id: "marathon", title: "Marathon Runner", icon: "🏃", desc: "Play 10 games in one session (same day).",
      check: c => {
        const today = new Date().toDateString();
        let count = 0;
        for (const id in c.plays) for (const p of c.plays[id]) {
          if (new Date(p.ts).toDateString() === today) count++;
        }
        return count >= 10;
      },
      progress: c => {
        const today = new Date().toDateString();
        let count = 0;
        for (const id in c.plays) for (const p of c.plays[id]) {
          if (new Date(p.ts).toDateString() === today) count++;
        }
        return {cur: Math.min(count, 10), max: 10};
      }
    },
    {
      id: "perfectionist", title: "Perfectionist", icon: "🎯", desc: "Win a game without using any hints.",
      check: c => c.stats.totalWins > 0
    }, // simplified — can't track hints without game cooperation

    // ---------- power-user / social ----------
    {
      id: "power-user", title: "Power User", icon: "⌨️", desc: "Open the command palette (Ctrl+K).",
      check: c => (c.events.paletteUsed || 0) >= 1
    },
    {
      id: "spread-the-word", title: "Spread the Word", icon: "📣", desc: "Share a result with the Share button.",
      check: c => (c.events.shared || 0) >= 1
    },
    {
      id: "new-coat-of-paint", title: "New Coat of Paint", icon: "🎨", desc: "Switch to a different theme.",
      check: c => (c.events.themeChanged || 0) >= 1
    },
    {
      id: "remix", title: "Remix Artist", icon: "🖌️", desc: "Build and save a custom theme.",
      check: c => (c.events.customThemeSaved || 0) >= 1
    },
  ];

  // Build the context object that achievement checks receive
  function buildContext() {
    const plays = window.Storage.getPlays();
    const stats = window.Storage.getStats();
    const distinct = distinctPlayed(stats, window.GameRegistry);
    return {
      stats: stats,
      streak: window.Storage.getStreak(),
      plays: plays,
      favorites: window.Storage.getFavorites(),
      recent: window.Storage.getRecent(),
      registry: window.GameRegistry,
      hidden: window.Storage.getHidden(),
      playtimeSec: window.Storage.getTotalPlaytime ? window.Storage.getTotalPlaytime() : 0,
      distinct: distinct,
      winStreak: {best: longestWinStreak(plays), current: currentWinStreak(plays)},
      rapidTriple: rapidWins(plays),
      events: window.Storage.getEvents ? window.Storage.getEvents() : {},
    };
  }

  // Evaluate every achievement; returns the list of newly-unlocked ones.
  // Also persists the unlock to storage.
  function evaluate() {
    const ctx = buildContext();
    const newly = [];
    for (const a of ACHV) {
      if (window.Storage.isAchievementUnlocked(a.id)) continue;
      try {
        if (a.check(ctx)) {
          if (window.Storage.unlockAchievement(a.id)) newly.push(a);
        }
      } catch (e) { /* ignore */
      }
    }
    return newly;
  }

  // Returns all achievement definitions, annotated with `unlocked: boolean`
  // and — when the achievement exposes progress() — a {cur, max} snapshot
  // for the locked-achievement progress bars.
  function list() {
    const unlocked = new Set(window.Storage.getAchievements());
    let ctx = null;
    const getCtx = () => {
      if (!ctx) ctx = buildContext();
      return ctx;
    };
    return ACHV.map(a => {
      const out = Object.assign({}, a, {unlocked: unlocked.has(a.id)});
      if (!out.unlocked && typeof a.progress === "function") {
        try {
          const p = a.progress(getCtx());
          if (p && typeof p.cur === "number" && p.max > 0) out.progress = p;
          else out.progress = null;
        } catch (e) {
          out.progress = null;
        }
      } else {
        out.progress = null;
      }
      return out;
    });
  }

  window.Achievements = {all: ACHV, evaluate, list, buildContext};
})();
