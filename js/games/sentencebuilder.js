/* Sentence Builder — click the words in order to rebuild the sentence */
(function () {
  GameRegistry.register({
    id: "sentencebuilder",
    name: "Sentence Builder",
    icon: "🧱",
    category: "word",
    description: "Click the words in order to rebuild the sentence",
    tags: ["word", "grammar", "ordering"],
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
      const SENTENCES = [
        "The quick brown fox jumps over the lazy dog",
        "Knowledge is power but enthusiasm pulls the switch",
        "A journey of a thousand miles begins with a single step",
        "All that we see or seem is but a dream within a dream",
        "To be or not to be that is the question",
        "The only thing we have to fear is fear itself",
        "In the middle of difficulty lies opportunity",
        "Life is what happens when you are busy making other plans",
        "The best way to predict the future is to invent it",
        "Simplicity is the ultimate sophistication",
        "Not all those who wander are lost",
        "The pen is mightier than the sword",
        "Fortune favors the bold",
        "Actions speak louder than words",
        "Where there is a will there is a way",
        "Time flies like an arrow fruit flies like a banana",
        "Practice makes perfect but nobody is perfect",
        "Early to bed and early to rise makes a man healthy",
        "An apple a day keeps the doctor away",
        "Rome was not built in a day",
      ];
      let sentence, order, picked, solvedCount, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="sb2-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sb2-best">0</div></div>
        </div>
        <div class="status info" id="sb2-status">Tap the words in the right order to rebuild the sentence</div>
        <div class="center" id="sb2-answer" style="min-height:44px;margin:10px 0;padding:10px;border-radius:10px;background:var(--bg-soft,#334155);"></div>
        <div class="center" id="sb2-bank"></div>
        <div class="row gap-2" style="justify-content:center;margin-top:10px;">
          <button class="btn btn-sm" id="sb2-undo">↩ Undo</button>
          <button class="btn btn-sm" id="sb2-skip">⏭ Skip</button>
        </div>
        <p class="hint">Next expected word: highlighted in gold? No — that would be too easy. Trust your grammar!</p>
      `;

      const answerEl = root.querySelector("#sb2-answer");
      const bankEl = root.querySelector("#sb2-bank");
      const statusEl = root.querySelector("#sb2-status");
      best = Storage.getBest("sentencebuilder") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        .sb2-word { padding:8px 13px; margin:4px; border-radius:8px; background:var(--bg-inset,#1f2937);
                    color:var(--text,#eee); font-size:16px; font-weight:600; cursor:pointer; display:inline-block;
                    border:2px solid transparent; user-select:none; }
        .sb2-word.used { opacity:0.25; pointer-events:none; }
        .sb2-word.nope { border-color:#ef4444; animation:sb2shake .3s; }
        @keyframes sb2shake { 25% { transform:translateX(-4px);} 75% { transform:translateX(4px);} }
        .sb2-chip { padding:7px 12px; margin:3px; border-radius:8px; background:#16a34a; color:#fff;
                    font-size:16px; font-weight:600; display:inline-block; }
      `;
      root.appendChild(style);

      function generate() {
        sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
        const words = sentence.split(" ");
        order = words.slice().sort(() => Math.random() - 0.5);
        picked = [];
        statusEl.textContent = "Tap the words in the right order to rebuild the sentence";
        statusEl.className = "status info";
        render();
      }

      function pick(i) {
        const word = order[i];
        const expected = sentence.split(" ")[picked.length];
        if (word === expected) {
          picked.push(word);
          AudioFX.pop();
          render();
          if (picked.length === sentence.split(" ").length) {
            AudioFX.win();
            solvedCount++;
            if (solvedCount > best) {
              best = solvedCount;
              Storage.setBest("sentencebuilder", best);
            }
            statusEl.textContent = "🧱 Sentence rebuilt! Next one…";
            statusEl.className = "status win";
            after(generate, 1400);
          }
        } else {
          AudioFX.error();
          const el = bankEl.children[i];
          if (el) {
            el.classList.add("nope");
            after(() => el.classList.remove("nope"), 350);
          }
        }
      }

      function undo() {
        if (picked.length) {
          picked.pop();
          AudioFX.click();
          render();
        }
      }

      function render() {
        root.querySelector("#sb2-solved").textContent = solvedCount;
        root.querySelector("#sb2-best").textContent = best;
        answerEl.innerHTML = picked.map(w => `<span class="sb2-chip">${w}</span>`).join(" ");
        bankEl.innerHTML = "";
        order.forEach((w, i) => {
          const usedCount = picked.filter(p => p === w).length;
          const totalOf = order.filter(o => o === w).length;
          const usedUp = (order.slice(0, i + 1).filter(o => o === w).length) <= usedCount;
          const el = document.createElement("div");
          el.className = "sb2-word" + (usedUp ? " used" : "");
          el.textContent = w;
          el.addEventListener("pointerdown", () => pick(i));
          bankEl.appendChild(el);
        });
      }

      root.querySelector("#sb2-undo").addEventListener("click", undo);
      root.querySelector("#sb2-skip").addEventListener("click", generate);

      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Sentence Builder",
        `The words of a famous saying or proverb are scattered below. Click them in the <b>correct order</b> to
        rebuild the sentence — wrong words just shake, right ones stack up top.
        <br><br><b>↩ Undo</b> removes the last word; <b>⏭ Skip</b> draws a fresh sentence. Twenty classics to rebuild.`);
    },
  });
})();
