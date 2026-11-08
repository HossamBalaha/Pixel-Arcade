/* Pig Dice — classic jeopardy dice: roll to build a turn total, hold to bank it,
   but roll a 1 and lose everything unbanked. First to 100 wins. */
(function () {
  "use strict";

  // Pip positions (percentages) for faces 1-6 — pretty CSS dice, no images.
  const PIP = {
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[30, 30], [50, 50], [70, 70]],
    4: [[30, 30], [30, 70], [70, 30], [70, 70]],
    5: [[30, 30], [30, 70], [50, 50], [70, 30], [70, 70]],
    6: [[30, 30], [30, 70], [50, 30], [50, 70], [70, 30], [70, 70]],
  };

  function faceHTML(v) {
    return PIP[v].map(p => `<span class="pd-pip" style="left:${p[0]}%;top:${p[1]}%"></span>`).join("");
  }

  GameRegistry.register({
    id: "pigdice",
    name: "Pig Dice",
    icon: "🐷",
    category: "strategy",
    description: "Jeopardy dice vs the pig-bot: roll to grow your turn total, hold to bank it — but roll a 1 and lose it all. First to 100 wins.",
    tags: ["dice", "classic", "press-your-luck", "ai"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "medium",
    players: "either",
    mount: function (root, ctx) {
      const {App, AudioFX, Storage} = ctx;
      let alive = true, gen = 0;
      let busy = false, over = false, turn = "you", turnPts = 0;
      let youScore = 0, botScore = 0;
      const timeouts = [];
      const intervals = [];

      function later(fn, ms) {
        const g = gen;
        const id = setTimeout(() => {
          if (alive && g === gen) fn();
        }, ms);
        timeouts.push(id);
        return id;
      }

      if (!document.getElementById("pd-style")) {
        const s = document.createElement("style");
        s.id = "pd-style";
        s.textContent = `
          .pd-die { width: 112px; height: 112px; background: var(--bg-elev); border: 2px solid var(--border);
            border-radius: 20px; position: relative; box-shadow: 0 6px 18px rgba(0,0,0,.3); }
          .pd-pip { position: absolute; width: 21%; height: 21%; background: var(--text); border-radius: 50%;
            transform: translate(-50%, -50%); }
          .pd-rolling { animation: pd-shake .14s infinite; }
          @keyframes pd-shake { 0%{transform:rotate(-7deg) scale(1.02)} 50%{transform:rotate(7deg)} 100%{transform:rotate(-7deg) scale(1.02)} }
          .pd-active { outline: 3px solid var(--accent); outline-offset: 2px; }
          .pd-turnbadge { display:inline-block; padding:2px 10px; border-radius:999px; background:var(--accent);
            color:#fff; font-family:var(--font-mono); font-size:.8rem; font-weight:700; }
        `;
        document.head.appendChild(s);
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell" id="pd-cell-you"><div class="label">You</div><div class="val" id="pd-you">0</div></div>
          <div class="score-cell" id="pd-cell-bot"><div class="label">Pig-bot</div><div class="val" id="pd-bot">0</div></div>
          <div class="score-cell"><div class="label">Turn pts</div><div class="val" id="pd-turn">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="pd-best">—</div></div>
        </div>
        <div class="status info" id="pd-status">Loading…</div>
        <div class="center" style="margin:18px 0;">
          <div class="pd-die" id="pd-die">${faceHTML(1)}</div>
        </div>
        <div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap;">
          <button class="btn primary" id="pd-roll">Roll</button>
          <button class="btn" id="pd-hold">Hold</button>
          <button class="btn" id="pd-new">New game</button>
        </div>
        <p class="hint">Roll adds to your turn total — rolling a 1 loses all unbanked turn points and ends your turn.
        Hold banks the turn total into your score. First to <b>100</b> wins. The pig-bot holds once its turn reaches 20+.</p>
      `;

      const dieEl = root.querySelector("#pd-die");
      const statusEl = root.querySelector("#pd-status");
      const rollB = root.querySelector("#pd-roll");
      const holdB = root.querySelector("#pd-hold");

      function setStatus(text, cls) {
        statusEl.textContent = text;
        statusEl.className = "status " + (cls || "info");
      }

      function render() {
        root.querySelector("#pd-you").textContent = youScore;
        root.querySelector("#pd-bot").textContent = botScore;
        root.querySelector("#pd-turn").textContent = turnPts;
        const best = Storage.getBest("pigdice");
        root.querySelector("#pd-best").textContent = best != null ? best : "—";
        root.querySelector("#pd-cell-you").classList.toggle("pd-active", !over && turn === "you");
        root.querySelector("#pd-cell-bot").classList.toggle("pd-active", !over && turn === "ai");
        const my = !over && turn === "you" && !busy;
        rollB.disabled = !my;
        holdB.disabled = !my || turnPts <= 0;
      }

      // ~400ms shuffle of the big die face before settling on the final value.
      function animateDie(final, done) {
        const g = gen;
        dieEl.classList.add("pd-rolling");
        AudioFX.tick();
        let n = 0;
        const iv = setInterval(() => {
          if (!alive || g !== gen) {
            clearInterval(iv);
            return;
          }
          dieEl.innerHTML = faceHTML(1 + Math.floor(Math.random() * 6));
          if (++n >= 7) {
            clearInterval(iv);
            dieEl.classList.remove("pd-rolling");
            dieEl.innerHTML = faceHTML(final);
            AudioFX.pop();
            if (done) done();
          }
        }, 55);
        intervals.push(iv);
      }

      function startTurn(who) {
        if (over) return;
        turn = who;
        turnPts = 0;
        busy = false;
        render();
        if (who === "ai") {
          busy = true;
          render();
          setStatus("Pig-bot's turn…", "info");
          later(aiStep, 850);
        } else {
          setStatus("Your turn — roll to build your turn total, or hold to bank.", "info");
        }
      }

      // ---- player actions ----
      function playerRoll() {
        if (over || busy || turn !== "you") return;
        busy = true;
        render();
        const v = 1 + Math.floor(Math.random() * 6);
        animateDie(v, () => {
          if (over) return;
          if (v === 1) {
            turnPts = 0;
            AudioFX.error();
            setStatus("You rolled a 1 — pig-out! Your turn points are lost.", "lose");
            render();
            later(() => startTurn("ai"), 1100);
          } else {
            turnPts += v;
            busy = false;
            const near = youScore + turnPts >= 100;
            setStatus(`You rolled ${v} — turn total ${turnPts}.${near ? " Hold to win!" : " Roll again or hold."}`, "info");
            render();
          }
        });
      }

      function playerHold() {
        if (over || busy || turn !== "you" || turnPts <= 0) return;
        youScore += turnPts;
        const banked = turnPts;
        turnPts = 0;
        AudioFX.place();
        if (youScore >= 100) {
          render();
          return endGame(true);
        }
        setStatus(`You banked ${banked} → score ${youScore}. Pig-bot's turn…`, "info");
        busy = true;
        render();
        later(() => startTurn("ai"), 700);
      }

      // ---- AI: rolls until turn total ≥ 20 (or enough to win), then holds ----
      function aiStep() {
        if (over || turn !== "ai") return;
        if (turnPts >= 20 || botScore + turnPts >= 100) {
          botScore += turnPts;
          const banked = turnPts;
          turnPts = 0;
          AudioFX.place();
          if (botScore >= 100) {
            render();
            return endGame(false);
          }
          setStatus(`Pig-bot holds and banks ${banked} → score ${botScore}. Your turn.`, "info");
          later(() => startTurn("you"), 800);
          return;
        }
        setStatus(`Pig-bot rolling… (turn total ${turnPts})`, "info");
        const v = 1 + Math.floor(Math.random() * 6);
        animateDie(v, () => {
          if (over || turn !== "ai") return;
          if (v === 1) {
            turnPts = 0;
            AudioFX.error();
            setStatus("Pig-bot rolled a 1 — pig-out! Its turn points are lost. Your turn.", "win");
            render();
            later(() => startTurn("you"), 1100);
          } else {
            turnPts += v;
            setStatus(`Pig-bot rolled ${v} → turn total ${turnPts}.`, "info");
            render();
            later(aiStep, 800);
          }
        });
      }

      function endGame(won) {
        over = true;
        busy = false;
        turn = null;
        turnPts = 0;
        render();
        App.recordResult(won, youScore);
        const best = Storage.getBest("pigdice");
        if (youScore > (best != null ? best : 0)) {
          Storage.setBest("pigdice", youScore);
          App.toast("New best score: " + youScore, "success");
        }
        if (won) {
          AudioFX.win();
          setStatus(`You reached ${youScore} first — you win!`, "win");
          App.toast("You beat the pig-bot!", "success");
        } else {
          AudioFX.lose();
          setStatus(`The pig-bot reached ${botScore} first — you lose with ${youScore}.`, "lose");
        }
        render();
      }

      function newGame() {
        gen++;
        youScore = 0;
        botScore = 0;
        turnPts = 0;
        over = false;
        busy = false;
        dieEl.innerHTML = faceHTML(1);
        startTurn("you");
      }

      rollB.addEventListener("click", playerRoll);
      holdB.addEventListener("click", playerHold);
      root.querySelector("#pd-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });

      newGame();
      return function cleanup() {
        alive = false;
        timeouts.forEach(clearTimeout);
        intervals.forEach(clearInterval);
      };
    },
    help: function () {
      App.showModal("How to play Pig Dice",
        `Pig is the classic <b>jeopardy dice</b> race to 100 — you vs the pig-bot, taking alternate turns.
        <br><br><b>On your turn:</b>
        <br>• <b>Roll</b> — roll one die. If it's a <b>1</b>, you "pig out": all your turn points are lost and your turn ends immediately.
        <br>• Any other face (2-6) is added to your <b>turn total</b>.
        <br>• <b>Hold</b> — bank your turn total into your permanent score; your turn ends.
        <br><br><b>Winning:</b> first player to reach <b>100 points</b> (banked) wins.
        <br><br><b>The bot's policy:</b> it keeps rolling until its turn total reaches 20 or more (or enough to win), then holds.
        <br><br>Tip: the more you roll, the more you risk — a single 1 wipes the whole turn.`);
    },
  });
})();
