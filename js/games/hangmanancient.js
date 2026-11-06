/* hangmanancient — Hangman Ancient (auto-generated themed Hangman) */
(function () {
  "use strict";
  const WORDS = ["ROME", "SPARTA", "TROY", "ATHENS", "MEMPHIS", "THEBES", "OLYMPUS", "DELPHI", "KNOSSOS", "BABYLON", "AKSUM", "CARTHAGE", "NINEVEH", "PETRA", "MACHU", "ANGKOR", "GIZA", "PYRAMID", "MUMMY", "SPHINX"];
  GameRegistry.register({
    id: "hangmanancient", name: "Hangman Ancient", icon: "🏛️", category: "word",
    description: "Ancient-world words.", tags: ["word", "hangman", "themed"],
    age: ["kids", "teens", "adults"], difficulty: "easy", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, target = "", guessed = new Set(), wrong = 0;
      const MAX_WRONG = 7;

      function start() {
        target = WORDS[Math.floor(Math.random() * WORDS.length)];
        guessed = new Set();
        wrong = 0;
        render();
      }

      function guess(letter) {
        if (guessed.has(letter) || wrong >= MAX_WRONG) return;
        guessed.add(letter);
        if (!target.includes(letter)) {
          wrong++;
          AudioFX.lose();
        } else AudioFX.pop();
        if (target.split("").every(c => guessed.has(c))) {
          App.recordResult(true, target.length);
          AudioFX.win();
          App.toast("Got it: " + target, "success");
        } else if (wrong >= MAX_WRONG) {
          App.recordResult(false, 0);
          App.toast("Word: " + target, "info");
        }
        render();
      }

      function render() {
        const word = target.split("").map(c => guessed.has(c) ? c : "_").join(" ");
        const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(L => {
          const used = guessed.has(L);
          return '<button class="hm-key' + (used ? ' used' : '') + '" data-l="' + L + '" ' + (used ? 'disabled' : '') + '>' + L + '</button>';
        }).join("");
        const stage = root.querySelector("#hangmanancient-stage");
        if (stage) stage.innerHTML = `
          <style>
            .hm-word { font-size:1.8rem; letter-spacing:0.3em; text-align:center; padding:14px; font-family:var(--font-mono,monospace); color:var(--text,#111); }
            .hm-wrong { text-align:center; color:var(--danger,#ef4444); font-size:0.95rem; padding:4px 0 10px; }
            .hm-keys { display:grid; grid-template-columns: repeat(13, 1fr); gap:4px; max-width:520px; margin:0 auto; padding:14px; }
            .hm-key { padding:6px 0; font-size:0.9rem; border:1px solid var(--border,#d1d5db); border-radius:6px; background:var(--bg-elev,#fff); color:var(--text,#111); cursor:pointer; }
            .hm-key:hover:not(.used) { background:var(--bg-soft,#f1f5f9); }
            .hm-key.used { opacity:0.4; cursor:default; }
          </style>
          <div class="hm-word">${word}</div>
          <div class="hm-wrong">Wrong: ${wrong}/${MAX_WRONG}</div>
          <div class="hm-keys">${alpha}</div>
        `;
        stage.querySelectorAll(".hm-key").forEach(b => b.addEventListener("click", () => guess(b.dataset.l)));
      }

      root.innerHTML = `<div id="hangmanancient-stage"></div><div style="text-align:center; margin-top:14px;"><button class="btn primary" id="hangmanancient-new">New word</button></div>`;
      root.querySelector("#hangmanancient-new").addEventListener("click", start);

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
      App.showModal("How to play Hangman Ancient", "Guess letters to spell the hidden word. You have 7 wrong guesses.");
    },
  });
})();
