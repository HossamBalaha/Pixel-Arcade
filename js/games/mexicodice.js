/* Mexico Dice — dice climbing: 2 dice, up to 3 rolls each round, keep what you like.
   Highest total wins the round; Mexico (2-1) beats everything and costs double. 3 strikes and you're out. */
(function () {
  "use strict";

  const PIP = {
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[30, 30], [50, 50], [70, 70]],
    4: [[30, 30], [30, 70], [70, 30], [70, 70]],
    5: [[30, 30], [30, 70], [50, 50], [70, 30], [70, 70]],
    6: [[30, 30], [30, 70], [50, 30], [50, 70], [70, 30], [70, 70]],
  };

  function faceHTML(v) {
    return PIP[v].map(p => `<span class="mx-pip" style="left:${p[0]}%;top:${p[1]}%"></span>`).join("");
  }

  const rnd6 = () => 1 + Math.floor(Math.random() * 6);
  const isMexico = d => (d[0] === 1 && d[1] === 2) || (d[0] === 2 && d[1] === 1);
  const sum = d => d[0] + d[1];
  const fmtDice = d => isMexico(d) ? `${d[0]}+${d[1]} MEXICO` : `${d[0]}+${d[1]}=${sum(d)}`;

  GameRegistry.register({
    id: "mexicodice",
    name: "Mexico Dice",
    icon: "🎲",
    category: "strategy",
    description: "Dice climbing vs the bot: roll 2 dice up to 3 times, keeping what you like — highest total takes the round, but 2-1 (Mexico!) beats everything and costs two strikes. Three strikes and you're out.",
    tags: ["dice", "press-your-luck", "ai", "classic"],
    age: ["teens", "adults"],
    difficulty: "easy",
    duration: "medium",
    players: "either",
    mount: function (root, ctx) {
      const {App, AudioFX, Storage} = ctx;
      let alive = true, gen = 0;
      let over = false, busy = false;
      let phase = "you"; // "you" | "bot"
      let yd = [1, 1], yKeep = [false, false], yRolls = 0;
      let bd = null, bKeep = [false, false], bRolls = 0;
      let youStrikes = 0, botStrikes = 0, roundN = 0, youWins = 0;
      let history = [];
      const timeouts = [];
      const intervals = [];

      function later(fn, ms) {
        const g = gen;
        const id = setTimeout(() => {
          if (alive && g === gen) fn();
        }, ms);
        timeouts.push(id);
        return id;
      }

      if (!document.getElementById("mx-style")) {
        const s = document.createElement("style");
        s.id = "mx-style";
        s.textContent = `
          .mx-row { display:flex; gap:14px; justify-content:center; align-items:center; margin:8px 0; min-height:74px; }
          .mx-die { width:60px; height:60px; background:var(--bg-elev); border:2px solid var(--border); border-radius:12px;
            position:relative; padding:0; cursor:default; transition:transform .12s, border-color .12s, box-shadow .12s; }
          button.mx-die:active { transform:scale(.94); }
          .mx-pip { position:absolute; width:20%; height:20%; background:var(--text); border-radius:50%; transform:translate(-50%,-50%); }
          .mx-kept { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent); }
          .mx-empty { opacity:.3; display:grid; place-items:center; color:var(--text-muted); font-size:1.4rem; font-family:var(--font-mono); }
          .mx-tag { font-family:var(--font-mono); font-size:.68rem; font-weight:700; letter-spacing:.05em; padding:2px 6px;
            border-radius:6px; background:var(--bg-soft); border:1px solid var(--border); color:var(--text-muted); }
          .mx-mex { background:var(--danger); color:#fff; border-color:var(--danger); }
          .mx-hist { font-family:var(--font-mono); font-size:.78rem; color:var(--text-muted); text-align:left;
            background:var(--bg-soft); border:1px solid var(--border); border-radius:var(--radius); padding:8px 10px; margin-top:12px; }
          .mx-hist div { padding:2px 0; }
          .mx-hist .mx-mexrow { color:var(--danger); font-weight:700; }
          .mx-lab { font-size:.72rem; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); text-align:center; margin-top:10px; }
        `;
        document.head.appendChild(s);
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Your strikes</div><div class="val" id="mx-ys">0/3</div></div>
          <div class="score-cell"><div class="label">Bot strikes</div><div class="val" id="mx-bs">0/3</div></div>
          <div class="score-cell"><div class="label">Round</div><div class="val" id="mx-rd">1</div></div>
          <div class="score-cell"><div class="label">Rounds won</div><div class="val" id="mx-rw">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="mx-best">—</div></div>
        </div>
        <div class="status info" id="mx-status">Loading…</div>
        <div class="mx-lab">Your dice — tap to keep</div>
        <div class="mx-row" id="mx-you"></div>
        <div class="mx-lab">Bot's dice</div>
        <div class="mx-row" id="mx-bot"></div>
        <div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap;margin-top:8px;">
          <button class="btn primary" id="mx-roll">Roll</button>
          <button class="btn" id="mx-stand">Stand</button>
          <button class="btn" id="mx-new">New game</button>
        </div>
        <p class="hint">Each round both sides roll 2 dice up to 3 times, keeping any dice between rolls.
        Highest total wins the round; the loser takes a strike — but <b>Mexico (2-1)</b> beats everything and costs the loser <b>2 strikes</b>. First to 3 strikes loses.</p>
        <div class="mx-hist" id="mx-hist"><div>No rounds played yet.</div></div>
      `;

      const statusEl = root.querySelector("#mx-status");
      const youEl = root.querySelector("#mx-you");
      const botEl = root.querySelector("#mx-bot");
      const rollB = root.querySelector("#mx-roll");
      const standB = root.querySelector("#mx-stand");

      function setStatus(text, cls) {
        statusEl.textContent = text;
        statusEl.className = "status " + (cls || "info");
      }

      function render() {
        root.querySelector("#mx-ys").textContent = youStrikes + "/3";
        root.querySelector("#mx-bs").textContent = botStrikes + "/3";
        root.querySelector("#mx-rd").textContent = roundN + 1;
        root.querySelector("#mx-rw").textContent = youWins;
        const best = Storage.getBest("mexicodice");
        root.querySelector("#mx-best").textContent = best != null ? best : "—";

        // your dice
        youEl.innerHTML = "";
        const canKeep = phase === "you" && !busy && !over && yRolls > 0 && yRolls < 3;
        for (let i = 0; i < 2; i++) {
          let el;
          if (canKeep) {
            el = document.createElement("button");
            el.addEventListener("click", () => {
              yKeep[i] = !yKeep[i];
              AudioFX.click();
              render();
            });
          } else {
            el = document.createElement("div");
          }
          el.className = "mx-die" + (yKeep[i] && yRolls > 0 ? " mx-kept" : "");
          el.innerHTML = faceHTML(yd[i]);
          youEl.appendChild(el);
        }
        const yMex = document.createElement("span");
        yMex.className = "mx-tag";
        yMex.textContent = yRolls > 0 ? (isMexico(yd) ? "MEXICO!" : (yKeep.some(Boolean) && yRolls > 0 ? "KEPT: " + yKeep.filter(Boolean).length : "")) : "";
        if (yRolls > 0 && isMexico(yd)) yMex.classList.add("mx-mex");
        youEl.appendChild(yMex);

        // bot dice
        botEl.innerHTML = "";
        if (bd === null) {
          for (let i = 0; i < 2; i++) {
            const el = document.createElement("div");
            el.className = "mx-die mx-empty";
            el.textContent = "–";
            botEl.appendChild(el);
          }
        } else {
          for (let i = 0; i < 2; i++) {
            const el = document.createElement("div");
            el.className = "mx-die" + (bKeep[i] && phase === "bot" ? " mx-kept" : "");
            el.innerHTML = faceHTML(bd[i]);
            botEl.appendChild(el);
          }
          const bMex = document.createElement("span");
          bMex.className = "mx-tag";
          if (isMexico(bd)) {
            bMex.textContent = "MEXICO!";
            bMex.classList.add("mx-mex");
          } else if (phase === "bot") bMex.textContent = `roll ${Math.min(bRolls, 3)}/3`;
          botEl.appendChild(bMex);
        }

        rollB.disabled = over || busy || phase !== "you" || yRolls >= 3;
        standB.disabled = over || busy || phase !== "you" || yRolls === 0;

        root.querySelector("#mx-hist").innerHTML = history.length
          ? history.map(h => `<div class="${h.mex ? "mx-mexrow" : ""}">R${h.n} · You ${h.y} · Bot ${h.b} · ${h.note}</div>`).join("")
          : "<div>No rounds played yet.</div>";
      }

      // ~400ms shuffle of a pair of dice before settling.
      function animatePair(rowSel, finals, done) {
        const g = gen;
        const els = Array.from(root.querySelectorAll(rowSel + " .mx-die"));
        AudioFX.tick();
        let n = 0;
        const iv = setInterval(() => {
          if (!alive || g !== gen) {
            clearInterval(iv);
            return;
          }
          els.forEach(el => {
            el.innerHTML = faceHTML(rnd6());
          });
          if (++n >= 7) {
            clearInterval(iv);
            els.forEach((el, i) => {
              el.innerHTML = faceHTML(finals[i]);
            });
            AudioFX.pop();
            if (done) done();
          }
        }, 55);
        intervals.push(iv);
      }

      function startYourPhase() {
        if (over) return;
        phase = "you";
        yKeep = [false, false];
        yRolls = 0;
        bd = null;
        bKeep = [false, false];
        bRolls = 0;
        render();
        setStatus(`Round ${roundN + 1}: your roll — up to 3 rolls, tap dice to keep them.`, "info");
        later(youRoll, 500); // first roll is automatic
      }

      function youRoll() {
        if (over || busy || phase !== "you" || yRolls >= 3) return;
        busy = true;
        render();
        const vals = yd.map((v, i) => yKeep[i] ? v : rnd6());
        animatePair("#mx-you", vals, () => {
          yd = vals;
          yRolls++;
          busy = false;
          if (isMexico(yd)) {
            setStatus("MEXICO! 2-1 — this hand beats everything. You may still improve it… or stand.", "win");
          }
          if (yRolls >= 3) {
            setStatus(`You finish on ${fmtDice(yd)}. Bot's roll…`, "info");
            render();
            later(youStand, 1200);
          } else {
            setStatus(`Roll ${yRolls}/3 — tap dice to keep, roll again, or stand.`, "info");
            render();
          }
        });
      }

      function youStand() {
        if (over || busy || phase !== "you" || yRolls === 0) return;
        phase = "bot";
        busy = true;
        render();
        setStatus(`You stand on ${fmtDice(yd)}. Bot's roll…`, "info");
        bd = [rnd6(), rnd6()];
        bRolls = 1;
        animatePair("#mx-bot", bd, () => {
          busy = false;
          render();
          later(botStep, 700);
        });
      }

      // ---- AI: keeps any die showing 4 or better, rerolls the rest while rolls remain ----
      function botStep() {
        if (over || phase !== "bot") return;
        bKeep = bd.map(d => d >= 4);
        const done = bRolls >= 3 || bKeep.every(Boolean);
        if (done) {
          setStatus(`Bot stands on ${fmtDice(bd)}. Comparing…`, "info");
          render();
          later(resolveRound, 1100);
          return;
        }
        setStatus(`Bot keeps its 4s+ and rerolls the rest…`, "info");
        render();
        later(() => {
          if (over || phase !== "bot") return;
          busy = true;
          render();
          const vals = bd.map((v, i) => bKeep[i] ? v : rnd6());
          animatePair("#mx-bot", vals, () => {
            bd = vals;
            bRolls++;
            busy = false;
            render();
            later(botStep, 650);
          });
        }, 750);
      }

      function resolveRound() {
        if (over) return;
        const yMex = isMexico(yd), bMex = isMexico(bd);
        let loser = null, strikes = 0, note;
        if (yMex && bMex) {
          note = "Both Mexico — tie, no strikes";
        } else if (yMex) {
          loser = "bot";
          strikes = 2;
          note = "Your MEXICO — bot takes 2 strikes";
        } else if (bMex) {
          loser = "you";
          strikes = 2;
          note = "Bot MEXICO — you take 2 strikes";
        } else {
          const ys = sum(yd), bs = sum(bd);
          if (ys > bs) {
            loser = "bot";
            strikes = 1;
            note = `You win ${ys}–${bs} — bot takes a strike`;
          } else if (bs > ys) {
            loser = "you";
            strikes = 1;
            note = `Bot wins ${bs}–${ys} — you take a strike`;
          } else note = `Tie ${ys}–${ys} — no strikes`;
        }
        if (loser === "bot") {
          botStrikes += strikes;
          youWins++;
        }
        if (loser === "you") youStrikes += strikes;
        history.unshift({n: roundN + 1, y: fmtDice(yd), b: fmtDice(bd), note, mex: yMex || bMex});
        render();
        if (loser === "you") AudioFX.error();
        else if (loser === "bot") {
          if (strikes === 2) AudioFX.win(); else AudioFX.place();
        }
        setStatus(`Round ${roundN + 1}: ${note}.`, loser === "you" ? "lose" : (loser === "bot" ? "win" : "info"));
        if (youStrikes >= 3) return later(() => endGame(false), 1400);
        if (botStrikes >= 3) return later(() => endGame(true), 1400);
        roundN++;
        later(startYourPhase, 1900);
      }

      function endGame(won) {
        over = true;
        busy = false;
        render();
        App.recordResult(won, youWins);
        const best = Storage.getBest("mexicodice");
        if (youWins > (best != null ? best : 0)) {
          Storage.setBest("mexicodice", youWins);
          App.toast("New best: " + youWins + " rounds won", "success");
        }
        if (won) {
          AudioFX.win();
          setStatus(`The bot is out with 3 strikes after ${roundN + 1} rounds — you win!`, "win");
          App.toast("You beat the climbing-bot!", "success");
        } else {
          AudioFX.lose();
          setStatus(`You're out with 3 strikes after ${roundN + 1} rounds — you lose.`, "lose");
        }
        render();
      }

      function newGame() {
        gen++;
        over = false;
        busy = false;
        youStrikes = 0;
        botStrikes = 0;
        roundN = 0;
        youWins = 0;
        history = [];
        yd = [1, 1];
        yKeep = [false, false];
        yRolls = 0;
        bd = null;
        startYourPhase();
      }

      rollB.addEventListener("click", youRoll);
      standB.addEventListener("click", youStand);
      root.querySelector("#mx-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });

      newGame();
      return function cleanup() {
        alive = false;
        timeouts.forEach(clearTimeout);
        intervals.forEach(clearInterval);
      };
    },
    help: function () {
      App.showModal("How to play Mexico Dice",
        `A 2-player dice-climbing game — you vs the bot, 2 dice each.
        <br><br><b>Each round:</b>
        <br>1. <b>You roll first</b>: roll both dice, then tap any dice you want to <b>keep</b> and reroll the others — up to <b>3 rolls</b> total. Or <b>Stand</b> early.
        <br>2. The <b>bot</b> then does the same (it keeps any die showing 4 or higher).
        <br>3. Highest <b>2-dice total</b> wins the round; the loser takes a <b>strike</b>.
        <br><br><b>Mexico!</b> A hand of <b>2-1</b> is called Mexico — it beats every other hand (including higher totals), and the loser takes <b>2 strikes</b> instead of 1.
        <br><br><b>Elimination:</b> the first player to collect <b>3 strikes</b> loses the game. Ties are a push — nobody takes a strike.
        <br><br>Tip: with 3 rolls you can often reach 9+ (or fish for Mexico) — but every reroll can also wreck a decent hand.`);
    },
  });
})();
