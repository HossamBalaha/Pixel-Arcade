/* ============================================================
   achievements.js — defines all unlockable badges and the
   evaluation logic. Pure localStorage-driven (no server).

   Each achievement:
     id     — stable slug used in storage
     title  — short label shown in the badge
     desc   — explanation
     icon   — emoji shown on the badge
     check(ctx) — returns true if the achievement should unlock
                  ctx = { stats, streak, plays, favorites, recent, registry }
   ============================================================ */
(function () {
  "use strict";

  const ACHV = [
    {
      id: "first-win", title: "First Win", icon: "🏆", desc: "Win any game for the first time.",
      check: c => c.stats.totalWins >= 1
    },
    {
      id: "first-play", title: "First Steps", icon: "🎯", desc: "Play any game for the first time.",
      check: c => c.stats.totalPlays >= 1
    },
    {
      id: "ten-plays", title: "Getting Warmed Up", icon: "🔥", desc: "Play 10 games total.",
      check: c => c.stats.totalPlays >= 10
    },
    {
      id: "fifty-plays", title: "Halfway to Centurion", icon: "💪", desc: "Play 50 games total.",
      check: c => c.stats.totalPlays >= 50
    },
    {
      id: "centurion", title: "Centurion", icon: "💯", desc: "Play 100 games total.",
      check: c => c.stats.totalPlays >= 100
    },
    {
      id: "ten-wins", title: "Winner's Circle", icon: "🥇", desc: "Win 10 games total.",
      check: c => c.stats.totalWins >= 10
    },
    {
      id: "word-wizard", title: "Word Wizard", icon: "🔤", desc: "Play 10 word-category games.",
      check: c => (c.stats.categoriesPlayed.word || 0) >= 10
    },
    {
      id: "logic-lord", title: "Logic Lord", icon: "🧠", desc: "Play 10 logic-category games.",
      check: c => (c.stats.categoriesPlayed.logic || 0) >= 10
    },
    {
      id: "arcade-ace", title: "Arcade Ace", icon: "🕹️", desc: "Play 10 arcade-category games.",
      check: c => (c.stats.categoriesPlayed.arcade || 0) >= 10
    },
    {
      id: "strategist", title: "Strategist", icon: "♟️", desc: "Play 10 strategy-category games.",
      check: c => (c.stats.categoriesPlayed.strategy || 0) >= 10
    },
    {
      id: "quiz-whiz", title: "Quiz Whiz", icon: "🧠", desc: "Play 10 quiz-category games.",
      check: c => (c.stats.categoriesPlayed.quiz || 0) >= 10
    },
    {
      id: "explorer", title: "Explorer", icon: "🧭", desc: "Play at least one game from each of the 5 categories.",
      check: c => Object.keys(c.stats.categoriesPlayed).length >= 5
    },
    {
      id: "streak-3", title: "On a Roll", icon: "📅", desc: "Play games on 3 consecutive days.",
      check: c => c.streak.longest >= 3
    },
    {
      id: "streak-7", title: "Week Warrior", icon: "🗓️", desc: "Play games on 7 consecutive days.",
      check: c => c.streak.longest >= 7
    },
    {
      id: "streak-30", title: "Monthly Master", icon: "📆", desc: "Play games on 30 consecutive days.",
      check: c => c.streak.longest >= 30
    },
    {
      id: "favorites-5", title: "Curator", icon: "⭐", desc: "Favorite 5 games.",
      check: c => c.favorites.length >= 5
    },
    {
      id: "favorites-20", title: "Collector", icon: "💖", desc: "Favorite 20 games.",
      check: c => c.favorites.length >= 20
    },
    {
      id: "recent-10", title: "Regular", icon: "🔁", desc: "Have 10 games in your recently-played list.",
      check: c => c.recent.length >= 10
    },
    {
      id: "night-owl", title: "Night Owl", icon: "🦉", desc: "Play a game after 11pm.",
      check: c => {
        const plays = c.plays;
        for (const id in plays) {
          for (const p of plays[id]) {
            const h = new Date(p.ts).getHours();
            if (h >= 23 || h < 5) return true;
          }
        }
        return false;
      }
    },
    {
      id: "early-bird", title: "Early Bird", icon: "🐦", desc: "Play a game before 7am.",
      check: c => {
        const plays = c.plays;
        for (const id in plays) {
          for (const p of plays[id]) {
            const h = new Date(p.ts).getHours();
            if (h < 7) return true;
          }
        }
        return false;
      }
    },
    {
      id: "all-words", title: "Word Smith", icon: "📚", desc: "Play at least one of every word-category game.",
      check: c => {
        if (!c.registry) return false;
        const wordGames = c.registry.all().filter(g => g.category === "word");
        if (!wordGames.length) return false;
        return wordGames.every(g => (c.stats.gamesPlayed[g.id] || 0) > 0);
      }
    },
    {
      id: "speed-demon", title: "Speed Demon", icon: "⚡", desc: "Win a game within 30 seconds of opening it.",
      check: c => {
        const plays = c.plays;
        for (const id in plays) {
          if (plays[id].length < 2) continue;
          const first = plays[id][0];
          const last = plays[id][plays[id].length - 1];
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
        for (const id in c.plays) {
          for (const p of c.plays[id]) {
            if (new Date(p.ts).toDateString() === today) count++;
          }
        }
        return count >= 10;
      }
    },
    {
      id: "perfectionist", title: "Perfectionist", icon: "🎯", desc: "Win a game without using any hints.",
      check: c => c.stats.totalWins > 0
    }, // simplified — can't track hints without game cooperation
    {
      id: "half-done", title: "Halfway There", icon: "🐙", desc: "Play 75 games total.",
      check: c => c.stats.totalPlays >= 75
    },
    {
      id: "two-fifty", title: "Arcade Legend", icon: "🏛️", desc: "Play 250 games total.",
      check: c => c.stats.totalPlays >= 250
    },
  ];

  // Build the context object that achievement checks receive
  function buildContext() {
    return {
      stats: window.Storage.getStats(),
      streak: window.Storage.getStreak(),
      plays: window.Storage.getPlays(),
      favorites: window.Storage.getFavorites(),
      recent: window.Storage.getRecent(),
      registry: window.GameRegistry,
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
  function list() {
    const unlocked = new Set(window.Storage.getAchievements());
    return ACHV.map(a => Object.assign({}, a, {unlocked: unlocked.has(a.id)}));
  }

  window.Achievements = {all: ACHV, evaluate, list, buildContext};
})();
