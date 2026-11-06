/* simoncolors — Simon Colors (auto-generated Simon variant, mode=colors) */
(function () {
  "use strict";
  const PADS = [
    {label: "", color: "#ef4444", freq: 261.63},
    {label: "", color: "#22c55e", freq: 329.63},
    {label: "", color: "#3b82f6", freq: 392.00},
    {label: "", color: "#eab308", freq: 523.25}
  ];
  GameRegistry.register({
    id: "simoncolors", name: "Simon Colors", icon: "🌈", category: "arcade",
    description: "Memory sequence with 4 colors.", tags: ["arcade", "memory", "simon"],
    age: ["kids", "teens", "adults"], difficulty: "medium", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, seq = [], inputIdx = 0, level = 0, playing = false, audioCtx = null;

      function ensureAudio() {
        if (!audioCtx) {
          try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          } catch (e) {
          }
        }
        if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
        return audioCtx;
      }

      function playTone(freq, dur) {
        const ac = ensureAudio();
        if (!ac) return;
        const t = ac.currentTime;
        const osc = ac.createOscillator(), gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.15, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(ac.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      }

      function start() {
        seq = [];
        level = 0;
        inputIdx = 0;
        playing = false;
        next();
      }

      function next() {
        level++;
        seq.push(Math.floor(Math.random() * 4));
        inputIdx = 0;
        root.querySelector("#simoncolors-level").textContent = "Level " + level;
        playSeq();
      }

      function playSeq() {
        playing = true;
        let i = 0;
        const tick = () => {
          if (!alive || i >= seq.length) {
            playing = false;
            if (alive) root.querySelector("#simoncolors-info").textContent = "Your turn";
            return;
          }
          flash(seq[i]);
          i++;
          setTimeout(() => {
            if (!alive) return;
            tick();
          }, 700);
        };
        root.querySelector("#simoncolors-info").textContent = "Watch...";
        tick();
      }

      function flash(color) {
        const pad = root.querySelector(`.sim-color-pad[data-i="${color}"]`);
        if (!pad) return;
        pad.classList.add("lit");
        playTone(PADS[color].freq, 0.3);
        setTimeout(() => pad.classList.remove("lit"), 400);
      }

      function tap(color) {
        if (playing) return;
        flash(color);
        if (seq[inputIdx] === color) {
          inputIdx++;
          if (inputIdx === seq.length) {
            App.toast("Level " + level + " cleared!", "success");
            setTimeout(() => {
              if (!alive) return;
              next();
            }, 700);
          }
        } else {
          AudioFX.lose();
          App.recordResult(false, level - 1);
          App.toast("Game over — level " + (level - 1), "warning");
          root.querySelector("#simoncolors-info").textContent = "Game over";
          playing = true;
        }
      }

      root.innerHTML = `
        <style>
          .sim-board { display:grid; grid-template-columns: 100px 100px; grid-template-rows: 100px 100px; gap:8px; justify-content:center; padding:14px; }
          .sim-color-pad { width:100px; height:100px; border-radius:14px; cursor:pointer; opacity:0.55; transition: opacity 0.1s;
            display:flex; align-items:center; justify-content:center; font-size:2rem; font-weight:700; color:#fff; border:none; }
          .sim-color-pad.lit { opacity:1; transform: scale(1.05); }
        </style>
        <div style="text-align:center; padding:8px; color:var(--text-muted,#64748b);">
          <span id="simoncolors-level">Level 0</span> | <span id="simoncolors-info">Click a pad to start</span>
        </div>
        <div class="sim-board">
          <button class="sim-color-pad" data-i="0" style="background:#ef4444;">•</button>
          <button class="sim-color-pad" data-i="1" style="background:#22c55e;">•</button>
          <button class="sim-color-pad" data-i="2" style="background:#3b82f6;">•</button>
          <button class="sim-color-pad" data-i="3" style="background:#eab308;">•</button>
        </div>
        <div style="text-align:center; margin-top:14px;"><button class="btn primary" id="simoncolors-new">New game</button></div>
      `;
      root.querySelectorAll(`.sim-color-pad`).forEach(p => p.addEventListener("click", () => tap(+p.dataset.i)));
      root.querySelector("#simoncolors-new").addEventListener("click", start);
      start();
      return function cleanup() {
        alive = false;
        if (audioCtx) {
          try {
            audioCtx.close();
          } catch (e) {
          }
        }
      };
    },
    help: function () {
      App.showModal("How to play Simon Colors", "Watch the pads light up in sequence, then tap them back in the same order. The sequence grows by one each level.");
    },
  });
})();
