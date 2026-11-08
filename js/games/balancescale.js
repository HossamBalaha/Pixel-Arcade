/* balancescale — find the odd coin among 9 in only 3 weighings. */
(function () {
  "use strict";
  GameRegistry.register({
    id: "balancescale", name: "Balance Scale", icon: "⚖️", category: "logic",
    description: "One of nine coins is fake — find it in three weighings", tags: ["logic", "deduction", "classic"],
    age: ["teens", "adults"], difficulty: "hard", duration: "medium", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      let fake = 0, heavy = false; // fake coin index 0..8, and whether it's heavier
      let left = new Set(), right = new Set();
      let weighings = 0, results = [], over = false;

      function newGame() {
        fake = Math.floor(Math.random() * 9);
        heavy = Math.random() < 0.5;
        left.clear();
        right.clear();
        weighings = 0;
        results = [];
        over = false;
        setStatus("Click coins onto the pans, then weigh. The fake is heavier OR lighter — you don't know which!");
        render();
      }

      function setStatus(t, cls) {
        const st = root.querySelector("#bs-status");
        if (st) {
          st.textContent = t;
          st.className = "status " + (cls || "info");
        }
      }

      function toggle(pan, i) {
        if (over) return;
        if (pan === "L") {
          if (right.has(i)) right.delete(i);
          left.has(i) ? left.delete(i) : left.add(i);
        } else {
          if (left.has(i)) left.delete(i);
          right.has(i) ? right.delete(i) : right.add(i);
        }
        AudioFX.click();
        render();
      }

      function weigh() {
        if (over) return;
        if (!left.size || !right.size || left.size !== right.size) {
          App.toast("Put the same number of coins on each pan", "warning");
          return;
        }
        weighings++;
        let tilt = 0; // -1 left down (left heavier), 1 right down, 0 balanced
        if (left.has(fake)) tilt = heavy ? -1 : 1;
        else if (right.has(fake)) tilt = heavy ? 1 : -1;
        const lbl = tilt === 0 ? "⚖️ Balanced" : (tilt === -1 ? "⬅️ Left pan heavier" : "Right pan heavier ➡️");
        results.push(`Weighing ${weighings}: ${[...left].map(i => i + 1).join(",") || "—"} vs ${[...right].map(i => i + 1).join(",") || "—"} → ${lbl}`);
        AudioFX.pop();
        if (weighings >= 3) setStatus("Three weighings used — now accuse the fake coin!");
        else setStatus(lbl);
        render();
      }

      function accuse(i) {
        if (over) return;
        over = true;
        if (i === fake) {
          setStatus(`🎉 Coin ${i + 1} was the fake (${heavy ? "heavier" : "lighter"}) — got it in ${weighings} weighings!`, "win");
          AudioFX.win();
          App.recordResult(true, weighings);
        } else {
          setStatus(`💀 Coin ${i + 1} is genuine — the fake was coin ${fake + 1} (${heavy ? "heavier" : "lighter"}).`, "lose");
          AudioFX.lose();
          App.recordResult(false, weighings);
        }
        render();
      }

      root.innerHTML = `
        <style>
          .bs-coins { display: flex; gap: 8px; justify-content: center; margin: 10px 0; flex-wrap: wrap; }
          .bs-coin { width: 46px; height: 46px; border-radius: 50%; background: #b45309; color: #fef3c7;
            display: grid; place-items: center; font-weight: 800; cursor: pointer; border: 2px solid #92400e; user-select: none; }
          .bs-coin.L { background: #1d4ed8; border-color: #1e40af; }
          .bs-coin.R { background: #b91c1c; border-color: #991b1b; }
          .bs-pans { display: flex; gap: 12px; justify-content: center; align-items: center; font-size: 1.4rem; margin: 6px 0; }
          .bs-log { font-size: .8rem; opacity: .8; text-align: left; width: min(360px, 90%); margin: 6px auto; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Weighings</div><div class="val" id="bs-w">0/3</div></div>
          <div class="score-cell"><div class="label">Left pan</div><div class="val" id="bs-l">—</div></div>
          <div class="score-cell"><div class="label">Right pan</div><div class="val" id="bs-r">—</div></div>
        </div>
        <div class="status info" id="bs-status"></div>
        <div class="bs-pans"><span id="bs-pl">🫱</span> ⚖️ <span id="bs-pr">🫲</span></div>
        <div class="bs-coins" id="bs-coins"></div>
        <div class="row" style="justify-content:center; gap:8px;">
          <button class="btn primary" id="bs-weigh">⚖️ Weigh</button>
          <button class="btn" id="bs-accuse">👉 Accuse…</button>
          <button class="btn" id="bs-new">↺ New puzzle</button>
        </div>
        <div class="bs-log" id="bs-log"></div>
      `;

      function render() {
        const el = root.querySelector("#bs-coins");
        let h = "";
        for (let i = 0; i < 9; i++) {
          const cls = left.has(i) ? "L" : (right.has(i) ? "R" : "");
          h += `<div class="bs-coin ${cls}" data-i="${i}">${i + 1}</div>`;
        }
        el.innerHTML = h;
        const w = root.querySelector("#bs-w"), l = root.querySelector("#bs-l"), r = root.querySelector("#bs-r");
        if (w) w.textContent = weighings + "/3";
        if (l) l.textContent = left.size ? [...left].map(i => i + 1).join(",") : "—";
        if (r) r.textContent = right.size ? [...right].map(i => i + 1).join(",") : "—";
        const log = root.querySelector("#bs-log");
        if (log) log.innerHTML = results.join("<br>");
        if (over) {
          const el2 = root.querySelector("#bs-coins");
          el2.querySelectorAll(".bs-coin").forEach((c, i) => {
            if (i === fake) c.style.boxShadow = "0 0 12px #f59e0b";
          });
        }
      }

      root.querySelector("#bs-coins").addEventListener("click", e => {
        const el = root.querySelector("#bs-coins");
        if (el.dataset.mode === "accuse") return; // accuse handler takes this click
        const c = e.target.closest("[data-i]");
        if (c) toggle(e.shiftKey || c.classList.contains("L") ? "L" : "R", +c.dataset.i);
      });
      root.querySelector("#bs-weigh").addEventListener("click", weigh);
      root.querySelector("#bs-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });
      root.querySelector("#bs-accuse").addEventListener("click", () => {
        if (over) return;
        // simple prompt-free accuse: click-accuse mode
        setStatus("Now click the coin you believe is fake.");
        root.querySelector("#bs-coins").dataset.mode = "accuse";
      });
      root.querySelector("#bs-coins").addEventListener("click", e => {
        const el = root.querySelector("#bs-coins");
        const c = e.target.closest("[data-i]");
        if (c && el.dataset.mode === "accuse") {
          el.dataset.mode = "";
          accuse(+c.dataset.i);
        }
      });

      newGame();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("The counterfeit coin puzzle",
        "Nine coins look identical, but one is fake — heavier or lighter, you don't know which." +
        "<br>Click a coin to put it on the <b>right</b> pan; Shift-click (or clicking a right-pan coin) moves it to the <b>left</b>. Click again to remove." +
        "<br>Weigh equal numbers of coins (max <b>3 weighings</b>), read the balance, then <b>Accuse</b> the fake." +
        "<br>Tip: 3 vs 3 first, then narrow it down — it's always solvable in three!");
    },
  });
})();
