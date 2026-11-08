/* montyhall — three doors, one car, a host who knows; switch or stay? */
(function () {
  "use strict";
  GameRegistry.register({
    id: "montyhall", name: "Monty Hall", icon: "🚪", category: "logic",
    description: "Three doors, one goat-free car — is switching worth it?", tags: ["probability", "classic", "brain"],
    age: ["teens", "adults"], difficulty: "easy", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      let carDoor = -1, picked = -1, revealed = -1, phase = "pick";
      let stats = {switchWins: 0, switchTotal: 0, stayWins: 0, stayTotal: 0};
      let switchedLast = false, rounds = 0;

      function newRound() {
        carDoor = Math.floor(Math.random() * 3);
        picked = -1;
        revealed = -1;
        phase = "pick";
        setStatus("Round " + (rounds + 1) + " — pick a door!");
        render();
      }

      function setStatus(t, cls) {
        const st = root.querySelector("#mh-status");
        if (st) {
          st.textContent = t;
          st.className = "status " + (cls || "info");
        }
      }

      function pickDoor(i) {
        if (phase !== "pick" && phase !== "decide") return;
        if (phase === "pick") {
          picked = i;
          AudioFX.click();
          // host reveals a goat (never the car, never the pick)
          const opts = [0, 1, 2].filter(d => d !== picked && d !== carDoor);
          revealed = opts[Math.floor(Math.random() * opts.length)];
          phase = "decide";
          setStatus("The host opens a door… now switch or stay?");
          render();
        }
      }

      function decide(switchIt) {
        if (phase !== "decide") return;
        let final = picked;
        if (switchIt) final = [0, 1, 2].find(d => d !== picked && d !== revealed);
        switchedLast = switchIt;
        const win = final === carDoor;
        phase = "done";
        rounds++;
        if (switchIt) {
          stats.switchTotal++;
          if (win) stats.switchWins++;
        } else {
          stats.stayTotal++;
          if (win) stats.stayWins++;
        }
        if (win) {
          AudioFX.win();
          setStatus("🎉 It's the car! You win!", "win");
        } else {
          AudioFX.lose();
          setStatus("🐐 Just a goat this time…", "lose");
        }
        App.recordResult(win, rounds);
        render();
        setTimeout(() => {
          if (alive) newRound();
        }, 2200);
      }

      root.innerHTML = `
        <style>
          .mh-doors { display: flex; gap: 14px; justify-content: center; margin: 14px 0; }
          .mh-door { width: 92px; height: 130px; border-radius: 12px; background: var(--bg-elev);
            border: 2px solid var(--border); display: grid; place-items: center; font-size: 3rem; cursor: pointer; }
          .mh-door.picked { border-color: #f59e0b; box-shadow: 0 0 10px #f59e0b66; }
          .mh-door.open { background: #1c1917; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Round</div><div class="val" id="mh-r">0</div></div>
          <div class="score-cell"><div class="label">Switch wins</div><div class="val" id="mh-sw">—</div></div>
          <div class="score-cell"><div class="label">Stay wins</div><div class="val" id="mh-st">—</div></div>
        </div>
        <div class="status info" id="mh-status">Pick a door!</div>
        <div class="mh-doors" id="mh-doors"></div>
        <div class="row" style="justify-content:center; gap:10px;">
          <button class="btn primary" id="mh-switch">🔄 Switch</button>
          <button class="btn" id="mh-stay">✋ Stay</button>
        </div>
      `;

      function render() {
        const el = root.querySelector("#mh-doors");
        let h = "";
        for (let i = 0; i < 3; i++) {
          let cls = "mh-door", inner = "🚪";
          if (i === picked && phase !== "done") cls += " picked";
          if (phase === "done" || i === revealed) {
            cls += " open";
            inner = i === carDoor ? "🚗" : "🐐";
          }
          h += `<div class="${cls}" data-i="${i}">${inner}</div>`;
        }
        el.innerHTML = h;
        const r = root.querySelector("#mh-r"), sw = root.querySelector("#mh-sw"), st = root.querySelector("#mh-st");
        if (r) r.textContent = rounds;
        if (sw) sw.textContent = stats.switchTotal ? `${stats.switchWins}/${stats.switchTotal} (${Math.round(100 * stats.switchWins / stats.switchTotal)}%)` : "—";
        if (st) st.textContent = stats.stayTotal ? `${stats.stayWins}/${stats.stayTotal} (${Math.round(100 * stats.stayWins / stats.stayTotal)}%)` : "—";
        const bS = root.querySelector("#mh-switch"), bT = root.querySelector("#mh-stay");
        bS.disabled = bT.disabled = phase !== "decide";
      }

      root.querySelector("#mh-doors").addEventListener("click", e => {
        const d = e.target.closest("[data-i]");
        if (d) pickDoor(+d.dataset.i);
      });
      root.querySelector("#mh-switch").addEventListener("click", () => decide(true));
      root.querySelector("#mh-stay").addEventListener("click", () => decide(false));

      newRound();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("The Monty Hall problem",
        "Behind one door is a 🚗; behind the other two, 🐐 goats." +
        "<br>You pick a door. The host — who knows where the car is — always opens a <i>different</i> door with a goat, then offers you to switch." +
        "<br>Should you? Play many rounds and watch the win rates: switching wins about 2/3 of the time, staying only 1/3. That's the famous paradox!");
    },
  });
})();
