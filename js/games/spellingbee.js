/* Spelling Bee — form words (≥4 letters) from 7 letters; the center letter is required. */
(function () {
  // Each puzzle: 7 unique letters (center first) + a curated valid-word list.
  // Words can use letters any number of times, must be ≥4 letters, must include the center.
  const PUZZLES = [
    {
      letters: "ARDGINB",
      center: "R",
      words: ["RAIN", "RAINBOW", "RAINBOWS", "BRAIN", "BRAIN", "BARRAGE", "BARGAIN", "BARGAINS", "GRAIN", "GRAINS", "GRAB", "GRAB", "DRAG", "DRAGS", "GAIN", "GAINS", "BAND", "BANDS", "BANDANA", "BANDANAS", "BRAIN", "BRAINS", "RABID", "RADIANT", "RADIO", "RADIOS", "RAID", "RAIDS", "RANG", "RANGE", "BANG", "BANGS", "BAR", "BARS", "BARN", "BARN", "BIRDS", "BIRD", "BARGE", "BARGED", "DRAIN", "DRAINS", "GRAND", "GRAND", "BRIG", "BRIGS", "DIG", "DIGS", "DIN", "DINS", "GIG", "GIGS", "NAB", "NABS", "NIB", "NIBS", "RIB", "RIBS", "RIG", "RIGS", "RING", "RINGS", "AIR", "AIRS"]
    },
    {
      letters: "TNAEILC",
      center: "T",
      words: ["PLAIN", "PLANT", "PLATE", "PLATES", "PLATEAU", "PLATEAUS", "LATENESS", "LATE", "LATELY", "ELATE", "ELATES", "ELATED", "TACIT", "TACTILE", "TACTIC", "TACTICS", "TALE", "TALES", "TALC", "TALCS", "TALI", "TALLIC", "TALON", "TALONS", "TENT", "TENTS", "TENTACLE", "TENTACLES", "TENNIS", "TENNIS", "TINE", "TINES", "TINT", "TINTS", "TINTED", "TITLE", "TITLES", "TITLED", "CATTAIL", "CATTAILS", "CATNIP", "CATNIPS", "CLAN", "CLANS", "CLEAN", "CLEANS", "CLEANER", "CLEANEST", "CLIENT", "CLIENTS", "CLINIC", "CLINICS", "CLINICAL", "CITATEL", "CITE", "CITES", "CITED", "EAST", "EASTS", "LACE", "LACES", "LACED", "LAITY", "LANE", "LANES", "LATE", "LATELY", "LATENESS", "LATENT", "LEANT", "LENT", "NICE", "NICEST", "NIECE", "NIECES", "NILE", "NIT", "NITS", "PACIFIC", "PACE", "PACES", "PACED", "PAIN", "PAINS", "PAINT", "PAINTS", "PAINTED", "PAINTER", "PAINTERS", "PALATE", "PALATES", "PANICLE", "PANIC", "PANICS", "PETITE", "PICE", "PILATE", "PIN", "PINE", "PINES", "PINNACE", "PICTAIL", "PIETA", "PIETAS", "PILE", "PILES", "PILED", "PLACE", "PLACES", "PLACED", "PLAIN", "PLAINS", "PLAIT", "PLAITS", "PLATE", "PLATES", "PLATEAU", "PLATEAUS", "PLEA", "PLEAS", "PLED", "TALE", "TALES", "TALC", "TALCS", "TALI", "TALON", "TALONS", "TENT", "TENTS", "TINE", "TINES", "TINT", "TINTS", "TIT", "TITS", "TITLE", "TITLES", "TITLED"]
    },
    {letters: "OLDCIREB", center: "C", words: []},
  ];
  // Compact dictionary for fallback
  const DICT = new Set(("rain rainbow rainbows brain brains barrage bargain grain grains drag drags gain gains band bands bandana brain brains rabid radiant radio radios raid raids rang range bang bangs bar bars barn barns birds bird brigade brigades drain drains grand grand brig brigs dig digs din dins gig gigs nab nabs nib nibs rib ribs rig rigs ring rings air airs").split(" "));

  // Try puzzle 0/1 (which has curated words). Fallback to puzzle 0.
  function pickPuzzle() {
    const good = PUZZLES.filter(p => p.words.length > 0);
    return good[Math.floor(Math.random() * good.length)];
  }

  function pangram(letters, center, word) {
    const set = new Set(letters.toLowerCase().split(""));
    const wset = new Set(word.toLowerCase().split(""));
    return wset.size === set.size && [...set].every(c => wset.has(c)) && word.toLowerCase().includes(center.toLowerCase());
  }

  let live = null;
  GameRegistry.register({
    id: "spellingbee",
    name: "Spelling Bee",
    icon: "🐝",
    category: "word",
    description: "Form words (≥4 letters) from 7 letters — center letter required",
    tags: ["word", "thinking"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null;
      let found = new Set();
      let score = 0;
      let input = "";

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Words</div><div class="val" id="sb-words">0</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="sb-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sb-best">—</div></div>
        </div>
        <div class="status info" id="sb-status">Type words (≥4 letters). Center letter is required.</div>
        <div class="center" style="margin:14px 0;">
          <div class="sb-hex" id="sb-hex"></div>
        </div>
        <div class="row" style="justify-content:center;gap:8px;">
          <input id="sb-input" type="text" autocomplete="off" placeholder="Type a word…" class="search" style="flex:0 1 220px;text-transform:uppercase;letter-spacing:0.1em;" />
          <button class="btn primary" id="sb-submit">Enter</button>
          <button class="btn" id="sb-shuffle" title="Shuffle outer letters">⟳</button>
        </div>
        <div class="col" id="sb-found" style="gap:4px;margin-top:14px;max-height:200px;overflow-y:auto;"></div>
        <p class="hint">Words must be at least 4 letters and include the <b>center letter</b>. Letters can repeat. 4-letter words = 1 pt, longer = length, pangram (uses all 7) = +7.</p>
      `;
      const statusEl = root.querySelector("#sb-status");
      const hexEl = root.querySelector("#sb-hex");
      const inputEl = root.querySelector("#sb-input");
      const foundEl = root.querySelector("#sb-found");
      // Inject hex styles once
      if (!document.getElementById("sb-hex-style")) {
        const s = document.createElement("style");
        s.id = "sb-hex-style";
        s.textContent = `
          .sb-hex { display: grid; grid-template-columns: repeat(3, 56px); gap: 6px; justify-content: center; }
          .sb-cell { width: 56px; height: 56px; display: grid; place-items: center; clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%); background: var(--bg-elev); border: none; color: var(--text); font-weight: 700; font-size: 1.25rem; font-family: var(--font-heading); cursor: pointer; text-transform: uppercase; }
          .sb-cell.center { background: var(--accent); color: #fff; }
          .sb-cell:active { transform: scale(0.95); }
        `;
        document.head.appendChild(s);
      }

      function renderHex() {
        hexEl.innerHTML = "";
        const letters = [puzzle.center].concat(puzzle.letters.replace(puzzle.center, "").split(""));
        // 7 hexagons: center is index 0, then 6 around it
        const slots = [4, 1, 3, 5, 0, 2, 6]; // grid positions for center + 6 outer
        // Display: top row 2 cells, middle row 3 (center + 2), bottom row 2
        // Easier: use a fixed layout of 7 hexagons
        const layout = [0, 1, 2, 3, 4, 5, 6];
        // For visual simplicity: render as a 3x3 grid missing two corners
        const positions = [
          {r: 0, c: 1}, {r: 0, c: 2}, {r: 0, c: 0}, // wait — let's just do 7 in 3-col grid
        ];
        // Simpler: 7 hexagons in a flower layout (1 center + 6 around) is complex with CSS.
        // Use a 3x3 grid with center as middle:
        //   . L L
        //   L C L
        //   L L .
        const grid = [
          [null, letters[1], letters[2]],
          [letters[3], puzzle.center, letters[4]],
          [letters[5], letters[6], null],
        ];
        // Flatten in grid order, placing each cell
        const flat = [
          null, letters[1], letters[2],
          letters[3], puzzle.center, letters[4],
          letters[5], letters[6], null,
        ];
        flat.forEach((L, i) => {
          const cell = document.createElement("button");
          if (L === null) {
            cell.className = "sb-cell";
            cell.style.visibility = "hidden";
            hexEl.appendChild(cell);
            return;
          }
          cell.className = "sb-cell" + (L === puzzle.center ? " center" : "");
          cell.textContent = L;
          cell.addEventListener("click", () => {
            input += L;
            inputEl.value = input;
            AudioFX.tick();
          });
          hexEl.appendChild(cell);
        });
      }

      function renderFound() {
        foundEl.innerHTML = "";
        const sorted = Array.from(found).sort();
        sorted.forEach(w => {
          const el = document.createElement("div");
          el.className = "row";
          el.style.cssText = "justify-content:space-between;padding:4px 10px;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:0.85rem;";
          const isPangram = pangram(puzzle.letters, puzzle.center, w);
          el.innerHTML = `<span>${w}</span><span style="color:var(--text-muted);">${isPangram ? "🌟 Pangram" : ""}</span>`;
          foundEl.appendChild(el);
        });
        root.querySelector("#sb-words").textContent = found.size;
        root.querySelector("#sb-score").textContent = score;
      }

      function wordScore(w) {
        const n = w.length;
        if (n < 4) return 0;
        let s = n === 4 ? 1 : n;
        if (pangram(puzzle.letters, puzzle.center, w)) s += 7;
        return s;
      }

      function submit() {
        const w = input.trim().toUpperCase();
        input = "";
        inputEl.value = "";
        if (!w) return;
        if (w.length < 4) {
          AudioFX.error();
          statusEl.textContent = "Too short — need 4+ letters";
          statusEl.className = "status lose";
          return;
        }
        if (!w.toLowerCase().includes(puzzle.center.toLowerCase())) {
          AudioFX.error();
          statusEl.textContent = "Must use the center letter";
          statusEl.className = "status lose";
          return;
        }
        if (found.has(w)) {
          AudioFX.error();
          statusEl.textContent = "Already found";
          statusEl.className = "status lose";
          return;
        }
        const valid = puzzle.words.includes(w) || DICT.has(w.toLowerCase());
        if (!valid) {
          // Loosen: accept if all letters come from puzzle and word has ≥4 letters (offline-friendly)
          const ok = w.split("").every(c => puzzle.letters.includes(c.toUpperCase()));
          if (!ok) {
            AudioFX.error();
            statusEl.textContent = "Not in word list";
            statusEl.className = "status lose";
            return;
          }
        }
        found.add(w);
        const pts = wordScore(w);
        score += pts;
        AudioFX.pop();
        statusEl.textContent = `+${pts} — "${w}"${pangram(puzzle.letters, puzzle.center, w) ? " (Pangram!)" : ""}`;
        statusEl.className = "status win";
        renderFound();
        const best = Storage.getBest("spellingbee");
        if (score > (best || 0)) {
          Storage.setBest("spellingbee", score);
          root.querySelector("#sb-best").textContent = score;
        }
      }

      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      });
      inputEl.addEventListener("input", (e) => {
        input = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
        e.target.value = input;
      });
      root.querySelector("#sb-submit").addEventListener("click", submit);
      root.querySelector("#sb-shuffle").addEventListener("click", () => {
        AudioFX.click();
        // shuffle outer letters
        const center = puzzle.center;
        const outer = puzzle.letters.replace(center, "").split("");
        for (let i = outer.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [outer[i], outer[j]] = [outer[j], outer[i]];
        }
        puzzle.letters = center + outer.join("");
        renderHex();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(pickPuzzle()));
        found = new Set();
        score = 0;
        input = "";
        const best = Storage.getBest("spellingbee");
        root.querySelector("#sb-best").textContent = best || "—";
        statusEl.textContent = "Type words (≥4 letters). Center letter is required.";
        statusEl.className = "status info";
        renderHex();
        renderFound();
        inputEl.value = "";
        inputEl.focus();
      }

      live = {
        hint: function () {
          if (!puzzle) return;
          const remaining = puzzle.words.filter(w => !found.has(w) && w.length >= 5);
          if (!remaining.length) {
            App.toast("No hints available", "info");
            return;
          }
          const w = remaining[Math.floor(Math.random() * remaining.length)];
          App.toast(`Hint: there's a ${w.length}-letter word starting with "${w[0]}"`, "info");
          AudioFX.reveal();
        }, solve: function () {
          if (!puzzle) return;
          const remaining = puzzle.words.filter(w => !found.has(w));
          if (!remaining.length) {
            App.toast("All words found!", "info");
            return;
          }
          App.showModal("Spelling Bee — solutions", `Still unfound (${remaining.length}):<br><br>${remaining.slice(0, 30).join(", ")}${remaining.length > 30 ? "…" : ""}`);
        }
      };
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Spelling Bee",
        `Make words from the <b>7 letters</b> in the honeycomb. The <b>center letter</b> (highlighted) must be in every word.
        <br><br>Rules:
        <br>• Words must be <b>at least 4 letters</b>.
        <br>• Letters can be <b>reused</b> any number of times.
        <br>• Every word must contain the <b>center letter</b>.
        <br><br>Scoring: 4-letter word = 1 pt; longer word = its length; using all 7 letters (a <b>pangram</b>) = +7 bonus pts.
        <br><br>Tap letters in the honeycomb or type into the box. <b>Enter</b> submits. Use <b>⟳</b> to shuffle the outer letters.`);
    },
  });
})();
