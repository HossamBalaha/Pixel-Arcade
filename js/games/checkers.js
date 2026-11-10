/* Checkers — 8x8 red vs black, vs greedy AI. Forced jumps optional. */
(function () {
  const N = 8;
  const EMPTY = 0, R = 1, B = 2, RK = 3, BK = 4; // R/red=player, B/black=AI
  let live = null;

  function isPlayer(p) {
    return p === R || p === RK;
  }

  function isAI(p) {
    return p === B || p === BK;
  }

  function isKing(p) {
    return p === RK || p === BK;
  }

  function enemy(p) {
    return isPlayer(p) ? B : R;
  }

  function forward(p) {
    return isPlayer(p) ? -1 : 1;
  }

  function inBounds(r, c) {
    return r >= 0 && r < N && c >= 0 && c < N;
  }

  function dark(r, c) {
    return (r + c) % 2 === 1;
  }

  function startBoard() {
    const b = Array.from({length: N}, () => Array(N).fill(EMPTY));
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (!dark(r, c)) continue;
      if (r < 3) b[r][c] = B;
      else if (r > 4) b[r][c] = R;
    }
    return b;
  }

  // returns list of moves [{from:[r,c], to:[r,c], jumps:[[r,c]], captured:[[r,c]]}]
  function movesFor(b, p) {
    const fwd = forward(p);
    const out = [];
    const dirs = isKing(p) ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : [[fwd, -1], [fwd, 1]];
    // jumps first
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (b[r][c] !== p) continue;
      for (const [dr, dc] of dirs) {
        const mr = r + dr, mc = c + dc, jr = r + 2 * dr, jc = c + 2 * dc;
        if (!inBounds(jr, jc)) continue;
        const mid = b[mr][mc];
        if (mid && enemy(p) === (isPlayer(mid) ? R : B) && (isPlayer(mid) || isAI(mid)) && isPlayer(mid) !== isPlayer(p) && b[jr][jc] === EMPTY) {
          // verify mid is enemy
          if ((isPlayer(p) && isAI(mid)) || (isAI(p) && isPlayer(mid))) {
            out.push({
              from: [r, c],
              to: [jr, jc],
              captured: [mr, mc],
              promote: (isPlayer(p) && jr === 0) || (isAI(p) && jr === N - 1)
            });
          }
        }
      }
    }
    if (out.length) return out;
    // simple moves
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (b[r][c] !== p) continue;
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        if (b[nr][nc] === EMPTY) out.push({
          from: [r, c],
          to: [nr, nc],
          captured: null,
          promote: (isPlayer(p) && nr === 0) || (isAI(p) && nr === N - 1)
        });
      }
    }
    return out;
  }

  function allMoves(b, side) {
    const pieces = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const p = b[r][c];
      if (!p) continue;
      if (side === "P" && isPlayer(p)) pieces.push(p);
      if (side === "A" && isAI(p)) pieces.push(p);
    }
    let all = [];
    for (const p of pieces) all = all.concat(movesFor(b, p));
    // forced jumps
    if (all.some(m => m.captured)) all = all.filter(m => m.captured);
    return all;
  }

  function applyMove(b, m) {
    const p = b[m.from[0]][m.from[1]];
    b[m.from[0]][m.from[1]] = EMPTY;
    if (m.captured) b[m.captured[0]][m.captured[1]] = EMPTY;
    let final = p;
    if (m.promote && !isKing(p)) final = isPlayer(p) ? RK : BK;
    b[m.to[0]][m.to[1]] = final;
    return b;
  }

  function clone(b) {
    return b.map(r => r.slice());
  }

  function aiMove(b) {
    const moves = allMoves(b, "A");
    if (!moves.length) return null;
    // greedy: prefer jump that captures most, else move that advances toward player side
    let best = null, bestScore = -Infinity;
    for (const m of moves) {
      let s = 0;
      if (m.captured) s += 10;
      // advance
      s += (m.to[0] - m.from[0]); // black wants to increase row
      // center
      s += (4 - Math.abs(m.to[1] - 3.5));
      // king prefer
      if (m.promote) s += 5;
      // small random
      s += Math.random();
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    }
    return best;
  }

  GameRegistry.register({
    id: "checkers",
    name: "Checkers",
    icon: "⚫",
    category: "strategy",
    description: "Classic 8×8 checkers vs a greedy AI",
    tags: ["strategy", "classic", "ai"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let b, turn, over, sel = null, hl = null, scores = {P: 0, A: 0};
      const pendingTimers = [];

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (alive) fn();
        }, ms);
        pendingTimers.push(id);
        return id;
      }

      root.innerHTML = `
        <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div class="difficulty" id="ck-mode">
            <button class="diff-btn active" data-m="ai">vs AI</button>
            <button class="diff-btn" data-m="2p">2P</button>
          </div>
          <button class="diff-btn" id="ck-pass" title="Show a privacy screen between turns when playing 2P">🙈 Pass: ON</button>
        </div>
        <div class="status info" id="ck-status">Your turn (Red)</div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label" id="ck-p-label">Red (You)</div><div class="val" id="ck-p">0</div></div>
          <div class="score-cell"><div class="label" id="ck-a-label">Black (AI)</div><div class="val" id="ck-a">0</div></div>
        </div>
        <div class="center"><div id="ck-board" style="display:grid;grid-template-columns:repeat(8,40px);grid-template-rows:repeat(8,40px);gap:2px;background:var(--border);padding:2px;border-radius:var(--radius-sm);"></div></div>
        <p class="hint">Click a red piece, then a destination. Jumps are forced. Kings move both ways.</p>
      `;
      const boardEl = root.querySelector("#ck-board");
      const statusEl = root.querySelector("#ck-status");
      // 2P hot-seat mode + pass-screen pref.
      let mode = "ai";
      let passOn = Storage.getPassPlay("checkers", true);
      const passBtn = root.querySelector("#ck-pass");
      const syncPassBtn = () => {
        passBtn.textContent = "🙈 Pass: " + (passOn ? "ON" : "OFF");
        passBtn.classList.toggle("active", passOn);
      };
      syncPassBtn();
      passBtn.addEventListener("click", () => {
        passOn = !passOn;
        Storage.setPassPlay("checkers", passOn);
        syncPassBtn();
        AudioFX.click();
      });
      root.querySelectorAll("#ck-mode .diff-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          root.querySelectorAll("#ck-mode .diff-btn").forEach(x => x.classList.remove("active"));
          btn.classList.add("active");
          mode = btn.dataset.m;
          AudioFX.click();
          root.querySelector("#ck-a-label").textContent = mode === "2p" ? "Black (P2)" : "Black (AI)";
          root.querySelector("#ck-p-label").textContent = mode === "2p" ? "Red (P1)" : "Red (You)";
          newGame();
        });
      });

      function newGame() {
        b = startBoard();
        turn = "P";
        over = false;
        sel = null;
        hl = null;
        setStatus("Your turn (Red)");
        render();
      }

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function render() {
        boardEl.innerHTML = "";
        const humanTurn = !over && (mode === "2p" || turn === "P");
        const moves = humanTurn ? allMoves(b, turn) : [];
        const selMoves = sel ? moves.filter(m => m.from[0] === sel[0] && m.from[1] === sel[1]) : [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.style.background = dark(r, c) ? "var(--bg-soft)" : "var(--bg-elev)";
          cell.style.display = "grid";
          cell.style.placeItems = "center";
          cell.style.cursor = dark(r, c) ? "pointer" : "default";
          const p = b[r][c];
          if (p) {
            const dot = document.createElement("div");
            const isP = isPlayer(p);
            dot.style.width = "28px";
            dot.style.height = "28px";
            dot.style.borderRadius = "50%";
            dot.style.background = isP ? "var(--danger)" : "var(--text)";
            dot.style.border = "2px solid " + (isKing(p) ? "var(--warning)" : "rgba(255,255,255,0.4)");
            dot.style.boxShadow = isKing(p) ? "0 0 6px var(--warning)" : "";
            cell.appendChild(dot);
          }
          if (sel && sel[0] === r && sel[1] === c) cell.style.outline = "3px solid var(--accent)";
          if (hl && hl.from[0] === r && hl.from[1] === c) cell.style.outline = "3px solid var(--warning)";
          if (hl && hl.to[0] === r && hl.to[1] === c) cell.style.outline = "3px solid var(--success)";
          if (selMoves.some(m => m.to[0] === r && m.to[1] === c)) {
            const dot = document.createElement("div");
            dot.style.width = "10px";
            dot.style.height = "10px";
            dot.style.borderRadius = "50%";
            dot.style.background = "var(--accent)";
            dot.style.opacity = "0.7";
            cell.appendChild(dot);
          }
          cell.addEventListener("click", () => onCell(r, c));
          boardEl.appendChild(cell);
        }
        root.querySelector("#ck-p").textContent = scores.P;
        root.querySelector("#ck-a").textContent = scores.A;
      }

      function onCell(r, c) {
        if (over) return;
        if (mode === "ai" && turn !== "P") return;
        const p = b[r][c];
        const ownPiece = p && (turn === "P" ? isPlayer(p) : isAI(p));
        if (ownPiece) {
          sel = [r, c];
          AudioFX.click();
          render();
          return;
        }
        if (!sel) return;
        const moves = allMoves(b, turn);
        const m = moves.find(mv => mv.from[0] === sel[0] && mv.from[1] === sel[1] && mv.to[0] === r && mv.to[1] === c);
        if (!m) {
          sel = null;
          render();
          return;
        }
        applyMove(b, m);
        AudioFX.place();
        sel = null;
        hl = null;
        if (checkEnd(turn)) return;
        turn = turn === "P" ? "A" : "P";
        if (mode === "ai") {
          setStatus("AI thinking…");
          render();
          later(aiTurn, 500);
        } else {
          const label = turn === "P" ? "Red (P1)" : "Black (P2)";
          setStatus(label + " — your move");
          render();
          if (passOn) App.passTurn(label);
        }
      }

      function aiTurn() {
        const m = aiMove(b);
        if (!m) {
          over = true;
          setStatus("🎉 You win! AI has no moves.", "win");
          AudioFX.win();
          return;
        }
        applyMove(b, m);
        AudioFX.move();
        if (checkEnd("A")) return;
        turn = "P";
        setStatus("Your turn (Red)");
        render();
      }

      function checkEnd(side) {
        const opp = side === "P" ? "A" : "P";
        const oppMoves = allMoves(b, opp);
        if (!oppMoves.length) {
          over = true;
          if (side === "P") {
            scores.P++;
            setStatus(mode === "2p" ? "🎉 Red (P1) wins!" : "🎉 You win!", "win");
            AudioFX.win();
            Storage.submitScore("checkers", (Storage.getBest("checkers") || 0) + 1);
          } else {
            scores.A++;
            setStatus(mode === "2p" ? "🎉 Black (P2) wins!" : "AI wins 💀", mode === "2p" ? "win" : "lose");
            AudioFX.win();
          }
          render();
          return true;
        }
        render();
        return false;
      }

      function doHint() {
        if (over || turn !== "P") return;
        const m = aiMoveP();
        if (m) {
          hl = m;
          AudioFX.reveal();
          render();
        }
      }

      function aiMoveP() {
        // simple: pick best jump or best advance for player
        const moves = allMoves(b, "P");
        if (!moves.length) return null;
        let best = null, bestScore = -Infinity;
        for (const m of moves) {
          let s = 0;
          if (m.captured) s += 10;
          s -= (m.to[0] - m.from[0]); // player wants decreasing row
          if (m.promote) s += 5;
          s += Math.random();
          if (s > bestScore) {
            bestScore = s;
            best = m;
          }
        }
        return best;
      }

      function doSolve() {
        if (over || turn !== "P") return;
        const m = aiMoveP();
        if (!m) return;
        sel = null;
        hl = null;
        applyMove(b, m);
        AudioFX.place();
        if (checkEnd("P")) return;
        turn = "A";
        setStatus("AI thinking…");
        render();
        later(aiTurn, 500);
      }

      live = {hint: doHint, solve: doSolve};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        pendingTimers.forEach(clearTimeout);
      };
    },
    hint: function () {
      if (live) live.hint();
    },
    solve: function () {
      if (live) live.solve();
    },
    help: function () {
      App.showModal("How to play Checkers",
        `Move your red pieces diagonally forward. Jump over an enemy piece to capture it (jumps are forced).
        <br>Reach the far row to be crowned a King — kings move both directions.
        <br><br>Win by capturing all enemy pieces or leaving them with no moves.
        <br><b>Hint</b> highlights the best move. <b>Solve</b> plays it for you.`);
    },
  });
})();
