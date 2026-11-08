/* Word Recall — memorize the word list, then write it all back */
(function () {
  GameRegistry.register({
    id: "wordrecall",
    name: "Word Recall",
    icon: "🧠",
    category: "word",
    description: "Memorize the word list, then write it all back",
    tags: ["word", "memory", "recall"],
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
      let level, words, phase, score, best, timer, timeLeft;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Level</div><div class="val" id="wr-lvl">1</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="wr-score">0</div></div>
          <div class="score-cell"><div class="label">Best lvl</div><div class="val" id="wr-best">1</div></div>
        </div>
        <div class="status info" id="wr-status">Memorize the words…</div>
        <div class="center" id="wr-body" style="min-height:120px;"></div>
        <p class="hint">Order doesn't matter — just don't forget the FURNITURE when the PENGUIN shows up.</p>
      `;

      const bodyEl = root.querySelector("#wr-body");
      const statusEl = root.querySelector("#wr-status");
      best = Storage.getBest("wordrecall") || 1;

      function startLevel(lvl) {
        level = lvl;
        const n = 3 + lvl;
        const pool = (window.ANSWERS_ALL || []).sort(() => Math.random() - 0.5).slice(0, n);
        words = pool.map(w => w.toUpperCase());
        phase = "memorize";
        timeLeft = 3 + n * 2;
        statusEl.textContent = `Level ${lvl}: memorize ${n} words…`;
        statusEl.className = "status info";
        render();
        clearInterval(timer);
        timer = setInterval(() => {
          timeLeft--;
          if (phase === "memorize") {
            statusEl.textContent = `Memorize! ${timeLeft}s left…`;
            if (timeLeft <= 0) {
              phase = "recall";
              render();
            }
          }
        }, 1000);
      }

      function grade(input) {
        clearInterval(timer);
        const typed = input.split(/[\s,;]+/).map(w => w.toUpperCase().replace(/[^A-Z]/g, "")).filter(Boolean);
        const correct = typed.filter(t => words.includes(t));
        const uniq = [...new Set(correct)];
        const acc = uniq.length / words.length;
        if (acc === 1) {
          AudioFX.win();
          score = (score || 0) + uniq.length * 10;
          statusEl.textContent = `🧠 Perfect recall! +${uniq.length * 10}. Next level…`;
          statusEl.className = "status win";
          if (level + 1 > best) {
            best = level + 1;
            Storage.setBest("wordrecall", best);
          }
          updateHud();
          after(() => startLevel(level + 1), 1900);
        } else if (acc >= 0.5) {
          AudioFX.pop();
          score = (score || 0) + Math.round(uniq.length * 5);
          statusEl.textContent = `${uniq.length}/${words.length} recalled — partial credit. Retry level ${level}…`;
          statusEl.className = "status info";
          updateHud();
          after(() => startLevel(level), 2400);
        } else {
          AudioFX.lose();
          statusEl.textContent = `Only ${uniq.length}/${words.length}. The words were: ${words.join(", ")}`;
          statusEl.className = "status lose";
          updateHud();
          after(() => startLevel(level), 3200);
        }
      }

      function updateHud() {
        root.querySelector("#wr-lvl").textContent = level;
        root.querySelector("#wr-score").textContent = score || 0;
        root.querySelector("#wr-best").textContent = best;
      }

      function render() {
        updateHud();
        if (phase === "memorize") {
          bodyEl.innerHTML = `
            <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:440px;margin:0 auto;">
              ${words.map(w => `<span style="padding:10px 16px;border-radius:9px;background:var(--bg-soft,#334155);font-weight:800;font-size:18px;letter-spacing:1px;">${w}</span>`).join("")}
            </div>
          `;
        } else {
          clearInterval(timer);
          statusEl.textContent = `Now write all ${words.length} words from memory!`;
          statusEl.className = "status info";
          bodyEl.innerHTML = `
            <textarea id="wr-in" rows="4" style="width:min(440px,92%);padding:12px;border-radius:10px;background:var(--bg-soft,#334155);color:var(--text,#eee);border:2px solid var(--bg-inset,#1f2937);font-size:16px;" placeholder="Type the words you remember…"></textarea>
            <div class="row gap-2" style="justify-content:center;margin-top:10px;">
              <button class="btn primary" id="wr-go">✔ Submit</button>
            </div>
          `;
          const ta = bodyEl.querySelector("#wr-in");
          after(() => ta.focus(), 60);
          bodyEl.querySelector("#wr-go").addEventListener("click", () => grade(ta.value));
          ta.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) grade(ta.value);
          });
        }
      }

      score = 0;
      startLevel(1);
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Word Recall",
        `Phase 1 — <b>memorize</b>: a list of words appears for a few seconds (longer lists get more time).
        Phase 2 — <b>recall</b>: type every word you can remember, separated by spaces or commas.
        <br><br>Perfect recall = <b>+10/word</b> and the next level adds a word. Half or more = partial credit and a retry.
        Order doesn't matter — only your memory does.`);
    },
  });
})();
