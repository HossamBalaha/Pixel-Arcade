/* Water Jugs — fill, empty and pour to measure the exact target */
(function () {
  GameRegistry.register({
    id: "waterjugs",
    name: "Water Jugs",
    icon: "🫗",
    category: "logic",
    description: "Fill, empty and pour to measure the exact target",
    tags: ["logic", "classic", "measuring"],
    mount: function (root, {App, AudioFX, Storage}) {

      // tracked timers — all cleared on cleanup so no stale callback runs after close
      let __t = [];
      const after = (fn, ms) => {
        const h = setTimeout(() => {
          __t = __t.filter(x => x !== h);
          fn();
        }, ms);
        __t.push(h);
        return h;
      };
      let caps, waters, target, moves, best, won, level, sel;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Level</div><div class="val" id="wj-lvl">1</div></div>
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="wj-moves">0</div></div>
          <div class="score-cell"><div class="label">Best lvl</div><div class="val" id="wj-best">1</div></div>
        </div>
        <div class="status info" id="wj-status">Measure exactly the target amount</div>
        <div class="center" id="wj-jugs"></div>
        <p class="hint">Tap a jug to select it, then tap an action. Pouring stops when the source is empty or the target is full.</p>
      `;

      const jugsEl = root.querySelector("#wj-jugs");
      const statusEl = root.querySelector("#wj-status");
      best = Storage.getBest("waterjugs") || 1;

      // levels: [capA, capB, capC?, target] — all solvable by construction (Bézout / simulation below)
      const LEVELS = [
        {caps: [5, 3], target: 4},
        {caps: [8, 5, 3], target: 4},
        {caps: [12, 7], target: 6},
        {caps: [9, 4], target: 6},
        {caps: [10, 7, 3], target: 5},
        {caps: [14, 9, 5], target: 11},
        {caps: [17, 6], target: 8},
        {caps: [15, 9, 4], target: 8},
      ];

      function load(i) {
        level = i;
        caps = LEVELS[i].caps.slice();
        waters = caps.map(() => 0);
        target = LEVELS[i].target;
        moves = 0;
        won = false;
        sel = null;
        statusEl.textContent = `Measure exactly <b>${target}L</b> in any jug`;
        statusEl.className = "status info";
        render();
      }

      function action(kind, idx) {
        if (won) return;
        if (kind === "fill") {
          waters[idx] = caps[idx];
          AudioFX.pop();
        } else if (kind === "empty") {
          waters[idx] = 0;
          AudioFX.error();
        } else if (kind === "pour") {
          if (sel === null || sel === idx) return;
          const from = sel, to = idx;
          const space = caps[to] - waters[to];
          const amount = Math.min(waters[from], space);
          waters[from] -= amount;
          waters[to] += amount;
          AudioFX.click();
          sel = null;
        }
        moves++;
        updateHud();
        render();
        if (waters.includes(target)) win();
      }

      function win() {
        won = true;
        AudioFX.win();
        if (level + 1 > best) {
          best = level + 1;
          Storage.setBest("waterjugs", best);
        }
        statusEl.textContent = `✔ ${target}L measured in ${moves} moves! Next level…`;
        statusEl.className = "status win";
        after(() => load(Math.min(LEVELS.length - 1, level + 1)), 1500);
      }

      function updateHud() {
        root.querySelector("#wj-lvl").textContent = level + 1;
        root.querySelector("#wj-moves").textContent = moves;
        root.querySelector("#wj-best").textContent = best;
      }

      function render() {
        updateHud();
        jugsEl.innerHTML = `
          <style>
            .wj-wrap { display:flex; gap:22px; justify-content:center; align-items:flex-end; flex-wrap:wrap; }
            .wj-jug { display:flex; flex-direction:column; align-items:center; gap:6px; }
            .wj-body { width:64px; height:${Math.max(...caps) * 22 + 10}px; border:3px solid #64748b; border-top:none; position:relative; border-radius:0 0 12px 12px; display:flex; flex-direction:column-reverse; overflow:hidden; }
            .wj-water { width:100%; background:linear-gradient(#38bdf8,#0284c7); transition:height .25s; }
            .wj-cap { font-weight:700; }
            .wj-sel { outline:3px solid #fbbf24; outline-offset:3px; border-radius:0 0 12px 12px; }
          </style>
          <div class="wj-wrap">
            ${caps.map((c, i) => `
              <div class="wj-jug">
                <div class="wj-body ${sel === i ? "wj-sel" : ""}" data-jug="${i}">
                  <div class="wj-water" style="height:${(waters[i] / c) * 100}%;"></div>
                </div>
                <div class="wj-cap">${waters[i]} / ${c}L</div>
                <div class="row gap-1">
                  <button class="btn btn-sm" data-fill="${i}" title="Fill">🚰</button>
                  <button class="btn btn-sm" data-empty="${i}" title="Empty">🕳️</button>
                  <button class="btn btn-sm" data-pour="${i}" title="Pour into">↗️</button>
                </div>
              </div>
            `).join("")}
          </div>
          <div style="text-align:center;margin-top:12px;font-size:17px;">🎯 Target: <b>${target}L</b> in any jug</div>
          <div class="row gap-2" style="justify-content:center;margin-top:6px;">
            <button class="btn btn-sm" id="wj-restart">↻ Restart level</button>
          </div>
        `;
        jugsEl.querySelectorAll("[data-jug]").forEach(el => el.addEventListener("pointerdown", () => {
          sel = sel === +el.dataset.jug ? null : +el.dataset.jug;
          AudioFX.click();
          render();
        }));
        jugsEl.querySelectorAll("[data-fill]").forEach(b => b.addEventListener("click", () => action("fill", +b.dataset.fill)));
        jugsEl.querySelectorAll("[data-empty]").forEach(b => b.addEventListener("click", () => action("empty", +b.dataset.empty)));
        jugsEl.querySelectorAll("[data-pour]").forEach(b => b.addEventListener("click", () => action("pour", +b.dataset.pour)));
        jugsEl.querySelector("#wj-restart").addEventListener("click", () => load(level));
      }

      load(0);
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Water Jugs",
        `You have jugs of fixed capacities but no measurement marks. Reach the <b>exact target amount</b> in any jug.
        <br><br>Actions: 🚰 <b>fill</b> a jug from the tap, 🕳️ <b>empty</b> it out, or tap one jug then tap <b>↗️ pour</b> on another —
        pouring stops when the source empties or the destination fills.
        <br>Example: with 5L and 3L jugs you can measure 4L (fill 5 → pour into 3 → empty 3 → pour remaining 2 → …).
        Eight levels of increasing trickiness.`);
    },
  });
})();
