/* Rock Paper Scissors — best of 5 vs AI (Easy/Medium/Hard) */
(function () {
  const MOVES = ["rock", "paper", "scissors"];
  const EMOJI = {rock: "🪨", paper: "📄", scissors: "✂️"};
  const BEATS = {rock: "scissors", paper: "rock", scissors: "paper"};

  function aiMove(history, diff) {
    if (diff === "easy") return MOVES[Math.floor(Math.random() * 3)];
    if (diff === "medium") {
      // 70% counter most-frequent player move, 30% random
      if (history.length >= 2 && Math.random() < 0.7) {
        const counts = {rock: 0, paper: 0, scissors: 0};
        history.forEach(m => counts[m]++);
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        const counter = Object.keys(BEATS).find(k => BEATS[k] === top);
        return counter;
      }
      return MOVES[Math.floor(Math.random() * 3)];
    }
    // hard: predict next move by frequency, also slightly bias toward counter last move
    if (history.length === 0) return MOVES[Math.floor(Math.random() * 3)];
    // 80% counter the predicted next move
    if (Math.random() < 0.8) {
      // Pattern: assume player will repeat or counter last AI move
      const last = history[history.length - 1];
      const possible = [last, BEATS[last], Object.keys(BEATS).find(k => BEATS[last] === k)];
      const predicted = possible[Math.floor(Math.random() * possible.length)];
      return Object.keys(BEATS).find(k => BEATS[k] === predicted);
    }
    return MOVES[Math.floor(Math.random() * 3)];
  }

  GameRegistry.register({
    id: "rps",
    name: "Rock Paper Scissors",
    icon: "✊",
    category: "arcade",
    description: "Best of 5 — pick your move, beat the AI",
    tags: ["arcade", "classic", "ai"],
    mount: function (root, {App, AudioFX, Storage}) {
      let diff = "medium";
      let pScore = 0, aScore = 0, ties = 0;
      let playerHistory = [];
      let round = 1;
      let bestOf = 5;
      let over = false;

      function newMatch() {
        pScore = 0;
        aScore = 0;
        ties = 0;
        round = 1;
        over = false;
        playerHistory = [];
        render();
      }

      root.innerHTML = `
        <div class="row" style="justify-content:center;">
          <div class="difficulty" id="rps-diff">
            <button class="diff-btn ${diff === "easy" ? "active" : ""}" data-d="easy">Easy</button>
            <button class="diff-btn ${diff === "medium" ? "active" : ""}" data-d="medium">Med</button>
            <button class="diff-btn ${diff === "hard" ? "active" : ""}" data-d="hard">Hard</button>
          </div>
        </div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You</div><div class="val" id="rps-p">0</div></div>
          <div class="score-cell"><div class="label">Ties</div><div class="val" id="rps-t">0</div></div>
          <div class="score-cell"><div class="label">AI</div><div class="val" id="rps-a">0</div></div>
        </div>
        <div class="status info" id="rps-status">Round 1 — make your move!</div>
        <div class="center" style="font-size:5rem;gap:30px;display:flex;align-items:center;">
          <span id="rps-you">✊</span>
          <span class="text-muted">vs</span>
          <span id="rps-ai">✊</span>
        </div>
        <div class="row" style="justify-content:center;gap:12px;">
          ${MOVES.map(m => `<button class="btn" data-move="${m}" style="font-size:2rem;padding:14px 22px;">${EMOJI[m]}</button>`).join("")}
        </div>
        <p class="hint">Rock beats scissors · Scissors beats paper · Paper beats rock. Best of 5.</p>
      `;

      const statusEl = root.querySelector("#rps-status");
      const youEl = root.querySelector("#rps-you");
      const aiEl = root.querySelector("#rps-ai");

      function render() {
        root.querySelector("#rps-p").textContent = pScore;
        root.querySelector("#rps-a").textContent = aScore;
        root.querySelector("#rps-t").textContent = ties;
      }

      function play(move) {
        if (over) return;
        const ai = aiMove(playerHistory, diff);
        playerHistory.push(move);
        youEl.textContent = EMOJI[move];
        aiEl.textContent = EMOJI[ai];
        AudioFX.place();
        if (move === ai) {
          ties++;
          statusEl.textContent = `Round ${round}: Tie — both played ${EMOJI[move]} ${move}`;
        } else if (BEATS[move] === ai) {
          pScore++;
          statusEl.textContent = `Round ${round}: You win! ${EMOJI[move]} beats ${EMOJI[ai]}`;
          statusEl.className = "status win";
          AudioFX.win();
        } else {
          aScore++;
          statusEl.textContent = `Round ${round}: AI wins — ${EMOJI[ai]} beats ${EMOJI[move]}`;
          statusEl.className = "status lose";
          AudioFX.lose();
        }
        render();
        round++;
        const need = Math.ceil(bestOf / 2);
        if (pScore >= need) {
          over = true;
          statusEl.textContent = `🎉 You won the match ${pScore}-${aScore}!`;
          statusEl.className = "status win";
          Storage.submitScore("rps", (Storage.getBest("rps") || 0) + 1);
        } else if (aScore >= need) {
          over = true;
          statusEl.textContent = `💀 AI won the match ${aScore}-${pScore}. Try again!`;
          statusEl.className = "status lose";
        } else if (round > bestOf) {
          over = true;
          if (pScore > aScore) {
            statusEl.textContent = `🎉 Match won ${pScore}-${aScore}!`;
            statusEl.className = "status win";
            Storage.submitScore("rps", (Storage.getBest("rps") || 0) + 1);
          } else if (aScore > pScore) {
            statusEl.textContent = `💀 Match lost ${aScore}-${pScore}.`;
            statusEl.className = "status lose";
          } else {
            statusEl.textContent = `Match tied ${pScore}-${aScore} after ${bestOf} rounds.`;
          }
        }
      }

      root.querySelectorAll("[data-move]").forEach(b => b.addEventListener("click", () => {
        AudioFX.click();
        play(b.dataset.move);
      }));

      function onKey(e) {
        if (over && (e.key === "r" || e.key === "R")) {
          newMatch();
          return;
        }
        if (e.key === "1") play("rock");
        else if (e.key === "2") play("paper");
        else if (e.key === "3") play("scissors");
      }

      document.addEventListener("keydown", onKey);

      root.querySelectorAll("#rps-diff .diff-btn").forEach(b => b.addEventListener("click", () => {
        AudioFX.click();
        root.querySelectorAll("#rps-diff .diff-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        diff = b.dataset.d;
        newMatch();
      }));

      newMatch();
      return function cleanup() {
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Rock Paper Scissors",
        `Best of 5 rounds. Click ✊ Rock, 📄 Paper, or ✂️ Scissors (or press 1/2/3 on your keyboard).
        <br><br>Rules: rock beats scissors · scissors beats paper · paper beats rock.
        <br><br><b>Easy AI</b>: random. <b>Medium AI</b>: counters your most-frequent move. <b>Hard AI</b>: tries to predict your next move based on patterns.`);
    },
  });
})();
