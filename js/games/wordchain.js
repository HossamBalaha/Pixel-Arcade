/* Word Chain — each word must start with the last letter of the previous word. vs AI. */
(function () {
  // Words grouped by first letter for the AI to look up.
  const BANK = ["apple", "egg", "grape", "elephant", "tiger", "rabbit", "train", "nail", "lemon", "nest",
    "tree", "eagle", "ear", "road", "dog", "goat", "teal", "lion", "net", "top",
    "pear", "rain", "night", "tent", "train", "train", "horse", "egg", "gel", "lamp",
    "pencil", "lock", "kite", "eel", "leaf", "fish", "hat", "tunnel", "lake", "knee",
    "ant", "turtle", "echo", "ocean", "nose", "elf", "fox", "xenon", "narwhal", "llama",
    "arm", "ball", "banana", "bee", "book", "boot", "carrot", "cat", "cloud", "cow",
    "day", "dinner", "door", "drum", "duck", "fan", "feather", "fire", "flag", "flower",
    "fog", "frog", "garden", "ghost", "gift", "glass", "gold", "green", "hammer", "hat",
    "ice", "iron", "jam", "jar", "jelly", "jewel", "king", "kite", "leaf", "lip",
    "magic", "milk", "mint", "moon", "mushroom", "name", "needle", "newt", "oat", "olive",
    "orange", "owl", "ox", "panda", "pan", "pencil", "pig", "plate", "potato", "queen",
    "question", "river", "robot", "rose", "salt", "sand", "school", "seed", "shadow", "silk",
    "silver", "snake", "snow", "sock", "spoon", "star", "stone", "sun", "table", "tea",
    "tiger", "toast", "tomato", "tool", "town", "track", "tulip", "umbrella", "van", "vase",
    "violet", "wagon", "wall", "whale", "wheat", "wheel", "wind", "wolf", "yarn", "yawn",
    "year", "yogurt", "zebra", "zoo", "zephyr", "arrow", "anchor", "almond", "angel", "ankle",
    "butter", "bottle", "button", "bridge", "bowl", "broom", "candle", "carpet", "circle", "copper",
    "candy", "cookie", "crown", "daisy", "diamond", "desk", "dust", "ember", "engine", "fable",
    "fence", "forest", "glove", "goose", "grain", "harp", "heart", "helmet", "honey", "island",
    "jacket", "jungle", "kettle", "kingdom", "ladder", "lantern", "lobster", "marble", "meadow", "mountain",
    "narrow", "needle", "ocean", "orange", "pepper", "planet", "rabbit", "ribbon", "rocket", "saddle",
    "salmon", "shadow", "silver", "sparkle", "thunder", "ticket", "tornado", "valley", "violet", "window",
    "winter", "wizard", "yodel", "yolk", "yucca", "zeppelin", "albatross", "igloo", "iguana", "otter",
    "quartz", "quail", "quilt", "quiver", "quack", "quench", "quill", "quiet", "quaint", "quest"];
  const BY_FIRST = {};
  BANK.forEach(w => {
    const k = w[0];
    (BY_FIRST[k] ||= []).push(w);
  });

  let live = null;
  GameRegistry.register({
    id: "wordchain",
    name: "Word Chain",
    icon: "🔗",
    category: "word",
    description: "Each word starts with the previous word's last letter. vs AI.",
    tags: ["word", "vocabulary", "ai"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let chain = [], used = new Set(), over = false, turn = "you";

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Chain</div><div class="val" id="wc-len">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="wc-best">—</div></div>
        </div>
        <div class="status info" id="wc-status">Type a word starting with the letter shown.</div>
        <div id="wc-chain" class="col" style="gap:4px;max-width:380px;margin:12px auto;max-height:160px;overflow-y:auto;"></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <input id="wc-input" placeholder="word…" autocomplete="off" style="width:180px;padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-elev);color:var(--text);"/>
          <button class="btn primary" id="wc-go">Play</button>
        </div>
        <p class="hint">No repeats. Next word must start with the last letter of the previous word.</p>
      `;
      const statusEl = root.querySelector("#wc-status");
      const chainEl = root.querySelector("#wc-chain");
      const input = root.querySelector("#wc-input");
      if (!document.getElementById("wc-style")) {
        const s = document.createElement("style");
        s.id = "wc-style";
        s.textContent = `.wc-w{padding:6px 10px;border-radius:var(--radius-sm);background:var(--bg-elev);border:1px solid var(--border);font-family:var(--font-mono);}.wc-w.you{border-left:3px solid var(--accent);}.wc-w.ai{border-left:3px solid var(--accent-2);}`;
        document.head.appendChild(s);
      }

      function render() {
        chainEl.innerHTML = "";
        chain.forEach(c => {
          const d = document.createElement("div");
          d.className = "wc-w " + c.who;
          d.textContent = `${c.who === "you" ? "🧑" : "🤖"} ${c.word}`;
          chainEl.appendChild(d);
        });
        chainEl.scrollTop = chainEl.scrollHeight;
        root.querySelector("#wc-len").textContent = chain.length;
      }

      function nextLetter() {
        if (chain.length === 0) return null;
        const last = chain[chain.length - 1].word;
        return last[last.length - 1];
      }

      function yourTurn() {
        turn = "you";
        statusEl.textContent = chain.length === 0 ? "Start the chain — type any word." : `Your turn — start with "${nextLetter().toUpperCase()}".`;
        statusEl.className = "status info";
        input.focus();
      }

      function submit() {
        if (over || turn !== "you") return;
        const w = input.value.trim().toLowerCase();
        input.value = "";
        if (!/^[a-z]{2,}$/.test(w)) {
          App.toast("Letters only, 2+ chars", "warning");
          return;
        }
        if (used.has(w)) {
          App.toast("Already used", "warning");
          return;
        }
        if (chain.length > 0) {
          const need = nextLetter();
          if (w[0] !== need) {
            App.toast(`Must start with "${need.toUpperCase()}"`, "warning");
            return;
          }
        }
        chain.push({word: w, who: "you"});
        used.add(w);
        AudioFX.pop();
        render();
        turn = "ai";
        statusEl.textContent = "AI is thinking…";
        setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          aiTurn();
        }, 700);
      }

      function aiTurn() {
        if (over) return;
        const need = nextLetter();
        let cand = (BY_FIRST[need] || []).filter(w => !used.has(w));
        if (cand.length === 0) {
          over = true;
          AudioFX.win();
          statusEl.textContent = `🎉 AI can't continue — you win! Chain length: ${chain.length}.`;
          statusEl.className = "status win";
          const best = Storage.getBest("wordchain");
          if (!best || chain.length > best) {
            Storage.setBest("wordchain", chain.length);
            root.querySelector("#wc-best").textContent = chain.length;
            App.toast("New best!", "success");
          }
          return;
        }
        const pick = cand[Math.floor(Math.random() * cand.length)];
        chain.push({word: pick, who: "ai"});
        used.add(pick);
        AudioFX.tick();
        render();
        yourTurn();
      }

      function newGame() {
        chain = [];
        used = new Set();
        over = false;
        turn = "you";
        root.querySelector("#wc-best").textContent = Storage.getBest("wordchain") || "—";
        render();
        yourTurn();
      }

      root.querySelector("#wc-go").addEventListener("click", submit);
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
      App.showModal("How to play Word Chain",
        `Take turns with the AI. Each new word must <b>start with the last letter</b> of the previous word.
        <br><br>No repeats. If the AI can't continue, you win!`);
    },
  });
})();
