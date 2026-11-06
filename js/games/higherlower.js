/* Higher or Lower — guess if the next number is higher or lower than the current */
(function () {
  function rand(max) {
    return Math.floor(Math.random() * (max + 1)) + 1;
  }

  GameRegistry.register({
    id: "higherlower",
    name: "Higher or Lower",
    icon: "📈",
    category: "arcade",
    description: "Guess if the next number will be higher or lower",
    tags: ["arcade", "guessing", "timer"],
    mount: function (root, {App, AudioFX, Storage}) {
      let current, score, streak, bestStreak, history, over;

      function newGame() {
        current = rand(100);
        score = 0;
        streak = 0;
        over = false;
        history = [current];
        render();
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="hl-score">0</div></div>
          <div class="score-cell"><div class="label">Streak</div><div class="val" id="hl-streak">0</div></div>
          <div class="score-cell"><div class="label">Best Streak</div><div class="val" id="hl-best">0</div></div>
        </div>
        <div class="status info" id="hl-status">Will the next number be higher or lower?</div>
        <div style="text-align:center;font-family:var(--font-mono);font-size:5rem;font-weight:700;margin:14px 0;color:var(--accent);" id="hl-current">50</div>
        <div class="row" style="justify-content:center;gap:14px;">
          <button class="btn primary" id="hl-up" style="font-size:1.4rem;padding:16px 28px;">▲ Higher</button>
          <button class="btn" id="hl-down" style="font-size:1.4rem;padding:16px 28px;">▼ Lower</button>
        </div>
        <p class="hint">Numbers are 1–100. Predict the next number. Wrong = game over. Same = still safe. Press ↑/↓.</p>
      `;

      const statusEl = root.querySelector("#hl-status");
      const best = Storage.getBest("higherlower") || 0;
      root.querySelector("#hl-best").textContent = best;

      function render() {
        root.querySelector("#hl-current").textContent = current;
        root.querySelector("#hl-score").textContent = score;
        root.querySelector("#hl-streak").textContent = streak;
        root.querySelector("#hl-best").textContent = Storage.getBest("higherlower") || 0;
      }

      function guess(higher) {
        if (over) return;
        const next = rand(100);
        const was = current;
        let correct = false;
        if (next === was) {
          // tie — keep playing but no points
          correct = true;
          statusEl.textContent = `Same number (${next}) — lucky! Keep going.`;
          statusEl.className = "status info";
          AudioFX.tick();
        } else if ((higher && next > was) || (!higher && next < was)) {
          correct = true;
          score++;
          streak++;
          statusEl.textContent = `✓ ${next} — correct!`;
          statusEl.className = "status win";
          AudioFX.win();
          if (streak > (Storage.getBest("higherlower") || 0)) {
            Storage.setBest("higherlower", streak);
            App.toast("New best streak: " + streak, "success");
          }
        } else {
          over = true;
          statusEl.textContent = `✗ ${next} — wrong! Final streak: ${streak}.`;
          statusEl.className = "status lose";
          AudioFX.lose();
        }
        current = next;
        render();
      }

      root.querySelector("#hl-up").addEventListener("click", () => {
        AudioFX.click();
        guess(true);
      });
      root.querySelector("#hl-down").addEventListener("click", () => {
        AudioFX.click();
        guess(false);
      });

      function onKey(e) {
        if (over && (e.key === "r" || e.key === "R")) {
          newGame();
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          guess(true);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          guess(false);
        }
      }

      document.addEventListener("keydown", onKey);

      newGame();
      return function cleanup() {
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Higher or Lower",
        `You see a number from 1 to 100. Predict whether the next number will be <b>higher</b> or <b>lower</b>.
        <br><br>Correct guess → +1 point and your streak continues. Wrong guess → game over. Same number → keep going.
        <br><br>Click the buttons or press <b>↑/↓</b>. Best streak is saved.`);
    },
  });
})();
