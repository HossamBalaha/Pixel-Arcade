/* lightsoutwrap — Lights Out Wrap (auto-generated lights out, pattern=plus_wrap) */
(function () {
  "use strict";
  const N = 5;
  const DIRS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const WRAP = true;
  GameRegistry.register({
    id: "lightsoutwrap", name: "Lights Out Wrap", icon: "💫", category: "logic",
    description: "5x5 with wrap-around edges.", tags: ["logic", "lightsout", "puzzle"],
    age: ["teens", "adults"], difficulty: "medium", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, grid = [];

      function start() {
        grid = Array.from({length: N}, () => Array(N).fill(false));
        for (let i = 0; i < N * 3; i++) {
          const r = Math.floor(Math.random() * N), c = Math.floor(Math.random() * N);
          toggle(r, c, true);
        }
        // Ensure not already solved
        if (grid.every(row => row.every(v => !v))) toggle(0, 0, true);
        render();
      }

      function toggle(r, c, silent) {
        DIRS.forEach(([dr, dc]) => {
          let nr = r + dr, nc = c + dc;
          if (WRAP) {
            nr = ((nr % N) + N) % N;
            nc = ((nc % N) + N) % N;
          } else if (nr < 0 || nr >= N || nc < 0 || nc >= N) return;
          grid[nr][nc] = !grid[nr][nc];
        });
        if (!silent) {
          AudioFX.click();
          render();
          if (grid.every(row => row.every(v => !v))) {
            App.recordResult(true, 1);
            AudioFX.win();
            App.toast("Lights out!", "success");
          }
        }
      }

      function render() {
        const stage = root.querySelector("#lightsoutwrap-stage");
        if (!stage) return;
        let cells = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          cells += '<button class="lo-cell ' + (grid[r][c] ? "on" : "off") + '" data-r="' + r + '" data-c="' + c + '"></button>';
        }
        stage.innerHTML = cells;
        stage.querySelectorAll(".lo-cell").forEach(b => {
          b.addEventListener("click", () => toggle(+b.dataset.r, +b.dataset.c, false));
        });
      }

      root.innerHTML = `
        <style>
          .lo-grid { display:grid; grid-template-columns: repeat(5, 56px); gap:6px; justify-content:center; padding:14px; }
          .lo-cell { width:56px; height:56px; border-radius:8px; cursor:pointer; border:1px solid var(--border,#d1d5db); transition: background 0.15s; }
          .lo-cell.on { background:#fbbf24; border-color:#f59e0b; box-shadow:0 0 8px #fbbf24; }
          .lo-cell.off { background:var(--bg-elev,#fff); }
        </style>
        <div style="text-align:center; padding:10px; color:var(--text-muted,#64748b);">Click a cell to toggle. Goal: all off. Edges wrap around.</div>
        <div id="lightsoutwrap-stage" class="lo-grid"></div>
        <div style="text-align:center; margin-top:14px;"><button class="btn primary" id="lightsoutwrap-new">New puzzle</button></div>
      `;
      root.querySelector("#lightsoutwrap-new").addEventListener("click", start);
      start();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Lights Out Wrap", "Click any cell to toggle it and its neighbors. Goal: turn ALL lights off. Edges wrap around (toroidal).");
    },
  });
})();
