/* Notakto — misère tic-tac-toe on THREE boards at once. Both players place only X.
   Completing 3-in-a-row kills that board; whoever completes the FINAL line loses.
   You play the AI: it avoids suicide, sets the one-empty-cell trap, and keeps
   two live boards balanced. */
(function () {
  "use strict";
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

  /* ----- pure game-logic helpers (state = {boards: [{cells: [9], dead}]}) ----- */
  function emptyCells(cells) {
    const out = [];
    for (let i = 0; i < 9; i++) if (!cells[i]) out.push(i);
    return out;
  }

  function completesLine(cells, i) {
    for (const L of LINES) {
      if (L.indexOf(i) === -1) continue;
      let full = true;
      for (const j of L) if (j !== i && !cells[j]) {
        full = false;
        break;
      }
      if (full) return true;
    }
    return false;
  }

  function hasLine(cells) {
    return LINES.some(L => L.every(i => cells[i]));
  }

  function cloneState(st) {
    return {boards: st.boards.map(b => ({cells: b.cells.slice(), dead: b.dead}))};
  }

  function applyMove(st, bi, ci) {
    const b = st.boards[bi];
    b.cells[ci] = "you"; // owner only matters for coloring; logic checks truthiness
    if (!b.dead && hasLine(b.cells)) b.dead = true;
  }

  function liveBoards(st) {
    return st.boards.filter(b => !b.dead);
  }

  function allDead(st) {
    return st.boards.every(b => b.dead);
  }

  function legalMoves(st) {
    const out = [];
    st.boards.forEach((b, bi) => {
      if (!b.dead) emptyCells(b.cells).forEach(ci => out.push([bi, ci]));
    });
    return out;
  }

  // The player to move is trapped = forced to complete the last remaining line
  function trapped(st) {
    const live = liveBoards(st);
    if (live.length !== 1) return false;
    const empt = emptyCells(live[0].cells);
    return empt.length > 0 && empt.every(ci => completesLine(live[0].cells, ci));
  }

  /* ----- AI: heuristic + shallow trap search ----- */
  function aiChoose(st) {
    const moves = legalMoves(st);
    if (!moves.length) return null;
    let bestScore = -Infinity, bestMoves = [];
    for (const mv of moves) {
      const s1 = cloneState(st);
      applyMove(s1, mv[0], mv[1]);
      let score;
      if (allDead(s1)) {
        score = -10000; // AI would complete the last line -> AI loses
      } else if (trapped(s1)) {
        score = 10000;  // human is forced to complete the last line -> AI wins
      } else {
        score = 0;
        // can the human trap us with their reply?
        let humanTraps = false;
        for (const hmv of legalMoves(s1)) {
          const s2 = cloneState(s1);
          applyMove(s2, hmv[0], hmv[1]);
          if (allDead(s2)) continue; // human wouldn't suicide
          if (trapped(s2)) {
            humanTraps = true;
            break;
          }
        }
        if (humanTraps) score -= 5000;
        // avoid creating a live board with exactly one empty cell
        if (liveBoards(s1).some(b => emptyCells(b.cells).length === 1)) score -= 100;
        // with two live boards left, keep them balanced (equal empty counts)
        const live = liveBoards(s1);
        if (live.length === 2) {
          score += 20 - Math.abs(emptyCells(live[0].cells).length - emptyCells(live[1].cells).length) * 3;
        }
        // keep your own options open
        score += legalMoves(s1).length * 0.1;
        score += Math.random() * 2;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [mv];
      } else if (score === bestScore) bestMoves.push(mv);
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  GameRegistry.register({
    id: "tttnotakto",
    name: "Notakto",
    icon: "🙅",
    category: "strategy",
    description: "3 boards, both players place X — complete a line to kill a board, complete the LAST line and you lose",
    tags: ["strategy", "ttt", "notakto", "misere", "ai"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "either",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true, aiTimer = null;
      let st, turn, over, lock, humanMoves, lastKiller;
      let wins = Storage.getBest("tttnotakto") || 0;

      root.innerHTML = `
        <style>
          .nk-row { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; margin: 14px 0; }
          .nk-board { position: relative; display: grid; grid-template-columns: repeat(3, 52px);
            grid-template-rows: repeat(3, 52px); gap: 4px; padding: 8px;
            background: var(--bg-elev, #fff); border: 1px solid var(--border, #d1d5db);
            border-radius: var(--radius, 10px); }
          .nk-board.dead { opacity: 0.45; filter: grayscale(0.9); }
          .nk-board.dead::after { content: "DEAD"; position: absolute; inset: 0; display: flex;
            align-items: center; justify-content: center; letter-spacing: 0.25em;
            font: 700 1.2rem var(--font-mono, monospace); color: var(--danger, #dc2626);
            background: rgba(2, 6, 23, 0.22); border-radius: inherit; }
          .nk-cell { width: 52px; height: 52px; padding: 0; font: 700 1.7rem var(--font-mono, monospace);
            border: 1px solid var(--border, #d1d5db); border-radius: 8px;
            background: var(--bg-soft, #f1f5f9); color: var(--text, #111);
            cursor: pointer; display: flex; align-items: center; justify-content: center; }
          .nk-cell:hover:not(:disabled) { background: var(--accent-soft, #e0e7ff); }
          .nk-cell:disabled { cursor: default; }
          .nk-cell.you { color: var(--accent, #6366f1); }
          .nk-cell.cpu { color: var(--accent-2, #ec4899); }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Live boards</div><div class="val" id="nk-live">3</div></div>
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="nk-turn">You</div></div>
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="nk-wins">${wins}</div></div>
        </div>
        <div class="status info" id="nk-status">Both players place X. 3-in-a-row kills a board — don't kill the last one!</div>
        <div class="nk-row" id="nk-boards"></div>
        <div class="row" style="justify-content:center;">
          <button class="btn primary" id="nk-new" type="button">New game</button>
        </div>
        <p class="hint">Click any empty cell of a live board. You are <b style="color:var(--accent)">blue X</b>, the AI is <b style="color:var(--accent-2)">pink X</b>. <b>R</b> = new game.</p>
      `;
      const boardsEl = root.querySelector("#nk-boards");
      const statusEl = root.querySelector("#nk-status");
      const liveEl = root.querySelector("#nk-live");
      const turnEl = root.querySelector("#nk-turn");
      const winsEl = root.querySelector("#nk-wins");

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function render() {
        boardsEl.innerHTML = "";
        st.boards.forEach((b, bi) => {
          const el = document.createElement("div");
          el.className = "nk-board" + (b.dead ? " dead" : "");
          b.cells.forEach((v, ci) => {
            const cell = document.createElement("button");
            cell.type = "button";
            cell.textContent = v ? "✕" : "";
            cell.className = "nk-cell" + (v ? " " + v : "");
            cell.disabled = !!v || b.dead || over || turn !== "you" || lock;
            cell.setAttribute("aria-label", "board " + (bi + 1) + " cell " + (ci + 1) + (v ? " taken" : " empty"));
            cell.addEventListener("click", () => humanMove(bi, ci));
            el.appendChild(cell);
          });
          boardsEl.appendChild(el);
        });
        liveEl.textContent = liveBoards(st).length;
        turnEl.textContent = over ? "—" : (turn === "you" ? "You" : "AI");
      }

      function end(youWon) {
        over = true;
        render();
        if (youWon) {
          wins++;
          Storage.setBest("tttnotakto", wins);
          winsEl.textContent = wins;
          setStatus("The AI completed the last line — you win!", "win");
          AudioFX.win();
          App.recordResult(true, humanMoves);
        } else {
          setStatus("You completed the last line — you lose!", "lose");
          AudioFX.lose();
          App.recordResult(false, humanMoves);
        }
      }

      function afterMove(who) {
        // called right after a placement; returns true if the game just ended
        if (allDead(st)) {
          end(who === "cpu"); // whoever completed the final line loses
          return true;
        }
        return false;
      }

      function humanMove(bi, ci) {
        if (over || lock || turn !== "you") return;
        const b = st.boards[bi];
        if (b.dead || b.cells[ci]) {
          AudioFX.error();
          return;
        }
        b.cells[ci] = "you";
        humanMoves++;
        const killed = !b.dead && hasLine(b.cells);
        if (killed) b.dead = true;
        AudioFX.place();
        if (killed) AudioFX.flip();
        if (afterMove("you")) return;
        turn = "cpu";
        lock = true;
        setStatus(killed ? "You killed a board — AI is thinking…" : "AI is thinking…");
        render();
        aiTimer = setTimeout(() => {
          if (!alive || over) return;
          lock = false;
          aiTurn();
        }, 480);
      }

      function aiTurn() {
        if (!alive || over) return;
        const mv = aiChoose(st);
        if (!mv) {
          end(true);
          return;
        } // no legal move should not happen, but be safe
        const b = st.boards[mv[0]];
        b.cells[mv[1]] = "cpu";
        const killed = !b.dead && hasLine(b.cells);
        if (killed) b.dead = true;
        AudioFX.move();
        if (killed) AudioFX.flip();
        if (afterMove("cpu")) return;
        turn = "you";
        setStatus(killed ? "AI killed a board — your turn!" : "Your turn — place an X");
        render();
      }

      function newGame() {
        st = {boards: [0, 1, 2].map(() => ({cells: Array(9).fill(""), dead: false}))};
        turn = "you";
        over = false;
        lock = false;
        humanMoves = 0;
        if (aiTimer) {
          clearTimeout(aiTimer);
          aiTimer = null;
        }
        setStatus("Both players place X. 3-in-a-row kills a board — don't kill the last one!");
        render();
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") newGame();
      }

      document.addEventListener("keydown", onKey);
      root.querySelector("#nk-new").addEventListener("click", newGame);

      newGame();
      return function cleanup() {
        alive = false;
        if (aiTimer) clearTimeout(aiTimer);
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Notakto",
        `Notakto is misère tic-tac-toe on <b>three boards at once</b> — and both players place only <b>X</b> marks.
        <br><br>• On your turn, place one X on <b>any empty cell of any board that is still live</b>.
        <br>• Completing 3-in-a-row (yours or the AI's — all marks are X) <b>kills that board</b>: it grays out and can no longer be played.
        <br>• The player who completes the <b>last line on the last live board loses</b> — if it's your turn and every board is dead, you've lost.
        <br><br><b>Strategy tip:</b> try to leave your opponent facing a single live board with only one empty cell — they'll be forced to finish it off.
        <br><br>Click cells to play. <b>R</b> or "New game" restarts.`);
    },
  });
})();
