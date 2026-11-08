/* Boggle Mini 4×4 — type words traced through adjacent dice before the 90-second timer ends. */
(function () {
  // Classic Boggle dice distribution (16 dice, 6 faces each)
  const DICE = [
    "AAEEGN", "ABBJOO", "ACHOPS", "AFFKPS", "AOOTTW", "CIMOTU", "DEILRX", "DELRVY",
    "DISTTY", "EEGHNW", "EEINSU", "EHRTVW", "EIOSST", "ELRTTY", "HIMNQU", "HLNNRZ",
  ];
  // Common 3-letter words (WORDS_ALL only covers 4–6 letters)
  const THREE = ("ace act add ado age ago aid aim air all and ant any ape apt arc are arm art ash ask ate awe axe bad bag ban bar bat bay bed bee beg bet bid big bin bit boa bob bog boo bow box boy bra bud bug bun bus but buy cab can cap car cat cob cod cog con coo cop cot cow coy cry cub cue cup cur cut dab dad dam day den dew did die dig dim din dip doe dog don dot dry dub dud due dug dye ear eat ebb eel egg ego elf elk elm end era err eve ewe eye fad fan far fat fax fed fee fen few fib fig fin fir fit fix flu fly foe fog for fox fry fun fur gag gal gap gas gay gel gem get gig gin gnu god goo got gum gun gut gym had hag ham has hat hay hem hen her hew hex hey hid him hip his hit hoe hog hop hot how hub hue hug hum hut ice icy ilk ill imp ink inn ion ire irk its jab jam jar jaw jay jet jig job jog jot joy jug jut keg ken key kid kin kit lab lad lag lap law lax lay led leg let lid lie lip lit lob log lop lot low lug mad man map mar mat may men met mid mix mob mop mow mud mug nab nag nap nay net new nib nil nip nod nor not now nun nut oaf oak oar oat odd ode off oil old one orb ore our out owe owl own pad pal pan par pat paw pay pea pen pep per pet pew pie pig pin pit pod pop pot pro pub pug pun pup put rag ram ran rap rat raw ray red rib rid rig rim rip rob rod roe rot row rub rug rum run rut rye sad sag sap sat saw say sea see set sew she shy sin sip sir sit six ski sky sly sob sod son sop sow soy spa spy sty sub sue sum sun tab tag tan tap tar tax tea ten the thy tic tie tin tip toe ton too top tot tow toy try tub tug two urn use van vat vet vex via vie vow wad wag war was wax way web wed wee wet who why wig win wit woe wok won woo wow wry yak yam yap yaw yea yen yes yet you zap zip zoo").split(" ");
  // Common 7–8 letter words (beyond WORDS_ALL's 4–6 letter range)
  const LONG = ("breathe brother capital captain careful chicken college company compare complete control country dolphin evening example factory feeling fifteen foreign fortune forward grandma grandpa history holiday husband journey kitchen lantern machine manager message million mineral monster morning natural nothing opening operate orchard parents partner patient picture plastic present problem quickly quietly science shoulder someone station student success teacher terrible thought thousand together tomorrow traffic trouble village welcome western whether").split(" ");
  // Small 4–6 letter fallback in case window.WORDS_ALL is unavailable
  const FALLBACK = ("able about after again angel answer apple baby back ball band bank barn base bath bean bear beat been before begin bell belt best bike bird bite blue boat body book born both bowl brain branch bread break brick bring broad broke brown build burn busy cake calm came camp card care case cash cast catch cause chain chair chalk charm chart check chest child class clean clear climb clock close cloud color come cook cool corn corner cost count cover crack cream crop cross cute dance dark date deal dear deep deer desk dice die dirt dish dog done door double draw dream dress drink drive drop duck dust each early earth eat edge else end enemy enjoy enter even ever eye face fact fair fall family farm fast fear feed feel feet fell felt fight fill find fine fire first fish five flag flat float floor flower fold food foot forest forget fork form found four fox free fresh friend frog front fruit full fun game garden get gift girl give glass goat gold golf gone good grade grain grand grape grass gray green grew grow hair half hall hand happy hard hat have head hear heart heat heavy hello help hen high hill hit hold home honey hope horn horse hot house ice idea inch into iron item jade jelly jewel join jump keep key kind king kiss kite know lady lake lamp land large last late laugh lawn lay lead leaf learn leave left leg lemon let letter light like lion list listen little live lock long look lose lost lot loud love lunch made mail make man many map march mark mask match may meal mean meat meet melt men mess mice milk mind mine minute miss money monkey moon more morning most mother motor mountain mouse mouth move much music must nail name near neck need nest never new news next nice night nine noise noon north nose note now number ocean offer often once only open order other oven owl pack page paint pair park part pass past patch path pear pen pet pick pile pine pink pipe plan plant play plum pocket point pond pool port pose post pot pour price prize pull pump pure push question quick quiet race rain rank reach read ready red rest rich ride ring rise risk river road rock room root rope rose rough round row rule run safe said sail salt same sand save scale sea seat seem seen seed sell send sense serve set shake shall shape share sharp sheep shelf ship shirt shoe shop shore short show shut side silent silver sing sink sit six size skill skirt sky sleep slide slow small smell smile snow soap sock soft soil sold sole solve song soon sort sound south space speak speed spell spend spoon sport spot spring stand star start stay step stick still stone stop store storm story street strong study stuff sugar suit summer sun sure sweet swim table tail take talk tall taste teach team tear tell tend tent test than that them then they thick thin thing think this those thought three tie time tiny tip title toe told tone took tool top total touch town track trade train tree trip true try turn twice under until use very view visit voice wait walk wall want war warm wash watch water way wear week well went were west what wheel when where which while white who whole why wide wife wild wind window winter wish with wolf woman wood word work world write year yellow young").split(" ").filter(w => w.length >= 4 && w.length <= 6);

  const ROUND_TIME = 90;

  const NEIGH = [];
  for (let i = 0; i < 16; i++) {
    const r = Math.floor(i / 4), c = i % 4, ns = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) ns.push(nr * 4 + nc);
    }
    NEIGH.push(ns);
  }

  function rollGrid() {
    const dice = DICE.slice();
    for (let i = dice.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dice[i], dice[j]] = [dice[j], dice[i]];
    }
    const grid = [];
    for (let i = 0; i < 16; i++) {
      const face = dice[i][Math.floor(Math.random() * 6)];
      grid.push(face === "Q" ? "Qu" : face);
    }
    return grid;
  }

  function pointsFor(len) {
    if (len <= 4) return 1;
    if (len === 5) return 2;
    if (len === 6) return 3;
    if (len === 7) return 5;
    return 11;
  }

  let live = null;
  GameRegistry.register({
    id: "bogglemini4x4",
    name: "Boggle Mini 4x4",
    icon: "🎲",
    category: "word",
    description: "Type words hidden in the 4×4 dice grid — adjacent letters, 90 seconds",
    tags: ["word", "timer", "boggle", "typing"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let grid = [], found = new Set(), score = 0, over = false;
      let timeLeft = ROUND_TIME, timerInterval = null;

      // Dictionary: embedded 3- and 7/8-letter lists + WORDS_ALL (4–6 letters)
      const DICT = new Set(THREE);
      const wa = (typeof window !== "undefined" && Array.isArray(window.WORDS_ALL)) ? window.WORDS_ALL : FALLBACK;
      for (const w of wa) DICT.add(String(w).toLowerCase());
      for (const w of LONG) DICT.add(w);

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Time</div><div class="val" id="bm-time">${ROUND_TIME}s</div></div>
          <div class="score-cell"><div class="label">Words</div><div class="val" id="bm-words">0</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="bm-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="bm-best">—</div></div>
        </div>
        <div class="status info" id="bm-status">Type words made from adjacent letters (diagonals count!) and press Enter.</div>
        <div class="center" style="margin:12px 0;"><div class="bm-grid" id="bm-grid"></div></div>
        <div class="row" id="bm-entry" style="justify-content:center;gap:8px;flex-wrap:wrap;">
          <input id="bm-input" class="bm-input" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="TYPE A WORD…" maxlength="8" />
          <button class="btn primary" id="bm-go">Enter ⏎</button>
          <button class="btn" id="bm-shake">🎲 Shake</button>
        </div>
        <div id="bm-end" style="display:none;"></div>
        <div id="bm-found-list" class="bm-found"></div>
        <p class="hint">Chain <b>adjacent</b> dice (including diagonals); each die once per word. Words need <b>3+ letters</b>. Scoring: 3–4 letters = 1 pt, 5 = 2, 6 = 3, 7 = 5, 8+ = 11. 90 seconds per round.</p>
      `;

      const statusEl = root.querySelector("#bm-status");
      const gridEl = root.querySelector("#bm-grid");
      const inputEl = root.querySelector("#bm-input");
      const foundListEl = root.querySelector("#bm-found-list");
      const timeEl = root.querySelector("#bm-time");

      if (!document.getElementById("bm-style")) {
        const s = document.createElement("style");
        s.id = "bm-style";
        s.textContent = `
          .bm-grid { display: inline-grid; grid-template-columns: repeat(4, 52px); gap: 4px; background: var(--bg-elev); padding: 8px; border-radius: var(--radius); box-shadow: var(--shadow); }
          .bm-grid.bm-shaking { animation: bm-shake 0.45s; }
          @keyframes bm-shake { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } 75% { transform: rotate(-2deg); } }
          .bm-cell { width: 52px; height: 52px; background: var(--bg-soft); border: 1px solid var(--border); border-radius: var(--radius-sm); display: grid; place-items: center; font-family: var(--font-heading); font-weight: 800; font-size: 1.25rem; color: var(--text); user-select: none; }
          .bm-input { padding: 10px 14px; font-family: var(--font-mono); font-size: 1.05rem; letter-spacing: 0.12em; text-transform: uppercase; border: 2px solid var(--border-strong); border-radius: var(--radius); background: var(--bg-elev); color: var(--text); width: 220px; }
          .bm-input:focus { outline: none; border-color: var(--accent); }
          .bm-input:disabled { opacity: 0.4; }
          .bm-found { display: flex; flex-wrap: wrap; gap: 5px; max-width: 460px; margin: 14px auto 0; max-height: 150px; overflow-y: auto; padding: 4px; }
          .bm-found-item { padding: 3px 9px; background: var(--bg-elev); border: 1px solid var(--border); border-radius: 999px; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text); }
          .bm-found-item b { color: var(--accent); }
          .bm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; max-width: 420px; margin: 0 auto; }
          .bm-stat { background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 6px; text-align: center; }
          .bm-stat .n { font-family: var(--font-mono); font-weight: 800; font-size: 1.3rem; color: var(--accent); }
          .bm-stat .l { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        `;
        document.head.appendChild(s);
      }

      function renderGrid() {
        gridEl.innerHTML = "";
        grid.forEach(L => {
          const cell = document.createElement("div");
          cell.className = "bm-cell";
          cell.textContent = L;
          gridEl.appendChild(cell);
        });
      }

      function renderFound() {
        foundListEl.innerHTML = "";
        Array.from(found).sort().forEach(w => {
          const el = document.createElement("div");
          el.className = "bm-found-item";
          el.innerHTML = w + " <b>+" + pointsFor(w.length) + "</b>";
          foundListEl.appendChild(el);
        });
        root.querySelector("#bm-words").textContent = found.size;
        root.querySelector("#bm-score").textContent = score;
      }

      // Can `word` (uppercase, may contain QU) be traced through adjacent dice?
      function canTrace(word) {
        const w = word.toLowerCase();

        function dfs(idx, pos, used) {
          const piece = grid[idx] === "Qu" ? "qu" : grid[idx].toLowerCase();
          if (w.substr(pos, piece.length) !== piece) return false;
          const npos = pos + piece.length;
          if (npos === w.length) return true;
          for (const n of NEIGH[idx]) {
            if (used.has(n)) continue;
            used.add(n);
            if (dfs(n, npos, used)) return true;
            used.delete(n);
          }
          return false;
        }

        for (let i = 0; i < 16; i++) {
          if (dfs(i, 0, new Set([i]))) return true;
        }
        return false;
      }

      // All dictionary words traceable in the current grid (for hint/solve)
      function findWords() {
        const out = new Set();

        function dfs(idx, word, used) {
          const w = word + (grid[idx] === "Qu" ? "qu" : grid[idx].toLowerCase());
          if (w.length >= 3 && DICT.has(w)) out.add(w.toUpperCase());
          if (w.length >= 8) return;
          for (const n of NEIGH[idx]) {
            if (used.has(n)) continue;
            used.add(n);
            dfs(n, w, used);
            used.delete(n);
          }
        }

        for (let i = 0; i < 16; i++) dfs(i, "", new Set([i]));
        return Array.from(out);
      }

      function submitWord() {
        if (over) return;
        const raw = inputEl.value.trim().toUpperCase().replace(/[^A-Z]/g, "");
        inputEl.value = "";
        if (!raw) return;
        if (raw.length < 3) {
          AudioFX.error();
          statusEl.textContent = '"' + raw + '" is too short — words need at least 3 letters.';
          statusEl.className = "status lose";
          return;
        }
        if (!canTrace(raw)) {
          AudioFX.error();
          statusEl.textContent = '"' + raw + '" can\'t be traced through adjacent dice.';
          statusEl.className = "status lose";
          return;
        }
        if (!DICT.has(raw.toLowerCase())) {
          AudioFX.error();
          statusEl.textContent = '"' + raw + '" isn\'t in the dictionary.';
          statusEl.className = "status lose";
          return;
        }
        if (found.has(raw)) {
          AudioFX.error();
          statusEl.textContent = 'Already found "' + raw + '".';
          statusEl.className = "status lose";
          return;
        }
        found.add(raw);
        const pts = pointsFor(raw.length);
        score += pts;
        AudioFX.pop();
        statusEl.textContent = "+" + pts + ' — "' + raw + '"!';
        statusEl.className = "status win";
        renderFound();
        inputEl.focus();
      }

      function startTimer() {
        clearInterval(timerInterval);
        timeLeft = ROUND_TIME;
        timeEl.textContent = timeLeft + "s";
        timeEl.style.color = "";
        timerInterval = setInterval(() => {
          if (!alive || over) return;
          timeLeft--;
          timeEl.textContent = timeLeft + "s";
          if (timeLeft <= 10) timeEl.style.color = "var(--danger)";
          if (timeLeft <= 5 && timeLeft > 0) AudioFX.tick();
          if (timeLeft <= 0) endRound(false);
        }, 1000);
      }

      function endRound(solved) {
        if (over) return;
        clearInterval(timerInterval);
        over = true;
        inputEl.disabled = true;
        const longest = Array.from(found).sort((a, b) => b.length - a.length)[0] || "—";
        if (solved) {
          const all = findWords();
          AudioFX.lose();
          statusEl.textContent = "Solution revealed — round over.";
          statusEl.className = "status lose";
          App.showModal("Boggle Mini — all valid words",
            'This grid hides <b>' + all.length + "</b> valid word" + (all.length === 1 ? "" : "s") + ":<br><br>" +
            (all.sort().join(", ") || "none"));
        } else {
          AudioFX.lose();
          statusEl.textContent = "⌛ Time's up! You found " + found.size + " word" + (found.size === 1 ? "" : "s") + " for " + score + " points.";
          statusEl.className = "status " + (score >= 10 ? "win" : "lose");
          if (score >= 10) AudioFX.win();
        }
        App.recordResult(solved ? false : score >= 10, score);
        const best = Storage.getBest("bogglemini4x4");
        if (!best || score > best) {
          Storage.setBest("bogglemini4x4", score);
          App.toast("New best: " + score, "success");
        }
        root.querySelector("#bm-best").textContent = Storage.getBest("bogglemini4x4") || "—";
        root.querySelector("#bm-entry").style.display = "none";
        const endEl = root.querySelector("#bm-end");
        endEl.style.display = "block";
        endEl.innerHTML = `
          <div class="bm-stats" style="margin-bottom:12px;">
            <div class="bm-stat"><div class="n">${found.size}</div><div class="l">Words</div></div>
            <div class="bm-stat"><div class="n">${score}</div><div class="l">Score</div></div>
            <div class="bm-stat"><div class="n" style="font-size:1rem;">${longest}</div><div class="l">Longest</div></div>
            <div class="bm-stat"><div class="n">${Storage.getBest("bogglemini4x4") || score}</div><div class="l">Best</div></div>
          </div>
          <div class="row" style="justify-content:center;gap:8px;">
            <button class="btn primary" id="bm-again">🎲 Shake & play again</button>
          </div>`;
        endEl.querySelector("#bm-again").addEventListener("click", newRound);
      }

      function newRound() {
        clearInterval(timerInterval);
        grid = rollGrid();
        found = new Set();
        score = 0;
        over = false;
        inputEl.disabled = false;
        inputEl.value = "";
        root.querySelector("#bm-entry").style.display = "flex";
        root.querySelector("#bm-end").style.display = "none";
        root.querySelector("#bm-best").textContent = Storage.getBest("bogglemini4x4") || "—";
        statusEl.textContent = "Type words made from adjacent letters (diagonals count!) and press Enter.";
        statusEl.className = "status info";
        renderGrid();
        renderFound();
        gridEl.classList.remove("bm-shaking");
        void gridEl.offsetWidth; // restart animation
        gridEl.classList.add("bm-shaking");
        AudioFX.flip();
        startTimer();
        inputEl.focus();
      }

      function doHint() {
        if (over) {
          App.toast("Round is over — shake for a new grid", "info");
          return;
        }
        const unfound = findWords().filter(w => !found.has(w)).sort((a, b) => a.length - b.length);
        if (!unfound.length) {
          App.toast("You found every word — amazing!", "success");
          return;
        }
        const w = unfound[Math.floor(Math.random() * Math.min(3, unfound.length))];
        App.toast("Hint: look for a " + w.length + "-letter word starting with " + w[0], "info");
      }

      function doSolve() {
        if (over) return;
        endRound(true);
      }

      root.querySelector("#bm-go").addEventListener("click", submitWord);
      root.querySelector("#bm-shake").addEventListener("click", newRound);
      inputEl.addEventListener("keydown", e => {
        if (e.key === "Enter") e.preventDefault();
      });

      // Physical keyboard: Enter submits from anywhere; typing elsewhere focuses the input
      function onKey(e) {
        if (over) return;
        if (e.key === "Enter") {
          e.preventDefault();
          submitWord();
          return;
        }
        if (e.target === inputEl) return; // letters typed into the input are native
        if (/^[a-zA-Z]$/.test(e.key)) inputEl.focus();
        else if (e.key === "Backspace") {
          e.preventDefault();
          inputEl.focus();
        }
      }

      document.addEventListener("keydown", onKey);

      live = {hint: doHint, solve: doSolve};
      newRound();
      return function cleanup() {
        alive = false;
        live = null;
        clearInterval(timerInterval);
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
      App.showModal("How to play Boggle Mini 4x4",
        `Shake the 16 Boggle dice into a 4×4 grid, then <b>type</b> the words you can spot before the <b>90-second</b> timer runs out.
        <br><br>• Words are built from <b>adjacent</b> dice — horizontal, vertical and diagonal.
        <br>• Each die can only be used <b>once</b> per word.
        <br>• Words need <b>3 or more letters</b> and must be real English words.
        <br>• The <b>Qu</b> die counts as both letters.
        <br><br>Scoring: 3–4 letters = <b>1 pt</b>, 5 = <b>2</b>, 6 = <b>3</b>, 7 = <b>5</b>, 8+ = <b>11</b>.
        <br><br>Tap <b>🎲 Shake</b> for a fresh grid at any time. Score 10+ points to win the round!`);
    },
  });
})();
