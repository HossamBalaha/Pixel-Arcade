/* Spelling Detective — spot the misspelled word among the four */
(function () {
  GameRegistry.register({
    id: "spellingdetective",
    name: "Spelling Detective",
    icon: "🔍",
    category: "word",
    description: "Spot the misspelled word among the four",
    tags: ["word", "spelling", "speed"],
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
        ["accommodate", "accomodate"], ["necessary", "neccessary"], ["definitely", "definately"],
        ["separate", "seperate"], ["receive", "recieve"], ["rhythm", "rythm"],
        ["occurrence", "occurence"], ["embarrass", "embarass"], ["maintenance", "maintainance"],
        ["perseverance", "perseverence"], ["conscience", "concience"], ["mischievous", "mischievious"],
        ["privilege", "priviledge"], ["restaurant", "restaraunt"], ["beginning", "begining"],
        ["believe", "beleive"], ["calendar", "calender"], ["category", "catagory"],
        ["column", "collumn"], ["committee", "commitee"], ["conscientious", "consciencious"],
        ["dilemma", "dilemna"], ["exaggerate", "exagerate"], ["February", "Febuary"],
        ["fluorescent", "flourescent"], ["government", "goverment"], ["harass", "harrass"],
        ["height", "heighth"], ["irresistible", "irresistable"], ["judgment", "judgement"],
        ["liaison", "liason"], ["library", "libary"], ["medieval", "midevil"],
        ["occasion", "occassion"], ["pavilion", "pavillion"], ["playwright", "playwrite"],
        ["possession", "posession"], ["publicly", "publically"], ["questionnaire", "questionaire"],
        ["recommend", "reccomend"], ["referred", "refered"], ["relevant", "relevent"],
        ["schedule", "shedule"], ["tomorrow", "tommorow"], ["vacuum", "vaccuum"],
        ["weird", "wierd"], ["parallel", "paralell"], ["arguing", "arguement"],
        ["cemetary", "cemetery"], ["desperate", "desparate"],
      ].map(([good, bad]) => [good.toLowerCase(), bad.toLowerCase()]);
      let round, score, streak, bestScore, timeLeft, timer, wrongIdx, options;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="sd-score">0</div></div>
          <div class="score-cell"><div class="label">Streak</div><div class="val" id="sd-streak">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="sd-time">45</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sd-best">0</div></div>
        </div>
        <div class="status info" id="sd-status">One of these words is misspelled — find it!</div>
        <div class="center" id="sd-opts"></div>
        <p class="hint">Wrong pick = −10 and the streak resets. The clock is merciless.</p>
      `;

      const optsEl = root.querySelector("#sd-opts");
      const statusEl = root.querySelector("#sd-status");
      bestScore = Storage.getBest("spellingdetective") || 0;

      const style = document.createElement("style");
      style.textContent = `
        .sd-opt { padding:14px 20px; margin:6px; border-radius:10px; background:var(--bg-soft,#334155);
                  color:var(--text,#eee); font-size:19px; font-weight:600; cursor:pointer; border:2px solid transparent; }
        .sd-opt:hover { border-color:var(--accent,#6366f1); }
        .sd-opt.right { background:#166534; color:#fff; }
        .sd-opt.wrong { background:#991b1b; color:#fff; }
      `;
      root.appendChild(style);

      function start() {
        score = 0;
        streak = 0;
        timeLeft = 45;
        clearInterval(timer);
        timer = setInterval(() => {
          timeLeft--;
          root.querySelector("#sd-time").textContent = timeLeft;
          if (timeLeft <= 0) end();
        }, 1000);
        next();
      }

      function next() {
        // 3 correct spellings + 1 misspelled
        const pool = PAIRS.slice().sort(() => Math.random() - 0.5).slice(0, 4);
        wrongIdx = Math.floor(Math.random() * 4);
        options = pool.map(([good, bad], i) => i === wrongIdx ? bad : good);
        statusEl.textContent = "One of these words is misspelled — find it!";
        statusEl.className = "status info";
        render();
      }

      function pick(i) {
        clearInterval(timer);
        if (i === wrongIdx) {
          score += 15 + streak * 5;
          streak++;
          AudioFX.win();
          statusEl.textContent = `Correct! “${options[i]}” is the misspelling. The right spelling: “${PAIRS.find(p => p[1] === options[i])[0]}”`;
          statusEl.className = "status win";
          markOptions(i);
        } else {
          score = Math.max(0, score - 10);
          streak = 0;
          AudioFX.error();
          statusEl.textContent = `“${options[i]}” is actually spelled right. The typo was “${options[wrongIdx]}”`;
          statusEl.className = "status lose";
          markOptions(i, wrongIdx);
        }
        updateHud();
        after(() => {
          if (timeLeft > 0) {
            next();
            restartTimer();
          }
        }, 1300);
      }

      function restartTimer() {
        clearInterval(timer);
        timer = setInterval(() => {
          timeLeft--;
          root.querySelector("#sd-time").textContent = timeLeft;
          if (timeLeft <= 0) end();
        }, 1000);
      }

      function markOptions(picked, actual) {
        const els = optsEl.querySelectorAll(".sd-opt");
        els.forEach((el, i) => {
          if (i === picked && actual === undefined) el.classList.add("right");
          else if (actual !== undefined && i === picked) el.classList.add("wrong");
          else if (actual !== undefined && i === actual) el.classList.add("right");
          el.style.pointerEvents = "none";
        });
        after(() => els.forEach(el => el.style.pointerEvents = ""), 1300);
      }

      function end() {
        clearInterval(timer);
        AudioFX.lose();
        statusEl.textContent = `Time! Final score ${score}`;
        statusEl.className = "status " + (score >= 100 ? "win" : "lose");
        if (score > bestScore) {
          bestScore = score;
          Storage.setBest("spellingdetective", score);
          App.toast("New best: " + score, "success");
        }
        updateHud();
        optsEl.innerHTML = `<button class="btn primary" id="sd-again">🔍 Play again</button>`;
        optsEl.querySelector("#sd-again").addEventListener("click", start);
      }

      function updateHud() {
        root.querySelector("#sd-score").textContent = score;
        root.querySelector("#sd-streak").textContent = streak;
        root.querySelector("#sd-time").textContent = timeLeft;
        root.querySelector("#sd-best").textContent = bestScore;
      }

      function render() {
        updateHud();
        optsEl.innerHTML = "";
        options.forEach((w, i) => {
          const b = document.createElement("div");
          b.className = "sd-opt";
          b.textContent = w;
          b.addEventListener("pointerdown", () => pick(i));
          optsEl.appendChild(b);
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
      App.showModal("How to play Spelling Detective",
        `Four words appear — <b>exactly one is misspelled</b>. Click the impostor.
        <br><br>Correct bust: <b>+15 plus 5 per streak</b>. Wrong accusation: <b>−10</b> and your streak resets.
        45 seconds on the clock. All 50 typos are the most common real-world misspellings.`);
    },
  });
})();
