/* Reaction Wall — wall approaches, tap at the right moment to stop. */
(function () {
  GameRegistry.register({
    id: "reactionwall",
    name: "Reaction Wall",
    icon: "🧱",
    category: "arcade",
    description: "Stop the wall at the perfect moment as it approaches",
    tags: ["reflex", "timing"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let phase = "idle"; // idle | running | stopped | done
      let pos = 0, raf, score = 0, best, round = 0, total = 5, results = [];
      const W = 360, H = 60;
      const STOP_ZONE = 8; // perfect zone around H/2

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Round</div><div class="val" id="rw-round">0/5</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="rw-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="rw-best">0</div></div>
        </div>
        <div class="status info" id="rw-status">Click Start. Stop the wall in the green zone!</div>
        <div class="center"><canvas id="rw-canvas" width="${W}" height="${H}" class="game-canvas" style="margin-top:10px;"></canvas></div>
        <div class="row" style="justify-content:center;gap:12px;margin-top:12px;">
          <button class="btn primary" id="rw-stop">STOP</button>
          <button class="btn" id="rw-start">Start</button>
        </div>
        <p class="hint">Click STOP (or press <b>Space</b>) when the wall hits the green zone.</p>
      `;
      const canvas = root.querySelector("#rw-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#rw-status");
      const startBtn = root.querySelector("#rw-start");
      const stopBtn = root.querySelector("#rw-stop");
      best = Storage.getBest("reactionwall") || 0;
      root.querySelector("#rw-best").textContent = best;

      function render() {
        const s = getComputedStyle(document.documentElement);
        ctx.fillStyle = s.getPropertyValue("--bg-soft");
        ctx.fillRect(0, 0, W, H);
        // stop zone
        ctx.fillStyle = "rgba(34,197,94,0.4)";
        ctx.fillRect(0, H / 2 - STOP_ZONE, W, STOP_ZONE * 2);
        ctx.strokeStyle = s.getPropertyValue("--success");
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
        // wall
        ctx.fillStyle = s.getPropertyValue("--danger");
        ctx.fillRect(0, pos - 6, W, 12);
      }

      function start() {
        if (round >= total) {
          round = 0;
          score = 0;
          results = [];
          root.querySelector("#rw-score").textContent = "0";
          root.querySelector("#rw-round").textContent = "0/5";
        }
        round++;
        root.querySelector("#rw-round").textContent = round + "/5";
        phase = "running";
        pos = -20;
        statusEl.textContent = `Round ${round}/5 — Stop in the green zone!`;
        statusEl.className = "status info";
        loop();
      }

      function loop() {
        if (!alive || phase !== "running") return;
        pos += 3.5 + round * 0.3;
        if (pos > H + 30) {
          // missed
          stop(true);
          return;
        }
        render();
        raf = requestAnimationFrame(loop);
      }

      function stop(missed) {
        if (phase !== "running") return;
        phase = "stopped";
        cancelAnimationFrame(raf);
        if (missed) {
          AudioFX.lose();
          statusEl.textContent = "Missed the wall! 0 points this round.";
          statusEl.className = "status lose";
          results.push(0);
        } else {
          const dist = Math.abs(pos - H / 2);
          let pts;
          if (dist <= STOP_ZONE) pts = 100;
          else if (dist <= STOP_ZONE * 2) pts = 50;
          else if (dist <= STOP_ZONE * 4) pts = 20;
          else pts = 0;
          if (pts >= 100) {
            AudioFX.win();
            statusEl.textContent = `Perfect! +${pts}`;
            statusEl.className = "status win";
          } else if (pts > 0) {
            AudioFX.pop();
            statusEl.textContent = `+${pts} points`;
            statusEl.className = "status win";
          } else {
            AudioFX.error();
            statusEl.textContent = "Too far from zone";
            statusEl.className = "status lose";
          }
          score += pts;
          results.push(pts);
          root.querySelector("#rw-score").textContent = score;
        }
        if (round >= total) finish();
        else setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (alive) start();
        }, 1500);
      }

      function finish() {
        phase = "done";
        statusEl.textContent = `Done! Final score: ${score}/${total * 100}`;
        statusEl.className = "status win";
        AudioFX.win();
        if (score > best) {
          best = score;
          Storage.setBest("reactionwall", score);
          root.querySelector("#rw-best").textContent = score;
          App.toast("New best: " + score + " pts", "success");
        }
      }

      stopBtn.addEventListener("click", () => {
        if (phase === "running") stop(false);
      });
      startBtn.addEventListener("click", () => {
        AudioFX.click();
        round = 0;
        score = 0;
        results = [];
        root.querySelector("#rw-score").textContent = "0";
        root.querySelector("#rw-round").textContent = "0/5";
        start();
      });

      function onKey(e) {
        if (e.key === " ") {
          e.preventDefault();
          if (phase === "running") stop(false); else if (phase !== "running") {
            startBtn.click();
          }
        }
      }

      document.addEventListener("keydown", onKey);
      render();
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Reaction Wall",
        `A red "wall" approaches from the top. Stop it when it crosses the green zone in the middle.
        <br><br>Click <b>STOP</b> (or press <b>Space</b>) at the perfect moment.
        <br><br>Perfect hit = 100 pts. Close = 50 pts. Off = 20 pts. Miss = 0 pts.
        <br>5 rounds. Total possible: 500. The wall speeds up each round.`);
    },
  });
})();
