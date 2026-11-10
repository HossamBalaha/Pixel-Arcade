/* stopthebar — pure timing: stop the sweeping needle inside the shrinking zone. */
(function () {
  "use strict";
  GameRegistry.register({
    id: "stopthebar", name: "Stop the Bar", icon: "🎯", category: "arcade",
    description: "Stop the needle in the zone — it shrinks and speeds up", tags: ["arcade", "timing", "reflex"],
    age: ["kids", "teens", "adults"], difficulty: "medium", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, raf = null, last = 0;
      const W = 420;
      let pos = 0, dir = 1, speed = 0.55, zoneW = 0.24, zoneX = 0, level = 1, lives = 3, over = false, running = false;

      root.innerHTML = `
        <style>#st-c { display:block; margin:0 auto; background:#020617; border-radius:12px; cursor:pointer; }</style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Level</div><div class="val" id="st-lv">1</div></div>
          <div class="score-cell"><div class="label">Lives</div><div class="val" id="st-li">❤️❤️❤️</div></div>
        </div>
        <div class="status info" id="st-status">Tap (or press Space) when the needle is in the green zone!</div>
        <canvas id="st-c" width="${W}" height="96"></canvas>
      `;
      const cv = root.querySelector("#st-c");
      const g = cv.getContext("2d");

      function newLevel() {
        zoneX = 0.08 + Math.random() * (1 - zoneW - 0.16);
        pos = 0;
        dir = 1;
        running = true;
        setStatus("Tap (or press Space) when the needle is in the green zone!");
      }

      function setStatus(t, cls) {
        const st = root.querySelector("#st-status");
        if (st) {
          st.textContent = t;
          st.className = "status " + (cls || "info");
        }
      }

      function stop() {
        if (over || !running) return;
        running = false;
        const hit = pos >= zoneX && pos <= zoneX + zoneW;
        if (hit) {
          level++;
          AudioFX.pop();
          setStatus(`🎯 Nailed it! Level ${level}`, "win");
          speed += 0.09;
          zoneW = Math.max(0.055, zoneW - 0.02);
          setTimeout(() => {
            if (alive && !over) newLevel();
          }, 800);
        } else {
          lives--;
          AudioFX.error();
          const li = root.querySelector("#st-li");
          if (li) li.textContent = "❤️".repeat(Math.max(0, lives));
          if (lives <= 0) {
            over = true;
            setStatus(`💀 Out of lives — level ${level}.`, "lose");
            AudioFX.lose();
            App.recordResult(false, level - 1);
          } else {
            setStatus("Missed! Same zone, try again.", "lose");
            setTimeout(() => {
              if (alive && !over) {
                running = true;
                pos = 0;
                dir = 1;
              }
            }, 900);
          }
        }
      }

      function update(dt) {
        if (!running || over) return;
        pos += dir * speed * dt;
        if (pos > 1) {
          pos = 1;
          dir = -1;
        }
        if (pos < 0) {
          pos = 0;
          dir = 1;
        }
      }

      function draw() {
        g.fillStyle = "#020617";
        g.fillRect(0, 0, W, 96);
        // track — lifted off the night bg
        g.fillStyle = "#243353";
        g.fillRect(20, 34, W - 40, 28);
        // zone
        g.fillStyle = over ? "#166534" : "#22c55e";
        g.fillRect(20 + zoneX * (W - 40), 34, zoneW * (W - 40), 28);
        // needle
        const x = 20 + pos * (W - 40);
        g.fillStyle = "#f8fafc";
        g.fillRect(x - 2, 20, 4, 56);
        g.beginPath();
        g.arc(x, 84, 5, 0, 7);
        g.fill();
      }

      function loop(t) {
        if (!alive) return;
        const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
        last = t;
        update(dt);
        draw();
        raf = requestAnimationFrame(loop);
      }

      const kd = e => {
        if (e.key === " ") {
          e.preventDefault();
          stop();
        }
      };
      document.addEventListener("keydown", kd);
      cv.addEventListener("pointerdown", stop);

      newLevel();
      raf = requestAnimationFrame(loop);
      return function cleanup() {
        alive = false;
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", kd);
      };
    },
    help: function () {
      App.showModal("How to play Stop the Bar",
        "A needle sweeps left and right across the bar." +
        "<br>Tap the bar (or press Space) to stop it — inside the green zone to advance." +
        "<br>Each level the needle gets faster and the zone smaller. Three misses and you're out!");
    },
  });
})();
