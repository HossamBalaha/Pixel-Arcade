/* Memory Sequence — Simon with numbers 1-9. Show sequence, repeat it. */
(function () {
  const N = 9;
  let live = null;
  GameRegistry.register({
    id: "memorysequence",
    name: "Memory Sequence",
    icon: "🔢",
    category: "arcade",
    description: "Watch the growing number sequence, then repeat it",
    tags: ["memory", "arcade"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let seq, userStep, level, playing, accepting;
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
          <div class="score-cell"><div class="label">Level</div><div class="val" id="ms-level">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ms-best">0</div></div>
        </div>
        <div class="status info" id="ms-status">Get ready…</div>
        <div class="center"><div id="ms-grid" style="display:grid;grid-template-columns:repeat(3,80px);grid-template-rows:repeat(3,80px);gap:8px;"></div></div>
        <p class="hint">Watch the sequence of numbers, then tap them in the same order.</p>
      `;
      const gridEl = root.querySelector("#ms-grid");
      const statusEl = root.querySelector("#ms-status");
      const best = Storage.getBest("memorysequence") || 0;
      root.querySelector("#ms-best").textContent = best;

      for (let i = 1; i <= N; i++) {
        const cell = document.createElement("button");
        cell.textContent = i;
        cell.className = "cell";
        cell.style.fontSize = "1.8rem";
        cell.dataset.n = i;
        cell.style.cursor = "pointer";
        cell.addEventListener("click", () => onClick(i));
        gridEl.appendChild(cell);
      }

      function newGame() {
        seq = [];
        level = 0;
        addStep();
      }

      function addStep() {
        seq.push(1 + Math.floor(Math.random() * N));
        level = seq.length;
        root.querySelector("#ms-level").textContent = level;
        statusEl.textContent = "Watch…";
        statusEl.className = "status info";
        playSeq();
      }

      function playSeq() {
        accepting = false;
        let i = 0;
        const step = () => {
          if (i >= seq.length) {
            accepting = true;
            userStep = 0;
            statusEl.textContent = "Your turn — repeat the sequence!";
            statusEl.className = "status info";
            return;
          }
          flash(seq[i], 500);
          i++;
          later(step, 700);
        };
        step();
      }

      function flash(n, dur) {
        const el = gridEl.querySelector(`[data-n="${n}"]`);
        if (!el) return;
        const orig = el.style.background;
        el.style.background = "var(--accent)";
        el.style.color = "#fff";
        AudioFX.tick();
        later(() => {
          if (alive) {
            el.style.background = orig;
            el.style.color = "";
          }
        }, dur);
      }

      function onClick(n) {
        if (!accepting) return;
        flash(n, 250);
        if (n === seq[userStep]) {
          userStep++;
          if (userStep === seq.length) {
            accepting = false;
            statusEl.textContent = "✓ Correct! Next round…";
            statusEl.className = "status win";
            AudioFX.win();
            later(addStep, 800);
          }
        } else {
          accepting = false;
          statusEl.textContent = `✗ Wrong! Reached level ${level}.`;
          statusEl.className = "status lose";
          AudioFX.lose();
          if (level - 1 > best) {
            Storage.setBest("memorysequence", level - 1);
            root.querySelector("#ms-best").textContent = level - 1;
            App.toast("New best: level " + (level - 1), "success");
          } else if (level > 0) App.toast(`You reached level ${level}. Best: ${best}`, "info");
          later(newGame, 1800);
        }
      }

      live = {hint: null, solve: null};
      later(newGame, 600);
      return function cleanup() {
        alive = false;
        live = null;
        pendingTimers.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Memory Sequence",
        `Numbers 1–9 light up in a sequence. Watch closely.
        <br><br>When the sequence ends, tap the same numbers in the same order.
        <br>Each round adds one more number to the sequence. How long can you keep up?
        <br>Best level reached is saved.`);
    },
  });
})();
