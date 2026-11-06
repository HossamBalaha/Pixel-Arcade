/* Rhyme Time — pick which of 4 words rhymes with the given word. */
(function () {
  // Each entry: target word + 4 options (1 rhymes, 3 don't).
  const QUESTIONS = [
    {word: "cat", opts: ["hat", "dog", "cup", "pen"], a: 0},
    {word: "tree", opts: ["rock", "bee", "moon", "fish"], a: 1},
    {word: "star", opts: ["car", "book", "door", "lamp"], a: 0},
    {word: "light", opts: ["chair", "kite", "table", "grass"], a: 1},
    {word: "moon", opts: ["hand", "spoon", "foot", "star"], a: 1},
    {word: "book", opts: ["hook", "plate", "train", "glass"], a: 0},
    {word: "rain", opts: ["window", "brain", "cloud", "sun"], a: 1},
    {word: "door", opts: ["wall", "floor", "window", "key"], a: 1},
    {word: "key", opts: ["sea", "lock", "gate", "hand"], a: 0},
    {word: "house", opts: ["mouse", "car", "tree", "sky"], a: 0},
    {word: "snail", opts: ["whale", "rock", "bird", "ant"], a: 0},
    {word: "frog", opts: ["log", "water", "sky", "sand"], a: 0},
    {word: "train", opts: ["track", "plane", "brain", "boat"], a: 2},
    {word: "song", opts: ["long", "note", "play", "tune"], a: 0},
    {word: "wing", opts: ["fly", "ring", "bird", "sky"], a: 1},
    {word: "night", opts: ["knight", "dark", "moon", "sleep"], a: 0},
    {word: "queen", opts: ["king", "crown", "bean", "throne"], a: 2},
    {word: "boat", opts: ["sea", "coat", "ocean", "river"], a: 1},
    {word: "rainbow", opts: ["color", "glow", "snow", "storm"], a: 2},
    {word: "spider", opts: ["web", "bug", "cider", "creep"], a: 2},
    {word: "dog", opts: ["frog", "log", "bog", "all of these"], a: 3},
    {word: "fox", opts: ["box", "socks", "clocks", "all of these"], a: 3},
    {word: "hat", opts: ["mat", "cat", "bat", "all of these"], a: 3},
    {word: "ball", opts: ["tall", "fall", "wall", "all of these"], a: 3},
    {word: "fish", opts: ["dish", "wish", "swish", "all of these"], a: 3},
    {word: "cake", opts: ["bake", "lake", "make", "all of these"], a: 3},
    {word: "bird", opts: ["word", "heard", "stirred", "all of these"], a: 3},
    {word: "snow", opts: ["glow", "bow", "row", "all of these"], a: 3},
    {word: "pig", opts: ["wig", "big", "dig", "all of these"], a: 3},
    {word: "sun", opts: ["fun", "run", "bun", "all of these"], a: 3},
    {word: "duck", opts: ["truck", "luck", "cluck", "all of these"], a: 3},
    {word: "bee", opts: ["tree", "see", "free", "all of these"], a: 3},
    {word: "fire", opts: ["wire", "tire", "choir", "all of these"], a: 3},
    {word: "ring", opts: ["sing", "king", "swing", "all of these"], a: 3},
    {word: "boat", opts: ["coat", "goat", "note", "all of these"], a: 3},
    {word: "head", opts: ["bed", "red", "bread", "all of these"], a: 3},
    {word: "hand", opts: ["band", "sand", "land", "all of these"], a: 3},
    {word: "old", opts: ["cold", "gold", "sold", "all of these"], a: 3},
    {word: "way", opts: ["day", "play", "say", "all of these"], a: 3},
    {word: "cloud", opts: ["loud", "proud", "crowd", "all of these"], a: 3},
    {word: "bear", opts: ["care", "share", "hair", "all of these"], a: 3},
    {word: "tie", opts: ["pie", "sky", "fly", "all of these"], a: 3},
    {word: "man", opts: ["fan", "can", "pan", "all of these"], a: 3},
    {word: "mouse", opts: ["house", "spouse", "blouse", "all of these"], a: 3},
    {word: "rock", opts: ["sock", "clock", "block", "all of these"], a: 3},
    {word: "leaf", opts: ["beef", "chief", "brief", "all of these"], a: 3},
    {word: "rose", opts: ["nose", "toes", "goes", "all of these"], a: 3},
    {word: "lime", opts: ["time", "dime", "climb", "all of these"], a: 3},
    {word: "star", opts: ["car", "far", "bar", "all of these"], a: 3},
    {word: "day", opts: ["play", "say", "way", "all of these"], a: 3},
    {word: "night", opts: ["light", "sight", "fight", "all of these"], a: 3},
    {word: "green", opts: ["bean", "seen", "queen", "all of these"], a: 3},
  ];
  const PER = 10;
  let live = null;
  GameRegistry.register({
    id: "rhymetime",
    name: "Rhyme Time",
    icon: "🎵",
    category: "word",
    description: "Pick the word that rhymes with the given word",
    tags: ["word", "rhyme", "kids"],
    age: ["kids", "teens"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="rt-q">1/${PER}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="rt-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="rt-best">—</div></div>
        </div>
        <div class="status info" id="rt-status">Pick the word that rhymes.</div>
        <div id="rt-word" style="text-align:center;font-size:2rem;font-weight:700;font-family:var(--font-heading);margin:18px 0;color:var(--accent);"></div>
        <div id="rt-opts" class="row" style="gap:8px;justify-content:center;flex-wrap:wrap;"></div>
      `;
      const statusEl = root.querySelector("#rt-status");
      const wordEl = root.querySelector("#rt-word");
      const optsEl = root.querySelector("#rt-opts");

      function render() {
        if (idx >= qs.length) {
          finish();
          return;
        }
        const cur = qs[idx];
        wordEl.textContent = cur.word;
        optsEl.innerHTML = "";
        cur.opts.forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "btn";
          b.textContent = o;
          b.style.cssText = "padding:14px 18px;min-width:90px;font-weight:600;";
          b.addEventListener("click", () => answer(i, b));
          optsEl.appendChild(b);
        });
        root.querySelector("#rt-q").textContent = `${idx + 1}/${PER}`;
        root.querySelector("#rt-score").textContent = score;
      }

      function answer(i, b) {
        if (answered) return;
        answered = true;
        const cur = qs[idx];
        if (i === cur.a) {
          b.style.background = "var(--success)";
          b.style.color = "#fff";
          score += 10;
          AudioFX.pop();
          statusEl.textContent = "✓ Rhymes!";
          statusEl.className = "status win";
        } else {
          b.style.background = "var(--danger)";
          b.style.color = "#fff";
          AudioFX.error();
          Array.from(optsEl.children).forEach((bb, j) => {
            if (j === cur.a) bb.style.background = "var(--success)";
            bb.style.color = "#fff";
          });
          statusEl.textContent = `✗ Rhyme: "${cur.opts[cur.a]}".`;
          statusEl.className = "status lose";
        }
        setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          answered = false;
          idx++;
          render();
        }, 1000);
      }

      function finish() {
        AudioFX.win();
        statusEl.textContent = `🏁 Round complete! Score: ${score}/${PER * 10}.`;
        statusEl.className = "status win";
        wordEl.textContent = "🎵";
        optsEl.innerHTML = "";
        const best = Storage.getBest("rhymetime");
        if (!best || score > best) {
          Storage.setBest("rhymetime", score);
          root.querySelector("#rt-best").textContent = score;
          App.toast("New best: " + score, "success");
        }
        const r = document.createElement("button");
        r.className = "btn primary";
        r.textContent = "Play again";
        r.addEventListener("click", newRound);
        optsEl.appendChild(r);
      }

      function newRound() {
        qs = QUESTIONS.slice().sort(() => Math.random() - 0.5).slice(0, PER);
        idx = 0;
        score = 0;
        answered = false;
        root.querySelector("#rt-best").textContent = Storage.getBest("rhymetime") || "—";
        statusEl.textContent = "Pick the word that rhymes.";
        statusEl.className = "status info";
        render();
      }

      live = {};
      newRound();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play Rhyme Time",
        `You'll see a word. Pick which of the 4 options rhymes with it.
        <br><br>${PER} questions, 10 points each.`);
    },
  });
})();
