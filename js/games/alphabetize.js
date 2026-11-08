/* Alphabetize — sort the words into order before the clock runs out */
(function () {
  GameRegistry.register({
    id: "alphabetize",
    name: "Alphabetize",
    icon: "🔤",
    category: "word",
    description: "Sort the words into order before the clock runs out",
    tags: ["word", "alphabet", "speed"],
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
      let words, sorted, picked, score, best, timeLeft, timer, round;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="al-score">0</div></div>
          <div class="score-cell"><div class="label">Round</div><div class="val" id="al-round">1</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="al-time">20</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="al-best">0</div></div>
        </div>
        <div class="status info" id="al-status">Click the words in A→Z order — fast!</div>
        <div class="center" id="al-list"></div>
        <p class="hint">Each round adds a word and resets the timer. A wrong tap costs 3 seconds.</p>
      `;

      const listEl = root.querySelector("#al-list");
      const statusEl = root.querySelector("#al-status");
      best = Storage.getBest("alphabetize") || 0;

      const style = document.createElement("style");
      style.textContent = `
        .al-word { padding:10px 16px; margin:5px; border-radius:8px; background:var(--bg-soft,#334155);
                   color:var(--text,#eee); font-weight:700; cursor:pointer; display:inline-block; font-size:17px;
                   text-transform:uppercase; letter-spacing:1px; border:2px solid transparent; user-select:none; }
        .al-word.done { background:#166534; color:#fff; opacity:0.5; pointer-events:none; }
        .al-word.nope { border-color:#ef4444; animation:alshake .3s; }
        @keyframes alshake { 25% { transform:translateX(-4px);} 75% { transform:translateX(4px);} }
      `;
      root.appendChild(style);

      function start() {
        score = 0;
        round = 1;
        nextRound();
      }

      function nextRound() {
        const n = Math.min(4 + round, 8);
        const pool = (window.ANSWERS_ALL || []).slice().sort(() => Math.random() - 0.5);
        // ensure distinct first letters for clean sorting
        const seen = new Set();
        words = [];
        for (const w of pool) {
          if (seen.has(w[0].toUpperCase())) continue;
          seen.add(w[0].toUpperCase());
          words.push(w.toUpperCase());
          if (words.length === n) break;
        }
        words.sort(() => Math.random() - 0.5);
        sorted = words.slice().sort();
        picked = 0;
        timeLeft = Math.max(10, 24 - round * 2);
        clearInterval(timer);
        timer = setInterval(() => {
          timeLeft--;
          root.querySelector("#al-time").textContent = timeLeft;
          if (timeLeft <= 0) end();
        }, 1000);
        statusEl.textContent = `Round ${round}: click the ${n} words in A→Z order`;
        statusEl.className = "status info";
        render();
      }

      function pick(txt) {
        if (txt === sorted[picked]) {
          picked++;
          AudioFX.pop();
          render();
          if (picked === sorted.length) {
            score += 10 * sorted.length + timeLeft;
            round++;
            AudioFX.win();
            if (score > best) {
              best = score;
              Storage.setBest("alphabetize", score);
            }
            updateHud();
            after(nextRound, 700);
          }
        } else {
          timeLeft = Math.max(1, timeLeft - 3);
          AudioFX.error();
          const els = listEl.querySelectorAll(".al-word");
          const i = words.indexOf(txt);
          if (els[i]) {
            els[i].classList.add("nope");
            after(() => els[i].classList.remove("nope"), 320);
          }
          root.querySelector("#al-time").textContent = timeLeft;
        }
      }

      function end() {
        clearInterval(timer);
        AudioFX.lose();
        statusEl.textContent = `⏰ Time! Final score ${score} (round ${round})`;
        statusEl.className = "status " + (score >= 100 ? "win" : "lose");
        if (score > best) {
          best = score;
          Storage.setBest("alphabetize", score);
        }
        updateHud();
        listEl.insertAdjacentHTML("beforeend", `<div class="center" style="margin-top:10px;"><button class="btn primary" id="al-again">🔤 Play again</button></div>`);
        listEl.querySelector("#al-again").addEventListener("click", start);
      }

      function updateHud() {
        root.querySelector("#al-score").textContent = score;
        root.querySelector("#al-round").textContent = round;
        root.querySelector("#al-time").textContent = timeLeft;
        root.querySelector("#al-best").textContent = best;
      }

      function render() {
        updateHud();
        listEl.innerHTML = "";
        words.forEach(w => {
          const done = sorted.indexOf(w) < picked;
          const el = document.createElement("div");
          el.className = "al-word" + (done ? " done" : "");
          el.textContent = w;
          el.addEventListener("pointerdown", () => pick(w));
          listEl.appendChild(el);
        });
      }

      start();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Alphabetize",
        `Click the words in <b>alphabetical order</b> (A→Z) as fast as you can. Every correct word turns green;
        a wrong tap costs <b>3 seconds</b>.
        <br><br>Each round adds a word (4 → 8) and shortens the clock. Score = <b>10 per word + remaining seconds</b>.
        Watch out for near-misses like CAME vs CANE — third letters matter!`);
    },
  });
})();
