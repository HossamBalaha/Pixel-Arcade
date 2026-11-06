/* Block Drop — simplified Tetris. Pieces drop straight down; arrange rows to clear them. */
(function () {
  const COLS = 6, ROWS = 12;
  const PIECES = [
    [[1]],         // single
    [[1, 1]],      // horizontal 2
    [[1], [1]],    // vertical 2
    [[1, 1, 1]],   // horizontal 3
    [[1], [1], [1]], // vertical 3
    [[1, 1], [1, 1]], // 2x2 square
  ];

  let live = null;
  GameRegistry.register({
    id: "tetris",
    name: "Block Drop",
    icon: "🧱",
    category: "arcade",
    description: "Simplified Tetris — drop pieces, clear rows",
    tags: ["arcade", "classic", "keyboard"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let grid = [], piece = null, px = 0, py = 0, over = false, score = 0, raf = null, dropTimer = 0;
      const DROP_MS = 600;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="bt-score">0</div></div>
          <div class="score-cell"><div class="label">Lines</div><div class="val" id="bt-lines">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="bt-best">0</div></div>
        </div>
        <div class="status info" id="bt-status">← → to move, ↓ to drop, Space to rotate. Fill rows to clear them.</div>
        <div class="center" style="margin:14px 0;"><canvas id="bt-canvas" width="${COLS * 24}" height="${ROWS * 24}" class="game-canvas" style="cursor:none"></canvas></div>
        <p class="hint"><b>←/→</b> move • <b>↓</b> soft drop • <b>Space</b> rotate • <b>R</b> restart</p>
      `;
      const canvas = root.querySelector("#bt-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#bt-status");

      function reset() {
        grid = Array.from({length: ROWS}, () => Array(COLS).fill(0));
        score = 0;
        over = false;
        root.querySelector("#bt-score").textContent = 0;
        root.querySelector("#bt-lines").textContent = 0;
        const best = Storage.getBest("tetris") || 0;
        root.querySelector("#bt-best").textContent = best;
        spawn();
      }

      function spawn() {
        const idx = Math.floor(Math.random() * PIECES.length);
        piece = PIECES[idx].map(r => r.slice());
        px = Math.floor((COLS - piece[0].length) / 2);
        py = 0;
        if (collides(piece, px, py)) {
          over = true;
          statusEl.textContent = `💀 Game Over. Score: ${score}`;
          statusEl.className = "status lose";
          AudioFX.lose();
          Storage.submitScore("tetris", score, {});
          const best = Storage.getBest("tetris") || 0;
          if (score > best) {
            Storage.setBest("tetris", score);
            root.querySelector("#bt-best").textContent = score;
          }
        }
      }

      function collides(p, x, y) {
        for (let r = 0; r < p.length; r++) for (let c = 0; c < p[r].length; c++) {
          if (!p[r][c]) continue;
          const nx = x + c, ny = y + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && grid[ny][nx]) return true;
        }
        return false;
      }

      function lock() {
        for (let r = 0; r < piece.length; r++) for (let c = 0; c < piece[r].length; c++) {
          if (piece[r][c]) {
            const ny = py + r, nx = px + c;
            if (ny >= 0 && ny < ROWS) grid[ny][nx] = 1;
          }
        }
        AudioFX.place();
        clearLines();
        spawn();
      }

      function clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (grid[r].every(v => v === 1)) {
            grid.splice(r, 1);
            grid.unshift(Array(COLS).fill(0));
            cleared++;
            r++;
          }
        }
        if (cleared > 0) {
          const points = [0, 100, 300, 500, 800][cleared] || 800;
          score += points;
          root.querySelector("#bt-score").textContent = score;
          const lines = parseInt(root.querySelector("#bt-lines").textContent, 10) + cleared;
          root.querySelector("#bt-lines").textContent = lines;
          AudioFX.win();
        }
      }

      function rotate() {
        // Transpose + reverse for 90° clockwise rotation
        const newPiece = piece[0].map((_, i) => piece.map(row => row[i]).reverse());
        if (!collides(newPiece, px, py)) {
          piece = newPiece;
          AudioFX.tick();
        }
      }

      function move(dx, dy) {
        if (!collides(piece, px + dx, py + dy)) {
          px += dx;
          py += dy;
          if (dx !== 0) AudioFX.tick();
          return true;
        }
        return false;
      }

      function render() {
        const s = getComputedStyle(document.documentElement);
        ctx.fillStyle = s.getPropertyValue("--bg-soft");
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = s.getPropertyValue("--border");
        ctx.lineWidth = 1;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          if (grid[r][c]) {
            ctx.fillStyle = s.getPropertyValue("--accent");
            ctx.fillRect(c * 24 + 1, r * 24 + 1, 22, 22);
          } else {
            ctx.strokeRect(c * 24 + 0.5, r * 24 + 0.5, 23, 23);
          }
        }
        // Draw current piece
        if (piece && !over) {
          ctx.fillStyle = s.getPropertyValue("--accent-2");
          for (let r = 0; r < piece.length; r++) for (let c = 0; c < piece[r].length; c++) {
            if (piece[r][c]) ctx.fillRect((px + c) * 24 + 1, (py + r) * 24 + 1, 22, 22);
          }
        }
      }

      let lastTime = 0;

      function loop(t) {
        if (!alive) return;
        if (!lastTime) lastTime = t;
        const dt = t - lastTime;
        lastTime = t;
        if (!over) {
          dropTimer += dt;
          if (dropTimer >= DROP_MS) {
            dropTimer = 0;
            if (!move(0, 1)) lock();
          }
        }
        render();
        raf = requestAnimationFrame(loop);
      }

      function onKey(e) {
        if (over) {
          if (e.key === "r" || e.key === "R" || e.key === "Enter") {
            reset();
          }
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          move(-1, 0);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          move(1, 0);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!move(0, 1)) lock();
        } else if (e.key === " ") {
          e.preventDefault();
          rotate();
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          reset();
        }
      }

      document.addEventListener("keydown", onKey);

      reset();
      raf = requestAnimationFrame(loop);
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Block Drop",
        `Pieces drop from the top. Arrange them to fill complete rows; full rows disappear and score points.
        <br><br><b>←/→</b> move left/right • <b>↓</b> soft drop • <b>Space</b> rotate clockwise • <b>R</b> restart.
        <br><br>Lines cleared: 1 = 100 pts, 2 = 300, 3 = 500, 4 = 800.`);
    },
  });
})();
