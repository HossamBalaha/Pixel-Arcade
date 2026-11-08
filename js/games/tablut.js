/* tablut — Tablut "Viking chess" (real rules, 9×9).
   Defenders escort the king from the center throne to a corner;
   attackers win by surrounding the king. Rook moves, sandwich captures. */
(function () {
  "use strict";
  const N = 9, THRONE = [4, 4];
  const CORNERS = [[0, 0], [0, 8], [8, 0], [8, 8]];
  const isCorner = (r, c) => CORNERS.some(([a, b]) => a === r && b === c);
  const isThrone = (r, c) => r === 4 && c === 4;

  // board: 0 empty, 1 attacker, 2 defender, 3 king
  function initial() {
    const b = Array.from({length: N}, () => Array(N).fill(0));
    b[4][4] = 3;
    for (const [r, c] of [[3, 4], [5, 4], [4, 3], [4, 5], [2, 4], [6, 4], [4, 2], [4, 6]]) b[r][c] = 2;
    for (const [r, c] of [
      [3, 0], [4, 0], [5, 0], [4, 1],
      [3, 8], [4, 8], [5, 8], [4, 7],
      [0, 3], [0, 4], [0, 5], [1, 4],
      [8, 3], [8, 4], [8, 5], [7, 4],
    ]) b[r][c] = 1;
    return b;
  }

  GameRegistry.register({
    id: "tablut", name: "Tablut (Viking Chess)", icon: "🛡️", category: "strategy",
    description: "Escort the king to a corner — attackers surround him to win", tags: ["strategy", "historic", "board"],
    age: ["teens", "adults"], difficulty: "medium", duration: "medium", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, over = false, aiTimer = null, moveNo = 0;
      let board = initial();
      let turn = 2; // human = defenders (with king); ai = attackers
      let sel = null; // [r,c]
      let lastMove = null;

      const S = 40;
      const x = c => c * S + S / 2, y = r => r * S + S / 2;

      function pieces(p) {
        const out = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (p === "A" && board[r][c] === 1) out.push([r, c]);
          if (p === "D" && (board[r][c] === 2 || board[r][c] === 3)) out.push([r, c]);
        }
        return out;
      }

      function hostile(r, c, byAttack) { // square counts as enemy for capture rules
        if (board[r][c] === 0) return false;
        if (byAttack) {
          if (board[r][c] === 1) return true;
          return isThrone(r, c) || isCorner(r, c); // throne/corners help attackers
        }
        return board[r][c] === 2 || board[r][c] === 3;
      }

      function legalMoves(r, c) {
        const p = board[r][c];
        if (!p) return [];
        const out = [];
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          for (let k = 1; k < N; k++) {
            const nr = r + dr * k, nc = c + dc * k;
            if (nr < 0 || nr >= N || nc < 0 || nc >= N) break;
            if (board[nr][nc] !== 0) break;
            const kingOnly = (isThrone(nr, nc) || isCorner(nr, nc)) && p !== 3;
            if (!kingOnly) out.push([nr, nc]);
          }
        }
        return out;
      }

      function anyMoves(att) {
        const ps = att ? pieces("A") : pieces("D");
        return ps.some(([r, c]) => legalMoves(r, c).length);
      }

      function doCaptures(r, c, byAttack) {
        const captured = [];
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const mr = r + dr, mc = c + dc, orr = r + dr * 2, occ = c + dc * 2;
          if (orr < 0 || orr >= N || occ < 0 || occ >= N) continue;
          const mid = board[mr][mc];
          if (mid === 0) continue;
          const midAttack = mid === 1;
          if (midAttack === byAttack) continue; // own piece
          if (mid === 3) continue; // king handled separately
          if (hostile(orr, occ, byAttack)) {
            board[mr][mc] = 0;
            captured.push([mr, mc]);
          }
        }
        return captured;
      }

      function kingCaptured() {
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (board[r][c] !== 3) continue;
          const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          const inB = dirs.filter(([dr, dc]) => r + dr >= 0 && r + dr < N && c + dc >= 0 && c + dc < N);
          return inB.every(([dr, dc]) => board[r + dr][c + dc] === 1);
        }
        return true; // no king
      }

      function kingEscaped() {
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++)
          if (board[r][c] === 3 && isCorner(r, c)) return true;
        return false;
      }

      function finish(win) {
        over = true;
        const st = root.querySelector("#tb-status");
        if (win) {
          st.textContent = "🎉 The king escaped — you win!";
          st.className = "status win";
          AudioFX.win();
          App.recordResult(true, moveNo);
        } else {
          st.textContent = "The king was captured — attackers win.";
          st.className = "status lose";
          AudioFX.lose();
          App.recordResult(false, moveNo);
        }
      }

      function checkEnd() {
        if (kingEscaped()) {
          finish(true);
          return true;
        }
        if (kingCaptured()) {
          finish(false);
          return true;
        }
        if (!anyMoves(turn === 1)) { // side to move is stuck
          finish(turn === 1); // stuck attackers → defender wins; stuck defenders → attackers win
          return true;
        }
        return false;
      }

      function applyMove(fr, fc, tr, tc) {
        board[tr][tc] = board[fr][fc];
        board[fr][fc] = 0;
        lastMove = [[fr, fc], [tr, tc]];
        moveNo++;
        const byAttack = board[tr][tc] === 1;
        doCaptures(tr, tc, byAttack);
        AudioFX.pop();
      }

      function click(r, c) {
        if (over || turn !== 2) return;
        const p = board[r][c];
        if (sel) {
          const [sr, sc] = sel;
          if (r === sr && c === sc) {
            sel = null;
            render();
            return;
          }
          if (p === 2 || p === 3) {
            sel = [r, c];
            AudioFX.click();
            render();
            return;
          }
          if (legalMoves(sr, sc).some(([a, b]) => a === r && b === c)) {
            applyMove(sr, sc, r, c);
            sel = null;
            if (!checkEnd()) endTurn();
            render();
            return;
          }
          App.toast("Illegal move", "warning");
          return;
        }
        if (p === 2 || p === 3) {
          sel = [r, c];
          AudioFX.click();
          render();
        }
      }

      function endTurn() {
        turn = turn === 1 ? 2 : 1;
        setStatus(turn === 2 ? "Your move — escort the king to a corner." : "Attackers are thinking…");
        if (turn === 1 && !over) aiTimer = setTimeout(() => {
          if (alive && !over) aiMove();
        }, 420);
        render();
      }

      function setStatus(t) {
        const st = root.querySelector("#tb-status");
        if (st) {
          st.textContent = t;
          st.className = "status info";
        }
      }

      // ---- attacker AI: greedy captures / king hunt / avoid leaving captures open ----
      function aiMove() {
        let best = null, bestScore = -1e9;
        const save = board.map(row => row.slice());
        for (const [r, c] of pieces("A")) {
          for (const [tr, tc] of legalMoves(r, c)) {
            applyMoveQuiet(r, c, tr, tc);
            const after = countPieces();
            let sc = Math.random() * 0.2;
            sc += (9 - after.d) * 8; // defenders captured by this move
            const kp = findKing();
            if (kp) sc -= 0.6 * (Math.abs(kp[0] - tr) + Math.abs(kp[1] - tc)); // prefer staying near the king
            // danger: can defenders capture an attacker right after?
            let danger = 0;
            for (const [dr, dc] of pieces("D")) {
              for (const [ar, ac] of legalMoves(dr, dc)) {
                const s2 = board.map(row => row.slice());
                applyMoveQuiet(dr, dc, ar, ac);
                if (countPieces().a < after.a) danger = 1;
                board = s2;
                if (danger) break;
              }
              if (danger) break;
            }
            sc -= danger * 5;
            board = save.map(row => row.slice());
            if (sc > bestScore) {
              bestScore = sc;
              best = [r, c, tr, tc];
            }
          }
        }
        board = save.map(row => row.slice());
        if (!best) {
          finish(true);
          return;
        }
        applyMove(best[0], best[1], best[2], best[3]);
        if (!checkEnd()) endTurn();
        render();
      }

      function applyMoveQuiet(fr, fc, tr, tc) {
        board[tr][tc] = board[fr][fc];
        board[fr][fc] = 0;
        doCaptures(tr, tc, board[tr][tc] === 1);
      }

      function countPieces() {
        let d = 0, a = 0;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (board[r][c] === 1) a++;
          if (board[r][c] === 2 || board[r][c] === 3) d++;
        }
        return {d, a};
      }

      function findKing() {
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (board[r][c] === 3) return [r, c];
        return null;
      }

      // ---- render ----
      root.innerHTML = `
        <style>
          .tb-svg { display: block; margin: 0 auto; background: var(--bg-elev); border-radius: 12px; }
          .tb-cell { fill: var(--bg); }
          .tb-cell.tgt { fill: #14532d; cursor: pointer; }
          .tb-cell.throne { fill: #7c2d12; }
          .tb-cell.corner { fill: #1e3a5f; }
          .tb-pc { cursor: pointer; }
          .tb-last { fill: #a16207aa; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Move</div><div class="val" id="tb-mv">1</div></div>
          <div class="score-cell"><div class="label">Attackers</div><div class="val" id="tb-a">16</div></div>
          <div class="score-cell"><div class="label">Defenders</div><div class="val" id="tb-d">9</div></div>
        </div>
        <div class="status info" id="tb-status">Your move — escort the king (gold) to a corner.</div>
        <svg class="tb-svg" id="tb-svg" viewBox="0 0 ${N * S} ${N * S}" width="360" height="360"></svg>
      `;
      const svg = root.querySelector("#tb-svg");

      function render() {
        if (!svg) return;
        const marks = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          let cls = "tb-cell";
          if (isThrone(r, c)) cls += " throne";
          else if (isCorner(r, c)) cls += " corner";
          if (sel && legalMoves(sel[0], sel[1]).some(([a, b]) => a === r && b === c)) cls += " tgt";
          if (lastMove && lastMove[1][0] === r && lastMove[1][1] === c) cls += " tb-last";
          marks.push(`<rect class="${cls}" data-r="${r}" data-c="${c}" x="${c * S}" y="${r * S}" width="${S}" height="${S}" stroke="var(--border)" stroke-width="1"/>`);
        }
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const p = board[r][c];
          if (!p) continue;
          if (p === 1) marks.push(`<circle class="tb-pc" data-r="${r}" data-c="${c}" cx="${x(c)}" cy="${y(r)}" r="15" fill="#dc2626" stroke="#fff" stroke-width="1.5"/>`);
          if (p === 2) marks.push(`<circle class="tb-pc" data-r="${r}" data-c="${c}" cx="${x(c)}" cy="${y(r)}" r="15" fill="#2563eb" stroke="#fff" stroke-width="1.5"/>`);
          if (p === 3) marks.push(`<circle class="tb-pc" data-r="${r}" data-c="${c}" cx="${x(c)}" cy="${y(r)}" r="17" fill="#f59e0b" stroke="#fff" stroke-width="2"/><text x="${x(c)}" y="${y(r) + 5}" text-anchor="middle" font-size="14" font-weight="800" fill="#1c1917">K</text>`);
        }
        svg.innerHTML = marks.join("");
        const cnt = countPieces();
        const mv = root.querySelector("#tb-mv"), a = root.querySelector("#tb-a"), d = root.querySelector("#tb-d");
        if (mv) mv.textContent = moveNo + 1;
        if (a) a.textContent = cnt.a;
        if (d) d.textContent = cnt.d;
      }

      svg.addEventListener("click", e => {
        const t = e.target.closest("[data-r]");
        if (t) click(+t.dataset.r, +t.dataset.c);
      });

      render();
      return function cleanup() {
        alive = false;
        clearTimeout(aiTimer);
      };
    },
    help: function () {
      App.showModal("How to play Tablut",
        "You play the <b>defenders</b> (blue) protecting the <b>king</b> (gold). Reach any corner square to win." +
        "<br>All pieces move any distance orthogonally (like a rook) and cannot jump." +
        "<br><b>Capture</b>: sandwich an enemy between two of your pieces — or between your piece and a corner/throne square." +
        "<br><b>Attackers</b> (red) win by surrounding the king on all four sides." +
        "<br>Only the king may rest on the throne and corner squares.");
    },
  });
})();
