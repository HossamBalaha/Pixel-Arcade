/* anagramjunior — Anagram Junior (auto-generated word/logic game, topic=food) */
(function () {
  "use strict";
  const WORDS = ["BREAD", "PASTA", "SUSHI", "CURRY", "PIZZA", "BAGEL", "SALAD", "STEAK", "TACOS", "WOKHE", "HONEY", "MANGO", "LEMON", "BASIL", "THYME", "CUMIN", "APPLE", "OLIVE", "FUDGE", "DATES"];
  GameRegistry.register({
    id: "anagramjunior", name: "Anagram Junior", icon: "🔤", category: "word",
    description: "Two-word anagrams for kids.", tags: ["word", "puzzle"],
    age: ["teens", "adults"], difficulty: "medium", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, target = "", guessed = new Set(), wrong = 0;
      const MAX_WRONG = 8;

      function start() {
        target = WORDS[Math.floor(Math.random() * WORDS.length)];
        guessed = new Set();
        wrong = 0;
        render();
      }

      function guess(L) {
        if (guessed.has(L) || wrong >= MAX_WRONG) return;
        guessed.add(L);
        if (!target.includes(L)) {
          wrong++;
          AudioFX.lose();
        } else AudioFX.pop();
        if (target.split("").every(c => guessed.has(c))) {
          App.recordResult(true, target.length);
          AudioFX.win();
          App.toast(target + "!", "success");
        } else if (wrong >= MAX_WRONG) {
          App.recordResult(false, 0);
          App.toast("Word: " + target, "info");
        }
        render();
      }

      function render() {
        const stage = root.querySelector("#anagramjunior-stage");
        if (!stage) return;
        const word = target.split("").map(c => guessed.has(c) ? c : "_").join(" ");
        const keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(L => {
          const used = guessed.has(L);
          return '<button class="wl-key' + (used ? ' used' : '') + '" data-l="' + L + '" ' + (used ? 'disabled' : '') + '>' + L + '</button>';
        }).join("");
        stage.innerHTML = `
          <style>
            .wl-word { font-size:1.8rem; letter-spacing:0.3em; text-align:center; padding:14px; font-family:var(--font-mono,monospace); color:var(--text,#111); }
            .wl-wrong { text-align:center; color:var(--danger,#ef4444); padding:4px 0 10px; }
            .wl-keys { display:grid; grid-template-columns: repeat(13, 1fr); gap:4px; max-width:520px; margin:0 auto; padding:14px; }
            .wl-key { padding:6px 0; font-size:0.9rem; border:1px solid var(--border,#d1d5db); border-radius:6px; background:var(--bg-elev,#fff); color:var(--text,#111); cursor:pointer; }
            .wl-key:hover:not(.used) { background:var(--bg-soft,#f1f5f9); }
            .wl-key.used { opacity:0.4; cursor:default; }
          </style>
          <div class="wl-word">${word}</div>
          <div class="wl-wrong">Wrong: ${wrong}/${MAX_WRONG}</div>
          <div class="wl-keys">${keys}</div>
        `;
        stage.querySelectorAll(".wl-key").forEach(b => b.addEventListener("click", () => guess(b.dataset.l)));
      }

      root.innerHTML = `<div id="anagramjunior-stage"></div><div style="text-align:center; margin-top:14px;"><button class="btn primary" id="anagramjunior-new">New word</button></div>`;
      root.querySelector("#anagramjunior-new").addEventListener("click", start);

      function onKey(e) {
        if (!alive) return;
        if (/^[a-zA-Z]$/.test(e.key)) guess(e.key.toUpperCase());
      }

      document.addEventListener("keydown", onKey);
      start();
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Anagram Junior", "Guess letters to reveal the hidden word. You have 8 wrong guesses.");
    },
  });
})();
