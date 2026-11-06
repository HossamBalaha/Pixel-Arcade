/* Memory Battleship — see the ships for 3 seconds, then remember and sink them. */
(function () {
  const N = 6;
  const SHIPS = [
    {name: "Carrier", len: 3},
    {name: "Cruiser", len: 2},
    {name: "Patrol", len: 2},
  ];
  let live = null;

  function placeShips() {
    const ships = [];
    const grid = Array.from({length: N}, () => Array(N).fill(null));
    for (const ship of SHIPS) {
      let placed = false, tries = 0;
      while (!placed && tries < 200) {
        tries++;
        const horiz = Math.random() < 0.5;
        const r = Math.floor(Math.random() * (horiz ? N : N - ship.len + 1));
        const c = Math.floor(Math.random() * (horiz ? N - ship.len + 1 : N));
        let ok = true;
        const cells = [];
        for (let k = 0; k < ship.len; k++) {
          const rr = r + (horiz ? 0 : k);
          const cc = c + (horiz ? k : 0);
          if (grid[rr][cc]) {
            ok = false;
            break;
          }
          cells.push([rr, cc]);
        }
        if (ok) {
          cells.forEach(([rr, cc]) => grid[rr][cc] = ship.name);
          ships.push({...ship, cells});
        }
      }
    }
    return {grid, ships};
  }

  GameRegistry.register({
    id: "memorybattleship",
    name: "Memory Battleship",
    icon: "🚢",
    category: "strategy",
    description: "See the ships for 3 seconds — then remember and sink them all!",
    tags: ["battleship", "memory", "strategy"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let ships = [], grid = [], guesses = new Set(), hits = new Set(), over = false, phase = "memorize",
        memorizeTimer = null;
      const pendingTimers = [];

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (alive) fn();
        }, ms);
        pendingTimers.push(id);
        return id;
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Hits</div><div class="val" id="mb-hits">0</div></div>
          <div class="score-cell"><div class="label">Misses</div><div class="val" id="mb-miss">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="mb-best">—</div></div>
        </div>
        <div class="status info" id="mb-status">Memorize the ship positions! 3…2…1…</div>
        <div class="center"><div id="mb-grid" style="display:grid;grid-template-columns:repeat(${N},48px);grid-template-rows:repeat(${N},48px);gap:2px;background:var(--border);padding:2px;border-radius:var(--radius);"></div></div>
        <div class="row" style="justify-content:center;gap:8px;margin-top:12px;">
          <button class="btn" id="mb-reveal">Peek (3s)</button>
          <button class="btn primary" id="mb-new">New Game</button>
        </div>
        <p class="hint">Ships appear for 3s at start. Then guess cells to fire. Sink all 3 ships! Use <b>Peek</b> once for another look (costs 5 pts).</p>
      `;
      const gridEl = root.querySelector("#mb-grid");
      const statusEl = root.querySelector("#mb-status");
      root.querySelector("#mb-best").textContent = Storage.getBest("memorybattleship") ?? "—";

      function newGame() {
        const p = placeShips();
        grid = p.grid;
        ships = p.ships;
        guesses = new Set();
        hits = new Set();
        over = false;
        phase = "memorize";
        statusEl.textContent = "Memorize the ship positions! 3…2…1…";
        statusEl.className = "status info";
        render(true);
        clearTimeout(memorizeTimer);
        memorizeTimer = later(() => {
          phase = "play";
          statusEl.textContent = "Now sink them! Click cells to fire.";
          statusEl.className = "status info";
          render(false);
        }, 3000);
      }

      function render(showShips) {
        gridEl.innerHTML = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.style.cssText = "background:var(--bg-elev);display:grid;place-items:center;cursor:pointer;font-weight:700;font-size:0.9rem;";
          const key = `${r},${c}`;
          const shipHere = grid[r][c];
          if (showShips && shipHere) {
            cell.style.background = "var(--accent-2)";
            cell.style.color = "#fff";
            cell.textContent = "■";
          } else if (hits.has(key)) {
            cell.style.background = "var(--danger)";
            cell.style.color = "#fff";
            cell.textContent = "✗";
          } else if (guesses.has(key)) {
            cell.style.background = "var(--bg-soft)";
            cell.style.color = "var(--text-muted)";
            cell.textContent = "•";
          }
          cell.addEventListener("click", () => onCell(r, c));
          gridEl.appendChild(cell);
        }
        root.querySelector("#mb-hits").textContent = hits.size;
        root.querySelector("#mb-miss").textContent = guesses.size - hits.size;
      }

      function onCell(r, c) {
        if (over || phase !== "play") return;
        const key = `${r},${c}`;
        if (guesses.has(key)) return;
        guesses.add(key);
        if (grid[r][c]) {
          hits.add(key);
          AudioFX.win();
          statusEl.textContent = "💥 Hit!";
          statusEl.className = "status win";
          // Check if any ship fully sunk
          const sunk = ships.filter(s => s.cells.every(([rr, cc]) => hits.has(`${rr},${cc}`)));
          const justSunk = sunk.find(s => s.cells.some(([rr, cc]) => rr === r && cc === c) && s.cells.every(([rr, cc]) => hits.has(`${rr},${cc}`)));
          if (justSunk) {
            AudioFX.reveal();
            statusEl.textContent = `🏆 Sunk the ${justSunk.name}!`;
            statusEl.className = "status win";
          }
          // All sunk?
          if (ships.every(s => s.cells.every(([rr, cc]) => hits.has(`${rr},${cc}`)))) {
            over = true;
            const misses = guesses.size - hits.size;
            const score = Math.max(0, 100 - misses * 5);
            statusEl.textContent = `🎉 All ships sunk! Misses: ${misses}. Score: ${score}`;
            statusEl.className = "status win";
            AudioFX.win();
            const best = Storage.getBest("memorybattleship");
            if (!best || score > best) {
              Storage.setBest("memorybattleship", score);
              root.querySelector("#mb-best").textContent = score;
              App.toast("Score: " + score, "success");
            }
          }
        } else {
          AudioFX.error();
          statusEl.textContent = "💨 Miss!";
          statusEl.className = "status lose";
        }
        render(false);
      }

      root.querySelector("#mb-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });
      root.querySelector("#mb-reveal").addEventListener("click", () => {
        if (over || phase !== "play") return;
        AudioFX.reveal();
        render(true);
        later(() => render(false), 3000);
      });

      live = {};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        clearTimeout(memorizeTimer);
        pendingTimers.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Memory Battleship",
        `At the start of each game, all 3 ships are <b>shown for 3 seconds</b>. Memorize their positions!
        <br><br>Then click cells to fire. <b>💥 Hit</b> = part of a ship. <b>💨 Miss</b> = empty water.
        <br>Sink all 3 ships to win. Score = 100 − (misses × 5).
        <br><br>You can use <b>Peek</b> once per game for another 3-second look.`);
    },
  });
})();
