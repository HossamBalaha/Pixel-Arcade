/* Fishing Frenzy — drop the hook, reel the fish, dodge the junk */
(function () {
  GameRegistry.register({
    id: "fishcatch",
    name: "Fishing Frenzy",
    icon: "🎣",
    category: "arcade",
    description: "Drop the hook, reel the fish, dodge the junk",
    tags: ["arcade", "timing", "casual"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 340, H = 440;
      let hook, fish, junk, score, timeLeft, over, raf, dragging, timer, splash;
      const DURATION = 40;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="fc-score">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="fc-time">40</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="fc-best">0</div></div>
        </div>
        <div class="status info" id="fc-status">Hold to sink the hook, release to reel up — catch fish 🐟</div>
        <div class="center"><canvas id="fc-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Deeper fish are worth more. Boots 🥾 and cans 🥫 cost points — let them drift past.</p>
      `;

      const canvas = root.querySelector("#fc-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#fc-status");
      let best = Storage.getBest("fishcatch") || 0;
      const WATER = 120;
      const FISH_TYPES = [
        {emoji: "🐟", pts: 10, size: 22, sp: 1.6},
        {emoji: "🐠", pts: 20, size: 24, sp: 2.0},
        {emoji: "🐡", pts: 40, size: 30, sp: 1.2},
        {emoji: "🦈", pts: 80, size: 40, sp: 2.6, deep: true},
      ];
      const JUNK = [{emoji: "🥾", pts: -15}, {emoji: "🥫", pts: -10}, {emoji: "🎒", pts: -20}];

      function reset() {
        hook = {y: 60, vy: 0, up: false, caught: null};
        fish = [];
        junk = [];
        score = 0;
        timeLeft = DURATION;
        over = false;
        dragging = false;
        splash = null;
        updateHud();
        statusEl.textContent = "Hold to sink the hook, release to reel up — catch fish 🐟";
        statusEl.className = "status info";
        clearInterval(timer);
        timer = setInterval(() => {
          if (over) return;
          timeLeft--;
          updateHud();
          if (timeLeft <= 0) endGame();
        }, 1000);
      }

      function updateHud() {
        root.querySelector("#fc-score").textContent = score;
        root.querySelector("#fc-time").textContent = timeLeft;
        root.querySelector("#fc-best").textContent = best;
      }

      function endGame() {
        over = true;
        clearInterval(timer);
        statusEl.textContent = `Time's up! You caught ${score} points of seafood`;
        statusEl.className = "status " + (score >= 150 ? "win" : "info");
        if (score > best) {
          best = score;
          Storage.setBest("fishcatch", score);
          App.toast("New best: " + score, "success");
        }
        updateHud();
      }

      function spawn() {
        const deep = Math.random() < 0.45;
        const t = FISH_TYPES[Math.floor(Math.random() * (deep ? 4 : 3))];
        fish.push({
          x: Math.random() < 0.5 ? -30 : W + 30,
          y: WATER + 30 + Math.random() * (H - WATER - 90) * (t.deep ? 0.9 : 0.8) + (t.deep ? 40 : 0),
          dir: 0, sp: t.sp * (0.7 + Math.random() * 0.6),
          ...t,
        });
        fish[fish.length - 1].dir = fish[fish.length - 1].x < 0 ? 1 : -1;
        if (Math.random() < 0.22) {
          const j = JUNK[Math.floor(Math.random() * JUNK.length)];
          junk.push({
            x: Math.random() < 0.5 ? -30 : W + 30,
            y: WATER + 20 + Math.random() * (H - WATER - 70),
            sp: 0.8,
            dir: 0, ...j
          });
          junk[junk.length - 1].dir = junk[junk.length - 1].x < 0 ? 1 : -1;
        }
      }

      canvas.addEventListener("pointerdown", () => {
        if (!over) dragging = true;
      });
      window.addEventListener("pointerup", () => {
        if (dragging && !over && !hook.caught) {
          dragging = false;
          hook.up = true;
        }
        dragging = false;
      });

      function tick() {
        if (!over) {
          // hook physics
          if (dragging) {
            hook.vy += 0.18;
            hook.vy = Math.min(4, hook.vy);
          } else if (hook.up) {
            hook.vy -= 0.22;
            if (hook.y <= 60) {
              hook.y = 60;
              hook.vy = 0;
              hook.up = false;
              land();
            }
          } else {
            hook.vy = 0;
          }
          hook.y += hook.vy;
          if (hook.y > H - 20) {
            hook.y = H - 20;
            hook.vy = 0;
          }
          // world
          if (fish.length < 6 && Math.random() < 0.05) spawn();
          for (const f of fish) {
            f.x += f.sp * f.dir;
            if (!f.wob) f.wob = 0;
            f.y += Math.sin((f.wob += 0.05)) * 0.3;
          }
          fish = fish.filter(f => f.x > -60 && f.x < W + 60);
          for (const j of junk) j.x += j.sp * j.dir;
          junk = junk.filter(j => j.x > -60 && j.x < W + 60);
          // catch test (hook at x=W/2)
          const hx = W / 2, hy = hook.y;
          if (!hook.caught && hook.y > WATER) {
            for (let i = fish.length - 1; i >= 0; i--) {
              const f = fish[i];
              if (Math.abs(f.x - hx) < f.size * 0.6 && Math.abs(f.y - hy) < f.size * 0.6) {
                hook.caught = fish.splice(i, 1)[0];
                hook.up = true;
                dragging = false;
                AudioFX.pop();
                splash = {x: hx, y: hy, t: 0};
                break;
              }
            }
            for (let i = junk.length - 1; i >= 0; i--) {
              const j = junk[i];
              if (Math.abs(j.x - hx) < 16 && Math.abs(j.y - hy) < 16) {
                hook.caught = junk.splice(i, 1)[0];
                hook.up = true;
                dragging = false;
                AudioFX.error();
                splash = {x: hx, y: hy, t: 0};
                break;
              }
            }
          }
          if (splash && ++splash.t > 14) splash = null;
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function land() {
        if (hook.caught) {
          score = Math.max(0, score + hook.caught.pts);
          if (hook.caught.pts > 0) AudioFX.win(); else AudioFX.lose();
          hook.caught = null;
          updateHud();
        }
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        const text = st.getPropertyValue("--text").trim() || "#eee";
        // sky
        ctx.fillStyle = "#7dd3fc";
        ctx.fillRect(0, 0, W, WATER - 20);
        // boat
        ctx.fillStyle = "#78350f";
        ctx.beginPath();
        ctx.moveTo(W / 2 - 34, 62);
        ctx.quadraticCurveTo(W / 2, 78, W / 2 + 34, 62);
        ctx.lineTo(W / 2 + 28, 54);
        ctx.lineTo(W / 2 - 28, 54);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = text;
        ctx.font = "18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎣", W / 2, 52);
        // water
        const g = ctx.createLinearGradient(0, WATER - 20, 0, H);
        g.addColorStop(0, "#0ea5e9");
        g.addColorStop(1, "#0c4a6e");
        ctx.fillStyle = g;
        ctx.fillRect(0, WATER - 20, W, H - WATER + 20);
        // waves
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const wy = WATER + 10 + i * 80;
          ctx.beginPath();
          for (let x = 0; x < W; x += 30) {
            ctx.moveTo(x, wy + Math.sin(x / 22 + Date.now() / 700 + i) * 3);
            ctx.lineTo(x + 15, wy + Math.sin(x / 22 + 0.5 + Date.now() / 700 + i) * 3);
          }
          ctx.stroke();
        }
        // seaweed at bottom
        ctx.strokeStyle = "#166534";
        ctx.lineWidth = 4;
        for (let i = 0; i < 6; i++) {
          const sx = 30 + i * 56;
          ctx.beginPath();
          ctx.moveTo(sx, H - 10);
          ctx.quadraticCurveTo(sx + Math.sin(Date.now() / 600 + i) * 10, H - 45, sx, H - 70);
          ctx.stroke();
        }
        // fish + junk
        ctx.textAlign = "center";
        for (const f of fish) {
          ctx.save();
          ctx.translate(f.x, f.y);
          if (f.dir < 0) ctx.scale(-1, 1);
          ctx.font = f.size + "px sans-serif";
          ctx.fillText(f.emoji, 0, 8);
          ctx.restore();
        }
        for (const j of junk) ctx.fillText(j.emoji, j.x, j.y + 8);
        // line + hook
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(W / 2, 58);
        ctx.lineTo(W / 2, hook.y);
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(W / 2, hook.y, 5, 0, Math.PI * 2);
        ctx.fill();
        if (hook.caught) ctx.fillText(hook.caught.emoji, W / 2, hook.y + 26);
        // splash
        if (splash) {
          ctx.strokeStyle = `rgba(255,255,255,${1 - splash.t / 14})`;
          ctx.beginPath();
          ctx.arc(splash.x, splash.y, splash.t * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Time's up!", W / 2, H / 2);
          ctx.font = "14px sans-serif";
          ctx.fillText("Click to fish again", W / 2, H / 2 + 26);
          canvas.addEventListener("pointerdown", () => {
            if (over) reset();
          }, {once: true});
        }
      }

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
        clearInterval(timer);
        window.removeEventListener("pointerup", () => {
        });
      };
    },
    help: function () {
      App.showModal("How to play Fishing Frenzy",
        `<b>Hold</b> the mouse / finger down to sink your hook; <b>release</b> to reel it back up.
        Whatever touches the hook on the way up comes with it.
        <br><br>🐟 10 · 🐠 20 · 🐡 40 · 🦈 80 (deep!) — but 🥾 boots, 🥫 cans and 🎒 bags <b>subtract</b> points, so steer around them.
        40 seconds per trip.`);
    },
  });
})();
