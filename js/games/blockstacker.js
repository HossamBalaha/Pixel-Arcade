/* Block Stacker — stack blocks on top of each other with timing precision. */
(function () {
  let live = null;
  GameRegistry.register({
    id: "blockstacker",
    name: "Block Stacker",
    icon: "🧱",
    category: "arcade",
    description: "Time your taps to stack blocks perfectly — misaligned edges get trimmed",
    tags: ["arcade", "timing", "stack"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      const W = 280, BLOCK_H = 22, MAX_H = 18;
      let blocks = [], moving = null, dir = 1, over = false, rafId = null, speed = 1.5;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Height</div><div class="val" id="bs-h">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="bs-best">—</div></div>
        </div>
        <div class="status info" id="bs-status">Tap or press Space to drop the block. Align edges!</div>
        <div class="center"><canvas class="game-canvas" id="bs-canvas" width="${W}" height="${MAX_H * BLOCK_H + 40}" style="border-radius:var(--radius);background:var(--bg-soft);"></canvas></div>
        <p class="hint">Each misaligned drop trims the overhang — eventually your block disappears!</p>
      `;
      const canvas = root.querySelector("#bs-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#bs-status");
      root.querySelector("#bs-best").textContent = Storage.getBest("blockstacker") ?? "—";

      function init() {
        blocks = [{x: 0, w: W}];
        moving = {x: 0, w: W};
        dir = 1;
        over = false;
        speed = 1.5;
        statusEl.textContent = "Tap or press Space to drop the block.";
        statusEl.className = "status info";
        root.querySelector("#bs-h").textContent = 0;
        if (!rafId) loop();
      }

      function loop() {
        if (!alive) return;
        if (moving && !over) {
          moving.x += dir * speed;
          if (moving.x + moving.w >= W) {
            moving.x = W - moving.w;
            dir = -1;
          } else if (moving.x <= 0) {
            moving.x = 0;
            dir = 1;
          }
        }
        draw();
        rafId = requestAnimationFrame(loop);
      }

      function draw() {
        const styles = getComputedStyle(document.documentElement);
        const accent = styles.getPropertyValue("--accent").trim();
        const accent2 = styles.getPropertyValue("--accent-2").trim();
        const text = styles.getPropertyValue("--text").trim();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw stacked blocks
        const baseY = canvas.height - 20;
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          ctx.fillStyle = i % 2 === 0 ? accent : accent2;
          ctx.fillRect(b.x, baseY - (i + 1) * BLOCK_H, b.w, BLOCK_H);
          ctx.strokeStyle = "rgba(0,0,0,0.15)";
          ctx.strokeRect(b.x, baseY - (i + 1) * BLOCK_H, b.w, BLOCK_H);
        }
        // Moving block
        if (moving && !over) {
          ctx.fillStyle = text;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(moving.x, baseY - (blocks.length + 1) * BLOCK_H, moving.w, BLOCK_H);
          ctx.globalAlpha = 1;
        }
        // Game over overlay
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = text;
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 10);
          ctx.font = "14px sans-serif";
          ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 18);
        }
      }

      function drop() {
        if (over || !moving) return;
        const last = blocks[blocks.length - 1];
        const overlap = Math.max(0, Math.min(moving.x + moving.w, last.x + last.w) - Math.max(moving.x, last.x));
        if (overlap <= 0) {
          // Total miss
          over = true;
          AudioFX.lose();
          statusEl.textContent = `💀 Block fell! Final height: ${blocks.length - 1}`;
          statusEl.className = "status lose";
          const h = blocks.length - 1;
          const best = Storage.getBest("blockstacker");
          if (!best || h > best) {
            Storage.setBest("blockstacker", h);
            root.querySelector("#bs-best").textContent = h;
            App.toast("New best height: " + h, "success");
          }
          moving = null;
          return;
        }
        // New block = trimmed overlap
        const newX = Math.max(moving.x, last.x);
        const newW = overlap;
        blocks.push({x: newX, w: newW});
        AudioFX.place();
        root.querySelector("#bs-h").textContent = blocks.length - 1;
        // Speed up
        speed = Math.min(4, 1.5 + (blocks.length - 1) * 0.15);
        // New moving block from edge
        const side = Math.random() < 0.5 ? 0 : W - newW;
        moving = {x: side, w: newW};
        dir = side === 0 ? 1 : -1;
        if (blocks.length >= MAX_H) {
          over = true;
          AudioFX.win();
          statusEl.textContent = `🏆 Max height reached! Final: ${blocks.length - 1}`;
          statusEl.className = "status win";
          const h = blocks.length - 1;
          const best = Storage.getBest("blockstacker");
          if (!best || h > best) {
            Storage.setBest("blockstacker", h);
            root.querySelector("#bs-best").textContent = h;
            App.toast("Max height!", "success");
          }
        }
      }

      function onKey(e) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          drop();
        } else if (e.key === "r" || e.key === "R") init();
      }

      document.addEventListener("keydown", onKey);
      canvas.addEventListener("click", drop);
      canvas.addEventListener("touchstart", e => {
        e.preventDefault();
        drop();
      }, {passive: false});
      live = {};
      init();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      };
    },
    help: function () {
      App.showModal("How to play Block Stacker",
        `A block moves back and forth. Tap the canvas (or press <b>Space</b>) to drop it onto the stack.
        <br><br>Any part that hangs past the block below gets <b>trimmed off</b>. Each drop, your block gets narrower — until it completely misses!
        <br><br>Score = max height you reach before game over.`);
    },
  });
})();
