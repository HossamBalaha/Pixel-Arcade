/* Wheelie — hold the front wheel up without tipping over */
(function () {
  GameRegistry.register({
    id: "wheelie",
    name: "Wheelie",
    icon: "🚲",
    category: "arcade",
    description: "Hold the front wheel up — too far and you tip",
    tags: ["arcade", "balance", "physics"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 400, H = 240;
      let ang, angV, holding, dist, time, best, over, raf, coins, scene;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Distance</div><div class="val" id="wh-dist">0m</div></div>
          <div class="score-cell"><div class="label">Balance</div><div class="val" id="wh-ang">0°</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="wh-best">0m</div></div>
        </div>
        <div class="status info" id="wh-status">Hold (Space / pointer) to lift the front wheel — release before you tip!</div>
        <div class="center"><canvas id="wh-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Stay in the green zone of the balance meter. Coins on the road give bonus distance.</p>
      `;

      const canvas = root.querySelector("#wh-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#wh-status");
      best = Storage.getBest("wheelie") || 0;
      const groundY = H - 50;

      function reset() {
        ang = 0;
        angV = 0;
        holding = false;
        dist = 0;
        time = 0;
        over = false;
        coins = [];
        scene = {bumps: []};
        updateHud();
        statusEl.textContent = "Hold (Space / pointer) to lift the front wheel — release before you tip!";
        statusEl.className = "status info";
      }

      function updateHud() {
        root.querySelector("#wh-dist").textContent = Math.floor(dist) + "m";
        root.querySelector("#wh-ang").textContent = Math.round(ang * 180 / Math.PI) + "°";
        root.querySelector("#wh-best").textContent = best + "m";
      }

      function spawnCoins() {
        const frontier = coins.length ? coins[coins.length - 1].x : dist * 8 + 200;
        if (Math.random() < 0.5) coins.push({x: frontier + 80 + Math.random() * 160, got: false});
      }

      function tick() {
        if (!over) {
          time++;
          const speed = 3.4; // m/s in scene units
          dist += (holding && ang > 0.2 ? 0.14 : 0.09);
          // wheelie physics: holding adds torque, gravity pulls down; past 80° -> fall
          if (holding) angV += 0.0042;
          angV += (ang > 0 ? -0.0026 : 0);
          ang += angV;
          if (ang < 0) {
            ang = 0;
            angV = Math.max(0, angV);
          }
          if (ang > Math.PI * 0.62) return die("Tipped over backwards!");
          // coins
          while (coins.length < 3) spawnCoins();
          coins = coins.filter(c => c.x > dist * 8 - 40 && !c.got);
          for (const c of coins) {
            if (!c.got && Math.abs(c.x - dist * 8) < 24) {
              c.got = true;
              dist += 8;
              AudioFX.win();
              updateHud();
            }
          }
          updateHud();
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function die(msg) {
        over = true;
        AudioFX.lose();
        statusEl.textContent = msg + ` — ${Math.floor(dist)}m`;
        statusEl.className = "status lose";
        if (Math.floor(dist) > best) {
          best = Math.floor(dist);
          Storage.setBest("wheelie", best);
          App.toast("New best: " + best + "m", "success");
        }
        updateHud();
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        const text = st.getPropertyValue("--text").trim() || "#eee";
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);
        // skyline
        ctx.fillStyle = "rgba(100,116,139,0.25)";
        for (let i = 0; i < 8; i++) {
          const bx = ((i * 76 - dist * 3) % (W + 76) + W + 76) % (W + 76) - 38;
          ctx.fillRect(bx, groundY - 70 - (i % 3) * 26, 50, 100);
        }
        // road
        ctx.fillStyle = "#334155";
        ctx.fillRect(0, groundY, W, H - groundY);
        ctx.strokeStyle = "#facc15";
        ctx.setLineDash([26, 22]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, groundY + 16);
        ctx.lineTo(W, groundY + 16);
        ctx.stroke();
        ctx.setLineDash([]);
        // coins
        const camX = dist * 8;
        ctx.fillStyle = "#fbbf24";
        for (const c of coins) {
          ctx.beginPath();
          ctx.arc(c.x - camX + 100, groundY - 12, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        // bike at x=100
        const bx = 100, by = groundY - 1;
        ctx.save();
        ctx.translate(bx, by);
        // rear wheel pivot; frame rotates by ang
        ctx.rotate(-ang);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        // frame
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(26, -22);
        ctx.lineTo(58, -22); // rear to seat to handlebar post
        ctx.moveTo(0, 0);
        ctx.lineTo(34, 0); // bottom bracket
        ctx.moveTo(34, 0);
        ctx.lineTo(26, -22);
        ctx.moveTo(34, 0);
        ctx.lineTo(62, -4); // fork
        ctx.stroke();
        // wheels
        const wheel = (x) => {
          ctx.beginPath();
          ctx.arc(x, 0, 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, 0, 3, 0, Math.PI * 2);
          ctx.stroke();
        };
        wheel(0);
        wheel(62);
        // rider
        ctx.beginPath();
        ctx.moveTo(26, -22);
        ctx.lineTo(38, -44);
        ctx.lineTo(56, -40);
        ctx.moveTo(38, -44);
        ctx.lineTo(30, -46);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(39, -50, 5, 0, Math.PI * 2);
        ctx.fillStyle = text;
        ctx.fill();
        ctx.restore();
        // balance meter
        const mx = W / 2, my = 26;
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.arc(mx, my + 8, 34, Math.PI, 0);
        ctx.fill();
        // zones: 0-15 yellow, 15-60 green, 60-80 orange, >80 red
        const zone = (a0, a1, c) => {
          ctx.strokeStyle = c;
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.arc(mx, my + 8, 26, Math.PI + a0, Math.PI + a1);
          ctx.stroke();
        };
        zone(0, 0.26, "#facc15");
        zone(0.26, 1.05, "#22c55e");
        zone(1.05, 1.4, "#f97316");
        zone(1.4, Math.PI - 0.06, "#ef4444");
        const na = Math.min(Math.PI - 0.06, ang);
        ctx.strokeStyle = text;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(mx, my + 8);
        ctx.lineTo(mx + Math.cos(Math.PI + na) * 24, my + 8 + Math.sin(Math.PI + na) * 24);
        ctx.stroke();
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Ouch!", W / 2, H / 2);
          ctx.font = "14px sans-serif";
          ctx.fillText("Press R to ride again", W / 2, H / 2 + 26);
        }
      }

      const setHold = (v) => {
        if (!over) holding = v;
      };
      const onKey = (e) => {
        if (e.key === " ") {
          e.preventDefault();
          setHold(true);
        }
        if (e.key.toLowerCase() === "r" && over) reset();
      };
      const onKeyUp = (e) => {
        if (e.key === " ") setHold(false);
      };
      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onKeyUp);
      canvas.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        setHold(true);
      });
      window.addEventListener("pointerup", () => setHold(false));

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("pointerup", () => {
        });
      };
    },
    help: function () {
      App.showModal("How to play Wheelie",
        `Hold <b>Space</b> (or the pointer) to pull the front wheel up; release to let it drop. The bike
        <b>accelerates while the wheel is up</b>, so the wheelie is what scores distance.
        <br><br>Watch the balance meter: the <b>green zone</b> is stable, past orange you're flirting with a crash,
        and past <b>80°</b> you tip over. Tap the hold in pulses to stay balanced. 🪙 Coins add +8 m.`);
    },
  });
})();
