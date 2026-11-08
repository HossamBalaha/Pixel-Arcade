/* Estimation — closest guess wins */
(function () {
  GameRegistry.register({
    id: "estimation",
    name: "Estimation",
    icon: "🤔",
    category: "quiz",
    description: "Closest guess wins — numbers too big to know exactly",
    tags: ["quiz", "numbers", "estimation"],
    mount: function (root, {App, AudioFX, Storage}) {

      // tracked timers — all cleared on cleanup so no stale callback runs after close
      let __t = [];
      const after = (fn, ms) => {
        const h = setTimeout(() => {
          __t = __t.filter(x => x !== h);
          fn();
        }, ms);
        __t.push(h);
        return h;
      };
      const QS = [
        {q: "How tall is the Eiffel Tower (meters)?", a: 330},
        {q: "How many bones are in an adult human body?", a: 206},
        {q: "Distance from Earth to the Moon (thousand km)?", a: 384},
        {q: "How many keys on a standard piano?", a: 88},
        {q: "Top speed of a cheetah (km/h)?", a: 120},
        {q: "How many days in a leap year?", a: 366},
        {q: "Depth of the deepest ocean point (meters)?", a: 10935},
        {q: "How many heartbeats per day for an average adult?", a: 100000},
        {q: "Length of the Great Wall of China (thousand km)?", a: 21},
        {q: "Population of Japan (millions)?", a: 124},
        {q: "How many squares on a chessboard?", a: 64},
        {q: "Weight of an adult blue whale (tonnes)?", a: 150},
        {q: "Speed of light (thousand km/s)?", a: 300},
        {q: "How many minutes in a week?", a: 10080},
        {q: "Height of Mount Everest (meters)?", a: 8849},
        {q: "How many genes does a human have (thousands)?", a: 20},
        {q: "Average lifetime of a housefly (days)?", a: 28},
        {q: "How many Beatles studio albums?", a: 12},
        {q: "Surface area of a football pitch (thousand m²)?", a: 7},
        {q: "How many hairs on a human head (thousands)?", a: 100},
      ];
      let item, score, best, round;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="es-score">0</div></div>
          <div class="score-cell"><div class="label">Round</div><div class="val" id="es-round">1/8</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="es-best">0</div></div>
        </div>
        <div class="status info" id="es-status">Type your estimate — closest to the truth scores</div>
        <div class="center" id="es-q" style="font-size:18px;font-weight:700;margin:14px 0;max-width:440px;"></div>
        <div class="center">
          <input id="es-in" type="number" style="width:180px;padding:10px 14px;font-size:19px;text-align:center;border-radius:9px;background:var(--bg-soft,#334155);color:var(--text,#eee);border:2px solid var(--bg-inset,#1f2937);"/>
          <div style="margin-top:10px;"><button class="btn primary" id="es-go">🤔 Estimate!</button></div>
        </div>
        <div id="es-result" style="text-align:center;margin-top:12px;min-height:40px;"></div>
        <p class="hint" style="text-align:center;">Within 10% = 50 pts · 25% = 30 · 50% = 15 · 2× off = 5.</p>
      `;

      const qEl = root.querySelector("#es-q");
      const statusEl = root.querySelector("#es-status");
      const inEl = root.querySelector("#es-in");
      const resultEl = root.querySelector("#es-result");
      best = Storage.getBest("estimation") || 0;
      round = 1;
      score = 0;

      function next() {
        item = QS[Math.floor(Math.random() * QS.length)];
        qEl.textContent = "🤔 " + item.q;
        inEl.value = "";
        resultEl.innerHTML = "";
        statusEl.textContent = `Round ${round} of 8 — take your best guess`;
        statusEl.className = "status info";
        updateHud();
        after(() => inEl.focus(), 50);
      }

      function guess() {
        const g = parseFloat(inEl.value);
        if (isNaN(g) || g <= 0) {
          AudioFX.error();
          return;
        }
        const ratio = Math.max(g, item.a) / Math.min(g, item.a);
        let pts, msg;
        if (ratio <= 1.1) {
          pts = 50;
          msg = `🎯 Nailed it — almost exact! (${item.a})`;
        } else if (ratio <= 1.25) {
          pts = 30;
          msg = `🔥 Close! The answer is ${item.a}.`;
        } else if (ratio <= 1.5) {
          pts = 15;
          msg = `Decent — the answer is ${item.a}.`;
        } else if (ratio <= 2) {
          pts = 5;
          msg = `Right ballpark — it's ${item.a}.`;
        } else {
          pts = 0;
          msg = `Not this time — the answer is ${item.a}.`;
        }
        score += pts;
        if (pts >= 30) AudioFX.win(); else if (pts > 0) AudioFX.pop(); else AudioFX.error();
        resultEl.innerHTML = `<b>${msg}</b> <span style="color:var(--text-muted,#94a3b8);">+${pts} pts</span>`;
        round++;
        if (round > 8) {
          statusEl.textContent = `Game over — final score ${score}/400`;
          statusEl.className = "status " + (score >= 200 ? "win" : "info");
          if (score > best) {
            best = score;
            Storage.setBest("estimation", score);
            App.toast("New best: " + score, "success");
          }
          updateHud();
          after(() => {
            round = 1;
            score = 0;
            next();
          }, 3000);
        } else {
          updateHud();
          after(next, 2000);
        }
      }

      function updateHud() {
        root.querySelector("#es-score").textContent = score;
        root.querySelector("#es-round").textContent = Math.min(round, 8) + "/8";
        root.querySelector("#es-best").textContent = best;
      }

      root.querySelector("#es-go").addEventListener("click", guess);
      inEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") guess();
      });
      next();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Estimation",
        `Fermi-style number sense! Questions with answers too big (or too odd) to know exactly —
        how many hairs on a head? how deep is the ocean?
        <br><br>Type an estimate. Scoring by ratio: within <b>10%</b> = 50 pts · <b>25%</b> = 30 · <b>50%</b> = 15 ·
        within <b>double</b> = 5. Eight rounds. Order of magnitude thinking wins games.`);
    },
  });
})();
