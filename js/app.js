/* ============================================================
   app.js — main controller: routing, theme, grid, modals, toasts
   ============================================================ */
(function (global) {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const App = {
    currentGame: null,
    currentCleanup: null,
    state: {
      filter: "all",
      favOnly: false,
      search: "",
      ageFilter: "all",
      diffFilter: "all",
      durFilter: "all",
      playersFilter: "all",
      sort: "default",
      tags: [],           // required tag chips (AND semantics)
      collectionFilter: null, // active #/collection/<id> route
    },

    // Session summary — counters for this page visit.
    _session: {start: Date.now(), games: 0, wins: 0, wrapShown: false},
    // Daily-challenge seeded RNG state.
    _origRandom: null,

    // Batched grid rendering state (see renderGrid / _renderCardBatch).
    _gridBatch: null,
    // Hover sound only on devices that actually have hover (desktop pointers).
    _hoverSoundOk: !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches),

    // ---------- Theme + mode + sound ----------
    applyTheme() {
      const theme = Storage.getTheme();
      const mode = Storage.getMode();
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.setAttribute("data-mode", mode);
      // Custom theme: write the user's accent + font choices as inline CSS
      // variables (base light/dark neutrals live in themes.css). Cleared
      // whenever a built-in theme is picked so nothing leaks across themes.
      App._applyCustomThemeVars(theme === "custom");
      // Sync the custom-theme builder panel (visible only for the custom theme).
      App._syncThemeBuilder(theme === "custom");
      $$(".menu-chip").forEach(c => {
        const active = c.dataset.themeId === theme;
        c.classList.toggle("active", active);
        c.setAttribute("aria-pressed", active ? "true" : "false");
      });
      $("#mode-sun").classList.toggle("hidden", mode === "dark");
      $("#mode-moon").classList.toggle("hidden", mode === "light");
      const modeBtn = $("#mode-btn");
      if (modeBtn) {
        modeBtn.setAttribute("aria-pressed", mode === "dark" ? "true" : "false");
        modeBtn.title = mode === "dark" ? "Switch to light mode" : "Switch to dark mode";
      }
    },
    setTheme(t) {
      const prev = Storage.getTheme();
      Storage.setTheme(t);
      App.applyTheme();
      // No grid re-render needed: themes are pure CSS variables and
      // cascade live. Rebuilding the grid here replayed every card's
      // fade-in animation, which felt like a page reload.
      // Count a theme change for the "New Coat of Paint" achievement —
      // only when the user actually picked a different theme.
      if (prev !== t) {
        Storage.bumpEvent("themeChanged");
        App.evaluateAchievements();
      }
    },
    toggleMode() {
      const next = Storage.getMode() === "dark" ? "light" : "dark";
      Storage.setMode(next);
      App.applyTheme();
    },
    applySound() {
      const on = Storage.getSound();
      $("#sound-on").classList.toggle("hidden", !on);
      $("#sound-off").classList.toggle("hidden", on);
      const btn = $("#sound-btn");
      if (btn) {
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.title = on ? "Mute sound" : "Unmute sound";
      }
    },
    toggleSound() {
      const next = !Storage.getSound();
      Storage.setSound(next);
      App.applySound();
      if (next) AudioFX.click();
      App.toast(next ? "Sound on" : "Sound muted", "info");
    },

    // ---------- Accessibility ----------
    applyA11y() {
      const a = Storage.getA11y();
      const html = document.documentElement;
      html.style.fontSize = a.fontScale + "%";
      html.setAttribute("data-a11y-contrast", a.highContrast ? "on" : "off");
      html.setAttribute("data-a11y-motion", a.reduceMotion ? "on" : "off");
      html.setAttribute("data-a11y-dyslexia", a.dyslexiaFont ? "on" : "off");
      html.setAttribute("data-a11y-focus", a.largeFocus ? "on" : "off");
      html.setAttribute("data-a11y-cb", a.colorBlind || "off");
      const valEl = $("#a11y-font-val");
      if (valEl) valEl.textContent = a.fontScale + "%";
      const contrastEl = $("#a11y-contrast");
      if (contrastEl) contrastEl.checked = !!a.highContrast;
      const motionEl = $("#a11y-motion");
      if (motionEl) motionEl.checked = !!a.reduceMotion;
      const dyslexiaEl = $("#a11y-dyslexia");
      if (dyslexiaEl) dyslexiaEl.checked = !!a.dyslexiaFont;
      const focusEl = $("#a11y-focus");
      if (focusEl) focusEl.checked = !!a.largeFocus;
      const cbEl = $("#a11y-cb");
      if (cbEl) cbEl.value = a.colorBlind || "off";
    },

    // ---------- Per-game <head> meta ----------
    // On first call, snapshots the original index.html <title>, <meta
    // name="description">, any Open Graph tags, and <link rel="canonical">.
    // For each opened game it swaps in per-game values (title, description,
    // og:title, og:description, og:type=website, og:url=current URL, and a
    // canonical link to the current URL). When a game closes, pass null to
    // restore the original head state. Any OG/canonical node we added is
    // tagged data-app-managed="1" so we can remove it cleanly on restore.
    _metaOriginal: null,
    _ensureMeta(attr, key, val) {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", val);
      el.setAttribute("data-app-managed", "1");
      return el;
    },
    _ensureCanonical(href) {
      let el = document.head.querySelector('link[rel="canonical"]');
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", "canonical");
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
      el.setAttribute("data-app-managed", "1");
      return el;
    },
    updateMeta(game) {
      // Snapshot the original head state the first time we run.
      if (App._metaOriginal == null) {
        const titleEl = document.head.querySelector("title");
        const descEl = document.head.querySelector('meta[name="description"]');
        const og = (p) => {
          const m = document.head.querySelector(`meta[property="${p}"]`);
          return m ? m.getAttribute("content") : null;
        };
        const canon = document.head.querySelector('link[rel="canonical"]');
        App._metaOriginal = {
          title: titleEl ? titleEl.textContent : "",
          description: descEl ? descEl.getAttribute("content") : "",
          ogTitle: og("og:title"),
          ogDescription: og("og:description"),
          ogType: og("og:type"),
          ogUrl: og("og:url"),
          canonical: canon ? canon.getAttribute("href") : null,
        };
      }
      if (!game) {
        // Restore the original head state.
        const titleEl = document.head.querySelector("title");
        if (titleEl) titleEl.textContent = App._metaOriginal.title;
        const descEl = document.head.querySelector('meta[name="description"]');
        if (descEl) descEl.setAttribute("content", App._metaOriginal.description);
        const restoreOrRemoveMeta = (selector, originalVal) => {
          const el = document.head.querySelector(selector);
          if (originalVal === null) {
            // Wasn't present originally — drop only what we added.
            if (el && el.getAttribute("data-app-managed") === "1") el.remove();
          } else if (el) {
            el.setAttribute("content", originalVal);
          }
        };
        restoreOrRemoveMeta('meta[property="og:title"]', App._metaOriginal.ogTitle);
        restoreOrRemoveMeta('meta[property="og:description"]', App._metaOriginal.ogDescription);
        restoreOrRemoveMeta('meta[property="og:type"]', App._metaOriginal.ogType);
        restoreOrRemoveMeta('meta[property="og:url"]', App._metaOriginal.ogUrl);
        const canon = document.head.querySelector('link[rel="canonical"]');
        if (App._metaOriginal.canonical === null) {
          if (canon && canon.getAttribute("data-app-managed") === "1") canon.remove();
        } else if (canon) {
          canon.setAttribute("href", App._metaOriginal.canonical);
        }
        return;
      }
      // Apply per-game meta.
      const title = `${game.name} — Pixel Arcade`;
      const desc = game.description || title;
      let titleEl = document.head.querySelector("title");
      if (!titleEl) {
        titleEl = document.createElement("title");
        document.head.appendChild(titleEl);
      }
      titleEl.textContent = title;
      let descEl = document.head.querySelector('meta[name="description"]');
      if (!descEl) {
        descEl = document.createElement("meta");
        descEl.setAttribute("name", "description");
        document.head.appendChild(descEl);
      }
      descEl.setAttribute("content", desc);
      App._ensureMeta("property", "og:title", title);
      App._ensureMeta("property", "og:description", desc);
      App._ensureMeta("property", "og:type", "website");
      App._ensureMeta("property", "og:url", location.href);
      App._ensureCanonical(location.href);
    },

    // ---------- Grid rendering ----------
    // Batched rendering: instead of building all 300 cards in one go (which
    // blocks first paint for hundreds of ms on slow devices), we render the
    // first BATCH cards synchronously and append further batches as the user
    // scrolls toward a sentinel element. Sorting/filtering logic is unchanged
    // — only the DOM append is chunked.
    renderGrid() {
      const grid = $("#game-grid");
      // Tear down the previous batch state + sentinel observer.
      if (App._gridBatch && App._gridBatch.observer) App._gridBatch.observer.disconnect();
      App._gridBatch = null;
      // Use the registry's multi-dimensional filter
      let list = GameRegistry.filter({
        category: App.state.filter,
        age: App.state.ageFilter,
        difficulty: App.state.diffFilter,
        duration: App.state.durFilter,
        players: App.state.playersFilter,
        search: App.state.search,
        favOnly: App.state.favOnly,
        tags: App.state.tags,
      });
      // Exclude hidden games (unless showing favorites, where hidden games
      // should still be reachable so the user can un-favorite them).
      if (!App.state.favOnly) {
        list = list.filter(g => !Storage.isHidden(g.id));
      }
      // Collection landing route (#/collection/<id>) narrows the grid
      // to the collection's members.
      if (App.state.collectionFilter && window.Collections) {
        const c = Collections.get(App.state.collectionFilter);
        if (c) list = list.filter(g => c.match(g));
        else App.state.collectionFilter = null;
      }

      // Render the home rails: daily challenge, curated collections,
      // recommended (trending + for-you), recently played, and the "new
      // games" (v4 batch) rail.
      App.renderDailyChallenge();
      App.renderCollectionsShelf();
      App.renderHomeRecommended();
      App.renderHomeRecent();
      App.renderHomeNew();
      // Refresh the hero greeting — streak / completion counters may have
      // changed since the last render.
      App._renderGreeting();

      grid.innerHTML = "";
      if (list.length === 0) {
        grid.innerHTML = `<div class="empty-state">
          <div class="empty-icon">🎮</div>
          <div class="empty-title">No games match your filter</div>
          <div class="empty-desc">Try resetting the filters or searching for something else.</div>
          <button class="btn primary" onclick="document.getElementById('filters-reset').click()">Reset filters</button>
        </div>`;
        const countEl = $("#filter-count");
        if (countEl) countEl.textContent = list.length;
        App._renderAzBar(list);
        App._renderTagChips();
        return;
      }

      // Apply sorting. The default is the STABLE registry order — favorites
      // used to float to the top automatically, which re-sorted the grid on
      // every toggle and made the ordering feel shuffled. "Favorites first"
      // is now an explicit, opt-in sort.
      const sortMode = App.state.sort;
      const favFirst = (a, b) => {
        const fa = Storage.isFavorite(a.id) ? 0 : 1;
        const fb = Storage.isFavorite(b.id) ? 0 : 1;
        return fa - fb;
      };
      if (sortMode === "favorites") {
        list.sort(favFirst);
      } else if (sortMode === "name") {
        list.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortMode === "plays") {
        list.sort((a, b) => {
          const pa = (Storage.getStats().gamesPlayed[a.id] || 0);
          const pb = (Storage.getStats().gamesPlayed[b.id] || 0);
          return pb - pa;
        });
      } else if (sortMode === "recent") {
        const recent = Storage.getRecent();
        list.sort((a, b) => {
          const ia = recent.indexOf(a.id);
          const ib = recent.indexOf(b.id);
          if (ia === -1 && ib === -1) return 0;
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        });
      } else if (sortMode === "best") {
        list.sort((a, b) => {
          const ba = Storage.getBest(a.id);
          const bb = Storage.getBest(b.id);
          if (ba === null && bb === null) return 0;
          if (ba === null) return 1;
          if (bb === null) return -1;
          return bb - ba;
        });
      } else {
        // Default: stable registry order — no re-sort, so favoriting never
        // shuffles the grid.
      }

      // A–Z jump bar (only meaningful when sorted by name) + tag chips.
      App._renderAzBar(list);
      App._renderTagChips();

      // Kick off batched rendering: the first batch is synchronous so the
      // grid fills immediately; the rest stream in on scroll.
      App._gridBatch = {list: list, rendered: 0, sentinel: null, observer: null, done: false};
      App._renderCardBatch();

      // Update visible count if the element exists
      const countEl = $("#filter-count");
      if (countEl) countEl.textContent = list.length;
    },

    // Render the next batch of grid cards (or up to `untilIdx` when jumping).
    _renderCardBatch(untilIdx) {
      const state = App._gridBatch;
      if (!state || state.done) return;
      const BATCH = 60;
      const grid = $("#game-grid");
      const total = state.list.length;
      const target = Math.min(untilIdx != null ? untilIdx : state.rendered + BATCH, total);
      if (target <= state.rendered) return;
      const frag = document.createDocumentFragment();
      for (let i = state.rendered; i < target; i++) {
        frag.appendChild(App._buildCard(state.list[i], i));
      }
      grid.appendChild(frag);
      state.rendered = target;
      if (state.rendered >= total) {
        App._gridBatchDone();
      } else {
        App._ensureGridSentinel();
      }
    },

    // Append (or move) the scroll sentinel that triggers the next batch.
    _ensureGridSentinel() {
      const state = App._gridBatch;
      const grid = $("#game-grid");
      if (!state || !grid) return;
      if (!state.sentinel) {
        state.sentinel = document.createElement("div");
        state.sentinel.className = "grid-sentinel";
        state.sentinel.setAttribute("aria-hidden", "true");
      }
      grid.appendChild(state.sentinel);
      if (!state.observer && "IntersectionObserver" in window) {
        state.observer = new IntersectionObserver((entries) => {
          if (entries.some(e => e.isIntersecting)) {
            // Render the next batch; if the sentinel is still in view
            // (short viewport / huge cards) the observer fires again.
            App._renderCardBatch();
          }
        }, {rootMargin: "600px 0px"});
      }
      if (state.observer) {
        state.observer.disconnect();
        state.observer.observe(state.sentinel);
      }
    },

    _gridBatchDone() {
      const state = App._gridBatch;
      if (!state) return;
      state.done = true;
      if (state.observer) state.observer.disconnect();
      if (state.sentinel && state.sentinel.parentNode) state.sentinel.remove();
    },

    // Build one game card (extracted from renderGrid for batching).
    _buildCard(g, idx) {
      const best = Storage.getBest(g.id);
      const isFav = Storage.isFavorite(g.id);
      const plays = Storage.getStats().gamesPlayed[g.id] || 0;
      const playtime = Storage.getPlaytimeFor(g.id);
      const card = document.createElement("button");
      card.className = "card";
      card.dataset.id = g.id;
      // Roving tabindex: only the first card is tabbable; arrow keys
      // move focus within the grid (see _setupGridKeyboard).
      card.tabIndex = idx === 0 ? 0 : -1;
      card.style.animationDelay = Math.min(idx * 0.02, 0.3) + "s"; // stagger fade-in
      // Difficulty badge (text, color-coded) + duration + players
      const diffLabel = g.difficulty === "easy" ? "Easy" : g.difficulty === "hard" ? "Hard" : "Medium";
      const diffClass = g.difficulty === "easy" ? "badge-easy" : g.difficulty === "hard" ? "badge-hard" : "badge-medium";
      const badges = [`<span class="badge badge-diff ${diffClass}" title="Difficulty: ${diffLabel}">${diffLabel}</span>`];
      if (g.duration) badges.push(`<span class="badge badge-dur">${g.duration}</span>`);
      if (g.players === "2p" || g.players === "either") badges.push('<span class="badge badge-2p">👥 2P</span>');
      // Hover tooltip with play stats (plays · best · time played)
      const tooltipParts = [];
      if (plays > 0) tooltipParts.push(`${plays} play${plays === 1 ? "" : "s"}`);
      if (best !== null) tooltipParts.push(`best: ${best}`);
      if (playtime >= 60) tooltipParts.push(App._formatDuration(playtime) + " played");
      const tooltip = tooltipParts.length ? `<div class="card-tooltip">${tooltipParts.join(" · ")}</div>` : "";
      // NEW badge: no games are currently flagged as "new" — the user opted
      // to leave this empty for now and will populate it when adding future
      // games. Set this to an array of game IDs to mark them as new.
      const newGames = [];
      const isNew = newGames.includes(g.id);
      card.innerHTML = `
          ${isNew ? '<span class="new-badge">NEW</span>' : ""}
          <button class="fav ${isFav ? "active" : ""}" data-fav="${g.id}" title="${isFav ? "Remove from favorites" : "Add to favorites"}" aria-label="${isFav ? "Remove from favorites" : "Add to favorites"}" aria-pressed="${isFav}">${isFav ? "♥" : "♡"}</button>
          ${tooltip}
          <div class="thumb-wrap">
            <img class="thumb" src="assets/thumbnails/${g.id}.svg" alt="${g.name} thumbnail" loading="lazy" decoding="async"
              onload="this.closest('.thumb-wrap').classList.add('thumb-loaded')"
              onerror="this.closest('.thumb-wrap').classList.add('thumb-error')"/>
            <div class="thumb-preview">${g.description}</div>
          </div>
          <div class="icon">${g.icon}</div>
          <div class="title">${g.name}</div>
          <div class="desc">${g.description}</div>
          <div class="meta">
            <span class="tag">${g.category}</span>
            <span class="badges">${badges.join("")}</span>
            ${best !== null ? `<span class="best">★ ${best}</span>` : ""}
          </div>
        `;
      card.addEventListener("click", (e) => {
        if (e.target.closest("[data-fav]")) return; // favorite click handled separately
        AudioFX.click();
        App.openGame(g.id);
      });
      // Right-click → hide game (context menu suppressed)
      card.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        App.toggleHidden(g.id);
      });
      // Long-press (mobile) → hide game
      let pressTimer = null;
      card.addEventListener("touchstart", () => {
        pressTimer = setTimeout(() => {
          App.toggleHidden(g.id);
          pressTimer = null;
        }, 600);
      }, {passive: true});
      card.addEventListener("touchend", () => {
        if (pressTimer) clearTimeout(pressTimer);
      }, {passive: true});
      card.addEventListener("touchmove", () => {
        if (pressTimer) clearTimeout(pressTimer);
      }, {passive: true});
      // Hover: preload the game script (future lazy-load hook) + a very
      // subtle tick on devices that actually have a hover pointer.
      card.addEventListener("mouseenter", () => {
        App._preloadHint(g.id);
        if (App._hoverSoundOk && !Storage.getA11y().reduceMotion) AudioFX.hover();
      });
      const favBtn = card.querySelector("[data-fav]");
      favBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const added = Storage.toggleFavorite(g.id);
        AudioFX.pop();
        App.toast(added ? `Added "${g.name}" to favorites` : `Removed "${g.name}" from favorites`, "info");
        // Update the heart in place. A full renderGrid() here used to
        // rebuild every card — all fade-in animations replayed and the
        // grid re-sorted, which looked exactly like a page reload.
        App._syncFavUi(g.id, favBtn);
        // In favorites-only view an un-favorited card no longer matches
        // the filter — fade it out instead of re-rendering the grid.
        if (!added && App.state.favOnly) App._removeCardFromGrid(g.id);
      });
      return card;
    },

    // Format seconds as a compact human duration ("2h 05m" / "12m" / "45s").
    _formatDuration(secs) {
      secs = Math.max(0, Math.floor(secs || 0));
      if (secs < 60) return secs + "s";
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
      return `${m}m`;
    },

    // ---------- A–Z jump bar (visible when sorted by name) ----------
    _renderAzBar(list) {
      const host = $("#az-bar");
      if (!host) return;
      if (App.state.sort !== "name" || list.length < 10) {
        host.style.display = "none";
        host.innerHTML = "";
        return;
      }
      host.style.display = "";
      host.innerHTML = "";
      const buckets = {};
      list.forEach(g => {
        const c = (g.name[0] || "?").toUpperCase();
        const key = /[A-Z]/.test(c) ? c : "#";
        buckets[key] = (buckets[key] || 0) + 1;
      });
      ["#"].concat("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")).forEach(L => {
        const n = buckets[L] || 0;
        const b = document.createElement("button");
        b.className = "az-letter" + (n ? "" : " empty");
        b.textContent = L;
        b.disabled = !n;
        b.setAttribute("aria-label", n ? `Jump to ${n} game${n === 1 ? "" : "s"} starting with ${L}` : `No games starting with ${L}`);
        if (n) b.title = `${n} game${n === 1 ? "" : "s"} starting with “${L}”`;
        if (n) b.addEventListener("click", () => {
          AudioFX.click();
          App._jumpToLetter(L);
        });
        host.appendChild(b);
      });
    },

    // Jump to the first game whose name starts with `L` ("#" = digits/symbols).
    // Renders any pending batches up to the target first (the card may not be
    // in the DOM yet under batched rendering).
    _jumpToLetter(L) {
      const state = App._gridBatch;
      if (!state) return;
      const idx = state.list.findIndex(g => {
        const c = (g.name[0] || "?").toUpperCase();
        return L === "#" ? !/[A-Z]/.test(c) : c === L;
      });
      if (idx === -1) return;
      if (idx >= state.rendered) App._renderCardBatch(idx + 1);
      const card = document.querySelector(`#game-grid .card[data-id="${state.list[idx].id}"]`);
      if (!card) return;
      const reduce = Storage.getA11y().reduceMotion;
      card.scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "start"});
      card.focus({preventScroll: true});
    },

    // ---------- Tag filter chips (derived from catalog tags) ----------
    _renderTagChips() {
      const host = $("#tag-chips-row");
      if (!host) return;
      host.innerHTML = "";
      if (!GameRegistry.tagCounts) return;
      const TOP = 14;
      const MIN_COUNT = 4; // hide one-off tags
      const list = GameRegistry.tagCounts(MIN_COUNT).slice(0, TOP);
      if (list.length < 4) {
        host.style.display = "none";
        return;
      }
      host.style.display = "";
      list.forEach(({tag, count}) => {
        const on = App.state.tags.includes(tag);
        const b = document.createElement("button");
        b.className = "tag-chip" + (on ? " active" : "");
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.title = on ? `Remove “${tag}” filter` : `Show only games tagged “${tag}”`;
        b.innerHTML = `${tag} <span class="tag-count">${count}</span>`;
        b.addEventListener("click", () => {
          AudioFX.click();
          const i = App.state.tags.indexOf(tag);
          if (i === -1) App.state.tags.push(tag);
          else App.state.tags.splice(i, 1);
          App.renderGrid();
          App.toast(App.state.tags.length
            ? `Tag filter: ${App.state.tags.join(" + ")}`
            : "Tag filter cleared", "info");
        });
        host.appendChild(b);
      });
    },

    // Sync every on-screen favorite indicator for one game WITHOUT
    // re-rendering the grid: the card heart (and the game-view button when
    // that game is open) are updated in place. This keeps toggling a
    // favorite instant and stops the grid from "reloading".
    _syncFavUi(id, btnEl) {
      const isFav = Storage.isFavorite(id);
      const btn = btnEl || document.querySelector(`#game-grid .card[data-id="${id}"] .fav`);
      if (btn) {
        btn.classList.toggle("active", isFav);
        btn.textContent = isFav ? "♥" : "♡";
        btn.setAttribute("aria-pressed", isFav ? "true" : "false");
        const label = isFav ? "Remove from favorites" : "Add to favorites";
        btn.setAttribute("aria-label", label);
        btn.title = label;
      }
      if (App.currentGame && App.currentGame.id === id) App.updateGameFavBtn();
    },

    // Remove a single card from the grid with a short fade-out (used when a
    // card stops matching the active "favorites only" filter). Falls back
    // to a full re-render when the grid would become empty, so the empty
    // state still shows.
    _removeCardFromGrid(id) {
      const card = document.querySelector(`#game-grid .card[data-id="${id}"]`);
      if (!card) return;
      const cards = document.querySelectorAll("#game-grid .card");
      if (cards.length <= 1) {
        App.renderGrid();
        return;
      }
      // If keyboard focus is inside the departing card, hand it to a
      // neighboring card so keyboard navigation keeps working.
      if (card.contains(document.activeElement)) {
        const sibs = Array.from(cards).filter(c => c !== card);
        const pos = Array.prototype.indexOf.call(cards, card);
        const nextCard = sibs[Math.min(pos, sibs.length - 1)] || sibs[0];
        if (nextCard) nextCard.focus();
      }
      const countEl = $("#filter-count");
      if (countEl) countEl.textContent = cards.length - 1;
      card.style.transition = "opacity 0.25s ease, transform 0.25s ease";
      card.style.opacity = "0";
      card.style.transform = "scale(0.92)";
      setTimeout(() => {
        card.remove();
        if (!document.querySelectorAll("#game-grid .card").length) App.renderGrid();
      }, 250);
    },

    // ---------- Routing ----------
    route() {
      const hash = location.hash.replace(/^#\/?/, "");
      // Deep link support: ?game=id opens that game directly (shareable URL).
      if (!hash) {
        const qs = new URLSearchParams(location.search);
        const gameQ = qs.get("game");
        if (gameQ && GameRegistry.get(gameQ)) {
          App.openGame(gameQ);
          return;
        }
        // PWA manifest shortcut: ?random=1 opens a surprise game.
        if (qs.get("random")) {
          const pick = App._randomPick();
          if (pick) {
            App.openGame(pick.id);
            return;
          }
        }
        // Category landing routes: #/category/word (in-app) and the
        // crawler-friendly ?category=word variant (used in sitemap.xml).
        const catQ = qs.get("category");
        if (catQ && App._applyCategoryRoute(catQ)) return;
        App._clearCategoryRoute();
        App.closeGame();
        return;
      }
      if (hash.indexOf("category/") === 0) {
        // Self-originated hash change (see _gotoCategory) — already applied.
        if (App._hashOpenId === hash) {
          App._hashOpenId = null;
          return;
        }
        App._applyCategoryRoute(hash.slice("category/".length));
        return;
      }
      // Collection landing routes: #/collection/five-minute-breaks
      if (hash.indexOf("collection/") === 0) {
        if (App._hashOpenId === hash) {
          App._hashOpenId = null;
          return;
        }
        App._applyCollectionRoute(hash.slice("collection/".length));
        return;
      }
      const game = GameRegistry.get(hash);
      if (game) {
        // Skip the re-open when the hashchange was triggered by openGame()
        // itself (card click / openGame setting location.hash). Without this
        // guard every card click mounted the game twice and double-counted
        // the play in the stats log.
        if (App._hashOpenId === hash) {
          App._hashOpenId = null;
          return;
        }
        App.openGame(hash);
      } else App.closeGame();
    },

    // Apply a category landing route: closes any open game, filters the grid
    // to that category, and shows a proper landing heading above the grid.
    // Returns true when the category is valid.
    _applyCategoryRoute(cat) {
      const valid = ["word", "logic", "arcade", "strategy", "quiz"];
      if (!valid.includes(cat)) return false;
      if (App.currentGame) App.closeGame();
      App.state.filter = cat;
      App.state.collectionFilter = null; // one route at a time
      // Sync the category chips with the route.
      $$('.filter-chip[data-dim="category"]').forEach(x => {
        const on = x.dataset.filter === cat;
        x.classList.toggle("active", on);
      });
      App.renderGrid();
      // Landing banner + document title (meta description follows too).
      const banner = $("#category-banner");
      if (banner) {
        const label = cat.charAt(0).toUpperCase() + cat.slice(1);
        const count = GameRegistry.byCategory(cat).filter(g => !Storage.isHidden(g.id)).length;
        $("#category-title").textContent = `${label} games`;
        $("#category-desc").textContent =
          `${count} free ${label.toLowerCase()} games — no installs, no login, playable right in your browser. Part of the 300-game Pixel Arcade collection.`;
        banner.style.display = "";
      }
      const titleEl = document.head.querySelector("title");
      if (titleEl) titleEl.textContent = `${cat.charAt(0).toUpperCase() + cat.slice(1)} Games — Pixel Arcade`;
      window.scrollTo(0, 0);
      App.announce(`Showing ${cat} games.`);
      return true;
    },

    // Leave a category landing route: hide the banner, restore the title.
    // No-op while the URL still points at a category route (e.g. closeGame
    // ran while browsing #/category/word) unless `force` is set.
    _clearCategoryRoute(force) {
      const onRoute = location.hash.indexOf("#/category/") === 0 ||
        location.hash.indexOf("#/collection/") === 0;
      if (!force && onRoute) return;
      const banner = $("#category-banner");
      if (banner && banner.style.display !== "none") {
        banner.style.display = "none";
        // Restore the default <title> / meta description.
        App.updateMeta(null);
      }
    },

    // "✕ View all games" on the category landing banner — leave the route.
    // Also serves as the exit for collection routes.
    _exitCategoryRoute() {
      App.state.filter = "all";
      App.state.collectionFilter = null;
      $$('.filter-chip[data-dim="category"]').forEach(x => {
        x.classList.toggle("active", x.dataset.filter === "all");
      });
      if (location.hash.indexOf("#/category/") === 0 || location.hash.indexOf("#/collection/") === 0) {
        history.replaceState(null, "", location.pathname + location.search);
      }
      App._clearCategoryRoute(true);
      App.renderGrid();
      App.announce("Showing all games.");
    },

    openGame(id) {
      const game = GameRegistry.get(id);
      if (!game) return;
      // Lazy games: fetch + run the real script, then re-open the registered game.
      if (game.lazy && GameRegistry.load) {
        const btn = $("#game-view");
        GameRegistry.load(id).then(() => {
          App.openGame(id);
        }).catch(err => {
          console.error("Failed to load game", id, err);
          const stage = $("#game-stage");
          if (stage) stage.innerHTML = '<div class="status lose" style="padding:20px;text-align:center;">Could not load ' + id + '</div>';
        });
        return;
      }
      // Remember which card was focused so we can restore focus on close
      App._lastFocusedCard = id;
      // Cleanup previous
      if (App.currentCleanup) {
        try {
          App.currentCleanup();
        } catch (e) {
        }
        App.currentCleanup = null;
      }
      App.currentGame = game;

      // Daily Challenge: while today's not-yet-completed daily game
      // is open, swap Math.random for the date-seeded PRNG so every visitor
      // plays the identical deal.
      const dailyGame = App.getDailyGame();
      const dailyState = Storage.getDaily();
      if (dailyGame && dailyGame.id === id && dailyState.date !== App._todayKey()) {
        App._installDailyRNG(App._dailySeed());
      } else {
        App._restoreRandom();
      }

      // Session wrap-up counters
      App._session.games++;

      // Per-game <head> meta: title, description, Open Graph tags, canonical.
      App.updateMeta(game);

      // Record this game in the recently-played list (most-recent-first)
      Storage.addRecent(id);
      // Record a play (no win/score yet — games can call App.recordResult later)
      Storage.recordPlay(id, false, null);

      // Evaluate achievements + milestones after recording the play
      const newly = App.evaluateAchievements();
      newly.forEach(a => {
        App.toast(`🏅 Achievement unlocked: ${a.title}`, "success");
        App._fireConfetti();
        AudioFX.ding();
      });
      App._checkMilestones();

      // Start the play-time tracker for this session (flushed every 15s,
      // on close, and on unload — see _setupPlaytimeTracking).
      App._startPlayTimer(id);

      // Update header
      $("#game-icon").textContent = game.icon;
      $("#game-title").textContent = game.name;
      $("#game-breadcrumb").textContent = game.category;
      // Show/hide Help / Hint / Solve / Share based on what the game supports
      $("#game-help-btn").classList.toggle("hidden", !game.help);
      $("#game-hint-btn").classList.toggle("hidden", !game.hint);
      $("#game-solve-btn").classList.toggle("hidden", !game.solve);
      // Share button is always available — it shares a generic result line
      App.updateGameFavBtn();

      // Variant (difficulty) selector: games that declare `variants`
      // get a compact dropdown in the game header; the choice persists.
      const varHost = $("#game-variant-host");
      if (varHost) {
        varHost.innerHTML = "";
        if (Array.isArray(game.variants) && game.variants.length > 1) {
          const sel = document.createElement("select");
          sel.id = "game-variant-select";
          sel.className = "variant-select";
          sel.setAttribute("aria-label", "Choose a difficulty for this game");
          sel.title = "Difficulty";
          game.variants.forEach(v => {
            const o = document.createElement("option");
            o.value = v.key;
            o.textContent = v.label;
            sel.appendChild(o);
          });
          sel.value = Storage.getVariant(id, game.variants[0].key) || game.variants[0].key;
          sel.addEventListener("change", () => {
            Storage.setVariant(id, sel.value);
            AudioFX.click();
            App.toast("Difficulty applied — new round starting", "info");
            App.restart();
          });
          varHost.appendChild(sel);
        }
      }

      // Announce game opened for screen readers
      App.announce(`Opened ${game.name}.`);

      // Show game view, hide home
      $("#game-view").classList.add("active");
      $("#home-view").style.display = "none";
      // Repoint the keyboard skip link at the game stage so screen-reader /
      // keyboard users jump straight into the active game rather than to the
      // (now hidden) home grid.
      const skip = document.querySelector("[data-skip-target]");
      if (skip) {
        skip.href = "#game-stage";
        skip.textContent = "Skip to game";
      }

      // Mount game
      const stage = $("#game-stage");
      stage.innerHTML = "";
      try {
        const cleanup = game.mount(stage, {App, AudioFX, Storage});
        if (typeof cleanup === "function") App.currentCleanup = cleanup;
      } catch (e) {
        console.error("Failed to mount game", id, e);
        stage.innerHTML = `<div class="status lose" style="padding:20px;text-align:center;">
          <div style="font-size:2rem;margin-bottom:8px;">😵</div>
          <div style="font-weight:600;margin-bottom:6px;">Failed to load "${game.name}"</div>
          <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">${e.message || "Unknown error"}</div>
          <button class="btn primary" onclick="App.closeGame()">← Back to hub</button>
          <button class="btn" onclick="App.restart()" style="margin-left:8px;">↻ Try again</button>
        </div>`;
        AudioFX.lose();
      }

      // If the game has previously saved state in localStorage, surface a
      // toast so the player knows they can resume. We deliberately DON'T
      // auto-restore — each game decides whether to call
      // Storage.loadGameState(id) inside its own mount() handler.
      try {
        if (Storage.loadGameState(id)) App.toast("Resume previous game?", "info");
      } catch (e) { /* localStorage may be unavailable */
      }

      // Render the "You might also like" similar-games rail + recently-played
      // rail at the bottom of the game view, so the player can jump straight
      // to a related or recently-played game without going back to the hub.
      App.renderGameRails();

      // Soft two-note chime when entering a game.
      AudioFX.open();

      if (location.hash !== "#/" + id) {
        // Mark this hash change as self-originated so the hashchange → route
        // → openGame loop doesn't mount the game a second time.
        App._hashOpenId = id;
        location.hash = "#/" + id;
      }
      window.scrollTo(0, 0);
    },

    // Games can call this to record a win/loss + score (instead of just
    // calling Storage.submitScore). Updates the last play entry (created in
    // openGame) rather than adding a new one — avoids double-counting.
    recordResult(won, score) {
      if (!App.currentGame) return;
      const id = App.currentGame.id;
      Storage.updateLastPlay(id, won, score);
      if (score !== undefined && score !== null) Storage.submitScore(id, score);
      // Personal-best percentile: "better than X% of your past N scores".
      const pct = Storage.getScorePercentile(id, score);
      if (pct !== null && pct >= 50) {
        const n = Storage.getPlaysFor(id).filter(p => typeof p.score === "number").length;
        App.toast(`📊 Better than ${pct}% of your past ${n} scores`, "info");
      }
      // Daily Challenge completion — counts the first result today.
      const dailyGame = App.getDailyGame();
      if (dailyGame && dailyGame.id === id) {
        const ds = Storage.getDaily();
        if (ds.date !== App._todayKey() || !ds.done) {
          const streak = Storage.completeDaily(!!won);
          if (won) {
            App.toast(`🎯 Daily complete! ${streak}-day streak${streak > 1 ? " 🔥" : ""}`, "success");
            App._fireConfetti();
          }
        }
      }
      // Session wrap-up counter
      if (won) App._session.wins++;
      const newly = App.evaluateAchievements();
      newly.forEach(a => {
        App.toast(`🏅 Achievement unlocked: ${a.title}`, "success");
        App._fireConfetti();
        AudioFX.ding();
      });
      if (won) App.announce(`You won ${App.currentGame.name}!`);
    },

    // ---------- Play-time tracking ----------
    // While a game is open we accumulate wall-clock seconds and flush them
    // to Storage every 15s (plus on close and on unload). Time while the
    // tab is hidden is NOT counted — you're not playing what you can't see.
    _startPlayTimer(id) {
      App._stopPlayTimer();
      App._playTimerId = id;
      App._playTimerLast = Date.now();
      App._playTimerHidden = document.hidden;
      if (!App._playTimerInterval) {
        App._playTimerInterval = setInterval(() => App._flushPlayTimer(), 15000);
      }
    },
    _flushPlayTimer() {
      if (!App._playTimerId || App._playTimerHidden) return;
      const now = Date.now();
      const secs = Math.floor((now - App._playTimerLast) / 1000);
      if (secs > 0) Storage.addPlaytime(App._playTimerId, secs);
      App._playTimerLast = now;
    },
    _stopPlayTimer() {
      App._flushPlayTimer();
      if (App._playTimerInterval) {
        clearInterval(App._playTimerInterval);
        App._playTimerInterval = null;
      }
      App._playTimerId = null;
    },
    // visibility + unload hooks — wired once in init().
    _setupPlaytimeTracking() {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          // Bank the time up to the moment the tab was hidden.
          if (App._playTimerId && !App._playTimerHidden) {
            const now = Date.now();
            const secs = Math.floor((now - App._playTimerLast) / 1000);
            if (secs > 0) Storage.addPlaytime(App._playTimerId, secs);
          }
          App._playTimerHidden = true;
        } else {
          // Resume from now — the hidden gap isn't play time.
          if (App._playTimerId) {
            App._playTimerLast = Date.now();
            App._playTimerHidden = false;
          }
        }
      });
      window.addEventListener("beforeunload", () => App._flushPlayTimer());
      window.addEventListener("pagehide", () => App._flushPlayTimer());
    },

    // Confetti animation — fires when an achievement is unlocked.
    // Skipped when reduce-motion is enabled (accessibility).
    _fireConfetti() {
      const a = Storage.getA11y();
      if (a.reduceMotion) return; // respect accessibility setting
      const host = document.getElementById("confetti");
      if (!host) return;
      host.style.display = "";
      host.innerHTML = "";
      const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
      for (let i = 0; i < 40; i++) {
        const piece = document.createElement("div");
        piece.className = "confetti-piece";
        piece.style.left = Math.random() * 100 + "%";
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 0.5 + "s";
        piece.style.animationDuration = (2 + Math.random() * 1.5) + "s";
        piece.style.width = (6 + Math.random() * 6) + "px";
        piece.style.height = (6 + Math.random() * 6) + "px";
        host.appendChild(piece);
      }
      setTimeout(() => {
        host.style.display = "none";
        host.innerHTML = "";
      }, 3500);
    },

    // Milestone toasts — checks for play-count milestones and shows a toast
    // the first time each is crossed. Persisted so it only fires once.
    _checkMilestones() {
      const stats = Storage.getStats();
      const milestones = [1, 10, 25, 50, 100, 150, 200, 250, 500];
      const seen = JSON.parse(localStorage.getItem("gamehub:milestones-seen") || "[]");
      let newlySeen = [];
      milestones.forEach(m => {
        if (stats.totalPlays >= m && !seen.includes(m)) {
          newlySeen.push(m);
          const msg = m === 1 ? "First game played! 🎯" :
            m === 50 ? "50 games played! 💪" :
              m === 100 ? "Centurion! 100 games! 💯" :
                m === 150 ? "150 games! 🚀" :
                  `${m} games played! 🎉`;
          App.toast(msg, "success");
        }
      });
      if (newlySeen.length) {
        localStorage.setItem("gamehub:milestones-seen", JSON.stringify([...seen, ...newlySeen]));
      }
    },

    // Weekly summary toast — shown on first visit each week
    _checkWeeklySummary() {
      const lastWeek = localStorage.getItem("gamehub:weekly-summary");
      const now = new Date();
      const weekKey = now.getFullYear() + "-W" + Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
      if (lastWeek === weekKey) return;
      localStorage.setItem("gamehub:weekly-summary", weekKey);
      const stats = Storage.getStats();
      if (stats.totalPlays < 5) return; // don't show for new users
      const streak = Storage.getStreak();
      const trending = Storage.getWeeklyTrending();
      const weeklyPlays = trending.reduce((s, t) => s + t.count, 0);
      if (weeklyPlays === 0) return;
      setTimeout(() => {
        App.toast(`📊 This week: ${weeklyPlays} plays, ${stats.totalWins} wins, ${streak.current}-day streak`, "info");
      }, 1500);
    },

    // Game rating — thumbs up/down after finishing a game
    rateGame(id, rating) {
      const ratings = JSON.parse(localStorage.getItem("gamehub:ratings") || "{}");
      ratings[id] = rating; // 'up' or 'down'
      localStorage.setItem("gamehub:ratings", JSON.stringify(ratings));
      AudioFX.pop();
      App.toast(rating === 'up' ? "👍 Thanks for rating!" : "👎 Got it — we'll suggest fewer like this", "info");
    },
    getGameRating(id) {
      const ratings = JSON.parse(localStorage.getItem("gamehub:ratings") || "{}");
      return ratings[id] || null;
    },

    // Push a message into the aria-live region for screen readers.
    announce(msg) {
      const el = $("#aria-live");
      if (!el) return;
      el.textContent = "";
      // Force re-announce by clearing then setting on next tick
      setTimeout(() => {
        el.textContent = msg;
      }, 30);
    },

    // Evaluate all achievements; returns the list of newly-unlocked ones.
    // Also toggles the dot indicator on the achievements button.
    evaluateAchievements() {
      if (!window.Achievements) return [];
      const newly = Achievements.evaluate();
      const dot = $("#achv-dot");
      if (dot) {
        const unlocked = Achievements.list().filter(a => a.unlocked).length;
        dot.style.display = unlocked > 0 ? "" : "none";
      }
      return newly;
    },

    // Copy a shareable result string to the clipboard. Games can call
    // App.shareScore(text) when they have a meaningful result to share;
    // with no argument a rich emoji summary is built from local stats.
    shareScore(text) {
      // Achievement hook: "Spread the Word"
      Storage.bumpEvent("shared");
      App.evaluateAchievements();
      // Shareable deep link: ?game=id survives hash-less navigation and is indexable.
      let link = location.href.split("#")[0].split("?")[0];
      if (App.currentGame) link += "?game=" + encodeURIComponent(App.currentGame.id);
      const g = App.currentGame;
      const lines = [`🎮 Pixel Arcade${g ? " — " + g.name : ""}`];
      if (text) {
        lines.push(text);
      } else if (g) {
        // Rich emoji summary from local stats — best score, plays, time.
        const best = Storage.getBest(g.id);
        const plays = Storage.getStats().gamesPlayed[g.id] || 0;
        const time = Storage.getPlaytimeFor(g.id);
        const parts = [];
        if (best !== null) parts.push(`🏆 Best: ${best}`);
        if (plays > 0) parts.push(`🎮 ${plays} play${plays === 1 ? "" : "s"}`);
        if (time >= 60) parts.push(`⏱️ ${App._formatDuration(time)} played`);
        if (parts.length) lines.push(parts.join(" · "));
        else lines.push("Try to beat my score!");
      }
      const streak = Storage.getStreak();
      if (streak.current > 1) lines.push(`🔥 ${streak.current}-day streak`);
      // Daily-challenge line — day number + daily streak.
      const dailyGame = App.getDailyGame();
      if (g && dailyGame && dailyGame.id === g.id) {
        const ds = Storage.getDaily();
        if (ds.date === App._todayKey() && ds.done) {
          const day = App._dailyDayNumber() - 20490; // readable day count since launch
          const dstreak = Storage.getDailyStreak();
          lines.push(`🎯 Daily #${day}${dstreak > 1 ? ` · 🔥 ${dstreak}-day streak` : ""}`);
        }
      }
      lines.push(link);
      const full = lines.join("\n");
      const fallback = () => {
        const ta = document.createElement("textarea");
        ta.value = full;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch (e) {
        }
        document.body.removeChild(ta);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(full).then(
          () => App.toast("📋 Copied to clipboard", "success"),
          () => {
            fallback();
            App.toast("📋 Copied to clipboard", "success");
          }
        );
      } else {
        fallback();
        App.toast("📋 Copied to clipboard", "success");
      }
    },

    // Build the small horizontal rails shown under each game: similar games
    // (scored by category/difficulty/duration/players/tags) and recently
    // played. Hidden if either list is empty.
    renderGameRails() {
      const host = $("#game-rails");
      if (!host) return;
      host.innerHTML = "";
      if (!App.currentGame) return;
      const similar = GameRegistry.similar(App.currentGame.id, 6);
      const recent = GameRegistry.recent(6).filter(g => g.id !== App.currentGame.id);
      const buildRail = (title, list) => {
        if (!list.length) return null;
        const section = document.createElement("div");
        section.className = "rail";
        const h = document.createElement("div");
        h.className = "rail-title";
        h.textContent = title;
        section.appendChild(h);
        const row = document.createElement("div");
        row.className = "rail-row";
        list.forEach(g => {
          const card = document.createElement("button");
          card.className = "rail-card";
          card.innerHTML = `
            <span class="rail-icon">${g.icon}</span>
            <span class="rail-name">${g.name}</span>
            <span class="rail-cat">${g.category}</span>
          `;
          card.addEventListener("click", () => {
            AudioFX.click();
            App.openGame(g.id);
          });
          row.appendChild(card);
        });
        section.appendChild(row);
        return section;
      };
      const simRail = buildRail("You might also like", similar);
      const recRail = buildRail("Recently played", recent);
      if (simRail) host.appendChild(simRail);
      if (recRail) host.appendChild(recRail);
      host.style.display = (simRail || recRail) ? "" : "none";
    },

    // Render the "Continue playing" rail at the top of the home view: the 5
    // most recently played games, each with the last score and how long ago
    // it was played — one click back into the action.
    // Hidden when empty or when a search/filter is active.
    renderHomeRecent() {
      const host = $("#home-recent");
      const row = $("#home-recent-row");
      if (!host || !row) return;
      // Hide when filters are active — recent rail is most useful on the
      // default "All games" view, where it gives quick access to games you
      // just played.
      const filtering = App.state.filter !== "all" || App.state.ageFilter !== "all" ||
        App.state.diffFilter !== "all" || App.state.durFilter !== "all" ||
        App.state.playersFilter !== "all" || App.state.search || App.state.favOnly ||
        (App.state.tags && App.state.tags.length);
      const recent = GameRegistry.recent(5);
      if (filtering || recent.length === 0) {
        host.style.display = "none";
        row.innerHTML = "";
        return;
      }
      host.style.display = "";
      row.innerHTML = "";
      recent.forEach(g => {
        // Sub-line: last score (if any) + relative time of the last play.
        const plays = Storage.getPlaysFor(g.id);
        const last = plays.length ? plays[plays.length - 1] : null;
        const subParts = [];
        if (last && last.score !== null && last.score !== undefined) subParts.push(`Last: ${last.score}`);
        if (last) subParts.push(App._timeAgo(last.ts));
        const card = document.createElement("button");
        card.className = "rail-card rail-continue";
        card.innerHTML = `
          <span class="rail-icon">${g.icon}</span>
          <span class="rail-name">${g.name}</span>
          <span class="rail-cat">${subParts.length ? subParts.join(" · ") : g.category}</span>
        `;
        card.addEventListener("click", () => {
          AudioFX.click();
          App.openGame(g.id);
        });
        row.appendChild(card);
      });
    },

    // Compact relative time ("just now", "5m ago", "3h ago", "2d ago").
    _timeAgo(ts) {
      const secs = Math.floor((Date.now() - ts) / 1000);
      if (secs < 60) return "just now";
      const m = Math.floor(secs / 60);
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      const d = Math.floor(h / 24);
      if (d < 7) return `${d}d ago`;
      return new Date(ts).toLocaleDateString();
    },

    // Recommended for you — merges trending (most-played this week) with
    // personalized for-you picks based on the user's most-played categories,
    // capped at 8 cards. Replaces the old separate "Trending" and "For you"
    // rails so the home page shows one consolidated recommendation strip.
    renderHomeRecommended() {
      const host = $("#home-recommended");
      const row = $("#home-recommended-row");
      if (!host || !row) return;
      const filtering = App.state.filter !== "all" || App.state.ageFilter !== "all" ||
        App.state.diffFilter !== "all" || App.state.durFilter !== "all" ||
        App.state.playersFilter !== "all" || App.state.search || App.state.favOnly;
      if (filtering) {
        host.style.display = "none";
        row.innerHTML = "";
        return;
      }
      const MAX = 8;
      const seen = new Set();
      const picks = []; // [{ game, sub }]
      const stats = Storage.getStats();
      // 1) Trending first — top most-played games in the last 7 days.
      const trending = Storage.getWeeklyTrending()
        .filter(t => !Storage.isHidden(t.id))
        .sort((a, b) => b.count - a.count);
      for (const t of trending) {
        if (picks.length >= MAX) break;
        const g = GameRegistry.get(t.id);
        if (!g || seen.has(g.id)) continue;
        seen.add(g.id);
        picks.push({game: g, sub: `${t.count} plays this week`});
      }
      // 1b) Anti-rut nudge: when the last several games all came from
      // the same corner of the arcade, suggest the most-neglected category
      // that still has unplayed games waiting.
      const recentIds = Storage.getRecent().slice(0, 15);
      if (recentIds.length >= 8) {
        const playedCats = new Set(recentIds.map(rid => (GameRegistry.get(rid) || {}).category).filter(Boolean));
        const neglected = ["word", "logic", "arcade", "strategy", "quiz"]
          .filter(c => !playedCats.has(c))
          .map(c => ({
            cat: c,
            unplayed: GameRegistry.byCategory(c).filter(g => !Storage.isHidden(g.id) && !(stats.gamesPlayed[g.id] || 0)),
          }))
          .filter(x => x.unplayed.length > 0)
          .sort((a, b) => b.unplayed.length - a.unplayed.length)[0];
        if (neglected && picks.length < MAX) {
          // Prefer a popular-tagged unplayed game from that category.
          const pool = neglected.unplayed;
          const pick = pool.find(g => (g.tags || []).includes("popular")) || pool[0];
          if (!seen.has(pick.id)) {
            seen.add(pick.id);
            picks.push({game: pick, sub: `💤 ${neglected.cat} — not tried yet`, nudge: true});
          }
        }
      }
      // 2) For-you: unplayed games from the user's most-played category, then
      //    fall back to similar-to-last-played when there is no category history.
      const cats = Object.entries(stats.categoriesPlayed || {}).sort((a, b) => b[1] - a[1]);
      let forYouPool = [];
      if (cats.length > 0) {
        const topCat = cats[0][0];
        forYouPool = GameRegistry.byCategory(topCat)
          .filter(g => !Storage.isHidden(g.id))
          .filter(g => !(stats.gamesPlayed[g.id] || 0));
        if (forYouPool.length < 4) {
          // Played everything in the top category — show top-cat games regardless.
          forYouPool = GameRegistry.byCategory(topCat).filter(g => !Storage.isHidden(g.id));
        }
      } else if (GameRegistry.recent(1).length > 0) {
        forYouPool = GameRegistry.similar(GameRegistry.recent(1)[0].id, MAX * 2)
          .filter(g => !Storage.isHidden(g.id));
      }
      for (const g of forYouPool) {
        if (picks.length >= MAX) break;
        if (seen.has(g.id)) continue;
        seen.add(g.id);
        picks.push({game: g, sub: g.category});
      }
      // 3) Last-resort fallback: pad with the first registered games so the
      //    rail isn't empty for brand-new users with no play history.
      if (picks.length < 3) {
        const fillers = GameRegistry.all().filter(g => !Storage.isHidden(g.id) && !seen.has(g.id));
        for (const g of fillers) {
          if (picks.length >= MAX) break;
          picks.push({game: g, sub: g.category});
        }
      }
      if (picks.length < 3) {
        host.style.display = "none";
        row.innerHTML = "";
        return;
      }
      host.style.display = "";
      row.innerHTML = "";
      picks.forEach(({game: g, sub, nudge}) => {
        const card = document.createElement("button");
        card.className = "rail-card" + (nudge ? " nudge" : "");
        card.innerHTML = `
          <span class="rail-icon">${g.icon}</span>
          <span class="rail-name">${g.name}</span>
          <span class="rail-cat">${sub}</span>
        `;
        card.addEventListener("click", () => {
          AudioFX.click();
          App.openGame(g.id);
        });
        row.appendChild(card);
      });
    },

    // "New games" rail — the 25 newest additions (the v4 batch). Shown only
    // on the unfiltered home view so first-time visitors can discover them.
    // Hidden when any search/filter is active.
    renderHomeNew() {
      const host = $("#home-new");
      const row = $("#home-new-row");
      if (!host || !row) return;
      const filtering = App.state.filter !== "all" || App.state.ageFilter !== "all" ||
        App.state.diffFilter !== "all" || App.state.durFilter !== "all" ||
        App.state.playersFilter !== "all" || App.state.search || App.state.favOnly;
      // "New games" rail: empty for now — the user opted to leave this for
      // future use when adding new games. Set to an array of game IDs to
      // feature them in the "New games" rail at the top of the home view.
      const NEW_IDS = [];
      const games = NEW_IDS
        .map(id => GameRegistry.get(id))
        .filter(g => g && !Storage.isHidden(g.id));
      if (filtering || games.length === 0) {
        host.style.display = "none";
        row.innerHTML = "";
        return;
      }
      host.style.display = "";
      row.innerHTML = "";
      games.forEach(g => {
        const card = document.createElement("button");
        card.className = "rail-card";
        card.innerHTML = `
          <span class="rail-icon">${g.icon}</span>
          <span class="rail-name">${g.name}</span>
          <span class="rail-cat">${g.category}</span>
        `;
        card.addEventListener("click", () => {
          AudioFX.click();
          App.openGame(g.id);
        });
        row.appendChild(card);
      });
    },

    // Daily challenge — pick a deterministic game for today's date.
    // The same game is featured for everyone on the same day.
    // Skips hidden games by advancing to the next non-hidden one.
    renderDailyChallenge() {
      const host = $("#daily-banner");
      if (!host) return;
      const games = GameRegistry.all().filter(g => !Storage.isHidden(g.id));
      if (!games.length) {
        host.style.display = "none";
        return;
      }
      // Date-based deterministic pick — SAME formula as App.getDailyGame()
      // so the banner always matches the game the RNG seeding expects.
      const d = new Date();
      const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      const game = games[seed % games.length];
      $("#daily-name").textContent = `${game.icon} ${game.name}`;
      $("#daily-desc").textContent = game.description;
      // Streak + completion state
      const streak = Storage.getDailyStreak();
      const streakEl = $("#daily-streak");
      if (streakEl) {
        streakEl.textContent = streak > 0 ? `🔥 ${streak}-day streak` : "";
        streakEl.style.display = streak > 0 ? "" : "none";
      }
      const done = Storage.getDaily().date === App._todayKey() && Storage.getDaily().done;
      const playBtn = $("#daily-play");
      playBtn.textContent = done ? "✓ Done — play again ↻" : "Play today's →";
      playBtn.classList.toggle("btn-outline", done);
      // Replace listener
      const newBtn = playBtn.cloneNode(true);
      playBtn.parentNode.replaceChild(newBtn, playBtn);
      newBtn.addEventListener("click", () => {
        AudioFX.click();
        App.openGame(game.id);
      });
      host.style.display = "";
    },

    // Stats modal — aggregate play stats + win rate donut + per-category bars
    // + game completion progress + 30-day streak calendar.
    showStats() {
      const stats = Storage.getStats();
      const streak = Storage.getStreak();
      const recent = Storage.getRecent().length;
      const favs = Storage.getFavorites().length;
      const achv = window.Achievements ? Achievements.list().filter(a => a.unlocked).length : 0;
      const achvTotal = window.Achievements ? Achievements.all.length : 0;
      const totalPlaytime = Storage.getTotalPlaytime ? Storage.getTotalPlaytime() : 0;
      const winRate = stats.totalPlays > 0 ? Math.round(stats.totalWins / stats.totalPlays * 100) : 0;
      // Game completion: unique games played out of total games registered.
      const totalGames = GameRegistry.all().length;
      const playedGames = Object.keys(stats.gamesPlayed || {})
        .filter(id => GameRegistry.get(id)).length;
      const completionPct = totalGames > 0
        ? Math.round(playedGames / totalGames * 100) : 0;
      // Win rate donut
      const R = 32, C = 2 * Math.PI * R;
      const donutOffset = C * (1 - (stats.totalWins / Math.max(1, stats.totalPlays)));
      const donut = `
        <div class="donut">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle class="donut-bg" cx="40" cy="40" r="${R}"/>
            <circle class="donut-fg" cx="40" cy="40" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${donutOffset}"/>
          </svg>
          <div class="donut-label">${winRate}%</div>
        </div>
      `;
      // Per-category progress: played / total
      const cats = ["word", "logic", "arcade", "strategy", "quiz"];
      const allGames = GameRegistry.all();
      const catTotal = {};
      cats.forEach(c => catTotal[c] = allGames.filter(g => g.category === c).length);
      const catCounts = cats.map(c => {
        const played = Object.keys(stats.gamesPlayed || {}).filter(id => {
          const g = GameRegistry.get(id);
          return g && g.category === c;
        }).length;
        return {played, total: catTotal[c]};
      });
      const maxCat = Math.max(1, ...catCounts.map(c => c.total));
      const bars = cats.map((c, i) => {
        const pct = Math.round(catCounts[i].played / Math.max(1, catCounts[i].total) * 100);
        return `<div class="stats-bar-row">
          <span class="stats-bar-label">${c}</span>
          <span class="stats-bar-track"><span class="stats-bar-fill" style="width:${pct}%"></span></span>
          <span class="stats-bar-val">${catCounts[i].played}/${catCounts[i].total}</span>
        </div>`;
      }).join("");
      // 30-day streak calendar — scan the plays log timestamps and mark
      // every day the user actually played at least one game.
      const DAY = 86400000;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startTs = today.getTime() - 29 * DAY; // 30 squares incl. today
      const dayKeyFor = (d) => d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
      const dayPlayed = {};
      const plays = Storage.getPlays();
      for (const gid in plays) {
        for (const p of plays[gid]) {
          if (p.ts >= startTs) dayPlayed[dayKeyFor(new Date(p.ts))] = true;
        }
      }
      const todayKey = dayKeyFor(today);
      const squares = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(startTs + i * DAY);
        const k = dayKeyFor(d);
        const cls = ["cal-square"];
        if (dayPlayed[k]) cls.push("played");
        if (k === todayKey) cls.push("today");
        squares.push(`<div class="${cls.join(" ")}" title="${k}${dayPlayed[k] ? " — played" : ""}"></div>`);
      }
      const calendar = `
        <div class="stats-calendar" role="img" aria-label="Activity for the last 30 days">${squares.join("")}</div>
        <div class="calendar-legend">
          <span><span class="cal-sample" style="background:var(--success, #22c55e);"></span>Played</span>
          <span><span class="cal-sample" style="background:var(--border);"></span>No activity</span>
          <span style="margin-left:auto;color:var(--text-muted);">Last 30 days</span>
        </div>
      `;
      // Most-played game
      const mostPlayed = Object.entries(stats.gamesPlayed || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, n]) => {
          const g = GameRegistry.get(id);
          return g ? `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);"><span>${g.icon} ${g.name}</span><span style="color:var(--text-muted);font-family:var(--font-mono);">${n} plays</span></div>` : "";
        }).join("");
      const body = `
        <div class="stats-completion" aria-label="Game completion">
          <div class="completion-head">
            <span class="completion-label">Game completion</span>
            <span class="completion-val">${playedGames} / ${totalGames} games played (${completionPct}%)</span>
          </div>
          <div class="completion-bar"><div class="completion-fill" style="width:${completionPct}%"></div></div>
        </div>
        <div style="display:flex;gap:16px;align-items:center;margin-bottom:14px;">
          ${donut}
          <div>
            <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);">Win rate</div>
            <div style="font-size:1.4rem;font-weight:700;color:var(--text);">${stats.totalWins} wins / ${stats.totalPlays} plays</div>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-val">${streak.current}</div><div class="stat-label">Day streak</div></div>
          <div class="stat-card"><div class="stat-val">${streak.longest}</div><div class="stat-label">Best streak</div></div>
          <div class="stat-card"><div class="stat-val">${favs}</div><div class="stat-label">Favorites</div></div>
          <div class="stat-card"><div class="stat-val">${recent}</div><div class="stat-label">Recent</div></div>
          <div class="stat-card"><div class="stat-val">${achv}/${achvTotal}</div><div class="stat-label">Achievements</div></div>
          <div class="stat-card"><div class="stat-val">${App._formatDuration(totalPlaytime)}</div><div class="stat-label">Time played</div></div>
        </div>
        <div class="stats-breakdown">
          <h4 style="margin-bottom:6px;">Plays by category</h4>
          ${bars}
        </div>
        <div class="stats-breakdown">
          <h4 style="margin-bottom:6px;">Activity — last 30 days</h4>
          ${calendar}
        </div>
        ${mostPlayed ? `<div class="stats-breakdown"><h4 style="margin-bottom:6px;">Most played</h4>${mostPlayed}</div>` : ""}
      `;
      App.showModal("Your stats", body, undefined, {wide: true});
    },

    // Achievements modal — progress ring, filter tabs, and per-achievement
    // progress bars on locked countable goals.
    showAchievements() {
      if (!window.Achievements) {
        App.toast("Achievements not loaded", "info");
        return;
      }
      const list = Achievements.list();
      const unlocked = list.filter(a => a.unlocked).length;
      const inProgress = list.filter(a => !a.unlocked && a.progress && a.progress.cur > 0).length;
      const total = list.length;
      const pct = total > 0 ? Math.round(unlocked / total * 100) : 0;
      // Progress ring (SVG circle with stroke-dashoffset)
      const R = 26, C = 2 * Math.PI * R;
      const offset = C * (1 - unlocked / Math.max(1, total));
      const ring = `
        <div class="achv-progress-ring">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle class="ring-bg" cx="32" cy="32" r="${R}"/>
            <circle class="ring-fg" cx="32" cy="32" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${offset}"/>
          </svg>
          <div class="ring-label">${pct}%</div>
        </div>
      `;
      const cards = list.map(a => {
        // Progress bar for locked achievements that expose progress().
        let progressHtml = "";
        if (!a.unlocked && a.progress && a.progress.max > 0) {
          const ppct = Math.min(100, Math.round(a.progress.cur / a.progress.max * 100));
          const unit = a.progress.unit ? " " + a.progress.unit : "";
          progressHtml = `
            <div class="achv-progress">
              <div class="achv-progress-track"><div class="achv-progress-fill" style="width:${ppct}%"></div></div>
              <span class="achv-progress-val">${a.progress.cur}${unit} / ${a.progress.max}${unit}</span>
            </div>`;
        }
        const state = a.unlocked ? "unlocked" : (a.progress && a.progress.cur > 0 ? "progress" : "locked");
        return `
        <div class="achv-card ${a.unlocked ? "unlocked" : "locked"}" data-state="${state}">
          <div class="achv-icon">${a.icon}</div>
          <div class="achv-title">${a.title}</div>
          <div class="achv-desc">${a.desc}</div>
          ${progressHtml}
          <div class="achv-status">${a.unlocked ? "✓ Unlocked" : "Locked"}</div>
        </div>
      `;
      }).join("");
      const body = `
        <div class="achv-header">
          ${ring}
          <div class="achv-header-text">
            <h3>${unlocked} of ${total} unlocked</h3>
            <p>Play more games to unlock badges. Some are earned by playing specific categories, hitting streaks, winning several games in a row, or racking up play time.</p>
          </div>
        </div>
        <div class="achv-filters" role="tablist" aria-label="Filter achievements">
          <button class="achv-filter active" data-f="all" role="tab" aria-selected="true">All (${total})</button>
          <button class="achv-filter" data-f="unlocked" role="tab" aria-selected="false">Unlocked (${unlocked})</button>
          <button class="achv-filter" data-f="progress" role="tab" aria-selected="false">In progress (${inProgress})</button>
        </div>
        <div class="achv-grid">${cards}</div>
      `;
      App.showModal("Achievements", body, undefined, {wide: true});
      // Wire the filter tabs (the modal body was just injected).
      $$("#modal .achv-filter").forEach(btn => btn.addEventListener("click", () => {
        AudioFX.click();
        $$("#modal .achv-filter").forEach(b => {
          b.classList.toggle("active", b === btn);
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
        });
        const f = btn.dataset.f;
        $$("#modal .achv-card").forEach(card => {
          card.style.display = (f === "all" || card.dataset.state === f) ? "" : "none";
        });
      }));
    },

    // Hide/unhide a game (long-press or right-click on the card).
    toggleHidden(id) {
      const hidden = Storage.toggleHidden(id);
      AudioFX.pop();
      App.toast(hidden ? `Hidden "${GameRegistry.get(id).name}"` : `Unhidden "${GameRegistry.get(id).name}"`, "info");
      App.renderGrid();
    },

    // Data export — download all user data as JSON.
    exportData() {
      const data = Storage.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pixel-arcade-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Storage.markBackup(); // track backup health
      App._renderDataHealth();
      AudioFX.click();
      App.toast("Backup downloaded", "success");
    },

    // Data import — read JSON file and restore. Shows a Replace/Merge choice
    // so players can combine progress from two devices instead of
    // overwriting one with the other.
    importData(file) {
      const reader = new FileReader();
      reader.onload = () => {
        let data;
        try {
          data = JSON.parse(reader.result);
        } catch (e) {
          App.toast("Invalid backup file: " + e.message, "warning");
          return;
        }
        const apply = (mode) => {
          try {
            if (mode === "merge") Storage.importDataMerge(data);
            else Storage.importData(data);
            App.applyTheme();
            App.applySound();
            App.applyA11y();
            App.renderGrid();
            App.evaluateAchievements();
            App._renderDataHealth();
            AudioFX.win();
            App.toast(mode === "merge" ? "Backup merged into your data" : "Backup restored", "success");
          } catch (e) {
            App.toast("Import failed: " + e.message, "warning");
          }
        };
        const favs = (data.favorites || []).length;
        const plays = data.stats ? (data.stats.totalPlays || 0) : 0;
        const when = data.exportedAt ? new Date(data.exportedAt).toLocaleDateString() : "unknown date";
        App.showModal("Import backup",
          `This backup from <b>${when}</b> contains <b>${favs} favorites</b> and <b>${plays} plays</b>.<br><br>
           <b>Replace</b> wipes current data and restores the backup.<br>
           <b>Merge</b> keeps both — favorites and achievements are combined, best scores keep the higher value.`,
          [
            {label: "Cancel"},
            {label: "Merge", onClick: () => apply("merge")},
            {label: "Replace", primary: true, onClick: () => apply("replace")},
          ]);
      };
      reader.readAsText(file);
    },

    closeGame() {
      // Bank any outstanding play time for the game we're leaving.
      const wasOpen = !!App.currentGame;
      App._stopPlayTimer();
      // Restore the real Math.random if the daily-challenge PRNG is active.
      App._restoreRandom();
      if (App.currentCleanup) {
        try {
          App.currentCleanup();
        } catch (e) {
        }
        App.currentCleanup = null;
      }
      App.currentGame = null;
      // Restore the original index.html <head> meta (title, description,
      // OG tags, canonical) — the per-game overrides are removed/reverted.
      App.updateMeta(null);
      // NOTE: We intentionally do NOT clear any saved game state here —
      // each game owns its own save/restore lifecycle via Storage.saveGameState
      // / Storage.loadGameState, and the player may want to resume next visit.
      $("#game-view").classList.remove("active");
      $("#home-view").style.display = "";
      // Restore the keyboard skip link to point at the home grid.
      const skip = document.querySelector("[data-skip-target]");
      if (skip) {
        skip.href = "#game-grid";
        skip.textContent = "Skip to games";
      }
      if (location.hash && location.hash.indexOf("#/category/") !== 0 && location.hash.indexOf("#/collection/") !== 0) {
        history.replaceState(null, "", location.pathname + location.search);
      }
      App._clearCategoryRoute();
      App.renderGrid(); // refresh best scores / favs
      // Session wrap-up card: after a decent session, offer a summary.
      App._maybeShowSessionWrapup();
      // Gentle blip when returning to the hub (only if a game was open).
      if (wasOpen) AudioFX.close();
      // Return focus to the card the user opened the game from (if still in DOM)
      if (App._lastFocusedCard) {
        const card = document.querySelector(`#game-grid .card[data-id="${App._lastFocusedCard}"]`);
        if (card) card.focus();
        App._lastFocusedCard = null;
      }
    },

    updateGameFavBtn() {
      const btn = $("#game-fav-btn");
      if (!App.currentGame) {
        btn.textContent = "♡";
        return;
      }
      btn.textContent = Storage.isFavorite(App.currentGame.id) ? "♥" : "♡";
      btn.style.color = Storage.isFavorite(App.currentGame.id) ? "var(--accent-2)" : "";
    },

    restart() {
      if (App.currentGame) App.openGame(App.currentGame.id);
    },

    // ---------- Toasts ----------
    toast(msg, type) {
      const area = $("#toast-area");
      if (!area) return;
      // Cap visible toasts to 3 so a burst of toasts (e.g. several achievements
      // unlocking at once plus weekly summary) can't overflow the toast area.
      // Remove oldest first.
      const existing = Array.from(area.querySelectorAll(".toast"));
      while (existing.length >= 3) {
        existing.shift().remove();
      }
      const el = document.createElement("div");
      el.className = "toast " + (type || "info");
      el.textContent = msg;
      area.appendChild(el);
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 2800);
    },

    // ---------- Modal ----------
    showModal(title, body, actions, opts) {
      const modal = $("#modal");
      modal.classList.toggle("modal-wide", !!(opts && opts.wide));
      $("#modal-title").textContent = title;
      $("#modal-body").innerHTML = body;
      const ac = $("#modal-actions");
      ac.innerHTML = "";
      (actions || [{label: "OK", primary: true, onClick: App.closeModal}]).forEach(a => {
        const btn = document.createElement("button");
        btn.className = "btn" + (a.primary ? " primary" : "");
        btn.textContent = a.label;
        btn.addEventListener("click", () => {
          if (a.onClick) a.onClick();
          App.closeModal();
        });
        ac.appendChild(btn);
      });
      $("#modal-backdrop").classList.add("open");
      // Scroll modal to top on open
      modal.scrollTop = 0;
      // Focus management: remember what was focused, move focus into the
      // dialog (first action button) so keyboard/AT users land inside it.
      App._lastFocused = document.activeElement;
      const firstBtn = modal.querySelector("#modal-actions .btn") || modal.querySelector("#modal-close");
      if (firstBtn) firstBtn.focus();
    },
    closeModal() {
      $("#modal-backdrop").classList.remove("open");
      $("#modal").classList.remove("modal-wide");
      // Return focus to whatever opened the modal (button, card, etc.)
      if (App._lastFocused && document.contains(App._lastFocused)) {
        try {
          App._lastFocused.focus();
        } catch (err) { /* detached node */
        }
      }
      App._lastFocused = null;
    },

    // ---------- Ctrl+K command palette ----------
    // Fuzzy-searchable launcher over all 300 games + quick actions
    // (random game, stats, achievements, theme, mode, categories…).
    _setupCommandPalette() {
      const backdrop = $("#cmdk-backdrop");
      if (!backdrop) return;
      const input = $("#cmdk-input");
      const results = $("#cmdk-results");
      App._cmdkItems = [];
      App._cmdkIndex = 0;

      // Quick actions available in the palette.
      const ACTIONS = [
        {
          icon: "🎲", label: "Random game", sub: "Jump to a surprise", run: () => {
            const pick = App._randomPick();
            if (pick) App.openGame(pick.id);
          }
        },
        {icon: "📊", label: "View stats", sub: "Plays, wins, play time, streaks", run: () => App.showStats()},
        {icon: "🏅", label: "View achievements", sub: "Badges and progress", run: () => App.showAchievements()},
        {icon: "🌙", label: "Toggle dark / light mode", sub: "Appearance", run: () => App.toggleMode()},
        {
          icon: "🎨",
          label: "Change theme",
          sub: "24 built-in themes + custom builder",
          run: () => $("#theme-btn").click()
        },
        {icon: "🔊", label: "Toggle sound", sub: "Mute or unmute", run: () => App.toggleSound()},
        {
          icon: "♿",
          label: "Accessibility options",
          sub: "Font size, contrast, motion",
          run: () => $("#a11y-btn").click()
        },
        {
          icon: "⌨️",
          label: "Keyboard shortcuts",
          sub: "Show the shortcut cheat-sheet",
          run: () => App._showShortcutHelp()
        },
        {icon: "💾", label: "Export my data", sub: "Download a JSON backup", run: () => App.exportData()},
        {icon: "🔤", label: "Word games", sub: "Category landing page", run: () => App._gotoCategory("word")},
        {icon: "🧩", label: "Logic games", sub: "Category landing page", run: () => App._gotoCategory("logic")},
        {icon: "🕹️", label: "Arcade games", sub: "Category landing page", run: () => App._gotoCategory("arcade")},
        {icon: "♟️", label: "Strategy games", sub: "Category landing page", run: () => App._gotoCategory("strategy")},
        {icon: "❓", label: "Quiz games", sub: "Category landing page", run: () => App._gotoCategory("quiz")},
      ];

      // Fuzzy score for `text` against query `q`. Higher = better; -1 = no match.
      // Substring matches rank above subsequence matches.
      App._fuzzyScore = (text, q) => {
        text = (text || "").toLowerCase();
        q = (q || "").toLowerCase().trim();
        if (!q) return 1;
        const direct = text.indexOf(q);
        if (direct !== -1) return 1000 - Math.min(200, direct * 2);
        let ti = 0, score = 0, ok = true;
        for (const ch of q) {
          const idx = text.indexOf(ch, ti);
          if (idx === -1) {
            ok = false;
            break;
          }
          score += 10 - Math.min(9, idx - ti);
          ti = idx + 1;
        }
        return ok ? score : -1;
      };

      const render = () => {
        const q = input.value.trim();
        const items = [];
        // 1) Actions (fuzzy on label + sub)
        ACTIONS.forEach(a => {
          const s = Math.max(App._fuzzyScore(a.label, q), App._fuzzyScore(a.sub, q) - 10);
          if (s >= 0) items.push({icon: a.icon, label: a.label, sub: a.sub, run: a.run, score: s, kind: "action"});
        });
        // 2) Games (fuzzy on name; small bonus for matching category/tags)
        GameRegistry.all().forEach(g => {
          const s = App._fuzzyScore(g.name, q);
          if (s < 0) {
            // also allow matching on category / tags when the name misses
            const alt = Math.max(App._fuzzyScore(g.category, q) - 30,
              Math.max.apply(null, (g.tags || []).map(t => App._fuzzyScore(t, q) - 40)));
            if (alt < 0) return;
            items.push({
              icon: g.icon,
              label: g.name,
              sub: g.category + " · " + (g.description || ""),
              run: () => App.openGame(g.id),
              score: alt,
              kind: "game"
            });
            return;
          }
          items.push({
            icon: g.icon,
            label: g.name,
            sub: g.category + " · " + (g.description || ""),
            run: () => App.openGame(g.id),
            score: s,
            kind: "game"
          });
        });
        items.sort((a, b) => b.score - a.score);
        const MAX_ITEMS = 14;
        App._cmdkItems = items.slice(0, MAX_ITEMS);
        App._cmdkIndex = 0;
        results.innerHTML = "";
        if (!App._cmdkItems.length) {
          results.innerHTML = `<div class="cmdk-empty">No matches for “${input.value.replace(/[<>&]/g, "")}”</div>`;
          return;
        }
        App._cmdkItems.forEach((it, i) => {
          const el = document.createElement("button");
          el.className = "cmdk-item" + (i === 0 ? " active" : "");
          el.setAttribute("role", "option");
          el.setAttribute("aria-selected", i === 0 ? "true" : "false");
          el.innerHTML = `
            <span class="cmdk-item-icon">${it.icon}</span>
            <span class="cmdk-item-body">
              <span class="cmdk-item-label">${it.label}</span>
              <span class="cmdk-item-sub">${it.sub}</span>
            </span>
            <span class="cmdk-item-kind">${it.kind === "game" ? "↵ play" : "↵ run"}</span>
          `;
          el.addEventListener("click", () => App._cmdkRun(i));
          el.addEventListener("mousemove", () => App._cmdkHighlight(i, false));
          results.appendChild(el);
        });
        results.scrollTop = 0;
      };

      App._cmdkHighlight = (idx, scroll) => {
        App._cmdkIndex = idx;
        $$(".cmdk-item", results).forEach((el, i) => {
          const on = i === idx;
          el.classList.toggle("active", on);
          el.setAttribute("aria-selected", on ? "true" : "false");
          if (on && scroll) el.scrollIntoView({block: "nearest"});
        });
      };

      App._cmdkRun = (idx) => {
        const it = App._cmdkItems[idx];
        App._closeCmdk();
        if (it) {
          AudioFX.ding();
          it.run();
        }
      };

      App._openCmdk = () => {
        if (backdrop.classList.contains("open")) return;
        // Achievement hook: "Power User" (use the palette once).
        Storage.bumpEvent("paletteUsed");
        App.evaluateAchievements();
        App._cmdkLastFocus = document.activeElement;
        backdrop.classList.add("open");
        backdrop.setAttribute("aria-hidden", "false");
        input.value = "";
        render();
        input.focus();
        AudioFX.open();
      };

      App._closeCmdk = () => {
        if (!backdrop.classList.contains("open")) return;
        backdrop.classList.remove("open");
        backdrop.setAttribute("aria-hidden", "true");
        if (App._cmdkLastFocus && document.contains(App._cmdkLastFocus)) {
          try {
            App._cmdkLastFocus.focus();
          } catch (e) { /* detached */
          }
        }
        App._cmdkLastFocus = null;
      };

      App._toggleCommandPalette = () => {
        if (backdrop.classList.contains("open")) App._closeCmdk();
        else App._openCmdk();
      };

      input.addEventListener("input", render);
      input.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (App._cmdkItems.length) App._cmdkHighlight((App._cmdkIndex + 1) % App._cmdkItems.length, true);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          if (App._cmdkItems.length) App._cmdkHighlight((App._cmdkIndex - 1 + App._cmdkItems.length) % App._cmdkItems.length, true);
        } else if (e.key === "Enter") {
          e.preventDefault();
          App._cmdkRun(App._cmdkIndex);
        } else if (e.key === "Escape") {
          e.preventDefault();
          App._closeCmdk();
        }
      });
      backdrop.addEventListener("mousedown", (e) => {
        if (e.target === backdrop) App._closeCmdk();
      });
      const openBtn = $("#cmdk-open-btn");
      if (openBtn) openBtn.addEventListener("click", () => {
        AudioFX.click();
        App._openCmdk();
      });
    },

    // Navigate to a category landing route (from the palette / banners).
    _gotoCategory(cat) {
      App.closeGame();
      App._applyCategoryRoute(cat);
      // Make the route shareable via the URL hash. Mark it self-originated
      // so the resulting hashchange doesn't apply the route a second time.
      if (location.hash !== "#/category/" + cat) {
        App._hashOpenId = "category/" + cat;
        location.hash = "#/category/" + cat;
      }
    },

    // ---------- Custom theme builder ----------
    // The builder lives inside the theme panel. Accent + font are stored in
    // localStorage and applied as inline CSS variables on <html>; the
    // light/dark base simply follows the global mode toggle (themes.css
    // carries neutral palettes for [data-theme="custom"]).
    _ctFonts: {
      modern: {label: "Modern", heading: "'Inter', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif"},
      retro: {label: "Retro", heading: "'Press Start 2P', 'Inter', monospace", body: "'VT323', 'Inter', monospace"},
      playful: {label: "Playful", heading: "'Baloo 2', 'Inter', cursive", body: "'Nunito', 'Inter', sans-serif"},
      elegant: {
        label: "Elegant",
        heading: "'Playfair Display', Georgia, serif",
        body: "'Inter', system-ui, sans-serif"
      },
      mono: {
        label: "Mono",
        heading: "'JetBrains Mono', 'Inter', monospace",
        body: "'JetBrains Mono', 'Inter', monospace"
      },
    },
    _ctAccents: ["#6366f1", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4", "#a855f7", "#ec4899", "#14b8a6"],

    // Current builder state (session-scoped; persisted on "Apply & save").
    _ctState: null,
    _ctDefaults() {
      return {accent: "#6366f1", font: "modern"};
    },

    _setupThemeBuilder() {
      const builder = $("#custom-theme-builder");
      if (!builder) return;
      App._ctState = Storage.getCustomTheme() || App._ctDefaults();

      const swatches = $("#ctb-swatches");
      const colorInput = $("#ctb-accent");
      const fontSeg = $("#ctb-font");
      const baseSeg = $("#ctb-base");

      // Accent swatches
      if (swatches) {
        App._ctAccents.forEach(hex => {
          const b = document.createElement("button");
          b.className = "ctb-swatch";
          b.style.background = hex;
          b.title = hex;
          b.setAttribute("aria-label", "Accent " + hex);
          b.addEventListener("click", () => {
            App._ctState.accent = hex;
            App._ctPreview();
          });
          swatches.appendChild(b);
        });
      }
      // Custom color input
      if (colorInput) colorInput.addEventListener("input", () => {
        App._ctState.accent = colorInput.value;
        App._ctPreview();
      });
      // Font segment
      if (fontSeg) {
        Object.keys(App._ctFonts).forEach(key => {
          const b = document.createElement("button");
          b.textContent = App._ctFonts[key].label;
          b.dataset.font = key;
          b.title = App._ctFonts[key].label + " font pairing";
          b.addEventListener("click", () => {
            App._ctState.font = key;
            App._ctPreview();
          });
          fontSeg.appendChild(b);
        });
      }
      // Base segment mirrors the global mode
      if (baseSeg) baseSeg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
        Storage.setMode(b.dataset.base);
        App.applyTheme();
        AudioFX.click();
      }));

      const saveBtn = $("#ctb-save");
      if (saveBtn) saveBtn.addEventListener("click", () => {
        Storage.setCustomTheme(App._ctState);
        Storage.bumpEvent("customThemeSaved"); // achievement: "Remix Artist"
        App.setTheme("custom");
        AudioFX.win();
        App.toast("Custom theme saved", "success");
        App.evaluateAchievements();
      });
      const randBtn = $("#ctb-random");
      if (randBtn) randBtn.addEventListener("click", () => {
        const accents = App._ctAccents;
        const fonts = Object.keys(App._ctFonts);
        App._ctState.accent = accents[Math.floor(Math.random() * accents.length)];
        App._ctState.font = fonts[Math.floor(Math.random() * fonts.length)];
        Storage.setMode(Math.random() < 0.5 ? "light" : "dark");
        App._ctPreview();
        App.setTheme("custom");
        AudioFX.pop();
        App.toast("🎲 Randomized — tweak and hit Apply & save", "info");
      });
    },

    // Live preview of the builder state (applies but doesn't persist).
    _ctPreview() {
      Storage.setCustomTheme(App._ctState);
      if (Storage.getTheme() !== "custom") {
        App.setTheme("custom");
      } else {
        App.applyTheme();
      }
      App._syncThemeBuilder(true);
    },

    // Reflect builder state into its controls. Shown only for custom theme.
    _syncThemeBuilder(active) {
      const builder = $("#custom-theme-builder");
      if (!builder) return;
      builder.hidden = !active;
      if (!active || !App._ctState) return;
      App._ctState = Storage.getCustomTheme() || App._ctState || App._ctDefaults();
      const colorInput = $("#ctb-accent");
      if (colorInput) colorInput.value = App._ctState.accent;
      $$("#ctb-font button").forEach(b => b.classList.toggle("active", b.dataset.font === App._ctState.font));
      const mode = Storage.getMode();
      $$("#ctb-base button").forEach(b => b.classList.toggle("active", b.dataset.base === mode));
      $$("#ctb-swatches .ctb-swatch").forEach(b => b.classList.toggle("active", b.title === App._ctState.accent));
      // Bring the builder into view inside the (scrollable) theme panel.
      try {
        builder.scrollIntoView({block: "nearest", behavior: "smooth"});
      } catch (e) { /* older browsers */
      }
    },

    // Apply (or clear) the custom theme's inline CSS variables on <html>.
    // `on` = custom theme is active; accent + accent-2 + accent-soft come
    // from the user's saved accent, fonts from the chosen pairing.
    _applyCustomThemeVars(on) {
      const root = document.documentElement;
      const vars = ["--accent", "--accent-2", "--accent-soft", "--font-body", "--font-heading"];
      vars.forEach(v => root.style.removeProperty(v));
      if (!on) return;
      const ct = Storage.getCustomTheme() || App._ctDefaults();
      const accent = ct.accent || "#6366f1";
      // Derive a companion accent (slightly rotated + lightness-tuned).
      const hsl = App._hexToHsl(accent);
      const accent2 = `hsl(${(hsl.h + 24) % 360} ${hsl.s}% ${Math.min(72, hsl.l + 12)}%)`;
      const soft = `hsl(${hsl.h} ${hsl.s}% ${hsl.l}% / 0.14)`;
      root.style.setProperty("--accent", accent);
      root.style.setProperty("--accent-2", accent2);
      root.style.setProperty("--accent-soft", soft);
      const fonts = (App._ctFonts[ct.font] || App._ctFonts.modern);
      root.style.setProperty("--font-heading", fonts.heading);
      root.style.setProperty("--font-body", fonts.body);
    },

    // hex (#rrggbb) → {h, s, l} (0–360, 0–100, 0–100)
    _hexToHsl(hex) {
      let m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
      if (!m) return {h: 235, s: 84, l: 61};
      const n = parseInt(m[1], 16);
      const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          default:
            h = (r - g) / d + 4;
        }
        h /= 6;
      }
      return {h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100)};
    },

    // ============================================================
    // Round 7 + 8 additions
    // ============================================================

    // ---------- Runtime error net ----------
    // Catches mid-play errors (click handlers, timers, promises) that would
    // otherwise die silently in the console. The shell keeps running and the
    // player gets a one-tap recovery when a game is the likely source.
    _setupErrorNet() {
      let lastToast = 0;
      const report = (label) => {
        const now = Date.now();
        if (now - lastToast < 4000) return; // throttle: one per 4s
        lastToast = now;
        const inGame = !!App.currentGame;
        App.toast(inGame
          ? `⚠️ "${App.currentGame.name}" hit a snag — the rest of the arcade is fine`
          : "⚠️ Something went wrong — the arcade keeps running", "warning");
        if (!inGame) return;
        // Attach a reload action to the toast we just created.
        const toasts = document.querySelectorAll("#toast-area .toast");
        const t = toasts[toasts.length - 1];
        if (!t) return;
        const btn = document.createElement("button");
        btn.className = "btn btn-sm";
        btn.style.marginLeft = "10px";
        btn.textContent = "↻ Reload game";
        btn.addEventListener("click", () => {
          btn.remove();
          App.restart();
        });
        t.appendChild(btn);
      };
      window.addEventListener("error", (e) => {
        // Skip pure resource-load failures (missing img/script) — nothing to recover.
        if (e && e.target && (e.target.tagName === "IMG" || e.target.tagName === "SCRIPT" || e.target.tagName === "LINK")) return;
        report(e && e.message ? e.message : "Unknown error");
      }, true);
      window.addEventListener("unhandledrejection", (e) => {
        const r = e.reason;
        report(r && r.message ? r.message : "Unhandled promise rejection");
      });
    },

    // ---------- Daily Challenge ----------
    // One deterministic game per calendar day. While today's (not yet
    // completed) daily game is open, Math.random is swapped for a seeded
    // PRNG so every visitor plays the SAME deal — no per-game code changes
    // needed because games shuffle through Math.random.
    _todayKey() {
      const d = new Date();
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    },
    _dailyDayNumber() {
      const d = new Date();
      return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    },
    getDailyGame() {
      const games = GameRegistry.all().filter(g => !Storage.isHidden(g.id));
      if (!games.length) return null;
      return games[App._dailyDayNumber() % games.length];
    },
    _installDailyRNG(seed) {
      if (App._origRandom) return; // already installed
      let s = (seed >>> 0) || 1;
      App._origRandom = Math.random;
      Math.random = function () { // mulberry32 — small, fast, good enough
        s |= 0;
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    _restoreRandom() {
      if (!App._origRandom) return;
      Math.random = App._origRandom;
      App._origRandom = null;
    },
    _dailySeed() {
      // Knuth multiplicative hash of the day number → well-spread 32-bit seed.
      return (App._dailyDayNumber() * 2654435761) >>> 0;
    },

    // ---------- Curated collections ----------
    renderCollectionsShelf() {
      const host = $("#home-collections");
      const row = $("#home-collections-row");
      if (!host || !row || !window.Collections) return;
      const filtering = App.state.filter !== "all" || App.state.collectionFilter ||
        App.state.ageFilter !== "all" || App.state.diffFilter !== "all" ||
        App.state.durFilter !== "all" || App.state.playersFilter !== "all" ||
        App.state.search || App.state.favOnly;
      if (filtering) {
        host.style.display = "none";
        row.innerHTML = "";
        return;
      }
      row.innerHTML = "";
      Collections.all().forEach(c => {
        const count = Collections.games(c.id).length;
        const card = document.createElement("button");
        card.className = "collection-card";
        card.innerHTML = `
          <span class="collection-icon">${c.icon}</span>
          <span class="collection-name">${c.name}</span>
          <span class="collection-count">${count} games</span>
        `;
        card.addEventListener("click", () => {
          AudioFX.click();
          App._gotoCollection(c.id);
        });
        row.appendChild(card);
      });
      host.style.display = "";
    },
    _gotoCollection(colId) {
      App.closeGame();
      App._applyCollectionRoute(colId);
      if (location.hash !== "#/collection/" + colId) {
        App._hashOpenId = "collection/" + colId;
        location.hash = "#/collection/" + colId;
      }
    },
    _applyCollectionRoute(colId) {
      const c = window.Collections ? Collections.get(colId) : null;
      if (!c) return false;
      if (App.currentGame) App.closeGame();
      App.state.collectionFilter = colId;
      // Collections sit across categories — deactivate the category chips.
      $$('.filter-chip[data-dim="category"]').forEach(x => x.classList.remove("active"));
      App.renderGrid();
      const banner = $("#category-banner");
      if (banner) {
        const count = Collections.games(colId).length;
        $("#category-title").textContent = `${c.icon} ${c.name}`;
        $("#category-desc").textContent = `${c.blurb} — ${count} free games, playable right in your browser.`;
        banner.style.display = "";
      }
      const titleEl = document.head.querySelector("title");
      if (titleEl) titleEl.textContent = `${c.name} — Pixel Arcade`;
      window.scrollTo(0, 0);
      App.announce(`Showing the ${c.name} collection.`);
      return true;
    },
    _exitCollectionRoute() {
      App.state.collectionFilter = null;
      if (location.hash.indexOf("#/collection/") === 0) {
        history.replaceState(null, "", location.pathname + location.search);
      }
      // Reuse the category exit (resets chips + banner + title).
      App._exitCategoryRoute();
    },

    // ---------- Keyboard grid navigation ----------
    // Roving-tabindex arrow navigation across the visible card grid.
    _setupGridKeyboard() {
      const grid = $("#game-grid");
      if (!grid) return;
      grid.addEventListener("keydown", (e) => {
        const navKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"];
        if (!navKeys.includes(e.key)) return;
        const cards = $$(".card", grid).filter(c => c.offsetParent); // visible only
        if (!cards.length) return;
        e.preventDefault();
        const cur = document.activeElement;
        const idx = cards.indexOf(cur);
        let next = -1;
        if (e.key === "Home") next = 0;
        else if (e.key === "End") next = cards.length - 1;
        else {
          // Column count from real geometry (cards in the first row share offsetTop).
          const top = cards[0].offsetTop;
          const cols = cards.filter(c => c.offsetTop === top).length || 1;
          if (e.key === "ArrowRight") next = idx + 1;
          else if (e.key === "ArrowLeft") next = idx - 1;
          else if (e.key === "ArrowDown") next = idx + cols;
          else if (e.key === "ArrowUp") next = idx - cols;
        }
        if (next < 0 || next >= cards.length || next === idx) return;
        // Roving tabindex: only the focused card stays tabbable.
        if (idx >= 0) cur.tabIndex = -1;
        cards[next].tabIndex = 0;
        cards[next].focus();
      });
    },

    // ---------- Pass-and-play curtain ----------
    // Covers the game with a "pass the device" screen until the next player
    // taps Ready — hidden hands stay hidden on shared screens.
    passTurn(label, onReady) {
      const stage = $("#game-stage");
      if (!stage) {
        if (onReady) onReady();
        return;
      }
      if (stage.querySelector(".passplay-curtain")) return; // already up
      const curtain = document.createElement("div");
      curtain.className = "passplay-curtain";
      curtain.innerHTML = `
        <div class="passplay-card">
          <div class="passplay-icon">🤫</div>
          <div class="passplay-title">Pass the device to ${label}</div>
          <button class="btn primary" type="button">I'm ${label} — ready</button>
        </div>`;
      curtain.querySelector("button").addEventListener("click", () => {
        curtain.remove();
        AudioFX.pop();
        if (onReady) onReady();
      });
      stage.appendChild(curtain);
    },

    // ---------- Session wrap-up ----------
    _maybeShowSessionWrapup() {
      const s = App._session;
      if (s.wrapShown || s.games < 3) return;
      const mins = (Date.now() - s.start) / 60000;
      if (mins < 6) return;
      s.wrapShown = true;
      const host = $("#session-wrapup");
      if (!host) return;
      $("#session-wrapup-text").textContent =
        `Nice session! ${s.games} games · ${Math.max(1, Math.round(mins))} min · ${s.wins} win${s.wins === 1 ? "" : "s"}`;
      host.style.display = "";
      AudioFX.ding();
    },

    // ---------- Random pick, weighted toward unplayed ----------
    _randomPick() {
      const all = GameRegistry.all().filter(g => !Storage.isHidden(g.id));
      if (!all.length) return null;
      const played = Storage.getStats().gamesPlayed || {};
      // Unplayed games get 3 tickets, played ones 1 — a gentle nudge toward
      // discovery without ever hiding the old favourites.
      const tickets = [];
      all.forEach(g => {
        const n = played[g.id] ? 1 : 3;
        for (let i = 0; i < n; i++) tickets.push(g);
      });
      let pick = tickets[Math.floor(Math.random() * tickets.length)];
      if (App.currentGame && all.length > 1) {
        let guard = 0;
        while (pick.id === App.currentGame.id && guard++ < 10) {
          pick = tickets[Math.floor(Math.random() * tickets.length)];
        }
      }
      return pick;
    },

    // ---------- Data health ----------
    _renderDataHealth() {
      const host = $("#data-health");
      if (!host) return;
      let used = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          used += (k.length + (localStorage.getItem(k) || "").length) * 2; // UTF-16
        }
      } catch (e) { /* private mode */
      }
      const kb = Math.round(used / 1024);
      const age = Storage.getBackupAgeDays();
      const ageTxt = age === null
        ? `<span class="data-warn">no backup yet — export one above</span>`
        : (age > 30 ? `<span class="data-warn">last backup ${age} days ago</span>`
          : `last backup ${age === 0 ? "today" : age + " day" + (age === 1 ? "" : "s") + " ago"}`);
      host.innerHTML = `💾 Stored locally: ~${kb} KB of ~5 MB · ${ageTxt}`;
    },
    _maybeNudgeBackup() {
      const stats = Storage.getStats();
      if ((stats.totalPlays || 0) < 50) return;
      const age = Storage.getBackupAgeDays();
      if (age !== null && age <= 30) return;
      const flag = "gamehub:backup-nudge:" + App._todayKey();
      try {
        if (localStorage.getItem(flag)) return;
        localStorage.setItem(flag, "1");
      } catch (e) {
        return;
      }
      App.toast("💾 Lots of progress saved — consider a backup (⚙ → Your data)", "info");
    },

    // ---------- Init ----------
    init() {
      // Theme/mode/sound
      App.applyTheme();
      App.applySound();
      // Runtime error net — before anything else can throw.
      App._setupErrorNet();
      // Save-Data / 2G awareness: skip decorative effects + prefetch.
      try {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
        if (navigator.saveData || /(^|\b)2g/.test(conn.effectiveType || "")) {
          document.documentElement.dataset.saveData = "1";
        }
      } catch (e) { /* some browsers lock navigator.connection down */
      }
      // Keyboard grid navigation
      App._setupGridKeyboard();
      // Data health line + backup nudge
      App._renderDataHealth();
      App._maybeNudgeBackup();
      // Session wrap-up card handlers
      const wrapClose = $("#session-wrapup-close");
      if (wrapClose) wrapClose.addEventListener("click", () => {
        AudioFX.click();
        const host = $("#session-wrapup");
        if (host) host.style.display = "none";
      });
      const wrapShare = $("#session-wrapup-share");
      if (wrapShare) wrapShare.addEventListener("click", () => {
        AudioFX.click();
        const s = App._session;
        const mins = Math.max(1, Math.round((Date.now() - s.start) / 60000));
        const text = `Just played ${s.games} games at Pixel Arcade — ${s.wins} win${s.wins === 1 ? "" : "s"} in ${mins} min 🎮`;
        App.shareScore(text);
      });
      // Sync the favorites-only toggle initial state (class + aria-pressed)
      const favOnlyBtn = $("#fav-only-btn");
      if (favOnlyBtn) {
        favOnlyBtn.classList.toggle("active", App.state.favOnly);
        favOnlyBtn.setAttribute("aria-pressed", App.state.favOnly ? "true" : "false");
      }
      // Auto-detect OS prefers-reduced-motion / prefers-contrast on first visit
      App._respectOsPreferences();
      $("#footer-count").textContent = GameRegistry.all().length;

      // Fixed topbar height sync — publish the real bar height to --topbar-h
      // so body padding always matches (theme fonts + a11y font scaling and
      // window resizes all change it). Runs before first paint of content.
      const topbar = document.querySelector(".topbar");
      if (topbar) {
        const syncTopbarH = () => {
          document.documentElement.style.setProperty("--topbar-h", topbar.offsetHeight + "px");
        };
        syncTopbarH();
        if ("ResizeObserver" in window) {
          new ResizeObserver(syncTopbarH).observe(topbar);
        } else {
          window.addEventListener("resize", syncTopbarH);
        }
        // Re-measure once webfonts have loaded (metrics can shift)
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncTopbarH);
      }

      // Buttons
      $("#brand").addEventListener("click", () => {
        App.closeGame();
      });
      $("#back-btn").addEventListener("click", () => {
        AudioFX.click();
        App.closeGame();
      });
      $("#game-restart-btn").addEventListener("click", () => {
        AudioFX.click();
        App.restart();
      });
      $("#game-help-btn").addEventListener("click", () => {
        AudioFX.click();
        if (App.currentGame && App.currentGame.help) App.currentGame.help();
      });
      $("#game-hint-btn").addEventListener("click", () => {
        AudioFX.click();
        if (App.currentGame && App.currentGame.hint) App.currentGame.hint();
      });
      $("#game-solve-btn").addEventListener("click", () => {
        AudioFX.click();
        if (App.currentGame && App.currentGame.solve) App.currentGame.solve();
      });
      $("#game-fav-btn").addEventListener("click", () => {
        if (!App.currentGame) return;
        const id = App.currentGame.id;
        const added = Storage.toggleFavorite(id);
        AudioFX.pop();
        App.toast(added ? "Added to favorites" : "Removed from favorites", "info");
        App.updateGameFavBtn();
        // Keep the matching grid card heart in sync without re-rendering
        // (a full render here felt like a page reload).
        App._syncFavUi(id);
      });
      // Random game button — jump to a surprise (weighted toward unplayed)
      const randBtn = $("#random-btn");
      if (randBtn) randBtn.addEventListener("click", () => {
        AudioFX.pop();
        const pick = App._randomPick();
        if (pick) App.openGame(pick.id);
      });
      // Share button — copy a rich emoji summary to clipboard
      $("#game-share-btn").addEventListener("click", () => {
        AudioFX.click();
        if (!App.currentGame) return;
        App.shareScore();
      });
      // Stats + achievements buttons in the topbar
      $("#stats-btn").addEventListener("click", () => {
        AudioFX.click();
        App.showStats();
      });
      $("#achv-btn").addEventListener("click", () => {
        AudioFX.click();
        App.showAchievements();
      });
      // Data export / import / reset (in the a11y panel)
      const expBtn = document.getElementById("data-export");
      if (expBtn) expBtn.addEventListener("click", () => App.exportData());
      const impBtn = document.getElementById("data-import");
      if (impBtn) impBtn.addEventListener("click", () => {
        const f = document.getElementById("data-import-file");
        if (f) f.click();
      });
      const impFile = document.getElementById("data-import-file");
      if (impFile) impFile.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) App.importData(e.target.files[0]);
        e.target.value = ""; // reset so same file can be re-imported
      });
      const dataResetBtn = document.getElementById("data-reset");
      if (dataResetBtn) dataResetBtn.addEventListener("click", () => {
        App.showModal("Erase all data?",
          "This will erase your favorites, scores, stats, achievements, recent plays, and hidden games. This cannot be undone.",
          [
            {
              label: "Cancel", onClick: () => {
              }
            },
            {
              label: "Erase everything", primary: true, onClick: () => {
                Storage.wipeAll();
                App.applyA11y();
                App.renderGrid();
                App.evaluateAchievements();
                AudioFX.lose();
                App.toast("All data erased", "info");
              }
            },
          ]);
      });
      $("#mode-btn").addEventListener("click", () => {
        App.toggleMode();
      });
      $("#sound-btn").addEventListener("click", () => {
        App.toggleSound();
      });

      // Theme menu
      $("#theme-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        $("#a11y-panel").classList.remove("open");
        $("#theme-panel").classList.toggle("open");
        AudioFX.click();
      });
      $$(".menu-chip").forEach(c => c.addEventListener("click", () => {
        const isCustom = c.dataset.themeId === "custom";
        App.setTheme(c.dataset.themeId);
        AudioFX.click();
        // Keep the panel open when picking Custom so the builder is right
        // there to tweak; every other theme applies instantly and closes.
        if (!isCustom) $("#theme-panel").classList.remove("open");
        App.toast(isCustom ? "Custom theme — build yours below 🎛️" : "Theme: " + c.textContent, "info");
      }));
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".menu")) $("#theme-panel").classList.remove("open");
        if (!e.target.closest("#a11y-btn") && !e.target.closest("#a11y-panel")) $("#a11y-panel").classList.remove("open");
      });

      // Accessibility panel
      $("#a11y-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        $("#a11y-panel").classList.toggle("open");
        $("#theme-panel").classList.remove("open");
        AudioFX.click();
      });
      $$("[data-a11y]").forEach(btn => btn.addEventListener("click", () => {
        const a = Storage.getA11y();
        const action = btn.dataset.a11y;
        const STEPS = [80, 90, 100, 110, 120, 140, 160];
        if (action === "fontInc") {
          const cur = STEPS.includes(a.fontScale) ? a.fontScale : 100;
          const idx = Math.min(STEPS.indexOf(cur) + 1, STEPS.length - 1);
          a.fontScale = STEPS[idx];
        } else if (action === "fontDec") {
          const cur = STEPS.includes(a.fontScale) ? a.fontScale : 100;
          const idx = Math.max(STEPS.indexOf(cur) - 1, 0);
          a.fontScale = STEPS[idx];
        } else if (action === "fontReset") {
          a.fontScale = 100;
        }
        Storage.setA11y({fontScale: a.fontScale});
        App.applyA11y();
        AudioFX.click();
        App.toast("Font size: " + a.fontScale + "%", "info");
      }));
      $("#a11y-contrast").addEventListener("change", (e) => {
        Storage.setA11y({highContrast: e.target.checked});
        App.applyA11y();
        AudioFX.click();
        App.toast("High contrast: " + (e.target.checked ? "on" : "off"), "info");
      });
      $("#a11y-motion").addEventListener("change", (e) => {
        Storage.setA11y({reduceMotion: e.target.checked});
        App.applyA11y();
        AudioFX.click();
        App.toast("Reduce motion: " + (e.target.checked ? "on" : "off"), "info");
      });
      $("#a11y-dyslexia").addEventListener("change", (e) => {
        Storage.setA11y({dyslexiaFont: e.target.checked});
        App.applyA11y();
        AudioFX.click();
        App.toast("Dyslexia font: " + (e.target.checked ? "on" : "off"), "info");
      });
      $("#a11y-focus").addEventListener("change", (e) => {
        Storage.setA11y({largeFocus: e.target.checked});
        App.applyA11y();
        AudioFX.click();
        App.toast("Large focus rings: " + (e.target.checked ? "on" : "off"), "info");
      });
      $("#a11y-cb").addEventListener("change", (e) => {
        Storage.setA11y({colorBlind: e.target.value});
        App.applyA11y();
        AudioFX.click();
        App.toast("Color-blind mode: " + e.target.value, "info");
      });
      $("#a11y-reset-all").addEventListener("click", () => {
        Storage.setA11y({
          fontScale: 100, highContrast: false, reduceMotion: false,
          dyslexiaFont: false, colorBlind: "off", largeFocus: false,
        });
        App.applyA11y();
        AudioFX.click();
        App.toast("Accessibility settings reset", "info");
      });
      App.applyA11y();

      // Filters
      $$(".filter-chip[data-dim='category']").forEach(c => c.addEventListener("click", () => {
        AudioFX.click();
        // When browsing a category/collection landing route, moving to another
        // category goes through the route (keeps the URL shareable) instead
        // of a direct filter change.
        const onRoute = location.hash.indexOf("#/category/") === 0 ||
          location.hash.indexOf("#/collection/") === 0;
        if (onRoute) {
          const target = c.dataset.filter;
          if (target === "all") {
            App._exitCategoryRoute();
            App.toast("Showing all games", "info");
          } else {
            App._gotoCategory(target);
          }
          return;
        }
        $$(".filter-chip[data-dim='category']").forEach(x => x.classList.remove("active"));
        c.classList.add("active");
        App.state.filter = c.dataset.filter;
        App.state.collectionFilter = null; // leaving any collection context
        App.renderGrid();
      }));
      // Debounced search input — re-rendering 150 cards on every keystroke is
      // wasteful, so we wait ~150ms after the last keypress before re-rendering.
      let searchTimer = null;
      $("#search").addEventListener("input", (e) => {
        App.state.search = e.target.value.toLowerCase();
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => App.renderGrid(), 150);
      });

      // "Clear" button on the Recently played rail.
      const recentClearBtn = document.getElementById("home-recent-clear");
      if (recentClearBtn) recentClearBtn.addEventListener("click", () => {
        AudioFX.click();
        Storage.clearRecent();
        App.renderGrid();
        App.toast("Recently played cleared", "info");
      });

      // Advanced multi-dimensional filters
      ["age-filter", "diff-filter", "dur-filter", "players-filter"].forEach(sel => {
        const el = document.getElementById(sel);
        if (!el) return;
        el.addEventListener("change", () => {
          AudioFX.click();
          if (sel === "age-filter") App.state.ageFilter = el.value;
          else if (sel === "diff-filter") App.state.diffFilter = el.value;
          else if (sel === "dur-filter") App.state.durFilter = el.value;
          else if (sel === "players-filter") App.state.playersFilter = el.value;
          App.renderGrid();
        });
      });
      // Reset all filters
      const resetBtn = document.getElementById("filters-reset");
      if (resetBtn) resetBtn.addEventListener("click", () => {
        AudioFX.click();
        App.state.filter = "all";
        App.state.ageFilter = "all";
        App.state.diffFilter = "all";
        App.state.durFilter = "all";
        App.state.playersFilter = "all";
        App.state.search = "";
        App.state.sort = "default";
        App.state.favOnly = false;
        App.state.tags = [];
        const favBtn = $("#fav-only-btn");
        favBtn.classList.remove("active");
        favBtn.setAttribute("aria-pressed", "false");
        favBtn.title = "Show favorites only";
        const searchEl = $("#search");
        if (searchEl) searchEl.value = "";
        const clearBtn = document.getElementById("search-clear");
        if (clearBtn) clearBtn.classList.remove("visible");
        const sortEl = document.getElementById("sort-select");
        if (sortEl) sortEl.value = "default";
        $$(".filter-chip[data-dim='category']").forEach(x => x.classList.remove("active"));
        const allChip = document.querySelector('.filter-chip[data-filter="all"]');
        if (allChip) allChip.classList.add("active");
        ["age-filter", "diff-filter", "dur-filter", "players-filter"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = "all";
        });
        App.renderGrid();
        App.toast("Filters reset", "info");
      });

      // Favorites-only toggle
      $("#fav-only-btn").addEventListener("click", () => {
        AudioFX.click();
        App.state.favOnly = !App.state.favOnly;
        const btn = $("#fav-only-btn");
        btn.classList.toggle("active", App.state.favOnly);
        btn.setAttribute("aria-pressed", App.state.favOnly ? "true" : "false");
        btn.title = App.state.favOnly ? "Show all games" : "Show favorites only";
        App.renderGrid();
        App.toast(App.state.favOnly ? "Showing favorites only" : "Showing all games", "info");
      });

      // Modal backdrop click closes
      $("#modal-backdrop").addEventListener("click", (e) => {
        if (e.target === $("#modal-backdrop")) App.closeModal();
      });
      // Modal close (×) button — easier to reach than the backdrop on touch devices
      const modalCloseBtn = document.getElementById("modal-close");
      if (modalCloseBtn) modalCloseBtn.addEventListener("click", () => {
        AudioFX.click();
        App.closeModal();
      });

      // Esc closes game / modal
      document.addEventListener("keydown", (e) => {
        // Ctrl+K / Cmd+K toggles the command palette (works everywhere —
        // home, inside games, inside inputs).
        if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
          e.preventDefault();
          App._toggleCommandPalette();
          return;
        }
        if (e.key === "Escape") {
          if ($("#cmdk-backdrop") && $("#cmdk-backdrop").classList.contains("open")) App._closeCmdk();
          else if ($("#modal-backdrop").classList.contains("open")) App.closeModal();
          else if ($("#game-view").classList.contains("active")) App.closeGame();
        }
        // Tab focus trap while a modal is open (keeps keyboard focus
        // inside the dialog — standard WAI-ARIA modal behavior)
        if (e.key === "Tab" && $("#modal-backdrop").classList.contains("open")) {
          const modal = $("#modal");
          const focusables = Array.from(modal.querySelectorAll(
            "button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])"
          )).filter(el => el.offsetParent !== null);
          if (focusables.length) {
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
              e.preventDefault();
              first.focus();
            }
          }
        }
        // ? opens keyboard shortcut help
        if (e.key === "?" && !$("#game-view").classList.contains("active") && !$("#modal-backdrop").classList.contains("open")) {
          const tag = (e.target && e.target.tagName) || "";
          if (tag !== "INPUT" && tag !== "TEXTAREA") {
            e.preventDefault();
            App._showShortcutHelp();
          }
        }
        // / focuses the search box (when not in a game)
        if (e.key === "/" && !$("#game-view").classList.contains("active") && !$("#modal-backdrop").classList.contains("open")) {
          const tag = (e.target && e.target.tagName) || "";
          if (tag !== "INPUT" && tag !== "TEXTAREA") {
            e.preventDefault();
            const search = document.getElementById("search");
            if (search) search.focus();
          }
        }
      });

      // Prevent browser shortcuts (quick-find "/", "'", Ctrl+K search, etc.)
      // from interfering with game keyboard input. When a game view is active
      // AND focus is NOT inside an input/textarea/contenteditable, swallow
      // keys that games commonly consume: a-z, 0-9, arrows, space, Enter,
      // Backspace, /, ', and -. We preserve Ctrl/Cmd/Meta+anything, F-keys,
      // Tab, and Escape so browser-level shortcuts still work.
      document.addEventListener("keydown", (e) => {
        if (!$("#game-view").classList.contains("active")) return;
        const t = e.target;
        const tag = (t && t.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || (t && t.isContentEditable)) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;            // allow Ctrl+T, Cmd+W, etc.
        if (e.key && e.key.length > 1 && e.key !== "Enter" && e.key !== "Backspace" && e.key !== " ") return;
        // Block keys that would otherwise trigger browser quick-find / search.
        // Games that don't consume these just ignore them; games that do (Wordle,
        // Hangman, 2048, Snake, Sudoku, etc.) call their own preventDefault too.
        if (/^[a-zA-Z0-9]$/.test(e.key) || ["Enter", "Backspace", " ", "/", "'", "-", "+", "=", "."].includes(e.key) || e.key.startsWith("Arrow")) {
          e.preventDefault();
        }
      }, true); // capture phase so we run BEFORE the game's own listener

      // Keyboard navigation in the game grid (only when home view is visible
      // and focus is not inside an input/select).
      document.addEventListener("keydown", (e) => {
        if ($("#game-view").classList.contains("active")) return;
        if ($("#modal-backdrop").classList.contains("open")) return;
        const tag = (e.target && e.target.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable)) return;
        if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "f", "F"].includes(e.key)) return;
        const cards = Array.from(document.querySelectorAll("#game-grid .card"));
        if (!cards.length) return;
        e.preventDefault();
        const focused = document.activeElement;
        const idx = cards.indexOf(focused);
        let next = idx;
        const cols = Math.max(1, Math.floor(document.querySelector("#game-grid").clientWidth / 240));
        if (e.key === "ArrowRight") next = idx < 0 ? 0 : (idx + 1) % cards.length;
        else if (e.key === "ArrowLeft") next = idx < 0 ? 0 : (idx - 1 + cards.length) % cards.length;
        else if (e.key === "ArrowDown") next = idx < 0 ? 0 : (idx + cols) % cards.length;
        else if (e.key === "ArrowUp") next = idx < 0 ? 0 : (idx - cols + cards.length) % cards.length;
        else if (e.key === "Enter") {
          if (idx >= 0) cards[idx].click();
          return;
        } else if (e.key === "f" || e.key === "F") {
          if (idx >= 0) {
            const card = cards[idx];
            const id = card.dataset.id;
            if (id) {
              const added = Storage.toggleFavorite(id);
              AudioFX.pop();
              App.toast(added ? "★ Favorited" : "☆ Unfavorited", "info");
              // Update the heart in place — no re-render, no focus loss.
              App._syncFavUi(id, card.querySelector(".fav"));
              if (!added && App.state.favOnly) App._removeCardFromGrid(id);
            }
          }
          return;
        }
        cards[next].focus();
      });

      // PWA install prompt
      App._setupInstallPrompt();
      // Offline indicator
      App._setupOfflineIndicator();
      // Back-to-top button
      App._setupBackToTop();
      // Hero greeting (time-of-day)
      App._renderGreeting();
      // Search clear button
      App._setupSearchClear();
      // Ctrl+K command palette
      App._setupCommandPalette();
      // Play-time tracking (visibility + unload flush hooks)
      App._setupPlaytimeTracking();
      // Custom theme builder
      App._setupThemeBuilder();
      // Category landing banner — “✕ View all games” leaves the route
      const catClear = document.getElementById("category-clear");
      if (catClear) catClear.addEventListener("click", () => {
        AudioFX.click();
        App._exitCategoryRoute();
        App.toast("Showing all games", "info");
      });
      // Sort dropdown
      const sortSel = document.getElementById("sort-select");
      if (sortSel) sortSel.addEventListener("change", () => {
        App.state.sort = sortSel.value;
        localStorage.setItem("gamehub:sort", sortSel.value);
        AudioFX.click();
        App.renderGrid();
      });

      // Routing
      window.addEventListener("hashchange", App.route);

      // First visit
      Storage.incVisits();

      // Evaluate achievements on load (in case conditions changed while away)
      App.evaluateAchievements();
      // Weekly summary toast (first visit this week)
      App._checkWeeklySummary();

      // Restore sort preference from localStorage
      const savedSort = localStorage.getItem("gamehub:sort");
      if (savedSort) {
        App.state.sort = savedSort;
        const sortEl = document.getElementById("sort-select");
        if (sortEl) sortEl.value = savedSort;
      }

      App.renderGrid();
      App.route();
    },

    // Detect OS prefers-reduced-motion / prefers-contrast on first visit
    // and auto-enable the matching a11y setting. Only runs once (when the
    // a11y settings still have their default values).
    _respectOsPreferences() {
      try {
        const a = Storage.getA11y();
        const seen = localStorage.getItem("gamehub:os-pref-seen");
        if (seen) return; // only auto-detect on first visit
        localStorage.setItem("gamehub:os-pref-seen", "1");
        const updates = {};
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          updates.reduceMotion = true;
        }
        if (window.matchMedia && window.matchMedia("(prefers-contrast: more)").matches) {
          updates.highContrast = true;
        }
        if (Object.keys(updates).length) {
          Storage.setA11y(updates);
          App.applyA11y();
          const labels = [];
          if (updates.reduceMotion) labels.push("reduce motion");
          if (updates.highContrast) labels.push("high contrast");
          App.toast("Auto-enabled: " + labels.join(" + ") + " (from OS settings)", "info");
        }
      } catch (e) { /* ignore */
      }
    },

    // Lazy-load a declared (not yet loaded) game's script on card hover, so
    // the game starts instantly when clicked. Safe to call repeatedly —
    // GameRegistry.load() de-duplicates in-flight loads.
    _preloadHint(id) {
      // Save-Data / 2G users skip idle prefetching — data first.
      if (document.documentElement.dataset.saveData) return;
      // Warm the cache for a declared (not yet loaded) game on hover.
      if (window.GameRegistry && GameRegistry.isLazy && GameRegistry.isLazy(id)) {
        GameRegistry.load(id).catch(() => {
        });
      }
    },

    // PWA install prompt — capture beforeinstallprompt, show our banner.
    _setupInstallPrompt() {
      const banner = document.getElementById("install-banner");
      if (!banner) return;
      let deferred = null;
      window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferred = e;
        if (!Storage.isInstallDismissed()) banner.style.display = "";
      });
      const accept = document.getElementById("install-accept");
      const dismiss = document.getElementById("install-dismiss");
      if (accept) accept.addEventListener("click", () => {
        banner.style.display = "none";
        if (deferred) {
          deferred.prompt();
          deferred.userChoice.then(() => {
            deferred = null;
          });
        }
      });
      if (dismiss) dismiss.addEventListener("click", () => {
        banner.style.display = "none";
        Storage.dismissInstall();
      });
      // Pre-cache all 300 game scripts for full offline play. Posts a message
      // to the service worker, which addAll()s the per-game URLs into the
      // active cache. Falls back to a no-op toast if the SW isn't ready.
      const cacheAllBtn = document.getElementById("install-cache-all");
      if (cacheAllBtn) cacheAllBtn.addEventListener("click", () => {
        AudioFX.click();
        const urls = GameRegistry.all().map(g => "js/games/" + g.id + ".js");
        let doneToast = false;
        const okToast = () => {
          if (!doneToast) {
            doneToast = true;
            App.toast("📦 Cached all games for offline play", "success");
          }
        };
        const failToast = () => {
          if (!doneToast) {
            doneToast = true;
            App.toast("Couldn't cache all games — try again later", "warning");
          }
        };
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          const mc = new MessageChannel();
          mc.port1.onmessage = (e) => {
            if (e.data && e.data.ok) okToast();
            else failToast();
          };
          navigator.serviceWorker.controller.postMessage({type: "CACHE_ALL_GAMES", urls: urls}, [mc.port2]);
          // Safety timeout — if the SW doesn't respond in 30s, show a warning.
          setTimeout(failToast, 30000);
        } else {
          // SW not active yet — re-register and retry once.
          if (navigator.serviceWorker) {
            navigator.serviceWorker.register("sw.js").then(() => {
              setTimeout(() => {
                if (navigator.serviceWorker.controller) {
                  const mc = new MessageChannel();
                  mc.port1.onmessage = (e) => {
                    (e.data && e.data.ok) ? okToast() : failToast();
                  };
                  navigator.serviceWorker.controller.postMessage({type: "CACHE_ALL_GAMES", urls: urls}, [mc.port2]);
                  setTimeout(failToast, 30000);
                } else {
                  failToast();
                }
              }, 800);
            }).catch(failToast);
          } else {
            failToast();
          }
        }
      });
      // If already installed (standalone), never show
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
        banner.style.display = "none";
      }
    },

    // Offline indicator — show "Offline" badge when navigator.onLine is false.
    _setupOfflineIndicator() {
      const badge = document.getElementById("offline-badge");
      if (!badge) return;
      const update = () => {
        badge.style.display = navigator.onLine ? "none" : "";
      };
      update();
      window.addEventListener("online", update);
      window.addEventListener("offline", update);
    },

    // Back-to-top button — appears when the user scrolls down.
    _setupBackToTop() {
      const btn = document.getElementById("back-to-top");
      if (!btn) return;
      const onScroll = () => {
        if (window.scrollY > 300) btn.classList.add("visible");
        else btn.classList.remove("visible");
      };
      window.addEventListener("scroll", onScroll, {passive: true});
      btn.addEventListener("click", () => {
        window.scrollTo({top: 0, behavior: "smooth"});
        AudioFX.click();
      });
      onScroll();
    },

    // Time-of-day greeting in the hero section. Includes the daily streak
    // (when active) and a small game-completion counter so the player can see
    // their catalogue progress every time they land on the home view.
    _renderGreeting() {
      const el = document.getElementById("hero-greeting");
      if (!el) return;
      const h = new Date().getHours();
      let greeting;
      if (h < 5) greeting = "Burning the midnight oil? 🌙";
      else if (h < 12) greeting = "Good morning! ☀️";
      else if (h < 17) greeting = "Good afternoon! 🌤️";
      else if (h < 21) greeting = "Good evening! 🌆";
      else greeting = "Good night! 🌙";
      const streak = Storage.getStreak();
      if (streak.current > 0) greeting += ` — ${streak.current}-day streak 🔥`;
      // Game completion counter — unique games played out of total registered.
      const stats = Storage.getStats();
      const total = GameRegistry.all().length;
      const played = Object.keys(stats.gamesPlayed || {})
        .filter(id => GameRegistry.get(id)).length;
      if (total > 0) greeting += ` — ${played}/${total} games explored`;
      el.textContent = greeting;
    },

    // Search clear button — visible when there's text, clears on click.
    _setupSearchClear() {
      const search = document.getElementById("search");
      const clear = document.getElementById("search-clear");
      if (!search || !clear) return;
      const update = () => {
        clear.classList.toggle("visible", !!search.value);
      };
      search.addEventListener("input", update);
      clear.addEventListener("click", () => {
        search.value = "";
        App.state.search = "";
        update();
        AudioFX.click();
        App.renderGrid();
        search.focus();
      });
      update();
    },

    // Keyboard shortcut help modal — opened with "?" key or Ctrl+K → shortcuts.
    _showShortcutHelp() {
      const body = `
        <div style="font-size:0.9rem; line-height:1.8;">
          <p><span class="kbd">Ctrl</span> + <span class="kbd">K</span> — Open the command palette (search games &amp; actions)</p>
          <p><span class="kbd">←</span> <span class="kbd">→</span> <span class="kbd">↑</span> <span class="kbd">↓</span> — Move between game cards on the home grid</p>
          <p><span class="kbd">Enter</span> — Open the focused game card</p>
          <p><span class="kbd">F</span> — Toggle favorite on the focused card</p>
          <p><span class="kbd">Esc</span> — Close the current game or modal</p>
          <p><span class="kbd">?</span> — Show this help</p>
          <p><span class="kbd">/</span> — Focus the search box</p>
          <p style="margin-top:10px;color:var(--text-muted);font-size:0.82rem;">Inside games: each game uses its own keyboard shortcuts. The browser's quick-find is disabled while a game is active.</p>
        </div>
      `;
      App.showModal("Keyboard shortcuts", body);
    },

    // Text-to-speech for help text — uses the Web Speech API.
    speakHelp(text) {
      if (!window.speechSynthesis) {
        App.toast("Text-to-speech not supported in this browser", "info");
        return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
      App.toast("🔊 Reading aloud...", "info");
    },
  };

  global.App = App;
  document.addEventListener("DOMContentLoaded", () => {
    try {
      App.init();
    } catch (e) {
      console.error("Pixel Arcade failed to start:", e);
      // Render a minimal fallback so the user isn't staring at a blank page.
      try {
        document.body.insertAdjacentHTML("afterbegin",
          '<div style="padding:24px;text-align:center;font-family:sans-serif;">' +
          '<div style="font-size:2rem;margin-bottom:8px;">😵</div>' +
          '<div style="font-weight:600;margin-bottom:8px;">Pixel Arcade failed to start</div>' +
          '<div style="color:#64748b;margin-bottom:14px;">' + (e && e.message ? e.message : "Unknown error") + '</div>' +
          '<button onclick="location.reload()" style="padding:8px 16px;cursor:pointer;">Reload</button>' +
          '</div>');
      } catch (_) { /* if even the fallback fails, leave the console error */
      }
    }
  });
})(window);
