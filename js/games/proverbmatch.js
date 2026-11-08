/* Proverb Match — match the second half of an old proverb.
   2 rounds × 8 proverbs: left column shows first halves, right column the
   shuffled endings. Click a start, then an ending — correct pairs lock green,
   wrong pairs flash red and count as mistakes. */
(function () {
  "use strict";

  const PROVERBS = [
    ["A penny saved", "is a penny earned"],
    ["Actions", "speak louder than words"],
    ["Don't count your chickens", "before they hatch"],
    ["The early bird", "catches the worm"],
    ["A picture is", "worth a thousand words"],
    ["Too many cooks", "spoil the broth"],
    ["When in Rome", "do as the Romans do"],
    ["A bird in the hand", "is worth two in the bush"],
    ["Don't put all your eggs", "in one basket"],
    ["Practice", "makes perfect"],
    ["Better late", "than never"],
    ["Two wrongs", "don't make a right"],
    ["The grass is always greener", "on the other side"],
    ["Absence", "makes the heart grow fonder"],
    ["Look before", "you leap"],
    ["A stitch in time", "saves nine"],
    ["You can't teach an old dog", "new tricks"],
    ["Where there's smoke", "there's fire"],
  ];
  const PER_ROUND = 8;
  const ROUNDS_TOTAL = 2;
  const MAX_PAIRS = PER_ROUND * ROUNDS_TOTAL;
  const WIN_SCORE = 10; // of MAX_PAIRS

  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Live game state — set at mount time, cleared on cleanup.
  let live = null;

  GameRegistry.register({
    id: "proverbmatch",
    name: "Proverb Match",
    icon: "📜",
    category: "word",
    description: "Match first and second halves of classic proverbs across 2 rounds of 8 — wrong pairs cost points",
    tags: ["word", "proverbs", "matching", "vocabulary", "wisdom"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let pool = shuffled(PROVERBS.map((_, i) => i));
      let round = 1;
      let roundItems = [], leftOrder = [], rightOrder = [];
      let selected = null; // proverb index picked on the left
      let matchedRound = new Set();
      let totalMatched = 0, mistakes = 0;
      let over = false;
      const timers = [];

      function later(fn, ms) {
        const t = setTimeout(() => {
          if (!alive) return;
          fn();
        }, ms);
        timers.push(t);
        return t;
      }

      if (!document.getElementById("pm-style")) {
        const s = document.createElement("style");
        s.id = "pm-style";
        s.textContent = `
          .pm-columns { display:flex; gap:12px; justify-content:center; align-items:flex-start; flex-wrap:wrap; margin-top:12px; }
          .pm-col { display:flex; flex-direction:column; gap:8px; flex:1 1 240px; max-width:380px; }
          .pm-col-head { font-size:0.72rem; letter-spacing:0.08em; font-weight:700; color:var(--text-muted); text-transform:uppercase; text-align:center; margin-bottom:2px; }
          .pm-chip { text-align:left; padding:10px 12px; border-radius:var(--radius); border:1px solid var(--border); background:var(--bg-elev); color:var(--text); cursor:pointer; font-size:0.9rem; line-height:1.35; min-height:44px; transition: background 0.15s, border-color 0.15s; }
          .pm-chip.selected { border-color:var(--accent); background:var(--accent-soft); outline:2px solid var(--accent); }
          .pm-chip.matched { background:var(--success); border-color:var(--success); color:#fff; cursor:default; }
          .pm-chip.wrong { background:var(--danger); border-color:var(--danger); color:#fff; }
          .pm-chip:disabled { cursor:default; }
          @keyframes pm-shake {0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
          .pm-chip.wrong { animation: pm-shake 0.3s; }
        `;
        document.head.appendChild(s);
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Round</div><div class="val" id="pm-round">1/${ROUNDS_TOTAL}</div></div>
          <div class="score-cell"><div class="label">Pairs</div><div class="val" id="pm-pairs">0/${MAX_PAIRS}</div></div>
          <div class="score-cell"><div class="label">Mistakes</div><div class="val" id="pm-mistakes">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="pm-best">—</div></div>
        </div>
        <div class="status info" id="pm-status">Tap a proverb's start on the left, then its ending on the right.</div>
        <div class="pm-columns" id="pm-cols"></div>
        <div class="row center" style="gap:8px; margin-top:14px;">
          <button class="btn" id="pm-new" type="button">Skip round</button>
        </div>
        <p class="hint">Green = locked in. A wrong pair flashes red and costs a point. Final score = pairs matched − mistakes (max ${MAX_PAIRS}).</p>
      `;

      const statusEl = root.querySelector("#pm-status");
      const colsEl = root.querySelector("#pm-cols");
      const newBtn = root.querySelector("#pm-new");

      function setStatus(text, cls) {
        statusEl.textContent = text;
        statusEl.className = "status " + cls;
      }

      function updateScoreboard() {
        root.querySelector("#pm-round").textContent = round + "/" + ROUNDS_TOTAL;
        root.querySelector("#pm-pairs").textContent = totalMatched + "/" + MAX_PAIRS;
        root.querySelector("#pm-mistakes").textContent = mistakes;
        const best = Storage.getBest("proverbmatch");
        root.querySelector("#pm-best").textContent = best != null ? best : "—";
        if (over) newBtn.textContent = "Play again";
        else if (matchedRound.size >= PER_ROUND) newBtn.textContent = "Next round →";
        else newBtn.textContent = "Skip round";
      }

      function dealRound() {
        roundItems = pool.slice((round - 1) * PER_ROUND, round * PER_ROUND);
        leftOrder = shuffled(roundItems);
        rightOrder = shuffled(roundItems);
        matchedRound = new Set();
        selected = null;
        render();
      }

      function render() {
        colsEl.innerHTML = "";

        const leftCol = document.createElement("div");
        leftCol.className = "pm-col";
        const lh = document.createElement("div");
        lh.className = "pm-col-head";
        lh.textContent = "Proverb starts";
        leftCol.appendChild(lh);
        for (const idx of leftOrder) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "pm-chip" + (matchedRound.has(idx) ? " matched" : "") + (selected === idx ? " selected" : "");
          b.textContent = PROVERBS[idx][0] + "…";
          b.disabled = matchedRound.has(idx) || over;
          b.dataset.idx = idx;
          b.dataset.side = "left";
          leftCol.appendChild(b);
        }

        const rightCol = document.createElement("div");
        rightCol.className = "pm-col";
        const rh = document.createElement("div");
        rh.className = "pm-col-head";
        rh.textContent = "Shuffled endings";
        rightCol.appendChild(rh);
        for (const idx of rightOrder) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "pm-chip" + (matchedRound.has(idx) ? " matched" : "");
          b.textContent = "…" + PROVERBS[idx][1];
          b.disabled = matchedRound.has(idx) || over;
          b.dataset.idx = idx;
          b.dataset.side = "right";
          rightCol.appendChild(b);
        }

        colsEl.appendChild(leftCol);
        colsEl.appendChild(rightCol);
        updateScoreboard();
      }

      colsEl.addEventListener("click", (e) => {
        const chip = e.target.closest(".pm-chip");
        if (!chip || chip.disabled || over) return;
        const idx = +chip.dataset.idx;
        if (chip.dataset.side === "left") {
          selected = selected === idx ? null : idx;
          AudioFX.click();
          render();
          return;
        }
        // Right side
        if (selected === null) {
          setStatus("Pick a proverb start on the left first.", "info");
          AudioFX.tick();
          return;
        }
        attemptPair(selected, idx);
      });

      function attemptPair(leftIdx, rightIdx) {
        if (leftIdx === rightIdx) {
          matchedRound.add(leftIdx);
          totalMatched++;
          selected = null;
          AudioFX.pop();
          render();
          checkRoundComplete(true);
          return;
        }
        // Wrong pair: flash both chips red, count the mistake.
        mistakes++;
        AudioFX.error();
        const leftChip = colsEl.querySelector('.pm-chip[data-side="left"][data-idx="' + leftIdx + '"]');
        const rightChip = colsEl.querySelector('.pm-chip[data-side="right"][data-idx="' + rightIdx + '"]');
        if (leftChip) leftChip.classList.add("wrong");
        if (rightChip) rightChip.classList.add("wrong");
        later(() => {
          if (leftChip) leftChip.classList.remove("wrong");
          if (rightChip) rightChip.classList.remove("wrong");
        }, 600);
        setStatus("Not a match — mistakes: " + mistakes + ". Try another ending.", "lose");
        updateScoreboard();
      }

      function checkRoundComplete(natural) {
        if (matchedRound.size < PER_ROUND || over) {
          if (!over && matchedRound.size < PER_ROUND) {
            setStatus("✓ " + matchedRound.size + "/" + PER_ROUND + " matched this round.", "win");
          }
          return;
        }
        if (round < ROUNDS_TOTAL) {
          AudioFX.win();
          setStatus("🎉 Round " + round + " complete! Press “Next round” for round " + ROUNDS_TOTAL + ".", "win");
          updateScoreboard();
        } else {
          AudioFX.win();
          setStatus("Round " + round + " complete!", "win");
          later(finish, natural ? 900 : 200);
        }
      }

      function nextRound() {
        if (over) return;
        if (round >= ROUNDS_TOTAL) {
          finish();
          return;
        }
        round++;
        AudioFX.click();
        setStatus("Round " + round + " — " + PER_ROUND + " fresh proverbs.", "info");
        dealRound();
      }

      function finish() {
        if (over) return;
        over = true;
        const score = totalMatched - mistakes;
        const won = score >= WIN_SCORE;
        App.recordResult(won, score);
        if (Storage.submitScore("proverbmatch", score)) {
          App.toast("New best score: " + score, "success");
        }
        render();
        AudioFX[won ? "win" : "lose"]();
        setStatus(won
          ? "🎉 All done! Final score: " + score + " (" + totalMatched + " pairs − " + mistakes + " mistakes)."
          : "All done. Final score: " + score + " (" + totalMatched + " pairs − " + mistakes + " mistakes).", won ? "win" : "lose");
        App.showModal(won ? "Master matcher!" : "Round-up",
          `You matched <b>${totalMatched} of ${MAX_PAIRS}</b> pairs with <b>${mistakes}</b> ${mistakes === 1 ? "mistake" : "mistakes"}.
          <br><br>Final score: <b>${score}</b> ${won ? "— a winning round!" : "(score " + WIN_SCORE + "+ to win)"}
          <br><br>Press <b>Play again</b> for two freshly shuffled rounds.`);
      }

      function restart() {
        pool = shuffled(PROVERBS.map((_, i) => i));
        round = 1;
        totalMatched = 0;
        mistakes = 0;
        over = false;
        setStatus("Tap a proverb's start on the left, then its ending on the right.", "info");
        dealRound();
      }

      newBtn.addEventListener("click", () => {
        if (over) {
          AudioFX.click();
          restart();
          return;
        }
        AudioFX.click();
        nextRound();
      });

      function doHint() {
        if (over) {
          App.toast("Game over — press Play again", "info");
          return;
        }
        const unmatched = roundItems.filter((i) => !matchedRound.has(i));
        if (!unmatched.length) {
          App.toast("This round is already complete — press Next round", "info");
          return;
        }
        const idx = unmatched[Math.floor(Math.random() * unmatched.length)];
        matchedRound.add(idx);
        totalMatched++;
        AudioFX.reveal();
        App.toast("Matched for you: “" + PROVERBS[idx][0] + "… …" + PROVERBS[idx][1] + "”", "info");
        selected = null;
        render();
        checkRoundComplete(false);
      }

      function doSolve() {
        if (over) {
          App.toast("Game over — press Play again", "info");
          return;
        }
        const unmatched = roundItems.filter((i) => !matchedRound.has(i));
        if (!unmatched.length) {
          App.toast("This round is already complete", "info");
          return;
        }
        for (const idx of unmatched) matchedRound.add(idx); // revealed, not counted as earned pairs
        selected = null;
        AudioFX.reveal();
        App.toast("All pairs revealed for this round", "info");
        render();
        checkRoundComplete(false);
      }

      live = {hint: doHint, solve: doSolve};

      dealRound();

      return function cleanup() {
        alive = false;
        live = null;
        timers.forEach(clearTimeout);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Proverb Match",
        `Old proverbs, cut in half! Each round deals <b>${PER_ROUND} proverbs</b>: the left column lists their first halves, the right column the shuffled endings.
        <br><br>Tap a start on the left, then tap the ending you think belongs to it:
        <br>✅ A correct pair locks in <b>green</b>.
        <br>❌ A wrong pair flashes red and counts as a <b>mistake</b> (−1 point).
        <br><br>There are <b>${ROUNDS_TOTAL} rounds</b>. When a round is complete, press <b>Next round</b> (or <b>Skip round</b> to forfeit the rest).
        <br><br>Final score = pairs matched − mistakes (max ${MAX_PAIRS}). Score <b>${WIN_SCORE}+</b> for a winning game.
        <br><br><b>Hint</b> locks in one correct pair for you; <b>Solve</b> reveals every remaining pair in the round (revealed pairs don't count toward your score).`);
    },
  });
})();
