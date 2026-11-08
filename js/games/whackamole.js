/* Whack-a-Mole — bonk the moles before they duck back down */
(function () {
  GameRegistry.register({
    id: "whackamole",
    name: "Whack-a-Mole",
    icon: "🔨",
    category: "arcade",
    description: "Bonk the moles before they duck back down",
    tags: ["arcade", "reflex", "kids"],
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
      let score, best, timeLeft, moles, over, timer, hud;
      const DURATION = 30;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="wa-score">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="wa-time">30</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="wa-best">0</div></div>
        </div>
        <div class="status info" id="wa-status">Tap the moles 🐹 — golden moles are worth double!</div>
        <div class="center"><div class="wa-grid" id="wa-grid"></div></div>
        <p class="hint">Beware the 🌵 cacti — hitting one costs 15 points.</p>
      `;

      const grid = root.querySelector("#wa-grid");
      const statusEl = root.querySelector("#wa-status");
      best = Storage.getBest("whackamole") || 0;
      let bestEl = () => root.querySelector("#wa-best");

      // build 9 holes
      const holes = [];
      for (let i = 0; i < 9; i++) {
        const h = document.createElement("div");
        h.className = "wa-hole";
        h.innerHTML = `<div class="wa-pit"></div><div class="wa-mole"></div>`;
        grid.appendChild(h);
        holes.push({el: h, mole: h.querySelector(".wa-mole"), up: null});
        h.addEventListener("pointerdown", () => whack(i));
      }

      function reset() {
        score = 0;
        timeLeft = DURATION;
        over = false;
        holes.forEach(h => {
          h.up = null;
          h.mole.className = "wa-mole";
          h.mole.textContent = "";
        });
        updateHud();
        statusEl.textContent = "Tap the moles 🐹 — golden moles are worth double!";
        statusEl.className = "status info";
        clearInterval(timer);
        timer = setInterval(tickSec, 1000);
        schedule();
      }

      function updateHud() {
        root.querySelector("#wa-score").textContent = score;
        root.querySelector("#wa-time").textContent = timeLeft;
        bestEl().textContent = best;
      }

      function tickSec() {
        timeLeft--;
        updateHud();
        if (timeLeft <= 0) {
          clearInterval(timer);
          over = true;
          holes.forEach(h => {
            clearTimeout(h.up && h.up.to);
            h.mole.className = "wa-mole";
          });
          statusEl.textContent = `Time! Final score ${score}`;
          statusEl.className = "status " + (score >= 200 ? "win" : "lose");
          if (score > best) {
            best = score;
            Storage.setBest("whackamole", score);
            App.toast("New best: " + score, "success");
          }
          updateHud();
        }
      }

      function schedule() {
        if (over) return;
        const speedUp = Math.max(450, 1100 - score * 2);
        after(() => {
          popMole();
          schedule();
        }, speedUp * (0.6 + Math.random() * 0.8));
      }

      function popMole() {
        if (over) return;
        const free = holes.map((h, i) => ({h, i})).filter(x => !x.h.up);
        if (!free.length) return;
        const pick = free[Math.floor(Math.random() * free.length)];
        const golden = Math.random() < 0.15;
        const cactus = !golden && Math.random() < 0.18;
        const emoji = cactus ? "🌵" : golden ? "🐹" : "🐹";
        pick.h.mole.textContent = emoji;
        pick.h.mole.className = "wa-mole up" + (golden ? " golden" : "");
        pick.h.up = {kind: cactus ? "cactus" : golden ? "golden" : "mole", hit: false};
        const dwell = golden ? 700 : cactus ? 900 : Math.max(500, 1200 - score * 3);
        pick.h.up.to = after(() => {
          if (pick.h.up && !pick.h.up.hit && pick.h.up.kind !== "cactus") {
            // escaped normally; no penalty
          }
          pick.h.up = null;
          pick.h.mole.className = "wa-mole";
        }, dwell);
      }

      function whack(i) {
        if (over || !holes[i].up || holes[i].up.hit) return;
        holes[i].up.hit = true;
        const kind = holes[i].up.kind;
        clearTimeout(holes[i].up.to);
        holes[i].mole.className = "wa-mole";
        if (kind === "cactus") {
          score = Math.max(0, score - 15);
          AudioFX.error();
        } else if (kind === "golden") {
          score += 20;
          AudioFX.win();
        } else {
          score += 10;
          AudioFX.pop();
        }
        holes[i].up = null;
        updateHud();
      }

      const onKey = (e) => {
        if (e.key.toLowerCase() === "r" && over) reset();
      };
      document.addEventListener("keydown", onKey);

      // inject styles (scoped by class prefix)
      const style = document.createElement("style");
      style.textContent = `
        .wa-grid { display:grid; grid-template-columns:repeat(3,92px); gap:14px; justify-content:center; padding:16px; }
        .wa-hole { position:relative; width:92px; height:92px; cursor:pointer; }
        .wa-pit { position:absolute; bottom:0; left:4px; right:4px; height:26px; background:var(--bg-inset,#1c1917); border-radius:50%; box-shadow:inset 0 3px 8px rgba(0,0,0,0.6); }
        .wa-mole { position:absolute; left:50%; bottom:8px; transform:translate(-50%,105%); font-size:46px; line-height:1; transition:transform .12s ease-out; user-select:none; }
        .wa-mole.up { transform:translate(-50%,0); }
        .wa-mole.golden { filter:drop-shadow(0 0 8px #fbbf24); }
      `;
      root.appendChild(style);

      reset();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        clearInterval(timer);
        document.removeEventListener("keydown", onKey);
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Whack-a-Mole",
        `Moles pop out of the holes for a moment — tap them before they duck away. Each hit is <b>+10</b>.
        <br><br>🐹 <b>Golden moles</b> (glowing) are worth <b>+20</b> but vanish faster.
        🌵 <b>Cacti</b> pop up too — bonking one costs <b>15 points</b>, so look before you smash.
        30 seconds per round; moles speed up as your score grows.`);
    },
  });
})();
