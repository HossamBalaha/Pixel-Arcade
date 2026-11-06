/* Swordle — Speed Wordle: race a 60-second timer to guess the 5-letter word. */
(function () {
  const WORDS = "about above abuse actor acute admit adopt adult after again agent agree ahead alarm album alert alien align alike alive allow alone along alpha alter among anger angle angry apart apple apply arena argue arise array arrow aside asset audio audit avoid award aware badly baker basic basis beach began begin begun being below bench birth black blade blame blank blast blend bless blind block blood board boost booth bound brain brand brass brave bread break breed brick brief bring broad brown brush build built buyer cable cabin candy carry catch cause chain chair chaos charm chart cheap check chest chief child china chose civic civil claim class clean clear click cliff climb clock close cloth cloud clown coach coast color could count court cover craft crash crazy cream crime cross crowd crown crude curve cycle daily dance dated dealt death debit delay depth doing doubt dozen draft drama drank dream dress drift drive drove dryer dying eager early earth eight elite empty enemy enjoy enter entry equal error event every exact exist extra faith false fault fiber field fifth fifty fight final first fixed flame flash fleet flesh float floor fluid focus force forge forty found frame frank fraud fresh front fruit fully funny giant given glass globe glory glove going grace grade grain grand grant grass grave great green grief gross group grown guard guess guest guide happy harsh heart heavy hello hence henry horse hotel house human ideal image imply index inner input inter issue ivory japan jewel joint judge juice known label labor large laser later laugh layer learn lease least leave legal level light limit linen liver local logic loose lower loyal lucky lunch lying magic major maker march match maybe mayor meant media metal might minor minus mixed model money month moral motor mount mouse mouth movie music needs never newly night noble noise north noted novel nurse occur ocean offer often order other ought outer owned paint paper paris party patch peace phase phone photo piano piece pilot pitch place plain plane plant plate point pound power press price pride prime print prior prize probe proof proud prove queen quest quick quiet quite radio raise range rapid ratio reach ready realm refer regal reign relax reply reset retro right rival river roast roman rough round route royal rural saint salad scale scene scope score scorn scott sense seven shade shall shame shape share sharp sheep sheet shelf shell shift shine shirt shock shoot shore short shown sight sigma since sixth sixty sized skill sleep slide small smart smile smoke snake solar solid solve south space spare speak speed spend spent spite split spoke sport staff stage stake stand stark start state stays steam steel steep steer steve stick still stock stone stood store storm story strip study stuff style sugar suite super sweet swift swing sworn table taken taste teach teeth terry texas thank theft their theme there these thick thief thigh thing think third those three threw throw thumb tight times title today topic total touch tough tower toxic trace track trade trail train treat trend trial tribe trick tried truck truly trust truth twice under union unity until upper upset urban usage usual vague valid value video virus visit vital vivid vocal voice wagon waste watch water wedge weigh weird whale whole whose woman world worry worse worst worth would wound write wrong wrote yield young youth zebra".split(" ");

  function evaluate(guess, answer) {
    const res = Array(answer.length).fill("absent");
    const a = answer.split("");
    for (let i = 0; i < a.length; i++) if (guess[i] === a[i]) {
      res[i] = "correct";
      a[i] = null;
    }
    for (let i = 0; i < a.length; i++) {
      if (res[i] === "correct") continue;
      const j = a.indexOf(guess[i]);
      if (j !== -1) {
        res[i] = "present";
        a[j] = null;
      }
    }
    return res;
  }

  let live = null;
  GameRegistry.register({
    id: "swordle",
    name: "Swordle",
    icon: "⚔️",
    category: "word",
    description: "Speed Wordle — race a 60-second timer",
    tags: ["word", "wordle", "speed", "timed"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      const LEN = 5, MAX = 6;
      let answer = "", guesses = [], current = "", over = false, timeLeft = 60, timer = null;
      const keyState = {};
      const KBD = ["qwertyuiop".split(""), "asdfghjkl".split(""), ["ENTER", ..."zxcvbnm".split(""), "BACK"]];

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Time</div><div class="val" id="sw-time">60</div></div>
          <div class="score-cell"><div class="label">Tries</div><div class="val" id="sw-tries">0/6</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sw-best">—</div></div>
        </div>
        <div class="status info" id="sw-status">Guess the 5-letter word before time runs out!</div>
        <div class="col" id="sw-rows" style="gap:6px;align-items:center;"></div>
        <div class="col" id="sw-kb" style="gap:6px;margin-top:8px;align-items:center;"></div>
        <p class="hint">Type or tap letters. <b>Enter</b> submits. Faster solve = more points.</p>
      `;
      const rowsEl = root.querySelector("#sw-rows");
      const kbEl = root.querySelector("#sw-kb");
      const statusEl = root.querySelector("#sw-status");

      function renderRows() {
        rowsEl.innerHTML = "";
        for (let r = 0; r < MAX; r++) {
          const row = document.createElement("div");
          row.className = "word-row";
          for (let i = 0; i < LEN; i++) {
            const cell = document.createElement("div");
            cell.className = "letter";
            if (r < guesses.length) {
              cell.textContent = guesses[r].guess[i];
              cell.classList.add(guesses[r].eval[i], "flip");
            } else if (r === guesses.length && !over) {
              cell.textContent = (current[i] || "").toUpperCase();
              if (current[i]) cell.classList.add("filled");
            }
            row.appendChild(cell);
          }
          rowsEl.appendChild(row);
        }
        root.querySelector("#sw-tries").textContent = `${guesses.length}/${MAX}`;
      }

      function renderKb() {
        kbEl.innerHTML = "";
        KBD.forEach(line => {
          const row = document.createElement("div");
          row.className = "row";
          row.style.justifyContent = "center";
          line.forEach(k => {
            const btn = document.createElement("button");
            btn.className = "key";
            btn.textContent = k === "BACK" ? "⌫" : k === "ENTER" ? "↵" : k.toUpperCase();
            if (k.length > 1) btn.style.minWidth = "56px";
            if (keyState[k]) btn.classList.add("used-" + keyState[k]);
            btn.addEventListener("click", () => {
              if (k === "ENTER") submit(); else if (k === "BACK") back(); else type(k);
            });
            row.appendChild(btn);
          });
          kbEl.appendChild(row);
        });
      }

      function type(l) {
        if (over) return;
        if (current.length >= LEN) return;
        current += l.toLowerCase();
        AudioFX.tick();
        renderRows();
      }

      function back() {
        if (over) return;
        current = current.slice(0, -1);
        AudioFX.click();
        renderRows();
      }

      function submit() {
        if (over) return;
        if (current.length !== LEN) {
          AudioFX.error();
          return;
        }
        if (!WORDS.includes(current.toLowerCase())) {
          AudioFX.error();
          statusEl.textContent = "Not in word list";
          statusEl.className = "status lose";
          return;
        }
        const guess = current.toUpperCase();
        const ev = evaluate(guess, answer);
        guesses.push({guess, eval: ev});
        for (let i = 0; i < LEN; i++) {
          const l = guess[i].toLowerCase();
          const order = {absent: 0, present: 1, correct: 2};
          if (!keyState[l] || order[ev[i]] > order[keyState[l]]) keyState[l] = ev[i];
        }
        current = "";
        AudioFX.flip();
        renderRows();
        renderKb();
        if (guess === answer) {
          over = true;
          clearInterval(timer);
          const score = timeLeft * 10 + (MAX - guesses.length) * 20;
          statusEl.textContent = `🎉 Solved in ${guesses.length} tries! Score: ${score}`;
          statusEl.className = "status win";
          AudioFX.win();
          const best = Storage.getBest("swordle");
          if (!best || score > best) {
            Storage.setBest("swordle", score);
            root.querySelector("#sw-best").textContent = score;
            App.toast("New best: " + score, "success");
          }
        } else if (guesses.length >= MAX) {
          over = true;
          clearInterval(timer);
          statusEl.textContent = `Out of guesses! Word was ${answer}.`;
          statusEl.className = "status lose";
          AudioFX.lose();
        } else {
          statusEl.textContent = `Guess ${guesses.length + 1} of ${MAX}`;
          statusEl.className = "status info";
        }
      }

      function onKey(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        } else if (e.key === "Backspace") {
          e.preventDefault();
          back();
        } else if (/^[a-zA-Z]$/.test(e.key)) type(e.key);
      }

      document.addEventListener("keydown", onKey);

      function newGame() {
        answer = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
        guesses = [];
        current = "";
        over = false;
        timeLeft = 60;
        for (const k in keyState) delete keyState[k];
        statusEl.textContent = "Guess the 5-letter word before time runs out!";
        statusEl.className = "status info";
        root.querySelector("#sw-time").textContent = timeLeft;
        renderRows();
        renderKb();
        clearInterval(timer);
        timer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          if (!alive || over) return;
          timeLeft--;
          root.querySelector("#sw-time").textContent = timeLeft;
          if (timeLeft <= 10) AudioFX.tick();
          if (timeLeft <= 0) {
            over = true;
            clearInterval(timer);
            statusEl.textContent = `⏰ Time up! Word was ${answer}.`;
            statusEl.className = "status lose";
            AudioFX.lose();
          }
        }, 1000);
      }

      function doSolve() {
        if (over) return;
        current = answer.toLowerCase();
        AudioFX.click();
        renderRows();
        submit();
      }

      live = {solve: doSolve};
      newGame();
      root.querySelector("#sw-best").textContent = Storage.getBest("swordle") || "—";
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        clearInterval(timer);
      };
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Swordle",
        `Guess the 5-letter word before the 60-second timer hits zero.
        <br><br>Same color rules as Wordle: 🟩 green = right letter & spot, 🟨 yellow = in word, wrong spot, ⬛ gray = not in word.
        <br><br>Score = (time left × 10) + (tries left × 20). Beat your best score!`);
    },
  });
})();
