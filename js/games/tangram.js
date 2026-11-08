/* tangram — the real Tangram: 7 tans, drag/rotate/flip to rebuild
   the classic square (or freestyle). Canonical square dissection (side 4):
   LT1 (0,4)(4,4)(2,2) · LT2 (0,0)(0,4)(2,2) · MT (2,0)(4,0)(4,2)
   ST1 (4,2)(4,4)(3,3) · SQ (2,2)(3,1)(4,2)(3,3) · PARA (0,0)(2,0)(3,1)(1,1)
   ST2 (1,1)(2,2)(3,1)  — areas 4+4+2+1+2+2+1 = 16 = 4×4 ✓ */
(function () {
  "use strict";
  // local shapes = target polygons inside the 4×4 square (so target rot = 0, no flip)
  const PIECES = [
    {id: "LT1", poly: [[0, 4], [4, 4], [2, 2]], color: "#2563eb"},
    {id: "LT2", poly: [[0, 0], [0, 4], [2, 2]], color: "#0891b2"},
    {id: "MT", poly: [[2, 0], [4, 0], [4, 2]], color: "#16a34a"},
    {id: "ST1", poly: [[4, 2], [4, 4], [3, 3]], color: "#ca8a04"},
    {id: "SQ", poly: [[2, 2], [3, 1], [4, 2], [3, 3]], color: "#dc2626"},
    {id: "PARA", poly: [[0, 0], [2, 0], [3, 1], [1, 1]], color: "#9333ea"},
    {id: "ST2", poly: [[1, 1], [2, 2], [3, 1]], color: "#f97316"},
  ];
  const SCALE = 92, OFF = 26; // board 4*92 = 368 + margin

  GameRegistry.register({
    id: "tangram", name: "Tangram", icon: "🔺", category: "strategy",
    description: "Drag, rotate and flip the 7 tans to rebuild the square", tags: ["puzzle", "classic", "shapes"],
    age: ["kids", "teens", "adults"], difficulty: "medium", duration: "medium", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, over = false;
      let mode = "square"; // square | free
      let sel = null;
      // piece state: x,y (board coords), rot (deg, multiple of 45), flip (bool), locked
      let state = PIECES.map(p => {
        const cx = p.poly.reduce((s, q) => s + q[0], 0) / p.poly.length;
        const cy = p.poly.reduce((s, q) => s + q[1], 0) / p.poly.length;
        return {ref: p, tx: cx, ty: cy, x: 0, y: 0, rot: 0, flip: false, locked: false};
      });

      function scrambled() {
        for (const s of state) {
          s.locked = false;
          s.rot = 45 * (1 + Math.floor(Math.random() * 7));
          s.flip = s.ref.id === "PARA" ? Math.random() < 0.5 : false;
          s.x = 8.5 + Math.random() * 3; // scattered to the right of the 4x4 target
          s.y = 0.5 + Math.random() * 6.5;
          if (mode === "square" && Math.random() < 0.5) {
            s.x = 0.5 + Math.random() * 3;
            s.y = 4.8 + Math.random() * 2.8;
          } // or below
        }
        over = false;
      }

      function toStr(poly, s) {
        return poly.map(([px, py]) => {
          let dx = px - (s.ref ? 0 : 0), x = px, y = py;
          // rotate around piece centroid
          const cx = s.cx0, cy = s.cy0;
          const a = (s.rot * Math.PI) / 180;
          let rx = x - cx, ry = y - cy;
          if (s.flip) rx = -rx;
          const X = cx + rx * Math.cos(a) - ry * Math.sin(a);
          const Y = cy + rx * Math.sin(a) + ry * Math.cos(a);
          return ((OFF + (s.x + (X - cx)) * SCALE)).toFixed(1) + "," + ((OFF + (s.y + (Y - cy)) * SCALE)).toFixed(1);
        }).join(" ");
      }

      function render() {
        const svg = root.querySelector("#tg-svg");
        if (!svg) return;
        let html = "";
        if (mode === "square") {
          html += `<rect x="${OFF}" y="${OFF}" width="${4 * SCALE}" height="${4 * SCALE}" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="6 4" rx="4"/>`;
        }
        for (const s of state) {
          const pts = toStr(s.ref.poly, s);
          const op = s.locked ? 1 : 0.82;
          html += `<polygon data-id="${s.ref.id}" points="${pts}" fill="${s.color}" fill-opacity="${op}"
            stroke="${s === sel ? "#fff" : "#0f172a"}" stroke-width="${s === sel ? 3 : 1.5}" style="cursor:grab;"/>`;
        }
        svg.innerHTML = html;
        const st = root.querySelector("#tg-status");
        if (st) {
          const n = state.filter(s => s.locked).length;
          if (mode === "free") {
            st.textContent = "Freestyle — arrange the tans into anything you like.";
            st.className = "status info";
          } else if (over) {
            st.textContent = "🎉 Square rebuilt! Beautiful work.";
            st.className = "status win";
          } else {
            st.textContent = `Fit the tans back into the square — ${n}/7 placed.`;
            st.className = "status info";
          }
        }
      }

      function checkWin() {
        if (mode !== "square" || over) return;
        if (state.every(s => s.locked)) {
          over = true;
          AudioFX.win();
          App.recordResult(true, 1);
          render();
        }
      }

      root.innerHTML = `
        <style>
          .tg-svg { display: block; margin: 0 auto; background: var(--bg-elev); border-radius: 12px; touch-action: none; }
          .tg-btns { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 8px; }
        </style>
        <div class="tg-btns">
          <button class="btn" id="tg-rot">⟳ Rotate</button>
          <button class="btn" id="tg-flip">⇄ Flip</button>
          <button class="btn" id="tg-new">🔀 Scatter</button>
          <button class="btn" id="tg-mode">${mode === "square" ? "Freestyle" : "Square puzzle"}</button>
        </div>
        <div class="status info" id="tg-status"></div>
        <svg class="tg-svg" id="tg-svg" viewBox="0 0 ${OFF * 2 + 12 * SCALE} ${OFF * 2 + 8 * SCALE}" width="100%" style="max-width:760px;"></svg>
        <p class="hint" style="text-align:center;">Drag to move · select a piece then <b>Rotate</b>/<b>Flip</b> · pieces snap when correct</p>
      `;
      const svg = root.querySelector("#tg-svg");

      // precompute centroids into state
      for (const s of state) {
        s.cx0 = s.ref.poly.reduce((a, q) => a + q[0], 0) / s.ref.poly.length;
        s.cy0 = s.ref.poly.reduce((a, q) => a + q[1], 0) / s.ref.poly.length;
      }

      function svgPt(e) {
        const r = svg.getBoundingClientRect();
        const vb = svg.viewBox.baseVal;
        return [((e.clientX - r.left) / r.width) * vb.width, ((e.clientY - r.top) / r.height) * vb.height];
      }

      function pick(e) {
        const [mx, my] = svgPt(e);
        // topmost = last drawn; iterate reverse
        for (let i = state.length - 1; i >= 0; i--) {
          const s = state[i];
          if (s.locked) continue;
          // approximate hit test: distance to centroid < 1.6 units (generous)
          const cx = OFF + s.x * SCALE, cy = OFF + s.y * SCALE;
          if (Math.hypot(mx - cx, my - cy) < 1.7 * SCALE) return s;
        }
        return null;
      }

      let drag = null;
      svg.addEventListener("pointerdown", e => {
        const s = pick(e);
        if (!s) return;
        sel = s;
        AudioFX.click();
        const [mx, my] = svgPt(e);
        drag = {s, dx: mx - (OFF + s.x * SCALE), dy: my - (OFF + s.y * SCALE)};
        svg.setPointerCapture(e.pointerId);
        render();
      });
      svg.addEventListener("pointermove", e => {
        if (!drag || drag.s.locked) return;
        const [mx, my] = svgPt(e);
        drag.s.x = (mx - drag.dx - OFF) / SCALE;
        drag.s.y = (my - drag.dy - OFF) / SCALE;
        render();
      });
      svg.addEventListener("pointerup", () => {
        if (drag) {
          const s = drag.s;
          // snap check
          if (mode === "square" && Math.abs(s.rot % 360) < 8 && !s.flip &&
            Math.abs(s.x - s.tx) < 0.45 && Math.abs(s.y - s.ty) < 0.45) {
            s.locked = true;
            s.x = s.tx;
            s.y = s.ty;
            s.rot = 0;
            AudioFX.reveal();
            checkWin();
          }
          drag = null;
          render();
        }
      });

      root.querySelector("#tg-rot").addEventListener("click", () => {
        if (sel && !sel.locked) {
          sel.rot = (sel.rot + 45) % 360;
          AudioFX.click();
          render();
        } else App.toast("Select a piece first (click it)", "info");
      });
      root.querySelector("#tg-flip").addEventListener("click", () => {
        if (sel && !sel.locked) {
          sel.flip = !sel.flip;
          AudioFX.click();
          render();
        } else App.toast("Select a piece first (click it)", "info");
      });
      root.querySelector("#tg-new").addEventListener("click", () => {
        AudioFX.click();
        scrambled();
        sel = null;
        render();
      });
      root.querySelector("#tg-mode").addEventListener("click", e => {
        AudioFX.click();
        mode = mode === "square" ? "free" : "square";
        e.target.textContent = mode === "square" ? "Freestyle" : "Square puzzle";
        if (mode === "square") scrambled();
        else for (const s of state) s.locked = false;
        sel = null;
        over = false;
        render();
      });

      scrambled();
      render();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Tangram",
        "The 7 tans: 2 large triangles, 1 medium, 2 small, 1 square and 1 parallelogram." +
        "<br><b>Drag</b> a piece to move it. Select it, then <b>Rotate</b> (45° steps) or <b>Flip</b> it." +
        "<br>Goal: fit all 7 back into the dashed square — pieces glow solid when they snap into the right place." +
        "<br>Switch to <b>Freestyle</b> to build your own shapes.");
    },
  });
})();
