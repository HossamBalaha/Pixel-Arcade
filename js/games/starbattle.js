/* Star Battle — place stars: 1 per row, 1 per column, 1 per region; no two stars adjacent. */
(function () {
  // Each puzzle: 5x5 region map (numbers 0..4) and the solution positions.
  const PUZZLES = [
    {
      regions: [
        [0, 0, 1, 1, 1],
        [0, 0, 1, 2, 2],
        [0, 3, 1, 2, 2],
        [3, 3, 3, 4, 4],
        [3, 3, 4, 4, 4],
      ],
      solution: [[1, 1], [0, 2], [2, 4], [3, 0], [4, 3]],
    },
    {
      regions: [
        [0, 0, 0, 1, 1],
        [0, 2, 2, 1, 1],
        [0, 2, 2, 3, 3],
        [4, 2, 4, 3, 3],
        [4, 4, 4, 4, 3],
      ],
      solution: [[0, 4], [1, 1], [2, 3], [3, 0], [4, 2]],
    },
    {
      regions: [
        [0, 0, 1, 1, 1],
        [0, 2, 2, 2, 1],
        [0, 2, 3, 3, 1],
        [4, 4, 3, 3, 3],
        [4, 4, 4, 3, 3],
      ],
      solution: [[0, 3], [1, 0], [2, 2], [3, 4], [4, 1]],
    },
  ];

  const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

  let live = null;
  GameRegistry.register({
    id: "starbattle",
    name: "Star Battle",
    icon: "⭐",
    category: "logic",
    description: "Place 1 star per row, column, and region — no touching",
    tags: ["logic", "thinking", "puzzle"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, stars = null, over = false;
      const N = 5;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Stars</div><div class="val" id="sb-stars">0 / ${N}</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="sb-errors">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sb-best">—</div></div>
        </div>
        <div class="status info" id="sb-status">Place 1 star in every row, column, and region. Stars can't touch (not even diagonally).</div>
        <div class="center" style="margin:14px 0;"><div class="sb-grid" id="sb-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="sb-clear">Clear</button>
          <button class="btn primary" id="sb-check">Check</button>
        </div>
        <p class="hint">Each colored region must contain exactly one star. Each row and column must have one star. No two stars can touch — even diagonally.</p>
      `;
      const statusEl = root.querySelector("#sb-status");
      const gridEl = root.querySelector("#sb-grid");
      if (!document.getElementById("sb-style")) {
        const s = document.createElement("style");
        s.id = "sb-style";
        s.textContent = `
          .sb-grid { display: grid; grid-template-columns: repeat(${N}, 50px); gap: 2px; background: var(--border); padding: 4px; border-radius: var(--radius); }
          .sb-cell { width: 50px; height: 50px; display: grid; place-items: center; cursor: pointer; user-select: none; font-size: 1.6rem; transition: transform 0.1s; }
          .sb-cell:active { transform: scale(0.92); }
          .sb-cell.star::after { content: "⭐"; }
        `;
        document.head.appendChild(s);
      }

      function isAdjacent(r1, c1, r2, c2) {
        return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
      }

      function errors() {
        const errs = new Set();
        const positions = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (stars[r][c]) positions.push([r, c]);
        // touching
        for (let i = 0; i < positions.length; i++) {
          for (let j = i + 1; j < positions.length; j++) {
            if (isAdjacent(positions[i][0], positions[i][1], positions[j][0], positions[j][1])) {
              errs.add(`${positions[i][0]},${positions[i][1]}`);
              errs.add(`${positions[j][0]},${positions[j][1]}`);
            }
          }
        }
        // rows
        for (let r = 0; r < N; r++) {
          const count = stars[r].filter(v => v).length;
          if (count > 1) for (let c = 0; c < N; c++) if (stars[r][c]) errs.add(`${r},${c}`);
        }
        // cols
        for (let c = 0; c < N; c++) {
          let count = 0;
          for (let r = 0; r < N; r++) if (stars[r][c]) count++;
          if (count > 1) for (let r = 0; r < N; r++) if (stars[r][c]) errs.add(`${r},${c}`);
        }
        // regions
        const regionCount = {};
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (stars[r][c]) {
            const reg = puzzle.regions[r][c];
            regionCount[reg] = (regionCount[reg] || 0) + 1;
          }
        }
        for (const [reg, count] of Object.entries(regionCount)) {
          if (count > 1) {
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
              if (stars[r][c] && puzzle.regions[r][c] == reg) errs.add(`${r},${c}`);
            }
          }
        }
        return errs;
      }

      function render() {
        gridEl.innerHTML = "";
        const errs = errors();
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "sb-cell";
            cell.style.background = COLORS[puzzle.regions[r][c]];
            cell.style.color = "#fff";
            if (stars[r][c]) cell.classList.add("star");
            if (errs.has(`${r},${c}`)) cell.style.outline = "3px solid var(--danger)";
            cell.addEventListener("click", () => {
              if (over) return;
              stars[r][c] = !stars[r][c];
              AudioFX.pop();
              render();
              checkAuto();
            });
            gridEl.appendChild(cell);
          }
        }
        const count = stars.flat().filter(v => v).length;
        root.querySelector("#sb-stars").textContent = `${count} / ${N}`;
        root.querySelector("#sb-errors").textContent = errs.size;
      }

      function checkAuto() {
        if (stars.flat().filter(v => v).length !== N) return;
        if (errors().size === 0) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("starbattle");
          if (!best || 100 > best) {
            Storage.setBest("starbattle", 100);
            root.querySelector("#sb-best").textContent = 100;
          }
        }
      }

      function check() {
        if (stars.flat().filter(v => v).length !== N) {
          AudioFX.error();
          statusEl.textContent = `Place exactly ${N} stars`;
          statusEl.className = "status lose";
          return;
        }
        if (errors().size === 0) checkAuto();
        else {
          AudioFX.error();
          statusEl.textContent = "Conflicts remain";
          statusEl.className = "status lose";
        }
      }

      root.querySelector("#sb-check").addEventListener("click", check);
      root.querySelector("#sb-clear").addEventListener("click", () => {
        if (over) return;
        stars = Array.from({length: N}, () => Array(N).fill(false));
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        stars = Array.from({length: N}, () => Array(N).fill(false));
        over = false;
        const best = Storage.getBest("starbattle");
        root.querySelector("#sb-best").textContent = best || "—";
        statusEl.textContent = "Place 1 star in every row, column, and region. Stars can't touch (not even diagonally).";
        statusEl.className = "status info";
        render();
      }

      live = {
        solve: function () {
          if (over) return;
          stars = Array.from({length: N}, () => Array(N).fill(false));
          puzzle.solution.forEach(([r, c]) => stars[r][c] = true);
          over = true;
          render();
          statusEl.textContent = "Solution revealed";
          statusEl.className = "status lose";
          AudioFX.lose();
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
      App.showModal("How to play Star Battle",
        `Place <b>5 stars</b> on the grid so that:
        <br>• Each <b>row</b> has exactly 1 star
        <br>• Each <b>column</b> has exactly 1 star
        <br>• Each <b>colored region</b> has exactly 1 star
        <br>• No two stars <b>touch</b> — not even diagonally
        <br><br>Tap a cell to place or remove a star.`);
    },
  });
})();
