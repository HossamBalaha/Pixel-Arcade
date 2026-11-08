/* shutthebox — roll dice, flip tiles that sum to the roll; shut all 9 to win. */
(function () {
  "use strict";
  GameRegistry.register({
    id: "shutthebox", name: "Shut the Box", icon: "📦", category: "strategy",
    description: "Flip tiles to match your dice rolls — shut all nine!", tags: ["dice", "classic", "solo"],
    age: ["kids", "teens", "adults"], difficulty: "easy", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      let tiles = []; // 1..9 open?
      let roll = null, d1 = 0, d2 = 0, over = false, rounds = 0, best = null;
      let selected = new Set();

      function newGame() {
        tiles = Array.from({length: 10}, (_, i) => i >= 1 && i <= 9);
        selected.clear();
        roll = null;
        over = false;
        rounds = 0;
        setStatus("Roll the dice!");
        render();
      }

      function setStatus(t, cls) {
        const st = root.querySelector("#sb-status");
        if (st) {
          st.textContent = t;
          st.className = "status " + (cls || "info");
        }
      }

      function openTiles() {
        const o = [];
        for (let i = 1; i <= 9; i++) if (tiles[i]) o.push(i);
        return o;
      }

      function combos(nums, target) { // all subsets summing to target
        const out = [];
        const rec = (start, left, acc) => {
          if (left === 0) {
            out.push(acc.slice());
            return;
          }
          for (let i = start; i < nums.length; i++) {
            if (nums[i] > left) break;
            acc.push(nums[i]);
            rec(i + 1, left - nums[i], acc);
            acc.pop();
          }
        };
        rec(0, target, []);
        return out;
      }

      function doRoll() {
        if (over || roll !== null) return;
        const open = openTiles();
        d1 = 1 + Math.floor(Math.random() * 6);
        d2 = 1 + Math.floor(Math.random() * 6);
        const useOne = open.length <= 6 && open.every(n => n <= 6);
        roll = useOne ? d1 : d1 + d2; // classic rule: one die when only small tiles remain
        AudioFX.click();
        if (!combos(open, roll).length) {
          over = true;
          const score = open.reduce((a, b) => a + b, 0);
          setStatus(`💀 Rolled ${roll} — no combination works. Open tiles: ${score}`, "lose");
          AudioFX.lose();
          App.recordResult(false, score);
          render();
          return;
        }
        setStatus(`Rolled ${useOne ? d1 : d1 + "+" + d2 + "=" + roll} — flip tiles that add up to ${roll}.`);
        render();
      }

      function flip(n) {
        if (over || roll === null) return;
        if (!tiles[n]) {
          App.toast("Already shut", "warning");
          return;
        }
        if (selected.has(n)) selected.delete(n);
        else selected.add(n);
        AudioFX.click();
        render();
      }

      function confirmFlip() {
        if (over || roll === null) return;
        const sum = [...selected].reduce((a, b) => a + b, 0);
        if (sum !== roll) {
          App.toast(`Selected ${sum}, need ${roll}`, "warning");
          return;
        }
        for (const n of selected) tiles[n] = false;
        selected.clear();
        roll = null;
        rounds++;
        AudioFX.pop();
        if (openTiles().length === 0) {
          over = true;
          setStatus("🎉 Box shut! Perfect game!", "win");
          AudioFX.win();
          App.recordResult(true, rounds);
        } else {
          setStatus("Roll again!");
        }
        render();
      }

      root.innerHTML = `
        <style>
          .sb-tiles { display: flex; gap: 6px; justify-content: center; margin: 12px 0; flex-wrap: wrap; }
          .sb-tile { width: 46px; height: 60px; border-radius: 8px; background: #78350f; color: #fde68a;
            font-size: 1.5rem; font-weight: 800; display: grid; place-items: center; cursor: pointer;
            border: 2px solid #92400e; }
          .sb-tile.sel { background: #f59e0b; color: #1c1917; transform: translateY(-4px); }
          .sb-tile.shut { background: var(--bg-elev); color: var(--border); cursor: default; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Dice</div><div class="val" id="sb-dice">—</div></div>
          <div class="score-cell"><div class="label">Selected</div><div class="val" id="sb-sel">0</div></div>
          <div class="score-cell"><div class="label">Rolls</div><div class="val" id="sb-r">0</div></div>
        </div>
        <div class="status info" id="sb-status">Roll the dice!</div>
        <div class="sb-tiles" id="sb-tiles"></div>
        <div class="row" style="justify-content:center; gap:8px;">
          <button class="btn primary" id="sb-roll">🎲 Roll</button>
          <button class="btn" id="sb-ok">✓ Flip</button>
          <button class="btn" id="sb-new">↺ Restart</button>
        </div>
      `;

      function render() {
        const el = root.querySelector("#sb-tiles");
        let h = "";
        for (let n = 1; n <= 9; n++) {
          const cls = !tiles[n] ? "shut" : (selected.has(n) ? "sel" : "");
          h += `<div class="sb-tile ${cls}" data-n="${n}">${tiles[n] ? n : "—"}</div>`;
        }
        el.innerHTML = h;
        const d = root.querySelector("#sb-dice"), s = root.querySelector("#sb-sel"), r = root.querySelector("#sb-r");
        if (d) d.textContent = roll === null ? (d1 ? `${d1} ⚄` : "—") : `${d1} ${d2}${roll === d1 ? " (one die)" : ""}`;
        if (s) s.textContent = [...selected].reduce((a, b) => a + b, 0) + (roll !== null ? " / " + roll : "");
        if (r) r.textContent = rounds;
      }

      root.querySelector("#sb-tiles").addEventListener("click", e => {
        const t = e.target.closest("[data-n]");
        if (t) flip(+t.dataset.n);
      });
      root.querySelector("#sb-roll").addEventListener("click", doRoll);
      root.querySelector("#sb-ok").addEventListener("click", confirmFlip);
      root.querySelector("#sb-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });

      newGame();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Shut the Box",
        "A centuries-old pub game. Roll the dice (two dice; one die once only small tiles remain)." +
        "<br>Flip any combination of <b>open tiles that sums exactly to your roll</b>, then roll again." +
        "<br><b>Shut all nine tiles to win</b>. If no combination matches your roll, the game ends and your score is the sum of tiles left open (lower is better).");
    },
  });
})();
