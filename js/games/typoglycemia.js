/* Scrambled Reading (typoglycemia) — read words with jumbled middles at speed */
(function () {
  GameRegistry.register({
    id: "typoglycemia",
    name: "Scrambled Reading",
    icon: "🌀",
    category: "word",
    description: "Read words with jumbled middles — against the clock",
    tags: ["word", "reading", "speed"],
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
      let round, score, best, timeLeft, timer, current, opts, scrambled;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="tg-score">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="tg-time">30</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="tg-best">0</div></div>
        </div>
        <div class="status info" id="tg-status">Which word is scrambled below? Your brain can read it!</div>
        <div class="center" id="tg-word" style="font-size:30px;font-weight:800;letter-spacing:2px;margin:18px 0;"></div>
        <div class="center" id="tg-opts"></div>
        <p class="hint">“Tihs” = “this”. First and last letters stay put; the middle shuffles.</p>
      `;

      const wordEl = root.querySelector("#tg-word");
      const optsEl = root.querySelector("#tg-opts");
      const statusEl = root.querySelector("#tg-status");
      best = Storage.getBest("typoglycemia") || 0;

      const style = document.createElement("style");
      style.textContent = `
        .tg-opt { padding:12px 20px; margin:5px; border-radius:10px; background:var(--bg-soft,#334155);
                  color:var(--text,#eee); font-size:17px; font-weight:700; cursor:pointer; border:2px solid transparent; }
        .tg-opt:hover { border-color:var(--accent,#6366f1); }
        .tg-opt.right { background:#166534; color:#fff; }
        .tg-opt.wrong { background:#991b1b; color:#fff; }
      `;
      root.appendChild(style);

      function scramble(w) {
        if (w.length < 4) return w;
        const arr = w.split("");
        const first = arr.shift(), last = arr.pop();
        // shuffle middle (ensure it changes)
        for (let tries = 0; tries < 10; tries++) {
          const mid = arr.slice().sort(() => Math.random() - 0.5);
          if (mid.join("") !== arr.join("") || arr.length < 2) {
            return first + mid.join("") + last;
          }
        }
        return first + arr.reverse().join("") + last;
      }

      function next() {
        const pool = (window.ANSWERS_ALL || []).filter(w => w.length >= 5 && w.length <= 8).sort(() => Math.random() - 0.5);
        current = pool[0].toUpperCase();
        const others = pool.slice(1, 4).map(w => w.toUpperCase());
        opts = [current, ...others].sort(() => Math.random() - 0.5);
        scrambled = scramble(current.toLowerCase()).toUpperCase();
        wordEl.textContent = scrambled;
        statusEl.textContent = "Which word is scrambled below? Your brain can read it!";
        statusEl.className = "status info";
        render();
      }

      function pick(txt) {
        const els = optsEl.querySelectorAll(".tg-opt");
        els.forEach(el => el.style.pointerEvents = "none");
        const i = opts.indexOf(txt);
        if (txt === current) {
          els[i].classList.add("right");
          score += 10;
          AudioFX.win();
          if (score > best) {
            best = score;
            Storage.setBest("typoglycemia", score);
          }
          updateHud();
          after(next, 550);
        } else {
          els[i].classList.add("wrong");
          els[opts.indexOf(current)].classList.add("right");
          AudioFX.error();
          updateHud();
          after(next, 1400);
        }
      }

      function end() {
        clearInterval(timer);
        AudioFX.lose();
        statusEl.textContent = `🌀 Time! You read ${score / 10} scrambled words`;
        statusEl.className = "status " + (score >= 100 ? "win" : "lose");
        updateHud();
        wordEl.textContent = "—";
        optsEl.innerHTML = `<button class="btn primary" id="tg-again">🌀 Play again</button>`;
        optsEl.querySelector("#tg-again").addEventListener("click", start);
      }

      function updateHud() {
        root.querySelector("#tg-score").textContent = score;
        root.querySelector("#tg-time").textContent = timeLeft;
        root.querySelector("#tg-best").textContent = best;
      }

      function render() {
        updateHud();
        optsEl.innerHTML = "";
        opts.forEach(txt => {
          const b = document.createElement("div");
          b.className = "tg-opt";
          b.textContent = txt;
          b.addEventListener("pointerdown", () => pick(txt));
          optsEl.appendChild(b);
        });
      }

      function start() {
        score = 0;
        timeLeft = 30;
        clearInterval(timer);
        timer = setInterval(() => {
          timeLeft--;
          updateHud();
          if (timeLeft <= 0) end();
        }, 1000);
        next();
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
      App.showModal("How to play Scrambled Reading",
        `According to a famous internet claim, your brain can read words as long as the <b>first and last letters</b>
        are in place — the middle can be alphabet soup.
        <br><br>Each round shows a scrambled word (e.g. <b>PYUZLZ</b>) — pick the real word from the four options
        as fast as you can. <b>+10</b> per word in 30 seconds. Aerswn key not reuqired.`);
    },
  });
})();
