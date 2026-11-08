/* N-Queens — place queens so no two attack each other */
(function () {
  GameRegistry.register({
    id: "nqueens",
    name: "N-Queens",
    icon: "👑",
    category: "logic",
    description: "Place queens so no two attack each other",
    tags: ["logic", "chess", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let N, queens, solvedCount, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="nq-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="nq-best">0</div></div>
          <div class="score-cell"><div class="label">Queens</div><div class="val" id="nq-count">0/8</div></div>
        </div>
        <div class="status info" id="nq-status">Place N queens — none may attack another</div>
        <div class="center"><div id="nq-grid"></div></div>
        <div class="row gap-2" style="justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-sm" data-n="4">4×4</button>
          <button class="btn btn-sm" data-n="5">5×5</button>
          <button class="btn btn-sm primary" data-n="6">6×6</button>
          <button class="btn btn-sm" data-n="8">8×8</button>
          <button class="btn btn-sm" id="nq-clear">↻ Clear</button>
        </div>
        <p class="hint">Queens attack along rows, columns and both diagonals. The classic 8×8 has 92 solutions!</p>
      `;

      const gridEl = root.querySelector("#nq-grid");
      const statusEl = root.querySelector("#nq-status");
      best = Storage.getBest("nqueens") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        #nq-grid { display:inline-grid; gap:0; padding:8px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .nq-cell { display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:26px; user-select:none; }
        .nq-cell.light { background:#e2e8f0; } .nq-cell.dark { background:#94a3b8; }
        .nq-cell .q { filter: drop-shadow(0 2px 2px rgba(0,0,0,0.4)); }
        .nq-cell.attacked { position:relative; }
        .nq-cell.attacked::after { content:""; position:absolute; inset:0; background:rgba(239,68,68,0.25); }
      `;
      root.appendChild(style);

      function setN(n) {
        N = n;
        queens = new Set(); // "x,y"
        render();
        statusEl.textContent = `Place ${N} queens on the ${N}×${N} board — none may attack another`;
        statusEl.className = "status info";
        updateHud();
      }

      function updateHud() {
        root.querySelector("#nq-solved").textContent = solvedCount;
        root.querySelector("#nq-best").textContent = best;
        root.querySelector("#nq-count").textContent = queens.size + "/" + N;
      }

      function attacked(x, y) {
        for (const q of queens) {
          const [qx, qy] = q.split(",").map(Number);
          if (qx === x || qy === y || Math.abs(qx - x) === Math.abs(qy - y)) return true;
        }
        return false;
      }

      function attackedCells() {
        const out = new Set();
        for (const q of queens) {
          const [qx, qy] = q.split(",").map(Number);
          for (let i = 0; i < N; i++) {
            out.add(i + "," + qy);
            out.add(qx + "," + i);
            const d1 = qx + Math.abs(i - qx), d2 = qx - Math.abs(i - qx);
            if (d1 >= 0 && d1 < N) out.add(d1 + "," + (qy + Math.abs(i - qx)));
            if (d2 >= 0 && d2 < N) out.add(d2 + "," + (qy + Math.abs(i - qx)));
          }
        }
        queens.forEach(q => out.delete(q));
        return out;
      }

      function toggle(x, y) {
        const k = x + "," + y;
        if (queens.has(k)) {
          queens.delete(k);
          AudioFX.click();
        } else {
          queens.add(k);
          AudioFX.pop();
        }
        render();
        updateHud();
        if (queens.size === N) {
          // verify no attacks (placement allowed only non-attacked? we allow any then validate)
          let ok = true;
          const arr = [...queens].map(q => q.split(",").map(Number));
          for (let i = 0; i < arr.length && ok; i++) {
            for (let j = i + 1; j < arr.length; j++) {
              if (arr[i][0] === arr[j][0] || arr[i][1] === arr[j][1] || Math.abs(arr[i][0] - arr[j][0]) === Math.abs(arr[i][1] - arr[j][1])) {
                ok = false;
                break;
              }
            }
          }
          if (ok) {
            AudioFX.win();
            solvedCount++;
            if (solvedCount > best) {
              best = solvedCount;
              Storage.setBest("nqueens", best);
            }
            statusEl.textContent = `👑 ${N} queens in peace! Solved.`;
            statusEl.className = "status win";
            updateHud();
          } else {
            AudioFX.error();
            statusEl.textContent = "Some queens still attack each other — fix the conflicts!";
            statusEl.className = "status lose";
          }
        }
      }

      function render() {
        const size = N <= 5 ? 52 : N === 6 ? 44 : 36;
        gridEl.style.gridTemplateColumns = `repeat(${N}, ${size}px)`;
        const atk = attackedCells();
        gridEl.innerHTML = "";
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = document.createElement("div");
          c.className = `nq-cell ${(x + y) % 2 ? "light" : "dark"}`;
          if (atk.has(x + "," + y)) c.classList.add("attacked");
          c.style.width = c.style.height = size + "px";
          if (queens.has(x + "," + y)) c.innerHTML = `<span class="q">♛</span>`;
          const x0 = x, y0 = y;
          c.addEventListener("pointerdown", () => toggle(x0, y0));
          gridEl.appendChild(c);
        }
      }

      root.querySelectorAll("[data-n]").forEach(b => b.addEventListener("click", () => setN(+b.dataset.n)));
      root.querySelector("#nq-clear").addEventListener("click", () => {
        queens.clear();
        render();
        updateHud();
      });

      setN(6);
      return function cleanup() {
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play N-Queens",
        `Place <b>N queens</b> on an N×N chessboard so that <b>no two queens attack each other</b>:
        no shared row, column, or diagonal.
        <br><br>Red tint shows all squares currently under attack. Click a queen to remove it.
        Choose your board size — 4×4 (easy) up to the classic 8×8. Solutions exist for every size ≥ 4.`);
    },
  });
})();
