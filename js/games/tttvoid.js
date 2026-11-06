/* tttvoid — Void TTT (auto-generated TTT variant: void) */
(function () {
  "use strict";
  const N = 3, W = 3;
  const VARIANT = "void";
  const IS_TORUS = false;
  const IS_MISERE = false;
  const IS_GRAVITY = false;
  const IS_VOID = true;
  const VOID_CELL = IS_VOID ? {r: Math.floor(N / 2), c: Math.floor(N / 2)} : null;
  GameRegistry.register({
    id: "tttvoid", name: "Void TTT", icon: "🔳", category: "strategy",
    description: "3x3 with one blocked cell.", tags: ["strategy", "ttt", "void"],
    age: ["kids", "teens", "adults"], difficulty: "medium", duration: "quick", players: "either",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, board = [], turn = "X", over = false, lock = false;

      function start() {
        board = Array.from({length: N}, () => Array(N).fill(""));
        if (IS_VOID && VOID_CELL) board[VOID_CELL.r][VOID_CELL.c] = "#";
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
            let nr = r + dr * k, nc = c + dc * k;
            if (IS_TORUS) {
              nr = ((nr % N) + N) % N;
              nc = ((nc % N) + N) % N;
            } else if (nr < 0 || nr >= N || nc < 0 || nc >= N) break;
            if (board[nr][nc] !== p) break;
            count++;
          }
          for (let k = 1; k < W; k++) {
            let nr = r - dr * k, nc = c - dc * k;
            if (IS_TORUS) {
              nr = ((nr % N) + N) % N;
              nc = ((nc % N) + N) % N;
            } else if (nr < 0 || nr >= N || nc < 0 || nc >= N) break;
            if (board[nr][nc] !== p) break;
            count++;
          }
          if (count >= W) return true;
        }
        return false;
      }

      function isFull() {
        return board.every(row => row.every(c => c === "X" || c === "O" || c === "#"));
      }

      function move(r, c) {
        if (over || lock || board[r][c]) return;
        if (IS_VOID && VOID_CELL && VOID_CELL.r === r && VOID_CELL.c === c) return;
        if (IS_GRAVITY) {
          // Gravity: piece falls to lowest empty row in column c
          for (let rr = N - 1; rr >= 0; rr--) {
            if (!board[rr][c] && !(IS_VOID && VOID_CELL && VOID_CELL.r === rr && VOID_CELL.c === c)) {
              r = rr;
              break;
            }
            if (rr === 0) return;
          }
        }
        board[r][c] = turn;
        AudioFX.place();
        if (checkWin(r, c, turn)) {
          over = true;
          // In misère, getting W-in-a-row means you LOSE
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
        const stage = root.querySelector("#tttvoid-stage");
        if (!stage) return;
        let cells = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const v = board[r][c];
          const isVoid = v === "#";
          cells += '<button class="ttt5-cell' + (isVoid ? ' void' : '') + '" data-r="' + r + '" data-c="' + c + '" ' + (isVoid ? 'disabled' : '') + '>' + (isVoid ? '✕' : (v || "")) + '</button>';
        }
        stage.innerHTML = cells;
        stage.querySelectorAll(".ttt5-cell:not(:disabled)").forEach(b => b.addEventListener("click", () => move(+b.dataset.r, +b.dataset.c)));
        const info = root.querySelector("#tttvoid-info");
        if (info) info.textContent = over ? "Game over" : "Turn: " + turn;
      }

      root.innerHTML = `
        <style>
          .ttt5-grid { display:grid; grid-template-columns: repeat(3, 60px); gap:4px; justify-content:center; padding:14px; }
          .ttt5-cell { width:60px; height:60px; font-size:1.6rem; font-weight:700;
            border:1px solid var(--border,#d1d5db); border-radius:8px; background:var(--bg-elev,#fff); color:var(--text,#111);
            display:flex; align-items:center; justify-content:center; cursor:pointer; }
          .ttt5-cell:hover:not(:disabled) { background:var(--bg-soft,#f1f5f9); }
          .ttt5-cell.void { background:var(--bg-soft,#f1f5f9); cursor:default; color:var(--text-muted,#64748b); }
        </style>
        <div id="tttvoid-info" style="text-align:center; padding:8px; color:var(--text-muted,#64748b);">Turn: X</div>
        <div id="tttvoid-stage" class="ttt5-grid"></div>
        <div style="text-align:center; margin-top:14px;"><button class="btn primary" id="tttvoid-new">New game</button></div>
      `;
      root.querySelector("#tttvoid-new").addEventListener("click", start);
      start();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Void TTT",
        "Get 3 in a row on the 3x3 grid. You play X, AI plays O." +
        (IS_TORUS ? " Edges wrap around (toroidal board)." : "") +
        (IS_MISERE ? " Misère rule: getting 3-in-a-row makes you LOSE!" : "") +
        (IS_GRAVITY ? " Gravity: pieces fall to the bottom of their column." : "") +
        (IS_VOID ? " One cell is blocked (✕) and cannot be used." : ""));
    },
  });
})();
