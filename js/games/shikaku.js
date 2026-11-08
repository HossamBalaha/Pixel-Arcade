/* Shikaku — divide the grid into rectangles. Each rectangle contains exactly
   one number, which equals its area.
   Generator: random recursive rectangle partition of the grid (every cell
   covered exactly once by construction), then place the area clue at a random
   cell of each rectangle. */
(function () {
  "use strict";

  const N = 7;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function partition() {
    const rects = [];

    function split(r1, c1, r2, c2) {
      const h = r2 - r1 + 1, w = c2 - c1 + 1;
      if (h * w <= 6 && Math.random() < 0.5) {
        rects.push([r1, c1, r2, c2]);
        return;
      }
      if (h * w <= 2) {
        rects.push([r1, c1, r2, c2]);
        return;
      }
      if (h >= w || (w > 1 && Math.random() < 0.5 && h > 1)) {
        // split rows (needs h >= 2)
        if (h < 2) {
          rects.push([r1, c1, r2, c2]);
          return;
        }
        const m = r1 + 1 + Math.floor(Math.random() * (h - 1));
        split(r1, c1, m - 1, c2);
        split(m, c1, r2, c2);
      } else {
        if (w < 2) {
          rects.push([r1, c1, r2, c2]);
          return;
        }
        const m = c1 + 1 + Math.floor(Math.random() * (w - 1));
        split(r1, c1, r2, m - 1);
        split(r1, m, r2, c2);
      }
    }

    split(0, 0, N - 1, N - 1);
    return rects;
  }

  function generate() {
    const rects = partition();
    const clues = [];
    const grid = Array.from({length: N}, () => Array(N).fill(0));
    for (const [r1, c1, r2, c2] of rects) {
      const area = (r2 - r1 + 1) * (c2 - c1 + 1);
      const cells = [];
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) cells.push([r, c]);
      const [cr, cc] = cells[Math.floor(Math.random() * cells.length)];
      clues.push([cr, cc, area]);
      grid[cr][cc] = area;
    }
    return {clues, grid, rects};
  }

  let live = null;
  GameRegistry.register({
    id: "shikaku",
    name: "Shikaku",
    icon: "▭",
    category: "logic",
    description: "Divide the grid into rectangles — each holds one number = area",
    tags: ["logic", "thinking", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, rects = [], over = false, dragStart = null;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Rectangles</div><div class="val" id="sk2-rects">0</div></div>
          <div class="score-cell"><div class="label">Clues</div><div class="val" id="sk2-clues">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sk2-best">—</div></div>
        </div>
        <div class="status info" id="sk2-status">Drag from one cell to another to draw a rectangle covering whole clues.</div>
        <div class="center" style="margin:14px 0;"><div class="sk2-grid" id="sk2-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="sk2-clear">Clear</button>
          <button class="btn primary" id="sk2-check">Check</button>
        </div>
        <p class="hint">Cover the whole grid with rectangles. Each rectangle must contain <b>exactly one</b> clue number and have an area equal to it.</p>
      `;
      const statusEl = root.querySelector("#sk2-status");
      const gridEl = root.querySelector("#sk2-grid");
      if (!document.getElementById("sk2-style")) {
        const s = document.createElement("style");
        s.id = "sk2-style";
        s.textContent = `
          .sk2-grid { display: inline-grid; grid-template-columns: repeat(${N}, 50px); gap: 0; background: var(--border); border: 2px solid var(--border); }
          .sk2-cell { width: 50px; height: 50px; background: var(--bg-elev); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1.15rem; cursor: pointer; user-select: none; position: relative; }
          .sk2-cell.has-rect { background: var(--accent-soft, #e0e7ff); }
        `;
        document.head.appendChild(s);
      }

      function rectAt(r, c) {
        return rects.findIndex(([r1, c1, r2, c2]) => r >= r1 && r <= r2 && c >= c1 && c <= c2);
      }

      function render() {
        gridEl.innerHTML = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.className = "sk2-cell" + (rectAt(r, c) >= 0 ? " has-rect" : "");
          if (puzzle.grid[r][c]) cell.textContent = puzzle.grid[r][c];
          cell.dataset.r = r;
          cell.dataset.c = c;
          gridEl.appendChild(cell);
        }
        root.querySelector("#sk2-rects").textContent = rects.length;
        root.querySelector("#sk2-clues").textContent = puzzle.clues.length;
      }

      function addRect(r1, c1, r2, c2) {
        // remove overlapping rects
        rects = rects.filter(([a1, b1, a2, b2]) => !(r1 <= a2 && r2 >= a1 && c1 <= b2 && c2 >= b1));
        rects.push([r1, c1, r2, c2]);
        AudioFX.place();
        render();
      }

      gridEl.addEventListener("pointerdown", (e) => {
        const cell = e.target.closest(".sk2-cell");
        if (!cell || over) return;
        dragStart = [+cell.dataset.r, +cell.dataset.c];
      });
      gridEl.addEventListener("pointerup", (e) => {
        const cell = e.target.closest(".sk2-cell");
        if (!cell || over || !dragStart) {
          dragStart = null;
          return;
        }
        const r2 = +cell.dataset.r, c2 = +cell.dataset.c;
        const [r1, c1] = dragStart;
        dragStart = null;
        if (r1 === r2 && c1 === c2) return; // plain click — handled by click handler
        addRect(Math.min(r1, r2), Math.min(c1, c2), Math.max(r1, r2), Math.max(c1, c2));
      });
      gridEl.addEventListener("click", (e) => {
        // single click (no drag): remove the rect under the pointer
        const cell = e.target.closest(".sk2-cell");
        if (!cell || over) return;
        const idx = rectAt(+cell.dataset.r, +cell.dataset.c);
        if (idx >= 0) {
          rects.splice(idx, 1);
          AudioFX.click();
          render();
        }
      });

      function check() {
        if (over) return;
        // every cell covered exactly once
        const cover = Array.from({length: N}, () => Array(N).fill(0));
        for (const [r1, c1, r2, c2] of rects) {
          for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) cover[r][c]++;
        }
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (cover[r][c] !== 1) return fail(`Cell (${r + 1},${c + 1}) is covered ${cover[r][c]} time(s).`);
        }
        // each rect exactly one clue matching area
        for (const [r1, c1, r2, c2] of rects) {
          const area = (r2 - r1 + 1) * (c2 - c1 + 1);
          const cluesInside = puzzle.clues.filter(([cr, cc]) => cr >= r1 && cr <= r2 && cc >= c1 && cc <= c2);
          if (cluesInside.length === 0) return fail(`Rectangle at (${r1 + 1},${c1 + 1}) has no clue.`);
          if (cluesInside.length > 1) return fail(`A rectangle contains ${cluesInside.length} clues — only 1 allowed.`);
          if (cluesInside[0][2] !== area) return fail(`Rectangle at (${r1 + 1},${c1 + 1}) has area ${area}, clue says ${cluesInside[0][2]}.`);
        }
        over = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Solved!";
        statusEl.className = "status win";
        const best = Storage.getBest("shikaku");
        if (!best || 100 > best) {
          Storage.setBest("shikaku", 100);
          root.querySelector("#sk2-best").textContent = 100;
        }

        function fail(msg) {
          AudioFX.error();
          statusEl.textContent = msg;
          statusEl.className = "status lose";
        }
      }

      function newGame() {
        puzzle = generate();
        rects = [];
        over = false;
        const best = Storage.getBest("shikaku");
        root.querySelector("#sk2-best").textContent = best || "—";
        statusEl.textContent = "Drag from one cell to another to draw a rectangle covering whole clues.";
        statusEl.className = "status info";
        render();
      }

      root.querySelector("#sk2-check").addEventListener("click", check);
      root.querySelector("#sk2-clear").addEventListener("click", () => {
        if (over) return;
        rects = [];
        AudioFX.click();
        render();
      });

      newGame();
      live = {
        hint: function () {
          if (over || !puzzle) return;
          const missing = puzzle.rects.filter(() => true).filter(([r1, c1, r2, c2]) => {
            // exact match present?
            return !rects.some(([a1, b1, a2, b2]) => a1 === r1 && b1 === c1 && a2 === r2 && b2 === c2);
          });
          if (!missing.length) {
            App.toast("Nothing to reveal — you're on track!", "info");
            return;
          }
          const [r1, c1, r2, c2] = missing[Math.floor(Math.random() * missing.length)];
          rects = rects.filter(([a1, b1, a2, b2]) => !(r1 <= a2 && r2 >= a1 && c1 <= b2 && c2 >= b1));
          rects.push([r1, c1, r2, c2]);
          AudioFX.reveal();
          render();
        },
        solve: function () {
          if (over) return;
          rects = puzzle.rects.map(([r1, c1, r2, c2]) => [r1, c1, r2, c2]);
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
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Shikaku",
        `Divide the grid into rectangles.
        <br><br>• Each rectangle contains <b>exactly one</b> clue number.
        <br>• The rectangle's <b>area</b> (width × height) must equal that number.
        <br>• Every cell must be covered — no gaps, no overlaps.
        <br><br>Drag between two cells to draw a rectangle; click a rectangle to remove it.`);
    },
  });
})();
