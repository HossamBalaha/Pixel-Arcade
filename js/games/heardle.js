/* Tone Memory (Heardle) — listen to a growing tone sequence and guess the next note */
(function () {
  const FREQS = [262, 294, 330, 349, 392, 440, 494, 523];
  const NAMES = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
  const ROUNDS = 5;
  const LIVES = 3;
  // Sequence length = ROUNDS + 1 (one "starter" tone + ROUNDS predicted tones).
  const SEQ_LEN = ROUNDS + 1;
  const POOL = FREQS.length;

  let audioCtx = null;

  function getCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function playTone(freq, dur = 0.5, vol = 0.18) {
    const ac = getCtx();
    if (!ac) return;
    try {
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) {
    }
  }

  GameRegistry.register({
    id: "heardle",
    name: "Tone Memory",
    icon: "🎵",
    category: "arcade",
    description: "Listen to the growing tone sequence, guess the next note — 3 lives",
    tags: ["memory", "audio", "arcade"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
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

      let seq = [];      // array of indices into FREQS
      let round = 0;     // 0..ROUNDS-1
      let lives = LIVES;
      let score = 0;
      let over = false;
      let playing = false;
      let answered = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Round</div><div class="val" id="hd-round">1/${ROUNDS}</div></div>
          <div class="score-cell"><div class="label">Lives</div><div class="val" id="hd-lives">❤️❤️❤️</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="hd-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="hd-best">—</div></div>
        </div>
        <div class="status info" id="hd-status">Listen… then guess the next note</div>
        <div id="hd-progress" style="display:flex;justify-content:center;gap:6px;font-size:1.6rem;min-height:2rem;"></div>
        <div class="row" style="justify-content:center;gap:10px;margin-top:8px;">
          <button class="btn" id="hd-replay">🔊 Replay tones</button>
        </div>
        <div class="quiz-options" id="hd-options" style="margin-top:14px;"></div>
        <p class="hint">Each round plays one more tone. Predict the next note from the 4 options. 3 lives — wrong guess costs a life. Survive ${ROUNDS} rounds to win.</p>
      `;

      const statusEl = root.querySelector("#hd-status");
      const progEl = root.querySelector("#hd-progress");
      const optsEl = root.querySelector("#hd-options");
      const replayBtn = root.querySelector("#hd-replay");

      function renderLives() {
        root.querySelector("#hd-lives").textContent = "❤️".repeat(Math.max(0, lives)) + "🖤".repeat(Math.max(0, LIVES - lives));
      }

      function renderScore() {
        root.querySelector("#hd-score").textContent = score;
      }

      function renderRound() {
        root.querySelector("#hd-round").textContent = `${Math.min(round + 1, ROUNDS)}/${ROUNDS}`;
      }

      function playSeq(count) {
        playing = true;
        replayBtn.disabled = true;
        progEl.innerHTML = "";
        let i = 0;
        const step = () => {
          if (i >= count) {
            playing = false;
            replayBtn.disabled = false;
            statusEl.textContent = `What comes next? Pick the note that follows the ${count} tone${count === 1 ? "" : "s"}.`;
            statusEl.className = "status info";
            renderOptions();
            return;
          }
          const toneIdx = seq[i];
          playTone(FREQS[toneIdx], 0.45, 0.18);
          AudioFX.tick();
          const dot = document.createElement("span");
          dot.textContent = "●";
          dot.style.color = "var(--accent)";
          progEl.appendChild(dot);
          i++;
          later(step, 600);
        };
        statusEl.textContent = `Playing ${count} tone${count === 1 ? "" : "s"}…`;
        statusEl.className = "status info";
        step();
      }

      function renderOptions() {
        optsEl.innerHTML = "";
        // Correct answer: seq[round + 1]
        const correct = seq[round + 1];
        // Build 4 options: correct + 3 random different from correct
        const pool = [];
        for (let i = 0; i < POOL; i++) if (i !== correct) pool.push(i);
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const wrongs = pool.slice(0, 3);
        const opts = [correct, ...wrongs];
        for (let i = opts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [opts[i], opts[j]] = [opts[j], opts[i]];
        }
        answered = false;
        opts.forEach((idx, k) => {
          const b = document.createElement("button");
          b.className = "quiz-opt";
          b.dataset.idx = idx;
          b.innerHTML = `<b>${String.fromCharCode(65 + k)}.</b> ${NAMES[idx]} <span style="float:right;font-size:0.9rem;color:var(--text-muted);">🔊 play</span>`;
          b.addEventListener("click", () => {
            // First click on the option's "play" area: play the tone. Then the next click on the button submits.
            if (!answered) {
              playTone(FREQS[idx], 0.4, 0.18);
              AudioFX.click();
            }
            answer(idx, b);
          });
          optsEl.appendChild(b);
        });
        // Allow hover-to-play (no, that'd be too noisy). Add a "play" click via right side.
      }

      function answer(pickedIdx, btn) {
        if (answered) return;
        answered = true;
        const correct = seq[round + 1];
        if (pickedIdx === correct) {
          score++;
          btn.classList.add("correct");
          statusEl.textContent = `✓ Correct! That was ${NAMES[correct]}.`;
          statusEl.className = "status win";
          AudioFX.win();
          renderScore();
        } else {
          lives--;
          btn.classList.add("wrong");
          // Highlight the correct one
          optsEl.querySelectorAll(".quiz-opt").forEach(b => {
            if (parseInt(b.dataset.idx, 10) === correct) b.classList.add("correct");
            b.classList.add("disabled");
          });
          statusEl.textContent = `✗ Wrong. The answer was ${NAMES[correct]}. ${lives} ${lives === 1 ? "life" : "lives"} left.`;
          statusEl.className = "status lose";
          AudioFX.lose();
          renderLives();
        }
        later(next, 1300);
      }

      function next() {
        if (lives <= 0) {
          gameOver(false);
          return;
        }
        round++;
        if (round >= ROUNDS) {
          gameOver(true);
          return;
        }
        renderRound();
        startRound();
      }

      function startRound() {
        playSeq(round + 1);
      }

      function gameOver(won) {
        over = true;
        if (won) {
          statusEl.textContent = `🎉 You survived all ${ROUNDS} rounds! Final score: ${score}/${ROUNDS} (${lives} live${lives === 1 ? "" : "s"} left).`;
          statusEl.className = "status win";
          AudioFX.win();
          // Best = highest score, tiebreak by lives
          const metric = score * 10 + lives;
          const best = Storage.getBest("heardle");
          if (!best || metric > best) {
            Storage.setBest("heardle", metric);
            root.querySelector("#hd-best").textContent = `${score}/${ROUNDS} · ❤${lives}`;
            App.toast(`New best: ${score}/${ROUNDS} with ${lives} live${lives === 1 ? "" : "s"}!`, "success");
          } else {
            root.querySelector("#hd-best").textContent = `${score}/${ROUNDS} · ❤${lives}`;
          }
        } else {
          statusEl.textContent = `💀 Out of lives. You reached round ${Math.min(round + 1, ROUNDS)} with score ${score}/${ROUNDS}.`;
          statusEl.className = "status lose";
          AudioFX.lose();
          const metric = score * 10 + lives;
          const best = Storage.getBest("heardle");
          if (!best || metric > best) {
            Storage.setBest("heardle", metric);
            root.querySelector("#hd-best").textContent = `${score}/${ROUNDS} · ❤${lives}`;
          } else {
            root.querySelector("#hd-best").textContent = `${score}/${ROUNDS} · ❤${lives}`;
          }
        }
        // Show full sequence
        progEl.innerHTML = "";
        for (let i = 0; i < seq.length; i++) {
          const span = document.createElement("span");
          span.textContent = NAMES[seq[i]];
          span.style.fontFamily = "var(--font-mono)";
          span.style.fontSize = "1rem";
          span.style.color = i === round + 1 ? "var(--accent)" : "var(--text)";
          span.style.fontWeight = i === round + 1 ? "700" : "400";
          progEl.appendChild(span);
          if (i < seq.length - 1) progEl.appendChild(document.createTextNode(" → "));
        }
        // Restart button
        optsEl.innerHTML = "";
        const b = document.createElement("button");
        b.className = "btn primary";
        b.textContent = "Play again";
        b.style.margin = "8px auto 0";
        b.addEventListener("click", newGame);
        optsEl.appendChild(b);
        replayBtn.disabled = true;
      }

      replayBtn.addEventListener("click", () => {
        if (over || playing || answered) return;
        playSeq(round + 1);
      });

      function newGame() {
        seq = [];
        for (let i = 0; i < SEQ_LEN; i++) seq.push(Math.floor(Math.random() * POOL));
        round = 0;
        lives = LIVES;
        score = 0;
        over = false;
        playing = false;
        answered = false;
        renderLives();
        renderScore();
        renderRound();
        const best = Storage.getBest("heardle");
        root.querySelector("#hd-best").textContent = best ? `${Math.floor(best / 10)}/${ROUNDS} · ❤${best % 10}` : "—";
        replayBtn.disabled = false;
        statusEl.textContent = "Listen… then guess the next note";
        statusEl.className = "status info";
        // Start first round after a short delay
        later(startRound, 400);
      }

      newGame();

      return function cleanup() {
        alive = false;
        pendingTimers.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Tone Memory",
        `A <b>tone sequence</b> of ${5 + 1} notes is generated randomly from an 8-note pool (C4 to C5).
        <br><br>The game has <b>${5} rounds</b>. On round N, you hear the first N notes played in order, then pick <b>the next note</b> from 4 multiple-choice options.
        <br><br>Click any option to <b>play</b> that note first — then click again to lock in your answer.
        <br><br>You start with <b>3 lives</b>. A wrong guess costs a life. Reach 0 lives and it's game over.
        <br><br>Survive all ${5} rounds to win. Score = number of correct guesses (out of ${5}).
        <br><br>Use the <b>🔊 Replay tones</b> button to hear the current round's tones again before answering.
        <br><br>Best score = highest score, with lives remaining as a tiebreaker.`);
    },
  });
})();
