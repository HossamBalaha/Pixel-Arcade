/* Shikaku — divide the grid into rectangles. Each rectangle contains exactly one number = its area. */
(function () {
  // 5×5 grid: 0 = empty, number = clue cell with required area
  const PUZZLES = [
    {
      size: 5,
      clues: [[0, 0, 4], [0, 4, 1], [2, 2, 5], [4, 0, 5], [4, 4, 1], [3, 4, 1], [1, 0, 1], [4, 2, 3]],
      // Solution as rectangles: each rectangle = {r1,c1,r2,c2,area}
      sol: [
        {r1: 0, c1: 1, r2: 0, c2: 4, area: 4},
        {r1: 1, c1: 0, r2: 1, c2: 0, area: 1},
        {r1: 0, c1: 0, r2: 0, c2: 0, area: 1},
        {r1: 2, c1: 0, r2: 4, c2: 1, area: 5},
        {r1: 1, c1: 1, r2: 2, c2: 4, area: 5},
        {r1: 3, c1: 2, r2: 4, c2: 4, area: 6},
      ],
    },
  ];
  const N = 5;

  let live = null;
  GameRegistry.register({
    id: "shikaku",
    name: "Shikaku",
    icon: "▭",
    category: "logic",
    description: "Divide the grid into rectangles — each holds one number = area",
    tags: ["logic", "thinking", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, rects = [], over = false;
      let dragStart = null;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Rectangles</div><div class="val" id="sk-rects">0</div></div>
          <div class="score-cell"><div class="label">Cells covered</div><div class="val" id="sk-covered">0 / ${N * N}</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sk-best">—</div></div>
        </div>
        <div class="status info" id="sk-status">Click and drag across cells to draw a rectangle covering exactly one clue cell.</div>
        <div class="center" style="margin:14px 0;"><div class="sk-grid" id="sk-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="sk-undo">Undo</button>
          <button class="btn" id="sk-clear">Clear</button>
          <button class="btn primary" id="sk-check">Check</button>
        </div>
        <p class="hint">Drag mouse from one cell to another to draw a rectangle. Each rectangle must contain <b>exactly one clue cell</b>, and its area must equal that clue's number.</p>
      `;
      const statusEl = root.querySelector("#sk-status");
      const gridEl = root.querySelector("#sk-grid");
      if (!document.getElementById("sk-style")) {
        const s = document.createElement("style");
        s.id = "sk-style";
        s.textContent = `
          .sk-grid { display: inline-grid; grid-template-columns: repeat(${N}, 48px); gap: 2px; background: var(--border); padding: 4px; border-radius: var(--radius); touch-action: none; }
          .sk-cell { width: 48px; height: 48px; background: var(--bg-elev); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1rem; color: var(--text); user-select: none; position: relative; }
          .sk-cell.clue { background: var(--bg-soft); }
          .sk-cell.dragging { outline: 3px solid var(--accent); }
        `;
        document.head.appendChild(s);
      }

      const COLORS = ["rgba(99,102,241,0.25)", "rgba(236,72,153,0.25)", "rgba(22,163,74,0.25)", "rgba(245,158,11,0.25)", "rgba(14,165,233,0.25)", "rgba(139,92,246,0.25)", "rgba(220,38,38,0.25)", "rgba(20,184,166,0.25)"];

      function getClue(r, c) {
        const k = puzzle.clues.find(([cr, cc]) => cr === r && cc === c);
        return k ? k[2] : null;
      }

      function rectAt(r, c) {
        return rects.find(R => r >= R.r1 && r <= R.r2 && c >= R.c1 && c <= R.c2);
      }

      function render() {
        gridEl.innerHTML = "";
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "sk-cell";
            cell.dataset.r = r;
            cell.dataset.c = c;
            const clue = getClue(r, c);
            if (clue !== null) {
              cell.classList.add("clue");
              cell.textContent = clue;
            }
            const R = rectAt(r, c);
            if (R) cell.style.background = COLORS[rects.indexOf(R) % COLORS.length];
            cell.addEventListener("mousedown", (e) => {
              e.preventDefault();
              dragStart = [r, c];
              updateDrag([r, c]);
            });
            cell.addEventListener("mouseenter", (e) => {
              if (dragStart) updateDrag([r, c]);
            });
            cell.addEventListener("touchstart", (e) => {
              e.preventDefault();
              const t = e.touches[0];
              const el = document.elementFromPoint(t.clientX, t.clientY);
              if (el && el.dataset.r !== undefined) {
                dragStart = [+el.dataset.r, +el.dataset.c];
                updateDrag(dragStart);
              }
            }, {passive: false});
            cell.addEventListener("touchmove", (e) => {
              e.preventDefault();
              if (!dragStart) return;
              const t = e.touches[0];
              const el = document.elementFromPoint(t.clientX, t.clientY);
              if (el && el.dataset.r !== undefined) updateDrag([+el.dataset.r, +el.dataset.c]);
            }, {passive: false});
            gridEl.appendChild(cell);
          }
        }
        const covered = new Set();
        rects.forEach(R => {
          for (let r = R.r1; r <= R.r2; r++) for (let c = R.c1; c <= R.c2; c++) covered.add(`${r},${c}`);
        });
        root.querySelector("#sk-rects").textContent = rects.length;
        root.querySelector("#sk-covered").textContent = `${covered.size} / ${N * N}`;
      }

      let currentDragRect = null;

      function updateDrag(end) {
        if (!dragStart) return;
        const r1 = Math.min(dragStart[0], end[0]), r2 = Math.max(dragStart[0], end[0]);
        const c1 = Math.min(dragStart[1], end[1]), c2 = Math.max(dragStart[1], end[1]);
        currentDragRect = {r1, c1, r2, c2};
        // Highlight cells in drag rect
        Array.from(gridEl.children).forEach(cell => {
          const r = +cell.dataset.r, c = +cell.dataset.c;
          cell.classList.toggle("dragging", r >= r1 && r <= r2 && c >= c1 && c <= c2);
        });
      }

      function endDrag() {
        if (!dragStart || !currentDragRect) {
          dragStart = null;
          return;
        }
        const R = currentDragRect;
        // Validate: must contain exactly one clue, area must equal clue
        let clueCount = 0, clueArea = null, clueR = -1, clueC = -1;
        for (let r = R.r1; r <= R.r2; r++) for (let c = R.c1; c <= R.c2; c++) {
          const cl = getClue(r, c);
          if (cl !== null) {
            clueCount++;
            clueArea = cl;
            clueR = r;
            clueC = c;
          }
        }
        const area = (R.r2 - R.r1 + 1) * (R.c2 - R.c1 + 1);
        if (clueCount === 1 && area === clueArea) {
          // Check no overlap with existing rects
          let overlap = false;
          for (let r = R.r1; r <= R.r2 && !overlap; r++) for (let c = R.c1; c <= R.c2 && !overlap; c++) {
            if (rectAt(r, c)) overlap = true;
          }
          if (!overlap) {
            rects.push(R);
            AudioFX.pop();
          } else {
            AudioFX.error();
            App.toast("Rectangle overlaps an existing one", "warning");
          }
        } else {
          AudioFX.error();
          if (clueCount === 0) App.toast("Rectangle must contain a clue cell", "warning");
          else if (clueCount > 1) App.toast("Rectangle can contain only one clue", "warning");
          else App.toast(`Area ${area} ≠ clue ${clueArea}`, "warning");
        }
        dragStart = null;
        currentDragRect = null;
        render();
        checkAuto();
      }

      // Bind mouseup on document
      function onMouseUp() {
        if (dragStart) endDrag();
      }

      function checkAuto() {
        // All cells covered + all rects valid (1 clue, area matches) + total area = N*N
        const covered = new Set();
        let valid = true;
        rects.forEach(R => {
          let clueCount = 0, clueArea = null;
          for (let r = R.r1; r <= R.r2; r++) for (let c = R.c1; c <= R.c2; c++) {
            covered.add(`${r},${c}`);
            const cl = getClue(r, c);
            if (cl !== null) {
              clueCount++;
              clueArea = cl;
            }
          }
          const area = (R.r2 - R.r1 + 1) * (R.c2 - R.c1 + 1);
          if (clueCount !== 1 || area !== clueArea) valid = false;
        });
        if (covered.size === N * N && valid) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("shikaku");
          if (!best || 100 > best) {
            Storage.setBest("shikaku", 100);
            root.querySelector("#sk-best").textContent = 100;
          }
        }
      }

      function check() {
        const covered = new Set();
        let valid = true;
        rects.forEach(R => {
          let clueCount = 0, clueArea = null;
          for (let r = R.r1; r <= R.r2; r++) for (let c = R.c1; c <= R.c2; c++) {
            covered.add(`${r},${c}`);
            const cl = getClue(r, c);
            if (cl !== null) {
              clueCount++;
              clueArea = cl;
            }
          }
          const area = (R.r2 - R.r1 + 1) * (R.c2 - R.c1 + 1);
          if (clueCount !== 1 || area !== clueArea) valid = false;
        });
        if (covered.size !== N * N) {
          AudioFX.error();
          statusEl.textContent = `${N * N - covered.size} cells uncovered`;
          statusEl.className = "status lose";
          return;
        }
        if (!valid) {
          AudioFX.error();
          statusEl.textContent = "Some rectangles are invalid";
          statusEl.className = "status lose";
          return;
        }
        checkAuto();
      }

      root.querySelector("#sk-check").addEventListener("click", check);
      root.querySelector("#sk-undo").addEventListener("click", () => {
        if (over) return;
        rects.pop();
        AudioFX.click();
        render();
      });
      root.querySelector("#sk-clear").addEventListener("click", () => {
        if (over) return;
        rects = [];
        AudioFX.click();
        render();
      });
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("touchend", onMouseUp);

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        rects = [];
        over = false;
        dragStart = null;
        currentDragRect = null;
        const best = Storage.getBest("shikaku");
        root.querySelector("#sk-best").textContent = best || "—";
        statusEl.textContent = "Click and drag across cells to draw a rectangle covering exactly one clue cell.";
        statusEl.className = "status info";
        render();
      }

      live = {
        solve: function () {
          if (over) return;
          rects = puzzle.sol.map(R => ({r1: R.r1, c1: R.c1, r2: R.r2, c2: R.c2}));
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
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("touchend", onMouseUp);
      };
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Shikaku",
        `Divide the grid into rectangles.
        <br><br>Each rectangle must:
        <br>• Contain <b>exactly one numbered clue cell</b>.
        <br>• Have an <b>area</b> (number of cells) <b>equal to that clue's number</b>.
        <br><br>Drag mouse from one cell to another to draw a rectangle. The rectangle must not overlap any existing rectangle.`);
    },
  });
})();
