/* Phrazle — guess the hidden phrase, Wheel-of-Fortune style */
(function () {
  GameRegistry.register({
    id: "phrazle",
    name: "Phrazle",
    icon: "💬",
    category: "word",
    description: "Guess the hidden phrase — Wheel-of-Fortune style",
    tags: ["word", "phrase", "guessing"],
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
      const PHRASES = [
        {p: "BREAK A LEG", c: "Theater wishes"},
        {p: "PIECE OF CAKE", c: "Very easy"},
        {p: "ONCE IN A BLUE MOON", c: "Very rarely"},
        {p: "BITE THE BULLET", c: "Face something unpleasant"},
        {p: "UNDER THE WEATHER", c: "Feeling ill"},
        {p: "COST AN ARM AND A LEG", c: "Very expensive"},
        {p: "SPILL THE BEANS", c: "Reveal a secret"},
        {p: "THE EARLY BIRD", c: "First to arrive"},
        {p: "TIME FLIES", c: "Hours pass quickly"},
        {p: "ELEPHANT IN THE ROOM", c: "Obvious unspoken issue"},
        {p: "BEST OF BOTH WORLDS", c: "Two advantages at once"},
        {p: "A DIME A DOZEN", c: "Common, cheap"},
        {p: "HIT THE NAIL ON THE HEAD", c: "Exactly right"},
        {p: "BURNING THE MIDNIGHT OIL", c: "Working late"},
        {p: "CURIOSITY KILLED THE CAT", c: "Don't pry"},
        {p: "A BLESSING IN DISGUISE", c: "Hidden good luck"},
        {p: "LET THE CAT OUT OF THE BAG", c: "Reveal a secret"},
        {p: "PRACTICE MAKES PERFECT", c: "Repetition masters"},
        {p: "THE WHOLE NINE YARDS", c: "Everything"},
        {p: "WHEN PIGS FLY", c: "Never gonna happen"},
        {p: "CUT TO THE CHASE", c: "Get to the point"},
        {p: "SPEAK OF THE DEVIL", c: "They just appeared"},
        {p: "NO PAIN NO GAIN", c: "Effort rewards"},
        {p: "EASIER SAID THAN DONE", c: "Harder in practice"},
        {p: "STRAW THAT BROKE THE CAMELS BACK", c: "Final small burden"},
      ];
      let phrase, category, guessed, wrong, solvedCount, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="ph-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ph-best">0</div></div>
          <div class="score-cell"><div class="label">Misses</div><div class="val" id="ph-wrong">0/6</div></div>
        </div>
        <div class="status info" id="ph-status">Guess letters — reveal the phrase before 6 misses</div>
        <div class="center" id="ph-phrase" style="margin:10px 0;"></div>
        <div class="center" id="ph-kbd"></div>
        <p class="hint" style="text-align:center;">Category hint shown above the phrase slots.</p>
      `;

      const phraseEl = root.querySelector("#ph-phrase");
      const kbdEl = root.querySelector("#ph-kbd");
      const statusEl = root.querySelector("#ph-status");
      best = Storage.getBest("phrazle") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        .ph-slot { display:inline-flex; align-items:center; justify-content:center; width:26px; height:34px; margin:3px;
                   border-radius:5px; background:var(--bg-soft,#334155); font-weight:700; font-size:17px; color:var(--text,#eee); }
        .ph-slot.space { background:transparent; }
        .ph-slot.on { background:#16a34a; color:#fff; }
        .ph-k { display:inline-flex; align-items:center; justify-content:center; width:30px; height:34px; margin:2px;
                border-radius:5px; background:var(--bg-soft,#334155); color:var(--text,#eee); font-weight:700; cursor:pointer; user-select:none; }
        .ph-k.hit { background:#16a34a; color:#fff; }
        .ph-k.miss { background:#7f1d1d; color:#fecaca; opacity:0.6; }
      `;
      root.appendChild(style);

      function generate() {
        const item = PHRASES[Math.floor(Math.random() * PHRASES.length)];
        phrase = item.p;
        category = item.c;
        guessed = new Set();
        wrong = 0;
        statusEl.textContent = "Guess letters — reveal the phrase before 6 misses";
        statusEl.className = "status info";
        render();
      }

      function guessLetter(L) {
        if (guessed.has(L) || wrong >= 6) return;
        guessed.add(L);
        if (phrase.includes(L)) {
          AudioFX.pop();
        } else {
          wrong++;
          AudioFX.error();
        }
        render();
        const lettersLeft = [...new Set(phrase.replace(/[^A-Z]/g, ""))].filter(l => !guessed.has(l)).length;
        if (lettersLeft === 0) {
          AudioFX.win();
          solvedCount++;
          if (solvedCount > best) {
            best = solvedCount;
            Storage.setBest("phrazle", best);
          }
          statusEl.textContent = `💬 “${phrase}” — solved! New phrase incoming…`;
          statusEl.className = "status win";
          after(generate, 2200);
        } else if (wrong >= 6) {
          AudioFX.lose();
          statusEl.textContent = `Out of misses! It was “${phrase}”. New phrase incoming…`;
          statusEl.className = "status lose";
          after(generate, 2600);
        }
      }

      function render() {
        root.querySelector("#ph-solved").textContent = solvedCount;
        root.querySelector("#ph-best").textContent = best;
        root.querySelector("#ph-wrong").textContent = wrong + "/6";
        // phrase
        let html = `<div style="color:var(--text-muted,#94a3b8);font-size:13px;margin-bottom:6px;">💡 Category: <b>${category}</b></div><div>`;
        for (const ch of phrase) {
          if (ch === " ") html += `<span class="ph-slot space"></span>`;
          else if (/[A-Z]/.test(ch)) {
            const on = guessed.has(ch);
            html += `<span class="ph-slot ${on ? "on" : ""}">${on ? ch : ""}</span>`;
          } else html += `<span class="ph-slot">${ch}</span>`;
        }
        html += `</div>`;
        phraseEl.innerHTML = html;
        // keyboard
        kbdEl.innerHTML = "";
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(L => {
          const k = document.createElement("div");
          const hit = guessed.has(L) && phrase.includes(L);
          const miss = guessed.has(L) && !phrase.includes(L);
          k.className = "ph-k" + (hit ? " hit" : miss ? " miss" : "");
          k.textContent = L;
          if (!guessed.has(L)) k.addEventListener("pointerdown", () => guessLetter(L));
          kbdEl.appendChild(k);
        });
      }

      const onKey = (e) => {
        if (/^[a-zA-Z]$/.test(e.key)) guessLetter(e.key.toUpperCase());
      };
      document.addEventListener("keydown", onKey);

      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Phrazle",
        `A hidden phrase, a category hint, and the whole alphabet. Click letters (or type) to reveal them.
        <br><br>Correct letters turn green and fill every slot where they appear; wrong letters count as misses
        (<b>6 allowed</b>). Reveal the whole phrase to win. Vowels are free here — no wheel spinning required!`);
    },
  });
})();
