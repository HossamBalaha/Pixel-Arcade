/* Compound Words — match the halves to build compound words */
(function () {
  GameRegistry.register({
    id: "compoundwords",
    name: "Compound Words",
    icon: "🍔",
    category: "word",
    description: "Match the halves to build compound words",
    tags: ["word", "matching", "vocabulary"],
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
      const PAIRS = [
        ["SUN", "FLOWER"], ["BASKET", "BALL"], ["BUTTER", "FLY"], ["RAIN", "BOW"],
        ["TOOTH", "BRUSH"], ["MOON", "LIGHT"], ["STAR", "FISH"], ["KEY", "BOARD"],
        ["EARTH", "QUAKE"], ["SNOW", "MAN"], ["JELLY", "FISH"], ["BOOK", "SHELF"],
        ["FOOT", "PRINT"], ["LIGHT", "HOUSE"], ["CUP", "CAKE"], ["PAN", "CAKE"],
        ["THUNDER", "STORM"], ["BUTTER", "MILK"], ["GRASS", "HOPPER"], ["DRAGON", "FLY"],
        ["FIRE", "FLY"], ["GOLD", "FISH"], ["HONEY", "MOON"], ["SAND", "WICH"],
        ["SUPER", "MAN"], ["SPIDER", "WEB"], ["TURTLE", "NECK"], ["NECK", "LACE"],
        ["BLUE", "BERRY"], ["STRAW", "BERRY"], ["WATER", "FALL"], ["MEAL", "TIME"],
        ["BED", "TIME"], ["DAY", "DREAM"], ["HEAD", "ACHE"], ["EAR", "RING"],
      ];
      let left, right, matched, selL, score, best, timeLeft, timer, round;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Pairs</div><div class="val" id="cp-pairs">0/6</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="cp-time">60</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cp-best">—</div></div>
        </div>
        <div class="status info" id="cp-status">Match the halves: tap a left word, then its partner</div>
        <div class="center" id="cp-board"></div>
        <p class="hint">Butter + Fly = Butterfly 🦋 — six pairs per round.</p>
      `;

      const boardEl = root.querySelector("#cp-board");
      const statusEl = root.querySelector("#cp-status");
      best = Storage.getBest("compoundwords");

      const style = document.createElement("style");
      style.textContent = `
        .cp-cols { display:flex; gap:26px; justify-content:center; }
        .cp-col { display:flex; flex-direction:column; gap:8px; }
        .cp-word { padding:10px 16px; min-width:120px; text-align:center; border-radius:8px;
                   background:var(--bg-soft,#334155); color:var(--text,#eee); font-weight:700; cursor:pointer;
                   font-size:16px; letter-spacing:1px; user-select:none; }
        .cp-word.sel { outline:3px solid #fbbf24; }
        .cp-word.done { background:#166534; color:#fff; opacity:0.45; cursor:default; }
        .cp-word.flash { background:#991b1b; color:#fff; }
      `;
      root.appendChild(style);

      function start() {
        round = PAIRS.slice().sort(() => Math.random() - 0.5).slice(0, 6);
        left = round.map(p => p[0]).sort(() => Math.random() - 0.5);
        right = round.map(p => p[1]).sort(() => Math.random() - 0.5);
        matched = new Set();
        selL = null;
        timeLeft = 60;
        score = 0;
        clearInterval(timer);
        timer = setInterval(() => {
          timeLeft--;
          root.querySelector("#cp-time").textContent = timeLeft;
          if (timeLeft <= 0) end(false);
        }, 1000);
        statusEl.textContent = "Match the halves: tap a left word, then its partner";
        statusEl.className = "status info";
        render();
      }

      function tryMatch(rIdx) {
        if (selL === null) return;
        const lWord = left[selL];
        const rWord = right[rIdx];
        const isMatch = round.some(p => p[0] === lWord && p[1] === rWord);
        if (isMatch) {
          matched.add(lWord);
          matched.add(rWord);
          score++;
          AudioFX.win();
          selL = null;
          render();
          if (matched.size === 12) end(true);
        } else {
          AudioFX.error();
          const el = boardEl.querySelectorAll(".cp-col")[1].children[rIdx];
          el.classList.add("flash");
          after(() => el.classList.remove("flash"), 350);
        }
      }

      function end(won) {
        clearInterval(timer);
        if (won) {
          AudioFX.win();
          statusEl.textContent = `🎉 All matched with ${timeLeft}s left!`;
          statusEl.className = "status win";
          const timeUsed = 60 - timeLeft;
          if (!best || timeUsed < best) {
            best = timeUsed;
            Storage.setBest("compoundwords", timeUsed);
            App.toast("New best time: " + timeUsed + "s", "success");
          }
        } else {
          AudioFX.lose();
          statusEl.textContent = `Time's up — matched ${score}/6.`;
          statusEl.className = "status lose";
        }
        updateHud();
        boardEl.insertAdjacentHTML("beforeend", `<div class="center" style="margin-top:10px;"><button class="btn primary" id="cp-again">🔁 Play again</button></div>`);
        boardEl.querySelector("#cp-again").addEventListener("click", start);
      }

      function updateHud() {
        root.querySelector("#cp-pairs").textContent = score + "/6";
        root.querySelector("#cp-time").textContent = timeLeft;
        root.querySelector("#cp-best").textContent = best ? best + "s" : "—";
      }

      function render() {
        updateHud();
        boardEl.innerHTML = `<div class="cp-cols">
          <div class="cp-col">
            ${left.map((w, i) => `<div class="cp-word ${matched.has(w) ? "done" : ""} ${selL === i ? "sel" : ""}" data-l="${i}">${w}</div>`).join("")}
          </div>
          <div style="align-self:center;font-size:26px;">🟰</div>
          <div class="cp-col">
            ${right.map((w, i) => `<div class="cp-word ${matched.has(w) ? "done" : ""}" data-r="${i}">${w}</div>`).join("")}
          </div>
        </div>`;
        boardEl.querySelectorAll("[data-l]").forEach(el => {
          el.addEventListener("pointerdown", () => {
            if (matched.has(left[+el.dataset.l])) return;
            selL = +el.dataset.l;
            AudioFX.click();
            render();
          });
        });
        boardEl.querySelectorAll("[data-r]").forEach(el => {
          el.addEventListener("pointerdown", () => {
            if (matched.has(right[+el.dataset.r])) return;
            tryMatch(+el.dataset.r);
          });
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
      App.showModal("How to play Compound Words",
        `Two columns: word beginnings on the left, endings on the right. Tap a beginning, then tap the ending that
        completes a real <b>compound word</b> (SUN + FLOWER = SUNFLOWER).
        <br><br>Six pairs per round against a 60-second clock — finish fast for the best-time record.
        Wrong matches just flash red, so guess away.`);
    },
  });
})();
