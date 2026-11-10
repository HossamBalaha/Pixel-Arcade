/* Cave Flyer — hold to rise, release to fall, thread the cave */
(function () {
  GameRegistry.register({
    id: "caveflyer",
    name: "Cave Flyer",
    icon: "🦇",
    category: "arcade",
    description: "Hold to rise, release to fall — thread the cave",
    tags: ["arcade", "flying", "endless"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 380, H = 300;
      let y, vy, cols, dist, score, best, over, raf, gems, hold;
      const GAP0 = 150;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="cv-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cv-best">0</div></div>
        </div>
        <div class="status info" id="cv-status">Hold (mouse / touch / Space) to rise — release to fall</div>
        <div class="center"><canvas id="cv-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">The cave narrows as you fly. Gems give +15 — go get them (if you dare).</p>
      `;

      const canvas = root.querySelector("#cv-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#cv-status");
      best = Storage.getBest("caveflyer") || 0;
      const CW = 26; // cave column width

      function reset() {
        y = H / 2;
        vy = 0;
        hold = false;
        dist = 0;
        score = 0;
        over = false;
        gems = [];
        // build the cave AFTER score/dist exist — makeCol() reads score for
        // the gap width; building first produced NaN top/bot (invisible walls)
        cols = [];
        for (let i = 0; i < W / CW + 4; i++) cols.push(makeCol(i));
        updateHud();
        statusEl.textContent = "Hold (mouse / touch / Space) to rise — release to fall";
        statusEl.className = "status info";
      }

      function makeCol(i) {
        const gap = Math.max(84, GAP0 - score * 1.1);
        // The opening columns wrap gently around the bat's start height so a
        // fresh cave is always survivable — with fully random mids the first
        // screen could spawn a wall straight through the bat (instant death
        // the moment the walls became visible/collidable).
        const mid = i < 6
          ? H / 2 + (Math.random() - 0.5) * 80
          : 60 + Math.random() * (H - 120);
        const top = Math.max(14, mid - gap / 2);
        const bot = Math.min(H - 14, mid + gap / 2);
        return {top, bot};
      }

      function updateHud() {
        root.querySelector("#cv-score").textContent = score;
        root.querySelector("#cv-best").textContent = best;
      }

      function tick() {
        if (!over) {
          vy += hold ? -0.5 : 0.42;
          vy = Math.max(-5.5, Math.min(5.5, vy));
          y += vy;
          dist += 2.6;
          score = Math.floor(dist / 12);
          // regenerate world every column-width of travel
          if (dist % CW < 2.7) {
            cols.shift();
            cols.push(makeCol(cols.length + Math.floor(dist / CW)));
            if (Math.random() < 0.22) {
              const last = cols[cols.length - 1];
              gems.push({col: cols.length - 1, x: W, y: (last.top + last.bot) / 2, got: false});
            }
          }
          for (const g of gems) g.x -= 2.6;
          gems = gems.filter(g => g.x > -20 && !g.got);
          // collision: check the column under the player (player x = 80).
          // worldCol = floor((dist + 80) / CW) − floor(dist / CW) resolves to
          // the on-screen column spanning x = 80, independent of scroll phase.
          const px = 80;
          const worldCol = Math.floor((dist + px) / CW) - Math.floor(dist / CW);
          const c = cols[Math.min(cols.length - 1, worldCol)] || cols[0];
          if (y < c.top + 8 || y > c.bot - 8) die("Crashed into the cave wall!");
          // gems
          for (const g of gems) {
            if (!g.got && Math.abs(g.x - px) < 18 && Math.abs(g.y - y) < 18) {
              g.got = true;
              dist += 30;
              AudioFX.win();
              updateHud();
            }
          }
          updateHud();
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function die(msg) {
        over = true;
        AudioFX.lose();
        statusEl.textContent = msg + " Score: " + score;
        statusEl.className = "status lose";
        if (score > best) {
          best = score;
          Storage.setBest("caveflyer", score);
          App.toast("New best: " + score, "success");
        }
        updateHud();
      }

      function render() {
        // fixed deep-cave backdrop — walls, gems and bat use fixed colors
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);
        // cave walls — scroll by dist
        const off = dist % CW;
        for (let i = 0; i < cols.length; i++) {
          const c = cols[i];
          const x = i * CW - off;
          ctx.fillStyle = "#312e81";
          ctx.fillRect(x, 0, CW + 1, c.top);
          ctx.fillRect(x, c.bot, CW + 1, H - c.bot);
          // stalactites texture
          ctx.fillStyle = "#4338ca";
          if ((i + Math.floor(dist / CW)) % 3 === 0) {
            ctx.beginPath();
            ctx.moveTo(x, c.top);
            ctx.lineTo(x + CW / 2, c.top + 10);
            ctx.lineTo(x + CW, c.top);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x, c.bot);
            ctx.lineTo(x + CW / 2, c.bot - 10);
            ctx.lineTo(x + CW, c.bot);
            ctx.closePath();
            ctx.fill();
          }
        }
        // gems
        ctx.fillStyle = "#f472b6";
        for (const g of gems) {
          ctx.beginPath();
          ctx.moveTo(g.x, g.y - 8);
          ctx.lineTo(g.x + 6, g.y);
          ctx.lineTo(g.x, g.y + 8);
          ctx.lineTo(g.x - 6, g.y);
          ctx.closePath();
          ctx.fill();
        }
        // bat — fixed violet on the cave black
        ctx.save();
        ctx.translate(80, y);
        ctx.rotate(Math.max(-0.5, Math.min(0.5, vy * 0.09)));
        ctx.fillStyle = "#a78bfa";
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        const wing = Math.sin(Date.now() / 60) * 8;
        ctx.beginPath();
        ctx.moveTo(-4, -2);
        ctx.quadraticCurveTo(-16, -10 - wing, -22, 0);
        ctx.quadraticCurveTo(-14, 2 - wing / 2, -4, 3);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, -2);
        ctx.quadraticCurveTo(16, -10 - wing, 22, 0);
        ctx.quadraticCurveTo(14, 2 - wing / 2, 4, 3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fde047";
        ctx.fillRect(-3, -2, 2, 2);
        ctx.fillRect(1, -2, 2, 2);
        ctx.restore();
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Crashed!", W / 2, H / 2);
          ctx.font = "14px sans-serif";
          ctx.fillText("Press R to fly again", W / 2, H / 2 + 24);
        }
      }

      const setHold = (v) => {
        if (!over) hold = v;
      };
      const onDown = (e) => {
        e.preventDefault();
        setHold(true);
      };
      const onUp = () => setHold(false);
      canvas.addEventListener("pointerdown", onDown);
      window.addEventListener("pointerup", onUp);
      const onKey = (e) => {
        if (e.key === " ") {
          e.preventDefault();
          setHold(true);
        }
        if (e.key.toLowerCase() === "r" && over) reset();
      };
      const onKeyUp = (e) => {
        if (e.key === " ") setHold(false);
      };
      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onKeyUp);

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
        canvas.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("keyup", onKeyUp);
      };
    },
    help: function () {
      App.showModal("How to play Cave Flyer",
        `Hold anywhere (or hold <b>Space</b>) to flap upward; release to sink. Fly through the cave's twists without touching the walls.
        <br><br>The gap <b>narrows</b> the longer you survive. Pink gems are worth a distance boost — grab them when the cave allows.
        One wall touch ends the flight. <b>R</b> restarts.`);
    },
  });
})();
