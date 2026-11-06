/* match3jewel — Jewel Match 3 (auto-generated match-3) */
(function () {
  "use strict";
  const N = 8;
  const TILES = ["\ud83d\udc8e", "\ud83d\udc8d", "\ud83d\udc51", "\u269c\ufe0f", "\ud83c\udfc6", "\ud83c\udf96\ufe0f"];
  GameRegistry.register({
    id: "match3jewel", name: "Jewel Match 3", icon: "💍", category: "arcade",
    description: "Match jewels in this classic puzzle.", tags: ["arcade", "match3"],
    age: ["kids", "teens", "adults"], difficulty: "easy", duration: "medium", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, grid = [], selected = null, score = 0;

      function start() {
        grid = Array.from({length: N}, () => Array.from({length: N}, () => TILES[Math.floor(Math.random() * TILES.length)]));
        for (let i = 0; i < 50 && clearMatches(true); i++) clearMatches(false);
        selected = null;
        score = 0;
        render();
      }

      function clearMatches(dry) {
        let cleared = false;
        const m = Array.from({length: N}, () => Array(N).fill(false));
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (c + 2 < N && grid[r][c] === grid[r][c + 1] && grid[r][c + 1] === grid[r][c + 2]) {
            m[r][c] = m[r][c + 1] = m[r][c + 2] = true;
            cleared = true;
          }
          if (r + 2 < N && grid[r][c] === grid[r + 1][c] && grid[r + 1][c] === grid[r + 2][c]) {
            m[r][c] = m[r + 1][c] = m[r + 2][c] = true;
            cleared = true;
          }
        }
        if (dry) return cleared;
        if (cleared) {
          let cnt = 0;
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (m[r][c]) {
            grid[r][c] = null;
            cnt++;
          }
          score += cnt * 10;
          AudioFX.pop();
          for (let c = 0; c < N; c++) {
            const col = [];
            for (let r = N - 1; r >= 0; r--) if (grid[r][c]) col.push(grid[r][c]);
            while (col.length < N) col.unshift(TILES[Math.floor(Math.random() * TILES.length)]);
            for (let r = 0; r < N; r++) grid[r][c] = col[N - 1 - r];
          }
        }
        return cleared;
      }

      function click(r, c) {
        if (!selected) {
          selected = [r, c];
          render();
          return;
        }
        const [sr, sc] = selected;
        if (Math.abs(sr - r) + Math.abs(sc - c) === 1) {
          [grid[sr][sc], grid[r][c]] = [grid[r][c], grid[sr][sc]];
          if (clearMatches(false)) {
            while (clearMatches(false)) {
            }
            App.recordResult(true, score);
          } else {
            [grid[sr][sc], grid[r][c]] = [grid[r][c], grid[sr][sc]];
            AudioFX.lose();
          }
        }
        selected = null;
        render();
      }

      function render() {
        const stage = root.querySelector("#match3jewel-stage");
        if (!stage) return;
        let cells = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const isSel = selected && selected[0] === r && selected[1] === c;
          cells += '<button class="m3-cell' + (isSel ? ' sel' : '') + '" data-r="' + r + '" data-c="' + c + '">' + grid[r][c] + '</button>';
        }
        stage.innerHTML = cells;
        stage.querySelectorAll(".m3-cell").forEach(b => b.addEventListener("click", () => click(+b.dataset.r, +b.dataset.c)));
        const sEl = root.querySelector("#match3jewel-score");
        if (sEl) sEl.textContent = score;
      }

      root.innerHTML = `
        <style>
          .m3-grid { display:grid; grid-template-columns: repeat(8, 44px); gap:4px; justify-content:center; padding:14px; }
          .m3-cell { width:44px; height:44px; font-size:1.4rem; border:none; background:var(--bg-elev,#fff); border-radius:6px; cursor:pointer; border:1px solid var(--border,#d1d5db); }
          .m3-cell:hover { background:var(--bg-soft,#f1f5f9); }
          .m3-cell.sel { outline:3px solid var(--accent,#6366f1); }
        </style>
        <div style="text-align:center; padding:6px 4px; color:var(--text-muted,#64748b);">Score: <span id="match3jewel-score">0</span></div>
        <div id="match3jewel-stage" class="m3-grid"></div>
        <div style="text-align:center; margin-top:14px;"><button class="btn primary" id="match3jewel-new">New game</button></div>
      `;
      root.querySelector("#match3jewel-new").addEventListener("click", start);
      start();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Jewel Match 3", "Click a tile, then an adjacent tile to swap. If the swap forms 3+ matching in a row/column, they clear. Score 10 per tile.");
    },
  });
})();
