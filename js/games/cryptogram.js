/* Cryptogram — decode a famous quote letter-by-letter with a substitution cipher. */
(function () {
  // Famous quotes (curated — distinct from cryptoquote.js's list)
  const QUOTES = [
    {text: "GENIUS IS ONE PERCENT INSPIRATION AND NINETY NINE PERCENT PERSPIRATION", author: "THOMAS EDISON"},
    {text: "ASK NOT WHAT YOUR COUNTRY CAN DO FOR YOU ASK WHAT YOU CAN DO FOR YOUR COUNTRY", author: "JOHN F KENNEDY"},
    {text: "THAT IS ONE SMALL STEP FOR MAN ONE GIANT LEAP FOR MANKIND", author: "NEIL ARMSTRONG"},
    {text: "IMAGINATION IS MORE IMPORTANT THAN KNOWLEDGE", author: "ALBERT EINSTEIN"},
    {text: "THE PEN IS MIGHTIER THAN THE SWORD", author: "EDWARD BULWER LYTTON"},
    {text: "GIVE ME LIBERTY OR GIVE ME DEATH", author: "PATRICK HENRY"},
    {text: "THE COURSE OF TRUE LOVE NEVER DID RUN SMOOTH", author: "WILLIAM SHAKESPEARE"},
    {text: "POWER TENDS TO CORRUPT AND ABSOLUTE POWER CORRUPTS ABSOLUTELY", author: "LORD ACTON"},
    {text: "FLOAT LIKE A BUTTERFLY STING LIKE A BEE", author: "MUHAMMAD ALI"},
    {text: "I CAME I SAW I CONQUERED", author: "JULIUS CAESAR"},
  ];
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const MAX_HINTS = 3;

  function makeCipher() {
    // Random substitution with no letter mapped to itself
    let a = ALPHA.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    for (let i = 0; i < 26; i++) {
      if (a[i] === ALPHA[i]) {
        const next = (i + 1) % 26;
        [a[i], a[next]] = [a[next], a[i]];
      }
    }
    return a; // cipher[i] = letter that ALPHA[i] is encoded as
  }

  let live = null;
  GameRegistry.register({
    id: "cryptogram",
    name: "Cryptogram",
    icon: "🔒",
    category: "word",
    description: "Decode a famous quote — every letter has been swapped by a substitution cipher",
    tags: ["word", "cipher", "puzzle", "quotes"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let quote = null, cipher = null, encoded = "";
      let mapping = {}; // cipher letter -> plain letter guess
      let activeCipher = null; // currently selected cipher letter
      let solved = false, hintsUsed = 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Hints</div><div class="val" id="cg-hints">${MAX_HINTS}</div></div>
          <div class="score-cell"><div class="label">Cipher keys</div><div class="val" id="cg-keys">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cg-best">—</div></div>
        </div>
        <div class="status info" id="cg-status">Pick a cipher letter (in the quote or the table), then type the plain letter it hides.</div>
        <div id="cg-quote" class="cg-quote"></div>
        <div class="center text-muted text-sm" id="cg-author" style="margin:6px 0 14px;"></div>
        <div class="center text-muted text-sm" style="margin-bottom:6px;">cipher → plain (frequency in superscript)</div>
        <div class="center"><div class="cg-table" id="cg-table"></div></div>
        <div class="center" style="margin:14px 0 4px;">
          <button class="btn" id="cg-new">🔄 New quote</button>
        </div>
        <p class="hint">The same cipher letter always hides the same plain letter, and no letter ever stands for itself. Watch letter patterns and word lengths — <b>Hint</b> reveals one correct letter.</p>
      `;

      const statusEl = root.querySelector("#cg-status");
      const quoteEl = root.querySelector("#cg-quote");
      const authorEl = root.querySelector("#cg-author");
      const tableEl = root.querySelector("#cg-table");

      if (!document.getElementById("cg-style")) {
        const s = document.createElement("style");
        s.id = "cg-style";
        s.textContent = `
          .cg-quote { text-align: center; font-family: var(--font-mono); margin: 16px auto; max-width: 640px; line-height: 1.1; }
          .cg-word { display: inline-flex; margin: 5px 6px; }
          .cg-slot { display: inline-flex; flex-direction: column; align-items: center; width: 26px; cursor: pointer; border-radius: 5px; padding: 2px 1px; }
          .cg-slot:hover { background: var(--bg-soft); }
          .cg-slot.active { background: var(--accent-soft); outline: 2px solid var(--accent); }
          .cg-slot .c { font-weight: 800; font-size: 1rem; color: var(--text); }
          .cg-slot .p { min-height: 1.25em; font-size: 1rem; font-weight: 800; color: var(--accent); }
          .cg-slot.ok .p { color: var(--success); }
          .cg-space { display: inline-block; width: 14px; }
          .cg-table { display: grid; grid-template-columns: repeat(13, 42px); gap: 4px; }
          .cg-cell { display: flex; flex-direction: column; align-items: center; padding: 3px 0; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-elev); cursor: pointer; font-family: var(--font-mono); }
          .cg-cell:hover { border-color: var(--accent); }
          .cg-cell.active { border-color: var(--accent); background: var(--accent-soft); }
          .cg-cell .cc { font-weight: 800; font-size: 0.95rem; color: var(--text); position: relative; }
          .cg-cell .cc sup { font-size: 0.55rem; color: var(--text-muted); margin-left: 1px; }
          .cg-cell .pp { font-size: 0.95rem; font-weight: 800; color: var(--accent); min-height: 1.2em; }
          .cg-cell.ok .pp { color: var(--success); }
          .cg-cell.unused { opacity: 0.45; }
        `;
        document.head.appendChild(s);
      }

      function encode() {
        return quote.text.split("").map(ch => {
          if (!/[A-Z]/.test(ch)) return ch;
          return cipher[ch.charCodeAt(0) - 65];
        }).join("");
      }

      function freqs() {
        const f = {};
        for (const ch of encoded) if (/[A-Z]/.test(ch)) f[ch] = (f[ch] || 0) + 1;
        return f;
      }

      function usedCipherLetters() {
        return new Set(encoded.split("").filter(c => /[A-Z]/.test(c)));
      }

      function renderQuote() {
        quoteEl.innerHTML = "";
        encoded.split(" ").forEach(word => {
          const wEl = document.createElement("div");
          wEl.className = "cg-word";
          for (const ch of word) {
            if (!/[A-Z]/.test(ch)) {
              const sp = document.createElement("span");
              sp.textContent = ch;
              wEl.appendChild(sp);
              continue;
            }
            const slot = document.createElement("div");
            slot.className = "cg-slot" + (activeCipher === ch ? " active" : "");
            const plain = mapping[ch] || "";
            if (plain && plain === truePlain(ch)) slot.classList.add("ok");
            slot.innerHTML = '<span class="c">' + ch + '</span><span class="p">' + plain + "</span>";
            slot.addEventListener("click", () => {
              activeCipher = (activeCipher === ch) ? null : ch;
              AudioFX.tick();
              renderQuote();
              renderTable();
            });
            wEl.appendChild(slot);
          }
          quoteEl.appendChild(wEl);
          const gap = document.createElement("span");
          gap.className = "cg-space";
          quoteEl.appendChild(gap);
        });
      }

      function truePlain(cipherLetter) {
        // Recover the original letter this cipher letter encodes
        const i = cipher.indexOf(cipherLetter);
        return ALPHA[i];
      }

      function renderTable() {
        const f = freqs();
        const used = usedCipherLetters();
        tableEl.innerHTML = "";
        for (const c of ALPHA) {
          const cell = document.createElement("div");
          cell.className = "cg-cell" + (activeCipher === c ? " active" : "") + (used.has(c) ? "" : " unused");
          const plain = mapping[c] || "";
          if (plain && plain === truePlain(c)) cell.classList.add("ok");
          cell.innerHTML = '<span class="cc">' + c + (f[c] ? "<sup>" + f[c] + "</sup>" : "") + "</span>" +
            '<span class="pp">' + plain + "</span>";
          cell.addEventListener("click", () => {
            activeCipher = (activeCipher === c) ? null : c;
            AudioFX.tick();
            renderQuote();
            renderTable();
          });
          tableEl.appendChild(cell);
        }
        const n = Object.keys(mapping).filter(k => mapping[k]).length;
        root.querySelector("#cg-keys").textContent = n;
      }

      function assign(L) {
        if (solved || !activeCipher) return;
        if (!usedCipherLetters().has(activeCipher)) {
          App.toast("That letter doesn't appear in the quote — pick one that does", "info");
          return;
        }
        // Keep the mapping one-to-one
        for (const k in mapping) {
          if (mapping[k] === L && k !== activeCipher) delete mapping[k];
        }
        mapping[activeCipher] = L;
        AudioFX.pop();
        renderQuote();
        renderTable();
        checkSolved();
      }

      function clearActive() {
        if (solved || !activeCipher) return;
        if (mapping[activeCipher]) {
          delete mapping[activeCipher];
          AudioFX.click();
          renderQuote();
          renderTable();
        }
      }

      function checkSolved() {
        for (const ch of encoded) {
          if (/[A-Z]/.test(ch) && mapping[ch] !== truePlain(ch)) return;
        }
        solved = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Decoded! A quote from " + quote.author + ".";
        statusEl.className = "status win";
        authorEl.textContent = "— " + quote.author;
        const score = Math.max(70, 100 - hintsUsed * 10);
        App.recordResult(true, score);
        const best = Storage.getBest("cryptogram");
        if (!best || score > best) {
          Storage.setBest("cryptogram", score);
          root.querySelector("#cg-best").textContent = score;
          App.toast("New best: " + score, "success");
        }
        activeCipher = null;
        renderQuote();
        renderTable();
      }

      function doHint() {
        if (solved) {
          App.toast("Already solved", "info");
          return;
        }
        if (hintsUsed >= MAX_HINTS) {
          App.toast("No hints left", "warning");
          return;
        }
        // Prefer revealing a frequent cipher letter that isn't correct yet
        const f = freqs();
        const candidates = [];
        for (const ch of encoded) {
          if (/[A-Z]/.test(ch) && mapping[ch] !== truePlain(ch) && !candidates.includes(ch)) candidates.push(ch);
        }
        if (!candidates.length) {
          App.toast("Nothing left to reveal", "info");
          return;
        }
        candidates.sort((a, b) => (f[b] || 0) - (f[a] || 0));
        const c = candidates[0];
        activeCipher = c;
        mapping[c] = truePlain(c);
        hintsUsed++;
        root.querySelector("#cg-hints").textContent = MAX_HINTS - hintsUsed;
        AudioFX.reveal();
        renderQuote();
        renderTable();
        App.toast(c + " = " + truePlain(c), "info");
        checkSolved();
      }

      function doSolve() {
        if (solved) return;
        for (const ch of encoded) {
          if (/[A-Z]/.test(ch)) mapping[ch] = truePlain(ch);
        }
        solved = true;
        AudioFX.lose();
        statusEl.textContent = "Solution revealed — " + quote.author + ".";
        statusEl.className = "status lose";
        authorEl.textContent = "— " + quote.author;
        activeCipher = null;
        renderQuote();
        renderTable();
        App.recordResult(false, 0);
      }

      function onKey(e) {
        if (solved) return;
        if (e.key === "Backspace") {
          e.preventDefault();
          clearActive();
          return;
        }
        if (/^[a-zA-Z]$/.test(e.key)) {
          assign(e.key.toUpperCase());
          return;
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          const dir = e.key === "ArrowLeft" ? -1 : 1;
          const used = ALPHA.filter(c => usedCipherLetters().has(c));
          if (!used.length) return;
          let i = used.indexOf(activeCipher);
          if (i === -1) i = dir === 1 ? -1 : 0;
          activeCipher = used[(i + dir + used.length) % used.length];
          AudioFX.tick();
          renderQuote();
          renderTable();
        }
      }

      document.addEventListener("keydown", onKey);
      root.querySelector("#cg-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });

      function newGame() {
        quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        cipher = makeCipher();
        encoded = encode();
        mapping = {};
        activeCipher = null;
        solved = false;
        hintsUsed = 0;
        root.querySelector("#cg-hints").textContent = MAX_HINTS;
        root.querySelector("#cg-best").textContent = Storage.getBest("cryptogram") || "—";
        statusEl.textContent = "Pick a cipher letter (in the quote or the table), then type the plain letter it hides.";
        statusEl.className = "status info";
        authorEl.textContent = "";
        renderQuote();
        renderTable();
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
      App.showModal("How to play Cryptogram",
        `A famous quote has been encrypted with a <b>substitution cipher</b>: every letter was swapped for another one.
        <br><br>• The same cipher letter <b>always</b> hides the same plain letter — everywhere.
        <br>• No letter stands for itself.
        <br>• Tap a cipher letter in the <b>quote</b> or the <b>mapping table</b>, then type the plain letter (A–Z).
        <br>• The table shows each cipher letter's <b>frequency</b> (superscript) — common letters like E, T, A are your friends.
        <br>• <b>Backspace</b> clears the selected letter; <b>←/→</b> moves the selection.
        <br><br>Decode the whole quote to win. <b>Hint</b> reveals one correct letter (max ${MAX_HINTS}).`);
    },
  });
})();
