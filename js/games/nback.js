/* N-Back — 2-back test. Show letters, ask "matches 2-back?" */
(function () {
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  let live = null;
  GameRegistry.register({
    id: "nback",
    name: "N-Back",
    icon: "🧠",
    category: "logic",
    description: "Does the current letter match the one 2 steps back?",
    tags: ["memory", "logic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let seq, idx, score, hits, misses, wrongMatches, wrongNonMatches, round, total;
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

      let timerInt = null;
      let phase = "idle";

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Round</div><div class="val" id="nb-round">0/20</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="nb-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="nb-best">0</div></div>
        </div>
        <div class="status info" id="nb-status">Click Start to begin the 2-back test</div>
        <div class="center"><div id="nb-letter" style="width:160px;height:160px;border-radius:var(--radius);background:var(--bg-elev);border:2px solid var(--border);display:grid;place-items:center;font-size:5rem;font-weight:700;">—</div></div>
        <div class="row" style="justify-content:center;gap:12px;margin-top:14px;">
          <button class="btn" id="nb-match">✓ Match (2-back)</button>
          <button class="btn primary" id="nb-no">✗ No match</button>
          <button class="btn" id="nb-start">Start</button>
        </div>
        <p class="hint">Each letter shows for ~2s. Decide if it equals the one 2 positions back.</p>
      `;
      const letterEl = root.querySelector("#nb-letter");
      const statusEl = root.querySelector("#nb-status");
      const startBtn = root.querySelector("#nb-start");
      const best = Storage.getBest("nback") || 0;
      root.querySelector("#nb-best").textContent = best;

      function nextRound() {
        if (round >= total) {
          finish();
          return;
        }
        round++;
        root.querySelector("#nb-round").textContent = round + "/" + total;
        // generate letter (40% chance to match 2-back if possible)
        const prev2 = seq[seq.length - 2];
        let letter;
        if (prev2 && Math.random() < 0.4) letter = prev2;
        else letter = LETTERS[Math.floor(Math.random() * 26)];
        seq.push(letter);
        letterEl.textContent = letter;
        statusEl.textContent = "Does it match 2 steps back?";
        statusEl.className = "status info";
        phase = "await";
        timerInt = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (phase !== "await") return;
          // no answer = treat as "no match"
          judge(false);
        }, 2500);
      }

      function judge(match) {
        if (phase !== "await") return;
        clearTimeout(timerInt);
        timerInt = null;
        const cur = seq[seq.length - 1];
        const back2 = seq[seq.length - 3];
        const isMatch = cur === back2;
        if (match === isMatch) {
          score++;
          AudioFX.pop();
          statusEl.textContent = "✓ Correct";
          statusEl.className = "status win";
        } else {
          AudioFX.error();
          statusEl.textContent = "✗ Wrong";
          statusEl.className = "status lose";
        }
        root.querySelector("#nb-score").textContent = score;
        phase = "between";
        later(nextRound, 800);
      }

      function start() {
        seq = [];
        idx = 0;
        score = 0;
        round = 0;
        total = 20;
        root.querySelector("#nb-score").textContent = "0";
        startBtn.textContent = "Restart";
        // first 2 letters: no possible 2-back match, but we still ask; they're "no match"
        nextRound();
      }

      function finish() {
        phase = "done";
        letterEl.textContent = "✓";
        statusEl.textContent = `Done! Score: ${score}/${total}`;
        statusEl.className = "status win";
        AudioFX.win();
        if (score > best) {
          Storage.setBest("nback", score);
          root.querySelector("#nb-best").textContent = score;
          App.toast("New best: " + score + "/" + total, "success");
        }
      }

      root.querySelector("#nb-match").addEventListener("click", () => {
        if (phase === "await") judge(true);
      });
      root.querySelector("#nb-no").addEventListener("click", () => {
        if (phase === "await") judge(false);
      });
      startBtn.addEventListener("click", () => {
        AudioFX.click();
        start();
      });

      live = {hint: null, solve: null};
      return function cleanup() {
        alive = false;
        live = null;
        clearTimeout(timerInt);
        pendingTimers.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play N-Back",
        `A 2-back memory test. Letters appear one at a time (about 2.5 seconds each).
        <br><br>After the first two letters, decide for each letter whether it matches the one shown <b>2 positions earlier</b>.
        <br><br>Click <b>Match</b> or <b>No match</b>. If you don't answer in time, it counts as "No match".
        <br>20 rounds total. Best score is saved.`);
    },
  });
})();
