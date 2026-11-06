/* Coin Flip — heads/tails, predict streak. */
(function () {
  GameRegistry.register({
    id: "coinflip",
    name: "Coin Flip",
    icon: "🪙",
    category: "arcade",
    description: "Predict heads or tails — build a streak",
    tags: ["luck", "arcade"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let streak, best, total, correct, flipping;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Streak</div><div class="val" id="cf-streak">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cf-best">0</div></div>
          <div class="score-cell"><div class="label">Accuracy</div><div class="val" id="cf-acc">-</div></div>
        </div>
        <div class="status info" id="cf-status">Pick Heads or Tails — can you predict the flip?</div>
        <div class="center"><div id="cf-coin" style="width:140px;height:140px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-2));display:grid;place-items:center;font-size:3rem;color:#fff;font-weight:700;margin:20px auto;box-shadow:0 4px 12px rgba(0,0,0,0.3);">?</div></div>
        <div class="row" style="justify-content:center;gap:12px;">
          <button class="btn" id="cf-h" style="font-size:1.1rem;padding:10px 24px;">Heads</button>
          <button class="btn" id="cf-t" style="font-size:1.1rem;padding:10px 24px;">Tails</button>
        </div>
        <p class="hint">Each correct call extends your streak. Wrong call resets to 0.</p>
      `;
      const coinEl = root.querySelector("#cf-coin");
      const statusEl = root.querySelector("#cf-status");
      best = Storage.getBest("coinflip") || 0;
      root.querySelector("#cf-best").textContent = best;
      streak = 0;
      total = 0;
      correct = 0;

      function flip(guess) {
        if (flipping) return;
        flipping = true;
        coinEl.textContent = "…";
        coinEl.style.color = "#fff";
        // animate
        let n = 0;
        const spin = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          coinEl.textContent = Math.random() < 0.5 ? "H" : "T";
          n++;
          if (n > 8) {
            clearInterval(spin);
            const result = Math.random() < 0.5 ? "H" : "T";
            coinEl.textContent = result;
            const win = result === guess;
            total++;
            if (win) {
              streak++;
              correct++;
              AudioFX.win();
              statusEl.textContent = `✓ ${result === "H" ? "Heads" : "Tails"} — correct! Streak: ${streak}`;
              statusEl.className = "status win";
            } else {
              streak = 0;
              AudioFX.lose();
              statusEl.textContent = `✗ ${result === "H" ? "Heads" : "Tails"} — wrong. Streak reset`;
              statusEl.className = "status lose";
            }
            root.querySelector("#cf-streak").textContent = streak;
            root.querySelector("#cf-acc").textContent = correct + "/" + total + " (" + Math.round(correct / total * 100) + "%)";
            if (streak > best) {
              best = streak;
              Storage.setBest("coinflip", best);
              root.querySelector("#cf-best").textContent = best;
              App.toast("New best streak: " + streak, "success");
            }
            flipping = false;
          }
        }, 80);
      }

      root.querySelector("#cf-h").addEventListener("click", () => {
        AudioFX.click();
        flip("H");
      });
      root.querySelector("#cf-t").addEventListener("click", () => {
        AudioFX.click();
        flip("T");
      });

      function onKey(e) {
        if (e.key === "h" || e.key === "H") flip("H");
        else if (e.key === "t" || e.key === "T") flip("T");
      }

      document.addEventListener("keydown", onKey);
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Coin Flip",
        `Predict whether the coin will land on <b>Heads</b> or <b>Tails</b>.
        <br><br>Each correct call extends your streak. A wrong call resets the streak to 0.
        <br>Best streak is saved. Keys: <b>H</b> for Heads, <b>T</b> for Tails.`);
    },
  });
})();
