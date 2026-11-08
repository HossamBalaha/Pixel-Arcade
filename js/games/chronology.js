/* Chronology — put the four events in the right time order */
(function () {
  GameRegistry.register({
    id: "chronology",
    name: "Chronology",
    icon: "🕰️",
    category: "quiz",
    description: "Put the four events in the right time order",
    tags: ["quiz", "history", "ordering"],
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
        {e: "Printing press invented", y: 1440},
        {e: "Columbus reaches America", y: 1492},
        {e: "Shakespeare born", y: 1564},
        {e: "Newton's Principia", y: 1687},
        {e: "French Revolution begins", y: 1789},
        {e: "Napoleon defeated at Waterloo", y: 1815},
        {e: "First steam locomotive", y: 1804},
        {e: "Darwin's Origin of Species", y: 1859},
        {e: "American Civil War", y: 1861},
        {e: "Telephone invented", y: 1876},
        {e: "First powered flight", y: 1903},
        {e: "Titanic sinks", y: 1912},
        {e: "World War I begins", y: 1914},
        {e: "Great Depression starts", y: 1929},
        {e: "World War II ends", y: 1945},
        {e: "DNA structure discovered", y: 1953},
        {e: "First human in space", y: 1961},
        {e: "Moon landing", y: 1969},
        {e: "Fall of the Berlin Wall", y: 1989},
        {e: "World Wide Web invented", y: 1989},
        {e: "Smartphones go mainstream", y: 2007},
        {e: "Fall of Constantinople", y: 1453},
        {e: "Magna Carta signed", y: 1215},
        {e: "First Olympics (ancient)", y: -776},
        {e: "Pompeii buried by Vesuvius", y: 79},
        {e: "Vikings reach America", y: 1000},
        {e: "Black Death hits Europe", y: 1347},
      ];
      let items, placed, score, best, round;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="ch-score">0</div></div>
          <div class="score-cell"><div class="label">Round</div><div class="val" id="ch-round">1/8</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ch-best">0</div></div>
        </div>
        <div class="status info" id="ch-status">Click the events from EARLIEST to LATEST</div>
        <div class="center" id="ch-bank" style="max-width:440px;margin:10px auto;"></div>
        <div class="center" id="ch-done" style="max-width:440px;margin:6px auto;min-height:36px;"></div>
      `;

      const bankEl = root.querySelector("#ch-bank");
      const doneEl = root.querySelector("#ch-done");
      const statusEl = root.querySelector("#ch-status");
      best = Storage.getBest("chronology") || 0;
      round = 1;
      score = 0;

      const style = document.createElement("style");
      style.textContent = `
        .ch-item { display:block;padding:10px 14px;margin:5px 0;border-radius:9px;background:var(--bg-soft,#334155);
                   color:var(--text,#eee);font-weight:600;cursor:pointer;border:2px solid transparent;text-align:center; }
        .ch-item.nope { border-color:#ef4444; animation:chshake .3s; }
        @keyframes chshake { 25% { transform:translateX(-4px);} 75% { transform:translateX(4px);} }
        .ch-placed { display:inline-block;padding:8px 12px;margin:3px;border-radius:8px;background:#16a34a;color:#fff;font-weight:600;font-size:14px; }
      `;
      root.appendChild(style);

      function next() {
        const pool = EVENTS.slice().sort(() => Math.random() - 0.5).slice(0, 4);
        items = pool.sort(() => Math.random() - 0.5);
        placed = [];
        statusEl.textContent = `Round ${round}: click from EARLIEST to LATEST`;
        statusEl.className = "status info";
        render();
      }

      function click(i) {
        if (placed.length >= 4) return;
        const item = items[i];
        const sorted = items.slice().sort((a, b) => a.y - b.y);
        if (item === sorted[placed.length]) {
          placed.push(item);
          AudioFX.pop();
          render();
          if (placed.length === 4) {
            score += 25;
            AudioFX.win();
            round++;
            if (round > 8) {
              if (score > best) {
                best = score;
                Storage.setBest("chronology", score);
              }
              statusEl.textContent = `🕰️ Game over — ${score} points! Restarting…`;
              statusEl.className = "status " + (score >= 150 ? "win" : "info");
              after(() => {
                round = 1;
                score = 0;
                next();
              }, 3000);
            } else {
              statusEl.textContent = `✔ Perfect order! +25. Next round…`;
              statusEl.className = "status win";
              after(next, 1200);
            }
            updateHud();
          }
        } else {
          AudioFX.error();
          const el = bankEl.children[i];
          el.classList.add("nope");
          after(() => el.classList.remove("nope"), 320);
        }
      }

      function updateHud() {
        root.querySelector("#ch-score").textContent = score;
        root.querySelector("#ch-round").textContent = Math.min(round, 8) + "/8";
        root.querySelector("#ch-best").textContent = best;
      }

      function render() {
        updateHud();
        bankEl.innerHTML = "";
        items.forEach((it, i) => {
          if (placed.includes(it)) return;
          const b = document.createElement("div");
          b.className = "ch-item";
          b.textContent = it.e + (it.y < 0 ? "" : "");
          b.addEventListener("pointerdown", () => click(i));
          bankEl.appendChild(b);
        });
        doneEl.innerHTML = placed.map((p, i) =>
          `<span class="ch-placed">${i + 1}. ${p.e} <small>(${p.y < 0 ? Math.abs(p.y) + " BC" : p.y})</small></span>`).join(" ");
      }

      next();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Chronology",
        `Four historical events appear — click them in <b>chronological order</b>, oldest first.
        Wrong picks shake and cost you nothing but pride; complete the full order for <b>+25</b>.
        <br><br>Eight rounds. Dates are revealed as you place each event — ancient Rome to the smartphone era.`);
    },
  });
})();
