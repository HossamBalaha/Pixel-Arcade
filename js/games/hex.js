/* Hex — connect your two sides of the hexagon board */
(function () {
  GameRegistry.register({
    id: "hex",
    name: "Hex",
    icon: "⬡",
    category: "strategy",
    description: "Connect your two sides of the hex board",
    tags: ["strategy", "connection", "classic"],
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
      let cells, turn, won, wins, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="hx2-wins">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="hx2-best">0</div></div>
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="hx2-turn">You</div></div>
        </div>
        <div class="status info" id="hx2-status">Connect TOP to BOTTOM with your pieces</div>
        <div class="center"><canvas id="hx2-canvas" width="430" height="440"></canvas></div>
        <p class="hint">You connect vertically (top↔bottom), AI connects horizontally. Hex never ends in a draw!</p>
      `;

      const canvas = root.querySelector("#hx2-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#hx2-status");
      best = Storage.getBest("hex") || 0;
      wins = 0;
      const S = 22; // hex size
      const OX = 60, OY = 44;
      const cx = (x, y) => OX + x * S * 1.74 + y * S * 0.87;
      const cy = (x, y) => OY + y * S * 1.5;

      function reset() {
        cells = Array.from({length: N}, () => Array(N).fill(0)); // 0 empty, 1 you, 2 ai
        turn = "p";
        won = null;
        render();
      }

      function neighbors(x, y) {
        const out = [];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < N && ny < N) out.push([nx, ny]);
        }
        return out;
      }

      function connected(side) {
        // player: top row (y=0) to bottom row (y=N-1); ai: left col to right col
        const seen = Array.from({length: N}, () => Array(N).fill(false));
        const stack = [];
        if (side === 1) {
          for (let x = 0; x < N; x++) if (cells[0][x] === 1) {
            stack.push([x, 0]);
            seen[0][x] = true;
          }
        } else {
          for (let y = 0; y < N; y++) if (cells[y][0] === 2) {
            stack.push([0, y]);
            seen[y][0] = true;
          }
        }
        while (stack.length) {
          const [x, y] = stack.pop();
          if (side === 1 && y === N - 1) return true;
          if (side === 2 && x === N - 1) return true;
          for (const [nx, ny] of neighbors(x, y)) {
            if (!seen[ny][nx] && cells[ny][nx] === side) {
              seen[ny][nx] = true;
              stack.push([nx, ny]);
            }
          }
        }
        return false;
      }

      canvas.addEventListener("pointerdown", (e) => {
        if (won || turn !== "p") return;
        const r = canvas.getBoundingClientRect();
        const mx = (e.clientX - r.left) * (430 / r.width);
        const my = (e.clientY - r.top) * (440 / r.height);
        // find nearest hex center
        let bestCell = null, bestD = S;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const d = Math.hypot(cx(x, y) - mx, cy(x, y) - my);
          if (d < bestD) {
            bestD = d;
            bestCell = [x, y];
          }
        }
        if (!bestCell) return;
        const [x, y] = bestCell;
        if (cells[y][x]) {
          AudioFX.error();
          return;
        }
        cells[y][x] = 1;
        AudioFX.pop();
        if (connected(1)) return doWin("p");
        turn = "a";
        render();
        after(aiMove, 520);
      });

      function doWin(w) {
        won = w;
        if (w === "p") {
          wins++;
          AudioFX.win();
          if (wins > best) {
            best = wins;
            Storage.setBest("hex", wins);
          }
        } else AudioFX.lose();
        statusEl.textContent = w === "p" ? "⬡ You bridged top to bottom — win!" : "The AI spanned left to right…";
        statusEl.className = "status " + (w === "p" ? "win" : "lose");
        render();
      }

      function aiMove() {
        // evaluate empty cells: Dijkstra-like shortest-connection heuristic + block player
        let bestCell = null, bestScore = -1e9;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (cells[y][x]) continue;
          let score = 0;
          // ai connectivity potential: count empty+own neighbors
          let aiN = 0, emptyN = 0, pN = 0;
          for (const [nx, ny] of neighbors(x, y)) {
            if (cells[ny][nx] === 2) aiN++;
            else if (cells[ny][nx] === 0) emptyN++;
            else pN++;
          }
          score += aiN * 3 + emptyN * 1.2 - pN * 0.8;
          // prefer center-ish
          score += (N / 2 - Math.abs(x - N / 2)) * 0.4 + (N / 2 - Math.abs(y - N / 2)) * 0.4;
          // blocking: if player has strong cluster nearby, higher priority
          if (pN >= 1) score += 5;
          // simulate: does it create near-connection for ai?
          cells[y][x] = 2;
          if (connected(2)) score += 1e6;
          // does it block player's imminent win? simulate player's best reply
          cells[y][x] = 1;
          if (connected(1)) score += 1e5; // must block!
          cells[y][x] = 0;
          score += Math.random() * 2;
          if (score > bestScore) {
            bestScore = score;
            bestCell = [x, y];
          }
        }
        if (bestCell) {
          cells[bestCell[1]][bestCell[0]] = 2;
          AudioFX.click();
        }
        if (connected(2)) return doWin("a");
        turn = "p";
        render();
      }

      function updateHud() {
        root.querySelector("#hx2-wins").textContent = wins;
        root.querySelector("#hx2-best").textContent = best;
        root.querySelector("#hx2-turn").textContent = won ? "—" : turn === "p" ? "You" : "AI";
      }

      function render() {
        updateHud();
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, 430, 440);
        // border hints: top/bottom = player yellow, left/right = AI red
        ctx.fillStyle = "rgba(250,204,21,0.5)";
        ctx.fillRect(40, 8, 340, 16);
        ctx.fillRect(40, 416, 340, 16);
        ctx.beginPath();
        ctx.fillStyle = "rgba(239,68,68,0.5)";
        ctx.fillRect(8, 30, 16, 380);
        ctx.fillRect(406, 30, 16, 380);
        // hexes
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const X = cx(x, y), Y = cy(x, y);
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
            const px = X + Math.cos(a) * (S - 2), py = Y + Math.sin(a) * (S - 2);
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = "#1e293b";
          ctx.fill();
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          if (cells[y][x]) {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
              const px = X + Math.cos(a) * (S - 5), py = Y + Math.sin(a) * (S - 5);
              i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = cells[y][x] === 1 ? "#facc15" : "#ef4444";
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.3)";
            ctx.stroke();
          }
        }
        if (won) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, 430, 440);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(won === "p" ? "You win! ⬡" : "AI wins", 215, 220);
        }
      }

      reset();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Hex",
        `Invented by Piet Hein and John Nash independently. Players alternate claiming empty hexagons.
        <br><br>• 🟡 <b>You</b> must form an unbroken chain connecting the <b>top and bottom</b> edges.
        <br>• 🔴 The <b>AI</b> connects <b>left and right</b>.
        <br><br>Every hexagon borders up to six others. There are <b>no draws</b> — someone always connects first.
        Strategy tip: stones in the middle are worth more than stones on the edges.`);
    },
  });
})();
