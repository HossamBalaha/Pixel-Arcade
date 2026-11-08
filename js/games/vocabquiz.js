/* Vocabulary Quiz — pick the correct definition for each word. 10 questions. */
(function () {
  const QUESTIONS = [
    {
      word: "Ephemeral",
      opts: ["Lasting a very short time", "Extremely large", "Always present", "Made of stone"],
      a: 0
    },
    {word: "Benevolent", opts: ["Cruel", "Kind and generous", "Lazy", "Loud"], a: 1},
    {word: "Cacophony", opts: ["A sweet smell", "A harsh noise", "A clear stream", "A small meal"], a: 1},
    {word: "Ubiquitous", opts: ["Rare", "Found everywhere", "Hidden", "Beautiful"], a: 1},
    {word: "Lethargic", opts: ["Sluggish", "Energetic", "Angry", "Joyful"], a: 0},
    {word: "Meticulous", opts: ["Careless", "Very careful", "Hasty", "Loud"], a: 1},
    {word: "Novice", opts: ["Expert", "Beginner", "Veteran", "Master"], a: 1},
    {word: "Pristine", opts: ["Dirty", "Untouched/new", "Broken", "Used"], a: 1},
    {word: "Resilient", opts: ["Fragile", "Able to recover", "Slow", "Frozen"], a: 1},
    {word: "Tenacious", opts: ["Holding firmly", "Giving up easily", "Quiet", "Soft"], a: 0},
    {word: "Voracious", opts: ["Tiny", "Greedy/hungry", "Tired", "Pale"], a: 1},
    {word: "Wary", opts: ["Careless", "Cautious", "Excited", "Asleep"], a: 1},
    {word: "Zealous", opts: ["Indifferent", "Fervent", "Tired", "Bored"], a: 1},
    {word: "Brevity", opts: ["Length", "Shortness", "Width", "Depth"], a: 1},
    {word: "Candid", opts: ["Honest", "Hidden", "Sneaky", "Polite only"], a: 0},
    {word: "Diligent", opts: ["Hard-working", "Lazy", "Mean", "Quiet"], a: 0},
    {word: "Frugal", opts: ["Wasteful", "Thrifty", "Loud", "Quick"], a: 1},
    {word: "Gregarious", opts: ["Shy", "Sociable", "Angry", "Distant"], a: 1},
    {word: "Haughty", opts: ["Humble", "Arrogant", "Kind", "Quiet"], a: 1},
    {word: "Imminent", opts: ["Far off", "About to happen", "Past", "Imagined"], a: 1},
    {word: "Jovial", opts: ["Sad", "Merry", "Tired", "Stern"], a: 1},
    {word: "Lucid", opts: ["Confused", "Clear", "Heavy", "Dim"], a: 1},
    {word: "Mundane", opts: ["Exciting", "Ordinary", "Magical", "Sacred"], a: 1},
    {word: "Nostalgia", opts: ["Fear of the future", "Longing for the past", "Hatred", "Joy"], a: 1},
    {word: "Ostentatious", opts: ["Modest", "Showy", "Quiet", "Cheap"], a: 1},
    {word: "Placid", opts: ["Calm", "Stormy", "Loud", "Quick"], a: 0},
    {word: "Quaint", opts: ["Modern", "Charmingly old-fashioned", "Ugly", "Huge"], a: 1},
    {word: "Reckless", opts: ["Careful", "Careless", "Slow", "Stuck"], a: 1},
    {word: "Serene", opts: ["Angry", "Peaceful", "Loud", "Furious"], a: 1},
    {word: "Taciturn", opts: ["Talkative", "Reserved", "Loud", "Cheerful"], a: 1},
    {word: "Verbose", opts: ["Concise", "Wordy", "Silent", "Brief"], a: 1},
    {word: "Whimsical", opts: ["Serious", "Playful", "Strict", "Boring"], a: 1},
    {word: "Astute", opts: ["Slow-witted", "Sharp", "Foolish", "Tired"], a: 1},
    {word: "Brusque", opts: ["Polite", "Blunt", "Welcoming", "Long-winded"], a: 1},
    {word: "Cogent", opts: ["Weak", "Convincing", "Confusing", "Vague"], a: 1},
    {word: "Deleterious", opts: ["Helpful", "Harmful", "Neutral", "Sweet"], a: 1},
    {word: "Eloquent", opts: ["Inarticulate", "Fluent", "Silent", "Rude"], a: 1},
    {word: "Fastidious", opts: ["Sloppy", "Fussy", "Slow", "Lazy"], a: 1},
    {word: "Garrulous", opts: ["Silent", "Talkative", "Sad", "Tired"], a: 1},
    {word: "Hinder", opts: ["Help", "Obstruct", "Speed", "Praise"], a: 1},
    {word: "Inadvertent", opts: ["Intentional", "Unintentional", "Planned", "Careful"], a: 1},
    {word: "Juxtapose", opts: ["Hide", "Place side by side", "Combine", "Remove"], a: 1},
    {word: "Kindle", opts: ["Extinguish", "Ignite", "Cool", "Hide"], a: 1},
    {word: "Lament", opts: ["Rejoice", "Mourn", "Ignore", "Praise"], a: 1},
    {word: "Mellifluous", opts: ["Harsh", "Sweet-sounding", "Loud", "Silent"], a: 1},
    {word: "Nonchalant", opts: ["Anxious", "Casual", "Eager", "Furious"], a: 1},
    {word: "Obfuscate", opts: ["Clarify", "Confuse", "Explain", "Simplify"], a: 1},
    {word: "Pensive", opts: ["Cheerful", "Thoughtful", "Carefree", "Hyper"], a: 1},
    {word: "Quintessential", opts: ["Rare", "Most typical", "Old", "Modern"], a: 1},
    {word: "Rancor", opts: ["Affection", "Bitterness", "Joy", "Indifference"], a: 1},
    {word: "Sagacious", opts: ["Foolish", "Wise", "Slow", "Tired"], a: 1},
    {word: "Trepidation", opts: ["Calm", "Fear", "Joy", "Curiosity"], a: 1},
    {word: "Ubiquity", opts: ["Rarity", "Omnipresence", "Silence", "Speed"], a: 1},
    {word: "Vex", opts: ["Soothe", "Irritate", "Praise", "Ignore"], a: 1},
    {word: "Wretched", opts: ["Happy", "Miserable", "Healthy", "Strong"], a: 1},
    {word: "Yearn", opts: ["Reject", "Long for", "Forget", "Dislike"], a: 1},
    {word: "Zeal", opts: ["Apathy", "Enthusiasm", "Anger", "Calm"], a: 1},
  ];
  const PER = 10;
  let live = null;
  GameRegistry.register({
    id: "vocabquiz",
    name: "Vocabulary Quiz",
    icon: "📚",
    category: "word",
    description: "Pick the right definition for each word",
    tags: ["word", "vocabulary", "quiz"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="vq-q">1/${PER}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="vq-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="vq-best">—</div></div>
        </div>
        <div class="status info" id="vq-status">Pick the definition that matches the word.</div>
        <div id="vq-word" style="text-align:center;font-size:1.6rem;font-weight:700;font-family:var(--font-heading);margin:18px 0;"></div>
        <div id="vq-opts" class="col" style="gap:8px;max-width:420px;margin:0 auto;"></div>
      `;
      const statusEl = root.querySelector("#vq-status");
      const wordEl = root.querySelector("#vq-word");
      const optsEl = root.querySelector("#vq-opts");

      function render() {
        if (idx >= qs.length) {
          finish();
          return;
        }
        const cur = qs[idx];
        wordEl.textContent = cur.word.trim();
        optsEl.innerHTML = "";
        cur.opts.forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "btn";
          b.textContent = o;
          b.style.cssText = "padding:12px;text-align:left;";
          b.addEventListener("click", () => answer(i, b));
          optsEl.appendChild(b);
        });
        root.querySelector("#vq-q").textContent = `${idx + 1}/${PER}`;
        root.querySelector("#vq-score").textContent = score;
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
        wordEl.textContent = "🎉";
        optsEl.innerHTML = "";
        const best = Storage.getBest("vocabquiz");
        if (!best || score > best) {
          Storage.setBest("vocabquiz", score);
          root.querySelector("#vq-best").textContent = score;
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
        root.querySelector("#vq-best").textContent = Storage.getBest("vocabquiz") || "—";
        statusEl.textContent = "Pick the definition that matches the word.";
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
      App.showModal("How to play Vocabulary Quiz",
        `You'll see a word and four definitions. Pick the one that matches.
        <br><br>${PER} questions per round. 10 points each. Your best score is saved.`);
    },
  });
})();
