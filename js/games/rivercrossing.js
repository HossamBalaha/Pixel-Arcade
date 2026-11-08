/* River Crossing — ferry the wolf, goat and cabbage across */
(function () {
  GameRegistry.register({
    id: "rivercrossing",
    name: "River Crossing",
    icon: "🚣",
    category: "logic",
    description: "Ferry the wolf, goat and cabbage — the boat holds one",
    tags: ["logic", "classic", "planning"],
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
      // items: 🐺 wolf, 🐐 goat, 🥬 cabbage — wolf eats goat, goat eats cabbage when unattended
      let left, right, boatAt, moves, best, won, msg;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="rv-moves">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="rv-best">—</div></div>
        </div>
        <div class="status info" id="rv-status">Get all three across — the boat carries only one passenger</div>
        <div class="center" id="rv-scene"></div>
        <p class="hint">🐺 eats 🐐 · 🐐 eats 🥬 — never leave a predator with prey alone on a bank.</p>
      `;

      const scene = root.querySelector("#rv-scene");
      const statusEl = root.querySelector("#rv-status");
      best = Storage.getBest("rivercrossing");

      function reset() {
        left = ["🐺", "🐐", "🥬"];
        right = [];
        boatAt = "L";
        moves = 0;
        won = false;
        msg = null;
        statusEl.textContent = "Get all three across — the boat carries only one passenger";
        statusEl.className = "status info";
        render();
      }

      function bankSafe(bank) {
        if (bank.includes("🐺") && bank.includes("🐐")) return false;
        if (bank.includes("🐐") && bank.includes("🥬")) return false;
        return true;
      }

      function take(item) {
        if (won) return;
        const from = boatAt === "L" ? left : right;
        const idx = from.indexOf(item);
        if (idx < 0) return;
        from.splice(idx, 1);
        boatAt = boatAt === "L" ? "R" : "L";
        (boatAt === "L" ? left : right).push(item);
        moves++;
        AudioFX.pop();
        evaluate();
        render();
      }

      function crossEmpty() {
        if (won) return;
        boatAt = boatAt === "L" ? "R" : "L";
        moves++;
        AudioFX.click();
        evaluate();
        render();
      }

      function evaluate() {
        if (right.length === 3) {
          won = true;
          AudioFX.win();
          statusEl.textContent = `🎉 All across in ${moves} moves!${best && moves < best ? " New record!" : ""}`;
          statusEl.className = "status win";
          if (!best || moves < best) {
            best = moves;
            Storage.setBest("rivercrossing", moves);
          }
          return;
        }
        if (!bankSafe(left) || !bankSafe(right)) {
          AudioFX.lose();
          statusEl.textContent = "Oh no! Something got eaten 🍖 — resetting…";
          statusEl.className = "status lose";
          after(reset, 1400);
        } else {
          statusEl.textContent = `Boat on the ${boatAt === "L" ? "left" : "right"} bank. ${
            right.length === 0 ? "Start by taking the goat!" : "Plan carefully…"}`;
          statusEl.className = "status info";
        }
      }

      function render() {
        root.querySelector("#rv-moves").textContent = moves;
        root.querySelector("#rv-best").textContent = best || "—";
        const bank = (arr, side) => {
          const items = arr.length ? arr.map(i =>
              `<button class="btn btn-sm rv-item" data-i="${i}" style="font-size:22px;padding:6px 10px;">${i}</button>`).join(" ") :
            `<span style="opacity:0.4;font-size:20px;">∅ empty</span>`;
          return `<div class="rv-bank">${items}</div>`;
        };
        scene.innerHTML = `
          <style>
            .rv-bank { min-height:64px; padding:10px; border-radius:12px; background:var(--bg-soft,#334155); display:flex; gap:6px; align-items:center; justify-content:center; flex-wrap:wrap; }
            .rv-river { height:46px; margin:8px 0; border-radius:8px; background:linear-gradient(#0ea5e9,#0369a1); display:flex; align-items:center; justify-content:center; font-size:26px; position:relative; overflow:hidden; }
            .rv-boat { position:absolute; ${boatAt === "L" ? "left:12%" : "right:12%"}; transition:all .4s; font-size:28px; }
            .rv-river::after { content:"〰️〰️〰️"; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; opacity:.35; font-size:14px; letter-spacing:4px; }
          </style>
          ${bank(left, "L")}
          <div class="rv-river">
            <div class="rv-boat">🚣${boatAt === "L" ? "⬅️" : "➡️"}</div>
          </div>
          ${bank(right, "R")}
          <div class="row gap-2" style="justify-content:center;margin-top:8px;">
            <button class="btn btn-sm" id="rv-empty">🚣 Cross empty</button>
            <button class="btn btn-sm" id="rv-reset">↻ Restart</button>
          </div>
        `;
        scene.querySelectorAll(".rv-item").forEach(b => b.addEventListener("click", () => take(b.dataset.i)));
        scene.querySelector("#rv-empty").addEventListener("click", crossEmpty);
        scene.querySelector("#rv-reset").addEventListener("click", reset);
      }

      reset();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play River Crossing",
        `The classic puzzle! A farmer must ferry a <b>🐺 wolf</b>, a <b>🐐 goat</b> and a <b>🥬 cabbage</b> across the river,
        but the boat holds only <b>one passenger</b> besides the farmer.
        <br><br>Left alone: the wolf eats the goat, and the goat eats the cabbage. If that happens the puzzle resets.
        Tap a passenger to load them and cross, or cross empty. It can be done in <b>7 moves</b> — the classic solution.`);
    },
  });
})();
