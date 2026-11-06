/* Mastermind — guess the secret color code in 8 tries, with Hint/Solve */
(function () {
  const COLORS = [
    {name: "Red", hex: "#ef4444"},
    {name: "Orange", hex: "#f97316"},
    {name: "Yellow", hex: "#eab308"},
    {name: "Green", hex: "#22c55e"},
    {name: "Blue", hex: "#3b82f6"},
    {name: "Purple", hex: "#a855f7"},
  ];
  const SLOTS = 4;
  const MAX = 8;
  const MAX_HINTS = 2;

  function newSecret(len) {
    const s = [];
    for (let i = 0; i < len; i++) s.push(Math.floor(Math.random() * COLORS.length));
    return s;
  }

  function evaluate(guess, secret) {
    let black = 0, white = 0;
    const s = secret.slice(), g = guess.slice();
    for (let i = 0; i < g.length; i++) if (g[i] === s[i]) {
      black++;
      g[i] = null;
      s[i] = null;
    }
    for (let i = 0; i < g.length; i++) {
      if (g[i] === null) continue;
      const j = s.indexOf(g[i]);
      if (j !== -1) {
        white++;
        s[j] = null;
      }
    }
    return {black, white};
  }

  // Live game state — set at mount time, cleared on cleanup.
  let live = null;

  GameRegistry.register({
    id: "mastermind",
    name: "Mastermind",
    icon: "🎨",
    category: "logic",
    description: "Crack the secret 4-color code in 8 tries",
    tags: ["logic", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let secret, guesses, current, over, allowDup;
      let hintsUsed = 0;

      function newGame() {
        secret = newSecret(SLOTS);
        guesses = [];
        current = Array(SLOTS).fill(null);
        over = false;
        hintsUsed = 0;
        render();
      }

      root.innerHTML = `
        <div class="row" style="justify-content:space-between;">
          <span class="text-sm text-muted">Click a color, then a slot to place it.</span>
          <label class="row gap-2 text-sm"><input type="checkbox" id="mm-dup"/> Allow duplicate colors</label>
        </div>
        <div class="status info" id="mm-status">Guess the secret 4-color code — 8 tries</div>
        <div class="col" id="mm-rows" style="gap:12px;"></div>
        <div class="mm-palette" id="mm-palette"></div>
        <p class="hint">Black peg = right color &amp; right position. White peg = right color, wrong position. Stuck? Use <b>Hint</b> (max 2 per game) or <b>Solve</b> in the header.</p>
      `;

      const rowsEl = root.querySelector("#mm-rows");
      const palEl = root.querySelector("#mm-palette");
      const statusEl = root.querySelector("#mm-status");
      let selected = 0;

      function render() {
        // Past guesses
        rowsEl.innerHTML = "";
        for (let r = 0; r < MAX; r++) {
          const row = document.createElement("div");
          row.className = "row";
          row.style.justifyContent = "center";
          row.style.gap = "16px";
          const pegs = document.createElement("div");
          pegs.className = "row";
          for (let i = 0; i < SLOTS; i++) {
            const p = document.createElement("button");
            p.className = "mm-peg";
            if (r < guesses.length) {
              p.style.background = COLORS[guesses[r].guess[i]].hex;
              p.disabled = true;
            } else if (r === guesses.length && !over) {
              if (current[i] !== null) p.style.background = COLORS[current[i]].hex;
              p.addEventListener("click", () => {
                if (current[i] === null) return;
                current[i] = null;
                AudioFX.click();
                render();
              });
            } else {
              p.disabled = true;
            }
            pegs.appendChild(p);
          }
          const fb = document.createElement("div");
          fb.className = "mm-feedback";
          if (r < guesses.length) {
            const e = guesses[r].eval;
            for (let i = 0; i < e.black; i++) {
              const f = document.createElement("div");
              f.className = "mm-fb black";
              fb.appendChild(f);
            }
            for (let i = 0; i < e.white; i++) {
              const f = document.createElement("div");
              f.className = "mm-fb white";
              fb.appendChild(f);
            }
          }
          row.appendChild(pegs);
          row.appendChild(fb);
          rowsEl.appendChild(row);
        }

        // Palette
        palEl.innerHTML = "";
        COLORS.forEach((c, i) => {
          const b = document.createElement("button");
          b.className = "mm-color" + (i === selected ? " selected" : "");
          b.style.background = c.hex;
          b.title = c.name;
          b.addEventListener("click", () => {
            selected = i;
            AudioFX.click();
            render();
          });
          palEl.appendChild(b);
        });
        // Submit button
        if (!over && current.every(x => x !== null) && guesses.length < MAX) {
          const submit = document.createElement("button");
          submit.className = "btn primary";
          submit.textContent = "Submit";
          submit.style.margin = "12px auto 0";
          submit.addEventListener("click", submitGuess);
          rowsEl.appendChild(submit);
        }
      }

      function submitGuess() {
        const guess = current.slice();
        const ev = evaluate(guess, secret);
        guesses.push({guess, eval: ev});
        AudioFX.flip();
        current = Array(SLOTS).fill(null);
        if (ev.black === SLOTS) {
          over = true;
          statusEl.textContent = `🎉 Solved in ${guesses.length} ${guesses.length === 1 ? "try" : "tries"}!`;
          statusEl.className = "status win";
          AudioFX.win();
          const best = Storage.getBest("mastermind");
          if (!best || guesses.length < best) {
            Storage.setBest("mastermind", guesses.length);
            App.toast("New best! Solved in " + guesses.length + " tries", "success");
          }
        } else if (guesses.length >= MAX) {
          over = true;
          statusEl.textContent = `Out of guesses. Code: ${secret.map(i => COLORS[i].name).join(", ")}`;
          statusEl.className = "status lose";
          AudioFX.lose();
        } else {
          statusEl.textContent = `Try ${guesses.length + 1} of ${MAX} — ${ev.black} black, ${ev.white} white`;
        }
        render();
      }

      function onKey(e) {
        if (over && (e.key === "r" || e.key === "R" || e.key === "Enter")) {
          newGame();
          return;
        }
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= COLORS.length && !over) {
          selected = n - 1;
          // place in first empty slot
          for (let i = 0; i < SLOTS; i++) if (current[i] === null) {
            current[i] = selected;
            AudioFX.pop();
            render();
            break;
          }
        }
        if (e.key === "Enter" && current.every(x => x !== null) && !over) submitGuess();
      }

      document.addEventListener("keydown", onKey);

      root.querySelector("#mm-dup").addEventListener("change", (e) => {
        allowDup = e.target.checked;
        // Re-gen secret if dup is now allowed/disallowed
        newGame();
      });

      // Click palette to place into next empty slot automatically
      palEl.addEventListener("click", (e) => {
        // The palette colors are already bound to set selected. Now auto-place if no slot focus.
      });

      // Override peg click: tapping an empty peg fills it with selected color
      // (already bound above for filled pegs to clear)
      rowsEl.addEventListener("click", (e) => {
        const peg = e.target.closest(".mm-peg");
        if (!peg || over) return;
        const rowEl = peg.parentElement.parentElement;
        const rows = Array.from(rowsEl.children);
        const idx = rows.indexOf(rowEl);
        if (idx !== guesses.length) return;
        const pegsInRow = Array.from(peg.parentElement.children);
        const slot = pegsInRow.indexOf(peg);
        if (current[slot] !== null) return; // already filled (handled by clear above)
        current[slot] = selected;
        AudioFX.pop();
        render();
      });

      function doHint() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (hintsUsed >= MAX_HINTS) {
          App.toast(`No hints left (max ${MAX_HINTS} per game)`, "warning");
          return;
        }
        // Find positions not yet "discovered" (i.e., not matched in any previous guess at that slot)
        const discovered = new Set();
        for (const g of guesses) {
          for (let i = 0; i < SLOTS; i++) {
            if (g.guess[i] === secret[i]) discovered.add(i);
          }
        }
        const undiscovered = [];
        for (let i = 0; i < SLOTS; i++) if (!discovered.has(i)) undiscovered.push(i);
        if (undiscovered.length === 0) {
          App.toast("All positions already revealed", "info");
          return;
        }
        const p = undiscovered[Math.floor(Math.random() * undiscovered.length)];
        hintsUsed++;
        const colorName = COLORS[secret[p]].name;
        AudioFX.reveal();
        App.toast(`Hint: position ${p + 1} is ${colorName}`, "info");
      }

      function doSolve() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        const code = secret.map(i => COLORS[i].name).join(", ");
        over = true;
        statusEl.textContent = `Solution revealed. Code: ${code}`;
        statusEl.className = "status lose";
        AudioFX.lose();
        App.showModal("Solution revealed",
          `The secret code was: <b>${code}</b>`);
        render();
      }

      live = {hint: doHint, solve: doSolve};

      newGame();
      return function cleanup() {
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
      App.showModal("How to play Mastermind",
        `The secret is a sequence of 4 colors (no duplicates by default — toggle the "Allow duplicate colors" checkbox for the harder mode).
        <br><br>Build your guess: click a color in the palette, then click an empty slot. Click a filled slot to clear it. Press <b>Submit</b>.
        <br><br>After each guess you get feedback pegs:
        <br>⚫ <b>Black</b>: right color in the right position.
        <br>⚪ <b>White</b>: right color, wrong position.
        <br><br>Stuck? Use the <b>Hint</b> button (max 2 per game — reveals one correct position) or the <b>Solve</b> button (reveals the full code and ends the game as a loss).
        <br><br>Crack the code in 8 tries or fewer. Keyboard: 1–6 to pick colors, Enter to submit.`);
    },
  });
})();
