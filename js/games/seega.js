/* seega — Seega (auto-generated strategy, 5x5 get 4-in-a-row) */
(function () {
  "use strict";
  const N = 5, W = 4;
  const IS_MISERE = false;
  GameRegistry.register({
    id: "seega", name: "Seega", icon: "⬛", category: "strategy",
    description: "Ancient Egyptian 5x5 capture \u2014 4 in a row.", tags: ["strategy", "ancient"],
    age: ["teens", "adults"], difficulty: "medium", duration: "medium", players: "either",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, board = [], turn = "X", over = false, lock = false;

      function start() {
        board = Array.from({length: N}, () => Array(N).fill(""));
        turn = "X";
        over = false;
        lock = false;
        render();
      }

      function checkWin(r, c, p) {
        const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dr, dc] of dirs) {
          let count = 1;
          for (let k = 1; k < W; k++) {
            const nr = r + dr * k, nc = c + dc * k;
            if (nr < 0 || nr >= N || nc < 0 || nc >= N || board[nr][nc] !== p) break;
            count++;
          }
          for (let k = 1; k < W; k++) {
            const nr = r - dr * k, nc = c - dc * k;
            if (nr < 0 || nr >= N || nc < 0 || nc >= N || board[nr][nc] !== p) break;
            count++;
          }
          if (count >= W) return true;
        }
        return false;
      }

      function isFull() {
        return board.every(r => r.every(c => c));
      }

      function move(r, c) {
        if (over || lock || board[r][c]) return;
        board[r][c] = turn;
        AudioFX.place();
        if (checkWin(r, c, turn)) {
          over = true;
          const winner = IS_MISERE ? (turn === "X" ? "O" : "X") : turn;
          App.recordResult(winner === "X", 1);
          AudioFX.win();
          App.toast(winner + " wins!", "success");
          render();
          return;
        }
        if (isFull()) {
          over = true;
          App.toast("Draw!", "info");
          render();
          return;
        }
        turn = turn === "X" ? "O" : "X";
        render();
        if (turn === "O" && !over) {
          lock = true;
          setTimeout(() => {
            if (!alive) return;
            lock = false;
            aiMove();
          }, 350);
        }
      }

      function aiMove() {
        if (!alive || over) return;
        const empty = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!board[r][c]) empty.push([r, c]);
        if (!empty.length) return;
        const winNow = empty.find(([r, c]) => {
          board[r][c] = "O";
          const w = checkWin(r, c, "O");
          board[r][c] = "";
          return w;
        });
        if (winNow) {
          move(winNow[0], winNow[1]);
          return;
        }
        const blockNow = empty.find(([r, c]) => {
          board[r][c] = "X";
          const w = checkWin(r, c, "X");
          board[r][c] = "";
          return w;
        });
        if (blockNow) {
          move(blockNow[0], blockNow[1]);
          return;
        }
        const [r, c] = empty[Math.floor(Math.random() * empty.length)];
        move(r, c);
      }

      function render() {
        const stage = root.querySelector("#seega-stage");
        if (!stage) return;
        let cells = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          cells += '<button class="sb-cell" data-r="' + r + '" data-c="' + c + '">' + (board[r][c] || "") + '</button>';
        }
        stage.innerHTML = cells;
        stage.querySelectorAll(".sb-cell").forEach(b => b.addEventListener("click", () => move(+b.dataset.r, +b.dataset.c)));
        const info = root.querySelector("#seega-info");
        if (info) info.textContent = over ? "Game over" : "Turn: " + turn;
      }

      root.innerHTML = `
        <style>
          .sb-grid { display:grid; grid-template-columns: repeat(5, 56px); gap:4px; justify-content:center; padding:14px; }
          .sb-cell { width:56px; height:56px; font-size:1.4rem; font-weight:700;
            border:1px solid var(--border,#d1d5db); border-radius:8px; background:var(--bg-elev,#fff); color:var(--text,#111);
            display:flex; align-items:center; justify-content:center; cursor:pointer; }
          .sb-cell:hover { background:var(--bg-soft,#f1f5f9); }
        </style>
        <p style="text-align:center; padding:6px 4px; color:var(--text-muted,#64748b); font-size:0.85rem;">Get 4 in a row — you (X) vs AI (O)${IS_MISERE ? ". Misere: 3-in-a-row LOSES!" : ""}.</p>
        <div id="seega-info" style="text-align:center; padding:6px; color:var(--text-muted,#64748b);">Turn: X</div>
        <div id="seega-stage" class="sb-grid"></div>
        <div style="text-align:center; margin-top:14px;"><button class="btn primary" id="seega-new">New game</button></div>
      `;
      root.querySelector("#seega-new").addEventListener("click", start);
      start();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Seega", "Get 4 of your marks in a row on the 5x5 grid. You play X, the AI plays O." + (IS_MISERE ? " Misere rule: getting 4-in-a-row makes you LOSE!" : ""));
    },
  });
})();
