/* Boggle — find as many words (≥3 letters) as possible in a 4×4 grid of letters. Adjacent cells only. */
(function () {
  // Letter frequency distribution roughly based on Boggle dice (simplified)
  const DICE = [
    "AAEEGN", "ABBJOO", "ACHOPS", "AFFKPS", "AOOTTW", "CIMOTU", "DEILRX", "DELRVY",
    "DISTTY", "EEGHNW", "EEINSU", "EHRTVW", "EIOSST", "ELRTTY", "HIMNQU", "HLNNRZ",
  ];

  // Compact common-word dictionary (>= 3 letters). Limited set for offline play.
  const DICT_TEXT = ("the and you for are was that had have this with but not his her she him its they from all were one your said each which their how who when what where why can now did get has him his how into our out over said then them these they this upon was went were what when will with yes you your about above after again air all also and another any are area around as ask at away back ball be bear beat bed before began begin being below best better between big bird black blue book both bottom box boy bring brought build but buy by call came can car care carry case change child children city close cold come could country course cut dark day deep did different do does dog don done door down draw during each earth eat end enough even ever every eye face fact family far fast father feel feet few field find first fire fish five fly food foot for form found four from full game gave get girl give go good got great green ground group grow had hair half hand happen hard has have he head heard heart heat heavy help her here high him his hit hold home hope house how however if in into is it its keep kind king knew know land large last later lay learn leave left less let letter life light like line list little live long look lost love low made main make man many may me mean men might mile mind mine miss money more morning most mother mountain move much must name near need never new next night no none nor north not nothing now number of off often oh oil old on once one only open or order other our out over own page paid paper part people perhaps place plan plant play point power probably problem put question quite rain reach read ready red rest right river room round run said same sat save saw say school sea second see seem self set she ship short should show side since sister small snow so some something sometimes son soon sound south space speak stand start state stay still story street such sun sure table take talk tall tell ten than that the their them then there these they thing think this those though thought three through time tiny to together told took top toward town tree true try turn two under until up upon us use very voice walk want was water way we well went were west what when where which while white who why wide wife wild will wind window winter wish with without woman words work world would write year yes yet you young your age aid aim air ant any art ask ate axe bad bag ban bar bat bed bee beg bet bid big bin bit bog bow box boy bud bug bun bus but buy cab cam can cap car cat cob cod cog cop cot cow cry cub cup cut dab dad dam day den did dig dim din dip doe dog don dot dry dub due dug dye ear eat ebb eel egg ego elf elk elm end era eve eye fan far fat fee few fib fig fin fir fit fix fly fog for fox fry fun fur gap gas gel gem get god got gum gun gut guy gym had hag ham has hat hay her hen hex hey hid him hip his hit hob hog hop hot how hub hue hug hum hut ice icy ill ink inn ion ire irk its jab jam jar jaw jay jet jig job jog jot joy jug key kid kin kit lab lad lag lap law lay led leg let lid lie lip lit lob log lop lot low mad man map mar mat may men met mid mix mob mom mop mow mud mug nab nag nap nay net new nib nil nip nod nor not now nun nut oak oar oat odd off oil old one orb ore our out owe owl own pad pal pan par pat paw pay pea pen pet pic pie pig pin pit pod pop pot pub pug pun pup put rag ram ran rap rat raw ray red rib rid rig rim rip rob rod roe rot row rub rug rum run rut rye sac sad sap sat saw say sea see set sew she shy sin sip sir sit six ski sky sly sob sod son sop sow soy spa spy sty sub sue sum sun tab tad tag tan tap tar tax tea ten the thy tic tie tin tip toe ton too top tot tow toy try tub tug two urn use van vat vet vex via vie vow wad wag wan war was wax way web wed wee wet who why wig win wit woe wok won woo wow wry yak yam yap yaw yea yen yes yet you zap zip zoo");
  const DICT = new Set(DICT_TEXT.split(/\s+/).filter(w => w.length >= 3));

  function rollGrid() {
    const grid = [];
    const dice = DICE.slice();
    // shuffle dice
    for (let i = dice.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dice[i], dice[j]] = [dice[j], dice[i]];
    }
    for (let i = 0; i < 16; i++) {
      const face = dice[i][Math.floor(Math.random() * 6)];
      grid.push(face === "Q" ? "Qu" : face);
    }
    return grid;
  }

  function neighbors(i) {
    const r = Math.floor(i / 4), c = i % 4;
    const ns = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) ns.push(nr * 4 + nc);
    }
    return ns;
  }

  function findWords(grid) {
    const found = new Set();
    const N = 16;

    function dfs(idx, path, visited, word) {
      const letter = grid[idx];
      const newWord = word + letter.toLowerCase();
      if (newWord.length >= 3 && DICT.has(newWord)) found.add(newWord.toUpperCase());
      if (newWord.length >= 8) return;
      for (const n of neighbors(idx)) {
        if (visited.has(n)) continue;
        visited.add(n);
        dfs(n, path.concat(idx), visited, newWord);
        visited.delete(n);
      }
    }

    for (let i = 0; i < N; i++) {
      const v = new Set([i]);
      dfs(i, [i], v, "");
    }
    return Array.from(found);
  }

  let live = null;
  GameRegistry.register({
    id: "boggle",
    name: "Boggle",
    icon: "🎲",
    category: "word",
    description: "Find words (≥3 letters) in the 4×4 letter grid",
    tags: ["word", "thinking", "timer"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let grid = null, found = new Set(), selected = [], selecting = false, over = false;
      let timerInterval = null, timeLeft = 120;
      const ROUND_TIME = 120;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Time</div><div class="val" id="bg-time">${ROUND_TIME}s</div></div>
          <div class="score-cell"><div class="label">Words</div><div class="val" id="bg-words">0</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="bg-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="bg-best">—</div></div>
        </div>
        <div class="status info" id="bg-status">Drag across letters to form a word (≥3 letters). Release to submit.</div>
        <div class="center" style="margin:14px 0;"><div class="bg-grid" id="bg-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="bg-shuffle">New Round</button>
          <button class="btn primary" id="bg-show">Show all words</button>
        </div>
        <div id="bg-found-list" class="bg-found"></div>
        <p class="hint">Drag mouse across adjacent letters (incl. diagonal) to build a word. Release to submit. Each cell only used once per word. 3 letters = 1 pt, 4 = 1, 5 = 2, 6 = 3, 7 = 5, 8+ = 11.</p>
      `;
      const statusEl = root.querySelector("#bg-status");
      const gridEl = root.querySelector("#bg-grid");
      const foundListEl = root.querySelector("#bg-found-list");
      if (!document.getElementById("bg-style")) {
        const s = document.createElement("style");
        s.id = "bg-style";
        s.textContent = `
          .bg-grid { display: grid; grid-template-columns: repeat(4, 60px); gap: 4px; background: var(--bg-elev); padding: 8px; border-radius: var(--radius); touch-action: none; }
          .bg-cell { width: 60px; height: 60px; background: var(--bg-soft); border: 1px solid var(--border); border-radius: var(--radius-sm); display: grid; place-items: center; font-family: var(--font-heading); font-weight: 700; font-size: 1.3rem; color: var(--text); cursor: pointer; user-select: none; transition: all 0.1s; }
          .bg-cell.selected { background: var(--accent); color: #fff; transform: scale(0.95); }
          .bg-cell:hover { border-color: var(--accent); }
          .bg-found { display: flex; flex-wrap: wrap; gap: 4px; max-width: 480px; margin: 14px auto 0; max-height: 140px; overflow-y: auto; padding: 4px; }
          .bg-found-item { padding: 3px 8px; background: var(--bg-elev); border: 1px solid var(--border); border-radius: 999px; font-size: 0.8rem; color: var(--text); }
          .bg-found-item.bad { color: var(--danger); border-color: var(--danger); }
        `;
        document.head.appendChild(s);
      }

      function renderGrid() {
        gridEl.innerHTML = "";
        grid.forEach((L, i) => {
          const cell = document.createElement("div");
          cell.className = "bg-cell" + (selected.includes(i) ? " selected" : "");
          cell.textContent = L;
          cell.dataset.i = i;
          gridEl.appendChild(cell);
        });
      }

      function renderFound() {
        foundListEl.innerHTML = "";
        Array.from(found).sort().forEach(w => {
          const el = document.createElement("div");
          el.className = "bg-found-item";
          el.textContent = w;
          foundListEl.appendChild(el);
        });
        root.querySelector("#bg-words").textContent = found.size;
        root.querySelector("#bg-score").textContent = scoreOfWords(found);
      }

      function scoreOfWords(set) {
        let s = 0;
        for (const w of set) {
          if (w.length <= 4) s += 1;
          else if (w.length === 5) s += 2;
          else if (w.length === 6) s += 3;
          else if (w.length === 7) s += 5;
          else s += 11;
        }
        return s;
      }

      function startSelect(i) {
        if (over) return;
        selecting = true;
        selected = [i];
        AudioFX.tick();
        renderGrid();
      }

      function extendSelect(i) {
        if (!selecting || over) return;
        if (selected.includes(i)) {
          // Allow backtracking: pop until we're at the cell before this one
          if (selected.length >= 2 && selected[selected.length - 2] === i) {
            selected.pop();
            renderGrid();
          }
          return;
        }
        const last = selected[selected.length - 1];
        if (neighbors(last).includes(i)) {
          selected.push(i);
          AudioFX.tick();
          renderGrid();
        }
      }

      function endSelect() {
        if (!selecting) return;
        selecting = false;
        if (selected.length >= 3) {
          const word = selected.map(i => grid[i].toLowerCase()).join("").toUpperCase();
          submitWord(word);
        }
        selected = [];
        renderGrid();
      }

      function submitWord(word) {
        if (over) return;
        if (word.length < 3) {
          AudioFX.error();
          return;
        }
        if (found.has(word)) {
          AudioFX.error();
          statusEl.textContent = `Already found: ${word}`;
          statusEl.className = "status lose";
          return;
        }
        if (!DICT.has(word.toLowerCase())) {
          AudioFX.error();
          statusEl.textContent = `"${word}" isn't in the dictionary`;
          statusEl.className = "status lose";
          return;
        }
        found.add(word);
        AudioFX.pop();
        statusEl.textContent = `+${word.length <= 4 ? 1 : word.length === 5 ? 2 : word.length === 6 ? 3 : word.length === 7 ? 5 : 11} — "${word}"`;
        statusEl.className = "status win";
        renderFound();
      }

      // Mouse + touch handling
      function cellFromPoint(x, y) {
        const el = document.elementFromPoint(x, y);
        if (el && el.classList.contains("bg-cell")) return parseInt(el.dataset.i, 10);
        return null;
      }

      gridEl.addEventListener("mousedown", (e) => {
        const i = cellFromPoint(e.clientX, e.clientY);
        if (i !== null) {
          e.preventDefault();
          startSelect(i);
        }
      });
      gridEl.addEventListener("mousemove", (e) => {
        if (selecting) {
          const i = cellFromPoint(e.clientX, e.clientY);
          if (i !== null) extendSelect(i);
        }
      });
      document.addEventListener("mouseup", endSelect);
      gridEl.addEventListener("touchstart", (e) => {
        const t = e.touches[0];
        const i = cellFromPoint(t.clientX, t.clientY);
        if (i !== null) {
          e.preventDefault();
          startSelect(i);
        }
      }, {passive: false});
      gridEl.addEventListener("touchmove", (e) => {
        const t = e.touches[0];
        const i = cellFromPoint(t.clientX, t.clientY);
        if (i !== null) {
          e.preventDefault();
          extendSelect(i);
        }
      }, {passive: false});
      document.addEventListener("touchend", endSelect);

      function startTimer() {
        clearInterval(timerInterval);
        timeLeft = ROUND_TIME;
        root.querySelector("#bg-time").textContent = timeLeft + "s";
        timerInterval = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          if (!alive || over) return;
          timeLeft--;
          root.querySelector("#bg-time").textContent = timeLeft + "s";
          if (timeLeft <= 0) {
            clearInterval(timerInterval);
            over = true;
            AudioFX.lose();
            const score = scoreOfWords(found);
            statusEl.textContent = `⌛ Time up! You found ${found.size} word${found.size === 1 ? "" : "s"} for ${score} points.`;
            statusEl.className = "status lose";
            const best = Storage.getBest("boggle");
            if (!best || score > best) {
              Storage.setBest("boggle", score);
              root.querySelector("#bg-best").textContent = score;
              App.toast("New best: " + score, "success");
            }
          }
        }, 1000);
      }

      root.querySelector("#bg-shuffle").addEventListener("click", () => {
        AudioFX.click();
        newRound();
      });
      root.querySelector("#bg-show").addEventListener("click", () => {
        if (over) {
          const all = findWords(grid);
          App.showModal("Boggle — all valid words", `Found ${all.length} valid word${all.length === 1 ? "" : "s"} in this grid:<br><br>${all.sort().slice(0, 80).join(", ")}${all.length > 80 ? "<br>…" : ""}`);
        } else {
          App.toast("Available after the round ends", "info");
        }
      });

      function newRound() {
        clearInterval(timerInterval);
        grid = rollGrid();
        found = new Set();
        selected = [];
        selecting = false;
        over = false;
        const best = Storage.getBest("boggle");
        root.querySelector("#bg-best").textContent = best || "—";
        statusEl.textContent = "Drag across letters to form a word (≥3 letters). Release to submit.";
        statusEl.className = "status info";
        renderGrid();
        renderFound();
        startTimer();
      }

      live = {
        solve: function () {
          if (over) return;
          clearInterval(timerInterval);
          over = true;
          // Find all valid words and add them
          const all = findWords(grid);
          all.forEach(w => found.add(w));
          renderFound();
          statusEl.textContent = `Revealed all ${all.length} valid words.`;
          statusEl.className = "status lose";
          AudioFX.lose();
        }
      };
      newRound();
      return function cleanup() {
        alive = false;
        live = null;
        clearInterval(timerInterval);
        document.removeEventListener("mouseup", endSelect);
        document.removeEventListener("touchend", endSelect);
      };
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Boggle",
        `Drag your mouse (or finger) across <b>adjacent letters</b> (including diagonals) to spell a word of <b>3+ letters</b>. Release to submit.
        <br><br>Each cell can only be used once per word.
        <br><br>You have <b>2 minutes</b> per round. Score by word length: 3–4 = 1 pt, 5 = 2, 6 = 3, 7 = 5, 8+ = 11.`);
    },
  });
})();
