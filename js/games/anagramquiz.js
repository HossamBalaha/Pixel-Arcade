/* Anagram Quiz — given a scrambled word, pick the correct unscrambled word from 4 choices. */
(function () {
  const QUESTIONS = [
    {scrambled: "tca", opts: ["cat", "act", "bat", "rat"], a: 0},
    {scrambled: "rteify", opts: ["pretty", "refity", "finder", "ratify"], a: 0},
    {scrambled: "iwndo", opts: ["rownd", "window", "widow", "wind"], a: 1},
    {scrambled: "oleanp", opts: ["people", "paleon", "pencil", "lemon"], a: 0},
    {scrambled: "hhiacrs", opts: ["chair", "crash", "charms", "arches"], a: 3},
    {scrambled: "iebcrd", opts: ["binder", "bicker", "birdie", "border"], a: 2},
    {scrambled: "lgsopue", opts: ["plugers", "gospel", "pulsing", "spiegel"], a: 1},
    {scrambled: "rotcepm", opts: ["compact", "comport", "compute", "comet"], a: 2},
    {scrambled: "ahrrb", opts: ["barber", "bra", "brain", "bread"], a: 0},
    {scrambled: "enodf", opts: ["fined", "fondle", "finer", "fender"], a: 0},
    {scrambled: "aeilptc", opts: ["pelican", "caplet", "palette", "pelatic"], a: 1},
    {scrambled: "iellon", opts: ["lionel", "online", "nipple", "nellie"], a: 1},
    {scrambled: "ertsa", opts: ["tears", "stare", "aster", "trees"], a: 0},
    {scrambled: "ostip", opts: ["posit", "spite", "spout", "posts"], a: 0},
    {scrambled: "kcebh", opts: ["check", "peach", "beach", "cheek"], a: 1},
    {scrambled: "omuse", opts: ["mouse", "sound", "muse", "mousse"], a: 0},
    {scrambled: "elvap", opts: ["panel", "pelva", "veal", "pale"], a: 1},
    {scrambled: "atolb", opts: ["bloat", "boat", "tabla", "ballot"], a: 0},
    {scrambled: "ahrry", opts: ["harry", "hairy", "array", "hardy"], a: 2},
    {scrambled: "ilftre", opts: ["lifter", "filter", "relift", "filet"], a: 1},
    {scrambled: "eghnit", opts: ["night", "thing", "eating", "reign"], a: 0},
    {scrambled: "oceanr", opts: ["canore", "cornea", "acorn", "corner"], a: 1},
    {scrambled: "ltsie", opts: ["istle", "list", "islet", "silte"], a: 2},
    {scrambled: "artne", opts: ["antre", "inner", "nater", "learner"], a: 0},
    {scrambled: "lowfy", opts: ["flowy", "yellow", "wolfs", "flow"], a: 0},
    {scrambled: "aegpr", opts: ["gaper", "grape", "pager", "parge"], a: 1},
    {scrambled: "dloow", opts: ["dowel", "would", "dowle", "woold"], a: 1},
    {scrambled: "eimrnta", opts: ["martin", "inmate", "remaint", "trine"], a: 0},
    {scrambled: "kboris", opts: ["brioks", "brisk", "brisket", "briok"], a: 1},
    {scrambled: "esmrta", opts: ["master", "stream", "tamers", "smart"], a: 0},
    {scrambled: "cehiln", opts: ["chinle", "lichen", "lancer", "inlect"], a: 1},
    {scrambled: "aelpp", opts: ["apple", "appel", "pepla", "palpe"], a: 0},
    {scrambled: "aehst", opts: ["haest", "haste", "cheese", "wheat"], a: 1},
    {scrambled: "eilrs", opts: ["riles", "liers", "slier", "relies"], a: 2},
    {scrambled: "lmruy", opts: ["murly", "mural", "yulm", "mulry"], a: 1},
    {scrambled: "ooppst", opts: ["postop", "pots", "spoot", "topso"], a: 1},
    {scrambled: "adnr", opts: ["rand", "darn", "nard", "and"], a: 1},
    {scrambled: "cikr", opts: ["rick", "kick", "cork", "crack"], a: 0},
    {scrambled: "lowf", opts: ["wolf", "fowl", "flow", "all of these"], a: 3},
    {scrambled: "eegrt", opts: ["regte", "egret", "grete", "terge"], a: 1},
    {scrambled: "aemr", opts: ["mare", "ream", "earm", "amer"], a: 0},
    {scrambled: "loht", opts: ["loth", "holt", "hole", "hotel"], a: 0},
    {scrambled: "acemr", opts: ["racer", "cream", "merc", "scram"], a: 1},
    {scrambled: "ilnos", opts: ["loins", "linos", "noils", "silon"], a: 0},
    {scrambled: "opst", opts: ["post", "spot", "stop", "tops", "all of these"], a: 4},
    {scrambled: "eeprs", opts: ["spree", "peres", "perse", "reeps"], a: 0},
    {scrambled: "eintw", opts: ["twine", "winte", "twine", "wient"], a: 0},
    {scrambled: "adery", opts: ["ready", "rayed", "deray", "yader"], a: 0},
    {scrambled: "eefrr", opts: ["refer", "feree", "reefe", "feree"], a: 0},
    {scrambled: "ahrs", opts: ["rash", "shar", "arsh", "shah"], a: 0},
    {scrambled: "ioprs", opts: ["spiro", "prior", "prison", "spoir"], a: 1},
    {scrambled: "llloy", opts: ["lolol", "loyally", "lolly", "yolll"], a: 2},
    {scrambled: "deip", opts: ["pied", "pide", "dipe", "epid"], a: 0},
    {scrambled: "eklo", opts: ["koel", "kole", "loke", "look"], a: 3},
  ];
  const PER = 10;
  let live = null;
  GameRegistry.register({
    id: "anagramquiz",
    name: "Anagram Quiz",
    icon: "🔀",
    category: "word",
    description: "Unscramble the word from 4 choices",
    tags: ["word", "anagram", "quiz"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="aq-q">1/${PER}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="aq-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="aq-best">—</div></div>
        </div>
        <div class="status info" id="aq-status">What word does this scramble to?</div>
        <div id="aq-scrambled" style="text-align:center;font-size:2rem;font-weight:700;font-family:var(--font-mono);letter-spacing:0.2em;text-transform:uppercase;margin:18px 0;color:var(--accent);"></div>
        <div id="aq-opts" class="col" style="gap:8px;max-width:380px;margin:0 auto;"></div>
      `;
      const statusEl = root.querySelector("#aq-status");
      const scrEl = root.querySelector("#aq-scrambled");
      const optsEl = root.querySelector("#aq-opts");

      function render() {
        if (idx >= qs.length) {
          finish();
          return;
        }
        const cur = qs[idx];
        scrEl.textContent = cur.scrambled;
        optsEl.innerHTML = "";
        cur.opts.forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "btn";
          b.textContent = o;
          b.style.cssText = "padding:12px;text-align:left;font-family:var(--font-mono);";
          b.addEventListener("click", () => answer(i, b));
          optsEl.appendChild(b);
        });
        root.querySelector("#aq-q").textContent = `${idx + 1}/${PER}`;
        root.querySelector("#aq-score").textContent = score;
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
          statusEl.textContent = "✓ Correct!";
          statusEl.className = "status win";
        } else {
          b.style.background = "var(--danger)";
          b.style.color = "#fff";
          AudioFX.error();
          Array.from(optsEl.children).forEach((bb, j) => {
            if (j === cur.a) bb.style.background = "var(--success)";
            bb.style.color = "#fff";
          });
          statusEl.textContent = `✗ Answer: "${cur.opts[cur.a]}".`;
          statusEl.className = "status lose";
        }
        setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          answered = false;
          idx++;
          render();
        }, 1100);
      }

      function finish() {
        AudioFX.win();
        statusEl.textContent = `🏁 Round complete! Score: ${score}/${PER * 10}.`;
        statusEl.className = "status win";
        scrEl.textContent = "🎉";
        optsEl.innerHTML = "";
        const best = Storage.getBest("anagramquiz");
        if (!best || score > best) {
          Storage.setBest("anagramquiz", score);
          root.querySelector("#aq-best").textContent = score;
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
        root.querySelector("#aq-best").textContent = Storage.getBest("anagramquiz") || "—";
        statusEl.textContent = "What word does this scramble to?";
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
      App.showModal("How to play Anagram Quiz",
        `You'll see a scrambled word. Pick the correct unscrambled word from the 4 options.
        <br><br>${PER} questions, 10 points each.`);
    },
  });
})();
