/* Color Match — two color swatches; ask "Same color?" Score streak. */
(function () {
  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function hsv(h, s, v) {
    h /= 360;
    s /= 100;
    v /= 100;
    let r, g, b;
    const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
    }
    return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
  }

  GameRegistry.register({
    id: "colormatch",
    name: "Color Match",
    icon: "🎨",
    category: "logic",
    description: "Are the two colors the same? Build a streak.",
    tags: ["reflex", "color", "casual"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let c1, c2, same, streak, best, round, over = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Streak</div><div class="val" id="cm-streak">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cm-best">0</div></div>
          <div class="score-cell"><div class="label">Round</div><div class="val" id="cm-round">1</div></div>
        </div>
        <div class="status info" id="cm-status">Are these two colors the same?</div>
        <div class="row" style="justify-content:center;gap:16px;margin:14px 0;">
          <div id="cm-1" style="width:120px;height:120px;border-radius:var(--radius);border:2px solid var(--border);"></div>
          <div id="cm-2" style="width:120px;height:120px;border-radius:var(--radius);border:2px solid var(--border);"></div>
        </div>
        <div class="row" style="justify-content:center;gap:12px;">
          <button class="btn primary" id="cm-yes">Same ✓</button>
          <button class="btn danger" id="cm-no">Different ✗</button>
        </div>
        <p class="hint">Click your answer or press <b>Y</b> for same / <b>N</b> for different.</p>
      `;
      const s1 = root.querySelector("#cm-1");
      const s2 = root.querySelector("#cm-2");
      const statusEl = root.querySelector("#cm-status");
      best = Storage.getBest("colormatch") || 0;
      root.querySelector("#cm-best").textContent = best;

      function next() {
        round++;
        root.querySelector("#cm-round").textContent = round;
        const h = rand(0, 359), s = rand(45, 95), v = rand(55, 95);
        c1 = hsv(h, s, v);
        // similar with small offset to make it tricky
        const offH = rand(0, 1) ? 0 : (Math.random() < 0.5 ? rand(6, 12) : 0);
        const offV = rand(0, 1) ? 0 : rand(6, 14);
        same = offH === 0 && offV === 0;
        if (same && Math.random() < 0.4) {
          c2 = c1;
        } else if (same) c2 = c1;
        else c2 = hsv((h + offH) % 360, s, Math.max(20, v - offV));
        s1.style.background = c1;
        s2.style.background = c2;
        statusEl.textContent = "Are these two colors the same?";
        statusEl.className = "status info";
      }

      function answer(yes) {
        if (over) {
          round = 0;
          streak = 0;
          over = false;
          next();
          return;
        }
        const correct = (yes === same);
        if (correct) {
          streak++;
          AudioFX.pop();
          statusEl.textContent = `✓ Correct! Streak: ${streak}`;
          statusEl.className = "status win";
        } else {
          streak = 0;
          AudioFX.error();
          statusEl.textContent = "✗ Wrong! Streak reset";
          statusEl.className = "status lose";
        }
        root.querySelector("#cm-streak").textContent = streak;
        if (streak > best) {
          best = streak;
          Storage.setBest("colormatch", streak);
          root.querySelector("#cm-best").textContent = best;
          App.toast("New best streak: " + streak, "success");
        }
        next();
      }

      function onKey(e) {
        if (e.key === "y" || e.key === "Y") answer(true);
        else if (e.key === "n" || e.key === "N") answer(false);
        else if (e.key === "r" || e.key === "R") {
          round = 0;
          streak = 0;
          next();
        }
      }

      document.addEventListener("keydown", onKey);
      root.querySelector("#cm-yes").addEventListener("click", () => answer(true));
      root.querySelector("#cm-no").addEventListener("click", () => answer(false));
      streak = 0;
      round = 0;
      next();
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Color Match",
        `Two color swatches are shown. Decide if they are <b>exactly the same color</b> or <b>different</b>.
        <br><br>Click <b>Same</b> or <b>Different</b> (or use <b>Y</b>/<b>N</b> keys).
        <br>Each correct answer grows your streak. A wrong answer resets it. Best streak is saved.`);
    },
  });
})();
