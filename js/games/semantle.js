/* Word Ladder (Semantle) — transform the START word into the END word, one letter at a time */
(function () {
  // 10 inline puzzles. Each has a start, end, and a known solution ladder.
  const PUZZLES = [
    {start: "COLD", end: "WARM", solution: ["COLD", "CORD", "CARD", "WARD", "WARM"]},
    {start: "HEAD", end: "TAIL", solution: ["HEAD", "HEAL", "HEAR", "HEIR", "HAIR", "HAIL", "TAIL"]},
    {start: "LOVE", end: "HATE", solution: ["LOVE", "LONE", "LANE", "LATE", "HATE"]},
    {start: "SHIP", end: "DOCK", solution: ["SHIP", "SHOP", "CHOP", "COOP", "COOK", "COCK", "DOCK"]},
    {start: "FISH", end: "BIRD", solution: ["FISH", "WISH", "WISP", "WASP", "WARP", "WARD", "BARD", "BIRD"]},
    {start: "RIDE", end: "WALK", solution: ["RIDE", "RILE", "TILE", "TALE", "TALK", "WALK"]},
    {start: "WEST", end: "EAST", solution: ["WEST", "VEST", "VAST", "EAST"]},
    {start: "RICH", end: "POOR", solution: ["RICH", "RICK", "ROCK", "ROOK", "BOOK", "BOOR", "POOR"]},
    {start: "FIRE", end: "WOOD", solution: ["FIRE", "FIRM", "FORM", "FORD", "FOOD", "WOOD"]},
    {start: "WARM", end: "COOL", solution: ["WARM", "WORM", "WORD", "WOOD", "WOOL", "COOL"]},
  ];
  const MAX_HINTS = 3;

  // ~270 common 4-letter English words (dictionary for valid moves).
  const DICT = new Set(("able acid alms also area army away baby back bake ball band bank bare bard bark barn base bath beam bean bear beat beef been beer bell belt bend best bide bike bind bird bite blew blow blue boat body bold bolt bone book boom boor born boss both bowl bred brew bulb bulk burn bury bush busy cafe cake calm came camp card care case cash cast cave cell chat chef chip chop city clay clip club coal coat code cold come cook cool coop cock cord cope copy core cork corn cost crab crew crop cube cuff cult cute dark dart data date dawn dead deaf deal dear debt deck deep deer demo desk dial dice diet dime dine dirt dish dive dock does doll done door dope dose down doze drab drag draw drew drop drug drum dual duck dude dull dump dust duty each earn ease east easy edge edit else ever evil exit face fact fade fail fair fall fame fare farm fast fate fear feat feed feel feet fell felt file fill film find fine fire firm fish five flag flat flaw fled flew flex flip flow foam fold folk food foot ford fork form fort four fowl free from fuel full fund gain game gate gave gear gene gift give glad glow glue goal goes gold golf gone good grab gray grew grid grip grow gulf hair half hail hall hand hang hard harm hate have head heal hear heat heir held hell help here hero high hike hill hint hire hold hole holy home hope horn host hour huge hung hunt hurt hush icon idea idle inch into iron item jail jazz join jolt joke jump june just keep kept kick kind king kiss knee knew know lace lack lady laid lake lamb lamp land lane last late lava lawn lazy lead leaf lean leap left lend lens less lest lice lift like lily lime line link lion lips list live load loan lock logo long look loop lord lose loss lost loud love luck lump lung lone made mail main make male mall many mark mass mate math maze meal mean meat meet melt menu mile milk mill mind mine miss mode mold mood moon more most move much must nail name navy near neat neck need nest news next nice nine node none noon nose note noun nude null oath odds ogre okay omen once only onto open opal oral ours oven owes over pace pack page paid pain pair pale palm park part pass past path peak peal pear peel peer perk pick pier pile pine pink pipe plan play plea plot plug plus poem poke pole poll pond pool poor pore port pose post pour pray prey pull pump punk pure push quit quiz race rage rail rain rank rare rate read real reap rear redo reed reef reek rely rent rest rice rich ride rick rile ring rise risk rite road roar robe rock role roll rook roof room root rope rose ruby rude rule rush rust safe sage said sail sake sale salt same sand sane sang save scan seal seat seed seek seen self sell send sent shed ship shoe shop shot show shut sick side sift sigh sign silk sing sink site size skin skip slam slap sled slim slip slow snap snow soap soda sofa soft soil sold sole some song soon sort soul soup sour sown span spat spin spot stab stag star stay stem step stir stop stub such suit sung sunk sure swap tail take tale talk tall tame tank tape task team tear tech teen tell tend tent term test text than that them then they thin this thus tide tied tile tire toad toll tone took tool tops toss tour town trap tree trim trip true tube tuna turn twig twin type ugly unit upon urge used user vain vary vase vast vein vest very veto vice view vile vine void vote wage wait wake walk wall want ward warm warn warp wart wash wasp wave weak wear week well went were west what when whim whip wide wife wild will wind wine wing wink wire wise wish with woke wolf wisp wood wool word wore work worm worn wrap yard yarn yawn yeah year yell yoga yolk your zero zone zoom").split(" "));

  function differByOne(a, b) {
    if (a.length !== b.length) return false;
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) {
      d++;
      if (d > 1) return false;
    }
    return d === 1;
  }

  let live = null;

  GameRegistry.register({
    id: "semantle",
    name: "Word Ladder",
    icon: "🪜",
    category: "word",
    description: "Transform the START word into the END word, one letter at a time",
    tags: ["word", "logic", "variant"],
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

      let puzzle = null;
      let ladder = []; // [START, w1, w2, ...]
      let over = false;
      let revealed = false;
      let hintsUsed = 0;
      let attempts = 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Start</div><div class="val" id="sm-start">—</div></div>
          <div class="score-cell"><div class="label">End</div><div class="val" id="sm-end">—</div></div>
          <div class="score-cell"><div class="label">Steps</div><div class="val" id="sm-steps">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sm-best">—</div></div>
        </div>
        <div class="status info" id="sm-status">Transform START into END one letter at a time</div>
        <div id="sm-ladder" class="col" style="gap:6px;align-items:center;"></div>
        <div class="row" style="justify-content:center;gap:8px;margin-top:8px;">
          <input id="sm-input" type="text" maxlength="4" autocomplete="off" placeholder="Type a 4-letter word…"
            style="padding:10px 14px;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.2em;width:140px;text-align:center;" />
          <button class="btn primary" id="sm-submit">Submit</button>
          <button class="btn" id="sm-back">⌫ Back</button>
        </div>
        <p class="hint">Each step must differ by exactly one letter from the previous word and be a real 4-letter word. Stuck? <b>Hint</b> (max 3) or <b>Solve</b>.</p>
      `;

      const statusEl = root.querySelector("#sm-status");
      const ladderEl = root.querySelector("#sm-ladder");
      const inputEl = root.querySelector("#sm-input");

      function renderLadder() {
        ladderEl.innerHTML = "";
        for (let i = 0; i < ladder.length; i++) {
          const w = ladder[i];
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.gap = "8px";
          const num = document.createElement("span");
          num.textContent = (i + 1) + ".";
          num.style.color = "var(--text-muted)";
          num.style.width = "24px";
          num.style.textAlign = "right";
          const word = document.createElement("span");
          word.textContent = w;
          word.style.fontFamily = "var(--font-mono)";
          word.style.fontSize = "1.4rem";
          word.style.fontWeight = "700";
          word.style.letterSpacing = "0.2em";
          word.style.padding = "6px 14px";
          word.style.background = "var(--bg-elev)";
          word.style.border = "1px solid var(--border)";
          word.style.borderRadius = "var(--radius-sm)";
          if (i === 0) {
            word.style.borderColor = "var(--accent)";
            word.style.color = "var(--accent)";
          } else if (w === puzzle.end) {
            word.style.borderColor = "var(--success)";
            word.style.color = "var(--success)";
          }
          row.appendChild(num);
          row.appendChild(word);
          ladderEl.appendChild(row);
        }
        root.querySelector("#sm-steps").textContent = Math.max(0, ladder.length - 1);
      }

      function submit() {
        if (over) return;
        const raw = inputEl.value.trim().toUpperCase();
        inputEl.value = "";
        if (!raw || raw.length !== 4 || !/^[A-Z]+$/.test(raw)) {
          AudioFX.error();
          statusEl.textContent = "Type a 4-letter word using only letters";
          statusEl.className = "status lose";
          later(() => {
            if (alive && !over) resetStatus();
          }, 1500);
          return;
        }
        const current = ladder[ladder.length - 1];
        if (raw === current) {
          AudioFX.error();
          statusEl.textContent = `"${raw}" is the current word — pick a different one`;
          statusEl.className = "status lose";
          later(() => {
            if (alive && !over) resetStatus();
          }, 1500);
          return;
        }
        if (!differByOne(raw, current)) {
          AudioFX.error();
          statusEl.textContent = `"${raw}" differs by more than one letter from "${current}"`;
          statusEl.className = "status lose";
          later(() => {
            if (alive && !over) resetStatus();
          }, 1500);
          return;
        }
        if (!DICT.has(raw.toLowerCase())) {
          AudioFX.error();
          statusEl.textContent = `"${raw}" isn't in the dictionary`;
          statusEl.className = "status lose";
          later(() => {
            if (alive && !over) resetStatus();
          }, 1500);
          return;
        }
        // Already in ladder? Disallow (avoid loops)
        if (ladder.includes(raw)) {
          AudioFX.error();
          statusEl.textContent = `"${raw}" is already in your ladder — no loops allowed`;
          statusEl.className = "status lose";
          later(() => {
            if (alive && !over) resetStatus();
          }, 1500);
          return;
        }
        ladder.push(raw);
        attempts++;
        AudioFX.place();
        renderLadder();

        if (revealed) {
          over = true;
          statusEl.textContent = `Solution revealed — full ladder shown in modal`;
          statusEl.className = "status lose";
          AudioFX.lose();
          return;
        }
        if (raw === puzzle.end) {
          over = true;
          statusEl.textContent = `🎉 Reached ${puzzle.end} in ${ladder.length - 1} step${ladder.length - 1 === 1 ? "" : "s"} (${attempts} attempt${attempts === 1 ? "" : "s"})!`;
          statusEl.className = "status win";
          AudioFX.win();
          const metric = (ladder.length - 1) * 100 + attempts; // fewer steps AND fewer attempts = better
          const best = Storage.getBest("semantle");
          // Lower is better — use a different metric (negative for "best" tracking)
          const score = -metric;
          if (!best || score > best) {
            Storage.setBest("semantle", score);
            root.querySelector("#sm-best").textContent = `${ladder.length - 1} steps`;
            App.toast(`New best: ${ladder.length - 1} steps`, "success");
          }
        } else {
          statusEl.textContent = `Good! "${raw}" added. Continue toward ${puzzle.end}.`;
          statusEl.className = "status info";
        }
        inputEl.focus();
      }

      function resetStatus() {
        statusEl.textContent = `Transform ${puzzle.start} into ${puzzle.end} — one letter at a time`;
        statusEl.className = "status info";
      }

      function back() {
        if (over) return;
        if (ladder.length <= 1) {
          AudioFX.error();
          return;
        }
        ladder.pop();
        AudioFX.click();
        renderLadder();
        resetStatus();
      }

      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        } else if (e.key === "Backspace" && inputEl.value === "") {
          e.preventDefault();
          back();
        }
      });
      root.querySelector("#sm-submit").addEventListener("click", submit);
      root.querySelector("#sm-back").addEventListener("click", back);

      function doHint() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (hintsUsed >= MAX_HINTS) {
          App.toast(`No hints left (max ${MAX_HINTS} per game)`, "warning");
          return;
        }
        const current = ladder[ladder.length - 1];
        // Find next correct word in the solution ladder
        const idxInSol = puzzle.solution.indexOf(current);
        let nextWord = null;
        if (idxInSol >= 0 && idxInSol + 1 < puzzle.solution.length) {
          nextWord = puzzle.solution[idxInSol + 1];
        } else {
          // current not in solution — find the solution word closest to current that we can step toward
          // Pick the solution word that differs by one letter from current and is on the path
          for (let i = 0; i < puzzle.solution.length; i++) {
            if (differByOne(current, puzzle.solution[i]) && !ladder.includes(puzzle.solution[i])) {
              nextWord = puzzle.solution[i];
              break;
            }
          }
        }
        if (!nextWord) {
          App.toast("No direct hint available — try a different word first", "info");
          return;
        }
        hintsUsed++;
        ladder.push(nextWord);
        AudioFX.reveal();
        renderLadder();
        if (nextWord === puzzle.end) {
          over = true;
          statusEl.textContent = `🎉 Reached ${puzzle.end} (with a hint)! Ladder complete.`;
          statusEl.className = "status win";
          AudioFX.win();
        } else {
          statusEl.textContent = `Hint: revealed next word "${nextWord}" on the solution path`;
          statusEl.className = "status info";
        }
      }

      function doSolve() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        revealed = true;
        over = true;
        AudioFX.lose();
        const fullLadder = puzzle.solution.join(" → ");
        statusEl.textContent = `Solution revealed`;
        statusEl.className = "status lose";
        ladder = puzzle.solution.slice();
        renderLadder();
        App.showModal("Word Ladder solution",
          `The shortest path from <b>${puzzle.start}</b> to <b>${puzzle.end}</b>:<br><br>
          <span style="font-family:var(--font-mono);font-weight:700;letter-spacing:0.1em;">${fullLadder}</span>`);
      }

      function newGame() {
        puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
        ladder = [puzzle.start];
        over = false;
        revealed = false;
        hintsUsed = 0;
        attempts = 0;
        root.querySelector("#sm-start").textContent = puzzle.start;
        root.querySelector("#sm-end").textContent = puzzle.end;
        const best = Storage.getBest("semantle");
        root.querySelector("#sm-best").textContent = best ? `${Math.abs(best / 100) | 0} steps` : "—";
        resetStatus();
        renderLadder();
        inputEl.focus();
      }

      live = {hint: doHint, solve: doSolve};
      newGame();

      return function cleanup() {
        alive = false;
        live = null;
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
      App.showModal("How to play Word Ladder",
        `Transform the <b>START</b> word into the <b>END</b> word, one letter at a time.
        <br><br>Each step must:
        <br>• change exactly <b>one letter</b> from the previous word
        <br>• be a real <b>4-letter English word</b> from the game's dictionary
        <br>• not be a word already in your ladder (no loops)
        <br><br>Type a word and press <b>Enter</b> (or click <b>Submit</b>). The <b>⌫ Back</b> button removes your last step.
        <br><br>You win when the last word in your ladder equals the END word. Your score combines steps taken and total attempts — fewer is better.
        <br><br>Stuck? Use the <b>Hint</b> button (max 3 — reveals the next word on the optimal solution path) or <b>Solve</b> (reveals the full shortest ladder and ends the game as a loss).`);
    },
  });
})();
