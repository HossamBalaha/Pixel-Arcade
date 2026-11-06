/* Reaction Test — wait for green, click as fast as possible, 5 rounds, average ms */
(function () {
  GameRegistry.register({
    id: "reactiontest",
    name: "Reaction Test",
    icon: "⚡",
    category: "arcade",
    description: "Wait for green, then click as fast as you can — 5 rounds",
    tags: ["arcade", "reflex", "timing"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let phase = "idle"; // idle | red | green | clicked-early | result | done
      let goTime = 0, round = 0, times = [];
      const pendingTimers = [];

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (alive) fn();
        }, ms);
        pendingTimers.push(id);
        return id;
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Round</div><div class="val" id="rt-round">1/5</div></div>
          <div class="score-cell"><div class="label">Last</div><div class="val" id="rt-last">-</div></div>
          <div class="score-cell"><div class="label">Best Avg</div><div class="val" id="rt-best">-</div></div>
        </div>
        <div class="status info" id="rt-status">Click the box to begin a round</div>
        <div class="center"><div id="rt-box" style="width:320px;height:240px;border-radius:var(--radius);background:var(--bg-elev);border:2px solid var(--border);display:grid;place-items:center;cursor:pointer;font-size:1.2rem;font-weight:700;text-align:center;padding:16px;"></div></div>
        <p class="hint">Wait for the box to turn <b style="color:var(--success);">green</b>, then click fast. Clicking early restarts the round.</p>
      `;
      const box = root.querySelector("#rt-box");
      const statusEl = root.querySelector("#rt-status");
      const best = Storage.getBest("reactiontest");
      root.querySelector("#rt-best").textContent = best ? best + "ms" : "-";

      function setBox(text, color) {
        box.textContent = text;
        box.style.background = color;
        box.style.color = "#fff";
        box.style.borderColor = color;
      }

      function nextRound() {
        if (round >= 5) {
          finish();
          return;
        }
        round++;
        phase = "red";
        setBox("Wait for green…", "var(--danger)");
        statusEl.textContent = `Round ${round}/5 — wait for green…`;
        statusEl.className = "status info";
        root.querySelector("#rt-round").textContent = round + "/5";
        const wait = 1200 + Math.random() * 2800;
        later(() => {
          if (phase !== "red") return;
          phase = "green";
          goTime = performance.now();
          setBox("CLICK!", "var(--success)");
          AudioFX.reveal();
        }, wait);
      }

      function finish() {
        phase = "done";
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        setBox(`Done!\nAvg: ${avg}ms\nClick to play again`, "var(--accent)");
        statusEl.textContent = `🎉 5 rounds done. Average: ${avg}ms`;
        statusEl.className = "status win";
        AudioFX.win();
        const best = Storage.getBest("reactiontest");
        if (best === null || avg < best) {
          Storage.setBest("reactiontest", avg);
          App.toast("New best avg: " + avg + "ms", "success");
          root.querySelector("#rt-best").textContent = avg + "ms";
        }
      }

      function onClick() {
        if (phase === "idle" || phase === "done") {
          round = 0;
          times = [];
          nextRound();
          return;
        }
        if (phase === "red") {
          // clicked early
          AudioFX.error();
          setBox("Too early!\nClick to retry round", "var(--warning)");
          statusEl.textContent = "Too early! Click the box to retry this round.";
          statusEl.className = "status lose";
          phase = "retry";
          return;
        }
        if (phase === "retry") {
          nextRound();
          return;
        }
        if (phase === "green") {
          const ms = Math.round(performance.now() - goTime);
          times.push(ms);
          AudioFX.pop();
          root.querySelector("#rt-last").textContent = ms + "ms";
          setBox(`${ms}ms\nClick for next`, "var(--accent)");
          statusEl.textContent = `${ms}ms — click for round ${round + 1}/5`;
          statusEl.className = "status win";
          phase = "between";
          return;
        }
        if (phase === "between") {
          nextRound();
          return;
        }
      }

      box.addEventListener("click", onClick);
      nextRound();
      return function cleanup() {
        alive = false;
        pendingTimers.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Reaction Test",
        `Click the box to start a round. The box turns <b>red</b> — wait.
        <br>When it turns <b>green</b>, click as fast as you can!
        <br><br>If you click while it's still red, the round restarts.
        <br>5 rounds are averaged. Lower average is better. Best average is saved.`);
    },
  });
})();
