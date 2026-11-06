/* Wordle — guess the hidden word (Easy 4 / Classic 5 / Hard 6 letters), with Wiki-sourced answers + Hint/Solve */
(function () {
  // Fallback word lists used when the comprehensive wordlist.js (NLTK corpus)
  // isn't loaded for some reason. If window.WORDS_5 is available, it (and its
  // 4- and 6-letter siblings) take precedence and provide a much larger
  // dictionary — see js/wordlist.js for the source.
  const WORDS = ("about above abuse actor acute admit adopt adult after again agent agree ahead alarm album alert alien align alike alive allow alone along alpha alter among anger angle angry apart apple apply arena argue arise array arrow aside asset audio audit avoid award aware badly baker basic basis beach began begin begun being below bench birth black blade blame blank blast blend bless blind block blood board boost booth bound brain brand brass brave bread break breed brick brief bring broad brown brush build built buyer cable cabin cable candy carry catch cause chain chair chaos charm chart cheap check chest chief child china chose civic civil claim class clean clear click cliff climb clock close cloth cloud clown coach coast color could count court cover craft crash crazy cream crime cross crowd crown crude curve cycle daily dance dated dealt death debit delay depth doing doubt dozen draft drama drank dream dress drift drive drove dryer dying eager early earth eight elite empty enemy enjoy enter entry equal error event every exact exist extra faith false fault fiber field fifth fifty fight final first fixed flame flash fleet flesh float floor fluid focus force forge forty found frame frank fraud fresh front fruit fully funny giant given glass globe glory glove going grace grade grain grand grant grass grave great green grief gross group grown guard guess guest guide happy harsh heart heavy hello hence henry horse hotel house human ideal image imply index inner input inter issue ivory japan jewel joint judge juice known label labor large laser later laugh layer learn lease least leave legal level light limit linen liver local logic loose lower loyal lucky lunch lying magic major maker march match maybe mayor meant media metal might minor minus mixed model money month moral motor mount mouse mouth movie music needs never newly night noble noise north noted novel nurse occur ocean offer often order other ought outer owned paint paper paris party patch peace phase phone photo piano piece pilot pitch place plain plane plant plate point pound power press price pride prime print prior prize probe proof proud prove queen quest quick quiet quite radio raise range rapid ratio reach ready realm refer regal reign relax reply reset retro right rival river roast roman rough round route royal rural saint salad scale scene scope score scorn scott sense seven shade shall shame shape share sharp sheep sheet shelf shell shift shine shirt shock shoot shore short shown sight sigma since sixth sixty sized skill sleep slide small smart smile smoke snake solar solid solve south space spare speak speed spend spent spite split spoke sport staff stage stake stand stark start state stays steam steel steep steer steve stick still stock stone stood store storm story strip study stuff style sugar suite super sweet swift swing sworn table taken taste teach teeth terry texas thank theft their theme there these thick thief thigh thing think third those three threw throw thumb tight times title today topic total touch tough tower toxic trace track trade trail train treat trend trial tribe trick tried truck truly trust truth twice under union unity until upper upset urban usage usual vague valid value video virus visit vital vivid vocal voice wagon waste watch water wedge weigh weird whale whole whose woman world worry worse worst worth would wound write wrong wrote yield young youth zebra").split(" ");

  // Common 4-letter English words — Easy mode fallback (and accepted as valid guesses)
  const FALLBACK_4 = ("able acid alms also area army away baby back bake ball band bank bare bark barn base bath beam bean bear beat beef been beer bell belt bend best bide bike bind bird bite blew blow blue boat body bold bolt bone book boom born boss both bowl bred brew bulb bulk burn bury bush busy cafe cake calm came camp card care case cash cast cave cell chat chef chip city clay clip club coal coat code cold come cook cool cope copy core cork corn cost crab crew crop cube cuff cult cute dad damn dark dart data date dawn days dead deaf deal dear debt deck deep deer demo desk dial dice diet dime dine dirt dish dive dock does doll done door dope dose down doze drab drag draw drew drop drug drum dual duck dude dull dump dust duty each earn ease east easy edge edit else ever evil exit face fact fade fail fair fall fame fare farm fast fate fear feat feed feel feet fell felt file fill film find fine fire firm fish five flag flat flaw fled flew flex flip flow foam fold folk food foot ford fork form fort four fowl free from fuel full fund gain game gate gave gear gene gift give glad glow glue goal goes gold golf gone good grab gray grew grid grip grow gulf hair half hall hand hang hard harm hate have head heal heat heir held hell help here hero high hike hill hint hire hold hole holy home hope horn host hour huge hung hunt hurt hush icon idea idle inch into iron item jail jazz join jolt joke jump june just keep kept kick kind king kiss knee knew know lace lack lady laid lake lamb lamp land lane last late lava lawn lazy lead leaf lean leap left lend lens less lest lift like lily lime line link lion lips list live load loan lock logo long look loop lord lose loss lost loud love luck lump lung made mail main make male mall many mark mass mate math maze meal mean meat meet melt menu mile milk mill mind mine miss mode mold mood moon more most move much must nail name navy near neat neck need nest news next nice nine node none noon nose note noun nude null oath odds ogre okay omen once only onto open opal oral ours oven owes over pace pack page paid pain pair pale palm park part pass past path peak peal pear peel peer perk pick pier pile pine pink pipe plan play plea plot plug plus poem poke pole poll pond pool poor pore port pose post pour pray prey pull pump punk pure push quit quiz race rage rail rain rank rare rate read real reap rear redo reed reef reek rely rent rest rice rich ride ring rise risk rite road roar robe rock role roll roof room root rope rose ruby rude rule rush rust safe sage said sail sake sale salt same sand sane sang save scan seal seat seed seek seen self sell send sent shed ship shoe shop shot show shut sick side sift sigh sign silk sing sink site size skin skip slam slap sled slim slip slow snap snow soap soda sofa soft soil sold sole some song soon sort soul soup sour sown span spat spin spot stab stag star stay stem step stir stop stub such suit sung sunk sure swap tail take tale talk tall tame tank tape task team tear tech teen tell tend tent term test text than that them then they thin this thus tide tied tire toad toll tone took tool tops toss tour town trap tree trim trip true tube tuna turn twig twin type ugly unit upon urge used user vain vary vase vast vein very veto vice view vile vine void vote wage wait wake walk wall want ward warm warn wart wash wasp wave weak wear week well went were west what when whim whip wide wife wild will wind wine wing wink wire wise wish with woke wolf wood wool word wore work worm worn wrap yard yarn yawn yeah year yell yoga yolk your zero zone zoom").split(" ");

  const LEVELS = {
    easy: {len: 4, max: 6},
    classic: {len: 5, max: 6},
    hard: {len: 6, max: 7},
  };

  // Use the comprehensive NLTK-based word list when available; the small
  // fallback lists above are kept so the game still works if wordlist.js
  // is missing or fails to load.
  function dictFor(len) {
    if (typeof window !== "undefined") {
      if (len === 4 && window.WORDS_4) return window.WORDS_4;
      if (len === 5 && window.WORDS_5) return window.WORDS_5;
      if (len === 6 && window.WORDS_6) return window.WORDS_6;
    }
    if (len === 4) return FALLBACK_4;
    if (len === 5) return WORDS;
    return WORDS; // hard mode falls back to 5-letter if no 6-letter dict
  }

  function evaluate(guess, answer) {
    const res = Array(answer.length).fill("absent");
    const a = answer.split("");
    // First pass: correct positions
    for (let i = 0; i < a.length; i++) {
      if (guess[i] === a[i]) {
        res[i] = "correct";
        a[i] = null;
      }
    }
    // Second pass: present
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

  // Live game state — set at mount time, cleared on cleanup. The registry's
  // hint()/solve() methods delegate to live.hint / live.solve so the framework
  // buttons work after the game has been mounted.
  let live = null;

  GameRegistry.register({
    id: "wordle",
    name: "Wordle",
    icon: "🔤",
    category: "word",
    description: "Guess the word — Easy 4 / Classic 5 / Hard 6 letters, live Wikipedia answers",
    tags: ["word", "popular", "keyboard"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let loadId = 0;
      let level = "classic";
      let answer = "";
      let guesses = [];
      let current = "";
      let over = false;
      let revealed = false; // true when solve() was used -> force a loss
      let MAX = LEVELS.classic.max;
      let LEN = LEVELS.classic.len;
      // Build a per-mount valid-set from the full dictionary for the chosen
      // length, plus the bundled fallbacks so Wiki-sourced answers always
      // validate. We add to this set when Wiki gives us an answer that's not
      // in the bundled list.
      let VALID = new Set();

      function rebuildValid() {
        VALID = new Set();
        for (const w of FALLBACK_4) VALID.add(w.toLowerCase());
        for (const w of WORDS) VALID.add(w.toLowerCase());
        if (typeof window !== "undefined") {
          if (window.WORDS_4) for (const w of window.WORDS_4) VALID.add(w.toLowerCase());
          if (window.WORDS_5) for (const w of window.WORDS_5) VALID.add(w.toLowerCase());
          if (window.WORDS_6) for (const w of window.WORDS_6) VALID.add(w.toLowerCase());
        }
      }

      rebuildValid();

      function pickBundled(len) {
        const dict = dictFor(len);
        return dict[Math.floor(Math.random() * dict.length)].toUpperCase();
      }

      root.innerHTML = `
        <div class="row" style="justify-content:center;">
          <div class="difficulty" id="wd-diff">
            <button class="diff-btn" data-d="easy">Easy</button>
            <button class="diff-btn active" data-d="classic">Classic</button>
            <button class="diff-btn" data-d="hard">Hard</button>
          </div>
        </div>
        <div class="status info" id="wd-status">Loading…</div>
        <div class="col" id="wd-rows" style="gap:6px;"></div>
        <div class="col" id="wd-keyboard" style="gap:6px;margin-top:8px;"></div>
        <p class="hint">Type letters or tap keys. <b>Enter</b> to submit, <b>Backspace</b> to delete. Stuck? Tap the <b>Hint</b> or <b>Solve</b> buttons in the header.</p>
      `;

      const rowsEl = root.querySelector("#wd-rows");
      const kbEl = root.querySelector("#wd-keyboard");
      const statusEl = root.querySelector("#wd-status");

      const KBD = [
        "qwertyuiop".split(""),
        "asdfghjkl".split(""),
        ["ENTER", ..."zxcvbnm".split(""), "BACK"]
      ];

      const keyState = {}; // letter -> correct | present | absent

      // We build the rows once at newGame time and update them in place.
      // Re-creating the entire grid on every keystroke re-triggers the
      // flip animation on already-completed rows, which looks broken.
      let rowEls = [];   // array of <div.word-row>
      let cellEls = [];  // 2D array of <div.letter>

      function buildRows() {
        rowsEl.innerHTML = "";
        rowEls = [];
        cellEls = [];
        for (let r = 0; r < MAX; r++) {
          const row = document.createElement("div");
          row.className = "word-row";
          const cells = [];
          for (let i = 0; i < LEN; i++) {
            const cell = document.createElement("div");
            cell.className = "letter";
            row.appendChild(cell);
            cells.push(cell);
          }
          rowsEl.appendChild(row);
          rowEls.push(row);
          cellEls.push(cells);
        }
      }

      // Update row r in place. Only newly-completed rows (just submitted) get
      // the flip animation; rows that were already completed are left alone.
      function updateRow(r, justSubmitted) {
        const cells = cellEls[r];
        if (r < guesses.length) {
          const g = guesses[r].guess;
          const e = guesses[r].eval;
          for (let i = 0; i < LEN; i++) {
            const cell = cells[i];
            // Reset only the dynamic classes we set, never the empty/initial state
            cell.classList.remove("filled", "correct", "present", "absent", "flip");
            cell.textContent = g[i];
            cell.classList.add(e[i]);
            // Only animate cells in the row that was just submitted. Already-
            // completed rows were animated when they were first submitted.
            if (justSubmitted) {
              // Stagger per-cell for a nice reveal cascade
              cell.style.animationDelay = (i * 0.08) + "s";
              cell.classList.add("flip");
            } else {
              cell.style.animationDelay = "";
            }
          }
        } else if (r === guesses.length && !over) {
          for (let i = 0; i < LEN; i++) {
            const cell = cells[i];
            cell.classList.remove("filled", "correct", "present", "absent", "flip");
            cell.style.animationDelay = "";
            const ch = current[i] || "";
            cell.textContent = ch;
            if (ch) cell.classList.add("filled");
            else cell.classList.remove("filled");
          }
        } else {
          // Empty row — clear all state
          for (let i = 0; i < LEN; i++) {
            const cell = cells[i];
            cell.classList.remove("filled", "correct", "present", "absent", "flip");
            cell.style.animationDelay = "";
            cell.textContent = "";
          }
        }
      }

      function renderRows() {
        // Update each row in place rather than rebuilding the DOM.
        for (let r = 0; r < MAX; r++) updateRow(r, false);
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
            btn.dataset.key = k; // logical key (lowercase letter, "ENTER", or "BACK")
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
        if (over) return;
        if (current.length >= LEN) return;
        current += letter.toLowerCase();
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
          shake();
          AudioFX.error();
          return;
        }
        if (!VALID.has(current.toLowerCase())) {
          shake();
          AudioFX.error();
          statusEl.textContent = `"${current.toUpperCase()}" isn't in the word list`;
          statusEl.className = "status lose";
          setTimeout(() => {
            if (!alive) return;
            if (!alive) return;
            if (alive && !over) {
              statusEl.textContent = `Guess ${guesses.length + 1} of ${MAX}`;
              statusEl.className = "status info";
            }
          }, 1500);
          return;
        }
        const guess = current.toUpperCase();
        const ev = evaluate(guess, answer);
        guesses.push({guess, eval: ev});
        // Update key states (don't downgrade)
        for (let i = 0; i < LEN; i++) {
          const l = guess[i].toLowerCase();
          const order = {absent: 0, present: 1, correct: 2};
          if (!keyState[l] || order[ev[i]] > order[keyState[l]]) keyState[l] = ev[i];
        }
        current = "";
        AudioFX.flip();
        // Only the just-submitted row animates — other completed rows stay
        // visually stable.
        updateRow(guesses.length - 1, true);
        // After the flip animation finishes (~0.4s + stagger), strip the flip
        // class so it doesn't linger on completed rows.
        setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (!alive) return;
          const cells = cellEls[guesses.length - 1];
          if (cells) cells.forEach(c => {
            c.classList.remove("flip");
            c.style.animationDelay = "";
          });
        }, 600);
        renderKb();

        if (revealed) {
          over = true;
          statusEl.textContent = `Solution revealed. The word was ${answer}.`;
          statusEl.className = "status lose";
          AudioFX.lose();
          return;
        }
        if (guess === answer) {
          over = true;
          statusEl.textContent = `🎉 Solved in ${guesses.length} ${guesses.length === 1 ? "try" : "tries"}!`;
          statusEl.className = "status win";
          AudioFX.win();
          const key = "wordle_" + level;
          const best = Storage.getBest(key);
          if (!best || guesses.length < best) {
            Storage.setBest(key, guesses.length);
            App.toast("New best! Solved in " + guesses.length + " tries", "success");
          }
        } else if (guesses.length >= MAX) {
          over = true;
          statusEl.textContent = `The word was ${answer}. Better luck next time!`;
          statusEl.className = "status lose";
          AudioFX.lose();
        } else {
          statusEl.textContent = `Guess ${guesses.length + 1} of ${MAX}`;
        }
      }

      function shake() {
        const lastRow = rowEls[guesses.length];
        if (lastRow) {
          lastRow.style.animation = "none";
          void lastRow.offsetWidth;
          lastRow.style.animation = "shake 0.4s";
        }
      }

      // Inject shake keyframes once
      if (!document.getElementById("wordle-shake")) {
        const s = document.createElement("style");
        s.id = "wordle-shake";
        s.textContent = "@keyframes shake {0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}} .wordle .key.key-flash, .key.key-flash { transform: translateY(2px) scale(0.94); filter: brightness(1.25); background: var(--accent-soft); border-color: var(--accent); }";
        document.head.appendChild(s);
      }

      function onKey(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
          flashKey("ENTER");
        } else if (e.key === "Backspace") {
          e.preventDefault();
          back();
          flashKey("BACK");
        } else if (/^[a-zA-Z]$/.test(e.key)) {
          type(e.key);
          flashKey(e.key.toUpperCase());
        }
      }

      document.addEventListener("keydown", onKey);

      // Briefly highlight the matching on-screen keyboard key (mirrors :active
      // feedback that physical key presses would otherwise miss).
      function flashKey(key) {
        const target = key === "ENTER" ? "ENTER" : key === "BACK" ? "BACK" : key.toLowerCase();
        const btns = kbEl.querySelectorAll("button.key");
        let match = null;
        btns.forEach(b => {
          // Each button stores its logical key in dataset.key (set in renderKb)
          if (b.dataset.key === target) match = b;
        });
        if (!match) return;
        match.classList.remove("key-flash");
        // Force reflow so the animation restarts even on rapid repeats
        void match.offsetWidth;
        match.classList.add("key-flash");
        setTimeout(() => match.classList.remove("key-flash"), 160);
      }

      // Difficulty selector
      root.querySelectorAll("#wd-diff .diff-btn").forEach(b => b.addEventListener("click", () => {
        AudioFX.click();
        root.querySelectorAll("#wd-diff .diff-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        level = b.dataset.d;
        newGame();
      }));

      async function newGame() {
        const myId = ++loadId;
        const L = LEVELS[level];
        LEN = L.len;
        MAX = L.max;
        guesses = [];
        current = "";
        over = false;
        revealed = false;
        for (const k in keyState) delete keyState[k];
        statusEl.textContent = "Loading from Wikipedia…";
        statusEl.className = "status info";
        // Build the rows once for the new MAX/LEN, then render blank state.
        buildRows();
        renderRows();
        renderKb();

        let word = null;
        try {
          if (typeof window !== "undefined" && window.Wiki && typeof window.Wiki.randomWord === "function") {
            word = await window.Wiki.randomWord(LEN);
          }
        } catch (e) {
          word = null;
        }
        if (!alive || myId !== loadId) return; // superseded or unmounted
        if (!word || !/^[A-Za-z]+$/.test(word) || word.length !== LEN) {
          word = pickBundled(LEN);
        } else {
          // Add the Wiki-sourced word to the runtime VALID set so the player can submit it
          VALID.add(word.toLowerCase());
        }
        answer = word.toUpperCase();
        statusEl.textContent = `Guess the ${LEN}-letter word — you have ${MAX} tries`;
        statusEl.className = "status info";
        renderRows();
      }

      function doHint() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (!answer) {
          App.toast("Still loading…", "info");
          return;
        }
        // Find positions in the answer not yet "correctly discovered" in past guesses
        const discovered = new Set();
        for (const g of guesses) {
          for (let i = 0; i < LEN; i++) {
            if (g.eval[i] === "correct") discovered.add(i);
          }
        }
        const undiscovered = [];
        for (let i = 0; i < LEN; i++) if (!discovered.has(i)) undiscovered.push(i);
        if (undiscovered.length === 0) {
          App.toast("All letters already revealed", "info");
          return;
        }
        const p = undiscovered[Math.floor(Math.random() * undiscovered.length)];
        const letter = answer[p];
        // Reveal: place the letter in the next empty slot of the current row, if there is one
        if (current.length < LEN) {
          current += letter.toLowerCase();
          AudioFX.tick();
          renderRows();
        }
        App.toast(`Hint: revealed the letter ${letter}`, "info");
      }

      function doSolve() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (!answer) {
          App.toast("Still loading…", "info");
          return;
        }
        revealed = true;
        // Fill the current row with the answer and submit it (ends the game as a loss)
        current = answer.toLowerCase();
        AudioFX.click();
        renderRows();
        submit();
      }

      live = {hint: doHint, solve: doSolve};

      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Wordle",
        `Guess the hidden word. Pick a difficulty:
        <br>• <b>Easy</b> — 4-letter word, 6 tries
        <br>• <b>Classic</b> — 5-letter word, 6 tries
        <br>• <b>Hard</b> — 6-letter word, 7 tries
        <br><br>Answers are fetched live from Wikipedia when online (falling back to a bundled list of common English words offline). Valid guesses are checked against a comprehensive dictionary of ~8,500 five-letter words (built from the NLTK English word list).
        <br><br>After each guess, the tiles change color:
        <br>🟩 <b>Green</b> — letter is in the word and in the correct spot.
        <br>🟨 <b>Yellow</b> — letter is in the word but in the wrong spot.
        <br>⬛ <b>Gray</b> — letter is not in the word.
        <br><br>Stuck? Use the <b>Hint</b> button (reveals one not-yet-found letter in the next empty slot) or the <b>Solve</b> button (fills the row with the answer and ends the game as a loss).
        <br><br>Best score = fewest guesses, tracked per difficulty.`);
    },
  });
})();
