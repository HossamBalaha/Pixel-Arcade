/* numguessprime — Prime Number Hunt (auto-generated number guess) */
(function () {
  "use strict";
  const MIN = 1, MAX = 200;
  const EVEN_ONLY = false;
  const PRIME_ONLY = true;
  let liveTarget = 0;
  GameRegistry.register({
    id: "numguessprime", name: "Prime Number Hunt", icon: "🔍", category: "logic",
    description: "Prime Number Hunt \u2014 hot/cold hints.", tags: ["number", "guess"],
    age: ["kids", "teens", "adults"], difficulty: "easy", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, target = 0, guesses = 0, lastDist = null;

      function isPrime(n) {
        if (n < 2) return false;
        for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
        return true;
      }

      function pickTarget() {
        let t;
        do {
          t = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
        } while ((EVEN_ONLY && t % 2 !== 0) || (PRIME_ONLY && !isPrime(t)));
        return t;
      }

      function start() {
        target = pickTarget();
        liveTarget = target;
        guesses = 0;
        lastDist = null;
        render("");
      }

      function guess() {
        const inp = root.querySelector("#numguessprime-inp");
        if (!inp) return;
        const v = parseInt(inp.value, 10);
        if (isNaN(v) || v < MIN || v > MAX) {
          App.toast("Enter " + MIN + "-" + MAX, "warning");
          return;
        }
        guesses++;
        const dist = Math.abs(v - target);
        let msg = "";
        if (v === target) {
          liveTarget = 0;
          App.recordResult(true, guesses);
          AudioFX.win();
          App.toast("Found it in " + guesses + " guesses!", "success");
          render("Got it! " + target + " in " + guesses + " tries.");
          return;
        }
        if (lastDist === null) msg = dist < 10 ? "Hot!" : dist < 30 ? "Warm" : "Cold";
        else if (dist < lastDist) msg = "Warmer";
        else if (dist > lastDist) msg = "Colder";
        else msg = "Same distance";
        lastDist = dist;
        render(msg + " (range: " + MIN + "-" + MAX + ")");
      }

      function render(msg) {
        const info = root.querySelector("#numguessprime-info");
        if (info) info.textContent = msg;
        const g2 = root.querySelector("#numguessprime-g");
        if (g2) g2.textContent = guesses;
      }

      root.innerHTML = `
        <div style="text-align:center; padding:20px;">
          <h3 style="margin-bottom:10px;">Pick a number 1-200${EVEN_ONLY ? " (even only)" : ""}${PRIME_ONLY ? " (prime only)" : ""}</h3>
          <input type="number" id="numguessprime-inp" min="1" max="200" value="" style="font-size:1.5rem; padding:6px 12px; width:140px; text-align:center; border:2px solid var(--border,#d1d5db); border-radius:8px; background:var(--bg-elev,#fff); color:var(--text,#111);" />
          <div style="margin-top:14px;"><button class="btn primary" id="numguessprime-go">Guess</button></div>
          <p id="numguessprime-info" style="margin-top:14px; color:var(--text-muted,#64748b);">Pick a number and guess.</p>
          <p style="margin-top:8px; font-size:0.85rem; color:var(--text-muted,#64748b);">Guesses: <span id="numguessprime-g">0</span></p>
          <button class="btn" id="numguessprime-new" style="margin-top:14px;">New game</button>
        </div>
      `;
      root.querySelector("#numguessprime-go").addEventListener("click", guess);
      root.querySelector("#numguessprime-inp").addEventListener("keydown", (e) => {
        if (e.key === "Enter") guess();
      });
      root.querySelector("#numguessprime-new").addEventListener("click", start);
      start();
      return function cleanup() {
        alive = false;
        liveTarget = 0;
      };
    },
    help: function () {
      App.showModal("How to play Prime Number Hunt", "Pick a number between 1 and 200" + (EVEN_ONLY ? " (even only)" : "") + (PRIME_ONLY ? " (prime only)" : "") + ". Get hot/cold hints after each guess.");
    },
    hint: function () {
      if (liveTarget) {
        const mid = Math.floor((MIN + MAX) / 2);
        App.toast("Target is in the " + (liveTarget < mid ? "lower" : "upper") + " half", "info");
      }
    },
  });
})();
