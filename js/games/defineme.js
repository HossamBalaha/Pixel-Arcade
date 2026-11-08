/* Define Me — guess the word from its dictionary definition */
(function () {
  GameRegistry.register({
    id: "defineme",
    name: "Define Me",
    icon: "📖",
    category: "word",
    description: "Guess the word from its dictionary definition",
    tags: ["word", "vocabulary", "definitions"],
    mount: function (root, {App, AudioFX, Storage}) {

      // tracked timers — all cleared on cleanup so no stale callback runs after close
      let __t = [];
      const after = (fn, ms) => {
        const h = setTimeout(() => {
          __t = __t.filter(x => x !== h);
          fn();
        }, ms);
        __t.push(h);
        return h;
      };
      const DEFS = [
        {w: "OCEAN", d: "A vast body of salt water covering most of the Earth"},
        {w: "LANTERN", d: "A portable case that protects a light source"},
        {w: "WHISPER", d: "To speak very softly using breath rather than voice"},
        {w: "PUZZLE", d: "A game or problem that tests ingenuity"},
        {w: "COMPASS", d: "An instrument with a magnetized needle pointing north"},
        {w: "HORIZON", d: "The line where the sky seems to meet the land"},
        {w: "SHADOW", d: "A dark shape cast by a body blocking light"},
        {w: "MELODY", d: "A sequence of notes perceived as a single entity"},
        {w: "JOURNEY", d: "The act of traveling from one place to another"},
        {w: "CANDLE", d: "A cylinder of wax with a wick, burned for light"},
        {w: "MIRROR", d: "A polished surface that reflects images"},
        {w: "AUTUMN", d: "The season between summer and winter"},
        {w: "BRANCH", d: "A part of a tree growing out from the trunk"},
        {w: "GLACIER", d: "A slowly moving mass of ice formed from compacted snow"},
        {w: "THUNDER", d: "The loud sound that follows lightning"},
        {w: "LIBRARY", d: "A building containing books for reading and borrowing"},
        {w: "SKELETON", d: "The internal frame of bones supporting a body"},
        {w: "VOYAGE", d: "A long journey by sea or in space"},
        {w: "PRISM", d: "A transparent solid that splits white light into colors"},
        {w: "ECHO", d: "A sound reflected back to its source"},
        {w: "MUSTACHE", d: "Hair grown on a man's upper lip"},
        {w: "TORNADO", d: "A violently rotating column of air touching the ground"},
        {w: "QUIVER", d: "A case for holding arrows"},
        {w: "FOUNTAIN", d: "A structure sending jets of water into the air"},
        {w: "MARMALADE", d: "A preserve made from citrus fruit and sugar"},
        {w: "CHIMNEY", d: "A vertical channel carrying smoke away"},
        {w: "BEACON", d: "A fire or light set up as a warning or guide"},
        {w: "GRAVITY", d: "The force that pulls objects toward each other"},
        {w: "PALETTE", d: "A board on which a painter mixes colors"},
        {w: "VELVET", d: "A soft fabric with a dense piled surface"},
      ];
      let round, score, best, streak, item, opts;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="df-score">0</div></div>
          <div class="score-cell"><div class="label">Streak</div><div class="val" id="df-streak">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="df-best">0</div></div>
        </div>
        <div class="status info" id="df-status">Which word matches this definition?</div>
        <div class="center" id="df-def" style="font-size:18px;font-style:italic;max-width:440px;margin:12px auto;padding:14px;border-radius:10px;background:var(--bg-soft,#334155);"></div>
        <div class="center" id="df-opts"></div>
        <p class="hint">Hints cost points: first letter (−5), length (−2).</p>
      `;

      const defEl = root.querySelector("#df-def");
      const optsEl = root.querySelector("#df-opts");
      const statusEl = root.querySelector("#df-status");
      best = Storage.getBest("defineme") || 0;

      const style = document.createElement("style");
      style.textContent = `
        .df-opt { display:block; width:min(380px,90%); padding:12px; margin:6px auto; border-radius:10px;
                  background:var(--bg-soft,#334155); color:var(--text,#eee); font-size:17px; font-weight:700;
                  cursor:pointer; border:2px solid transparent; letter-spacing:2px; }
        .df-opt:hover { border-color:var(--accent,#6366f1); }
        .df-opt.right { background:#166534; color:#fff; }
        .df-opt.wrong { background:#991b1b; color:#fff; }
        .df-hintrow { margin-top:10px; }
      `;
      root.appendChild(style);

      function generate() {
        const pool = DEFS.slice().sort(() => Math.random() - 0.5);
        item = pool[0];
        const others = pool.slice(1, 4);
        opts = [item, ...others].sort(() => Math.random() - 0.5);
        defEl.innerHTML = `“${item.d}.”`;
        statusEl.textContent = "Which word matches this definition?";
        statusEl.className = "status info";
        render();
      }

      function pick(o) {
        const els = optsEl.querySelectorAll(".df-opt");
        els.forEach(el => el.style.pointerEvents = "none");
        const i = opts.indexOf(o);
        if (o.w === item.w) {
          els[i].classList.add("right");
          score += Math.max(5, 20 - hintsUsed * 5) + streak * 2;
          streak++;
          AudioFX.win();
          if (score > best) {
            best = score;
            Storage.setBest("defineme", score);
          }
          statusEl.textContent = `📖 Yes — ${item.w}!`;
          statusEl.className = "status win";
          after(generate, 1200);
        } else {
          els[i].classList.add("wrong");
          els[opts.indexOf(item)].classList.add("right");
          streak = 0;
          score = Math.max(0, score - 5);
          AudioFX.error();
          statusEl.textContent = `The answer was ${item.w}.`;
          statusEl.className = "status lose";
          after(generate, 2000);
        }
        updateHud();
      }

      let hintsUsed = 0;

      function hint(kind) {
        if (hintsUsed >= 2) return;
        hintsUsed++;
        score = Math.max(0, score - (kind === "letter" ? 5 : 2));
        if (kind === "letter") {
          App.toast(`Starts with “${item.w[0]}”`, "info");
        } else {
          App.toast(`${item.w.length} letters`, "info");
        }
        AudioFX.click();
        updateHud();
      }

      function updateHud() {
        root.querySelector("#df-score").textContent = score;
        root.querySelector("#df-streak").textContent = streak;
        root.querySelector("#df-best").textContent = best;
      }

      function render() {
        updateHud();
        hintsUsed = 0;
        optsEl.innerHTML = "";
        opts.forEach(o => {
          const b = document.createElement("div");
          b.className = "df-opt";
          b.textContent = o.w;
          b.addEventListener("pointerdown", () => pick(o));
          optsEl.appendChild(b);
        });
        optsEl.insertAdjacentHTML("beforeend", `
          <div class="row gap-2 df-hintrow" style="justify-content:center;">
            <button class="btn btn-sm" id="df-h1">💡 First letter (−5)</button>
            <button class="btn btn-sm" id="df-h2">📏 Length (−2)</button>
          </div>
        `);
        optsEl.querySelector("#df-h1").addEventListener("click", () => hint("letter"));
        optsEl.querySelector("#df-h2").addEventListener("click", () => hint("length"));
      }

      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Define Me",
        `A dictionary definition appears — pick the word it defines from four candidates.
        <br><br>Correct answers earn <b>20 points</b> (minus hint costs) plus a <b>streak bonus</b>.
        💡 reveals the first letter (−5), 📏 the word length (−2). Great vocabulary workout — definitions are
        straight from the dictionary.`);
    },
  });
})();
