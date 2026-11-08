/* Fillomino — fill the grid so every connected group of equal numbers has
   exactly that many cells.
   Generator: grow random regions first (each region's size becomes its
   number), then reveal a few givens. Valid by construction; the check is
   fully rule-based, so any valid solution wins. */
(function () {
  "use strict";

  const N = 6;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function generate() {
    for (let attempt = 0; attempt < 200; attempt++) {
      const region = Array.from({length: N}, () => Array(N).fill(-1));
      const sizes = [];
      let id = 0;
      // seed region starts
      const seeds = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < seeds; i++) {
        const r = Math.floor(Math.random() * N), c = Math.floor(Math.random() * N);
        if (region[r][c] === -1) {
          region[r][c] = id++;
          sizes.push(1 + Math.floor(Math.random() * 3));
        }
      }
      // grow regions round-robin randomly
      let growing = true;
      while (growing) {
        growing = false;
        for (let i = 0; i < id; i++) {
          // count cells & find frontier
          let count = 0;
          const frontier = [];
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            if (region[r][c] === i) {
              count++;
              for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < N && nc >= 0 && nc < N && region[nr][nc] === -1) frontier.push([nr, nc]);
              }
            }
          }
          if (count < sizes[i] && frontier.length) {
            const [r, c] = frontier[Math.floor(Math.random() * frontier.length)];
            region[r][c] = i;
            growing = true;
          }
        }
      }
      // any unassigned cells? make them singletons
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (region[r][c] === -1) region[r][c] = id++;
      }
      // build sol: value = region size
      const counts = {};
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) counts[region[r][c]] = (counts[region[r][c]] || 0) + 1;
      const sol = Array.from({length: N}, (_, r) => Array.from({length: N}, (_, c) => counts[region[r][c]]));
      // givens: one per region (the seed-ish cell)
      const given = Array.from({length: N}, () => Array(N).fill(false));
      const seen = new Set();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const rid = region[r][c];
        if (!seen.has(rid)) {
          seen.add(rid);
          given[r][c] = true;
        }
      }
      const totalRegions = id;
      if (totalRegions < 8 || totalRegions > 16) continue;
      return {sol, given};
    }
    // fallback: 2x2 blocks of 4 (verified)
    const sol = Array.from({length: N}, (_, r) => Array.from({length: N}, (_, c) => 4));
    const given = Array.from({length: N}, (_, r) => Array.from({length: N}, (_, c) => r % 2 === 0 && c % 2 === 0));
    return {sol, given};
  }

  let live = null;
  GameRegistry.register({
    id: "fillomino",
    name: "Fillomino",
    icon: "🧩",
    category: "logic",
    description: "Fill regions so each group's size matches its number",
    tags: ["logic", "thinking", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, grid = null, over = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="fm2-filled">0 / ${N * N}</div></div>
          <div class="score-cell"><div class="label">Regions</div><div class="val" id="fm2-regions">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="fm2-best">—</div></div>
        </div>
        <div class="status info" id="fm2-status">Click a cell and type 1–6. Every connected group of equal numbers must have exactly that many cells.</div>
        <div class="center" style="margin:14px 0;"><div class="fm2-grid" id="fm2-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="fm2-clear">Clear</button>
          <button class="btn primary" id="fm2-check">Check</button>
        </div>
        <p class="hint">Numbers in touching (up/down/left/right) cells form a group. Each group of number <b>k</b> must contain <b>exactly k cells</b>. Givens are fixed.</p>
      `;
      const statusEl = root.querySelector("#fm2-status");
      const gridEl = root.querySelector("#fm2-grid");
      if (!document.getElementById("fm2-style")) {
        const s = document.createElement("style");
        s.id = "fm2-style";
        s.textContent = `
          .fm2-grid { display: inline-grid; grid-template-columns: repeat(${N}, 52px); gap: 2px; background: var(--border); padding: 4px; border-radius: var(--radius); }
          .fm2-cell { width: 52px; height: 52px; background: var(--bg-elev); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1.3rem; cursor: pointer; color: var(--text); }
          .fm2-cell.given { color: var(--accent); cursor: default; }
          .fm2-cell.active { outline: 3px solid var(--accent); }
        `;
        document.head.appendChild(s);
      }

      let activeCell = null;

      function render() {
        gridEl.innerHTML = "";
        let filled = 0;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.className = "fm2-cell" + (puzzle.given[r][c] ? " given" : "") +
            (activeCell && activeCell[0] === r && activeCell[1] === c ? " active" : "");
          cell.textContent = grid[r][c] || "";
          if (grid[r][c]) filled++;
          cell.dataset.r = r;
          cell.dataset.c = c;
          cell.addEventListener("click", () => {
            if (over || puzzle.given[r][c]) return;
            activeCell = [r, c];
            AudioFX.click();
            render();
          });
          gridEl.appendChild(cell);
        }
        root.querySelector("#fm2-filled").textContent = filled + " / " + N * N;
        // count regions
        const seen = new Set();
        let regions = 0;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (!grid[r][c] || seen.has(r + "," + c)) continue;
          regions++;
          const stack = [[r, c]];
          seen.add(r + "," + c);
          while (stack.length) {
            const [cr, cc] = stack.pop();
            for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nr = cr + dr, nc = cc + dc;
              if (nr >= 0 && nr < N && nc >= 0 && nc < N && grid[nr][nc] === grid[r][c] && !seen.has(nr + "," + nc)) {
                seen.add(nr + "," + nc);
                stack.push([nr, nc]);
              }
            }
          }
        }
        root.querySelector("#fm2-regions").textContent = regions;
      }

      function typeKey(e) {
        if (!alive || over || !activeCell) return;
        const [r, c] = activeCell;
        if (puzzle.given[r][c]) return;
        if (/^[1-9]$/.test(e.key)) {
          grid[r][c] = +e.key;
          AudioFX.pop();
          render();
        } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
          grid[r][c] = 0;
          render();
        } else if (e.key === "ArrowUp" && r > 0) {
          activeCell = [r - 1, c];
          render();
        } else if (e.key === "ArrowDown" && r < N - 1) {
          activeCell = [r + 1, c];
          render();
        } else if (e.key === "ArrowLeft" && c > 0) {
          activeCell = [r, c - 1];
          render();
        } else if (e.key === "ArrowRight" && c < N - 1) {
          activeCell = [r, c + 1];
          render();
        }
      }

      document.addEventListener("keydown", typeKey);

      function check() {
        if (over) return;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (!grid[r][c]) return fail("Fill every cell first.");
          if (puzzle.given[r][c] && grid[r][c] !== puzzle.sol[r][c]) return fail("Don't change the given numbers.");
        }
        // region sizes must match values
        const seen = new Set();
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (seen.has(r + "," + c)) continue;
          const v = grid[r][c];
          const stack = [[r, c]], cells = [];
          seen.add(r + "," + c);
          while (stack.length) {
            const [cr, cc] = stack.pop();
            cells.push([cr, cc]);
            for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nr = cr + dr, nc = cc + dc;
              if (nr >= 0 && nr < N && nc >= 0 && nc < N && grid[nr][nc] === v && !seen.has(nr + "," + nc)) {
                seen.add(nr + "," + nc);
                stack.push([nr, nc]);
              }
            }
          }
          if (cells.length !== v) return fail(`A group of ${v}s has ${cells.length} cells.`);
        }
        over = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Solved!";
        statusEl.className = "status win";
        const best = Storage.getBest("fillomino");
        if (!best || 100 > best) {
          Storage.setBest("fillomino", 100);
          root.querySelector("#fm2-best").textContent = 100;
        }

        function fail(msg) {
          AudioFX.error();
          statusEl.textContent = msg;
          statusEl.className = "status lose";
        }
      }

      function newGame() {
        puzzle = generate();
        grid = Array.from({length: N}, () => Array(N).fill(0));
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (puzzle.given[r][c]) grid[r][c] = puzzle.sol[r][c];
        over = false;
        activeCell = null;
        const best = Storage.getBest("fillomino");
        root.querySelector("#fm2-best").textContent = best || "—";
        statusEl.textContent = "Click a cell and type 1–6. Every connected group of equal numbers must have exactly that many cells.";
        statusEl.className = "status info";
        render();
      }

      root.querySelector("#fm2-check").addEventListener("click", check);
      root.querySelector("#fm2-clear").addEventListener("click", () => {
        if (over) return;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!puzzle.given[r][c]) grid[r][c] = 0;
        AudioFX.click();
        render();
      });

      newGame();
      live = {
        hint: function () {
          if (over || !puzzle) return;
          const wrong = [];
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            if (!puzzle.given[r][c] && grid[r][c] !== puzzle.sol[r][c]) wrong.push([r, c]);
          }
          if (!wrong.length) {
            App.toast("Nothing to reveal — you're on track!", "info");
            return;
          }
          const [r, c] = wrong[Math.floor(Math.random() * wrong.length)];
          grid[r][c] = puzzle.sol[r][c];
          AudioFX.reveal();
          render();
        },
        solve: function () {
          if (over) return;
          grid = puzzle.sol.map(row => row.slice());
          over = true;
          render();
          statusEl.textContent = "Solution revealed";
          statusEl.className = "status lose";
          AudioFX.lose();
        },
      };
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", typeKey);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Fillomino",
        `Fill the grid with numbers.
        <br><br>• Orthogonally connected cells with the <b>same number</b> form a group.
        <br>• A group of number <b>k</b> must contain <b>exactly k cells</b>.
        <br>• Cells with different numbers may touch freely.
        <br><br>Click a cell, then type a number. Arrow keys move around.`);
    },
  });
})();
