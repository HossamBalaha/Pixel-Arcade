/* Fruit Slice — swipe to slice flying fruit, never the bombs */
(function () {
  GameRegistry.register({
    id: "fruitslice",
    name: "Fruit Slice",
    icon: "🍉",
    category: "arcade",
    description: "Swipe to slice flying fruit — never the bombs",
    tags: ["arcade", "reflex", "action"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 360, H = 440;
      let items, slices, score, lives, best, over, raf, spawnT, pointerTrail;
      const FRUITS = ["🍉", "🍊", "🍋", "🍏", "🍐", "🥝", "🍓", "🍇", "🍍"];

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="fs-score">0</div></div>
          <div class="score-cell"><div class="label">Lives</div><div class="val" id="fs-lives">3</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="fs-best">0</div></div>
        </div>
        <div class="status info" id="fs-status">Swipe across fruit to slice — avoid 💣 bombs!</div>
        <div class="center"><canvas id="fs-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Combos of 3+ fruits in one swipe give bonus points.</p>
      `;

      const canvas = root.querySelector("#fs-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#fs-status");
      best = Storage.getBest("fruitslice") || 0;

      function reset() {
        items = [];
        slices = [];
        pointerTrail = [];
        score = 0;
        lives = 3;
        over = false;
        spawnT = 0;
        updateHud();
        statusEl.textContent = "Swipe across fruit to slice — avoid 💣 bombs!";
        statusEl.className = "status info";
      }

      function updateHud() {
        root.querySelector("#fs-score").textContent = score;
        root.querySelector("#fs-lives").textContent = lives;
        root.querySelector("#fs-best").textContent = best;
      }

      function spawn() {
        const n = 1 + (Math.random() < 0.4 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const isBomb = Math.random() < 0.16;
          const x = 40 + Math.random() * (W - 80);
          items.push({
            x, y: H + 30,
            vx: (W / 2 - x) * 0.016 + (Math.random() - 0.5),
            vy: -(8.5 + Math.random() * 2.6),
            rot: 0, vr: (Math.random() - 0.5) * 0.12,
            emoji: isBomb ? "💣" : FRUITS[Math.floor(Math.random() * FRUITS.length)],
            bomb: isBomb, r: 22,
          });
        }
      }

      function tick() {
        if (!over) {
          spawnT++;
          if (spawnT > 46 - Math.min(26, score / 40)) {
            spawnT = 0;
            spawn();
          }
          for (const it of items) {
            it.vy += 0.16;
            it.x += it.vx;
            it.y += it.vy;
            it.rot += it.vr;
          }
          // missed fruit
          for (const it of items) {
            if (it.y > H + 60 && !it.bomb) {
              it.dead = true;
              lives--;
              AudioFX.error();
              updateHud();
              if (lives <= 0) endGame();
            } else if (it.y > H + 60) it.dead = true;
          }
          items = items.filter(i => !i.dead);
          for (const s of slices) {
            s.t++;
          }
          slices = slices.filter(s => s.t < 26);
        }
        // trail fade
        if (pointerTrail.length > 8) pointerTrail.shift();
        render();
        raf = requestAnimationFrame(tick);
      }

      function endGame() {
        over = true;
        AudioFX.lose();
        statusEl.textContent = `Game over — score ${score}`;
        statusEl.className = "status lose";
        if (score > best) {
          best = score;
          Storage.setBest("fruitslice", score);
          App.toast("New best: " + score, "success");
        }
        updateHud();
      }

      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return {x: (t.clientX - r.left) * (W / r.width), y: (t.clientY - r.top) * (H / r.height)};
      };
      let lastSliceCount = 0, combo = 0;
      const swipe = (e) => {
        e.preventDefault();
        const p = pos(e);
        pointerTrail.push(p);
        if (over) return;
        let hitThis = 0;
        for (const it of items) {
          if (!it.dead && Math.hypot(it.x - p.x, it.y - p.y) < 30) {
            it.dead = true;
            if (it.bomb) {
              slices.push({x: it.x, y: it.y, t: 0, text: "💥", col: "#ef4444"});
              lives = 0;
              updateHud();
              endGame();
              return;
            }
            hitThis++;
            slices.push({x: it.x, y: it.y, t: 0, text: it.emoji, col: "#22c55e", half: true});
          }
        }
        if (hitThis) {
          combo += hitThis;
          if (combo >= 3) {
            const bonus = combo * 5;
            score += bonus;
            slices.push({x: p.x, y: p.y - 30, t: 0, text: "COMBO +" + bonus, col: "#f59e0b"});
          }
          score += hitThis * 10;
          AudioFX.pop();
          updateHud();
        }
      };
      canvas.addEventListener("pointerdown", swipe);
      canvas.addEventListener("pointermove", (e) => {
        if (e.buttons || e.pointerType === "touch") swipe(e);
      });

      function render() {
        const st = getComputedStyle(document.documentElement);
        const bgSoft = st.getPropertyValue("--bg-soft").trim() || "#111";
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        ctx.fillStyle = bgSoft;
        ctx.fillRect(0, 0, W, H);
        // subtle vignette
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(0, 0, W, 40);
        ctx.fillRect(0, H - 30, W, 30);
        // items
        ctx.font = "40px sans-serif";
        ctx.textAlign = "center";
        for (const it of items) {
          ctx.save();
          ctx.translate(it.x, it.y);
          ctx.rotate(it.rot);
          ctx.fillText(it.emoji, 0, 14);
          ctx.restore();
        }
        // slices (split halves flying apart)
        for (const s of slices) {
          ctx.save();
          ctx.globalAlpha = 1 - s.t / 26;
          if (s.half) {
            ctx.font = "28px sans-serif";
            ctx.fillText(s.text, s.x - s.t * 1.2, s.y - s.t * 0.8 + 12);
            ctx.fillText(s.text, s.x + s.t * 1.2, s.y - s.t * 0.4 + 12);
          } else {
            ctx.font = s.text.length > 3 ? "bold 20px sans-serif" : "40px sans-serif";
            ctx.fillStyle = s.col;
            ctx.fillText(s.text, s.x, s.y + 10);
          }
          ctx.restore();
        }
        // pointer trail — follows the accent so it shows on light canvases too
        if (pointerTrail.length > 2) {
          ctx.strokeStyle = accent;
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.beginPath();
          pointerTrail.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
          ctx.stroke();
        }
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Game over", W / 2, H / 2);
          ctx.font = "14px sans-serif";
          ctx.fillText("Click to play again", W / 2, H / 2 + 26);
          canvas.addEventListener("pointerdown", () => {
            if (over) reset();
          }, {once: true});
        }
      }

      const onKey = (e) => {
        if (e.key.toLowerCase() === "r" && over) reset();
      };
      document.addEventListener("keydown", onKey);
      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
        canvas.removeEventListener("pointerdown", swipe);
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Fruit Slice",
        `Swipe the pointer (or finger) <b>through</b> flying fruit to slice it — <b>+10</b> each.
        <br><br><b>💣 Bombs end the run instantly</b>, so curve your swipes around them.
        Missing a fruit costs a life (3 total). Slice <b>3+ fruit in one swipe</b> for combo bonuses.
        Fruit launches faster and faster as your score climbs.`);
    },
  });
})();
