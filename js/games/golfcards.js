/* Golf (cards) — clear the columns by playing one rank up or down */
(function () {
  GameRegistry.register({
    id: "golfcards",
    name: "Golf",
    icon: "🏌️",
    category: "strategy",
    description: "Clear the columns by playing one rank up or down",
    tags: ["strategy", "cards", "solitaire"],
    mount: function (root, {App, AudioFX, Storage}) {
      const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
      const SUITS = ["♠", "♥", "♦", "♣"];
      let cols, waste, stock, won, score, best;
      let justDealt = false, dIdx = 0; // deal-in animation

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Remaining</div><div class="val" id="gc-left">35</div></div>
          <div class="score-cell"><div class="label">Stock</div><div class="val" id="gc-stock">17</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="gc-best">0</div></div>
        </div>
        <div class="status info" id="gc-status">Play one rank above or below the waste card — K is high, A is low, Q↔K no wrap</div>
        <div class="center" id="gc-board"></div>
        <p class="hint">Runs of consecutive plays multiply your streak — literally golf: lowest score wins!</p>
      `;

      const boardEl = root.querySelector("#gc-board");
      const statusEl = root.querySelector("#gc-status");
      best = Storage.getBest("golfcards") || 0;

      const style = document.createElement("style");
      style.textContent = `
        .gc-col { display:inline-flex; flex-direction:column; align-items:center; vertical-align:top; margin:0 4px; }
        .gc-card { width:46px; height:64px; border-radius:7px; background:#f8fafc; font-weight:800; font-size:14px;
                   text-align:center; padding-top:6px; margin-top:-46px; cursor:pointer; border:2px solid #cbd5e1;
                   position:relative; z-index:1; }
        .gc-card:first-child { margin-top:0; }
        .gc-card.red { color:#dc2626; } .gc-card.blk { color:#0f172a; }
        .gc-card.back { background:#1e3a8a; color:#93c5fd; cursor:pointer; }
      `;
      root.appendChild(style);

      function deal() {
        const deck = [];
        RANKS.forEach(r => SUITS.forEach(s => deck.push({r, s})));
        deck.sort(() => Math.random() - 0.5);
        cols = [];
        for (let i = 0; i < 7; i++) cols.push(deck.splice(0, 5));
        stock = deck.splice(0, 17);
        waste = [stock.pop()];
        won = null;
        score = 0;
        justDealt = true;
        render();
      }

      function canPlay(c) {
        const top = waste[waste.length - 1];
        const d = Math.abs(RANKS.indexOf(c.r) - RANKS.indexOf(top.r));
        return d === 1; // no wrap (K-A not adjacent)
      }

      function play(col) {
        if (won) return;
        const c = cols[col][cols[col].length - 1];
        if (!c || !canPlay(c)) {
          AudioFX.error();
          return;
        }
        cols[col].pop();
        waste.push(c);
        score++;
        AudioFX.pop();
        checkWin();
        render();
      }

      function drawStock() {
        if (won) return;
        if (!stock.length) {
          AudioFX.error();
          return;
        }
        waste.push(stock.pop());
        AudioFX.flip();
        render();
      }

      function checkWin() {
        const left = cols.reduce((s, c) => s + c.length, 0);
        if (left === 0) {
          won = true;
          AudioFX.win();
          // golf scoring: remaining stock + cards left is bad; cleared = great
          const strokes = score + stock.length;
          statusEl.textContent = `🏌️ Course cleared in ${strokes} strokes!`;
          statusEl.className = "status win";
          if (strokes < best || best === 0) {
            best = strokes;
            Storage.setBest("golfcards", strokes);
            App.toast("New best: " + strokes + " strokes!", "success");
          }
        }
      }

      function render() {
        const left = cols.reduce((s, c) => s + c.length, 0);
        root.querySelector("#gc-left").textContent = left;
        root.querySelector("#gc-stock").textContent = stock.length;
        root.querySelector("#gc-best").textContent = best || "—";
        boardEl.innerHTML = "";
        cols.forEach((col, i) => {
          const el = document.createElement("div");
          el.className = "gc-col";
          col.forEach((c, k) => {
            const isTop = k === col.length - 1;
            const card = document.createElement("div");
            const can = isTop && canPlay(c) && !won;
            card.className = `gc-card ${(c.s === "♥" || c.s === "♦") ? "red" : "blk"}`;
            card.style.cssText += can ? "border-color:#16a34a;" : (isTop ? "" : "filter:brightness(0.8);");
            card.innerHTML = `${c.r}<br>${c.s}`;
            if (justDealt) {
              card.classList.add("deal-in");
              card.style.animationDelay = Math.min(dIdx++ * 22, 650) + "ms";
            }
            if (isTop && !won) card.addEventListener("pointerdown", () => play(i));
            el.appendChild(card);
          });
          boardEl.appendChild(el);
        });
        // waste + stock
        const top = waste[waste.length - 1];
        boardEl.insertAdjacentHTML("beforeend", `
          <div style="display:block;margin-top:16px;text-align:center;">
            <div class="gc-card back" id="gc-stockc" style="display:inline-block;margin-right:16px;">${stock.length}<br>♠</div>
            <div class="gc-card ${(top.s === "♥" || top.s === "♦") ? "red" : "blk"}" style="display:inline-block;border-color:#64748b;">${top.r}<br>${top.s}</div>
            ${won ? `<button class="btn btn-sm primary" id="gc-again" style="margin-left:14px;vertical-align:middle;">↻ Play again</button>` : ""}
          </div>
        `);
        boardEl.querySelector("#gc-stockc").addEventListener("pointerdown", drawStock);
        if (won) boardEl.querySelector("#gc-again").addEventListener("click", deal);
        if (justDealt) {
          justDealt = false;
          dIdx = 0;
        }
      }

      deal();
      return function cleanup() {
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Golf",
        `Seven columns of five cards. The top card of the <b>waste pile</b> is your target —
        remove column tops that are exactly <b>one rank higher or lower</b> (suits irrelevant; no K→A wrap).
        Every removal becomes the new target, building <b>runs</b>.
        <br><br>Stuck? Draw from the <b>stock</b> (17 cards) to flip a new target.
        Clear all 35 column cards to finish; your <b>stroke count</b> (plays + leftover stock) is your golf score —
        lower is better.`);
    },
  });
})();
