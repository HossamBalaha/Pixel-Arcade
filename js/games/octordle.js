/* Octordle — solve 8 Wordle boards at once with 13 shared guesses */
(function () {
  // Compact 5-letter word list (subset of wordle.js WORDS).
  const WORDS = ("about above abuse actor acute admit adopt adult after again agent agree ahead alarm album alert alien align alike alive allow alone along alpha alter among anger angle angry apart apple apply arena argue arise array arrow aside asset audio audit avoid award aware badly baker basic basis beach began begin begun being below bench birth black blade blame blank blast blend bless blind block blood board boost booth bound brain brand brave bread break breed brick brief bring broad brown brush build built buyer cable candy carry catch cause chain chair chaos charm chart cheap check chest chief child china chose civic civil claim class clean clear click cliff climb clock close cloth cloud clown coach coast color could count court cover craft crash crazy cream crime cross crowd crown crude curve cycle daily dance dated dealt death debit delay depth doing doubt dozen draft drama drank dream dress drift drive drove dryer dying eager early earth eight elite empty enemy enjoy enter entry equal error event every exact exist extra faith false fault fiber field fifth fifty fight final first fixed flame flash fleet flesh float floor fluid focus force forge forty found frame frank fraud fresh front fruit fully funny giant given glass globe glory glove going grace grade grain grand grant grass grave great green grief gross group grown guard guess guest guide happy harsh heart heavy hello hence horse hotel house human ideal image imply index inner input inter issue ivory japan jewel joint judge juice known label labor large laser later laugh layer learn lease least leave legal level light limit linen liver local logic loose lower loyal lucky lunch lying magic major maker march match maybe mayor meant media metal might minor minus mixed model money month moral motor mount mouse mouth movie music needs never newly night noble noise north noted novel nurse occur ocean offer often order other ought outer owned paint paper paris party patch peace phase phone photo piano piece pilot pitch place plain plane plant plate point pound power press price pride prime print prior prize probe proof proud prove queen quest quick quiet quite radio raise range rapid ratio reach ready realm refer regal reign relax reply reset retro right rival river roast roman rough round route royal rural saint salad scale scene scope score scorn sense seven shade shall shame shape share sharp sheep sheet shelf shell shift shine shirt shock shoot shore short shown sight sigma since sixth sixty sized skill sleep slide small smart smile smoke snake solar solid solve south space spare speak speed spend spent spite split spoke sport staff stage stake stand stark start state stays steam steel steep steer stick still stock stone stood store storm story strip study stuff style sugar suite super sweet swift swing sworn table taken taste teach teeth terry texas thank theft their theme there these thick thief thigh thing think third those three threw throw thumb tight times title today topic total touch tough tower toxic trace track trade trail train treat trend trial tribe trick tried truck truly trust truth twice under union unity until upper upset urban usage usual vague valid value video virus visit vital vivid vocal voice wagon waste watch water wedge weigh weird whale whole whose woman world worry worse worst worth would wound write wrong wrote yield young youth zebra").split(" ");

  const LEN = 5;
  const MAX = 13;
  const BOARDS = 8;
  const MAX_HINTS = 3;

  function evaluate(guess, answer) {
    const res = Array(LEN).fill("absent");
    const a = answer.split("");
    for (let i = 0; i < LEN; i++) if (guess[i] === a[i]) {
      res[i] = "correct";
      a[i] = null;
    }
    for (let i = 0; i < LEN; i++) {
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
    id: "octordle",
    name: "Octordle",
    icon: "🐙",
    category: "word",
    description: "Solve 8 Wordle boards at once with 13 shared guesses",
    tags: ["word", "variant", "keyboard"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      const pendingTimers = [];

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (alive) fn();
        }, ms);
        pendingTimers.push(id);
        return id;
      }

      let boards = [];
      let current = "";
      let used = 0;
      let over = false;
      let revealed = false;
      let hintsUsed = 0;
      const keyState = {};

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Guess</div><div class="val" id="oc-used">0</div></div>
          <div class="score-cell"><div class="label">Max</div><div class="val">${MAX}</div></div>
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="oc-solved">0/8</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="oc-best">—</div></div>
        </div>
        <div class="status info" id="oc-status">Guess a 5-letter word — it applies to all 8 boards</div>
        <div id="oc-boards" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;justify-items:center;"></div>
        <div class="col" id="oc-keyboard" style="gap:6px;margin-top:8px;"></div>
        <p class="hint">Each guess hits all 8 boards. Solve all 8 within 13 tries. Stuck? Use <b>Hint</b> (max 3) or <b>Solve</b>.</p>
      `;

      const boardsEl = root.querySelector("#oc-boards");
      const kbEl = root.querySelector("#oc-keyboard");
      const statusEl = root.querySelector("#oc-status");

      const KBD = ["qwertyuiop".split(""), "asdfghjkl".split(""), ["ENTER", ..."zxcvbnm".split(""), "BACK"]];

      function makeBoard(i) {
        const wrap = document.createElement("div");
        wrap.style.display = "flex";
        wrap.style.flexDirection = "column";
        wrap.style.alignItems = "center";
        wrap.style.gap = "3px";
        const label = document.createElement("div");
        label.className = "text-sm text-muted";
        label.style.fontSize = "0.7rem";
        label.id = `oc-label-${i}`;
        label.textContent = `#${i + 1}`;
        wrap.appendChild(label);
        const grid = document.createElement("div");
        grid.id = `oc-grid-${i}`;
        wrap.appendChild(grid);
        return wrap;
      }

      for (let i = 0; i < BOARDS; i++) boardsEl.appendChild(makeBoard(i));

      function renderBoard(i) {
        const b = boards[i];
        const grid = root.querySelector(`#oc-grid-${i}`);
        const label = root.querySelector(`#oc-label-${i}`);
        grid.innerHTML = "";
        grid.style.display = "grid";
        grid.style.gridTemplateRows = `repeat(${MAX}, 22px)`;
        grid.style.gridTemplateColumns = `repeat(${LEN}, 22px)`;
        grid.style.gap = "2px";
        for (let r = 0; r < MAX; r++) {
          for (let c = 0; c < LEN; c++) {
            const cell = document.createElement("div");
            cell.style.width = "22px";
            cell.style.height = "22px";
            cell.style.display = "grid";
            cell.style.placeItems = "center";
            cell.style.fontFamily = "var(--font-heading)";
            cell.style.fontWeight = "700";
            cell.style.fontSize = "0.7rem";
            cell.style.textTransform = "uppercase";
            cell.style.border = "1.5px solid var(--border)";
            cell.style.borderRadius = "3px";
            cell.style.background = "var(--bg-elev)";
            if (r < b.guesses.length) {
              const g = b.guesses[r].guess;
              const e = b.guesses[r].eval;
              cell.textContent = g[c];
              if (e[c] === "correct") {
                cell.style.background = "var(--success)";
                cell.style.color = "#fff";
              } else if (e[c] === "present") {
                cell.style.background = "var(--warning)";
                cell.style.color = "#fff";
              } else {
                cell.style.background = "var(--bg-soft)";
                cell.style.color = "var(--text-muted)";
              }
            } else if (r === b.guesses.length && !b.solved && !over) {
              cell.textContent = current[c] || "";
              if (current[c]) cell.style.borderColor = "var(--accent)";
            }
            grid.appendChild(cell);
          }
        }
        label.textContent = `#${i + 1}${b.solved ? " ✓" : ""}`;
        label.style.color = b.solved ? "var(--success)" : "var(--text-muted)";
        label.style.fontWeight = b.solved ? "700" : "400";
      }

      function renderAll() {
        for (let i = 0; i < BOARDS; i++) renderBoard(i);
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
              if (k === "ENTER") submit();
              else if (k === "BACK") back();
              else type(k);
            });
            row.appendChild(btn);
          });
          kbEl.appendChild(row);
        });
      }

      function type(letter) {
        if (over || current.length >= LEN) return;
        current += letter.toLowerCase();
        AudioFX.tick();
        renderAll();
      }

      function back() {
        if (over) return;
        current = current.slice(0, -1);
        AudioFX.click();
        renderAll();
      }

      if (!document.getElementById("oc-shake")) {
        const s = document.createElement("style");
        s.id = "oc-shake";
        s.textContent = "@keyframes shake {0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}";
        document.head.appendChild(s);
      }

      function shake() {
        boardsEl.style.animation = "none";
        void boardsEl.offsetWidth;
        boardsEl.style.animation = "shake 0.4s";
      }

      function submit() {
        if (over) return;
        if (current.length !== LEN) {
          shake();
          AudioFX.error();
          return;
        }
        if (!WORDS.includes(current.toLowerCase())) {
          shake();
          AudioFX.error();
          statusEl.textContent = `"${current.toUpperCase()}" isn't in the word list`;
          statusEl.className = "status lose";
          later(() => {
            if (alive && !over) {
              statusEl.textContent = `Guess ${used + 1} of ${MAX}`;
              statusEl.className = "status info";
            }
          }, 1500);
          return;
        }
        const guess = current.toUpperCase();
        current = "";
        used++;
        for (let i = 0; i < BOARDS; i++) {
          const b = boards[i];
          if (b.solved) continue;
          const ev = evaluate(guess, b.answer);
          b.guesses.push({guess, eval: ev});
          if (guess === b.answer) b.solved = true;
          for (let c = 0; c < LEN; c++) {
            const l = guess[c].toLowerCase();
            const order = {absent: 0, present: 1, correct: 2};
            if (!keyState[l] || order[ev[c]] > order[keyState[l]]) keyState[l] = ev[c];
          }
        }
        AudioFX.flip();
        renderAll();
        renderKb();
        root.querySelector("#oc-used").textContent = used;
        const solvedCount = boards.filter(b => b.solved).length;
        root.querySelector("#oc-solved").textContent = solvedCount + "/8";

        if (revealed) {
          over = true;
          statusEl.textContent = `Solution revealed.`;
          statusEl.className = "status lose";
          AudioFX.lose();
          return;
        }
        if (solvedCount === BOARDS) {
          over = true;
          statusEl.textContent = `🎉 All 8 solved in ${used} ${used === 1 ? "try" : "tries"}!`;
          statusEl.className = "status win";
          AudioFX.win();
          const best = Storage.getBest("octordle");
          if (!best || used < best) {
            Storage.setBest("octordle", used);
            root.querySelector("#oc-best").textContent = used;
            App.toast("New best: " + used + " tries", "success");
          }
        } else if (used >= MAX) {
          over = true;
          statusEl.textContent = `Out of guesses. ${boards.filter(b => !b.solved).map(b => b.answer).join(", ")}`;
          statusEl.className = "status lose";
          AudioFX.lose();
        } else {
          statusEl.textContent = `Guess ${used + 1} of ${MAX} — ${solvedCount}/8 solved`;
        }
      }

      function onKey(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        } else if (e.key === "Backspace") {
          e.preventDefault();
          back();
        } else if (/^[a-zA-Z]$/.test(e.key)) {
          e.preventDefault();
          type(e.key);
        }
      }

      document.addEventListener("keydown", onKey);

      function newGame() {
        boards = [];
        const seen = new Set();
        for (let i = 0; i < BOARDS; i++) {
          let w;
          do {
            w = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
          } while (seen.has(w));
          seen.add(w);
          boards.push({answer: w, guesses: [], solved: false});
        }
        current = "";
        used = 0;
        over = false;
        revealed = false;
        hintsUsed = 0;
        for (const k in keyState) delete keyState[k];
        root.querySelector("#oc-used").textContent = "0";
        root.querySelector("#oc-solved").textContent = "0/8";
        const best = Storage.getBest("octordle");
        root.querySelector("#oc-best").textContent = best || "—";
        statusEl.textContent = "Guess a 5-letter word — it applies to all 8 boards";
        statusEl.className = "status info";
        renderAll();
        renderKb();
      }

      function doHint() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (hintsUsed >= MAX_HINTS) {
          App.toast(`No hints left (max ${MAX_HINTS} per game)`, "warning");
          return;
        }
        const unsolved = boards.map((b, i) => ({b, i})).filter(x => !x.b.solved);
        if (unsolved.length === 0) {
          App.toast("All boards already solved", "info");
          return;
        }
        let best = null, bestCount = Infinity;
        for (const u of unsolved) {
          const discovered = new Set();
          for (const g of u.b.guesses) for (let c = 0; c < LEN; c++) if (g.eval[c] === "correct") discovered.add(c);
          if (discovered.size < bestCount) {
            bestCount = discovered.size;
            best = u;
          }
        }
        const discovered = new Set();
        for (const g of best.b.guesses) for (let c = 0; c < LEN; c++) if (g.eval[c] === "correct") discovered.add(c);
        const undiscovered = [];
        for (let c = 0; c < LEN; c++) if (!discovered.has(c)) undiscovered.push(c);
        if (undiscovered.length === 0) {
          App.toast("All letters already revealed on that board", "info");
          return;
        }
        const p = undiscovered[Math.floor(Math.random() * undiscovered.length)];
        const letter = best.b.answer[p];
        hintsUsed++;
        if (current.length < LEN) {
          current += letter.toLowerCase();
          AudioFX.reveal();
          renderAll();
        }
        App.toast(`Hint: revealed letter "${letter}" (Board #${best.i + 1}, pos ${p + 1})`, "info");
      }

      function doSolve() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        revealed = true;
        over = true;
        AudioFX.lose();
        const answers = boards.map((b, i) => `<b>Board ${i + 1}:</b> ${b.answer}${b.solved ? " ✓" : ""}`).join("<br>");
        statusEl.textContent = `Solution revealed — answers shown in modal`;
        statusEl.className = "status lose";
        App.showModal("Octordle solution", answers);
      }

      live = {hint: doHint, solve: doSolve};
      newGame();

      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        pendingTimers.forEach(clearTimeout);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Octordle",
        `Solve <b>8 Wordle boards</b> at the same time using <b>13 shared guesses</b>.
        <br><br>Every guess you make is applied to all 8 boards that haven't been solved yet. Once a board is solved, it stops accepting guesses.
        <br><br>Tile colors per board work like Wordle:
        <br>🟩 <b>Green</b> — letter in the correct spot.
        <br>🟨 <b>Yellow</b> — letter in the word, wrong spot.
        <br>⬛ <b>Gray</b> — letter not in that word.
        <br><br>The on-screen keyboard shows the highest-priority state of each letter across all 8 boards.
        <br><br>Stuck? Use the <b>Hint</b> button (max 3 — reveals a correct letter on the unsolved board with fewest found letters) or <b>Solve</b> (reveals all 8 answers and ends the game as a loss).
        <br><br>Win when all 8 boards are solved. Best score = fewest guesses.`);
    },
  });
})();
