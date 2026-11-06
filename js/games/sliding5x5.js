/* sliding5x5 — Sliding 5x5 (auto-generated sliding, content=numbers) */
(function () {
  "use strict";
  const N = 5;
  const LABELS = Array.from({length: 24}, (_, i) => i + 1).concat(['']);
  GameRegistry.register({
    id: "sliding5x5", name: "Sliding 5x5", icon: "🧩", category: "logic",
    description: "5x5 sliding puzzle (1-24).", tags: ["logic", "sliding", "puzzle"],
    age: ["kids", "teens", "adults"], difficulty: "medium", duration: "medium", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, tiles = [];

      function start() {
        tiles = Array.from({length: N * N}, (_, i) => i);
        for (let i = 0; i < 200; i++) {
          const zi = tiles.indexOf(0);
          const r = Math.floor(zi / N), c = zi % N;
          const moves = [];
          if (r > 0) moves.push(zi - N);
          if (r < N - 1) moves.push(zi + N);
          if (c > 0) moves.push(zi - 1);
          if (c < N - 1) moves.push(zi + 1);
          const m = moves[Math.floor(Math.random() * moves.length)];
          [tiles[zi], tiles[m]] = [tiles[m], tiles[zi]];
        }
        render();
      }

      function click(i) {
        const zi = tiles.indexOf(0);
        const r1 = Math.floor(i / N), c1 = i % N, r2 = Math.floor(zi / N), c2 = zi % N;
        if (Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1) {
          [tiles[i], tiles[zi]] = [tiles[zi], tiles[i]];
          AudioFX.move();
          render();
          for (let j = 0; j < tiles.length - 1; j++) if (tiles[j] !== j) return;
          App.recordResult(true, 1);
          AudioFX.win();
          App.toast("Solved!", "success");
        }
      }

      function render() {
        const stage = root.querySelector("#sliding5x5-stage");
        if (!stage) return;
        let cells = "";
        for (let i = 0; i < tiles.length; i++) {
          const v = tiles[i];
          const label = v === 0 ? "" : LABELS[v - 1];
          cells += v === 0
            ? '<div class="sp-empty"></div>'
            : '<button class="sp-cell" data-i="' + i + '">' + label + '</button>';
        }
        stage.innerHTML = cells;
        stage.querySelectorAll(".sp-cell").forEach(b => b.addEventListener("click", () => click(+b.dataset.i)));
      }

      root.innerHTML = `
        <style>
          .sp-grid { display:grid; grid-template-columns: repeat(5, 64px); gap:6px; justify-content:center; padding:14px; }
          .sp-cell { width:64px; height:64px; font-size:1.4rem; font-weight:700;
            border:1px solid var(--border,#d1d5db); border-radius:8px; background:var(--accent,#6366f1); color:#fff;
            display:flex; align-items:center; justify-content:center; cursor:pointer; }
          .sp-cell:hover { background:var(--accent-2,#ec4899); }
          .sp-empty { width:64px; height:64px; background:transparent; }
        </style>
        <div style="text-align:center; padding:10px; color:var(--text-muted,#64748b);">Arrange in order. Click a tile next to the empty space.</div>
        <div id="sliding5x5-stage" class="sp-grid"></div>
        <div style="text-align:center; margin-top:14px;"><button class="btn primary" id="sliding5x5-new">New puzzle</button></div>
      `;
      root.querySelector("#sliding5x5-new").addEventListener("click", start);
      start();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Sliding 5x5", "Click a tile adjacent to the empty space to slide it. Arrange tiles in order.");
    },
  });
})();
