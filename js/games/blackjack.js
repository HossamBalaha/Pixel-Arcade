/* blackjack — hit, stand, double; dealer stands on 17; blackjack pays 3:2. */
(function () {
  "use strict";
  GameRegistry.register({
    id: "blackjack", name: "Blackjack", icon: "🃏", category: "strategy",
    description: "Beat the dealer to 21 — blackjack pays 3 to 2", tags: ["cards", "casino", "classic"],
    age: ["adults"], difficulty: "easy", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let deck = [], you = [], dealer = [], chips = 100, bet = 10, phase = "bet", alive = true;

      const SUITS = ["♠", "♥", "♦", "♣"], RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

      function newDeck() {
        deck = [];
        for (const s of SUITS) for (const r of RANKS) deck.push({r, s});
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
      }

      function val(hand) {
        let v = 0, aces = 0;
        for (const c of hand) {
          if (c.r === "A") {
            v += 11;
            aces++;
          } else if (["J", "Q", "K"].includes(c.r)) v += 10;
          else v += +c.r;
        }
        while (v > 21 && aces--) v -= 10;
        return v;
      }

      const isBJ = h => h.length === 2 && val(h) === 21;
      const fmt = h => h.map(c => c.r + c.s).join("  ");

      function draw() {
        if (!deck.length) newDeck();
        return deck.pop();
      }

      function deal() {
        if (chips < bet) {
          App.toast("Not enough chips — reset your bank", "warning");
          return;
        }
        chips -= bet;
        you = [draw(), draw()];
        dealer = [draw(), draw()];
        phase = "play";
        AudioFX.click();
        if (isBJ(you)) {
          settle();
          return;
        }
        render();
      }

      function hit() {
        you.push(draw());
        AudioFX.pop();
        if (val(you) > 21) settle(); else render();
      }

      function stand() {
        settle();
      }

      function double() {
        if (chips < bet) {
          App.toast("Not enough chips to double", "warning");
          return;
        }
        chips -= bet;
        bet *= 2;
        you.push(draw());
        settle();
      }

      function settle() {
        phase = "done";
        while (val(dealer) < 17) dealer.push(draw());
        const yv = val(you), dv = val(dealer);
        let msg, cls, win = false;
        if (isBJ(you) && !isBJ(dealer)) {
          chips += bet + Math.floor(bet * 1.5);
          msg = "🎉 Blackjack! 3:2 payout";
          cls = "win";
          win = true;
        } else if (yv > 21) {
          msg = "💥 Bust — dealer wins";
          cls = "lose";
        } else if (dv > 21) {
          chips += bet * 2;
          msg = "🎉 Dealer busts — you win!";
          cls = "win";
          win = true;
        } else if (isBJ(dealer) && !isBJ(you)) {
          msg = "Dealer blackjack — you lose";
          cls = "lose";
        } else if (yv > dv) {
          chips += bet * 2;
          msg = `🎉 ${yv} beats ${dv}!`;
          cls = "win";
          win = true;
        } else if (yv < dv) {
          msg = `${dv} beats ${yv} — dealer wins`;
          cls = "lose";
        } else {
          chips += bet;
          msg = "🤝 Push — bet returned";
          cls = "";
        }
        const st = root.querySelector("#bj-status");
        st.textContent = msg;
        st.className = "status " + cls;
        if (win) AudioFX.win(); else if (yv > 21 || yv < dv) AudioFX.lose();
        App.recordResult(win, chips);
        bet = 10; // reset for next hand
        render();
      }

      root.innerHTML = `
        <style>
          .bj-cards { font-size: 1.5rem; letter-spacing: 3px; min-height: 2.2rem; margin: 6px 0; }
          .bj-btns { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 8px; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Chips</div><div class="val" id="bj-ch">100</div></div>
          <div class="score-cell"><div class="label">Bet</div><div class="val" id="bj-bet">10</div></div>
          <div class="score-cell"><div class="label">Dealer</div><div class="val" id="bj-dv">—</div></div>
          <div class="score-cell"><div class="label">You</div><div class="val" id="bj-yv">—</div></div>
        </div>
        <div class="status info" id="bj-status">Place your bet and deal!</div>
        <div class="bj-cards" id="bj-dc">🂠 🂠</div>
        <div class="bj-cards" id="bj-yc"></div>
        <div class="bj-btns" id="bj-bets">
          <button class="btn" data-b="5">Bet 5</button>
          <button class="btn" data-b="10">Bet 10</button>
          <button class="btn" data-b="25">Bet 25</button>
          <button class="btn primary" id="bj-deal">Deal</button>
        </div>
        <div class="bj-btns" id="bj-acts" style="display:none;">
          <button class="btn primary" id="bj-hit">Hit</button>
          <button class="btn" id="bj-stand">Stand</button>
          <button class="btn" id="bj-double">Double</button>
        </div>
      `;

      function render() {
        const ch = root.querySelector("#bj-ch"), b = root.querySelector("#bj-bet");
        const dv = root.querySelector("#bj-dv"), yv = root.querySelector("#bj-yv");
        const dc = root.querySelector("#bj-dc"), yc = root.querySelector("#bj-yc");
        if (ch) ch.textContent = chips;
        if (b) b.textContent = phase === "play" ? bet : bet;
        if (yc) yc.textContent = fmt(you) || "—";
        if (yv) yv.textContent = you.length ? val(you) : "—";
        if (dv) dv.textContent = dealer.length ? (phase === "done" ? val(dealer) : val([dealer[0]]) + "+") : "—";
        if (dc) dc.textContent = phase === "done" ? fmt(dealer) : (dealer.length ? dealer[0].r + dealer[0].s + " 🂠" : "🂠 🂠");
        root.querySelector("#bj-bets").style.display = phase === "bet" ? "" : "none";
        root.querySelector("#bj-acts").style.display = phase === "play" ? "" : "none";
        // after settle, show deal button again
        if (phase === "done") {
          root.querySelector("#bj-bets").style.display = "";
          root.querySelector("#bj-deal").textContent = "Next hand";
        } else root.querySelector("#bj-deal").textContent = "Deal";
      }

      root.querySelector("#bj-bets").addEventListener("click", e => {
        const b = e.target.closest("[data-b]");
        if (b) {
          bet = +b.dataset.b;
          AudioFX.click();
          render();
        }
      });
      root.querySelector("#bj-deal").addEventListener("click", () => {
        if (phase !== "play") {
          phase = "bet";
          deal();
        }
      });
      root.querySelector("#bj-hit").addEventListener("click", () => {
        if (phase === "play") hit();
      });
      root.querySelector("#bj-stand").addEventListener("click", () => {
        if (phase === "play") stand();
      });
      root.querySelector("#bj-double").addEventListener("click", () => {
        if (phase === "play" && you.length === 2) double();
      });

      render();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Blackjack",
        "Get closer to 21 than the dealer without going over. Aces count 1 or 11; face cards are 10." +
        "<br><b>Hit</b> draws a card, <b>Stand</b> keeps your total, <b>Double</b> doubles the bet and draws exactly one card." +
        "<br>The dealer must draw to 16 and stand on 17. Blackjack (21 with two cards) pays 3:2. Push returns your bet.");
    },
  });
})();
