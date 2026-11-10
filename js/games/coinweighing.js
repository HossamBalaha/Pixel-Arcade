/* Coin Weighing — find the fake coin in three balance weighings */
(function () {
  GameRegistry.register({
    id: "coinweighing",
    name: "Coin Weighing",
    icon: "⚖️",
    category: "logic",
    description: "Find the fake coin in three balance weighings",
    tags: ["logic", "deduction", "classic"],
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
      const NUM = 12;
      let fake, fakeHeavy, left, right, weighings, best, solvedN, log;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Weighings</div><div class="val" id="cw-left">3</div></div>
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="cw-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cw-best">0</div></div>
        </div>
        <div class="status info" id="cw-status">One of 12 coins is fake — find it in 3 weighings, then say heavy or light</div>
        <div class="center" id="cw-board"></div>
        <p class="hint">Select coins onto the pans, then weigh. The balance always tells the truth.</p>
      `;

      const board = root.querySelector("#cw-board");
      const statusEl = root.querySelector("#cw-status");
      best = Storage.getBest("coinweighing") || 0;
      solvedN = 0;

      function reset() {
        fake = Math.floor(Math.random() * NUM);
        fakeHeavy = Math.random() < 0.5;
        left = new Set();
        right = new Set();
        weighings = 3;
        log = [];
        statusEl.textContent = "One of 12 coins is fake — find it in 3 weighings, then say heavy or light";
        statusEl.className = "status info";
        render();
      }

      function togglePan(coin, pan) {
        if (weighings <= 0) return;
        const other = pan === "L" ? right : left;
        other.delete(coin);
        (pan === "L" ? left : right).has(coin) ? (pan === "L" ? left : right).delete(coin) : (pan === "L" ? left : right).add(coin);
        render();
      }

      function doWeigh() {
        if (weighings <= 0) return;
        if (left.size === 0 || right.size === 0 || left.size !== right.size) {
          statusEl.textContent = "Both pans need the <b>same number</b> of coins!";
          statusEl.className = "status lose";
          AudioFX.error();
          return;
        }
        weighings--;
        const fakeOnLeft = left.has(fake), fakeOnRight = right.has(fake);
        let result;
        if (!fakeOnLeft && !fakeOnRight) result = "balanced";
        else if (fakeOnLeft) result = fakeHeavy ? "left" : "right";
        else result = fakeHeavy ? "right" : "left";
        log.push({
          l: [...left].map(c => c + 1).join(","),
          r: [...right].map(c => c + 1).join(","),
          result,
        });
        AudioFX.click();
        left.clear();
        right.clear();
        render();
      }

      function accuse(coin, heavy) {
        if (coin === fake && heavy === fakeHeavy) {
          AudioFX.win();
          solvedN++;
          if (solvedN > best) {
            best = solvedN;
            Storage.setBest("coinweighing", best);
          }
          statusEl.textContent = `✔ Correct! Coin ${coin + 1} was ${heavy ? "heavy" : "light"} — solved!`;
          statusEl.className = "status win";
          after(reset, 2000);
        } else {
          AudioFX.lose();
          statusEl.textContent = `✗ Nope. The fake was coin ${fake + 1} (${fakeHeavy ? "heavy" : "light"}). New round…`;
          statusEl.className = "status lose";
          after(reset, 2600);
        }
        render();
      }

      function render() {
        root.querySelector("#cw-left").textContent = weighings;
        root.querySelector("#cw-solved").textContent = solvedN;
        root.querySelector("#cw-best").textContent = best;
        board.innerHTML = `
          <style>
            .cw-coins { display:flex; gap:6px; flex-wrap:wrap; justify-content:center; max-width:420px; margin:0 auto; }
            .cw-coin { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center;
                       font-weight:700; cursor:pointer; background:radial-gradient(circle at 35% 35%, #fde68a, #b45309);
                       color:#78350f; border:2px solid #92400e; user-select:none; }
            .cw-coin.onL { background:radial-gradient(circle at 35% 35%, #93c5fd, #1d4ed8); color:#dbeafe; border-color:#1e3a8a; }
            .cw-coin.onR { background:radial-gradient(circle at 35% 35%, #fda4af, #be123c); color:#ffe4e6; border-color:#881337; }
            .cw-scale { display:grid; grid-template-columns:1fr auto 1fr; gap:10px; align-items:center; margin:12px auto; max-width:420px; }
            .cw-pan { min-height:52px; border-radius:8px; border:2px dashed #64748b; padding:6px; display:flex; gap:4px; flex-wrap:wrap; align-items:center; justify-content:center; font-size:14px; }
          </style>
          <div class="cw-scale">
            <div class="cw-pan" id="cw-panL">L: ${left.size ? [...left].map(c => c + 1).join(" ") : "empty"}</div>
            <div style="font-size:30px;">⚖️</div>
            <div class="cw-pan" id="cw-panR">R: ${right.size ? [...right].map(c => c + 1).join(" ") : "empty"}</div>
          </div>
          <div class="row gap-2" style="justify-content:center;margin-bottom:10px;">
            <button class="btn btn-sm primary" id="cw-weigh">⚖️ Weigh (${left.size} vs ${right.size})</button>
          </div>
          <div class="cw-coins">
            ${Array.from({length: NUM}, (_, i) => `
              <div>
                <div class="cw-coin ${left.has(i) ? "onL" : right.has(i) ? "onR" : ""}" data-coin="${i}">${i + 1}</div>
                <div class="row" style="justify-content:center;">
                  <button class="btn btn-sm" style="padding:1px 5px;font-size:10px;" data-toL="${i}">L</button>
                  <button class="btn btn-sm" style="padding:1px 5px;font-size:10px;" data-toR="${i}">R</button>
                  <button class="btn btn-sm" style="padding:1px 5px;font-size:10px;" data-off="${i}">–</button>
                </div>
              </div>
            `).join("")}
          </div>
          <div style="margin-top:12px;max-width:420px;margin-left:auto;margin-right:auto;">
            <div style="font-weight:600;margin-bottom:4px;">Log:</div>
            <div id="cw-log" style="font-size:13px;color:var(--text-muted,#94a3b8);min-height:40px;">
              ${log.map(l => `⚖️ [${l.l}] vs [${l.r}] → <b>${l.result === "balanced" ? "balanced" : l.result === "left" ? "LEFT heavier" : "RIGHT heavier"}</b>`).join("<br>") || "No weighings yet"}
            </div>
          </div>
          <div class="row gap-2" style="justify-content:center;margin-top:10px;flex-wrap:wrap;">
            <span style="font-weight:600;">Accuse:</span>
            <select id="cw-pick" class="filter-select">
              ${Array.from({length: NUM}, (_, i) => `<option value="${i}">Coin ${i + 1}</option>`).join("")}
            </select>
            <select id="cw-hl" class="filter-select">
              <option value="1">heavy ⬆</option>
              <option value="0">light ⬇</option>
            </select>
            <button class="btn btn-sm primary" id="cw-accuse">🔍 Accuse!</button>
          </div>
        `;
        board.querySelectorAll("[data-toL]").forEach(b => b.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!left.has(+b.dataset.tol)) {
            left.add(+b.dataset.tol);
            right.delete(+b.dataset.tol);
            render();
          }
        }));
        board.querySelectorAll("[data-toR]").forEach(b => b.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!right.has(+b.dataset.tor)) {
            right.add(+b.dataset.tor);
            left.delete(+b.dataset.tor);
            render();
          }
        }));
        board.querySelectorAll("[data-off]").forEach(b => b.addEventListener("click", (e) => {
          e.stopPropagation();
          left.delete(+b.dataset.off);
          right.delete(+b.dataset.off);
          render();
        }));
        board.querySelector("#cw-weigh").addEventListener("click", doWeigh);
        board.querySelector("#cw-accuse").addEventListener("click", () => {
          accuse(+board.querySelector("#cw-pick").value, board.querySelector("#cw-hl").value === "1");
        });
      }

      reset();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Coin Weighing",
        `12 identical-looking coins — one is <b>fake</b>, either heavier or lighter than the rest.
        <br><br>Load coins onto the pans with the <b>L</b>/<b>R</b> buttons and press <b>⚖️ Weigh</b>. The balance compares total weight
        and tells you which side is heavier (or that they balance). You get <b>3 weighings</b>.
        <br>Then pick the culprit and whether it's <b>heavy or light</b>. Classic information theory: 3 weighings give 27 outcomes —
        exactly enough for 24 possibilities.`);
    },
  });
})();
