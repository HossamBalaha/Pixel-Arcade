/* Avoidance — strategy game: place tokens on a grid, avoid being adjacent to opponent. */
(function () {
  const N = 6;
  const HUMAN = "X", AI = "O";
  let live = null;

  function neighbors(r, c) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N) out.push([nr, nc]);
    }
    return out;
  }

  function isValid(b, r, c, player) {
    if (b[r][c]) return false;
    // Not adjacent to same player; can be adjacent to opponent (but that's a capture)
    for (const [nr, nc] of neighbors(r, c)) {
      if (b[nr][nc] === player) return false;
    }
    return true;
  }

  function capture(b, r, c, player) {
    // Adjacent opponent tokens are captured
    const opp = player === HUMAN ? AI : HUMAN;
    const captured = [];
    for (const [nr, nc] of neighbors(r, c)) {
      if (b[nr][nc] === opp) {
        // Check if opp token is "trapped" — has no escape (no valid empty neighbor that's also non-adjacent to opp)
        // Simplified: capture if opp token has no same-color neighbor and at least 2 of its neighbors are player
        let playerN = 0, oppN = 0, emptyN = 0;
        for (const [nnr, nnc] of neighbors(nr, nc)) {
          if (b[nnr][nnc] === player) playerN++;
          else if (b[nnr][nnc] === opp) oppN++;
          else emptyN++;
        }
        if (playerN >= 2 && oppN === 0) {
          b[nr][nc] = null;
          captured.push([nr, nc]);
        }
      }
    }
    return captured;
  }

  function countTokens(b) {
    let x = 0, o = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (b[r][c] === HUMAN) x++;
      else if (b[r][c] === AI) o++;
    }
    return {x, o};
  }

  function hasValidMoves(b, player) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (isValid(b, r, c, player)) return true;
    }
    return false;
  }

  function aiMove(b) {
    // Pick move that maximizes captures, then board presence
    let best = null, bestScore = -Infinity;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (!isValid(b, r, c, AI)) continue;
      const test = b.map(row => row.slice());
      test[r][c] = AI;
      const caps = capture(test, r, c, AI);
      const {x, o} = countTokens(test);
      const score = caps.length * 5 + (o - x);
      if (score > bestScore) {
        bestScore = score;
        best = [r, c];
      }
    }
    return best;
  }

  GameRegistry.register({
    id: "avoidance",
    name: "Avoidance",
    icon: "🚧",
    category: "strategy",
    description: "Place tokens avoiding your own color — trap opponents to capture them",
    tags: ["strategy", "placement", "ai"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let b, current, over, aiTimer;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You (X)</div><div class="val" id="av-x">0</div></div>
          <div class="score-cell"><div class="label">AI (O)</div><div class="val" id="av-o">0</div></div>
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="av-w">—</div></div>
        </div>
        <div class="status info" id="av-status">Place X tokens. Don't put yours next to your own — but trap opponents to capture them!</div>
        <div class="center"><div id="av-board" style="display:grid;grid-template-columns:repeat(${N},48px);grid-template-rows:repeat(${N},48px);gap:2px;background:var(--border);padding:2px;border-radius:var(--radius);"></div></div>
        <p class="hint">Yellow dot = invalid spot (adjacent to your own token). <b>R</b> = new game.</p>
      `;
      const boardEl = root.querySelector("#av-board");
      const statusEl = root.querySelector("#av-status");
      root.querySelector("#av-w").textContent = Storage.getBest("avoidance") ?? "—";

      function newGame() {
        b = Array.from({length: N}, () => Array(N).fill(null));
        current = HUMAN;
        over = false;
        statusEl.textContent = "Place X tokens. Don't put yours next to your own — but trap opponents to capture them!";
        statusEl.className = "status info";
        render();
      }

      function render() {
        boardEl.innerHTML = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.style.cssText = "background:var(--bg-elev);display:grid;place-items:center;cursor:pointer;font-weight:800;font-size:1.4rem;font-family:var(--font-mono);";
          const v = b[r][c];
          if (v) {
            cell.textContent = v;
            cell.style.color = v === HUMAN ? "var(--accent)" : "var(--accent-2)";
          } else if (current === HUMAN && !isValid(b, r, c, HUMAN)) {
            cell.style.background = "var(--bg-soft)";
            cell.style.color = "var(--text-muted)";
            cell.textContent = "·";
          }
          cell.addEventListener("click", () => onCell(r, c));
          boardEl.appendChild(cell);
        }
        const {x, o} = countTokens(b);
        root.querySelector("#av-x").textContent = x;
        root.querySelector("#av-o").textContent = o;
      }

      function onCell(r, c) {
        if (over || current !== HUMAN) return;
        if (!isValid(b, r, c, HUMAN)) {
          AudioFX.error();
          return;
        }
        b[r][c] = HUMAN;
        AudioFX.place();
        const caps = capture(b, r, c, HUMAN);
        if (caps.length) AudioFX.win();
        if (checkEnd()) {
          render();
          return;
        }
        current = AI;
        statusEl.textContent = "AI thinking…";
        render();
        aiTimer = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (over) return;
          const m = aiMove(b);
          if (m) {
            b[m[0]][m[1]] = AI;
            AudioFX.pop();
            capture(b, m[0], m[1], AI);
          }
          if (!checkEnd()) {
            current = HUMAN;
            if (!hasValidMoves(b, HUMAN)) {
              statusEl.textContent = "You have no valid moves — AI wins by default.";
              statusEl.className = "status lose";
              AudioFX.lose();
              over = true;
            } else {
              statusEl.textContent = "Your turn (X)";
              statusEl.className = "status info";
            }
          }
          render();
        }, 500);
      }

      function checkEnd() {
        const total = countTokens(b).x + countTokens(b).o;
        const full = total >= N * N || (!hasValidMoves(b, HUMAN) && !hasValidMoves(b, AI));
        if (!full) return false;
        over = true;
        const {x, o} = countTokens(b);
        if (x > o) {
          statusEl.textContent = `🎉 You win! ${x} vs ${o}`;
          statusEl.className = "status win";
          AudioFX.win();
          const best = (Storage.getBest("avoidance") || 0) + 1;
          Storage.setBest("avoidance", best);
          root.querySelector("#av-w").textContent = best;
        } else if (o > x) {
          statusEl.textContent = `💀 AI wins! ${o} vs ${x}`;
          statusEl.className = "status lose";
          AudioFX.lose();
        } else {
          statusEl.textContent = "It's a draw!";
          statusEl.className = "status info";
          AudioFX.lose();
        }
        return true;
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") newGame();
      }

      document.addEventListener("keydown", onKey);
      live = {};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        if (aiTimer) clearTimeout(aiTimer);
      };
    },
    help: function () {
      App.showModal("How to play Avoidance",
        `Place tokens on the grid with these rules:
        <br><br>• You <b>cannot</b> place your token adjacent to your own token (any of 8 neighbors).
        <br>• You <b>can</b> place next to an opponent's token — that's how you attack!
        <br>• If an opponent token has 2+ of your tokens as neighbors and no same-color ally, it's <b>captured</b> (removed).
        <br><br>Game ends when nobody can move. Player with most tokens wins!`);
    },
  });
})();
