/* ============================================================
   audio.js — tiny Web Audio sound effects (no assets)
   Beeps for click / win / lose / pop / tick / hover.
   Honors the global sound toggle in Storage.
   ============================================================ */
(function (global) {
  "use strict";

  let ctx = null;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when) {
    const ac = ensure();
    if (!ac) return;
    const t = when || ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function chord(freqs, dur, type, vol) {
    const ac = ensure();
    if (!ac) return;
    const t = ac.currentTime;
    freqs.forEach(f => tone(f, dur, type, vol, t));
  }

  const Audio = {
    enabled() {
      return Storage.getSound();
    },
    setEnabled(on) {
      Storage.setSound(on);
      if (on) ensure();
    },

    click() {
      if (Audio.enabled()) tone(440, 0.06, "square", 0.08);
    },
    hover() {
      if (Audio.enabled()) tone(660, 0.03, "sine", 0.05);
    },
    pop() {
      if (Audio.enabled()) tone(720, 0.08, "triangle", 0.12);
    },
    tick() {
      if (Audio.enabled()) tone(880, 0.04, "square", 0.08);
    },
    error() {
      if (Audio.enabled()) tone(180, 0.18, "sawtooth", 0.12);
    },
    flip() {
      if (Audio.enabled()) tone(560, 0.06, "triangle", 0.10);
    },
    reveal() {
      if (Audio.enabled()) tone(620, 0.10, "sine", 0.10);
    },

    win() {
      if (!Audio.enabled()) return;
      const ac = ensure();
      if (!ac) return;
      const t = ac.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => tone(f, 0.16, "triangle", 0.15, t + i * 0.10));
    },
    lose() {
      if (!Audio.enabled()) return;
      const ac = ensure();
      if (!ac) return;
      const t = ac.currentTime;
      [392, 349, 294, 220].forEach((f, i) => tone(f, 0.18, "sawtooth", 0.12, t + i * 0.12));
    },
    place() {
      if (Audio.enabled()) tone(523, 0.06, "square", 0.10);
    },
    move() {
      if (Audio.enabled()) tone(330, 0.05, "sine", 0.08);
    },
    // Soft two-note chime when a game opens / palette appears.
    open() {
      if (!Audio.enabled()) return;
      const ac = ensure();
      if (!ac) return;
      const t = ac.currentTime;
      tone(392, 0.08, "sine", 0.10, t);
      tone(587.33, 0.12, "sine", 0.10, t + 0.07);
    },
    // Gentle downward blip when a game closes / palette hides.
    close() {
      if (!Audio.enabled()) return;
      const ac = ensure();
      if (!ac) return;
      const t = ac.currentTime;
      tone(587.33, 0.07, "sine", 0.08, t);
      tone(392, 0.10, "sine", 0.08, t + 0.06);
    },
    // Tiny sparkle for achievement unlocks / palette selection.
    ding() {
      if (!Audio.enabled()) return;
      const ac = ensure();
      if (!ac) return;
      const t = ac.currentTime;
      tone(880, 0.09, "triangle", 0.12, t);
      tone(1318.51, 0.14, "triangle", 0.10, t + 0.06);
    },
  };

  global.AudioFX = Audio;
})(window);
