/* Pangram Hunt — given 7 letters, find words that use all 7 (pangrams). */
(function () {
  const PUZZLES = [
    {
      letters: "starein",
      pangrams: ["instant", "striant", "nastier", "resiant", "ratines", "stainer", "tinware"],
      words: ["star", "rate", "tire", "snare", "train", "east", "saint", "rain", "near", "nest", "rest", "tear", "earn", "ante", "anti"]
    },
    {
      letters: "aelmpst",
      pangrams: ["palmetto", "stompale", "plateaus", "templeas", "pastelum"],
      words: ["past", "stale", "plate", "maple", "stale", "pales", "tales", "plates", "tap", "map", "set", "tea", "ale", "ate", "pet", "sea", "sat"]
    },
    {
      letters: "rnostue",
      pangrams: ["trounces", "counters", "recounts", "trounces", "noctures"],
      words: ["stone", "store", "route", "count", "rouse", "north", "notes", "torn", "nose", "tone", "tune", "rose", "rest", "ones", "sort"]
    },
    {
      letters: "aegrind",
      pangrams: ["reading", "garnied", "dangeri", "gardine", "readign", "degrain"],
      words: ["grain", "range", "grade", "diner", "grind", "ring", "raged", "dear", "dare", "gear", "near", "rage", "gained", "garden", "grade"]
    },
    {
      letters: "chkoest",
      pangrams: ["chokest", "stockey", "throkes", "hockets", "chokets"],
      words: ["choke", "shock", "stock", "chose", "those", "host", "shot", "toes", "hose", "echo", "cots", "set", "hot", "cot"]
    },
    {
      letters: "aelrtcd",
      pangrams: ["clattered", "claredet", "recladet"],
      words: ["card", "care", "carl", "cart", "cede", "cell", "celt", "clad", "claret", "clare", "clean", "clear", "cradle", "created", "crate", "created", "laced", "late", "race", "rated", "react", "read", "trade", "trail", "teal", "tare", "talc", "tear"]
    },
    {
      letters: "deginrv",
      pangrams: ["verging", "driving", "ringged", "grieved", "dirge"],
      words: ["dire", "dive", "drip", "drive", "dire", "give", "giver", "grid", "grim", "grin", "grip", "river", "ride", "ring", "rive", "vine", "dire", "reign", "ridge", "diver"]
    },
    {
      letters: "acehilp",
      pangrams: ["alphecic", "caphile", "epical", "capel"],
      words: ["ache", "ale", "cap", "cape", "caph", "ceil", "chap", "cheap", "clip", "each", "epic", "heap", "heal", "helix", "lace", "leap", "pace", "pail", "pale", "peach", "pical", "pile", "plie", "plea", "place", "pleach"]
    },
    {
      letters: "bdeilru",
      pangrams: ["bruised", "bursied", "subrider"],
      words: ["bird", "bide", "bier", "blue", "blur", "bred", "bride", "build", "dire", "drib", "drub", "drupe", "duel", "duel", "idle", "ired", "laird", "lube", "lude", "lure", "lurid", "ride", "riel", "rude", "rued", "rule", "urble", "urial"]
    },
    {
      letters: "aeglnor",
      pangrams: ["orangery", "orangegla", "longarea", "loganera", "angelore"],
      words: ["angel", "anger", "angle", "area", "argon", "earl", "earring", "gale", "gander", "glean", "glare", "gore", "gore", "granola", "groan", "lager", "lane", "large", "learn", "loaner", "longer", "lore", "nag", "near", "noble", "orangery", "organ", "organ", "orangier", "range", "regal", "role", "ronnel", "rugel"]
    },
    {
      letters: "ceinops",
      pangrams: ["pincose", "picosen", "spicone"],
      words: ["cope", "copen", "copy", "cosine", "epic", "icon", "ions", "nice", "nose", "ones", "open", "opes", "opsin", "pice", "pines", "pion", "ponce", "ponce", "pose", "scion", "scone", "scope", "sine", "sipe", "sone", "spec", "spice", "spine"]
    },
    {
      letters: "ahklnsy",
      pangrams: ["shalykn", "shaklyn"],
      words: ["ankh", "anky", "hank", "hays", "kays", "khan", "lank", "nash", "nays", "shank", "shaky", "shaly", "skank", "slank", "yank", "yanks", "yash", "yawl"]
    },
    {
      letters: "aelrtvy",
      pangrams: ["travel", "vealtry"],
      words: ["airy", "aery", "alrt", "arty", "early", "earl", "elytra", "lares", "late", "layer", "lyrate", "ratel", "ravel", "rayed", "real", "relay", "tael", "tail", "tale", "tarry", "teary", "trace", "tray", "trey", "vale", "vary", "veal", "velar", "vera", "very", "yare", "yeah", "yell", "yeti"]
    },
    {
      letters: "ilorstu",
      pangrams: ["solutier", "solution", "tousier"],
      words: ["riot", "rile", "roil", "role", "roti", "roust", "roil", "rule", "rust", "silo", "silt", "slit", "soul", "sour", "stir", "stour", "tail", "tirl", "toil", "tori", "torn", "tour", "trios", "troy", "tuil", "turbo"]
    },
    {
      letters: "acelmot",
      pangrams: ["coleman", "cometla", "locatema"],
      words: ["atom", "calm", "cameo", "camel", "came", "clam", "clot", "coal", "coat", "cola", "coma", "comb", "come", "comet", "lace", "late", "loam", "loathe", "locate", "mace", "macle", "male", "malt", "mate", "meat", "melt", "meta", "metal", "mola", "mole", "molt", "mote", "taco", "tale", "teal", "team"]
    },
  ];
  let live = null;
  GameRegistry.register({
    id: "pangramhunt",
    name: "Pangram Hunt",
    icon: "🅿️",
    category: "word",
    description: "Find pangrams (words using all 7 letters)",
    tags: ["word", "spelling"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle, found = new Set(), over = false;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Found</div><div class="val" id="ph-found">0</div></div>
          <div class="score-cell"><div class="label">Pangrams</div><div class="val" id="ph-pan">0</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="ph-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ph-best">—</div></div>
        </div>
        <div class="status info" id="ph-status">Find words using the 7 letters. A pangram uses ALL 7.</div>
        <div id="ph-letters" class="row" style="justify-content:center;gap:8px;margin:14px 0;"></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <input id="ph-input" autocomplete="off" placeholder="type word…" style="padding:10px;width:160px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-elev);color:var(--text);"/>
          <button class="btn primary" id="ph-go">Submit</button>
        </div>
        <div id="ph-list" class="col" style="gap:4px;max-width:360px;margin:14px auto;max-height:160px;overflow-y:auto;"></div>
        <p class="hint">Min 4 letters. Letters can be reused. Pangram = +15 bonus.</p>
      `;
      const statusEl = root.querySelector("#ph-status");
      const lettersEl = root.querySelector("#ph-letters");
      const input = root.querySelector("#ph-input");
      const listEl = root.querySelector("#ph-list");
      if (!document.getElementById("ph-style")) {
        const s = document.createElement("style");
        s.id = "ph-style";
        s.textContent = `.ph-letter{width:46px;height:46px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent);font-weight:700;font-family:var(--font-mono);border-radius:var(--radius-sm);text-transform:uppercase;font-size:1.3rem;}.ph-letter.req{background:var(--accent);color:#fff;}.ph-w{padding:6px 10px;border-radius:var(--radius-sm);background:var(--bg-elev);border:1px solid var(--border);}.ph-w.pangram{background:var(--success);color:#fff;font-weight:700;}`;
        document.head.appendChild(s);
      }

      function render() {
        lettersEl.innerHTML = "";
        puzzle.letters.toUpperCase().split("").forEach(ch => {
          const d = document.createElement("div");
          d.className = "ph-letter req";
          d.textContent = ch;
          lettersEl.appendChild(d);
        });
        listEl.innerHTML = "";
        Array.from(found).sort().forEach(w => {
          const d = document.createElement("div");
          d.className = "ph-w" + (puzzle.pangrams.includes(w) ? " pangram" : "");
          d.textContent = w + (puzzle.pangrams.includes(w) ? "  ★" : "");
          listEl.appendChild(d);
        });
        root.querySelector("#ph-found").textContent = found.size;
        root.querySelector("#ph-pan").textContent = Array.from(found).filter(w => puzzle.pangrams.includes(w)).length;
      }

      function submit() {
        if (over) return;
        const w = input.value.trim().toLowerCase();
        input.value = "";
        if (w.length < 4) {
          App.toast("Min 4 letters", "warning");
          return;
        }
        if (!/^[a-z]+$/.test(w)) {
          App.toast("Letters only", "warning");
          return;
        }
        const allowed = puzzle.letters.split("");
        for (const c of w) {
          if (!allowed.includes(c)) {
            App.toast("Letter not in puzzle", "warning");
            return;
          }
        }
        if (found.has(w)) {
          App.toast("Already found", "info");
          return;
        }
        const valid = puzzle.words.includes(w) || puzzle.pangrams.includes(w);
        if (!valid) {
          AudioFX.error();
          App.toast("Not in word list", "warning");
          return;
        }
        found.add(w);
        const isP = puzzle.pangrams.includes(w);
        const pts = w.length + (isP ? 15 : 0);
        const cur = parseInt(root.querySelector("#ph-score").textContent, 10) + pts;
        root.querySelector("#ph-score").textContent = cur;
        if (isP) {
          AudioFX.win();
          statusEl.textContent = `★ Pangram! +${pts}`;
          statusEl.className = "status win";
        } else {
          AudioFX.pop();
          statusEl.textContent = `+${pts} — "${w}"`;
          statusEl.className = "status info";
        }
        render();
        const allP = puzzle.pangrams.every(p => found.has(p));
        if (allP) {
          over = true;
          AudioFX.win();
          statusEl.textContent = `🎉 All pangrams found! Score: ${cur}.`;
          statusEl.className = "status win";
          const best = Storage.getBest("pangramhunt");
          if (!best || cur > best) {
            Storage.setBest("pangramhunt", cur);
            root.querySelector("#ph-best").textContent = cur;
            App.toast("New best!", "success");
          }
        }
      }

      function newGame() {
        puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
        found = new Set();
        over = false;
        root.querySelector("#ph-score").textContent = "0";
        root.querySelector("#ph-best").textContent = Storage.getBest("pangramhunt") || "—";
        statusEl.textContent = "Find words using the 7 letters.";
        statusEl.className = "status info";
        render();
        input.focus();
      }

      root.querySelector("#ph-go").addEventListener("click", submit);
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") submit();
      });
      live = {newGame};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play Pangram Hunt",
        `You're given 7 letters. Use them to form words (4+ letters, letters may repeat).
        <br><br>A <b>pangram</b> uses all 7 letters at least once — worth +15 bonus points!
        <br><br>Find all pangrams in the puzzle to win.`);
    },
  });
})();
