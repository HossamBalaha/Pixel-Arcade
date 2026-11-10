/* Letter Drop — catch the falling letters to spell the target word */
(function () {
  GameRegistry.register({
    id: "letterdrop",
    name: "Letter Drop",
    icon: "📥",
    category: "word",
    description: "Catch the falling letters to spell the target word",
    tags: ["word", "arcade", "spelling"],
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
      const W = 380, H = 380;
      let word, caught, drops, missed, score, best, raf, level, over;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Spelling</div><div class="val" id="ld-word">—</div></div>
          <div class="score-cell"><div class="label">Missed</div><div class="val" id="ld-missed">0/5</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="ld-score">0</div></div>
        </div>
        <div class="status info" id="ld-status">Move the basket — catch letters in order!</div>
        <div class="center"><canvas id="ld-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Letters fall from the sky. Grab the next letter of your word, dodge the decoys!</p>
      `;

      const canvas = root.querySelector("#ld-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#ld-status");
      best = Storage.getBest("letterdrop") || 0;
      let lives = 5;

      function newWord() {
        const pool = (window.ANSWERS_ALL || []).filter(w => w.length >= 5 && w.length <= 7);
        word = pool[Math.floor(Math.random() * pool.length)].toUpperCase();
        caught = 0;
        drops = [];
        lives = 5;
        spawnTimer = 0;
        root.querySelector("#ld-word").textContent = word.split("").map((c, i) => i < caught ? c : "•").join("");
        updateHud();
      }

      let spawnTimer = 0;

      function updateHud() {
        root.querySelector("#ld-missed").textContent = lives + "/5";
        root.querySelector("#ld-score").textContent = score;
      }

      function spawnDrop() {
        // the needed letter or a decoy
        const need = word[caught];
        const others = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter(l => l !== need);
        const L = Math.random() < 0.42 ? need : others[Math.floor(Math.random() * others.length)];
        drops.push({x: 24 + Math.random() * (W - 48), y: -20, vy: 1.1 + Math.random() * 0.8 + word.length * 0.04, L});
      }

      let paddle = {x: W / 2, w: 62};
      score = 0;
      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return {x: (t.clientX - r.left) * (W / r.width)};
      };
      const move = (e) => {
        e.preventDefault();
        paddle.x = Math.max(32, Math.min(W - 32, pos(e).x));
      };
      canvas.addEventListener("pointerdown", move);
      canvas.addEventListener("pointermove", move);
      const onKey = (e) => {
        if (e.key === "ArrowLeft") paddle.x = Math.max(32, paddle.x - 34);
        if (e.key === "ArrowRight") paddle.x = Math.min(W - 32, paddle.x + 34);
      };
      document.addEventListener("keydown", onKey);

      function tick() {
        spawnTimer++;
        const rate = Math.max(28, 64 - word.length * 3);
        if (spawnTimer % rate === 0) spawnDrop();
        for (const d of drops) d.y += d.vy;
        // catch
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          if (d.y > H - 46 && d.y < H - 22 && Math.abs(d.x - paddle.x) < paddle.w / 2 + 8) {
            drops.splice(i, 1);
            if (d.L === word[caught]) {
              caught++;
              AudioFX.pop();
              root.querySelector("#ld-word").textContent = word.split("").map((c, k) => k < caught ? c : "•").join("");
              if (caught === word.length) {
                score += word.length * 10;
                AudioFX.win();
                App.toast(`“${word}” spelled! +${word.length * 10}`, "success");
                if (score > best) {
                  best = score;
                  Storage.setBest("letterdrop", score);
                }
                after(newWord, 800);
              }
            } else {
              lives--;
              AudioFX.error();
              updateHud();
              if (lives <= 0) {
                AudioFX.lose();
                statusEl.textContent = `Game over! Final score ${score}. The word was ${word}.`;
                statusEl.className = "status lose";
                over = true;
                after(() => {
                  score = 0;
                  over = false;
                  newWord();
                  statusEl.textContent = "Move the basket — catch letters in order!";
                  statusEl.className = "status info";
                }, 3000);
              }
            }
            continue;
          }
          if (d.y > H + 20) drops.splice(i, 1);
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function render() {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);
        // backdrop word display
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.font = "bold 40px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(word.split("").map((c, i) => i < caught ? c : "•").join(""), W / 2, 60);
        // drops
        ctx.font = "bold 24px sans-serif";
        for (const d of drops) {
          const isNext = d.L === word[caught];
          ctx.fillStyle = isNext ? "#22c55e" : "#f8fafc";
          ctx.beginPath();
          ctx.roundRect(d.x - 13, d.y - 15, 26, 30, 6);
          ctx.fill();
          ctx.fillStyle = isNext ? "#14532d" : "#1e293b";
          ctx.fillText(d.L, d.x, d.y + 8);
        }
        // basket — fixed amber: canvas is always dark, theme accent can go dark too
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.moveTo(paddle.x - paddle.w / 2, H - 20);
        ctx.lineTo(paddle.x - paddle.w / 2 + 8, H - 42);
        ctx.lineTo(paddle.x + paddle.w / 2 - 8, H - 42);
        ctx.lineTo(paddle.x + paddle.w / 2, H - 20);
        ctx.closePath();
        ctx.fill();
        // progress — fixed light text on the dark canvas
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Missed: ${lives}`, 10, H - 8);
      }

      score = 0;
      newWord();
      statusEl.textContent = "Move the basket — catch letters in order!";
      tick();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        canvas.removeEventListener("pointerdown", move);
        canvas.removeEventListener("pointermove", move);
      };
    },
    help: function () {
      App.showModal("How to play Letter Drop",
        `A secret word is chosen (shown as dots up top). Letters rain from the sky — move the basket with your
        pointer or <b>← →</b> and catch the <b>next letter of the word</b> (highlighted green).
        <br><br>Catching a wrong letter costs a miss (<b>5 allowed</b>); letters hitting the ground just vanish.
        Complete the word for <b>10 points per letter</b> and a fresh one drops in.`);
    },
  });
})();
