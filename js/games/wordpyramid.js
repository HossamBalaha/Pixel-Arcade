/* Word Pyramid — start with 1 letter, add one letter at a time to form valid words. */
(function () {
  // Each pyramid: chain of words where word[i+1] = word[i] + one new letter (in any position).
  const PYRAMIDS = [
    {
      chain: ["A", "AT", "CAT", "CHAT", "CHEAT", "CHEATS"],
      clue: "Letter → preposition → feline → talk → swindle → frauds"
    },
    {
      chain: ["I", "IN", "PIN", "PINK", "PANEL", "PLANEL", "PLANTER"],
      clue: "Pronoun → inside → fastener → color → discussion → ? → gardener"
    },
    {chain: ["A", "AN", "AND", "LAND", "LEAND", "LEMOND", "LEMONED"], clue: "Article → article → conjunction → ground"},
    {chain: ["O", "ON", "TON", "TONE", "STONE", "STONES"], clue: "Letter → atop → weight → sound → rock → rocks"},
    {chain: ["A", "AS", "ASH", "RASH", "BRASH", "BRASHY"], clue: "Letter → like → char → irritation → loud → brazen"},
    {chain: ["I", "IT", "BIT", "BITE", "BITER", "BITERS"], clue: "I → pronoun → piece → taste → chewer → chewers"},
    {
      chain: ["A", "AT", "PAT", "PART", "PARTY", "PARTIES"],
      clue: "A → prep → tap → section → celebration → celebrations"
    },
    {chain: ["O", "OF", "OFF", "TOFF", "TOFFEE", "TOFFEES"], clue: "O → prep → not on → posh → candy → candies"},
    {
      chain: ["E", "WE", "WEB", "BLEW", "BLADE", "BLAMED"],
      clue: "Letter → us → net → past blow → knife part → accused"
    },
    {chain: ["A", "AM", "ARM", "ARMS", "ARMOR", "ARMORS"], clue: "A → be → limb → weapons → protection → protections"},
  ];

  let live = null;
  GameRegistry.register({
    id: "wordpyramid",
    name: "Word Pyramid",
    icon: "🔺",
    category: "word",
    description: "Build words one letter at a time — A → AT → CAT → CHAT",
    tags: ["word", "thinking"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let pyramid = null, currentLevel = 0, over = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Level</div><div class="val" id="wp-level">1 / 0</div></div>
          <div class="score-cell"><div class="label">Hints</div><div class="val" id="wp-hints">2</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="wp-best">—</div></div>
        </div>
        <div class="status info" id="wp-status">Add one letter to the current word to form a new valid word.</div>
        <div class="text-muted text-sm center" id="wp-clue" style="margin:8px 0;"></div>
        <div id="wp-pyramid" class="col" style="align-items:center;gap:4px;margin:14px 0;"></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <input id="wp-input" type="text" autocomplete="off" placeholder="Type the next word…" class="search" style="flex:0 1 220px;text-transform:uppercase;letter-spacing:0.1em;" />
          <button class="btn primary" id="wp-submit">Submit</button>
        </div>
        <p class="hint">Each word in the pyramid is <b>one letter longer</b> than the previous, using all the previous letters plus one new one (in any position).</p>
      `;
      const statusEl = root.querySelector("#wp-status");
      const clueEl = root.querySelector("#wp-clue");
      const pyrEl = root.querySelector("#wp-pyramid");
      const inputEl = root.querySelector("#wp-input");

      function renderPyramid() {
        pyrEl.innerHTML = "";
        for (let i = 0; i < pyramid.chain.length; i++) {
          const row = document.createElement("div");
          row.style.cssText = "display:flex;align-items:center;gap:8px;font-family:var(--font-mono);font-weight:700;";
          const num = document.createElement("span");
          num.style.cssText = "color:var(--text-muted);font-size:0.85rem;width:24px;text-align:right;";
          num.textContent = i + 1 + ".";
          const word = document.createElement("span");
          if (i < currentLevel) {
            word.textContent = pyramid.chain[i];
            word.style.color = "var(--success)";
            word.style.fontSize = (1 + i * 0.1) + "rem";
          } else if (i === currentLevel) {
            word.textContent = "_".repeat(pyramid.chain[i].length);
            word.style.color = "var(--accent)";
            word.style.fontSize = (1 + i * 0.1) + "rem";
          } else {
            word.textContent = "?".repeat(pyramid.chain[i].length);
            word.style.color = "var(--text-muted)";
            word.style.fontSize = (1 + i * 0.1) + "rem";
          }
          row.appendChild(num);
          row.appendChild(word);
          pyrEl.appendChild(row);
        }
        root.querySelector("#wp-level").textContent = `${currentLevel + 1} / ${pyramid.chain.length}`;
      }

      function submit() {
        if (over) return;
        const guess = inputEl.value.trim().toUpperCase();
        inputEl.value = "";
        if (!guess) return;
        const target = pyramid.chain[currentLevel];
        if (guess === target) {
          AudioFX.pop();
          currentLevel++;
          if (currentLevel >= pyramid.chain.length) {
            over = true;
            statusEl.textContent = "🎉 Pyramid complete!";
            statusEl.className = "status win";
            AudioFX.win();
            const best = Storage.getBest("wordpyramid");
            if (!best || 100 > best) {
              Storage.setBest("wordpyramid", 100);
              root.querySelector("#wp-best").textContent = 100;
            }
          } else {
            statusEl.textContent = `Level up! Now build a ${pyramid.chain[currentLevel].length}-letter word.`;
            statusEl.className = "status win";
          }
          renderPyramid();
        } else {
          // Verify it's a valid extension of the previous word
          const prev = pyramid.chain[currentLevel - 1] || "";
          const requiredLetters = prev.split("");
          const guessLetters = guess.split("");
          // All letters of prev must be in guess (in any order)
          let valid = guess.length === target.length;
          if (valid) {
            const rem = guessLetters.slice();
            for (const L of requiredLetters) {
              const idx = rem.indexOf(L);
              if (idx < 0) {
                valid = false;
                break;
              }
              rem.splice(idx, 1);
            }
          }
          if (!valid) {
            AudioFX.error();
            statusEl.textContent = `Must add exactly one letter to "${prev || "—"}" (length ${target.length}).`;
            statusEl.className = "status lose";
          } else {
            AudioFX.error();
            statusEl.textContent = `"${guess}" isn't the target word. Try again.`;
            statusEl.className = "status lose";
          }
        }
      }

      function doHint() {
        if (over) {
          App.toast("Game is over", "info");
          return;
        }
        const hintsLeft = parseInt(root.querySelector("#wp-hints").textContent, 10);
        if (hintsLeft <= 0) {
          App.toast("No hints left", "warning");
          return;
        }
        const target = pyramid.chain[currentLevel];
        // Reveal one new letter (one that wasn't in the previous word)
        const prev = pyramid.chain[currentLevel - 1] || "";
        const prevLetters = new Set(prev.split(""));
        const newLetters = target.split("").map((L, i) => ({
          L,
          i
        })).filter(o => !prevLetters.has(o.L) || prev.split("").filter(x => x === o.L).length < target.slice(0, o.i + 1).split("").filter(x => x === o.L).length);
        if (newLetters.length) {
          const pick = newLetters[Math.floor(Math.random() * newLetters.length)];
          App.toast(`Hint: position ${pick.i + 1} is "${pick.L}"`, "info");
          AudioFX.reveal();
          root.querySelector("#wp-hints").textContent = hintsLeft - 1;
        }
      }

      function doSolve() {
        if (over) return;
        currentLevel = pyramid.chain.length;
        over = true;
        renderPyramid();
        statusEl.textContent = "Solution revealed";
        statusEl.className = "status lose";
        AudioFX.lose();
      }

      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      });
      inputEl.addEventListener("input", (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
      });
      root.querySelector("#wp-submit").addEventListener("click", submit);

      function newGame() {
        pyramid = JSON.parse(JSON.stringify(PYRAMIDS[Math.floor(Math.random() * PYRAMIDS.length)]));
        currentLevel = 1; // start by extending the seed letter
        over = false;
        root.querySelector("#wp-hints").textContent = "2";
        clueEl.textContent = "Clue: " + pyramid.clue;
        const best = Storage.getBest("wordpyramid");
        root.querySelector("#wp-best").textContent = best || "—";
        statusEl.textContent = `Build a ${pyramid.chain[1].length}-letter word from "${pyramid.chain[0]}".`;
        statusEl.className = "status info";
        renderPyramid();
        inputEl.value = "";
        inputEl.focus();
      }

      live = {hint: doHint, solve: doSolve};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Word Pyramid",
        `Build a pyramid of words, each one letter longer than the previous.
        <br><br>Start with the seed letter. The next word must <b>contain all the letters of the previous word</b>, plus <b>exactly one new letter</b> (in any position), and form a valid English word.
        <br><br>For example: A → AT → CAT → CHAT → CHEAT → CHEATS.
        <br><br>Type each word and hit <b>Enter</b>. <b>Hint</b> reveals one letter of the next word.`);
    },
  });
})();
