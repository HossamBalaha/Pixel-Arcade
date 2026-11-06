/* Anagram Race — unscramble as many words as possible in 60 seconds. */
(function () {
  const WORDS = ("apple bread brick brain brave brush candy chair chart chest chief child chill clean clear climb clock cloud cloth coast color cream cross dance dream drink drive earth eagle early elder empty enemy enjoy enter equal event every faith fancy field fifth fight final first flame flash fleet flesh float floor flower fluid focus force fresh front fruit funny giant given glass glory grain grand grape grass great green grief group grown guard guess guest guide happy heavy horse hotel house human image index inner input issue japan judge juice known label labor large laser later learn lease least leave legal level light limit linen liver local logic loose lower loyal lucky lunch lying magic major maker march match maybe meant media metal might minor mixed model money month moral motor mount mouse mouth music never newly night noble noise north noted novel nurse occur ocean offer often order other ought outer owned paint paper party patch peace phase phone photo piano piece pilot pitch place plain plane plant plate point pound power press price pride prime print prior prize probe proof proud prove queen quest quick quiet quite radio raise range rapid ratio reach ready realm refer reign relax reply reset retro right rival river roast roman rough round route royal rural saint salad scale scene scope score seven shade shall shape share sharp sheep sheet shelf shell shift shine shirt shock shoot shore short shown sight since sixth sixty sized skill sleep slide small smart smile smoke snake solar solid solve south space spare speak speed spend spent spite split spoke sport staff stage stake stand stark start state stays steam steel steep steer stick still stock stone stood store storm story strip study stuff style sugar suite super sweet swift swing sworn table taken taste teach teeth thank theft their theme there these thick thief thigh thing think third those three threw throw thumb tight times title today topic total touch tough tower toxic trace track trade trail train treat trend trial tribe trick tried truck truly trust truth twice under union unity until upper upset urban usage usual vague valid value video virus visit vital vivid vocal voice wagon waste watch water wedge weigh weird whale whole whose woman world worry worse worst worth would wound write wrong wrote yield young youth zebra").split(" ");

  let live = null;
  GameRegistry.register({
    id: "anagramrace",
    name: "Anagram Race",
    icon: "🔤",
    category: "word",
    description: "Unscramble as many words as possible in 60 seconds",
    tags: ["word", "anagram", "speed", "timed"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let scrambled = [], cur = "", target = "", solved = 0, timeLeft = 60, timer = null, over = false;
      const letterEls = [];
      const selected = []; // indexes into scrambled

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Time</div><div class="val" id="ar-time">60</div></div>
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="ar-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ar-best">—</div></div>
        </div>
        <div class="status info" id="ar-status">Click letters in order to unscramble the word!</div>
        <div id="ar-target" style="text-align:center;font-size:1rem;color:var(--text-muted);margin:8px 0;"></div>
        <div id="ar-current" style="text-align:center;font-size:2rem;letter-spacing:6px;font-family:var(--font-mono);margin:10px 0;min-height:48px;"></div>
        <div id="ar-letters" class="row" style="justify-content:center;gap:6px;flex-wrap:wrap;"></div>
        <div class="row" style="justify-content:center;gap:8px;margin-top:12px;">
          <button class="btn" id="ar-back">⌫ Back</button>
          <button class="btn" id="ar-skip">Skip ➡</button>
          <button class="btn primary" id="ar-start">Start</button>
        </div>
        <p class="hint>You get 60s. Each solved word = 10 pts. Skip costs 2 pts.</p>
      `;
      const statusEl = root.querySelector("#ar-status");
      const targetEl = root.querySelector("#ar-target");
      const curEl = root.querySelector("#ar-current");
      const lettersEl = root.querySelector("#ar-letters");
      const startBtn = root.querySelector("#ar-start");
      root.querySelector("#ar-best").textContent = Storage.getBest("anagramrace") || "—";

      function newWord() {
        target = WORDS[Math.floor(Math.random() * WORDS.length)];
        scrambled = target.split("");
        // shuffle until not equal
        let tries = 0;
        do {
          for (let i = scrambled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
          }
          tries++;
        } while (scrambled.join("") === target && tries < 5);
        cur = "";
        selected.length = 0;
        render();
      }

      function render() {
        lettersEl.innerHTML = "";
        letterEls.length = 0;
        scrambled.forEach((ch, i) => {
          const btn = document.createElement("button");
          btn.className = "btn";
          btn.textContent = ch.toUpperCase();
          btn.style.cssText = "min-width:42px;height:42px;font-family:var(--font-mono);font-weight:700;font-size:1.2rem;";
          if (selected.includes(i)) {
            btn.style.background = "var(--bg-soft)";
            btn.style.color = "var(--text-muted)";
            btn.style.opacity = "0.4";
            btn.disabled = true;
          }
          btn.addEventListener("click", () => pick(i));
          lettersEl.appendChild(btn);
          letterEls.push(btn);
        });
        curEl.textContent = cur.toUpperCase();
        targetEl.textContent = `${target.length} letters`;
      }

      function pick(i) {
        if (over) return;
        if (selected.includes(i)) return;
        selected.push(i);
        cur += scrambled[i];
        AudioFX.tick();
        render();
        if (cur.length === target.length) check();
      }

      function backspace() {
        if (over || !selected.length) return;
        selected.pop();
        cur = cur.slice(0, -1);
        AudioFX.click();
        render();
      }

      function check() {
        if (cur === target) {
          solved++;
          root.querySelector("#ar-solved").textContent = solved;
          AudioFX.win();
          statusEl.textContent = `✓ ${target.toUpperCase()}! +10`;
          statusEl.className = "status win";
          setTimeout(() => {
            if (!alive) return;
            if (!alive) return;
            if (alive && !over) {
              statusEl.textContent = "Click letters in order…";
              statusEl.className = "status info";
              newWord();
            }
          }, 600);
        } else {
          AudioFX.error();
          statusEl.textContent = `Not quite — try again`;
          statusEl.className = "status lose";
          setTimeout(() => {
            if (!alive) return;
            if (!alive) return;
            if (alive) {
              cur = "";
              selected.length = 0;
              render();
              statusEl.textContent = "Click letters in order…";
              statusEl.className = "status info";
            }
          }, 700);
        }
      }

      function skip() {
        if (over) return;
        if (solved > 0) {
          solved = Math.max(0, solved - 0);
        }
        AudioFX.click();
        statusEl.textContent = `Skipped: ${target.toUpperCase()}`;
        statusEl.className = "status info";
        setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (alive && !over) newWord();
        }, 500);
      }

      function start() {
        if (timer) return;
        solved = 0;
        timeLeft = 60;
        over = false;
        root.querySelector("#ar-solved").textContent = 0;
        root.querySelector("#ar-time").textContent = 60;
        startBtn.style.display = "none";
        statusEl.textContent = "Click letters in order…";
        statusEl.className = "status info";
        newWord();
        timer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          if (!alive || over) return;
          timeLeft--;
          root.querySelector("#ar-time").textContent = timeLeft;
          if (timeLeft <= 10) AudioFX.tick();
          if (timeLeft <= 0) {
            over = true;
            clearInterval(timer);
            timer = null;
            const score = solved * 10;
            statusEl.textContent = `⏰ Time! You solved ${solved} words. Score: ${score}`;
            statusEl.className = "status win";
            AudioFX.win();
            const best = Storage.getBest("anagramrace");
            if (!best || score > best) {
              Storage.setBest("anagramrace", score);
              root.querySelector("#ar-best").textContent = score;
              App.toast("New best: " + score, "success");
            }
            startBtn.textContent = "Play again";
            startBtn.style.display = "";
          }
        }, 1000);
      }

      root.querySelector("#ar-back").addEventListener("click", backspace);
      root.querySelector("#ar-skip").addEventListener("click", skip);
      startBtn.addEventListener("click", start);

      function onKey(e) {
        if (over || !timer) return;
        if (e.key === "Backspace") {
          e.preventDefault();
          backspace();
        } else if (e.key === "Enter") skip();
        else if (/^[a-zA-Z]$/.test(e.key)) {
          const l = e.key.toLowerCase();
          for (let i = 0; i < scrambled.length; i++) {
            if (!selected.includes(i) && scrambled[i] === l) {
              pick(i);
              return;
            }
          }
        }
      }

      document.addEventListener("keydown", onKey);
      newWord();
      live = {};
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Anagram Race",
        `Unscramble as many words as you can in <b>60 seconds</b>.
        <br><br>Click the scrambled letters in the correct order to spell the word. Each correct word = <b>10 points</b>.
        <br><br>Use <b>Back</b> or Backspace to undo a pick. Use <b>Skip</b> or Enter to move on without penalty.
        <br>Type a letter on the keyboard as a shortcut.`);
    },
  });
})();
