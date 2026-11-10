/* ============================================================
   collections.js — curated editorial collections
   Static data + pure predicates. No server, no build step.
   Each collection:
     id       — slug used in the #/collection/<id> hash route
     name     — shelf title
     icon     — emoji
     blurb    — one-line description shown on the landing banner
     match(g) — predicate over catalog/game metadata
   Keep predicates cheap — they run over all 300 games on route.
   ============================================================ */
(function (global) {
  "use strict";

  const COLLECTIONS = [
    {
      id: "five-minute-breaks",
      name: "5-Minute Breaks",
      icon: "⏱️",
      blurb: "Quick games you can finish before your coffee cools — every one under two minutes a round.",
      match: function (g) {
        return g.duration === "quick";
      },
    },
    {
      id: "no-timer-just-chill",
      name: "No Timer — Just Chill",
      icon: "🧘",
      blurb: "Untimed puzzles for winding down. No clocks, no pressure, no fail states that matter.",
      match: function (g) {
        return g.duration !== "quick" &&
          (g.category === "logic" || g.category === "word" || g.category === "strategy") &&
          !/quiz|trivia/i.test((g.tags || []).join(" "));
      },
    },
    {
      id: "two-player-night",
      name: "Two-Player Night",
      icon: "👥",
      blurb: "Pass-and-play classics — hot-seat board games you can enjoy with a friend beside you.",
      match: function (g) {
        return g.players === "either" &&
          ["tictactoe", "connect4", "checkers", "reversi", "snakesladders", "tictactoextreme",
            "tttnotakto", "sprouts", "tablamorris", "tablut", "seega", "baghchal", "chesstinychess",
            "royalur", "senet", "pachisilite", "mahjongsolitaire", "dominoessolitaire"].includes(g.id);
      },
    },
    {
      id: "luck-and-dice",
      name: "Luck & Dice",
      icon: "🎲",
      blurb: "Roll, flip and draw — games where fortune favors the bold (or at least the patient).",
      match: function (g) {
        return (g.tags || []).some(t => ["dice", "luck", "cards", "gambling", "push-your-luck"].includes(t));
      },
    },
    {
      id: "brain-warmup",
      name: "Brain Warm-up",
      icon: "🧠",
      blurb: "Gentle logic puzzles to get the gears turning — easy on difficulty, kind on time.",
      match: function (g) {
        return g.category === "logic" && g.difficulty === "easy" && g.duration !== "long";
      },
    },
    {
      id: "word-nerd",
      name: "Word Nerd Corner",
      icon: "🐝",
      blurb: "Anagrams, crosswords and vocabulary deep-dives for the lexically inclined.",
      match: function (g) {
        return g.category === "word" &&
          (g.tags || []).some(t => ["word", "vocabulary", "anagram", "crossword", "spelling", "letters"].includes(t));
      },
    },
  ];

  const Collections = {
    all() {
      return COLLECTIONS.slice();
    },
    get(id) {
      return COLLECTIONS.find(c => c.id === id) || null;
    },
    // Games in a collection, in stable registry order.
    games(id) {
      const c = Collections.get(id);
      if (!c || !global.GameRegistry) return [];
      return global.GameRegistry.all().filter(g => c.match(g) && !global.Storage.isHidden(g.id));
    },
    // Route-friendly slug validation
    isRoute(hash) {
      return hash.indexOf("collection/") === 0;
    },
  };

  global.Collections = Collections;
})(window);
