/* clothwl — Clothing Wordle (auto-generated themed Wordle) */
(function () {
  "use strict";
  const WORDS = ["SHIRT", "PANTS", "SKIRT", "DRESS", "SCARF", "GLOVE", "BOOTS", "CLOAK", "TUNIC", "BERET", "JEANS", "PARKA", "SHAWL", "SMOCK", "FROCK", "ROBES", "BELTS", "DERBY", "MITTS", "HEELS"];
  const LEN = 5;
  const MAX = 6;
  let liveTarget = "";
  GameRegistry.register({
    id: "clothwl",
    name: "Clothing Wordle",
    icon: "👕",
    category: "word",
    description: "Clothing Wordle \u2014 guess the 5-letter themed word in 6 tries.",
    tags: ["word", "themed", "wordle"],
    age: ["teens", "adults"], difficulty: "medium", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX, Storage} = ctx;
      let alive = true, target = "", guesses = [], current = "", over = false;

      function newGame() {
        target = WORDS[Math.floor(Math.random() * WORDS.length)];
        liveTarget = target;
        guesses = [];
        current = "";
        over = false;
        render();
      }

      function colorFor(guess) {
        const res = Array(LEN).fill("absent");
        const t = target.split("");
        const g2 = guess.split("");
        for (let i = 0; i < LEN; i++) if (g2[i] === t[i]) {
          res[i] = "correct";
          t[i] = null;
        }
        for (let i = 0; i < LEN; i++) {
          if (res[i] === "correct") continue;
          const idx = t.indexOf(g2[i]);
          if (idx >= 0) {
            res[i] = "present";
            t[idx] = null;
          }
        }
        return res;
      }

      function submit() {
        if (current.length !== LEN || over) return;
        if (!WORDS.includes(current)) {
          App.toast("Not in word list", "warning");
          return;
        }
        guesses.push(current);
        if (current === target) {
          over = true;
          App.recordResult(true, guesses.length);
          AudioFX.win();
          App.toast("Won in " + guesses.length + "!", "success");
        } else if (guesses.length >= MAX) {
          over = true;
          App.recordResult(false, guesses.length);
          AudioFX.lose();
          App.toast("Word: " + target, "info");
        }
        current = "";
        render();
      }

      function render() {
        let rows = "";
        for (let r = 0; r < MAX; r++) {
          const row = r < guesses.length ? guesses[r] : (r === guesses.length ? current : "");
          const colors = r < guesses.length ? colorFor(guesses[r]) : null;
          let cells = "";
          for (let c = 0; c < LEN; c++) {
            const ch = row[c] || "";
            const cls = colors ? "wc-cell " + colors[c] : "wc-cell";
            cells += '<div class="' + cls + '">' + ch + '</div>';
          }
          rows += '<div class="wc-row">' + cells + '</div>';
        }
        const stage = root.querySelector("#clothwl-stage");
        if (stage) stage.innerHTML = '<div class="wc-grid">' + rows + '</div>';
      }

      function onKey(e) {
        if (over) return;
        if (e.key === "Enter") {
          submit();
          return;
        }
        if (e.key === "Backspace") {
          current = current.slice(0, -1);
          render();
          return;
        }
        if (/^[a-zA-Z]$/.test(e.key) && current.length < LEN) {
          current += e.key.toUpperCase();
          render();
        }
      }

      document.addEventListener("keydown", onKey);
      root.innerHTML = `
        <style>
          .wc-grid { display:inline-flex; flex-direction:column; gap:6px; padding:14px; }
          .wc-row { display:flex; gap:6px; }
          .wc-cell { width:48px; height:48px; display:flex; align-items:center; justify-content:center;
            font-weight:700; font-size:1.4rem; text-transform:uppercase;
            border:2px solid var(--border,#d1d5db); border-radius:6px; background:var(--bg-elev,#fff); color:var(--text,#111); }
          .wc-cell.correct { background:#22c55e; border-color:#22c55e; color:#fff; }
          .wc-cell.present { background:#eab308; border-color:#eab308; color:#fff; }
          .wc-cell.absent { background:#374151; border-color:#374151; color:#fff; }
        </style>
        <div style="text-align:center;">
          <p style="margin-bottom:10px;color:var(--text-muted,#64748b);">Guess the 5-letter word in 6 tries. Type, then Enter.</p>
          <div id="clothwl-stage"></div>
          <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;">
            <button class="btn primary" id="clothwl-new">New game</button>
            <button class="btn" id="clothwl-giveup">Give up</button>
          </div>
        </div>
      `;
      root.querySelector("#clothwl-new").addEventListener("click", newGame);
      root.querySelector("#clothwl-giveup").addEventListener("click", () => {
        if (over) return;
        over = true;
        App.recordResult(false, guesses.length);
        AudioFX.lose();
        App.toast("Word: " + target, "info");
        render();
      });
      newGame();
      return function cleanup() {
        alive = false;
        liveTarget = "";
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Clothing Wordle", "Guess the hidden 5-letter word in 6 tries. After each guess, letters turn green if in the right spot, yellow if in the word but wrong spot, gray if not in the word. Use the keyboard to type and press Enter.");
    },
    hint: function () {
      if (liveTarget) {
        const idx = Math.floor(Math.random() * liveTarget.length);
        App.toast("Hint: position " + (idx + 1) + " is '" + liveTarget[idx] + "'", "info");
      }
    },
  });
})();
