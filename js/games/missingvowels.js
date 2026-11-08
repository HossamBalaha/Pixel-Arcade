/* missingvowels — phrases with the vowels stripped out; type them back. */
(function () {
  "use strict";
  const PUZZLES = [
    ["THE QUICK BROWN FOX", "a famous typing phrase"],
    ["PRACTICE MAKES PERFECT", "proverb"],
    ["A JOURNEY OF A THOUSAND MILES", "starts with a single step"],
    ["BETTER LATE THAN NEVER", "proverb"],
    ["THE EARLY BIRD CATCHES THE WORM", "proverb"],
    ["DONT PUT ALL YOUR EGGS IN ONE BASKET", "proverb"],
    ["EVERY CLOUD HAS A SILVER LINING", "proverb"],
    ["A PICTURE IS WORTH A THOUSAND WORDS", "proverb"],
    ["ROME WAS NOT BUILT IN A DAY", "proverb"],
    ["WHEN IN ROME DO AS THE ROMANS DO", "proverb"],
    ["THE PEN IS MIGHTIER THAN THE SWORD", "proverb"],
    ["ACTIONS SPEAK LOUDER THAN WORDS", "proverb"],
    ["THE GRASS IS ALWAYS GREENER", "…on the other side"],
    ["DONT COUNT YOUR CHICKENS", "…before they hatch"],
    ["ONCE IN A BLUE MOON", "rarely"],
    ["PIECE OF CAKE", "something very easy"],
    ["BREAK A LEG", "good luck!"],
    ["UNDER THE WEATHER", "feeling ill"],
    ["SPILL THE BEANS", "reveal a secret"],
    ["HIT THE NAIL ON THE HEAD", "get it exactly right"],
  ];

  GameRegistry.register({
    id: "missingvowels", name: "Missing Vowels", icon: "🅰️", category: "word",
    description: "The vowels ran away — type the phrase back", tags: ["word", "tv", "phrases"],
    age: ["kids", "teens", "adults"], difficulty: "medium", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      let order = [], idx = 0, score = 0, streak = 0, tries = 0;

      function strip(s) {
        return s.replace(/[AEIOU]/g, "");
      }

      function start() {
        order = PUZZLES.map((_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
        idx = 0;
        score = 0;
        streak = 0;
        tries = 0;
        next();
      }

      function next() {
        if (idx >= order.length) {
          const st = root.querySelector("#mv-status");
          st.textContent = `🏁 Finished! Score: ${score}/${order.length * 10}`;
          st.className = "status win";
          AudioFX.win();
          App.recordResult(true, score);
          render("");
          return;
        }
        setStatus("Type the missing vowels (and anything else) to restore the phrase.");
        render("");
      }

      function setStatus(t, cls) {
        const st = root.querySelector("#mv-status");
        if (st) {
          st.textContent = t;
          st.className = "status " + (cls || "info");
        }
      }

      function check() {
        const inp = root.querySelector("#mv-inp");
        const [phrase, hint] = PUZZLES[order[idx]];
        const v = (inp.value || "").toUpperCase().replace(/[^A-Z ]/g, "");
        tries++;
        if (v === phrase) {
          score += 10;
          streak++;
          AudioFX.pop();
          setStatus(streak >= 3 ? `✅ Correct! Streak ×${streak}` : "✅ Correct!", "win");
          idx++;
          setTimeout(() => {
            if (alive) next();
          }, 900);
        } else {
          streak = 0;
          AudioFX.error();
          if (tries % 3 === 0) setStatus(`Hint: ${hint}`, "");
          else setStatus("Not quite — try again (hint after 3 tries).", "");
        }
        render(v);
      }

      root.innerHTML = `
        <style>
          #mv-phrase { font-size: 1.7rem; font-weight: 800; letter-spacing: 4px; text-align: center;
            margin: 18px 0; font-family: var(--font-mono, monospace); color: var(--text); }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="mv-sc">0</div></div>
          <div class="score-cell"><div class="label">Puzzle</div><div class="val" id="mv-n">1</div></div>
          <div class="score-cell"><div class="label">Streak</div><div class="val" id="mv-st">0</div></div>
        </div>
        <div class="status info" id="mv-status"></div>
        <div id="mv-phrase"></div>
        <div class="row" style="justify-content:center; gap:8px;">
          <input id="mv-inp" autocomplete="off" spellcheck="false" placeholder="type the full phrase…"
            style="background:var(--bg-elev); color:var(--text); border:1px solid var(--border); border-radius:8px; padding:10px 14px; font-size:1rem; width:min(320px,80%);">
          <button class="btn primary" id="mv-go">Check</button>
        </div>
        <p class="hint" style="text-align:center;">Vowels are gone: A E I O U — spaces stay</p>
      `;

      function render(typed) {
        const [phrase] = PUZZLES[order[idx]] || [""];
        const el = root.querySelector("#mv-phrase");
        if (el) el.textContent = idx >= order.length ? "—" : strip(phrase);
        const sc = root.querySelector("#mv-sc"), n = root.querySelector("#mv-n"), st = root.querySelector("#mv-st");
        if (sc) sc.textContent = score;
        if (n) n.textContent = Math.min(idx + 1, order.length) + "/" + order.length;
        if (st) st.textContent = streak;
        const inp = root.querySelector("#mv-inp");
        if (inp && typed !== undefined) inp.value = typed;
      }

      root.querySelector("#mv-go").addEventListener("click", check);
      root.querySelector("#mv-inp").addEventListener("keydown", e => {
        if (e.key === "Enter") check();
      });

      start();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Missing Vowels",
        "Famous phrases and proverbs appear with every vowel (A, E, I, O, U) removed." +
        "<br>Type the <b>complete phrase</b> — vowels, consonants and spaces — and press Check (or Enter)." +
        "<br>+10 per phrase; stuck? a hint appears after three wrong tries.");
    },
  });
})();
