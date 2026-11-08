/* Portmanteau — build the blended words */
(function () {
  GameRegistry.register({
    id: "portmanteau",
    name: "Portmanteau",
    icon: "🔀",
    category: "word",
    description: "Brunch = breakfast + lunch — build the blended words",
    tags: ["word", "blends", "vocabulary"],
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
      const DATA = [
        {p: "BRUNCH", a: "BREAKFAST", b: "LUNCH"},
        {p: "SMOG", a: "SMOKE", b: "FOG"},
        {p: "MOTEL", a: "MOTOR", b: "HOTEL"},
        {p: "SPORK", a: "SPOON", b: "FORK"},
        {p: "LABRADOODLE", a: "LABRADOR", b: "POODLE"},
        {p: "GUESSTIMATE", a: "GUESS", b: "ESTIMATE"},
        {p: "CHILLAX", a: "CHILL", b: "RELAX"},
        {p: "BOLLYWOOD", a: "BOMBAY", b: "HOLLYWOOD"},
        {p: "ELECTROCUTE", a: "ELECTRIC", b: "EXECUTE"},
        {p: "INFOMERCIAL", a: "INFORMATION", b: "COMMERCIAL"},
        {p: "SIMULCAST", a: "SIMULTANEOUS", b: "BROADCAST"},
        {p: "WEBINAR", a: "WEB", b: "SEMINAR"},
        {p: "PODCAST", a: "IPOD", b: "BROADCAST"},
        {p: "EMOTICON", a: "EMOTION", b: "ICON"},
        {p: "FRENEMY", a: "FRIEND", b: "ENEMY"},
        {p: "GLAMPING", a: "GLAMOROUS", b: "CAMPING"},
        {p: "STAYCATION", a: "STAY", b: "VACATION"},
        {p: "BREATHALYZER", a: "BREATH", b: "ANALYZER"},
        {p: "MALWARE", a: "MALICIOUS", b: "SOFTWARE"},
        {p: "NETIZEN", a: "NET", b: "CITIZEN"},
        {p: "OXIMORON", a: "OXYGEN", b: "MORON"},
        {p: "PIXELATED", a: "PIXEL", b: "ELATED"},
        {p: "TURDUCKEN", a: "TURKEY", b: "DUCK"},
        {p: "VEGEBURGER", a: "VEGETABLE", b: "HAMBURGER"},
        {p: "CROSSBREED", a: "CROSS", b: "BREED"},
      ];
      let item, halves, picked, score, best, solvedCount;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="pm-score">0</div></div>
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="pm-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="pm-best">0</div></div>
        </div>
        <div class="status info" id="pm-status">Pick the two words that blend into the target word</div>
        <div class="center" id="pm-target" style="font-size:26px;font-weight:800;letter-spacing:3px;margin:12px 0;"></div>
        <div class="center" id="pm-opts"></div>
        <p class="hint">Watch for overlapping letters where the two source words meet!</p>
      `;

      const targetEl = root.querySelector("#pm-target");
      const optsEl = root.querySelector("#pm-opts");
      const statusEl = root.querySelector("#pm-status");
      best = Storage.getBest("portmanteau") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        .pm-opt { padding:10px 16px; margin:5px; border-radius:9px; background:var(--bg-soft,#334155);
                  color:var(--text,#eee); font-size:15px; font-weight:700; cursor:pointer; border:2px solid transparent; }
        .pm-opt:hover { border-color:var(--accent,#6366f1); }
        .pm-opt.sel { border-color:#fbbf24; background:#78350f; }
        .pm-opt.right { background:#166534; color:#fff; }
      `;
      root.appendChild(style);

      function generate() {
        const pool = DATA.slice().sort(() => Math.random() - 0.5);
        item = pool[0];
        const distractors = pool.slice(1, 5).flatMap(x => [x.a, x.b]);
        const opts = [item.a, item.b, ...distractors].sort(() => Math.random() - 0.5);
        halves = opts;
        picked = new Set();
        targetEl.textContent = item.p;
        statusEl.textContent = "Pick the two words that blend into the target word";
        statusEl.className = "status info";
        render();
      }

      function pick(i) {
        if (picked.has(i)) {
          picked.delete(i);
          AudioFX.click();
          render();
          return;
        }
        if (picked.size >= 2) return;
        picked.add(i);
        AudioFX.pop();
        render();
        if (picked.size === 2) {
          const [a, b] = [...picked].map(k => halves[k]);
          const isRight = (a === item.a && b === item.b) || (a === item.b && b === item.a);
          after(() => {
            if (isRight) {
              score += 20;
              solvedCount++;
              AudioFX.win();
              if (score > best) {
                best = score;
                Storage.setBest("portmanteau", score);
              }
              statusEl.textContent = `🔀 ${item.a} + ${item.b} = ${item.p}!`;
              statusEl.className = "status win";
              updateHud();
              after(generate, 1500);
            } else {
              score = Math.max(0, score - 5);
              AudioFX.error();
              statusEl.textContent = `Not quite — try again!`;
              statusEl.className = "status lose";
              picked.clear();
              updateHud();
              render();
            }
          }, 350);
        }
      }

      function updateHud() {
        root.querySelector("#pm-score").textContent = score;
        root.querySelector("#pm-solved").textContent = solvedCount;
        root.querySelector("#pm-best").textContent = best;
      }

      function render() {
        updateHud();
        optsEl.innerHTML = "";
        halves.forEach((w, i) => {
          const b = document.createElement("div");
          b.className = "pm-opt" + (picked.has(i) ? " sel" : "");
          b.textContent = w;
          b.addEventListener("pointerdown", () => pick(i));
          optsEl.appendChild(b);
        });
      }

      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Portmanteau",
        `A portmanteau squishes two words into one: <b>SMOKE + FOG = SMOG</b>, <b>BREAKFAST + LUNCH = BRUNCH</b>.
        <br><br>The target blend is shown on top. From the six candidates, pick the <b>two source words</b>
        that fuse into it. +20 per solve, −5 for a wrong pair. Some blends share letters where they join — mind the overlap!`);
    },
  });
})();
