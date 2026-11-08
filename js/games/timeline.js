/* Timeline — guess the year each event happened */
(function () {
  GameRegistry.register({
    id: "timeline",
    name: "Timeline",
    icon: "📅",
    category: "quiz",
    description: "Guess the year each event happened — closest wins",
    tags: ["quiz", "history", "dates"],
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
      const EVENTS = [
        {e: "The Wright brothers' first flight", y: 1903},
        {e: "The Titanic sinks", y: 1912},
        {e: "World War I begins", y: 1914},
        {e: "The end of World War II", y: 1945},
        {e: "First human in space (Gagarin)", y: 1961},
        {e: "Apollo 11 Moon landing", y: 1969},
        {e: "The Beatles break up", y: 1970},
        {e: "First Star Wars movie", y: 1977},
        {e: "The Berlin Wall falls", y: 1989},
        {e: "The World Wide Web goes public", y: 1991},
        {e: "Nelson Mandela becomes president", y: 1994},
        {e: "The first iPhone goes on sale", y: 2007},
        {e: "The fall of the Soviet Union", y: 1991},
        {e: "Woodstock festival", y: 1969},
        {e: "The Chernobyl disaster", y: 1986},
        {e: "The first Harry Potter book", y: 1997},
        {e: "Wikipedia launches", y: 2001},
        {e: "Barack Obama's first inauguration", y: 2009},
        {e: "The euro enters circulation", y: 2002},
        {e: "The Beijing Olympics", y: 2008},
        {e: "The Rwandan genocide", y: 1994},
        {e: "Live Aid concert", y: 1985},
        {e: "The Channel Tunnel opens", y: 1994},
        {e: "The Mars Curiosity rover lands", y: 2012},
        {e: "The Notre-Dame fire", y: 2019},
        {e: "The first modern Olympics", y: 1896},
        {e: "Women get the vote in the USA", y: 1920},
        {e: "The Wall Street crash", y: 1929},
        {e: "Penicillin discovered", y: 1928},
        {e: "Mount Everest first climbed", y: 1953},
      ];
      let item, score, best, round, streak;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="tl-score">0</div></div>
          <div class="score-cell"><div class="label">Round</div><div class="val" id="tl-round">1/10</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="tl-best">0</div></div>
        </div>
        <div class="status info" id="tl-status">Drag the slider to the year it happened</div>
        <div class="center" id="tl-event" style="font-size:18px;font-weight:700;margin:14px 0;max-width:440px;"></div>
        <div class="center" style="width:min(420px,92%);">
          <input type="range" id="tl-slider" min="1880" max="2025" value="1950" style="width:100%;"/>
          <div style="font-size:30px;font-weight:800;margin:8px 0;" id="tl-year">1950</div>
          <button class="btn primary" id="tl-guess">📅 Lock it in!</button>
        </div>
        <div id="tl-result" style="text-align:center;margin-top:10px;min-height:34px;"></div>
        <p class="hint" style="text-align:center;">Within 5 years = 50 pts · 10 years = 30 · 25 years = 15 · closer than that still earns 5.</p>
      `;

      const evEl = root.querySelector("#tl-event");
      const statusEl = root.querySelector("#tl-status");
      slider = root.querySelector("#tl-slider");
      const yearEl = root.querySelector("#tl-year");
      const resultEl = root.querySelector("#tl-result");
      best = Storage.getBest("timeline") || 0;
      round = 1;
      score = 0;

      slider.addEventListener("input", () => yearEl.textContent = slider.value);

      function next() {
        item = EVENTS[Math.floor(Math.random() * EVENTS.length)];
        evEl.textContent = "📅 " + item.e;
        slider.value = 1950;
        yearEl.textContent = 1950;
        resultEl.innerHTML = "";
        statusEl.textContent = `Round ${round}: when did this happen?`;
        statusEl.className = "status info";
        updateHud();
      }

      function guess() {
        const g = +slider.value;
        const d = Math.abs(g - item.y);
        let pts = 0, msg = "";
        if (d === 0) {
          pts = 100;
          msg = `🎯 BULLSEYE! Exactly ${item.y}!`;
        } else if (d <= 5) {
          pts = 50;
          msg = `🔥 Very close — it was ${item.y} (off by ${d}).`;
        } else if (d <= 10) {
          pts = 30;
          msg = `Nice — it was ${item.y} (off by ${d}).`;
        } else if (d <= 25) {
          pts = 15;
          msg = `Not bad — it was ${item.y} (off by ${d}).`;
        } else {
          pts = 5;
          msg = `It was ${item.y} — off by ${d} years.`;
        }
        score += pts;
        if (pts >= 50) AudioFX.win(); else if (pts >= 15) AudioFX.pop(); else AudioFX.error();
        resultEl.innerHTML = `<b>${msg}</b> <span style="color:var(--text-muted,#94a3b8);">+${pts} pts</span>`;
        round++;
        if (round > 10) {
          statusEl.textContent = `Game over — final score ${score}/1000`;
          statusEl.className = "status " + (score >= 400 ? "win" : "info");
          if (score > best) {
            best = score;
            Storage.setBest("timeline", score);
            App.toast("New best: " + score, "success");
          }
          updateHud();
          after(() => {
            round = 1;
            score = 0;
            next();
          }, 2600);
        } else {
          updateHud();
          after(next, 1800);
        }
      }

      function updateHud() {
        root.querySelector("#tl-score").textContent = score;
        root.querySelector("#tl-round").textContent = Math.min(round, 10) + "/10";
        root.querySelector("#tl-best").textContent = best;
      }

      root.querySelector("#tl-guess").addEventListener("click", guess);
      next();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Timeline",
        `An event appears — slide to the year you think it happened and lock it in.
        <br><br>Scoring: exact year <b>100</b> · within 5 years <b>50</b> · within 10 <b>30</b> · within 25 <b>15</b> · anything else <b>5</b>.
        Ten rounds per game, max 1000 points. History buffs, assemble!`);
    },
  });
})();
