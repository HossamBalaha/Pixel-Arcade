/* Picross 3D — simplified 3D Picross: 3×3×3 cube, deduce filled cells from face clue counts. */
(function () {
  const N = 3; // 3x3x3 cube = 27 cells
  let live = null;

  function makePuzzle() {
    // Pick a hidden subset of filled cells (8-12 of 27)
    const filled = new Set();
    const target = 8 + Math.floor(Math.random() * 5);
    while (filled.size < target) {
      const x = Math.floor(Math.random() * N);
      const y = Math.floor(Math.random() * N);
      const z = Math.floor(Math.random() * N);
      filled.add(`${x},${y},${z}`);
    }
    // Compute face clues:
    // Front (z=0..2): for each (x,y) count cells across z
    // Top (y=0): for each (x,z) count cells across y
    // Right (x=N-1): for each (y,z) count cells across x
    const front = Array.from({length: N}, () => Array(N).fill(0)); // [x][y]
    const top = Array.from({length: N}, () => Array(N).fill(0));   // [x][z]
    const right = Array.from({length: N}, () => Array(N).fill(0)); // [y][z]
    filled.forEach(s => {
      const [x, y, z] = s.split(",").map(Number);
      front[x][y]++;
      top[x][z]++;
      right[y][z]++;
    });
    return {filled, front, top, right, target};
  }

  GameRegistry.register({
    id: "picross3d",
    name: "Picross 3D",
    icon: "🧊",
    category: "logic",
    description: "3×3×3 cube — deduce filled cells from face clues",
    tags: ["picross", "logic", "3d"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puz = null, marks = new Set(), sel = null;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Marked</div><div class="val" id="p3-marked">0</div></div>
          <div class="score-cell"><div class="label">Target</div><div class="val" id="p3-target">—</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="p3-best">—</div></div>
        </div>
        <div class="status info" id="p3-status">Click a cell to mark/unmark. Use the face clues to find the hidden filled cells.</div>
        <div class="center" style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center;margin:14px 0;">
          <div class="col" style="align-items:center;gap:6px;"><div class="p3-label">Top (y=0)</div><div id="p3-top"></div></div>
          <div class="col" style="align-items:center;gap:6px;"><div class="p3-label">Front (z varies)</div><div id="p3-front"></div></div>
          <div class="col" style="align-items:center;gap:6px;"><div class="p3-label">Right (x=2)</div><div id="p3-right"></div></div>
        </div>
        <div class="center"><div id="p3-cube" style="display:grid;grid-template-columns:repeat(3,40px);grid-template-rows:repeat(9,40px);gap:4px;"></div></div>
        <div class="row" style="justify-content:center;gap:8px;margin-top:12px;">
          <button class="btn" id="p3-clear">Clear</button>
          <button class="btn primary" id="p3-check">Check</button>
        </div>
        <p class="hint">Cube shown as 3 layers of 3×3 (top layer y=0, bottom y=2). Numbers on each face = count of filled cells along that line.</p>
      `;
      const statusEl = root.querySelector("#p3-status");
      const cubeEl = root.querySelector("#p3-cube");
      root.querySelector("#p3-best").textContent = Storage.getBest("picross3d") ?? "—";

      if (!document.getElementById("p3-style")) {
        const s = document.createElement("style");
        s.id = "p3-style";
        s.textContent = `
          .p3-face { display:grid; grid-template-columns:repeat(3,28px); gap:2px; }
          .p3-clue { width:28px;height:28px;display:grid;place-items:center;background:var(--bg-soft);color:var(--accent);font-family:var(--font-mono);font-weight:700;border-radius:var(--radius);font-size:0.9rem; }
          .p3-label { font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; }
          .p3-cell { width:40px;height:40px;background:var(--bg-elev);border:1px solid var(--border);display:grid;place-items:center;cursor:pointer;font-family:var(--font-mono);font-weight:700; }
          .p3-cell.marked { background:var(--accent);color:#fff;border-color:var(--accent); }
          .p3-cell.sel { outline:2px solid var(--warning); }
        `;
        document.head.appendChild(s);
      }

      function renderFaces() {
        const mkFace = (grid, id) => {
          const el = root.querySelector("#p3-" + id);
          el.innerHTML = "";
          el.className = "p3-face";
          for (let a = 0; a < N; a++) for (let bb = 0; bb < N; bb++) {
            const d = document.createElement("div");
            d.className = "p3-clue";
            d.textContent = grid[a][bb];
            el.appendChild(d);
          }
        };
        mkFace(puz.top, "top");
        mkFace(puz.front, "front");
        mkFace(puz.right, "right");
      }

      function renderCube() {
        cubeEl.innerHTML = "";
        // 9 rows: y=0 top, y=1 middle, y=2 bottom; each y has 3 z rows × 3 x cols
        for (let y = 0; y < N; y++) {
          for (let z = 0; z < N; z++) {
            for (let x = 0; x < N; x++) {
              const cell = document.createElement("div");
              cell.className = "p3-cell";
              const key = `${x},${y},${z}`;
              if (marks.has(key)) cell.classList.add("marked");
              if (sel === key) cell.classList.add("sel");
              cell.title = `x=${x},y=${y},z=${z}`;
              cell.addEventListener("click", () => {
                if (marks.has(key)) marks.delete(key); else marks.add(key);
                AudioFX.tick();
                renderCube();
                root.querySelector("#p3-marked").textContent = marks.size;
              });
              cubeEl.appendChild(cell);
            }
          }
        }
      }

      function check() {
        const correct = [...puz.filled].every(k => marks.has(k)) && [...marks].every(k => puz.filled.has(k));
        if (correct) {
          AudioFX.win();
          statusEl.textContent = "🎉 Perfect! All cells correctly identified!";
          statusEl.className = "status win";
          const best = Storage.getBest("picross3d");
          if (best === null) {
            Storage.setBest("picross3d", 1);
            root.querySelector("#p3-best").textContent = 1;
            App.toast("Solved!", "success");
          }
        } else {
          AudioFX.error();
          const onlyRight = [...marks].filter(k => puz.filled.has(k)).length;
          const missed = puz.filled.size - onlyRight;
          const wrong = marks.size - onlyRight;
          statusEl.textContent = `Not yet — ${onlyRight}/${puz.filled.size} correct, ${wrong} wrong, ${missed} missed.`;
          statusEl.className = "status lose";
        }
      }

      function newGame() {
        puz = makePuzzle();
        marks = new Set();
        sel = null;
        statusEl.textContent = "Click cells to mark them. Use face clues to find the hidden filled cells.";
        statusEl.className = "status info";
        root.querySelector("#p3-target").textContent = puz.target;
        root.querySelector("#p3-marked").textContent = 0;
        renderFaces();
        renderCube();
      }

      root.querySelector("#p3-check").addEventListener("click", check);
      root.querySelector("#p3-clear").addEventListener("click", () => {
        marks.clear();
        AudioFX.click();
        renderCube();
        root.querySelector("#p3-marked").textContent = 0;
      });

      function doSolve() {
        marks = new Set(puz.filled);
        AudioFX.reveal();
        renderCube();
        root.querySelector("#p3-marked").textContent = marks.size;
        statusEl.textContent = "Solution revealed";
        statusEl.className = "status lose";
      }

      live = {solve: doSolve};
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
      App.showModal("How to play Picross 3D",
        `A 3×3×3 cube (27 cells) has some hidden "filled" cells. Each <b>face clue grid</b> shows how many filled cells exist along that line of sight.
        <br><br>• <b>Top</b> face clue at (x, z) = number of filled cells in column [x, any y, z].
        <br>• <b>Front</b> clue at (x, y) = filled cells in line [x, y, any z].
        <br>• <b>Right</b> clue at (y, z) = filled cells in line [any x, y, z].
        <br><br>The cube is drawn as 3 horizontal layers (top, middle, bottom), each a 3×3 grid. Click cells to mark them. Get all 27 right to win.`);
    },
  });
})();
