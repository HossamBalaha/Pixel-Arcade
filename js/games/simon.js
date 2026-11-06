/* Simon Says — repeat the growing color sequence */
(function () {
  const PADS = [
    {id: 0, color: "#16a34a", light: "#4ade80", tone: 329.63},
    {id: 1, color: "#dc2626", light: "#f87171", tone: 261.63},
    {id: 2, color: "#ca8a04", light: "#facc15", tone: 392.00},
    {id: 3, color: "#2563eb", light: "#60a5fa", tone: 523.25},
  ];

  GameRegistry.register({
    id: "simon",
    name: "Simon Says",
    icon: "🎵",
    category: "arcade",
    description: "Repeat the growing color sequence from memory",
    tags: ["memory", "arcade", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let seq, userStep, playing, accepting, level;
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

      function newGame() {
        seq = [];
        level = 0;
        addStep();
      }

      function addStep() {
        seq.push(Math.floor(Math.random() * 4));
        level = seq.length;
        root.querySelector("#si-level").textContent = level;
        root.querySelector("#si-status").textContent = "Watch the sequence…";
        root.querySelector("#si-status").className = "status info";
        playSequence();
      }

      function playSequence() {
        accepting = false;
        let i = 0;
        const step = () => {
          if (i >= seq.length) {
            accepting = true;
            root.querySelector("#si-status").textContent = "Your turn — repeat the sequence!";
            root.querySelector("#si-status").className = "status info";
            userStep = 0;
            return;
          }
          flash(seq[i], 500);
          i++;
          later(step, 700);
        };
        step();
      }

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
          if (!pad) return;
          pad.style.background = orig;
          pad.style.boxShadow = "";
        }, dur);
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Level</div><div class="val" id="si-level">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="si-best">0</div></div>
        </div>
        <div class="status info" id="si-status">Get ready…</div>
        <div class="center">
          <div style="display:grid;grid-template-columns:repeat(2,140px);grid-template-rows:repeat(2,140px);gap:8px;">
            ${PADS.map(p => `<button data-pad="${p.id}" style="background:${p.color};border:3px solid var(--border-strong);border-radius:var(--radius);cursor:pointer;"></button>`).join("")}
          </div>
        </div>
        <p class="hint">Watch the sequence, then click the pads in the same order. Sequence grows each round.</p>
      `;

      const statusEl = root.querySelector("#si-status");
      root.querySelector("#si-best").textContent = Storage.getBest("simon") || 0;

      root.querySelectorAll("[data-pad]").forEach(p => p.addEventListener("click", () => {
        if (!accepting) return;
        const id = parseInt(p.dataset.pad, 10);
        flash(id, 250);
        if (id === seq[userStep]) {
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
          statusEl.textContent = `✗ Wrong! You reached level ${level}.`;
          statusEl.className = "status lose";
          AudioFX.lose();
          const best = Storage.getBest("simon") || 0;
          if (level > best) {
            Storage.setBest("simon", level);
            root.querySelector("#si-best").textContent = level;
            App.toast("New best: level " + level, "success");
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
      App.showModal("How to play Simon Says",
        `Watch the pads light up in sequence, then click the same pads in the same order.
        <br><br>Each round adds one more step to the sequence. How long can you keep up?
        <br><br>Best level is saved as your high score.`);
    },
  });
})();
