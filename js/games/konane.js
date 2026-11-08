/* Konane — Hawaiian checkers: jump your opponent clean off the board */
(function () {
  GameRegistry.register({
    id: "konane",
    name: "Konane",
    icon: "🌺",
    category: "strategy",
    description: "Hawaiian checkers — jump your opponent clean off the board",
    tags: ["strategy", "checkers", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {

      // tracked timers — all cleared on cleanup so no stale callback runs after close
      let __t = [];
      const after = (fn, ms) => {
        const h = setTimeout(() => {
          __t = __t.filter(x => x !== h);
          fn();
        }, ms);
        __t.push(h);
        return h;
      };
      const N = 8;
      let board, sel, turn, won, wins, best, mustJump;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="kn-wins">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="kn-best">0</div></div>
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="kn-turn">You</div></div>
        </div>
        <div class="status info" id="kn-status">First move: click a marked stone to remove it</div>
        <div class="center"><canvas id="kn-canvas" width="360" height="360"></canvas></div>
        <p class="hint">Jump orthogonally over an enemy stone into an empty hole. Chain jumps allowed!</p>
      `;

      const canvas = root.querySelector("#kn-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#kn-status");
      best = Storage.getBest("konane") || 0;
      wins = 0;
      const CELL = 45;

      function reset() {
        board = Array.from({length: N}, () => Array(N).fill(0));
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) board[y][x] = (x + y) % 2 ? 2 : 1;
        sel = null;
        turn = "p";
        won = null;
        phase = "remove";
        render();
      }

      let phase = "remove"; // then "play"

      function jumpsFrom(x, y, side) {
        const out = [];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const mx = x + dx, my = y + dy, lx = x + 2 * dx, ly = y + 2 * dy;
          if (lx < 0 || ly < 0 || lx >= N || ly >= N) continue;
          if (board[my][mx] === (side === 1 ? 2 : 1) && !board[ly][lx]) out.push({x: lx, y: ly, cap: [mx, my]});
        }
        return out;
      }

      canvas.addEventListener("pointerdown", (e) => {
        if (won) return;
        const r = canvas.getBoundingClientRect();
        const x = Math.floor(((e.clientX - r.left) * (360 / r.width)) / CELL);
        const y = Math.floor(((e.clientY - r.top) * (360 / r.height)) / CELL);
        if (x < 0 || y < 0 || x >= N || y >= N) return;
        if (phase === "remove") {
          // player removes one of their stones from the marked center-ish spots
          if (board[y][x] === 1 && canBeFirst(y, x)) {
            board[y][x] = 0;
            AudioFX.pop();
            // AI removes an adjacent stone
            const opts = [];
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && ny >= 0 && nx < N && ny < N && board[ny][nx] === 2) opts.push([nx, ny]);
            }
            if (opts.length) {
              const [ax, ay] = opts[Math.floor(Math.random() * opts.length)];
              board[ay][ax] = 0;
            }
            phase = "play";
            statusEl.textContent = "Jump over enemy stones — captures are mandatory-ish, chains allowed!";
            statusEl.className = "status info";
            render();
          } else AudioFX.error();
          return;
        }
        if (turn !== "p") return;
        if (sel) {
          const j = jumpsFrom(sel.x, sel.y, 1).find(j => j.x === x && j.y === y);
          if (j) {
            board[j.cap[1]][j.cap[0]] = 0;
            board[y][x] = 1;
            board[sel.y][sel.x] = 0;
            AudioFX.pop();
            // chain?
            if (jumpsFrom(x, y, 1).length) {
              sel = {x, y};
              render();
              return;
            }
            sel = null;
            endTurn();
            return;
          }
        }
        if (board[y][x] === 1) {
          sel = {x, y};
          AudioFX.click();
        } else sel = null;
        render();
      });

      function canBeFirst(y, x) {
        // traditional: stones adjacent to the center; accept any stone with an orthogonal AI neighbor
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < N && ny < N && board[ny][nx] === 2) return true;
        }
        return false;
      }

      function endTurn() {
        if (noMoves("a")) return doWin("p");
        turn = "a";
        render();
        after(aiTurn, 600);
      }

      function noMoves(side) {
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (board[y][x] === (side === 1 ? 1 : 2) && jumpsFrom(x, y, side).length) return false;
        }
        return true;
      }

      function doWin(w) {
        won = w;
        if (w === "p") {
          wins++;
          AudioFX.win();
          if (wins > best) {
            best = wins;
            Storage.setBest("konane", wins);
          }
        } else AudioFX.lose();
        statusEl.textContent = w === "p" ? "🌺 The AI is stuck — you win!" : "You have no jumps left…";
        statusEl.className = "status " + (w === "p" ? "win" : "lose");
        render();
      }

      function aiTurn() {
        if (won) return;
        // collect all jumps incl. chains (greedy depth)
        let bestChain = null, bestLen = -1;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (board[y][x] !== 2) continue;
          // explore chains greedily
          const explore = (bx, by, b, len) => {
            const js = jumpsFrom(bx, by, 2);
            if (!js.length) return {len, from: null};
            let best = {len, from: null};
            for (const j of js.slice(0, 4)) {
              const nb = b.map(r => r.slice());
              nb[j.cap[1]][j.cap[0]] = 0;
              nb[by][bx] = 0;
              nb[j.y][j.x] = 2;
              const res = explore(j.x, j.y, nb, len + 1);
              if (res.len > best.len) best = {len: res.len, from: j};
            }
            return best;
          };
          const res = explore(x, y, board.map(r => r.slice()), 0);
          if (res.len > bestLen) {
            bestLen = res.len;
            bestChain = {x, y, first: res.from};
          }
        }
        if (!bestChain || bestLen === 0) return doWin("p");
        // apply first jump of best chain
        const j = bestChain.first;
        board[j.cap[1]][j.cap[0]] = 0;
        board[bestChain.y][bestChain.x] = 0;
        board[j.y][j.x] = 2;
        AudioFX.click();
        // continue chain greedily
        const chainMore = () => {
          const js = jumpsFrom(j.x, j.y, 2);
          if (js.length) {
            const jj = js[0];
            board[jj.cap[1]][jj.cap[0]] = 0;
            board[jj.y][jj.x] = 2;
            board[j.y][j.x] = 0;
            j.x = jj.x;
            j.y = jj.y;
            AudioFX.click();
            after(chainMore, 420);
          } else {
            if (noMoves("p")) return doWin("a");
            turn = "p";
            render();
          }
        };
        render();
        after(chainMore, 420);
      }

      function updateHud() {
        root.querySelector("#kn-wins").textContent = wins;
        root.querySelector("#kn-best").textContent = best;
        root.querySelector("#kn-turn").textContent = won ? "—" : turn === "p" ? "You" : "AI";
      }

      function render() {
        updateHud();
        // stone-ish board
        ctx.fillStyle = "#8b5e34";
        ctx.fillRect(0, 0, 360, 360);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = "#c19a6b";
          ctx.beginPath();
          ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 17, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#8b5e34";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const v = board[y][x];
          if (!v) continue;
          ctx.fillStyle = v === 1 ? "#f8fafc" : "#0f172a";
          ctx.beginPath();
          ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.beginPath();
          ctx.arc(x * CELL + CELL / 2 - 3, y * CELL + CELL / 2 - 4, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        if (phase === "remove") {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 3;
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            if (board[y][x] === 1 && canBeFirst(y, x)) {
              ctx.beginPath();
              ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 16, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
        if (sel) {
          ctx.strokeStyle = "#16a34a";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(sel.x * CELL + CELL / 2, sel.y * CELL + CELL / 2, 16, 0, Math.PI * 2);
          ctx.stroke();
          jumpsFrom(sel.x, sel.y, 1).forEach(j => {
            ctx.fillStyle = "rgba(22,163,74,0.55)";
            ctx.beginPath();
            ctx.arc(j.x * CELL + CELL / 2, j.y * CELL + CELL / 2, 10, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        if (won) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, 360, 360);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(won === "p" ? "You win! 🌺" : "AI wins", 180, 180);
        }
      }

      reset();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Konane",
        `Ancient Hawaiian checkers played on a stone board. Black and white fill the grid in a checker pattern.
        <br><br><b>Opening:</b> you remove one of your stones (gold ring marks legal picks), the AI answers by removing
        an adjacent one of its own.
        <br><b>Then:</b> jump orthogonally over an adjacent <b>enemy</b> stone into the empty hole beyond — capturing it.
        Jumps may <b>chain</b> in one turn. No non-capturing moves exist!
        <br>A player with <b>no jumps loses</b>. Last one hopping wins.`);
    },
  });
})();
