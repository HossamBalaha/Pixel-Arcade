/* Solitaire — simplified Klondike patience. Draw cards, build 4 foundation piles by suit. */
(function () {
  const SUITS = ["♠", "♥", "♦", "♣"];
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const RED = ["♥", "♦"];

  function isRed(suit) {
    return RED.includes(suit);
  }

  function newDeck() {
    const d = [];
    for (const s of SUITS) for (let i = 0; i < RANKS.length; i++) {
      d.push({suit: s, rank: RANKS[i], val: i + 1, faceUp: false});
    }
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  let live = null;
  GameRegistry.register({
    id: "solitaire",
    name: "Solitaire",
    icon: "♠️",
    category: "strategy",
    description: "Klondike patience — build foundations by suit",
    tags: ["strategy", "cards", "classic"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "long",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let stock = [], waste = [], foundations = [[], [], [], []], tableau = [[], [], [], [], [], [], []], over = false;
      let moves = 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="sl-moves">0</div></div>
          <div class="score-cell"><div class="label">Foundation</div><div class="val" id="sl-found">0 / 52</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sl-best">—</div></div>
        </div>
        <div class="status info" id="sl-status">Click the stock to draw. Build foundations A→K by suit.</div>
        <div class="center" style="margin:14px 0;"><div id="sl-board" class="sl-board"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="sl-new">New game</button>
        </div>
        <p class="hint">Click <b>stock</b> (top-left) to flip a card. Click a card to send it to a foundation if valid. Build tableau down by alternating colors.</p>
      `;
      const statusEl = root.querySelector("#sl-status");
      const boardEl = root.querySelector("#sl-board");
      if (!document.getElementById("sl-style")) {
        const s = document.createElement("style");
        s.id = "sl-style";
        s.textContent = `
          .sl-board { background: var(--bg-soft); padding: 10px; border-radius: var(--radius); display: inline-grid; grid-template-columns: repeat(7, 60px); gap: 6px; min-width: 460px; }
          .sl-pile { width: 60px; min-height: 84px; border: 1px dashed var(--border); border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 2px; }
          .sl-card { width: 60px; height: 80px; border-radius: var(--radius-sm); background: var(--bg-elev); border: 1px solid var(--border); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; cursor: pointer; user-select: none; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
          .sl-card.face-down { background: var(--accent); color: var(--accent); }
          .sl-card.face-down::after { content: "♠"; color: rgba(255,255,255,0.5); font-size: 1.6rem; }
          .sl-card.red { color: var(--danger); }
          .sl-card.black { color: var(--text); }
          .sl-empty { color: var(--text-muted); font-size: 1.5rem; }
        `;
        document.head.appendChild(s);
      }

      function deal() {
        const deck = newDeck();
        for (let i = 0; i < 7; i++) {
          tableau[i] = [];
          for (let j = 0; j <= i; j++) {
            const c = deck.pop();
            c.faceUp = (j === i);
            tableau[i].push(c);
          }
        }
        stock = deck;
        stock.forEach(c => c.faceUp = false);
        waste = [];
        foundations = [[], [], [], []];
        moves = 0;
        over = false;
      }

      function canPlaceFoundation(card, fIdx) {
        const f = foundations[fIdx];
        if (f.length === 0) return card.val === 1; // Ace
        const top = f[f.length - 1];
        return card.suit === top.suit && card.val === top.val + 1;
      }

      function canPlaceTableau(card, tIdx) {
        const t = tableau[tIdx];
        if (t.length === 0) return card.val === 13; // King
        const top = t[t.length - 1];
        if (!top.faceUp) return false;
        return isRed(card.suit) !== isRed(top.suit) && card.val === top.val - 1;
      }

      function sendToFoundation(card, fromPile, fromIdx) {
        for (let f = 0; f < 4; f++) {
          if (canPlaceFoundation(card, f)) {
            // Remove from source
            if (fromPile === "waste") waste.pop();
            else if (fromPile === "tableau") tableau[fromIdx].pop();
            // Flip new top of tableau if face-down
            if (fromPile === "tableau" && tableau[fromIdx].length > 0) {
              const top = tableau[fromIdx][tableau[fromIdx].length - 1];
              if (!top.faceUp) top.faceUp = true;
            }
            foundations[f].push(card);
            moves++;
            AudioFX.pop();
            checkWin();
            return true;
          }
        }
        return false;
      }

      function drawFromStock() {
        if (stock.length === 0) {
          // Recycle waste back to stock
          stock = waste.slice().reverse();
          stock.forEach(c => c.faceUp = false);
          waste = [];
          AudioFX.click();
        } else {
          const c = stock.pop();
          c.faceUp = true;
          waste.push(c);
          AudioFX.flip();
        }
        moves++;
        render();
      }

      function checkWin() {
        const total = foundations.reduce((s, f) => s + f.length, 0);
        root.querySelector("#sl-found").textContent = `${total} / 52`;
        root.querySelector("#sl-moves").textContent = moves;
        if (total === 52) {
          over = true;
          AudioFX.win();
          statusEl.textContent = `🎉 You won in ${moves} moves!`;
          statusEl.className = "status win";
          const best = Storage.getBest("solitaire");
          if (!best || moves < best) {
            Storage.setBest("solitaire", moves);
            root.querySelector("#sl-best").textContent = moves;
            App.toast("New best: " + moves + " moves", "success");
          }
        }
      }

      function render() {
        boardEl.innerHTML = "";
        // Row 1: stock, waste, gap, 4 foundations
        const stockEl = document.createElement("div");
        stockEl.className = "sl-pile";
        const stockCard = document.createElement("div");
        stockCard.className = "sl-card face-down";
        if (stock.length === 0) {
          stockCard.classList.remove("face-down");
          stockCard.classList.add("sl-empty");
          stockCard.textContent = "↻";
        }
        stockCard.addEventListener("click", drawFromStock);
        stockEl.appendChild(stockCard);
        boardEl.appendChild(stockEl);
        // Waste
        const wasteEl = document.createElement("div");
        wasteEl.className = "sl-pile";
        if (waste.length > 0) {
          const top = waste[waste.length - 1];
          const cardEl = makeCard(top);
          cardEl.addEventListener("click", () => sendToFoundation(top, "waste"));
          wasteEl.appendChild(cardEl);
        }
        boardEl.appendChild(wasteEl);
        // Empty placeholder
        const gap = document.createElement("div");
        boardEl.appendChild(gap);
        // 4 foundations
        for (let f = 0; f < 4; f++) {
          const fEl = document.createElement("div");
          fEl.className = "sl-pile";
          if (foundations[f].length > 0) {
            const top = foundations[f][foundations[f].length - 1];
            fEl.appendChild(makeCard(top));
          } else {
            const ph = document.createElement("div");
            ph.className = "sl-card sl-empty";
            ph.textContent = SUITS[f];
            ph.style.opacity = "0.3";
            fEl.appendChild(ph);
          }
          boardEl.appendChild(fEl);
        }
        // Row 2: 7 tableau piles
        for (let t = 0; t < 7; t++) {
          const tEl = document.createElement("div");
          tEl.className = "sl-pile";
          if (tableau[t].length === 0) {
            const ph = document.createElement("div");
            ph.className = "sl-card sl-empty";
            ph.textContent = "";
            ph.style.opacity = "0.3";
            tEl.appendChild(ph);
          } else {
            tableau[t].forEach((c, i) => {
              const cardEl = makeCard(c);
              if (c.faceUp && i === tableau[t].length - 1) {
                cardEl.addEventListener("click", () => {
                  // Try foundation first, then tableau
                  if (!sendToFoundation(c, "tableau", t)) {
                    // Try moving to another tableau pile
                    for (let t2 = 0; t2 < 7; t2++) {
                      if (t2 === t) continue;
                      if (canPlaceTableau(c, t2)) {
                        tableau[t].pop();
                        tableau[t2].push(c);
                        if (tableau[t].length > 0) {
                          const top = tableau[t][tableau[t].length - 1];
                          if (!top.faceUp) top.faceUp = true;
                        }
                        moves++;
                        AudioFX.place();
                        render();
                        return;
                      }
                    }
                  } else {
                    render();
                  }
                });
              }
              tEl.appendChild(cardEl);
            });
          }
          // Position the tableau pile in the second row
          boardEl.appendChild(tEl);
        }
        checkWin();
      }

      function makeCard(c) {
        const el = document.createElement("div");
        el.className = "sl-card" + (c.faceUp ? (isRed(c.suit) ? " red" : " black") : " face-down");
        if (c.faceUp) el.textContent = c.rank + c.suit;
        return el;
      }

      root.querySelector("#sl-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });

      function newGame() {
        deal();
        const best = Storage.getBest("solitaire");
        root.querySelector("#sl-best").textContent = best || "—";
        statusEl.textContent = "Click the stock to draw. Build foundations A→K by suit.";
        statusEl.className = "status info";
        render();
      }

      live = {};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play Solitaire",
        `<b>Goal:</b> build up the four foundation piles from Ace to King by suit.
        <br><br><b>Stock:</b> click the top-left pile to flip cards to the waste pile. When stock is empty, click again to recycle waste back to stock.
        <br><br><b>Tableau:</b> build down by alternating colors (e.g. red 6 on black 7). Click a face-up top card to:
        <br>• send it to a foundation (if valid), or
        <br>• move it to another tableau pile (if valid).
        <br><br>Empty tableau slots accept Kings only.`);
    },
  });
})();
