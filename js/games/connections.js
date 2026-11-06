/* Connections — group 16 words into 4 hidden categories of 4. */
(function () {
  const PUZZLES = [
    {
      groups: [
        {category: "FRUITS", words: ["APPLE", "BANANA", "CHERRY", "GRAPE"]},
        {category: "COLORS", words: ["CRIMSON", "AZURE", "IVORY", "JADE"]},
        {category: "PLANETS", words: ["MARS", "VENUS", "SATURN", "JUPITER"]},
        {category: "DOG BREEDS", words: ["POODLE", "BEAGLE", "HUSKY", "LABRADOR"]},
      ],
    },
    {
      groups: [
        {category: "MUSIC GENRES", words: ["JAZZ", "BLUES", "FOLK", "METAL"]},
        {category: "BOARD GAMES", words: ["CHESS", "CHECKERS", "GO", "RISK"]},
        {category: "COFFEE DRINKS", words: ["LATTE", "MOCHA", "ESPRESSO", "AMERICANO"]},
        {category: "DANCE STYLES", words: ["TANGO", "WALTZ", "SALSA", "FOXTROT"]},
      ],
    },
    {
      groups: [
        {category: "PIZZA TOPPINGS", words: ["PEPPERONI", "MUSHROOM", "OLIVE", "ONION"]},
        {category: "GREEK GODS", words: ["ZEUS", "APOLLO", "HADES", "ARES"]},
        {category: "SHAPES", words: ["CIRCLE", "SQUARE", "TRIANGLE", "OVAL"]},
        {category: "CHESS PIECES", words: ["ROOK", "KNIGHT", "BISHOP", "PAWN"]},
      ],
    },
    {
      groups: [
        {category: "CARD GAMES", words: ["POKER", "BRIDGE", "SOLITAIRE", "RUMMY"]},
        {category: "OCEAN ANIMALS", words: ["SHARK", "WHALE", "OCTOPUS", "DOLPHIN"]},
        {category: "MATH OPERATIONS", words: ["PLUS", "MINUS", "TIMES", "DIVIDE"]},
        {category: "BREAD TYPES", words: ["RYE", "PITA", "NAAN", "BAGEL"]},
      ],
    },
    {
      groups: [
        {category: "AUTHORS", words: ["HEMINGWAY", "ORWELL", "TOLKIEN", "AUSTEN"]},
        {category: "SUPERHEROES", words: ["BATMAN", "SUPERMAN", "FLASH", "AQUAMAN"]},
        {category: "MUSICAL INSTRUMENTS", words: ["VIOLIN", "DRUMS", "FLUTE", "TRUMPET"]},
        {category: "GEMSTONES", words: ["RUBY", "PEARL", "OPAL", "JADE"]},
      ],
    },
    {
      groups: [
        {category: "BIRDS", words: ["EAGLE", "ROBIN", "SPARROW", "OWL"]},
        {category: "TREE TYPES", words: ["OAK", "PINE", "MAPLE", "BIRCH"]},
        {category: "ITALIAN FOODS", words: ["PIZZA", "PASTA", "RISOTTO", "GELATO"]},
        {category: "WINTER SPORTS", words: ["SKI", "SLED", "SKATE", "CURLING"]},
      ],
    },
    {
      groups: [
        {category: "GREEK GODS", words: ["ZEUS", "APOLLO", "HADES", "ARES"]},
        {category: "NORSE GODS", words: ["THOR", "ODIN", "LOKI", "FREYA"]},
        {category: "ROMAN GODS", words: ["MARS", "JUPITER", "VENUS", "NEPTUNE"]},
        {category: "EGYPTIAN GODS", words: ["RA", "ANUBIS", "HORUS", "ISIS"]},
      ],
    },
    {
      groups: [
        {category: "CITRUS FRUITS", words: ["LEMON", "LIME", "ORANGE", "GRAPEFRUIT"]},
        {category: "BERRIES", words: ["STRAWBERRY", "BLUEBERRY", "RASPBERRY", "BLACKBERRY"]},
        {category: "TROPICAL FRUITS", words: ["MANGO", "PAPAYA", "PINEAPPLE", "COCONUT"]},
        {category: "STONE FRUITS", words: ["PEACH", "PLUM", "CHERRY", "APRICOT"]},
      ],
    },
    {
      groups: [
        {category: "ANIMAL HOUSES", words: ["DEN", "NEST", "BURROW", "HIVE"]},
        {category: "ROOMS IN A HOUSE", words: ["KITCHEN", "BEDROOM", "BATHROOM", "GARAGE"]},
        {category: "TYPES OF ROADS", words: ["HIGHWAY", "ALLEY", "AVENUE", "CUL DE SAC"]},
        {category: "BUILDING MATERIALS", words: ["BRICK", "WOOD", "CONCRETE", "GLASS"]},
      ],
    },
    {
      groups: [
        {category: "SOCCER TERMS", words: ["GOAL", "CORNER", "PENALTY", "OFFSIDE"]},
        {category: "BASKETBALL TERMS", words: ["DUNK", "FOUL", "DRIBBLE", "ASSIST"]},
        {category: "BASEBALL TERMS", words: ["HOMERUN", "STRIKE", "BUNT", "INNING"]},
        {category: "TENNIS TERMS", words: ["ACE", "VOLLEY", "DEUCE", "LOVE"]},
      ],
    },
    {
      groups: [
        {category: "WEATHER", words: ["RAIN", "SNOW", "FOG", "HAIL"]},
        {category: "NATURAL DISASTERS", words: ["HURRICANE", "EARTHQUAKE", "TSUNAMI", "TORNADO"]},
        {category: "CLOUD TYPES", words: ["CUMULUS", "STRATUS", "CIRRUS", "NIMBUS"]},
        {category: "WINDS", words: ["BREEZE", "GALE", "GUST", "TYPHOON"]},
      ],
    },
    {
      groups: [
        {category: "MEXICAN FOODS", words: ["TACO", "BURRITO", "ENCHILADA", "QUESADILLA"]},
        {category: "JAPANESE FOODS", words: ["SUSHI", "RAMEN", "TEMPURA", "UDON"]},
        {category: "ITALIAN FOODS", words: ["PIZZA", "PASTA", "RISOTTO", "GNOCCHI"]},
        {category: "INDIAN FOODS", words: ["CURRY", "NAAN", "SAMOSA", "TIKKA"]},
      ],
    },
    {
      groups: [
        {category: "PRIMARY COLORS", words: ["RED", "BLUE", "YELLOW", "GREEN"]},
        {category: "SHADES OF RED", words: ["CRIMSON", "SCARLET", "RUBY", "MAROON"]},
        {category: "SHADES OF GREEN", words: ["EMERALD", "JADE", "OLIVE", "MINT"]},
        {category: "SHADES OF BLUE", words: ["NAVY", "AZURE", "COBALT", "TEAL"]},
      ],
    },
    {
      groups: [
        {category: "BIG CATS", words: ["LION", "TIGER", "LEOPARD", "JAGUAR"]},
        {category: "CANINES", words: ["WOLF", "FOX", "JACKAL", "COYOTE"]},
        {category: "BEARS", words: ["GRIZZLY", "POLAR", "PANDA", "BROWN"]},
        {category: "MARSUPIALS", words: ["KANGAROO", "KOALA", "WALLABY", "OPOSSUM"]},
      ],
    },
  ];

  let live = null;
  GameRegistry.register({
    id: "connections",
    name: "Connections",
    icon: "🔗",
    category: "word",
    description: "Group 16 words into 4 hidden categories",
    tags: ["word", "thinking", "variant"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null;
      let selected = new Set();
      let solvedGroups = []; // indices of solved categories
      let mistakes = 0;
      let over = false;
      const MAX_MISTAKES = 4;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Mistakes</div><div class="val" id="cn-mistakes">0 / ${MAX_MISTAKES}</div></div>
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="cn-solved">0 / 4</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cn-best">—</div></div>
        </div>
        <div class="status info" id="cn-status">Select 4 words that share a hidden category.</div>
        <div id="cn-solved-rows" style="display:flex;flex-direction:column;gap:6px;margin:10px 0;"></div>
        <div class="cn-grid" id="cn-grid"></div>
        <div class="row" style="justify-content:center;gap:8px;margin-top:14px;">
          <button class="btn" id="cn-shuffle">Shuffle</button>
          <button class="btn" id="cn-clear">Clear</button>
          <button class="btn primary" id="cn-submit">Submit</button>
        </div>
        <p class="hint">Tap 4 words that you think go together. Submit to lock in a category. You can make up to <b>${MAX_MISTAKES} mistakes</b>.</p>
      `;
      const statusEl = root.querySelector("#cn-status");
      const gridEl = root.querySelector("#cn-grid");
      const solvedRowsEl = root.querySelector("#cn-solved-rows");
      const COLORS = ["var(--accent)", "var(--accent-2)", "var(--success)", "var(--warning)"];
      if (!document.getElementById("cn-style")) {
        const s = document.createElement("style");
        s.id = "cn-style";
        s.textContent = `
          .cn-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; max-width: 480px; margin: 0 auto; }
          .cn-cell { aspect-ratio: 1; min-height: 60px; display: grid; place-items: center; background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; font-weight: 700; font-size: 0.85rem; transition: transform 0.1s, background 0.15s; user-select: none; padding: 4px; text-align: center; }
          .cn-cell:hover { border-color: var(--accent); }
          .cn-cell.selected { background: var(--accent-soft); color: var(--accent); transform: scale(0.96); }
          .cn-solved-row { background: var(--bg-elev); border-radius: var(--radius-sm); padding: 8px; text-align: center; font-weight: 700; }
          .cn-solved-row .cat { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.9; }
          .cn-solved-row .words { font-size: 0.95rem; margin-top: 2px; }
        `;
        document.head.appendChild(s);
      }

      function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      }

      function allWords() {
        const list = [];
        puzzle.groups.forEach((g, i) => {
          if (solvedGroups.includes(i)) return;
          g.words.forEach(w => list.push({word: w, groupIdx: i}));
        });
        return list;
      }

      let order = []; // array of word strings for display

      function renderGrid() {
        gridEl.innerHTML = "";
        const visible = order.filter(w => {
          // Keep only words not in solved groups
          const gi = puzzle.groups.findIndex(g => g.words.includes(w));
          return !solvedGroups.includes(gi);
        });
        visible.forEach(w => {
          const cell = document.createElement("div");
          cell.className = "cn-cell" + (selected.has(w) ? " selected" : "");
          cell.textContent = w;
          cell.addEventListener("click", () => {
            if (over) return;
            if (selected.has(w)) selected.delete(w);
            else if (selected.size < 4) selected.add(w);
            AudioFX.tick();
            renderGrid();
          });
          gridEl.appendChild(cell);
        });
        root.querySelector("#cn-mistakes").textContent = `${mistakes} / ${MAX_MISTAKES}`;
        root.querySelector("#cn-solved").textContent = `${solvedGroups.length} / 4`;
      }

      function renderSolved() {
        solvedRowsEl.innerHTML = "";
        solvedGroups.forEach((gi, i) => {
          const g = puzzle.groups[gi];
          const row = document.createElement("div");
          row.className = "cn-solved-row";
          row.style.background = COLORS[gi];
          row.style.color = "#fff";
          row.innerHTML = `<div class="cat">${g.category}</div><div class="words">${g.words.join(" · ")}</div>`;
          solvedRowsEl.appendChild(row);
        });
      }

      function submit() {
        if (over || selected.size !== 4) {
          if (selected.size !== 4) {
            AudioFX.error();
            statusEl.textContent = "Select exactly 4 words";
            statusEl.className = "status lose";
          }
          return;
        }
        const sel = Array.from(selected);
        const groupsInSel = sel.map(w => puzzle.groups.findIndex(g => g.words.includes(w)));
        const counts = {};
        groupsInSel.forEach(gi => counts[gi] = (counts[gi] || 0) + 1);
        const bestGroup = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        if (counts[bestGroup] === 4) {
          solvedGroups.push(parseInt(bestGroup, 10));
          AudioFX.win();
          statusEl.textContent = `Solved: ${puzzle.groups[bestGroup].category}!`;
          statusEl.className = "status win";
          selected.clear();
          renderSolved();
          renderGrid();
          if (solvedGroups.length === 4) {
            over = true;
            statusEl.textContent = `🎉 Perfect! Solved all 4 with ${mistakes} mistake${mistakes === 1 ? "" : "s"}.`;
            const score = mistakes === 0 ? 100 : Math.max(0, 100 - mistakes * 20);
            const best = Storage.getBest("connections");
            if (!best || score > best) {
              Storage.setBest("connections", score);
              root.querySelector("#cn-best").textContent = score;
              App.toast("New best: " + score, "success");
            }
          }
        } else {
          mistakes++;
          AudioFX.error();
          if (counts[bestGroup] === 3) {
            statusEl.textContent = "One away…";
            statusEl.className = "status lose";
            App.toast("One away from a category!", "warning");
          } else {
            statusEl.textContent = "Not a category.";
            statusEl.className = "status lose";
          }
          if (mistakes >= MAX_MISTAKES) {
            over = true;
            statusEl.textContent = "Out of mistakes. Game over.";
            statusEl.className = "status lose";
            // Auto-reveal remaining groups
            puzzle.groups.forEach((g, i) => {
              if (!solvedGroups.includes(i)) solvedGroups.push(i);
            });
            renderSolved();
            renderGrid();
          }
        }
        renderGrid();
      }

      root.querySelector("#cn-submit").addEventListener("click", submit);
      root.querySelector("#cn-clear").addEventListener("click", () => {
        if (over) return;
        selected.clear();
        AudioFX.click();
        renderGrid();
      });
      root.querySelector("#cn-shuffle").addEventListener("click", () => {
        if (over) return;
        shuffleArray(order);
        AudioFX.click();
        renderGrid();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        selected = new Set();
        solvedGroups = [];
        mistakes = 0;
        over = false;
        order = shuffleArray(puzzle.groups.flatMap(g => g.words.slice()));
        const best = Storage.getBest("connections");
        root.querySelector("#cn-best").textContent = best || "—";
        statusEl.textContent = "Select 4 words that share a hidden category.";
        statusEl.className = "status info";
        renderSolved();
        renderGrid();
      }

      live = {
        solve: function () {
          if (over) return;
          App.showModal("Connections — solution",
            puzzle.groups.map(g => `<b>${g.category}</b>: ${g.words.join(", ")}`).join("<br><br>"));
        }
      };
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Connections",
        `Find groups of <b>4 words</b> that share something in common.
        <br><br>Tap to select 4 words, then hit <b>Submit</b>. If they form a category, the row locks in.
        <br><br>You can make up to <b>4 mistakes</b>. Use <b>Shuffle</b> to rearrange, <b>Clear</b> to deselect.`);
    },
  });
})();
