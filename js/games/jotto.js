/* Jotto — guess the secret 5-letter word; you're told how many letters match (any position). */
(function () {
  const WORDS = ["apple", "brain", "chair", "dance", "eagle", "flame", "grape", "house", "ivory", "jolly",
    "knife", "lemon", "mango", "noble", "ocean", "piano", "quilt", "robot", "stone", "table",
    "ultra", "vivid", "whale", "xerox", "yacht", "zebra", "crane", "brick", "drum", "flute",
    "ghost", "lemon", "spice", "track", "wheat", "blaze", "cliff", "dream", "frost", "globe",
    "about", "above", "abuse", "actor", "acute", "admit", "adopt", "adult", "after", "again",
    "agent", "agree", "ahead", "alarm", "album", "alert", "alien", "align", "alike", "alive",
    "allow", "alone", "along", "alpha", "alter", "among", "anger", "angle", "angry", "apart",
    "apple", "apply", "arena", "argue", "arise", "array", "arrow", "aside", "asset", "audio",
    "audit", "avoid", "award", "aware", "badly", "baker", "basic", "basis", "beach", "began",
    "begin", "begun", "being", "below", "bench", "birth", "black", "blade", "blame", "blank",
    "blast", "blend", "blind", "block", "blood", "board", "boost", "booth", "bound", "brain",
    "brand", "brass", "brave", "bread", "break", "breed", "brick", "brief", "bring", "broad",
    "brown", "brush", "build", "built", "buyer", "cabin", "cable", "candy", "carry", "catch",
    "cause", "chain", "chair", "chaos", "charm", "chart", "cheap", "check", "chest", "chief",
    "child", "china", "chose", "civic", "civil", "claim", "class", "clean", "clear", "click",
    "cliff", "climb", "clock", "close", "cloth", "cloud", "clown", "coach", "coast", "color",
    "could", "count", "court", "cover", "craft", "crash", "crazy", "cream", "crime", "cross",
    "crowd", "crown", "crude", "curve", "cycle", "daily", "dance", "dated", "dealt", "death",
    "debit", "delay", "depth", "doing", "doubt", "dozen", "draft", "drama", "drank", "dream",
    "dress", "drift", "drive", "drove", "dryer", "dying", "eager", "early", "earth", "eight",
    "elite", "empty", "enemy", "enjoy", "enter", "entry", "equal", "error", "event", "every",
    "exact", "exist", "extra", "faith", "false", "fault", "fiber", "field", "fifth", "fifty",
    "fight", "final", "first", "fixed", "flame", "flash", "fleet", "flesh", "float", "floor",
    "fluid", "focus", "force", "forge", "forty", "found", "frame", "frank", "fraud", "fresh",
    "front", "fruit", "fully", "funny", "giant", "given", "glass", "globe", "glory", "glove",
    "going", "grace", "grade", "grain", "grand", "grant", "grass", "grave", "great", "green",
    "grief", "gross", "group", "grown", "guard", "guess", "guest", "guide", "happy", "harsh",
    "heart", "heavy", "hello", "horse", "hotel", "house", "human", "ideal", "image", "imply",
    "index", "inner", "input", "issue", "ivory", "jewel", "joint", "judge", "juice", "label",
    "labor", "large", "laser", "later", "laugh", "layer", "learn", "lease", "least", "leave",
    "legal", "level", "light", "limit", "linen", "liver", "local", "logic", "loose", "lower",
    "loyal", "lucky", "lunch", "lying", "magic", "major", "maker", "march", "match", "maybe",
    "mayor", "meant", "media", "metal", "might", "minor", "minus", "mixed", "model", "money",
    "month", "moral", "motor", "mount", "mouse", "mouth", "movie", "music", "needs", "never",
    "newly", "night", "noble", "noise", "north", "noted", "novel", "nurse", "occur", "ocean",
    "offer", "often", "order", "other", "ought", "outer", "paint", "paper", "party", "patch",
    "peace", "phase", "phone", "photo", "piano", "piece", "pilot", "pitch", "place", "plain",
    "plane", "plant", "plate", "point", "pound", "power", "press", "price", "pride", "prime",
    "print", "prior", "prize", "probe", "proof", "proud", "prove", "queen", "quest", "quick",
    "quiet", "quite", "radio", "raise", "range", "rapid", "ratio", "reach", "ready", "realm",
    "refer", "right", "rival", "river", "roast", "roman", "rough", "round", "route", "royal",
    "rural", "saint", "salad", "scale", "scene", "scope", "score", "sense", "seven", "shade",
    "shall", "shape", "share", "sharp", "sheep", "sheet", "shelf", "shell", "shift", "shine",
    "shirt", "shock", "shoot", "shore", "short", "shown", "sight", "since", "sixth", "sixty",
    "sized", "skill", "sleep", "slide", "small", "smart", "smile", "smoke", "snake", "solar",
    "solid", "solve", "sound", "south", "space", "spare", "speak", "speed", "spend", "spent",
    "spite", "split", "spoke", "sport", "staff", "stage", "stake", "stand", "stark", "start",
    "state", "stays", "steam", "steel", "steep", "steer", "stick", "still", "stock", "stone",
    "stood", "store", "storm", "story", "strip", "study", "stuff", "style", "sugar", "suite",
    "super", "sweet", "swift", "swing", "sworn", "table", "taken", "taste", "teach", "teeth",
    "thank", "theft", "their", "theme", "there", "these", "thick", "thief", "thing", "think",
    "third", "those", "three", "threw", "throw", "thumb", "tight", "times", "title", "today",
    "topic", "total", "touch", "tough", "tower", "toxic", "trace", "track", "trade", "trail",
    "train", "treat", "trend", "trial", "tribe", "trick", "tried", "truck", "truly", "trust",
    "truth", "twice", "under", "union", "unity", "until", "upper", "upset", "urban", "usage",
    "usual", "valid", "value", "video", "virus", "visit", "vital", "vivid", "vocal", "voice",
    "wagon", "waste", "watch", "water", "wedge", "weigh", "weird", "whale", "whole", "whose",
    "woman", "world", "worry", "worse", "worst", "worth", "would", "wound", "write", "wrong",
    "wrote", "yield", "young", "youth", "zebra"];
  const MAX = 6;

  function jots(a, b) {
    // Count shared letters at any position (no double-count).
    const ca = {}, cb = {};
    for (const ch of a) ca[ch] = (ca[ch] || 0) + 1;
    for (const ch of b) cb[ch] = (cb[ch] || 0) + 1;
    let n = 0;
    for (const k in ca) n += Math.min(ca[k], cb[k] || 0);
    return n;
  }

  let live = null;
  GameRegistry.register({
    id: "jotto",
    name: "Jotto",
    icon: "🔤",
    category: "word",
    description: "Guess the 5-letter word; matches tell you how many letters are right",
    tags: ["word", "deduction"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let secret = "", guesses = [], over = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Tries</div><div class="val" id="jt-tries">0/${MAX}</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="jt-best">—</div></div>
        </div>
        <div class="status info" id="jt-status">Guess the secret 5-letter word. You'll be told how many letters match (any position).</div>
        <div id="jt-list" class="col" style="gap:6px;max-width:360px;margin:14px auto;"></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <input id="jt-input" maxlength="5" placeholder="5 letters" autocomplete="off" style="text-transform:uppercase;font-family:var(--font-mono);width:120px;padding:10px;text-align:center;font-size:1.2rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-elev);color:var(--text);"/>
          <button class="btn primary" id="jt-go">Guess</button>
        </div>
        <p class="hint">No duplicate letters in a guess. Score = matches at any position.</p>
      `;
      const statusEl = root.querySelector("#jt-status");
      const listEl = root.querySelector("#jt-list");
      const input = root.querySelector("#jt-input");
      if (!document.getElementById("jt-style")) {
        const s = document.createElement("style");
        s.id = "jt-style";
        s.textContent = `.jt-row{display:flex;gap:6px;justify-content:center;font-family:var(--font-mono);}.jt-tile{width:36px;height:36px;display:grid;place-items:center;border:1px solid var(--border);background:var(--bg-elev);font-weight:700;text-transform:uppercase;}.jt-row .jt-num{margin-left:10px;font-weight:700;color:var(--accent);align-self:center;}`;
        document.head.appendChild(s);
      }

      function render() {
        listEl.innerHTML = "";
        guesses.forEach(g => {
          const row = document.createElement("div");
          row.className = "jt-row";
          for (const ch of g.word) {
            const t = document.createElement("div");
            t.className = "jt-tile";
            t.textContent = ch;
            row.appendChild(t);
          }
          const n = document.createElement("div");
          n.className = "jt-num";
          n.textContent = g.jots + " match";
          row.appendChild(n);
          listEl.appendChild(row);
        });
        root.querySelector("#jt-tries").textContent = `${guesses.length}/${MAX}`;
      }

      function submit() {
        if (over) return;
        const w = input.value.trim().toLowerCase();
        if (w.length !== 5) {
          App.toast("Need exactly 5 letters", "warning");
          return;
        }
        const seen = {};
        for (const c of w) {
          if (seen[c]) {
            App.toast("No duplicate letters", "warning");
            return;
          }
          seen[c] = 1;
        }
        if (!/^[a-z]{5}$/.test(w)) {
          App.toast("Letters only", "warning");
          return;
        }
        const j = jots(w, secret);
        guesses.push({word: w, jots: j});
        input.value = "";
        if (w === secret) {
          over = true;
          AudioFX.win();
          statusEl.textContent = `🎉 You got it in ${guesses.length} tries!`;
          statusEl.className = "status win";
          const best = Storage.getBest("jotto");
          if (!best || guesses.length < best) {
            Storage.setBest("jotto", guesses.length);
            root.querySelector("#jt-best").textContent = guesses.length;
            App.toast("New best!", "success");
          }
        } else if (guesses.length >= MAX) {
          over = true;
          AudioFX.lose();
          statusEl.textContent = `Out of tries. Word was "${secret}".`;
          statusEl.className = "status lose";
        } else {
          AudioFX.flip();
          statusEl.textContent = `${j} of your letters appear in the secret.`;
        }
        render();
      }

      function newGame() {
        secret = WORDS[Math.floor(Math.random() * WORDS.length)];
        guesses = [];
        over = false;
        root.querySelector("#jt-best").textContent = Storage.getBest("jotto") || "—";
        statusEl.textContent = "Guess the secret 5-letter word.";
        statusEl.className = "status info";
        render();
        input.focus();
      }

      root.querySelector("#jt-go").addEventListener("click", submit);
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") submit();
      });
      input.addEventListener("input", () => {
        input.value = input.value.toLowerCase();
      });

      live = {
        solve: function () {
          if (over) return;
          over = true;
          statusEl.textContent = `Word was "${secret}".`;
          statusEl.className = "status lose";
          AudioFX.lose();
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
      App.showModal("How to play Jotto",
        `Guess the secret 5-letter word in ${MAX} tries.
        <br><br>After each guess, you're told how many of your letters appear in the secret word (at <i>any</i> position, no duplicates).
        <br><br>Use deduction — no duplicate letters in your guess.`);
    },
  });
})();
