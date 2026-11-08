/* Word Bingo — letters are drawn, be first to mark a full word */
(function () {
  GameRegistry.register({
    id: "wordbingo",
    name: "Word Bingo",
    icon: "🎱",
    category: "word",
    description: "Letters are drawn — complete your word before the AI does",
    tags: ["word", "bingo", "letters"],
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
      let youWord, aiWord, drawn, youMarked, aiMarked, bag, won, best, drawT = null;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="wb-wins">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="wb-best">0</div></div>
          <div class="score-cell"><div class="label">Drawn</div><div class="val" id="wb-drawn">0</div></div>
        </div>
        <div class="status info" id="wb-status">Letters draw automatically — fill your word before the AI fills its own</div>
        <div class="center" id="wb-board"></div>
        <p class="hint">Any unmarked letter of your word that gets drawn is marked for free. Duplicate letters need multiple draws!</p>
      `;

      const boardEl = root.querySelector("#wb-board");
      const statusEl = root.querySelector("#wb-status");
      best = Storage.getBest("wordbingo") || 0;
      let wins = 0;

      const style = document.createElement("style");
      style.textContent = `
        .wb-word { display:flex; gap:6px; justify-content:center; margin:10px 0; flex-wrap:wrap; }
        .wb-slot { width:44px; height:52px; border-radius:8px; background:var(--bg-soft,#334155);
                   display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800; color:var(--text,#eee); position:relative; }
        .wb-slot.marked { background:#16a34a; color:#fff; }
        .wb-slot .dot { position:absolute; top:3px; right:5px; font-size:10px; opacity:0.6; }
        .wb-letter { width:36px; height:36px; margin:3px; border-radius:50%; background:var(--bg-inset,#1f2937);
                     display:inline-flex; align-items:center; justify-content:center; font-weight:700; font-size:15px; color:var(--text,#eee); }
        .wb-letter.new { background:#f59e0b; color:#111; }
      `;
      root.appendChild(style);

      function generate() {
        const pool = (window.ANSWERS_5 || []).filter(w => new Set(w).size >= 4);
        youWord = pool[Math.floor(Math.random() * pool.length)].toUpperCase();
        aiWord = pool[Math.floor(Math.random() * pool.length)].toUpperCase();
        while (aiWord === youWord) aiWord = pool[Math.floor(Math.random() * pool.length)].toUpperCase();
        drawn = [];
        bag = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        youMarked = 0;
        aiMarked = 0;
        won = false;
        render();
        drawNext();
      }

      function drawNext() {
        if (won) return;
        if (!bag.length) { // reshuffle a fresh bag
          bag = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        }
        const i = Math.floor(Math.random() * bag.length);
        const L = bag.splice(i, 1)[0];
        drawn.push(L);
        // mark all instances
        for (let k = 0; k < youWord.length; k++) {
          if (youWord[k] === L && youMarked < k + 1) {
            // mark sequentially by count logic below
          }
        }
        // simpler: marked = number of letters matched greedily
        youMarked = countMatched(youWord, drawn);
        aiMarked = countMatched(aiWord, drawn);
        AudioFX.pop();
        render();
        if (youMarked === youWord.length && aiMarked === aiWord.length) {
          finish(true, "Tie! Both words complete — replaying…");
        } else if (youMarked === youWord.length) {
          finish(true, "🎉 BINGO! You completed “" + youWord + "” first!");
        } else if (aiMarked === aiWord.length) {
          finish(false, "🤖 The AI finished “" + aiWord + "” first…");
        } else {
          drawT = after(drawNext, 1100);
        }
      }

      function countMatched(word, letters) {
        const pool = letters.slice();
        let c = 0;
        for (const ch of word) {
          const i = pool.indexOf(ch);
          if (i >= 0) {
            pool.splice(i, 1);
            c++;
          }
        }
        return c;
      }

      function finish(youWon, msg) {
        won = true;
        if (youWon && msg.startsWith("🎉")) {
          wins++;
          AudioFX.win();
          if (wins > best) {
            best = wins;
            Storage.setBest("wordbingo", wins);
          }
        } else AudioFX.lose();
        statusEl.textContent = msg;
        statusEl.className = "status " + (msg.startsWith("🎉") ? "win" : msg.startsWith("Tie") ? "info" : "lose");
        render();
        after(generate, 2400);
      }

      function render() {
        const hudEl = root.querySelector("#wb-wins");
        if (!hudEl) return; // game was closed
        hudEl.textContent = wins;
        root.querySelector("#wb-best").textContent = best;
        root.querySelector("#wb-drawn").textContent = drawn.length;
        const lastL = drawn[drawn.length - 1];
        let html = `
          <div style="font-weight:700;margin-bottom:2px;">You 🧑</div>
          <div class="wb-word">${youWord.split("").map((ch, i) => `<div class="wb-slot ${i < youMarked ? "marked" : ""}">${i < youMarked ? ch : "?"}</div>`).join("")}</div>
          <div style="font-weight:700;margin:10px 0 2px;">AI 🤖</div>
          <div class="wb-word">${aiWord.split("").map((ch, i) => `<div class="wb-slot ${i < aiMarked ? "marked" : ""}">${i < aiMarked ? ch : "?"}</div>`).join("")}</div>
          <div style="margin-top:14px;font-size:13px;color:var(--text-muted,#94a3b8);">Drawn letters:</div>
          <div>${drawn.map((l, i) => `<span class="wb-letter ${i === drawn.length - 1 ? "new" : ""}">${l}</span>`).join("")}</div>
        `;
        boardEl.innerHTML = html;
      }

      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        clearTimeout(drawT);
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Word Bingo",
        `You and the AI each have a secret 5-letter word. Letters of the alphabet are drawn one by one —
        every letter of your word that appears gets <b>marked automatically</b>.
        <br><br>First side to mark its <b>entire word</b> wins the round. Words with repeated letters are tricky:
        two E's need two separate E draws. Races are usually decided by one letter!`);
    },
  });
})();
