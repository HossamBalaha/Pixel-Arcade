/* Pig Latin — decode phrases written in Pig Latin */
(function () {
  GameRegistry.register({
    id: "piglatin",
    name: "Pig Latin",
    icon: "🐷",
    category: "word",
    description: "Decode phrases written in Pig Latin",
    tags: ["word", "code", "fun"],
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
        "HELLO WORLD", "GOOD MORNING", "THANK YOU VERY MUCH", "PIG LATIN IS FUN",
        "THE QUICK BROWN FOX", "HAVE A NICE DAY", "SEE YOU LATER", "LET US PLAY A GAME",
        "BREAKFAST IS READY", "I LOVE PUZZLES", "WHAT TIME IS IT", "WELCOME TO THE ARCADE",
        "CODE LIKE A PRO", "PRACTICE EVERY DAY", "NEVER GIVE UP", "DREAM BIG WORK HARD",
        "KNOWLEDGE IS POWER", "TIME FLIES FAST", "COFFEE OR TEA", "MUSIC SOOTHES THE SOUL",
        "READ MORE BOOKS", "STAY CURIOUS FOREVER", "LAUGH OFTEN", "BE KIND TO OTHERS",
      ];
      let round, score, best, streak, opts, answer;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="pl2-score">0</div></div>
          <div class="score-cell"><div class="label">Streak</div><div class="val" id="pl2-streak">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="pl2-best">0</div></div>
        </div>
        <div class="status info" id="pl2-status">What does this Pig Latin phrase mean?</div>
        <div class="center" id="pl2-phrase" style="margin:12px 0;font-size:20px;font-weight:700;letter-spacing:1px;"></div>
        <div class="center" id="pl2-opts"></div>
        <p class="hint">Rule: move the first consonant(s) to the end, add “ay”. Vowel-starting words just get “way”.</p>
      `;

      const phraseEl = root.querySelector("#pl2-phrase");
      const optsEl = root.querySelector("#pl2-opts");
      const statusEl = root.querySelector("#pl2-status");
      best = Storage.getBest("piglatin") || 0;

      const style = document.createElement("style");
      style.textContent = `
        .pl2-opt { display:block; width:min(420px,90%); padding:12px; margin:6px auto; border-radius:10px;
                   background:var(--bg-soft,#334155); color:var(--text,#eee); font-size:16px; font-weight:600;
                   cursor:pointer; border:2px solid transparent; text-transform:uppercase; }
        .pl2-opt:hover { border-color:var(--accent,#6366f1); }
        .pl2-opt.right { background:#166534; color:#fff; }
        .pl2-opt.wrong { background:#991b1b; color:#fff; }
      `;
      root.appendChild(style);

      function toPigLatin(word) {
        const w = word.toLowerCase();
        if (/^[aeiou]/.test(w)) return w + "way";
        const m = w.match(/^[^aeiou]+/);
        return w.slice(m[0].length) + m[0] + "ay";
      }

      function encode(phrase) {
        return phrase.toLowerCase().split(" ").map(toPigLatin).join(" ").toUpperCase();
      }

      function generate() {
        const pool = PHRASES.slice().sort(() => Math.random() - 0.5);
        answer = pool[0];
        const distractors = pool.slice(1, 4);
        opts = [answer, ...distractors].sort(() => Math.random() - 0.5);
        phraseEl.textContent = encode(answer);
        statusEl.textContent = "What does this Pig Latin phrase mean?";
        statusEl.className = "status info";
        render();
      }

      function pick(txt) {
        const els = optsEl.querySelectorAll(".pl2-opt");
        els.forEach(el => el.style.pointerEvents = "none");
        const idx = opts.indexOf(txt);
        if (txt === answer) {
          els[idx].classList.add("right");
          score += 10 + streak * 2;
          streak++;
          AudioFX.win();
          if (score > best) {
            best = score;
            Storage.setBest("piglatin", score);
          }
          statusEl.textContent = "Oinktastic! 🐷";
          statusEl.className = "status win";
          after(generate, 1100);
        } else {
          els[idx].classList.add("wrong");
          els[opts.indexOf(answer)].classList.add("right");
          streak = 0;
          score = Math.max(0, score - 5);
          AudioFX.error();
          statusEl.textContent = `“${encode(answer)}” = ${answer}`;
          statusEl.className = "status lose";
          after(generate, 2100);
        }
        updateHud();
      }

      function updateHud() {
        root.querySelector("#pl2-score").textContent = score;
        root.querySelector("#pl2-streak").textContent = streak;
        root.querySelector("#pl2-best").textContent = best;
      }

      function render() {
        updateHud();
        optsEl.innerHTML = "";
        opts.forEach(txt => {
          const b = document.createElement("div");
          b.className = "pl2-opt";
          b.textContent = txt;
          b.addEventListener("pointerdown", () => pick(txt));
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
      App.showModal("How to play Pig Latin",
        `Pig Latin rules for decoding:
        <br>• Word ends in <b>“way”</b> → the original started with a vowel: drop “way” (ello-way? no — <i>eatway = eat</i>).
        <br>• Otherwise, the letters before <b>“ay”</b> were the word's opening consonant cluster: move them back to the front.
        <br>Example: <b>AYM-GAZIN</b>… let's try <b>AGAZIN-MAY = MAGAZINE</b>.
        <br><br>Read the encoded phrase and pick the correct English translation. +10 per decode, +2 per streak.`);
    },
  });
})();
