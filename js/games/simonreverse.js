/* Simon Reverse — watch sequence, then DON'T repeat the same — pick any other pad. */
(function () {
  const PADS = [
    {id: 0, color: "#16a34a", light: "#4ade80", tone: 329.63},
    {id: 1, color: "#dc2626", light: "#f87171", tone: 261.63},
    {id: 2, color: "#ca8a04", light: "#facc15", tone: 392.00},
    {id: 3, color: "#2563eb", light: "#60a5fa", tone: 523.25},
  ];
  GameRegistry.register({
    id: "simonreverse",
    name: "Simon Reverse",
    icon: "🎶",
    category: "arcade",
    description: "Watch the sequence — then DON'T repeat it. Pick any other pad.",
    tags: ["memory", "arcade"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let seq, userStep, level, accepting;
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
          <div class="score-cell"><div class="label">Level</div><div class="val" id="sr-level">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sr-best">0</div></div>
        </div>
        <div class="status info" id="sr-status">Get ready…</div>
        <div class="center">
          <div style="display:grid;grid-template-columns:repeat(2,140px);grid-template-rows:repeat(2,140px);gap:8px;">
            ${PADS.map(p => `<button data-pad="${p.id}" style="background:${p.color};border:3px solid var(--border-strong);border-radius:var(--radius);cursor:pointer;"></button>`).join("")}
          </div>
        </div>
        <p class="hint">For each step, pick a pad <b>different</b> from the one shown. Sequence grows each round.</p>
      `;
      const statusEl = root.querySelector("#sr-status");
      root.querySelector("#sr-best").textContent = Storage.getBest("simonreverse") || 0;

      function flash(id, dur) {
        const pad = root.querySelector(`[data-pad="${id}"]`);
        if (!pad) return;
        const orig = PADS[id].color;
        pad.style.background = PADS[id].light;
        pad.style.boxShadow = "0 0 20px " + PADS[id].light;
        try {
          const ac = window.AudioContext ? new AudioContext() : null;
          if (ac) {
            const o = ac.createOscillator();
            const g = ac.createGain();
            o.frequency.value = PADS[id].tone;
            o.type = "sine";
            g.gain.setValueAtTime(0.15, ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur / 1000));
            o.connect(g).connect(ac.destination);
            o.start();
            o.stop(ac.currentTime + dur / 1000);
          }
        } catch (e) {
        }
        later(() => {
          if (alive) {
            pad.style.background = orig;
            pad.style.boxShadow = "";
          }
        }, dur);
      }

      function newGame() {
        seq = [];
        level = 0;
        addStep();
      }

      function addStep() {
        seq.push(Math.floor(Math.random() * 4));
        level = seq.length;
        root.querySelector("#sr-level").textContent = level;
        statusEl.textContent = "Watch…";
        statusEl.className = "status info";
        accepting = false;
        let i = 0;
        const step = () => {
          if (i >= seq.length) {
            accepting = true;
            userStep = 0;
            statusEl.textContent = "Your turn — pick a DIFFERENT pad each time!";
            statusEl.className = "status info";
            return;
          }
          flash(seq[i], 500);
          i++;
          later(step, 700);
        };
        step();
      }

      root.querySelectorAll("[data-pad]").forEach(p => p.addEventListener("click", () => {
        if (!accepting) return;
        const id = parseInt(p.dataset.pad, 10);
        flash(id, 250);
        if (id === seq[userStep]) {
          accepting = false;
          statusEl.textContent = `✗ You matched! Wrong — reached level ${level}.`;
          statusEl.className = "status lose";
          AudioFX.lose();
          const best = Storage.getBest("simonreverse") || 0;
          if (level - 1 > best) {
            Storage.setBest("simonreverse", level - 1);
            root.querySelector("#sr-best").textContent = level - 1;
            App.toast("New best: level " + (level - 1), "success");
          }
          later(newGame, 1500);
        } else {
          userStep++;
          if (userStep === seq.length) {
            accepting = false;
            statusEl.textContent = "✓ Survived! Next round…";
            statusEl.className = "status win";
            AudioFX.win();
            later(addStep, 800);
          }
        }
      }));

      later(newGame, 600);
      return function cleanup() {
        alive = false;
        pendingTimers.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Simon Reverse",
        `Watch the pad sequence — but don't repeat it!
        <br><br>For each step in the sequence, click any pad <b>except</b> the one shown. Pick a different pad and you survive.
        <br>If you click the same pad as the sequence shows, you lose.
        <br><br>The sequence grows each round. Best level reached is saved.`);
    },
  });
})();
