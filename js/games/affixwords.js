/* Prefix & Suffix — grow the root word with affixes */
(function () {
  GameRegistry.register({
    id: "affixwords",
    name: "Prefix & Suffix",
    icon: "🔗",
    category: "word",
    description: "Grow the root word with prefixes and suffixes",
    tags: ["word", "prefixes", "vocabulary"],
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
      const DATA = [
        {root: "AGREE", pre: ["DIS"], suf: ["MENT", "ABLE"], target: "DISAGREEMENT"},
        {root: "HOPE", pre: [], suf: ["FUL", "LESS"], target: "HOPEFUL"},
        {root: "ACT", pre: ["RE", "INTER"], suf: ["ION", "IVE"], target: "INTERACTION"},
        {root: "PORT", pre: ["IM", "EX", "TRANS"], suf: ["ABLE"], target: "IMPORTABLE"},
        {root: "VIEW", pre: ["PRE", "RE", "OVER"], suf: ["ER", "ABLE"], target: "PREVIEW"},
        {root: "WRITE", pre: ["RE", "OVER", "UNDER"], suf: ["ER", "TEN"], target: "REWRITTEN"},
        {root: "PLAY", pre: ["RE", "OUT", "OVER"], suf: ["ER", "FUL"], target: "PLAYER"},
        {root: "FORM", pre: ["RE", "UN", "DE"], suf: ["ATION", "ED"], target: "REFORMATION"},
        {root: "CARE", pre: [], suf: ["FUL", "LESS", "ER"], target: "CARELESS"},
        {root: "READ", pre: ["RE", "MIS"], suf: ["ER", "ABLE"], target: "READABLE"},
        {root: "TRUST", pre: ["DIS", "EN"], suf: ["ED", "FUL", "EE"], target: "DISTRUST"},
        {root: "HELP", pre: ["UN"], suf: ["FUL", "ER", "LESS"], target: "UNHELPFUL"},
        {root: "COUNT", pre: ["RE", "AC"], suf: ["ER", "ABLE", "LESS"], target: "ACCOUNTABLE"},
        {root: "SENSE", pre: ["NON"], suf: ["ABLE", "LESS"], target: "NONSENSE"},
        {root: "USE", pre: ["RE", "OVER", "MIS"], suf: ["FUL", "LESS", "R"], target: "USEFUL"},
      ];
      let item, chosen, score, best, solvedCount;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="af-score">0</div></div>
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="af-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="af-best">0</div></div>
        </div>
        <div class="status info" id="af-status">Build the target word by attaching one affix at a time</div>
        <div class="center" id="af-build" style="font-size:24px;font-weight:800;letter-spacing:2px;margin:12px 0;"></div>
        <div class="center" id="af-pieces"></div>
        <p class="hint">Prefixes bolt on the left, suffixes on the right. One piece per side!</p>
      `;

      const buildEl = root.querySelector("#af-build");
      const piecesEl = root.querySelector("#af-pieces");
      const statusEl = root.querySelector("#af-status");
      best = Storage.getBest("affixwords") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        .af-piece { padding:10px 14px; margin:4px; border-radius:8px; background:var(--bg-soft,#334155);
                    color:var(--text,#eee); font-weight:700; cursor:pointer; font-size:15px; border:2px solid transparent; }
        .af-piece:hover { border-color:var(--accent,#6366f1); }
        .af-piece.used { opacity:0.25; pointer-events:none; }
        .af-piece.pre { border-bottom:3px solid #f59e0b; }
        .af-piece.suf { border-bottom:3px solid #3b82f6; }
      `;
      root.appendChild(style);

      function generate() {
        item = DATA[Math.floor(Math.random() * DATA.length)];
        // remaining pieces: all prefixes not yet used + all suffixes not yet used
        chosen = {pre: null, suf: null};
        statusEl.textContent = `Build: <b>${item.target}</b> from ${item.root}`;
        statusEl.className = "status info";
        render();
      }

      function apply(kind, piece) {
        if (kind === "pre") chosen.pre = chosen.pre === piece ? null : piece;
        else chosen.suf = chosen.suf === piece ? null : piece;
        AudioFX.pop();
        render();
        const built = (chosen.pre || "") + item.root + (chosen.suf || "");
        if (built === item.target) {
          score += 25;
          solvedCount++;
          AudioFX.win();
          if (score > best) {
            best = score;
            Storage.setBest("affixwords", score);
          }
          statusEl.textContent = `🔗 ${built} — perfect morphological construction!`;
          statusEl.className = "status win";
          updateHud();
          after(generate, 1600);
        }
      }

      function updateHud() {
        root.querySelector("#af-score").textContent = score;
        root.querySelector("#af-solved").textContent = solvedCount;
        root.querySelector("#af-best").textContent = best;
      }

      function render() {
        updateHud();
        const pre = chosen.pre || "";
        const suf = chosen.suf || "";
        buildEl.innerHTML = `<span style="color:#f59e0b;">${pre}</span><span style="border-bottom:3px solid var(--accent,#6366f1);padding:0 4px;">${item.root}</span><span style="color:#3b82f6;">${suf}</span>`;
        piecesEl.innerHTML = "";
        const preOpts = item.pre.filter(p => p !== chosen.pre);
        const sufOpts = item.suf.filter(s => s !== chosen.suf);
        const showPre = chosen.pre ? [chosen.pre, ...preOpts] : preOpts;
        const showSuf = chosen.suf ? [chosen.suf, ...sufOpts] : sufOpts;
        showPre.forEach(p => {
          const b = document.createElement("div");
          b.className = "af-piece pre" + (chosen.pre === p ? " used" : "");
          b.textContent = p + "−";
          b.addEventListener("pointerdown", () => apply("pre", p));
          piecesEl.appendChild(b);
        });
        const rootChip = document.createElement("div");
        rootChip.className = "af-piece";
        rootChip.style.borderBottom = "3px solid var(--accent,#6366f1)";
        rootChip.textContent = item.root;
        piecesEl.appendChild(rootChip);
        showSuf.forEach(s => {
          const b = document.createElement("div");
          b.className = "af-piece suf" + (chosen.suf === s ? " used" : "");
          b.textContent = "−" + s;
          b.addEventListener("pointerdown", () => apply("suf", s));
          piecesEl.appendChild(b);
        });
      }

      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Prefix & Suffix",
        `Word surgery! Take the <b>root</b> in the middle and attach:
        <br>• a <b style="color:#f59e0b">prefix</b> (orange chips) to the front — dis-, re-, un-, pre-…
        <br>• a <b style="color:#3b82f6">suffix</b> (blue chips) to the end — -ment, -ful, -able…
        <br><br>Click chips to attach or detach them and build the <b>target word</b> shown in the status bar.
        Morphology has never been this hands-on. +25 per construction.`);
    },
  });
})();
