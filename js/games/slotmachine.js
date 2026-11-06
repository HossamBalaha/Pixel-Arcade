/* Slot Machine — 3 reels with 6 symbols. Spin for credits (start 100, cost 5/spin). */
(function () {
  const SYMBOLS = ["🍒", "🔔", "🍋", "🍊", "⭐", "7️⃣"];
  const PAYOUTS = {
    "🍒": 10, "🔔": 20, "🍋": 15, "🍊": 15, "⭐": 30, "7️⃣": 100,
  };
  const COST = 5;

  GameRegistry.register({
    id: "slotmachine",
    name: "Slot Machine",
    icon: "🎰",
    category: "arcade",
    description: "3-reel slot machine — start with 100 credits, 5 per spin",
    tags: ["arcade", "luck"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let credits, reels, spinning, won, best;
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
          <div class="score-cell"><div class="label">Credits</div><div class="val" id="sl-credits">100</div></div>
          <div class="score-cell"><div class="label">Last Win</div><div class="val" id="sl-win">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sl-best">100</div></div>
        </div>
        <div class="status info" id="sl-status">Spin to play! 3 matching symbols pay big.</div>
        <div class="center" style="background:var(--bg-elev);border:2px solid var(--border-strong);border-radius:var(--radius);padding:18px;margin:14px auto;max-width:340px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
          <div id="sl-r0" style="background:var(--bg-soft);border:1px solid var(--border);border-radius:var(--radius-sm);padding:18px;font-size:2.4rem;text-align:center;">🍒</div>
          <div id="sl-r1" style="background:var(--bg-soft);border:1px solid var(--border);border-radius:var(--radius-sm);padding:18px;font-size:2.4rem;text-align:center;">🔔</div>
          <div id="sl-r2" style="background:var(--bg-soft);border:1px solid var(--border);border-radius:var(--radius-sm);padding:18px;font-size:2.4rem;text-align:center;">🍋</div>
        </div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn primary" id="sl-spin" style="font-size:1.1rem;padding:10px 28px;">Spin (−5)</button>
          <button class="btn" id="sl-reset">Reset</button>
        </div>
        <p class="hint">3 of a kind = big win. 2 of a kind = small win. Cost: ${COST} credits/spin. Press <b>Space</b>.</p>
      `;
      const statusEl = root.querySelector("#sl-status");
      const spinBtn = root.querySelector("#sl-spin");
      credits = 100;
      reels = ["🍒", "🔔", "🍋"];
      won = 0;
      best = Storage.getBest("slotmachine") || 100;
      root.querySelector("#sl-best").textContent = best;

      function render() {
        for (let i = 0; i < 3; i++) root.querySelector("#sl-r" + i).textContent = reels[i];
        root.querySelector("#sl-credits").textContent = credits;
        root.querySelector("#sl-win").textContent = won;
        root.querySelector("#sl-best").textContent = best;
      }

      function spin() {
        if (spinning) return;
        if (credits < COST) {
          AudioFX.error();
          statusEl.textContent = "Out of credits! Click Reset to play again.";
          statusEl.className = "status lose";
          return;
        }
        spinning = true;
        credits -= COST;
        won = 0;
        spinBtn.disabled = true;
        statusEl.textContent = "Spinning…";
        statusEl.className = "status info";
        // animate reels one by one
        let r = 0;
        const spinReel = (i, dur) => {
          const el = root.querySelector("#sl-r" + i);
          const tick = setInterval(() => {
            if (!alive) return;
            if (!alive) return;
            el.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
          }, 80);
          later(() => {
            clearInterval(tick);
            const s = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            reels[i] = s;
            el.textContent = s;
            AudioFX.tick();
            r++;
            if (r >= 3) settle();
          }, dur);
        };
        spinReel(0, 600);
        spinReel(1, 900);
        spinReel(2, 1200);
        render();
      }

      function settle() {
        spinning = false;
        spinBtn.disabled = false;
        let prize = 0;
        if (reels[0] === reels[1] && reels[1] === reels[2]) {
          prize = PAYOUTS[reels[0]] * 3; // 3-of-a-kind
          statusEl.textContent = `🎉 Three ${reels[0]}! +${prize} credits!`;
          statusEl.className = "status win";
          AudioFX.win();
        } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
          prize = 5; // small consolation
          statusEl.textContent = `Two of a kind! +${prize} credits`;
          statusEl.className = "status info";
          AudioFX.pop();
        } else {
          statusEl.textContent = "No match. Spin again?";
          statusEl.className = "status info";
          AudioFX.lose();
        }
        credits += prize;
        won = prize;
        if (credits > best) {
          best = credits;
          Storage.setBest("slotmachine", best);
          App.toast("New best: " + best + " credits", "success");
        }
        render();
      }

      function reset() {
        credits = 100;
        won = 0;
        spinning = false;
        spinBtn.disabled = false;
        AudioFX.click();
        render();
        statusEl.textContent = "Spin to play!";
        statusEl.className = "status info";
      }

      spinBtn.addEventListener("click", spin);
      root.querySelector("#sl-reset").addEventListener("click", reset);

      function onKey(e) {
        if (e.key === " ") {
          e.preventDefault();
          spin();
        } else if (e.key === "r" || e.key === "R") reset();
      }

      document.addEventListener("keydown", onKey);
      render();
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        pendingTimers.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Slot Machine",
        `Start with 100 credits. Each spin costs ${5} credits.
        <br><br>Click <b>Spin</b> (or press <b>Space</b>) to spin the 3 reels.
        <br>Match 3 of the same symbol for a big payout:
        <br>🍒🍒🍒 = 30, 🍋🍋🍋 = 45, 🍊🍊🍊 = 45, 🔔🔔🔔 = 60, ⭐⭐⭐ = 90, 7️⃣7️⃣7️⃣ = 300.
        <br>Two of a kind pays 5 credits. Highest credits reached is saved.`);
    },
  });
})();
