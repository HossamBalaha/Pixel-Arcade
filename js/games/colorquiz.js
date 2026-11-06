/* Color Quiz — shown a color swatch, pick its name from 4 choices. */
(function () {
  const COLORS = [
    {name: "Crimson", hex: "#dc143c"},
    {name: "Coral", hex: "#ff7f50"},
    {name: "Goldenrod", hex: "#daa520"},
    {name: "Olive", hex: "#808000"},
    {name: "Teal", hex: "#008080"},
    {name: "Indigo", hex: "#4b0082"},
    {name: "Magenta", hex: "#ff00ff"},
    {name: "Maroon", hex: "#800000"},
    {name: "Salmon", hex: "#fa8072"},
    {name: "Turquoise", hex: "#40e0d0"},
    {name: "Lavender", hex: "#e6e6fa"},
    {name: "Chartreuse", hex: "#7fff00"},
    {name: "Periwinkle", hex: "#ccccff"},
    {name: "Burgundy", hex: "#800020"},
    {name: "Amber", hex: "#ffbf00"},
    {name: "Slate", hex: "#708090"},
    {name: "Cerulean", hex: "#007ba7"},
    {name: "Mauve", hex: "#e0b0ff"},
    {name: "Cyan", hex: "#00ffff"},
    {name: "Azure", hex: "#007fff"},
    {name: "Cobalt", hex: "#0047ab"},
    {name: "Carmine", hex: "#960018"},
    {name: "Vermilion", hex: "#e34234"},
    {name: "Ruby", hex: "#9b111e"},
    {name: "Rose", hex: "#ff007f"},
    {name: "Blush", hex: "#de5d83"},
    {name: "Fuchsia", hex: "#ff00ff"},
    {name: "Plum", hex: "#8e4585"},
    {name: "Violet", hex: "#7f00ff"},
    {name: "Lilac", hex: "#c8a2c8"},
    {name: "Orchid", hex: "#da70d6"},
    {name: "Amethyst", hex: "#9966cc"},
    {name: "Emerald", hex: "#50c878"},
    {name: "Jade", hex: "#00a86b"},
    {name: "Mint", hex: "#98ff98"},
    {name: "Lime", hex: "#bfff00"},
    {name: "Forest", hex: "#228b22"},
    {name: "Sage", hex: "#9caf88"},
    {name: "Khaki", hex: "#c3b091"},
    {name: "Bronze", hex: "#cd7f32"},
    {name: "Copper", hex: "#b87333"},
    {name: "Rust", hex: "#b7410e"},
    {name: "Chestnut", hex: "#954535"},
    {name: "Mahogany", hex: "#c04000"},
    {name: "Sand", hex: "#e2ca99"},
    {name: "Beige", hex: "#e6d7b8"},
    {name: "Ivory", hex: "#fffff0"},
    {name: "Cream", hex: "#fffdd0"},
    {name: "Pearl", hex: "#eae0c8"},
    {name: "Vanilla", hex: "#f3e5ab"},
    {name: "Onyx", hex: "#0f0f0f"},
    {name: "Charcoal", hex: "#36454f"},
    {name: "Slate Gray", hex: "#708090"},
    {name: "Steel", hex: "#4682b4"},
    {name: "Powder Blue", hex: "#b0e0e6"},
    {name: "Sky Blue", hex: "#87ceeb"},
    {name: "Navy", hex: "#000080"},
    {name: "Cobalt Blue", hex: "#0047ab"},
    {name: "Midnight", hex: "#191970"},
    {name: "Denim", hex: "#1560bd"},
    {name: "Prussian", hex: "#003153"},
    {name: "Mustard", hex: "#ffdb58"},
    {name: "Saffron", hex: "#f4c430"},
    {name: "Marigold", hex: "#eaa221"},
    {name: "Apricot", hex: "#fbceb1"},
    {name: "Peach", hex: "#ffe5b4"},
    {name: "Cantaloupe", hex: "#ffdd89"},
  ];
  const PER = 10;
  let live = null;
  GameRegistry.register({
    id: "colorquiz",
    name: "Color Quiz",
    icon: "🎨",
    category: "quiz",
    description: "Identify the color name from a swatch",
    tags: ["quiz", "colors", "trivia"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="cq-q">1/${PER}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="cq-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cq-best">—</div></div>
        </div>
        <div class="status info" id="cq-status">What's the name of this color?</div>
        <div id="cq-swatch" style="width:180px;height:120px;border-radius:var(--radius);margin:18px auto;border:2px solid var(--border);box-shadow:0 4px 16px rgba(0,0,0,0.2);"></div>
        <div id="cq-opts" class="col" style="gap:8px;max-width:380px;margin:0 auto;"></div>
      `;
      const statusEl = root.querySelector("#cq-status");
      const swatchEl = root.querySelector("#cq-swatch");
      const optsEl = root.querySelector("#cq-opts");

      function makeQuestion() {
        const correct = COLORS[Math.floor(Math.random() * COLORS.length)];
        const wrong = COLORS.filter(c => c.name !== correct.name).sort(() => Math.random() - 0.5).slice(0, 3);
        const opts = [correct, ...wrong].sort(() => Math.random() - 0.5);
        return {correct, opts, a: opts.indexOf(correct)};
      }

      function render() {
        if (idx >= qs.length) {
          finish();
          return;
        }
        const cur = qs[idx];
        swatchEl.style.background = cur.correct.hex;
        optsEl.innerHTML = "";
        cur.opts.forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "btn";
          b.textContent = o.name;
          b.style.cssText = "padding:12px;text-align:left;";
          b.addEventListener("click", () => answer(i, b));
          optsEl.appendChild(b);
        });
        root.querySelector("#cq-q").textContent = `${idx + 1}/${PER}`;
        root.querySelector("#cq-score").textContent = score;
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
          statusEl.textContent = `✗ Answer: "${cur.opts[cur.a].name}".`;
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
        swatchEl.style.background = "var(--success)";
        optsEl.innerHTML = "";
        const best = Storage.getBest("colorquiz");
        if (!best || score > best) {
          Storage.setBest("colorquiz", score);
          root.querySelector("#cq-best").textContent = score;
          App.toast("New best: " + score, "success");
        }
        const r = document.createElement("button");
        r.className = "btn primary";
        r.textContent = "Play again";
        r.addEventListener("click", newRound);
        optsEl.appendChild(r);
      }

      function newRound() {
        qs = Array.from({length: PER}, () => makeQuestion());
        idx = 0;
        score = 0;
        answered = false;
        root.querySelector("#cq-best").textContent = Storage.getBest("colorquiz") || "—";
        statusEl.textContent = "What's the name of this color?";
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
      App.showModal("How to play Color Quiz",
        `A color swatch appears. Pick the matching name from 4 choices.
        <br><br>${10} rounds, 10 points each. Some colors are tricky — burgundy vs maroon? chartreuse vs olive?`);
    },
  });
})();
