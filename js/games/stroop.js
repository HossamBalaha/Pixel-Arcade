/* Stroop Test — color words printed in different colors. Click the color of the text (not the word). */
(function () {
  const COLORS = [
    {name: "RED", value: "#ef4444"},
    {name: "GREEN", value: "#22c55e"},
    {name: "BLUE", value: "#3b82f6"},
    {name: "YELLOW", value: "#eab308"},
    {name: "PURPLE", value: "#a855f7"},
    {name: "ORANGE", value: "#f97316"},
    {name: "PINK", value: "#ec4899"},
    {name: "BROWN", value: "#92400e"},
    {name: "BLACK", value: "#111827"},
    {name: "CYAN", value: "#06b6d4"},
  ];
  GameRegistry.register({
    id: "stroop",
    name: "Stroop Test",
    icon: "🌈",
    category: "quiz",
    description: "Click the COLOR of the text — not the word it spells",
    tags: ["reflex", "color", "quiz"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let word, color, score, streak, time, timerInt, best, round, over;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="st-score">0</div></div>
          <div class="score-cell"><div class="label">Streak</div><div class="val" id="st-streak">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="st-time">30s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="st-best">0</div></div>
        </div>
        <div class="status info" id="st-status">Click the COLOR the word is printed in</div>
        <div class="center" id="st-word" style="margin:18px 0;font-size:2.4rem;font-weight:700;letter-spacing:0.1em;">READY</div>
        <div id="st-options" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:360px;margin:0 auto;"></div>
        <p class="hint">Don't read the word — pick the color you SEE. <b>R</b> restart.</p>
      `;
      const wordEl = root.querySelector("#st-word");
      const statusEl = root.querySelector("#st-status");
      const optsEl = root.querySelector("#st-options");
      best = Storage.getBest("stroop") || 0;
      root.querySelector("#st-best").textContent = best;

      function newRound() {
        word = COLORS[Math.floor(Math.random() * COLORS.length)];
        do {
          color = COLORS[Math.floor(Math.random() * COLORS.length)];
        } while (color.name === word.name && Math.random() < 0.7);
        wordEl.textContent = word.name;
        wordEl.style.color = color.value;
        statusEl.textContent = "Click the COLOR the word is printed in";
        statusEl.className = "status info";
        // shuffle color buttons
        const opts = COLORS.slice().sort(() => Math.random() - 0.5);
        optsEl.innerHTML = "";
        opts.forEach(c => {
          const btn = document.createElement("button");
          btn.className = "btn";
          btn.textContent = c.name;
          btn.style.background = c.value;
          btn.style.color = "#fff";
          btn.style.fontWeight = "700";
          btn.addEventListener("click", () => onAnswer(c));
          optsEl.appendChild(btn);
        });
      }

      function onAnswer(c) {
        if (over) {
          newGame();
          return;
        }
        if (c.name === color.name) {
          score++;
          streak++;
          AudioFX.pop();
          statusEl.textContent = "✓ Correct!";
          statusEl.className = "status win";
        } else {
          streak = 0;
          AudioFX.error();
          statusEl.textContent = "✗ Wrong — streak reset";
          statusEl.className = "status lose";
        }
        root.querySelector("#st-score").textContent = score;
        root.querySelector("#st-streak").textContent = streak;
        if (score > best) {
          best = score;
          Storage.setBest("stroop", best);
          root.querySelector("#st-best").textContent = best;
          App.toast("New best: " + best, "success");
        }
        newRound();
      }

      function newGame() {
        score = 0;
        streak = 0;
        time = 30;
        over = false;
        clearInterval(timerInt);
        timerInt = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          if (!alive) return clearInterval(timerInt);
          time--;
          root.querySelector("#st-time").textContent = time + "s";
          if (time <= 0) {
            over = true;
            clearInterval(timerInt);
            AudioFX.win();
            statusEl.textContent = `⏰ Done! Score: ${score}`;
            statusEl.className = "status win";
          }
        }, 1000);
        root.querySelector("#st-score").textContent = 0;
        root.querySelector("#st-streak").textContent = 0;
        newRound();
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") newGame();
      }

      document.addEventListener("keydown", onKey);
      newGame();
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        clearInterval(timerInt);
      };
    },
    help: function () {
      App.showModal("How to play Stroop Test",
        `A color word (like "RED" or "BLUE") is displayed — but it's printed in a different color ink.
        <br><br>Your job: click the button matching the <b>ink color</b>, not the word itself.
        <br><br>For example, if "GREEN" is printed in red ink, click <b>RED</b>.
        <br>You have 30 seconds. Score = correct answers. Best score is saved.`);
    },
  });
})();
