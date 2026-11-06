/* Cryptoquote — decode a famous quote encoded with a substitution cipher. */
(function () {
  const QUOTES = [
    {text: "TO BE OR NOT TO BE THAT IS THE QUESTION", author: "SHAKESPEARE"},
    {text: "I THINK THEREFORE I AM", author: "DESCARTES"},
    {text: "THE ONLY THING WE HAVE TO FEAR IS FEAR ITSELF", author: "ROOSEVELT"},
    {text: "IN THE MIDDLE OF DIFFICULTY LIES OPPORTUNITY", author: "EINSTEIN"},
    {text: "LIFE IS WHAT HAPPENS WHEN YOU ARE BUSY MAKING OTHER PLANS", author: "LENNON"},
    {text: "THE UNEXAMINED LIFE IS NOT WORTH LIVING", author: "SOCRATES"},
    {text: "KNOWLEDGE IS POWER", author: "BACON"},
    {text: "BE THE CHANGE YOU WISH TO SEE IN THE WORLD", author: "GANDHI"},
    {text: "STAY HUNGRY STAY FOOLISH", author: "JOBS"},
    {text: "WELL DONE IS BETTER THAN WELL SAID", author: "FRANKLIN"},
    {text: "THE MIND IS EVERYTHING WHAT YOU THINK YOU BECOME", author: "BUDDHA"},
    {text: "AN UNEXAMINED LIFE IS NOT WORTH LIVING", author: "SOCRATES"},
    {text: "IF YOU WANT TO LIFT YOURSELF UP LIFT UP SOMEONE ELSE", author: "WASHINGTON"},
    {text: "WE BECOME WHAT WE THINK ABOUT", author: "NIGHTINGALE"},
    {text: "THE JOURNEY OF A THOUSAND MILES BEGINS WITH ONE STEP", author: "LAO TZU"},
    {text: "WHATEVER YOU ARE BE A GOOD ONE", author: "LINCOLN"},
    {text: "SUCCESS IS NOT FINAL FAILURE IS NOT FATAL IT IS THE COURAGE TO CONTINUE THAT COUNTS", author: "CHURCHILL"},
    {text: "I HAVE NOT FAILED I HAVE JUST FOUND TEN THOUSAND WAYS THAT DO NOT WORK", author: "EDISON"},
    {text: "IT IS NEVER TOO LATE TO BE WHAT YOU MIGHT HAVE BEEN", author: "ELIOT"},
    {text: "THE BEST WAY TO PREDICT THE FUTURE IS TO CREATE IT", author: "DRUCKER"},
    {text: "EDUCATION IS THE MOST POWERFUL WEAPON YOU CAN USE TO CHANGE THE WORLD", author: "MANDELA"},
    {text: "HAPPINESS IS NOT SOMETHING READY MADE IT COMES FROM YOUR OWN ACTIONS", author: "DALAI LAMA"},
    {text: "WHAT WE THINK WE BECOME", author: "BUDDHA"},
    {text: "DO NOT GO GENTLY INTO THAT GOOD NIGHT", author: "THOMAS"},
    {text: "TO LIVE IS THE RAREST THING IN THE WORLD MOST PEOPLE JUST EXIST", author: "WILDE"},
    {text: "NOT ALL THOSE WHO WANDER ARE LOST", author: "TOLKIEN"},
    {text: "WE ARE ALL IN THE GUTTER BUT SOME OF US ARE LOOKING AT THE STARS", author: "WILDE"},
    {
      text: "I CANNOT DO ALL THE GOOD THAT THE WORLD NEEDS BUT THE WORLD NEEDS ALL THE GOOD THAT I CAN DO",
      author: "EVEREST"
    },
    {text: "LIFE IS EITHER A DARING ADVENTURE OR NOTHING AT ALL", author: "KELLER"},
    {text: "IN THREE WORDS I CAN SUM UP EVERYTHING I HAVE LEARNED ABOUT LIFE IT GOES ON", author: "FROST"},
    {text: "THE ONLY WAY TO DO GREAT WORK IS TO LOVE WHAT YOU DO", author: "JOBS"},
    {text: "FALL SEVEN TIMES STAND UP EIGHT", author: "JAPANESE PROVERB"},
    {text: "BE YOURSELF EVERYONE ELSE IS ALREADY TAKEN", author: "WILDE"},
    {text: "IT IS BETTER TO BE HATED FOR WHAT YOU ARE THAN LOVED FOR WHAT YOU ARE NOT", author: "GIDE"},
    {text: "WHEN I LET GO OF WHAT I AM I BECOME WHAT I MIGHT BE", author: "LAO TZU"},
    {text: "LIFE IS REALLY SIMPLE BUT WE INSIST ON MAKING IT COMPLICATED", author: "CONFUCIUS"},
    {text: "YOU MISS ONE HUNDRED PERCENT OF THE SHOTS YOU DO NOT TAKE", author: "GRETZKY"},
    {text: "THE ONLY IMPOSSIBLE JOURNEY IS THE ONE YOU NEVER BEGIN", author: "ROBBINS"},
    {
      text: "WE MUST NEVER STOP DREAMING THE FUTURE BELONGS TO THOSE WHO BELIEVE IN THE BEAUTY OF THEIR DREAMS",
      author: "ROOSEVELT"
    },
    {text: "EITHER WRITE SOMETHING WORTH READING OR DO SOMETHING WORTH WRITING", author: "FRANKLIN"},
    {text: "IF YOU TELL THE TRUTH YOU DO NOT HAVE TO REMEMBER ANYTHING", author: "TWAIN"},
    {text: "THE MAN WHO MOVES A MOUNTAIN BEGINS BY CARRYING AWAY SMALL STONES", author: "CONFUCIUS"},
    {text: "DARKNESS CANNOT DRIVE OUT DARKNESS ONLY LIGHT CAN DO THAT", author: "KING"},
    {text: "WE RISE BY LIFTING OTHERS", author: "INGERSOLL"},
    {text: "A JOURNEY OF A THOUSAND LEAGUES BEGINS BENEATH ONE FEET", author: "LAO TZU"},
    {text: "EVERYTHING YOU CAN IMAGINE IS REAL", author: "PICASSO"},
    {text: "DO ONE THING EVERY DAY THAT SCARES YOU", author: "ROOSEVELT"},
    {text: "GREAT MINDS DISCUSS IDEAS AVERAGE MINDS DISCUSS EVENTS SMALL MINDS DISCUSS PEOPLE", author: "ROOSEVELT"},
    {text: "NEVER LET THE FEAR OF STRIKING OUT KEEP YOU FROM PLAYING THE GAME", author: "RUTH"},
    {text: "WHETHER YOU THINK YOU CAN OR YOU THINK YOU CANNOT YOU ARE RIGHT", author: "FORD"},
  ];

  function shuffleAlpha() {
    const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    // Ensure no letter maps to itself
    for (let i = 0; i < 26; i++) {
      if (a[i] === String.fromCharCode(65 + i)) {
        const next = (i + 1) % 26;
        [a[i], a[next]] = [a[next], a[i]];
      }
    }
    return a.join("");
  }

  let live = null;
  GameRegistry.register({
    id: "cryptoquote",
    name: "Cryptoquote",
    icon: "🔐",
    category: "word",
    description: "Decode the substitution-cipher quote",
    tags: ["word", "thinking", "cipher"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let quote = null, cipher = null, mapping = {}, solved = false;
      let activeIdx = -1;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Hints</div><div class="val" id="cq-hints">2</div></div>
          <div class="score-cell"><div class="label">Letters</div><div class="val" id="cq-letters">0 / 26</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cq-best">—</div></div>
        </div>
        <div class="status info" id="cq-status">Decode the quote — tap a cipher letter, then type the matching letter.</div>
        <div id="cq-quote" style="text-align:center;font-family:var(--font-mono);font-size:1.1rem;line-height:1.7;margin:14px 0;letter-spacing:0.05em;"></div>
        <div class="center text-muted text-sm" id="cq-author" style="margin-bottom:12px;"></div>
        <div id="cq-keyboard" class="cq-keyboard"></div>
        <p class="hint">Tap a cipher letter to make it active, then tap a plaintext letter (or type). <b>Backspace</b> clears the active one. <b>Hint</b> reveals one correct letter.</p>
      `;
      const statusEl = root.querySelector("#cq-status");
      const quoteEl = root.querySelector("#cq-quote");
      const authorEl = root.querySelector("#cq-author");
      const kbEl = root.querySelector("#cq-keyboard");
      if (!document.getElementById("cq-style")) {
        const s = document.createElement("style");
        s.id = "cq-style";
        s.textContent = `
          .cq-letter { display: inline-flex; flex-direction: column; align-items: center; margin: 2px 1px; cursor: pointer; padding: 2px 4px; border-radius: 4px; }
          .cq-letter:hover { background: var(--bg-elev); }
          .cq-letter.active { background: var(--accent-soft); outline: 2px solid var(--accent); }
          .cq-letter.solved .cq-cipher { color: var(--success); }
          .cq-cipher { font-weight: 700; color: var(--text); }
          .cq-plain { font-size: 0.9rem; color: var(--accent); min-height: 1.2em; }
          .cq-letter.solved .cq-plain { color: var(--success); }
          .cq-keyboard { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; max-width: 480px; margin: 0 auto; }
          .cq-key { width: 28px; height: 32px; padding: 0; font-size: 0.85rem; }
          .cq-key.used { opacity: 0.4; }
          .cq-space { display: inline-block; width: 12px; }
        `;
        document.head.appendChild(s);
      }

      function encode() {
        return quote.text.split("").map(c => {
          if (c === " ") return " ";
          if (!/[A-Z]/.test(c)) return c;
          const i = c.charCodeAt(0) - 65;
          return cipher[i];
        }).join("");
      }

      function encodedArr() {
        const enc = encode();
        return enc.split("").map((c, i) => ({c, original: quote.text[i]}));
      }

      function renderQuote() {
        const enc = encode();
        const chars = enc.split("");
        quoteEl.innerHTML = "";
        chars.forEach((c, i) => {
          if (c === " ") {
            const sp = document.createElement("span");
            sp.className = "cq-space";
            quoteEl.appendChild(sp);
            return;
          }
          if (!/[A-Z]/.test(c)) {
            const sp = document.createElement("span");
            sp.textContent = c;
            quoteEl.appendChild(sp);
            return;
          }
          const span = document.createElement("span");
          span.className = "cq-letter";
          if (i === activeIdx) span.classList.add("active");
          const plain = mapping[c] || "";
          if (plain && plain === quote.text[i]) span.classList.add("solved");
          span.innerHTML = `<span class="cq-cipher">${c}</span><span class="cq-plain">${plain}</span>`;
          span.addEventListener("click", () => {
            activeIdx = (activeIdx === i) ? -1 : i;
            AudioFX.tick();
            renderQuote();
          });
          quoteEl.appendChild(span);
        });
        const usedCount = Object.keys(mapping).filter(k => mapping[k]).length;
        root.querySelector("#cq-letters").textContent = `${usedCount} / 26`;
      }

      function renderKb() {
        kbEl.innerHTML = "";
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(L => {
          const btn = document.createElement("button");
          btn.className = "key cq-key";
          btn.textContent = L;
          // Mark used letters
          const usedAs = Object.keys(mapping).find(k => mapping[k] === L);
          if (usedAs) btn.classList.add("used");
          btn.addEventListener("click", () => assignLetter(L));
          kbEl.appendChild(btn);
        });
      }

      function assignLetter(L) {
        if (solved) return;
        if (activeIdx < 0) return;
        const enc = encode();
        const cipherLetter = enc[activeIdx];
        if (!/[A-Z]/.test(cipherLetter)) return;
        // Remove any existing mapping that already maps to L
        for (const k in mapping) if (mapping[k] === L) delete mapping[k];
        mapping[cipherLetter] = L;
        AudioFX.pop();
        renderQuote();
        renderKb();
        checkSolved();
      }

      function clearActive() {
        if (activeIdx < 0) return;
        const enc = encode();
        const c = enc[activeIdx];
        if (mapping[c]) {
          delete mapping[c];
          AudioFX.click();
        }
        renderQuote();
        renderKb();
      }

      function onKey(e) {
        if (solved) return;
        if (e.key === "Backspace") {
          e.preventDefault();
          clearActive();
          return;
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          const dir = e.key === "ArrowLeft" ? -1 : 1;
          const enc = encode();
          let i = activeIdx;
          for (let k = 0; k < enc.length; k++) {
            i = (i + dir + enc.length) % enc.length;
            if (/[A-Z]/.test(enc[i])) {
              activeIdx = i;
              AudioFX.tick();
              renderQuote();
              return;
            }
          }
          return;
        }
        if (/^[a-zA-Z]$/.test(e.key)) assignLetter(e.key.toUpperCase());
      }

      document.addEventListener("keydown", onKey);

      function checkSolved() {
        const decoded = encode().split("").map(c => mapping[c] || (c === " " ? " " : c)).join("");
        if (decoded === quote.text) {
          solved = true;
          statusEl.textContent = `🎉 Decoded! — ${quote.author}`;
          statusEl.className = "status win";
          AudioFX.win();
          const hintsUsed = 2 - parseInt(root.querySelector("#cq-hints").textContent, 10);
          const score = Math.max(0, 100 - hintsUsed * 20);
          const best = Storage.getBest("cryptoquote");
          if (!best || score > best) {
            Storage.setBest("cryptoquote", score);
            root.querySelector("#cq-best").textContent = score;
            App.toast("New best: " + score, "success");
          }
          authorEl.textContent = "— " + quote.author;
        }
      }

      function doHint() {
        if (solved) {
          App.toast("Already solved", "info");
          return;
        }
        const hintsLeft = parseInt(root.querySelector("#cq-hints").textContent, 10);
        if (hintsLeft <= 0) {
          App.toast("No hints left", "warning");
          return;
        }
        // Find an unmapped or wrongly-mapped cipher letter
        const enc = encode();
        const candidates = [];
        for (let i = 0; i < enc.length; i++) {
          if (/[A-Z]/.test(enc[i]) && mapping[enc[i]] !== quote.text[i]) candidates.push(i);
        }
        if (!candidates.length) {
          App.toast("No hints to give", "info");
          return;
        }
        const idx = candidates[Math.floor(Math.random() * candidates.length)];
        activeIdx = idx;
        assignLetter(quote.text[idx]);
        root.querySelector("#cq-hints").textContent = hintsLeft - 1;
        App.toast(`Hint: ${enc[idx]} = ${quote.text[idx]}`, "info");
      }

      function doSolve() {
        if (solved) return;
        const enc = encode();
        for (let i = 0; i < enc.length; i++) {
          if (/[A-Z]/.test(enc[i])) mapping[enc[i]] = quote.text[i];
        }
        solved = true;
        renderQuote();
        renderKb();
        statusEl.textContent = `Solution revealed — ${quote.author}`;
        statusEl.className = "status lose";
        authorEl.textContent = "— " + quote.author;
        AudioFX.lose();
      }

      function newGame() {
        quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        cipher = shuffleAlpha();
        mapping = {};
        solved = false;
        activeIdx = -1;
        root.querySelector("#cq-hints").textContent = "2";
        const best = Storage.getBest("cryptoquote");
        root.querySelector("#cq-best").textContent = best || "—";
        statusEl.textContent = "Decode the quote — tap a cipher letter, then type the matching letter.";
        statusEl.className = "status info";
        authorEl.textContent = "";
        renderQuote();
        renderKb();
      }

      live = {hint: doHint, solve: doSolve};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Cryptoquote",
        `Each cipher letter stands for exactly one plaintext letter (a substitution cipher).
        <br><br>Tap a cipher letter in the quote to make it <b>active</b>, then either:
        <br>• tap a letter in the keyboard below, or
        <br>• press that letter on your physical keyboard.
        <br><br>Use <b>Arrow Left/Right</b> to move between cipher letters, <b>Backspace</b> to clear the active letter.
        <br><br>Decode the whole quote to win. <b>Hint</b> reveals one correct letter (max 2).`);
    },
  });
})();
