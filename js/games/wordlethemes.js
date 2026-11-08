/* wordlethemes — Wordle Themes: classic Wordle with 24 pickable answer themes.
   Consolidates the 24 themed Wordle clones (pools preserved from those games). */
(function () {
  "use strict";
  const THEMES = {
    "Ancient": ["AKSUM", "PETRA", "MUMMY", "EGYPT", "ROMAN", "GREEK", "ARENA", "RUINS", "SPEAR", "ARMOR", "OLIVE", "LOTUS", "OASIS", "ATLAS", "AUGUR", "RUNES", "TUNIC", "TOGAS", "FORUM", "CROWN"],
    "Animals": ["TIGER", "ZEBRA", "PANDA", "EAGLE", "HORSE", "SHARK", "KOALA", "LEMUR", "OTTER", "BISON", "CAMEL", "GECKO", "HIPPO", "RHINO", "SLOTH", "SNAKE", "WHALE", "HYENA", "MOOSE", "OKAPI"],
    "Birds": ["EGRET", "CRANE", "STORK", "RAVEN", "QUAIL", "EAGLE", "GOOSE", "FINCH", "MACAW", "SWIFT", "SNIPE", "BOOBY", "MYNAH", "PIPIT", "STINT", "GALAH", "PRION", "CHICK", "DIVER", "OUZEL"],
    "Body": ["HEART", "BRAIN", "LIVER", "SPINE", "ANKLE", "WRIST", "ELBOW", "TORSO", "ORGAN", "BLOOD", "VEINS", "NERVE", "JOINT", "SKULL", "THIGH", "TEETH", "MOUTH", "THUMB", "CHEEK", "NAILS"],
    "Cities": ["PARIS", "TOKYO", "CAIRO", "SEOUL", "DUBAI", "PERTH", "MILAN", "MIAMI", "OSAKA", "KYOTO", "SPLIT", "TULSA", "GENOA", "TURIN", "DELHI", "LHASA", "WUHAN", "LAGOS", "ACCRA", "TUNIS"],
    "Clothing": ["SHIRT", "PANTS", "SKIRT", "DRESS", "SCARF", "GLOVE", "BOOTS", "CLOAK", "TUNIC", "BERET", "JEANS", "PARKA", "SHAWL", "SMOCK", "FROCK", "ROBES", "BELTS", "DERBY", "MITTS", "HEELS"],
    "Colors": ["AMBER", "AZURE", "IVORY", "CORAL", "KHAKI", "OLIVE", "BEIGE", "MAUVE", "SEPIA", "GREEN", "WHITE", "BLACK", "BROWN", "PEACH", "LEMON", "LILAC", "OCHRE", "CREAM", "SLATE", "PEARL"],
    "Countries": ["SPAIN", "ITALY", "JAPAN", "CHINA", "INDIA", "EGYPT", "KENYA", "CHILE", "NEPAL", "MALTA", "QATAR", "TONGA", "SUDAN", "CONGO", "GABON", "LIBYA", "GHANA", "BENIN", "SYRIA", "YEMEN"],
    "Elements": ["EARTH", "WATER", "METAL", "STONE", "FROST", "SMOKE", "LIGHT", "STORM", "EMBER", "MAGMA", "CLOUD", "FLAME", "BLAZE", "STEAM", "RIVER", "OCEAN", "BEACH", "CLIFF", "RIDGE", "SLOPE"],
    "Emotions": ["HAPPY", "ANGRY", "PRIDE", "SHAME", "GRIEF", "BLISS", "GLOOM", "SCORN", "PANIC", "TRUST", "MIRTH", "CHEER", "ANGST", "GUILT", "SHOCK", "DREAD", "WORRY", "WRATH", "PEACE", "PROUD"],
    "Food": ["BREAD", "PASTA", "SUSHI", "CURRY", "PIZZA", "BAGEL", "SALAD", "STEAK", "TACOS", "WHEAT", "HONEY", "MANGO", "LEMON", "BASIL", "THYME", "CUMIN", "APPLE", "OLIVE", "FUDGE", "DATES"],
    "Jobs": ["BAKER", "NURSE", "PILOT", "ACTOR", "JUDGE", "TUTOR", "CLERK", "MODEL", "DIVER", "COACH", "GUARD", "NANNY", "SMITH", "MASON", "CABBY", "MEDIC", "CHIEF", "MAYOR", "SCOUT", "GUIDE"],
    "Magic": ["SPELL", "CHARM", "CURSE", "MAGIC", "WITCH", "RUNES", "STAFF", "CLOAK", "FAIRY", "PIXIE", "ELVES", "TROLL", "OGRES", "DEMON", "NYMPH", "SHADE", "TOTEM", "SIGIL", "RITES", "COVEN"],
    "Movies": ["ALIEN", "ROCKY", "GHOST", "SPEED", "TWINS", "GIANT", "SHANE", "MOANA", "BALTO", "BAMBI", "DUMBO", "BRAVE", "MULAN", "SHREK", "VENOM", "LOGAN", "WONKA", "TAKEN", "MUMMY", "HITCH"],
    "Music": ["SONGS", "TRACK", "TEMPO", "CHORD", "LYRIC", "VOCAL", "PIANO", "VIOLA", "CELLO", "FLUTE", "DRUMS", "HARPS", "ORGAN", "BEATS", "NOTES", "SCALE", "OPERA", "CHOIR", "DUETS", "REMIX"],
    "Mythology": ["HYDRA", "SIREN", "SATYR", "NYMPH", "TROLL", "OGRES", "ELVES", "FAIRY", "PIXIE", "HARPY", "ANGEL", "DEMON", "TITAN", "HADES", "KARMA", "TOTEM", "RUNES", "QUEST", "MAGIC", "CURSE"],
    "Nature": ["RIVER", "OCEAN", "BEACH", "CLIFF", "RIDGE", "SLOPE", "CREST", "PLAIN", "SWAMP", "MARSH", "BROOK", "CREEK", "HILLS", "GRASS", "BLOOM", "FLORA", "FAUNA", "TRAIL", "CEDAR", "MAPLE"],
    "Oceans": ["WHALE", "SHARK", "CORAL", "SHELL", "WAVES", "TIDES", "BRINE", "SWELL", "ALGAE", "SQUID", "OCEAN", "CRABS", "MANTA", "ORCAS", "SEALS", "OTTER", "PEARL", "WRECK", "DRIFT", "PRAWN"],
    "Space": ["VENUS", "EARTH", "PLUTO", "COMET", "ORBIT", "LUNAR", "SOLAR", "STARS", "ROVER", "PROBE", "ALIEN", "SPACE", "TITAN", "MOONS", "QUARK", "NOVAS", "NADIR", "ATOMS", "GAMMA", "ORION"],
    "Sports": ["CHESS", "RUGBY", "DARTS", "RACES", "RELAY", "EVENT", "MEDAL", "COACH", "TEAMS", "GOALS", "SCORE", "MATCH", "GAMES", "SPORT", "RACER", "RIDER", "SKIER", "DIVER", "ROWER", "PITCH"],
    "Tech": ["LINUX", "ROBOT", "CACHE", "PIXEL", "CHIPS", "BYTES", "MOUSE", "CABLE", "MODEM", "EMAIL", "CLOUD", "ARRAY", "DEBUG", "CLASS", "QUEUE", "STACK", "REGEX", "CODES", "LINKS", "LOGIN"],
    "Tools": ["DRILL", "LATHE", "BRUSH", "BROOM", "RAKES", "SPADE", "PICKS", "WEDGE", "LEVEL", "PLUMB", "TORCH", "CLAMP", "VISES", "ANVIL", "FORGE", "SCREW", "NAILS", "BOLTS", "RIVET", "GAUGE"],
    "Trees": ["MAPLE", "BIRCH", "CEDAR", "ASPEN", "ELDER", "HAZEL", "BEECH", "OLIVE", "MANGO", "LEMON", "PEACH", "APPLE", "ALDER", "LARCH", "ROWAN", "HOLLY", "PALMS", "EBONY", "PECAN", "BRIAR"],
    "Weather": ["STORM", "CLOUD", "SUNNY", "RAINY", "WINDY", "FOGGY", "MISTY", "SLEET", "FROST", "GALES", "GUSTS", "WINDS", "HUMID", "MUGGY", "VAPOR", "CHILL", "SNOWY", "FLOOD", "RAINS", "SNOWS"]
  };
  const THEME_LIST = Object.keys(THEMES);
  const KEYS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  const MAX = 6, LEN = 5;

  GameRegistry.register({
    id: "wordlethemes", name: "Wordle Themes", icon: "🎨", category: "word",
    description: "Wordle with a twist — pick from 24 themed answer pools", tags: ["word", "wordle", "themed"],
    age: ["kids", "teens", "adults"], difficulty: "medium", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      let theme = THEME_LIST[Math.floor(Math.random() * THEME_LIST.length)];
      let answer = "", cur = "", done = false, won = false, row = 0, guesses = [];
      let keyState = {}; // letter -> "correct"|"present"|"absent"

      function pickAnswer() {
        answer = THEMES[theme][Math.floor(Math.random() * THEMES[theme].length)];
      }

      function validGuess(w) {
        if (THEMES[theme].indexOf(w) >= 0) return true;
        if (typeof window !== "undefined" && window.WORDS_5) {
          for (const x of window.WORDS_5) if (x === w || x.toUpperCase() === w) return true;
        }
        return false;
      }

      function score(guess) {
        const res = Array(LEN).fill("absent");
        const rem = {};
        for (let i = 0; i < LEN; i++) {
          if (guess[i] === answer[i]) res[i] = "correct";
          else rem[answer[i]] = (rem[answer[i]] || 0) + 1;
        }
        for (let i = 0; i < LEN; i++) {
          if (res[i] === "correct") continue;
          const c = guess[i];
          if (rem[c] > 0) {
            res[i] = "present";
            rem[c]--;
          }
        }
        return res;
      }

      function submit() {
        if (done || cur.length !== LEN) return;
        const w = cur;
        if (!/^[A-Z]+$/.test(w) || !validGuess(w)) {
          App.toast("Not in word list", "warning");
          return;
        }
        const res = score(w);
        guesses.push({w, res});
        for (let i = 0; i < LEN; i++) {
          const c = w[i];
          if (res[i] === "correct") keyState[c] = "correct";
          else if (res[i] === "present" && keyState[c] !== "correct") keyState[c] = "present";
          else if (!keyState[c]) keyState[c] = "absent";
        }
        row++;
        cur = "";
        if (w === answer) {
          done = true;
          won = true;
          AudioFX.win();
          App.recordResult(true, row);
          statusEl.textContent = "🎉 Got it in " + row + "!";
          statusEl.className = "status win";
        } else if (row >= MAX) {
          done = true;
          AudioFX.lose();
          App.recordResult(false, row);
          statusEl.textContent = "The word was " + answer + ".";
          statusEl.className = "status lose";
        } else {
          AudioFX.pop();
        }
        render();
      }

      function press(k) {
        if (done) return;
        if (k === "ENTER") {
          submit();
          return;
        }
        if (k === "BACK") {
          cur = cur.slice(0, -1);
          render();
          return;
        }
        if (/^[A-Z]$/.test(k) && cur.length < LEN) {
          cur += k;
          AudioFX.click();
          render();
        }
      }

      function render() {
        const grid = root.querySelector("#wt-grid");
        if (!grid) return;
        let html = "";
        for (let r = 0; r < MAX; r++) {
          const g = guesses[r];
          for (let c = 0; c < LEN; c++) {
            const ch = g ? g.w[c] : (r === row ? (cur[c] || "") : "");
            const cls = g ? " wt-tile wt-" + g.res[c] : " wt-tile";
            html += '<div class="' + cls + '">' + ch + '</div>';
          }
        }
        grid.innerHTML = html;
        root.querySelectorAll("#wt-kb button[data-k]").forEach(b => {
          const st = keyState[b.dataset.k];
          b.className = "wt-key" + (st ? " wt-" + st : "");
        });
      }

      root.innerHTML = `
        <style>
          .wt-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; }
          .wt-grid { display: grid; grid-template-columns: repeat(${LEN}, 52px); gap: 5px; }
          .wt-tile { width: 52px; height: 52px; display: grid; place-items: center; font-weight: 800;
            font-size: 1.5rem; text-transform: uppercase; border: 2px solid var(--border);
            border-radius: 8px; background: var(--bg-elev); }
          .wt-correct { background: #2e7d32; border-color: #2e7d32; color: #fff; }
          .wt-present { background: #b8860b; border-color: #b8860b; color: #fff; }
          .wt-absent { background: #444; border-color: #444; color: #fff; }
          .wt-kb { display: flex; flex-direction: column; align-items: center; gap: 5px; }
          .wt-krow { display: flex; gap: 5px; }
          .wt-key { min-width: 32px; height: 44px; padding: 0 6px; border-radius: 8px; border: none;
            background: var(--bg-elev); color: var(--text); font-weight: 700; cursor: pointer;
            font-size: .9rem; border: 1px solid var(--border); }
          .wt-key.wt-correct { background: #2e7d32; color: #fff; }
          .wt-key.wt-present { background: #b8860b; color: #fff; }
          .wt-key.wt-absent { background: #222; color: #888; }
          .wt-key.wide { min-width: 64px; }
        </style>
        <div class="wt-wrap">
          <div class="row" style="gap:8px; align-items:center;">
            <label for="wt-theme" style="font-size:.85rem; opacity:.85;">Theme:</label>
            <select id="wt-theme" style="background:var(--bg-elev); color:var(--text); border:1px solid var(--border); border-radius:8px; padding:4px 8px;"></select>
            <button class="btn" id="wt-new">New word</button>
          </div>
          <div class="status info" id="wt-status">Guess the 5-letter ${theme} word in 6 tries</div>
          <div class="wt-grid" id="wt-grid"></div>
          <div class="wt-kb" id="wt-kb"></div>
        </div>`;

      const statusEl = root.querySelector("#wt-status");
      const sel = root.querySelector("#wt-theme");
      THEME_LIST.forEach(t => {
        const o = document.createElement("option");
        o.value = t;
        o.textContent = t;
        if (t === theme) o.selected = true;
        sel.appendChild(o);
      });

      function newGame() {
        guesses = [];
        row = 0;
        cur = "";
        done = false;
        won = false;
        keyState = {};
        pickAnswer();
        statusEl.textContent = "Guess the 5-letter " + theme + " word in 6 tries";
        statusEl.className = "status info";
        render();
      }

      sel.addEventListener("change", () => {
        theme = sel.value;
        newGame();
      });
      root.querySelector("#wt-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });

      const kb = root.querySelector("#wt-kb");
      KEYS.forEach((r, i) => {
        const rowEl = document.createElement("div");
        rowEl.className = "wt-krow";
        if (i === 2) {
          const enter = document.createElement("button");
          enter.className = "wt-key wide";
          enter.dataset.k = "ENTER";
          enter.textContent = "Enter";
          rowEl.appendChild(enter);
        }
        for (const ch of r) {
          const b = document.createElement("button");
          b.className = "wt-key";
          b.dataset.k = ch.toUpperCase();
          b.textContent = ch.toUpperCase();
          rowEl.appendChild(b);
        }
        if (i === 2) {
          const back = document.createElement("button");
          back.className = "wt-key wide";
          back.dataset.k = "BACK";
          back.textContent = "⌫";
          rowEl.appendChild(back);
        }
        kb.appendChild(rowEl);
      });
      kb.addEventListener("click", e => {
        const b = e.target.closest("button[data-k]");
        if (b) press(b.dataset.k);
      });

      function onKey(e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.key === "Enter") press("ENTER");
        else if (e.key === "Backspace") press("BACK");
        else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase());
      }

      document.addEventListener("keydown", onKey);

      newGame();
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Wordle Themes",
        "Guess the hidden 5-letter word in 6 tries. " +
        "Pick a <b>theme</b> from the dropdown — the answer always comes from that theme's word pool. " +
        "🟩 green = right letter, right spot · 🟨 yellow = right letter, wrong spot. " +
        "Switch themes any time for a fresh word.");
    },
    hint: function () {
      App.toast("Try a common starter word like SLATE or CRANE", "info");
    },
    solve: function () {
      App.toast("The answer stays secret — take one more guess!", "info");
    },
  });
})();
