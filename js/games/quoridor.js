/* Quoridor — race to the far side, place fences to slow the AI */
(function () {
  GameRegistry.register({
    id: "quoridor",
    name: "Quoridor",
    icon: "🧱",
    category: "strategy",
    description: "Race to the far side — place fences to slow the AI",
    tags: ["strategy", "racing", "fences"],
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
      const N = 9;
      let pawns, fences, vertFences, horzFences, turn, won, wins, best, wallMode;
      // vertFences[y][x] = vertical fence segment left of cell x at row y (x: 0..N-2)
      // horzFences[y][x] = horizontal fence segment above cell x at column y... simpler: same indexing

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="qr-wins">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="qr-best">0</div></div>
          <div class="score-cell"><div class="label">Fences</div><div class="val" id="qr-fences">10</div></div>
        </div>
        <div class="status info" id="qr-status">Toggle Move/Wall mode — reach the top row!</div>
        <div class="center"><canvas id="qr-canvas" width="396" height="396"></canvas></div>
        <div class="row gap-2" style="justify-content:center;margin-top:8px;">
          <button class="btn btn-sm primary" id="qr-mode">🚶 Mode: Move</button>
          <button class="btn btn-sm" id="qr-rot">🔄 Rotate wall</button>
          <button class="btn btn-sm" id="qr-new">↻ New game</button>
        </div>
        <p class="hint">Click empty wall slots to build. You can't fully block a player — a path must always remain.</p>
      `;

      const canvas = root.querySelector("#qr-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#qr-status");
      best = Storage.getBest("quoridor") || 0;
      wins = 0;
      const CELL = 44;
      wallMode = {on: false, vert: true};

      function reset() {
        pawns = {p: {x: 4, y: 8}, a: {x: 4, y: 0}};
        fences = {p: 10, a: 10};
        vertFences = Array.from({length: N}, () => Array(N).fill(false));
        horzFences = Array.from({length: N}, () => Array(N).fill(false));
        turn = "p";
        won = null;
        wallMode = {on: false, vert: true};
        root.querySelector("#qr-mode").textContent = "🚶 Mode: Move";
        render();
      }

      function blocked(x, y, nx, ny) {
        if (nx === x + 1) return vertFences[y][x];
        if (nx === x - 1) return vertFences[y][x - 1];
        if (ny === y + 1) return horzFences[y] && horzFences[y][x];
        if (ny === y - 1) return horzFences[ny] && horzFences[ny][x];
        return true;
      }

      // vertical fence at (gx, gy) separates cells (gx-1,gy) and (gx,gy) -> store vertFences[gy][gx] for gx 1..N-1
      function canStep(x, y, nx, ny) {
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) return false;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) return false;
        if (nx === x + 1 && vertFences[y][x]) return false;
        if (nx === x - 1 && vertFences[y][nx]) return false;
        if (ny === y + 1 && horzFences[y][x]) return false;
        if (ny === y - 1 && horzFences[ny][x]) return false;
        return true;
      }

      function pathExists(side) {
        // BFS from pawn to goal row
        const goal = side === "p" ? 0 : N - 1;
        const start = side === "p" ? pawns.p : pawns.a;
        const seen = new Set([start.x + "," + start.y]);
        const queue = [start];
        while (queue.length) {
          const {x, y} = queue.shift();
          if (y === goal) return true;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (!canStep(x, y, nx, ny)) continue;
            const k = nx + "," + ny;
            if (!seen.has(k)) {
              seen.add(k);
              queue.push({x: nx, y: ny});
            }
          }
        }
        return false;
      }

      function distToGoal(side) {
        const goal = side === "p" ? 0 : N - 1;
        const start = side === "p" ? pawns.p : pawns.a;
        const dist = Array.from({length: N}, () => Array(N).fill(999));
        dist[start.y][start.x] = 0;
        const queue = [start];
        while (queue.length) {
          const {x, y} = queue.shift();
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (!canStep(x, y, nx, ny)) continue;
            if (dist[ny][nx] > dist[y][x] + 1) {
              dist[ny][nx] = dist[y][x] + 1;
              queue.push({x: nx, y: ny});
            }
          }
        }
        let bestD = 999;
        for (let x = 0; x < N; x++) bestD = Math.min(bestD, dist[goal][x]);
        return bestD;
      }

      canvas.addEventListener("pointerdown", (e) => {
        if (won || turn !== "p") return;
        const r = canvas.getBoundingClientRect();
        const mx = (e.clientX - r.left) * (396 / r.width);
        const my = (e.clientY - r.top) * (396 / r.height);
        if (wallMode.on) {
          if (fences.p <= 0) {
            AudioFX.error();
            return;
          }
          // wall slot: between cells — click near a cell corner
          const gx = Math.round(mx / CELL), gy = Math.round(my / CELL);
          // a wall occupies 2 cells' worth: place at (gx-1..gx, gy) for vert
          let placed = false;
          if (wallMode.vert && gx >= 1 && gx <= N - 1 && gy >= 0 && gy < N) {
            if (!vertFences[gy][gx] && !vertFences[gy][gx - 1]) {
              vertFences[gy][gx] = true;
              // vertical wall spans rows gy..gy+1 visually? Our fence is 1 segment tall (44px). Treat as covering gy only.
              placed = true;
            }
          } else if (!wallMode.vert && gy >= 1 && gy <= N - 1 && gx >= 0 && gx < N) {
            if (!horzFences[gy][gx] && !horzFences[gy - 1] && horzFences[gy][gx - 1] !== undefined) {
              horzFences[gy][gx] = true;
              placed = true;
            }
          }
          if (placed) {
            if (pathExists("p") && pathExists("a")) {
              fences.p--;
              AudioFX.pop();
              turn = "a";
              render();
              after(aiTurn, 550);
            } else {
              // undo — would block someone completely
              if (wallMode.vert) vertFences[gy][gx] = false; else horzFences[gy][gx] = false;
              AudioFX.error();
              statusEl.textContent = "That wall would trap a player — illegal!";
              statusEl.className = "status lose";
            }
          } else AudioFX.error();
          return;
        }
        // move mode
        const x = Math.floor(mx / CELL), y = Math.floor(my / CELL);
        if (canStep(pawns.p.x, pawns.p.y, x, y) &&
          !(x === pawns.a.x && y === pawns.a.y)) {
          pawns.p = {x, y};
          AudioFX.pop();
          if (y === 0) return doWin("p");
          turn = "a";
          render();
          after(aiTurn, 550);
        } else if (x === pawns.a.x && y === pawns.a.y) {
          // jump over? keep simple: no
          AudioFX.error();
        }
      });

      function doWin(w) {
        won = w;
        if (w === "p") {
          wins++;
          AudioFX.win();
          if (wins > best) {
            best = wins;
            Storage.setBest("quoridor", wins);
          }
        } else AudioFX.lose();
        statusEl.textContent = w === "p" ? "🧱 You reached the top — victory!" : "The AI got there first…";
        statusEl.className = "status " + (w === "p" ? "win" : "lose");
        render();
      }

      function aiTurn() {
        // decide: if player much closer, wall them; else move toward goal
        const myD = distToGoal("a"), theirD = distToGoal("p");
        if (theirD < myD - 1 && fences.a > 0) {
          // try to place a wall in front of player (simulate a few candidates)
          const py = pawns.p;
          const candidates = [];
          for (let gy = Math.max(0, py.y - 4); gy < Math.min(N, py.y + 1); gy++) {
            for (let gx = Math.max(1, py.x - 2); gx < Math.min(N - 1, py.x + 3); gx++) {
              if (!vertFences[gy][gx] && !vertFences[gy][Math.max(0, gx - 1)]) {
                candidates.push({t: "v", gx, gy});
              }
              if (!horzFences[gy][gx] && gy >= 1 && !horzFences[gy - 1][gx]) {
                candidates.push({t: "h", gx, gy});
              }
            }
          }
          let placed = false;
          candidates.sort(() => Math.random() - 0.5);
          for (const c of candidates.slice(0, 24)) {
            if (c.t === "v") vertFences[c.gy][c.gx] = true; else horzFences[c.gy][c.gx] = true;
            if (pathExists("p") && pathExists("a") && distToGoal("p") > theirD) {
              fences.a--;
              placed = true;
              break;
            }
            if (c.t === "v") vertFences[c.gy][c.gx] = false; else horzFences[c.gy][c.gx] = false;
          }
          if (placed) {
            AudioFX.click();
            turn = "p";
            render();
            return;
          }
        }
        // move: BFS shortest path step
        const goal = N - 1;
        const dist = Array.from({length: N}, () => Array(N).fill(999));
        const prev = {};
        dist[pawns.a.y][pawns.a.x] = 0;
        const queue = [pawns.a];
        while (queue.length) {
          const {x, y} = queue.shift();
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (!canStep(x, y, nx, ny)) continue;
            if (nx === pawns.p.x && ny === pawns.p.y) continue;
            if (dist[ny][nx] > dist[y][x] + 1) {
              dist[ny][nx] = dist[y][x] + 1;
              prev[nx + "," + ny] = {x, y};
              queue.push({x: nx, y: ny});
            }
          }
        }
        let bx = -1, bd = 999;
        for (let x = 0; x < N; x++) if (dist[goal][x] < bd) {
          bd = dist[goal][x];
          bx = x;
        }
        if (bx >= 0 && bd < 999) {
          // walk back to find first step
          let cur = {x: bx, y: goal};
          while (prev[cur.x + "," + cur.y] && (prev[cur.x + "," + cur.y].x !== pawns.a.x || prev[cur.x + "," + cur.y].y !== pawns.a.y)) {
            cur = prev[cur.x + "," + cur.y];
          }
          pawns.a = cur;
          AudioFX.pop();
        }
        if (pawns.a.y === N - 1) return doWin("a");
        turn = "p";
        render();
      }

      function updateHud() {
        root.querySelector("#qr-wins").textContent = wins;
        root.querySelector("#qr-best").textContent = best;
        root.querySelector("#qr-fences").textContent = fences.p;
      }

      function render() {
        updateHud();
        ctx.fillStyle = "#8a5a24";
        ctx.fillRect(0, 0, 396, 396);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#d9b382" : "#e7c795";
          ctx.fillRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8);
        }
        // fences
        ctx.fillStyle = "#1c1917";
        for (let y = 0; y < N; y++) for (let x = 1; x < N; x++) {
          if (vertFences[y][x]) ctx.fillRect(x * CELL - 3, y * CELL + 4, 6, CELL - 8);
        }
        for (let y = 1; y < N; y++) for (let x = 0; x < N; x++) {
          if (horzFences[y] && horzFences[y][x]) ctx.fillRect(x * CELL + 4, y * CELL - 3, CELL - 8, 6);
        }
        // pawns
        const drawPawn = (p, color, emoji) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(p.x * CELL + CELL / 2, p.y * CELL + CELL / 2, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.35)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.font = "16px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(emoji, p.x * CELL + CELL / 2, p.y * CELL + CELL / 2 + 6);
        };
        drawPawn(pawns.p, "#facc15", "🚶");
        drawPawn(pawns.a, "#ef4444", "🤖");
        // goal highlight
        ctx.fillStyle = "rgba(250,204,21,0.3)";
        ctx.fillRect(4, 4, N * CELL - 8, CELL - 8);
        // move hints
        if (!wallMode.on && !won && turn === "p") {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = pawns.p.x + dx, ny = pawns.p.y + dy;
            if (canStep(pawns.p.x, pawns.p.y, nx, ny) && !(nx === pawns.a.x && ny === pawns.a.y)) {
              ctx.fillStyle = "rgba(22,163,74,0.5)";
              ctx.beginPath();
              ctx.arc(nx * CELL + CELL / 2, ny * CELL + CELL / 2, 8, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        if (won) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, 396, 396);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(won === "p" ? "You win! 🧱" : "AI wins", 198, 198);
        }
      }

      root.querySelector("#qr-mode").addEventListener("click", () => {
        wallMode.on = !wallMode.on;
        root.querySelector("#qr-mode").textContent = wallMode.on ? "🧱 Mode: Wall" : "🚶 Mode: Move";
        AudioFX.click();
        render();
      });
      root.querySelector("#qr-rot").addEventListener("click", () => {
        wallMode.vert = !wallMode.vert;
        AudioFX.click();
      });
      root.querySelector("#qr-new").addEventListener("click", reset);

      reset();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Quoridor",
        `Race your pawn from the bottom to the <b>top row</b> (gold strip). Each turn, either:
        <br>• <b>🚶 Move</b> one square (green dots show legal steps), or
        <br>• <b>🧱 build a wall</b> — toggle Wall mode, rotate if needed, click a gap between cells.
        <br><br>Walls are 2 squares long and each side has only <b>10</b>. You may never build a wall that
        completely traps either player — the game blocks illegal walls automatically.
        Wall the AI into detours while sprinting for the goal!`);
    },
  });
})();
