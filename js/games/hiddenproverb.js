/* Hidden Proverb — fill in the missing letters to uncover the saying */
(function () {
  GameRegistry.register({
    id: "hiddenproverb",
    name: "Hidden Proverb",
    icon: "🗝️",
    category: "word",
    description: "Fill in the missing letters to uncover the saying",
    tags: ["word", "proverbs", "deduction"],
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
      const PROVERBS = [
        "ACTIONS SPEAK LOUDER THAN WORDS",
        "THE EARLY BIRD CATCHES THE WORM",
        "DONT COUNT YOUR CHICKENS BEFORE THEY HATCH",
        "EVERY CLOUD HAS A SILVER LINING",
        "A JOURNEY OF A THOUSAND MILES BEGINS WITH A SINGLE STEP",
        "PRACTICE MAKES PERFECT",
        "WHERE THERE IS SMOKE THERE IS FIRE",
        "TOO MANY COOKS SPOIL THE BROTH",
        "THE PEN IS MIGHTIER THAN THE SWORD",
        "DONT PUT ALL YOUR EGGS IN ONE BASKET",
        "A STITCH IN TIME SAVES NINE",
        "BETTER LATE THAN NEVER",
        "ALL THAT GLITTERS IS NOT GOLD",
        "ROME WAS NOT BUILT IN A DAY",
        "WHEN IN ROME DO AS THE ROMANS DO",
        "LOOK BEFORE YOU LEAP",
        "EASY COME EASY GO",
        "NO MAN IS AN ISLAND",
        "HONESTY IS THE BEST POLICY",
        "BLOOD IS THICKER THAN WATER",
      ];
      let proverb, shown, sel, hints, best, solvedCount;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="hp-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="hp-best">0</div></div>
          <div class="score-cell"><div class="label">Hints</div><div class="val" id="hp-hints">3</div></div>
        </div>
        <div class="status info" id="hp-status">Type letters into the blanks to complete the proverb</div>
        <div class="center" id="hp-phrase"></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="hp-hint">💡 Reveal a letter</button>
          <button class="btn btn-sm" id="hp-new">🆕 New proverb</button>
        </div>
        <p class="hint">Around a third of the letters are already yours — logic does the rest.</p>
      `;

      const phraseEl = root.querySelector("#hp-phrase");
      const statusEl = root.querySelector("#hp-status");
      best = Storage.getBest("hiddenproverb") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        .hp-slot { display:inline-flex; align-items:center; justify-content:center; width:24px; height:32px; margin:2px;
                   border-radius:5px; background:var(--bg-soft,#334155); font-weight:700; font-size:16px; color:var(--text,#eee); cursor:pointer; }
        .hp-slot.given { background:#0f766e; color:#fff; cursor:default; }
        .hp-slot.space { background:transparent; cursor:default; }
        .hp-slot.sel { outline:3px solid #fbbf24; outline-offset:-3px; }
        .hp-slot.done { background:#16a34a; color:#fff; }
      `;
      root.appendChild(style);

      function generate() {
        proverb = PROVERBS[Math.floor(Math.random() * PROVERBS.length)];
        shown = proverb.split("").map(ch => !/[A-Z]/.test(ch) ? ch : (Math.random() < 0.33 ? ch : ""));
        // ensure at least 1/3 given: top up
        let letters = proverb.split("").map((c, i) => /[A-Z]/.test(c) ? i : -1).filter(i => i >= 0);
        let given = letters.filter(i => shown[i]);
        while (given.length < Math.ceil(letters.length / 3)) {
          const pick = letters[Math.floor(Math.random() * letters.length)];
          shown[pick] = proverb[pick];
          given = letters.filter(i => shown[i]);
        }
        hints = 3;
        sel = null;
        statusEl.textContent = "Type letters into the blanks to complete the proverb";
        statusEl.className = "status info";
        render();
      }

      function clickSlot(i) {
        if (shown[i] || !/[A-Z]/.test(proverb[i])) return;
        sel = i;
        AudioFX.click();
        render();
      }

      function typeLetter(L) {
        const idx = sel !== null ? sel : shown.findIndex((c, i) => !c && /[A-Z]/.test(proverb[i]));
        if (idx < 0 || shown[idx]) return;
        shown[idx] = L;
        AudioFX.pop();
        // auto-advance
        const next = shown.findIndex((c, i) => !c && /[A-Z]/.test(proverb[i]) && i > idx);
        sel = next >= 0 ? next : shown.findIndex((c, i) => !c && /[A-Z]/.test(proverb[i]));
        render();
        checkWin();
      }

      function checkWin() {
        if (shown.every((c, i) => !/[A-Z]/.test(proverb[i]) || c)) {
          // verify letters match
          const ok = shown.every((c, i) => !/[A-Z]/.test(proverb[i]) || c === proverb[i]);
          if (ok) {
            AudioFX.win();
            solvedCount++;
            if (solvedCount > best) {
              best = solvedCount;
              Storage.setBest("hiddenproverb", best);
            }
            statusEl.textContent = "🗝️ Proverb uncovered! New one incoming…";
            statusEl.className = "status win";
            after(generate, 2000);
          } else {
            AudioFX.error();
            statusEl.textContent = "Some letters are wrong — check the reds and greens";
            statusEl.className = "status lose";
          }
        }
      }

      function hint() {
        if (hints <= 0) return;
        const blanks = shown.map((c, i) => (!c && /[A-Z]/.test(proverb[i])) ? i : -1).filter(i => i >= 0);
        if (!blanks.length) return;
        const i = blanks[Math.floor(Math.random() * blanks.length)];
        shown[i] = proverb[i];
        hints--;
        AudioFX.win();
        render();
        checkWin();
      }

      function render() {
        root.querySelector("#hp-solved").textContent = solvedCount;
        root.querySelector("#hp-best").textContent = best;
        root.querySelector("#hp-hints").textContent = hints;
        let html = "";
        for (let i = 0; i < proverb.length; i++) {
          const ch = proverb[i];
          if (ch === " ") html += `<span class="hp-slot space"></span>`;
          else if (!/[A-Z]/.test(ch)) html += `<span class="hp-slot space">${ch}</span>`;
          else {
            const val = shown[i];
            const cls = val ? (val === ch ? "done" : "") : "";
            html += `<span class="hp-slot ${val === ch ? "done" : ""} ${sel === i ? "sel" : ""}" data-i="${i}">${val || ""}</span>`;
          }
        }
        phraseEl.innerHTML = `<div style="max-width:560px;line-height:2.2;">${html}</div>`;
        phraseEl.querySelectorAll(".hp-slot[data-i]").forEach(el => {
          el.addEventListener("pointerdown", () => clickSlot(+el.dataset.i));
        });
      }

      const onKey = (e) => {
        if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key.toUpperCase());
        if (e.key === "Backspace") {
          const idx = sel !== null ? sel : -1;
          if (idx >= 0 && shown[idx] && proverb[idx] && shown[idx] !== proverb[idx]) {
            // only allow erasing non-given typed letters: track givens implicitly by match
          }
        }
      };
      document.addEventListener("keydown", onKey);
      root.querySelector("#hp-hint").addEventListener("click", hint);
      root.querySelector("#hp-new").addEventListener("click", generate);

      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Hidden Proverb",
        `A proverb is missing some of its letters. <b>Click a blank</b> (or just start typing) to fill letters in —
        correct letters lock green, wrong ones stay grey so you can overwrite them.
        <br><br>💡 <b>Reveal a letter</b> gives you three free letters per proverb.
        Complete every letter correctly to win and unlock the next saying.`);
    },
  });
})();
