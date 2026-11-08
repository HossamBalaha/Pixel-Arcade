/* videopoker — Jacks or Better 5-card draw: hold, draw, payout table. */
(function () {
  "use strict";
  GameRegistry.register({
    id: "videopoker", name: "Video Poker", icon: "🎰", category: "strategy",
    description: "Jacks or Better — hold cards, draw, and hit the paytable", tags: ["cards", "casino", "poker"],
    age: ["adults"], difficulty: "easy", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      const SUITS = ["♠", "♥", "♦", "♣"], RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
      const PAYS = [ // [name, test, payout multiplier]
        ["Royal Flush", h => h.rk[0] === 12 && h.flush && h.straight, 250],
        ["Straight Flush", h => h.flush && h.straight, 50],
        ["Four of a Kind", h => h.of4, 25],
        ["Full House", h => h.of3 && h.pair, 9],
        ["Flush", h => h.flush, 6],
        ["Straight", h => h.straight, 4],
        ["Three of a Kind", h => h.of3, 3],
        ["Two Pair", h => h.pairs === 2, 2],
        ["Jacks or Better", h => h.pair && h.pairRank >= 9, 1],
      ];
      let deck = [], hand = [], held = [false, false, false, false, false];
      let credits = 100, bet = 5, phase = "bet", alive = true;

      function newDeck() {
        deck = [];
        for (const s of SUITS) RANKS.forEach((r, i) => deck.push({r, s, i}));
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
      }

      function analyze(cards) {
        const idx = cards.map(c => c.i).sort((a, b) => a - b);
        const counts = {};
        for (const c of cards) counts[c.i] = (counts[c.i] || 0) + 1;
        const vals = Object.values(counts);
        const h = {
          flush: cards.every(c => c.s === cards[0].s),
          of4: vals.includes(4),
          of3: vals.includes(3),
          pairs: vals.filter(v => v === 2).length,
          pair: vals.includes(2),
          pairRank: +Object.keys(counts).find(k => counts[k] === 2) || -1,
        };
        h.straight = idx.length === 5 && (idx[4] - idx[0] === 4 || JSON.stringify(idx) === "[0,1,2,3,12]");
        return h;
      }

      function payout(cards) {
        const h = analyze(cards);
        for (const [name, test, mult] of PAYS) if (test(h)) return {name, mult};
        return null;
      }

      function deal() {
        if (credits < bet) {
          App.toast("Out of credits — reset your bank", "warning");
          return;
        }
        credits -= bet;
        newDeck();
        hand = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
        held = [false, false, false, false, false];
        phase = "draw";
        AudioFX.click();
        setStatus("Tap cards to HOLD, then Draw.");
        render();
      }

      function draw() {
        for (let i = 0; i < 5; i++) if (!held[i]) hand[i] = deck.pop() || (newDeck(), deck.pop());
        phase = "bet";
        const p = payout(hand);
        if (p) {
          credits += bet * p.mult;
          setStatus(`🎉 ${p.name} — pays ${bet}×${p.mult} = ${bet * p.mult}!`, "win");
          AudioFX.win();
          App.recordResult(true, p.mult);
        } else {
          setStatus("No pair of jacks or better — try again!", "lose");
          AudioFX.lose();
          App.recordResult(false, 0);
        }
        render();
      }

      function setStatus(t, cls) {
        const st = root.querySelector("#vp-status");
        if (st) {
          st.textContent = t;
          st.className = "status " + (cls || "info");
        }
      }

      root.innerHTML = `
        <style>
          .vp-cards { display: flex; gap: 8px; justify-content: center; margin: 12px 0; flex-wrap: wrap; }
          .vp-card { width: 64px; height: 92px; border-radius: 8px; background: #fff; color: #0f172a;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            font-size: 1.3rem; font-weight: 800; border: 3px solid transparent; cursor: pointer; user-select: none; }
          .vp-card.red { color: #dc2626; }
          .vp-card.held { border-color: #f59e0b; box-shadow: 0 0 8px #f59e0b88; }
          .vp-card .vp-hold { font-size: .65rem; color: #b45309; letter-spacing: 1px; }
          .vp-table { font-size: .8rem; opacity: .85; margin: 8px auto; width: min(340px, 90%); text-align: left; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Credits</div><div class="val" id="vp-cr">100</div></div>
          <div class="score-cell"><div class="label">Bet</div><div class="val" id="vp-bet">5</div></div>
          <div class="score-cell"><div class="label">Last</div><div class="val" id="vp-last">—</div></div>
        </div>
        <div class="status info" id="vp-status">Place your bet and deal!</div>
        <div class="vp-cards" id="vp-cards"></div>
        <div class="row" style="justify-content:center; gap:8px;">
          <button class="btn" id="vp-less">−</button>
          <button class="btn primary" id="vp-deal">Deal</button>
          <button class="btn" id="vp-more">+</button>
        </div>
        <table class="vp-table">
          <tr><td>Royal Flush 250×</td><td>Straight Flush 50×</td><td>4 of a Kind 25×</td></tr>
          <tr><td>Full House 9×</td><td>Flush 6×</td><td>Straight 4×</td></tr>
          <tr><td>3 of a Kind 3×</td><td>Two Pair 2×</td><td>Jacks or Better 1×</td></tr>
        </table>
      `;

      function render() {
        const cr = root.querySelector("#vp-cr"), bEl = root.querySelector("#vp-bet");
        if (cr) cr.textContent = credits;
        if (bEl) bEl.textContent = bet;
        const el = root.querySelector("#vp-cards");
        el.innerHTML = hand.length ? hand.map((c, i) => `
          <div class="vp-card ${c.s === "♥" || c.s === "♦" ? "red" : ""} ${held[i] ? "held" : ""}" data-i="${i}">
            <div>${c.r}${c.s}</div>
            <div class="vp-hold">${held[i] ? "HOLD" : ""}</div>
          </div>`).join("") : "<div style='opacity:.5'>— deal to start —</div>";
        root.querySelector("#vp-deal").textContent = phase === "draw" ? "Draw" : "Deal";
      }

      root.querySelector("#vp-cards").addEventListener("click", e => {
        const c = e.target.closest("[data-i]");
        if (c && phase === "draw") {
          held[+c.dataset.i] = !held[+c.dataset.i];
          AudioFX.click();
          render();
        }
      });
      root.querySelector("#vp-deal").addEventListener("click", () => {
        phase === "draw" ? draw() : deal();
      });
      root.querySelector("#vp-less").addEventListener("click", () => {
        bet = Math.max(1, bet - 1);
        AudioFX.click();
        render();
      });
      root.querySelector("#vp-more").addEventListener("click", () => {
        bet = Math.min(25, bet + 1);
        AudioFX.click();
        render();
      });

      render();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Video Poker",
        "Jacks or Better five-card draw." +
        "<br><b>Deal</b> five cards, tap the ones you want to <b>hold</b>, then <b>Draw</b> replaces the rest." +
        "<br>Payouts start at a pair of jacks (1× your bet) and climb to a Royal Flush (250×). Adjust your bet with − / +.");
    },
  });
})();
