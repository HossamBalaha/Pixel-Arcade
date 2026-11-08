/* Dot Dash Mini — tap the numbered dots in ascending order (1, 2, 3…) on a
   scattered board. Finished rounds add a dot; wrong taps cost a second. 30s total. */
(function () {
  "use strict";
  const TOTAL = 30;      // seconds on the clock
  const VW = 440, VH = 340; // virtual coordinate space for dot placement
  const START_DOTS = 5, MAX_DOTS = 16;

  GameRegistry.register({
    id: "dotdashmini",
    name: "Dot Dash Mini",
    icon: "🔢",
    category: "arcade",
    description: "Tap the numbered dots in order 1-2-3… — rounds grow, wrong taps cost a second",
    tags: ["arcade", "speed", "numbers", "focus", "mini"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true, raf = 0, last = 0;
      let round, dotCount, expected, score, timeLeft, over, dots;
      const timeouts = [];
      let best = Storage.getBest("dotdashmini") || 0;

      root.innerHTML = `
        <style>
          .ddm-board { position: relative; width: 100%; max-width: 480px; height: 380px; margin: 0 auto;
            background: var(--bg-elev, #fff); border: 1px solid var(--border, #d1d5db);
            border-radius: var(--radius, 12px); overflow: hidden; touch-action: manipulation; }
          .ddm-board.shake { animation: ddm-shake 0.3s; }
          @keyframes ddm-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-7px); } 75% { transform: translateX(7px); } }
          .ddm-dot { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px;
            border-radius: 50%; border: none; cursor: pointer; padding: 0;
            font: 700 1.05rem/1 var(--font-mono, monospace); color: #0f172a;
            background: radial-gradient(circle at 35% 30%, #67e8f9, #0891b2);
            box-shadow: 0 3px 10px rgba(2, 6, 23, 0.35);
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.12s; touch-action: manipulation; }
          .ddm-dot.now { background: radial-gradient(circle at 35% 30%, #fde047, #ca8a04);
            animation: ddm-pulse 1s infinite; }
          @keyframes ddm-pulse {
            0%, 100% { box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.55), 0 3px 10px rgba(2, 6, 23, 0.35); }
            50% { box-shadow: 0 0 0 9px rgba(250, 204, 21, 0.15), 0 3px 10px rgba(2, 6, 23, 0.35); } }
          .ddm-dot.err { background: radial-gradient(circle at 35% 30%, #fca5a5, #dc2626); color: #fff; }
          .ddm-dot.pop { animation: ddm-pop 0.28s forwards; pointer-events: none; }
          @keyframes ddm-pop { to { transform: scale(1.9); opacity: 0; } }
          .ddm-flash { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
            font: 700 2.1rem/1 var(--font-mono, monospace); color: var(--accent, #6366f1);
            pointer-events: none; opacity: 0; }
          .ddm-flash.show { animation: ddm-flash 0.9s ease forwards; }
          @keyframes ddm-flash {
            0% { opacity: 0; transform: scale(0.7); }
            20% { opacity: 1; transform: scale(1); }
            75% { opacity: 1; }
            100% { opacity: 0; transform: scale(1.06); } }
          .ddm-board.done .ddm-dot { pointer-events: none; opacity: 0.45; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Dots</div><div class="val" id="ddm-score">0</div></div>
          <div class="score-cell"><div class="label">Round</div><div class="val" id="ddm-round">1</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="ddm-time">${TOTAL.toFixed(1)}s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ddm-best">${best}</div></div>
        </div>
        <div class="status info" id="ddm-status">Tap the dots in order: 1, 2, 3…</div>
        <div class="center"><div class="ddm-board" id="ddm-board"><div class="ddm-flash" id="ddm-flash"></div></div></div>
        <div class="row" style="justify-content:center;margin-top:12px;">
          <button class="btn primary" id="ddm-new" type="button">Restart</button>
        </div>
        <p class="hint">Wrong dot = <b>−1 second</b>. Each finished round adds one more dot. 30 seconds on the clock.</p>
      `;
      const boardEl = root.querySelector("#ddm-board");
      const flashEl = root.querySelector("#ddm-flash");
      const statusEl = root.querySelector("#ddm-status");
      const scoreEl = root.querySelector("#ddm-score");
      const roundEl = root.querySelector("#ddm-round");
      const timeEl = root.querySelector("#ddm-time");
      const bestEl = root.querySelector("#ddm-best");

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (!alive) return;
          fn();
        }, ms);
        timeouts.push(id);
        return id;
      }

      // Sample non-overlapping positions (rejection sampling, relaxing for big rounds)
      function samplePoints(n) {
        const pts = [];
        const minDist = Math.max(42, 62 - Math.max(0, n - 9) * 3);
        let tries = 0;
        while (pts.length < n && tries < 3000) {
          tries++;
          const p = {x: 34 + Math.random() * (VW - 68), y: 34 + Math.random() * (VH - 68)};
          if (pts.every(q => (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y) >= minDist * minDist)) pts.push(p);
        }
        // fallback grid fill if sampling couldn't fit everything
        let i = 0;
        while (pts.length < n) {
          pts.push({x: 44 + (i % 7) * 59, y: 48 + Math.floor(i / 7) * 88});
          i++;
        }
        return pts;
      }

      function markNow() {
        dots.forEach(d => {
          if (d.n === expected) d.el.classList.add("now");
          else d.el.classList.remove("now");
        });
      }

      function placeDots(n) {
        dots.forEach(d => d.el.remove());
        dots = [];
        const pts = samplePoints(n);
        for (let i = 0; i < n; i++) {
          const el = document.createElement("button");
          el.type = "button";
          el.className = "ddm-dot";
          el.textContent = String(i + 1);
          el.style.left = (pts[i].x / VW * 100) + "%";
          el.style.top = (pts[i].y / VH * 100) + "%";
          const dot = {n: i + 1, el, done: false};
          el.addEventListener("pointerdown", ev => {
            ev.preventDefault();
            tap(dot);
          });
          el.addEventListener("click", () => tap(dot)); // keyboard/fallback activation
          boardEl.appendChild(el);
          dots.push(dot);
        }
        markNow();
      }

      function flash(text) {
        flashEl.textContent = text;
        flashEl.classList.remove("show");
        void flashEl.offsetWidth; // restart the CSS animation
        flashEl.classList.add("show");
      }

      function startRound() {
        dotCount = Math.min(START_DOTS + round - 1, MAX_DOTS);
        expected = 1;
        placeDots(dotCount);
        flash("Round " + round);
        setStatus("Round " + round + " — tap " + dotCount + " dots in order!");
        roundEl.textContent = round;
      }

      function tap(dot) {
        if (over || dot.done) return;
        if (dot.n === expected) {
          dot.done = true;
          score++;
          expected++;
          AudioFX.pop();
          scoreEl.textContent = score;
          dot.el.classList.remove("now");
          dot.el.classList.add("pop");
          later(() => dot.el.remove(), 300);
          if (expected > dotCount) {
            AudioFX.reveal();
            setStatus("Round " + round + " cleared!");
            round++;
            later(startRound, 750);
          }
        } else {
          AudioFX.error();
          timeLeft = Math.max(0.2, timeLeft - 1);
          dot.el.classList.add("err");
          boardEl.classList.remove("shake");
          void boardEl.offsetWidth;
          boardEl.classList.add("shake");
          later(() => dot.el.classList.remove("err"), 350);
          setStatus("Wrong dot! -1s — next is " + expected, "lose");
          later(() => {
            if (!over) setStatus("Next is " + expected);
          }, 800);
        }
      }

      function end() {
        over = true;
        boardEl.classList.add("done");
        App.recordResult(score > 0, score);
        if (score > best) {
          best = score;
          Storage.setBest("dotdashmini", score);
          bestEl.textContent = best;
          App.toast("New best: " + score + " dots", "success");
        }
        if (score > 0) {
          AudioFX.win();
          setStatus("Time! You tapped " + score + " dot" + (score === 1 ? "" : "s") + " in " + round + " round" + (round === 1 ? "" : "s"), "win");
          App.toast(score >= 25 ? "Lightning fast — " + score + " dots!" : (score >= 12 ? "Great run — " + score + " dots!" : "Nice — " + score + " dots. Keep going!"), "success");
        } else {
          AudioFX.lose();
          setStatus("Time! No dots tapped — try again", "lose");
          App.toast("No dots tapped — try again!", "warning");
        }
      }

      function loop(now) {
        if (!alive) return;
        if (!last) last = now;
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (!over) {
          timeLeft -= dt;
          if (timeLeft <= 0) {
            timeLeft = 0;
            end();
          }
          timeEl.textContent = timeLeft.toFixed(1) + "s";
        }
        raf = requestAnimationFrame(loop);
      }

      function reset() {
        round = 1;
        score = 0;
        timeLeft = TOTAL;
        over = false;
        dots = dots || [];
        boardEl.classList.remove("done");
        scoreEl.textContent = "0";
        timeEl.textContent = TOTAL.toFixed(1) + "s";
        startRound();
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") reset();
      }

      document.addEventListener("keydown", onKey);
      root.querySelector("#ddm-new").addEventListener("click", reset);

      reset();
      raf = requestAnimationFrame(loop);
      return function cleanup() {
        alive = false;
        cancelAnimationFrame(raf);
        timeouts.forEach(clearTimeout);
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Dot Dash Mini",
        `Numbered dots are scattered on the board. Tap them in <b>ascending order</b> — 1, then 2, then 3…
        <br><br>• The dot you need next glows <b>gold</b>.
        <br>• Correct tap: the dot pops away.
        <br>• Wrong tap: <b>−1 second</b> and the dot flashes red.
        <br>• Clear a whole sequence to start the next round with <b>one more dot</b>.
        <br>• You have <b>30 seconds</b> total. Score = dots tapped.
        <br><br>Click / tap the dots (they are buttons, so keyboard activation works too). <b>R</b> restarts.`);
    },
  });
})();
