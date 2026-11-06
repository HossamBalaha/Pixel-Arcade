/* Block Drop — Tetris-lite on canvas. 10x18 grid, single block shapes. */
(function () {
  const COLS = 10, ROWS = 18, CELL = 18;
  const W = COLS * CELL, H = ROWS * CELL;
  const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
  };
  const KEYS = Object.keys(SHAPES);
  const COLORS = ["#06b6d4", "#eab308", "#a855f7", "#f97316", "#3b82f6", "#22c55e", "#ef4444"];

  function rotate(s) {
    const r = s.length, c = s[0].length;
    const out = Array.from({length: c}, () => Array(r).fill(0));
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) out[j][r - 1 - i] = s[i][j];
    return out;
  }

  GameRegistry.register({
    id: "blockdrop",
    name: "Block Drop",
    icon: "🟦",
    category: "arcade",
    description: "Tetris-lite — stack falling blocks, clear lines",
    tags: ["arcade", "classic", "keyboard"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let grid, cur, x, y, shape, color, score, best, over, drop, dropMs, lines, raf;
      best = Storage.getBest("blockdrop") || 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="bd-score">0</div></div>
          <div class="score-cell"><div class="label">Lines</div><div class="val" id="bd-lines">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="bd-best">0</div></div>
        </div>
        <div class="status info" id="bd-status">Use ← → to move, ↑ rotate, ↓ drop, Space hard-drop</div>
        <div class="center"><div class="snake-wrap"><canvas id="bd-canvas" width="${W}" height="${H}" class="game-canvas"></canvas></div></div>
        <div class="dpad" id="bd-dpad">
          <button class="up">↻</button>
          <button class="left">←</button>
          <button class="right">→</button>
          <button class="down">↓</button>
        </div>
        <p class="hint"><b>Space</b> hard-drop. <b>R</b> restart. Speed increases as you clear lines.</p>
      `;
      const canvas = root.querySelector("#bd-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#bd-status");

      function reset() {
        grid = Array.from({length: ROWS}, () => Array(COLS).fill(null));
        score = 0;
        lines = 0;
        over = false;
        dropMs = 600;
        spawn();
        statusEl.textContent = "Use arrows to move, ↑ rotate, ↓ soft-drop";
        statusEl.className = "status info";
      }

      function spawn() {
        const k = KEYS[Math.floor(Math.random() * KEYS.length)];
        shape = SHAPES[k].map(r => r.slice());
        color = COLORS[KEYS.indexOf(k)];
        x = Math.floor((COLS - shape[0].length) / 2);
        y = 0;
        if (collides(shape, x, y)) {
          over = true;
          AudioFX.lose();
          statusEl.textContent = `Game Over! Score: ${score}`;
          statusEl.className = "status lose";
          if (score > best) {
            best = score;
            Storage.setBest("blockdrop", score);
            App.toast("New best: " + score, "success");
          }
        }
      }

      function collides(s, nx, ny) {
        for (let i = 0; i < s.length; i++) for (let j = 0; j < s[0].length; j++) {
          if (!s[i][j]) continue;
          const r = ny + i, c = nx + j;
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
          if (grid[r][c]) return true;
        }
        return false;
      }

      function merge() {
        for (let i = 0; i < shape.length; i++) for (let j = 0; j < shape[0].length; j++) {
          if (shape[i][j]) grid[y + i][x + j] = color;
        }
      }

      function clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (grid[r].every(c => c)) {
            grid.splice(r, 1);
            grid.unshift(Array(COLS).fill(null));
            cleared++;
            r++;
          }
        }
        if (cleared) {
          lines += cleared;
          score += [0, 40, 100, 300, 1200][cleared];
          AudioFX.pop();
          dropMs = Math.max(80, 600 - Math.floor(lines / 2) * 60);
          root.querySelector("#bd-score").textContent = score;
          root.querySelector("#bd-lines").textContent = lines;
        }
      }

      function tick() {
        if (over) return;
        if (!collides(shape, x, y + 1)) {
          y++;
          render();
          return;
        }
        merge();
        clearLines();
        spawn();
        render();
      }

      function move(dx) {
        if (!collides(shape, x + dx, y)) {
          x += dx;
          AudioFX.move();
          render();
        }
      }

      function rot() {
        const r = rotate(shape);
        if (!collides(r, x, y)) {
          shape = r;
          AudioFX.flip();
          render();
        } else if (!collides(r, x - 1, y)) {
          x--;
          shape = r;
          render();
        }
      }

      function softDrop() {
        if (!collides(shape, x, y + 1)) {
          y++;
          score += 1;
          render();
        }
      }

      function hardDrop() {
        while (!collides(shape, x, y + 1)) {
          y++;
          score += 2;
        }
        AudioFX.place();
        tick();
        render();
      }

      function render() {
        const styles = getComputedStyle(document.documentElement);
        ctx.fillStyle = styles.getPropertyValue("--bg-soft");
        ctx.fillRect(0, 0, W, H);
        // grid
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          if (grid[r][c]) drawCell(c, r, grid[r][c]);
          else {
            ctx.fillStyle = "rgba(127,127,127,0.06)";
            ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
          }
        }
        // current piece
        if (!over) for (let i = 0; i < shape.length; i++) for (let j = 0; j < shape[0].length; j++) {
          if (shape[i][j]) drawCell(x + j, y + i, color);
        }
        root.querySelector("#bd-score").textContent = score;
        root.querySelector("#bd-best").textContent = best;
        root.querySelector("#bd-lines").textContent = lines;
      }

      function drawCell(c, r, col) {
        ctx.fillStyle = col;
        ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, 3);
      }

      let last = 0;

      function loop(t) {
        if (!alive) return;
        if (!last) last = t;
        if (t - last > dropMs) {
          last = t;
          tick();
        }
        raf = requestAnimationFrame(loop);
      }

      function onKey(e) {
        if (over && (e.key === "r" || e.key === "R")) {
          reset();
          return;
        }
        if (over) return;
        const k = e.key;
        if (k === "ArrowLeft") move(-1);
        else if (k === "ArrowRight") move(1);
        else if (k === "ArrowDown") softDrop();
        else if (k === "ArrowUp") rot();
        else if (k === " ") {
          e.preventDefault();
          hardDrop();
        }
        if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(k)) e.preventDefault();
      }

      document.addEventListener("keydown", onKey);
      root.querySelectorAll("#bd-dpad button").forEach(b => b.addEventListener("click", () => {
        const c = b.className;
        if (c === "left") move(-1); else if (c === "right") move(1); else if (c === "down") softDrop(); else if (c === "up") rot();
      }));

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
        `A Tetris-style falling-block game.
        <br><br>Move the piece left/right, rotate with <b>↑</b>, soft-drop with <b>↓</b>, hard-drop with <b>Space</b>.
        <br>Fill a complete horizontal row to clear it. The game speeds up as you clear more lines.
        <br><br>Press <b>R</b> to restart after a game over.`);
    },
  });
})();
