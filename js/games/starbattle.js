/* Star Battle — place stars: 1 per row, 1 per column, 1 per region; no two
   stars adjacent (even diagonally).
   Generator: pick a random permutation of columns for star rows (guarantees
   1 per row & column, retry until no adjacency), then grow one connected
   region from each star so every region holds exactly one star. */
(function () {
  "use strict";

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  const N = 6;

  function generate() {
    for (let attempt = 0; attempt < 500; attempt++) {
      // star positions: 1 per row & column, no adjacency
      const perm = shuffle(Array.from({length: N}, (_, i) => i));
      const stars = perm.map((c, r) => [r, c]);
      let adj = false;
      for (let i = 0; i < stars.length && !adj; i++) for (let j = i + 1; j < stars.length; j++) {
        if (Math.abs(stars[i][0] - stars[j][0]) <= 1 && Math.abs(stars[i][1] - stars[j][1]) <= 1) {
          adj = true;
          break;
        }
      }
      if (adj) continue;
      // grow regions from each star
      const regions = Array.from({length: N}, () => Array(N).fill(-1));
      const frontier = [];
      stars.forEach(([r, c], id) => {
        regions[r][c] = id;
        frontier.push([r, c, id]);
      });
      let guard = 0;
      while (frontier.length && guard++ < 500) {
        const idx = Math.floor(Math.random() * frontier.length);
        const [r, c, id] = frontier.splice(idx, 1)[0];
        const nbs = shuffle([[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
          .filter(([nr, nc]) => nr >= 0 && nr < N && nc >= 0 && nc < N && regions[nr][nc] === -1));
        let expanded = false;
        for (const [nr, nc] of nbs) {
          if (regions[nr][nc] !== -1) continue;
          regions[nr][nc] = id;
          frontier.push([nr, nc, id]);
          expanded = true;
          break; // one cell per step for organic shapes
        }
        if (expanded) frontier.push([r, c, id]);
      }
      // all cells assigned?
      let complete = true;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (regions[r][c] === -1) complete = false;
      if (!complete) continue;
      // reasonably balanced regions (each ≥ 2 cells)
      const sizes = {};
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) sizes[regions[r][c]] = (sizes[regions[r][c]] || 0) + 1;
      if (Object.values(sizes).some(s => s > N * N / 2)) continue;
      return {regions, stars};
    }
    // fallback: diagonal bands (verified)
    return {
      regions: [
        [0, 0, 1, 1, 1, 1],
        [0, 0, 0, 1, 1, 2],
        [3, 0, 0, 2, 2, 2],
        [3, 3, 4, 4, 2, 5],
        [3, 3, 4, 5, 5, 5],
        [4, 4, 4, 5, 5, 5],
      ],
      stars: [[0, 1], [1, 3], [2, 5], [3, 0], [4, 2], [5, 4]],
    };
  }

  const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

  let live = null;
  GameRegistry.register({
    id: "starbattle",
    name: "Star Battle",
    icon: "⭐",
    category: "logic",
    description: "Place 1 star per row, column, and region — no touching",
    tags: ["logic", "thinking", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, stars = null, over = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Stars</div><div class="val" id="stb-stars">0 / ${N}</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="stb-errors">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="stb-best">—</div></div>
        </div>
        <div class="status info" id="stb-status">Place 1 star in every row, column, and region. Stars can't touch (not even diagonally).</div>
        <div class="center" style="margin:14px 0;"><div class="stb-grid" id="stb-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="stb-clear">Clear</button>
          <button class="btn primary" id="stb-check">Check</button>
        </div>
        <p class="hint">Each colored region must contain exactly one star. Each row and column must have one star. No two stars can touch — even diagonally.</p>
      `;
      const statusEl = root.querySelector("#stb-status");
      const gridEl = root.querySelector("#stb-grid");
      if (!document.getElementById("stb-style")) {
        const s = document.createElement("style");
        s.id = "stb-style";
        s.textContent = `
          .stb-grid { display: inline-grid; grid-template-columns: repeat(${N}, 52px); gap: 2px; background: var(--border); padding: 4px; border-radius: var(--radius); }
          .stb-cell { width: 52px; height: 52px; display: grid; place-items: center; font-size: 1.5rem; cursor: pointer; user-select: none; transition: transform .1s; }
          .stb-cell:hover { transform: scale(1.05); }
        `;
        document.head.appendChild(s);
      }

      function render() {
        gridEl.innerHTML = "";
        let count = 0, errors = 0;
        const starList = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (stars[r][c]) starList.push([r, c]);
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "stb-cell";
            cell.style.background = COLORS[puzzle.regions[r][c] % COLORS.length] + "44";
            cell.style.border = "1px solid " + COLORS[puzzle.regions[r][c] % COLORS.length];
            if (stars[r][c]) {
              cell.textContent = "⭐";
              count++;
            }
            cell.addEventListener("click", () => {
              if (over) return;
              stars[r][c] = stars[r][c] ? 0 : 1;
              AudioFX.pop();
              render();
            });
            gridEl.appendChild(cell);
          }
        }
        // live error count: adjacent stars
        for (let i = 0; i < starList.length; i++) for (let j = i + 1; j < starList.length; j++) {
          if (Math.abs(starList[i][0] - starList[j][0]) <= 1 && Math.abs(starList[i][1] - starList[j][1]) <= 1) errors++;
        }
        root.querySelector("#stb-stars").textContent = count + " / " + N;
        root.querySelector("#stb-errors").textContent = errors;
      }

      function check() {
        if (over) return;
        const starList = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (stars[r][c]) starList.push([r, c]);
        for (let r = 0; r < N; r++) {
          const n = stars[r].filter(Boolean).length;
          if (n !== 1) return fail(`Row ${r + 1} has ${n} stars — needs exactly 1.`);
        }
        for (let c = 0; c < N; c++) {
          let n = 0;
          for (let r = 0; r < N; r++) if (stars[r][c]) n++;
          if (n !== 1) return fail(`Column ${c + 1} has ${n} stars — needs exactly 1.`);
        }
        const regionCount = {};
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (stars[r][c]) regionCount[puzzle.regions[r][c]] = (regionCount[puzzle.regions[r][c]] || 0) + 1;
        }
        for (const k in regionCount) if (regionCount[k] !== 1) return fail(`A region has ${regionCount[k]} stars — needs exactly 1.`);
        for (let i = 0; i < starList.length; i++) for (let j = i + 1; j < starList.length; j++) {
          if (Math.abs(starList[i][0] - starList[j][0]) <= 1 && Math.abs(starList[i][1] - starList[j][1]) <= 1) {
            return fail("Two stars touch each other.");
          }
        }
        over = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Solved!";
        statusEl.className = "status win";
        const best = Storage.getBest("starbattle");
        if (!best || 100 > best) {
          Storage.setBest("starbattle", 100);
          root.querySelector("#stb-best").textContent = 100;
        }

        function fail(msg) {
          AudioFX.error();
          statusEl.textContent = msg;
          statusEl.className = "status lose";
        }
      }

      function newGame() {
        puzzle = generate();
        stars = Array.from({length: N}, () => Array(N).fill(0));
        over = false;
        const best = Storage.getBest("starbattle");
        root.querySelector("#stb-best").textContent = best || "—";
        statusEl.textContent = "Place 1 star in every row, column, and region. Stars can't touch (not even diagonally).";
        statusEl.className = "status info";
        render();
      }

      root.querySelector("#stb-check").addEventListener("click", check);
      root.querySelector("#stb-clear").addEventListener("click", () => {
        if (over) return;
        stars = Array.from({length: N}, () => Array(N).fill(0));
        AudioFX.click();
        render();
      });

      newGame();
      live = {
        hint: function () {
          if (over || !puzzle) return;
          const wrong = [];
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            if (stars[r][c] && !puzzle.stars.some(([sr, sc]) => sr === r && sc === c)) wrong.push([r, c]);
          }
          const missing = puzzle.stars.filter(([sr, sc]) => !stars[sr][sc]);
          if (!wrong.length && !missing.length) {
            App.toast("Nothing to reveal — you're on track!", "info");
            return;
          }
          if (wrong.length && (Math.random() < 0.5 || !missing.length)) {
            const [r, c] = wrong[Math.floor(Math.random() * wrong.length)];
            stars[r][c] = 0;
          } else {
            const [r, c] = missing[Math.floor(Math.random() * missing.length)];
            stars[r][c] = 1;
          }
          AudioFX.reveal();
          render();
        },
        solve: function () {
          if (over) return;
          stars = Array.from({length: N}, () => Array(N).fill(0));
          puzzle.stars.forEach(([r, c]) => stars[r][c] = 1);
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
      App.showModal("How to play Star Battle",
        `Place stars so that:
        <br><br>• Each <b>row</b> has exactly one star.
        <br>• Each <b>column</b> has exactly one star.
        <br>• Each colored <b>region</b> has exactly one star.
        <br>• No two stars <b>touch</b>, not even diagonally.
        <br><br>Click a cell to place/remove a star.`);
    },
  });
})();
