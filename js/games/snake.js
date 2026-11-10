/* Snake — eat food, grow, don't hit the walls or yourself.
   Speed is a variant: Chill (slow) / Classic / Fast — chosen in the
   game-header dropdown, persisted per player. */
(function () {
  GameRegistry.register({
    id: "snake",
    name: "Snake",
    icon: "🐍",
    category: "arcade",
    description: "Eat food, grow longer — don't crash",
    tags: ["arcade", "classic", "keyboard"],
    variants: [
      {key: "medium", label: "Classic"},
      {key: "easy", label: "Chill (slow)"},
      {key: "hard", label: "Fast (blitz)"},
    ],
    mount: function (root, {App, AudioFX, Storage}) {
      const SIZE = 17;
      const SPEEDS = {easy: 180, medium: 120, hard: 80};
      // Variant: snake speed from the persisted choice.
      let level = Storage.getVariant("snake", "medium") || "medium";
      // Best-score fairness: the default speed keeps the legacy "snake"
      // best key so existing bests survive; other speeds track their own bests.
      const BEST_KEY = level === "medium" ? "snake" : "snake:" + level;
      let snake, dir, nextDir, food, score, best, over, loop, speed;

      function reset() {
        snake = [{x: Math.floor(SIZE / 2), y: Math.floor(SIZE / 2)}];
        dir = {x: 1, y: 0};
        nextDir = dir;
        score = 0;
        over = false;
        placeFood();
        clearInterval(loop);
        speed = SPEEDS[level];
        loop = setInterval(tick, speed);
        render();
      }

      root.innerHTML = `
        <div class="row" style="justify-content:center;">
          <div class="difficulty" id="sn-diff">
            <button class="diff-btn ${level === "easy" ? "active" : ""}" data-l="easy">Easy</button>
            <button class="diff-btn ${level === "medium" ? "active" : ""}" data-l="medium">Med</button>
            <button class="diff-btn ${level === "hard" ? "active" : ""}" data-l="hard">Hard</button>
          </div>
        </div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="sn-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sn-best">0</div></div>
          <div class="score-cell"><div class="label">Length</div><div class="val" id="sn-len">1</div></div>
        </div>
        <div class="status info" id="sn-status">Use arrow keys / WASD / swipe to move</div>
        <div class="center"><div class="snake-wrap"><canvas id="sn-canvas" width="340" height="340"></canvas></div></div>
        <div class="dpad" id="sn-dpad">
          <button class="up">↑</button>
          <button class="left">←</button>
          <button class="right">→</button>
          <button class="down">↓</button>
        </div>
        <p class="hint">Press <b>Space</b> to pause/resume. <b>R</b> to restart.</p>
      `;

      const canvas = root.querySelector("#sn-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#sn-status");
      best = Storage.getBest(BEST_KEY) || 0;

      function placeFood() {
        while (true) {
          const f = {x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE)};
          if (!snake.some(s => s.x === f.x && s.y === f.y)) {
            food = f;
            return;
          }
        }
      }

      function tick() {
        if (over) return;
        dir = nextDir;
        const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
        if (head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE) return die("You hit the wall!");
        if (snake.some(s => s.x === head.x && s.y === head.y)) return die("You bit yourself!");
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          score++;
          AudioFX.pop();
          placeFood();
        } else {
          snake.pop();
        }
        render();
      }

      function die(msg) {
        over = true;
        clearInterval(loop);
        statusEl.textContent = `${msg} Final score: ${score}`;
        statusEl.className = "status lose";
        AudioFX.lose();
        if (score > best) {
          best = score;
          Storage.setBest(BEST_KEY, score);
          App.toast("New best: " + score, "success");
        }
        render();
      }

      function render() {
        const cell = canvas.width / SIZE;
        // bg
        const styles = getComputedStyle(document.documentElement);
        const bgSoft = styles.getPropertyValue("--bg-soft");
        const accent = styles.getPropertyValue("--accent");
        const accent2 = styles.getPropertyValue("--accent-2");
        const text = styles.getPropertyValue("--text");
        ctx.fillStyle = bgSoft;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // food
        ctx.fillStyle = accent2;
        ctx.beginPath();
        ctx.arc((food.x + 0.5) * cell, (food.y + 0.5) * cell, cell * 0.4, 0, Math.PI * 2);
        ctx.fill();
        // snake
        snake.forEach((s, i) => {
          ctx.fillStyle = i === 0 ? accent : accent;
          ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
          if (i === 0) {
            // eyes
            ctx.fillStyle = "#fff";
            const ex = s.x * cell + cell / 2 + dir.x * cell * 0.2;
            const ey = s.y * cell + cell / 2 + dir.y * cell * 0.2;
            ctx.fillRect(ex - 3, ey - 3, 2, 2);
            ctx.fillRect(ex + 1, ey - 3, 2, 2);
          }
        });
        root.querySelector("#sn-score").textContent = score;
        root.querySelector("#sn-best").textContent = best;
        root.querySelector("#sn-len").textContent = snake.length;
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 10);
          ctx.font = "14px sans-serif";
          ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 18);
        }
      }

      function turn(x, y) {
        if (over) return;
        // no reverse
        if (dir.x === -x && dir.y === -y) return;
        nextDir = {x, y};
      }

      function onKey(e) {
        const k = e.key;
        if (k === "ArrowUp" || k === "w" || k === "W") turn(0, -1);
        else if (k === "ArrowDown" || k === "s" || k === "S") turn(0, 1);
        else if (k === "ArrowLeft" || k === "a" || k === "A") turn(-1, 0);
        else if (k === "ArrowRight" || k === "d" || k === "D") turn(1, 0);
        else if (k === " ") {
          if (!over) {
            clearInterval(loop);
            statusEl.textContent = "Paused";
            statusEl.className = "status info";
          }
        } else if (k === "r" || k === "R") reset();
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(k)) e.preventDefault();
      }

      document.addEventListener("keydown", onKey);

      // D-pad
      root.querySelectorAll("#sn-dpad button").forEach(b => {
        b.addEventListener("click", () => {
          const c = b.className;
          if (c === "up") turn(0, -1);
          else if (c === "down") turn(0, 1);
          else if (c === "left") turn(-1, 0);
          else if (c === "right") turn(1, 0);
        });
      });

      // Swipe
      let ts = null;
      canvas.addEventListener("touchstart", e => {
        ts = {x: e.touches[0].clientX, y: e.touches[0].clientY};
      }, {passive: true});
      canvas.addEventListener("touchend", e => {
        if (!ts) return;
        const dx = e.changedTouches[0].clientX - ts.x;
        const dy = e.changedTouches[0].clientY - ts.y;
        if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
        else turn(0, dy > 0 ? 1 : -1);
        ts = null;
      });

      root.querySelectorAll("#sn-diff .diff-btn").forEach(b => b.addEventListener("click", () => {
        AudioFX.click();
        root.querySelectorAll("#sn-diff .diff-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        level = b.dataset.l;
        reset();
      }));

      reset();
      return function cleanup() {
        document.removeEventListener("keydown", onKey);
        clearInterval(loop);
      };
    },
    help: function () {
      App.showModal("How to play Snake",
        `Steer the snake to eat the food. Each food makes the snake one segment longer.
        <br><br>Don't hit the walls or your own body — game over!
        <br><br>Controls: arrow keys / WASD, on-screen D-pad, or swipe on touch devices.
        <br><b>Space</b> to pause. <b>R</b> to restart.
        <br>Difficulty changes the snake's speed.`);
    },
  });
})();
