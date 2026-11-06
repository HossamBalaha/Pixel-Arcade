/* Futoshiki — 4x4 Latin square (1-4) with inequality signs between some cells. */
(function () {
  // Pre-baked puzzle. solution[r][c] is the answer. constraints: list of {a:[r,c], b:[r,c], op:">"|"<"} meaning a op b.
  const PUZZLES = [
    {
      solution: [[2, 1, 4, 3], [4, 3, 2, 1], [1, 2, 3, 4], [3, 4, 1, 2]],
      constraints: [{a: [0, 0], b: [0, 1], op: ">"}, {a: [1, 1], b: [1, 2], op: "<"}, {
        a: [2, 2],
        b: [2, 3],
        op: ">"
      }, {a: [3, 1], b: [3, 2], op: ">"}, {a: [0, 3], b: [1, 3], op: "<"}]
    },
    {
      solution: [[3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1], [1, 2, 3, 4]],
      constraints: [{a: [0, 0], b: [0, 1], op: "<"}, {a: [1, 2], b: [1, 3], op: "<"}, {
        a: [2, 0],
        b: [2, 1],
        op: ">"
      }, {a: [3, 2], b: [3, 3], op: "<"}, {a: [1, 0], b: [2, 0], op: "<"}]
    },
  ];
  const N = 4;
  let live = null;
  GameRegistry.register({
    id: "futoshiki",
    name: "Futoshiki",
    icon: "📐",
    category: "logic",
    description: "Fill the grid so each row/col has 1-4, respecting inequality signs",
    tags: ["logic", "puzzle", "latin-square"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle, grid, given, over = false;
      root.innerHTML = `
        <div class="status info" id="ft-status">Click a cell to cycle 1-4. Numbers must obey the inequality signs.</div>
        <div class="center" style="margin:14px 0;"><div id="ft-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="ft-clear">Clear</button>
          <button class="btn primary" id="ft-check">Check</button>
        </div>
        <p class="hint">Each row &amp; column must contain 1, 2, 3, 4 exactly once. Signs point from larger to smaller.</p>
      `;
      const statusEl = root.querySelector("#ft-status");
      const gridEl = root.querySelector("#ft-grid");
      if (!document.getElementById("ft-style")) {
        const s = document.createElement("style");
        s.id = "ft-style";
        s.textContent = `#ft-grid{display:grid;grid-template-columns:repeat(${N},44px);grid-template-rows:repeat(${N},44px);gap:0;background:var(--border);padding:1px;}.ft-cell{background:var(--bg-elev);display:grid;place-items:center;font-family:var(--font-mono);font-weight:700;font-size:1.2rem;cursor:pointer;color:var(--text);position:relative;}.ft-cell.given{color:var(--accent);cursor:default;}.ft-cell.err{color:var(--danger);}.ft-sign{position:absolute;font-size:0.9rem;color:var(--warning);background:var(--bg-elev);padding:0 1px;}.ft-sign.r{right:-7px;top:50%;transform:translateY(-50%);z-index:1;}.ft-sign.b{bottom:-7px;left:50%;transform:translateX(-50%);z-index:1;}`;
        document.head.appendChild(s);
      }

      function isGiven(r, c) {
        return given[r][c];
      }

      function validRowCol() {
        for (let r = 0; r < N; r++) {
          const vals = grid[r].filter(v => v);
          if (new Set(vals).size !== vals.length) return false;
        }
        for (let c = 0; c < N; c++) {
          const vals = [];
          for (let r = 0; r < N; r++) if (grid[r][c]) vals.push(grid[r][c]);
          if (new Set(vals).size !== vals.length) return false;
        }
        return true;
      }

      function validConstraints() {
        for (const cs of puzzle.constraints) {
          const a = grid[cs.a[0]][cs.a[1]], b = grid[cs.b[0]][cs.b[1]];
          if (a && b) {
            if (cs.op === ">" && !(a > b)) return false;
            if (cs.op === "<" && !(a < b)) return false;
          }
        }
        return true;
      }

      function render() {
        gridEl.innerHTML = "";
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "ft-cell" + (given[r][c] ? " given" : "");
            cell.textContent = grid[r][c] || "";
            if (!given[r][c]) cell.addEventListener("click", () => {
              if (over) return;
              let v = grid[r][c] || 0;
              v = (v + 1) % (N + 1);
              grid[r][c] = v || 0;
              AudioFX.tick();
              render();
            });
            // horizontal sign to the right
            const rightCs = puzzle.constraints.find(cs => cs.a[0] === r && cs.a[1] === c && cs.b[0] === r && cs.b[1] === c + 1);
            if (rightCs) {
              const s = document.createElement("div");
              s.className = "ft-sign r";
              s.textContent = rightCs.op;
              cell.appendChild(s);
            }
            const downCs = puzzle.constraints.find(cs => cs.a[0] === r && cs.a[1] === c && cs.b[0] === r + 1 && cs.b[1] === c);
            if (downCs) {
              const s = document.createElement("div");
              s.className = "ft-sign b";
              s.textContent = "v";
              s.textContent = downCs.op === ">" ? "v" : "^";
              cell.appendChild(s);
            }
            gridEl.appendChild(cell);
          }
        }
      }

      function check() {
        if (over) return;
        const full = grid.every(row => row.every(v => v));
        if (!full) {
          statusEl.textContent = "Fill all cells first.";
          statusEl.className = "status lose";
          AudioFX.error();
          return;
        }
        if (validRowCol() && validConstraints()) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("futoshiki");
          if (!best || 100 > best) {
            Storage.setBest("futoshiki", 100);
            App.toast("Solved!", "success");
          }
        } else {
          AudioFX.error();
          statusEl.textContent = "Not yet — check rules & signs.";
          statusEl.className = "status lose";
        }
      }

      function newGame() {
        puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
        const sol = puzzle.solution;
        given = Array.from({length: N}, (_, r) => sol[r].map((v, c) => Math.random() < 0.3));
        grid = Array.from({length: N}, (_, r) => sol[r].map((v, c) => given[r][c] ? v : 0));
        over = false;
        statusEl.textContent = "Click a cell to cycle 1-4.";
        statusEl.className = "status info";
        render();
      }

      root.querySelector("#ft-check").addEventListener("click", check);
      root.querySelector("#ft-clear").addEventListener("click", () => {
        if (over) return;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!given[r][c]) grid[r][c] = 0;
        AudioFX.click();
        render();
      });
      live = {
        solve: function () {
          if (over) return;
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) grid[r][c] = puzzle.solution[r][c];
          over = true;
          AudioFX.lose();
          statusEl.textContent = "Solution revealed.";
          statusEl.className = "status lose";
          render();
        }
      };
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Futoshiki",
        `Fill the 4×4 grid so each row and column contains the digits 1-4 exactly once (like Sudoku).
        <br><br><b>Inequality signs</b> (>, <) between some cells must be obeyed — the wide end points to the larger number.
        <br><br>Click a cell to cycle through values. Use <b>Check</b> to verify, <b>Clear</b> to reset.`);
    },
  });
})();
