// DevFest Venezia — progressive enhancements. The site works without this script.

// Saved talks live in this browser only (localStorage): no account, no sync.
const SAVED_KEY = "devfest:saved";
const SAVE_HINT_KEY = "devfest:saved-hint-seen";

function storageAvailable() {
  try {
    const probe = "devfest:probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function readSaved() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function writeSaved(saved) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify([...saved]));
    return true;
  } catch {
    return false;
  }
}

let toastTimer;
function showToast(message, { long = false } = {}) {
  let toast = document.querySelector("[data-toast]");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("data-toast", "");
    toast.setAttribute("role", "status");
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, long ? 7000 : 2500);
}

function initMenu() {
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.getElementById("mobile-menu");
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () => setOpen(menu.hidden));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });
}

function initAgenda() {
  const saved = readSaved();
  const canStore = storageAvailable();
  const saveButtons = document.querySelectorAll("[data-save]");
  const savedNote = document.querySelector("[data-saved-note]");
  if (savedNote) {
    savedNote.querySelectorAll("[data-storage-ok]").forEach((el) => { el.hidden = !canStore; });
    savedNote.querySelectorAll("[data-storage-off]").forEach((el) => { el.hidden = canStore; });
  }
  const filterBar = document.querySelector("[data-agenda-filter]");
  let activeFilter = "All";

  const applyFilter = () => {
    if (!filterBar) return;
    const grid = document.querySelector("[data-agenda-grid]");
    let visible = 0;
    const visibleStarts = new Set();
    document.querySelectorAll("[data-cell]").forEach((cell) => {
      const card = cell.querySelector("[data-session]");
      const show =
        activeFilter === "All" ||
        (card.hasAttribute("data-service") && activeFilter !== "saved") ||
        (activeFilter === "saved" ? saved.has(card.dataset.id) : card.dataset.track === activeFilter);
      cell.hidden = !show;
      if (show) visibleStarts.add(cell.dataset.start);
      if (show && !card.hasAttribute("data-service")) visible++;
    });
    document.querySelectorAll("[data-time]").forEach((time) => {
      time.hidden = !visibleStarts.has(time.dataset.time);
    });
    // A timetable with most cells hidden reads badly: filtered views become a list.
    grid?.classList.toggle("is-list", activeFilter !== "All");
    if (savedNote) savedNote.hidden = activeFilter !== "saved";
    const count = document.querySelector("[data-result-count]");
    if (count) count.textContent = String(visible);
    const empty = document.querySelector("[data-empty-state]");
    if (empty) empty.hidden = visible > 0;
  };

  const renderSaved = () => {
    saveButtons.forEach((button) => {
      const on = saved.has(button.dataset.save);
      button.setAttribute("aria-pressed", String(on));
      button.textContent = on ? "Saved ✓" : "Save";
    });
  };

  saveButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const id = button.dataset.save;
      const adding = !saved.has(id);
      if (adding) saved.add(id);
      else saved.delete(id);
      const stored = writeSaved(saved);
      renderSaved();
      if (adding) {
        if (!stored) {
          showToast("Saved for now only: this browser can't keep it after you leave the page.", { long: true });
        } else if (!localStorage.getItem(SAVE_HINT_KEY)) {
          localStorage.setItem(SAVE_HINT_KEY, "1");
          showToast("Saved to My agenda on this device only. It won't sync to other devices or browsers.", { long: true });
        } else {
          showToast("Saved on this device");
        }
      }
      if (activeFilter === "saved") applyFilter();
    });
  });

  const selectFilter = (button) => {
    activeFilter = button.dataset.trackFilter;
    filterBar.querySelectorAll("[data-track-filter]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b === button));
    });
    applyFilter();
  };

  filterBar?.querySelectorAll("[data-track-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      selectFilter(button);
      const url = new URL(location.href);
      if (activeFilter === "All") url.searchParams.delete("track");
      else url.searchParams.set("track", activeFilter);
      history.replaceState(null, "", url);
    });
  });

  const requested = new URLSearchParams(location.search).get("track");
  if (filterBar && requested) {
    const button = [...filterBar.querySelectorAll("[data-track-filter]")].find((b) => b.dataset.trackFilter === requested);
    if (button) selectFilter(button);
  }

  renderSaved();
}

// The page clock. `?now=2025-10-11T10:00` previews the live features at any moment.
function currentTime() {
  const override = new URLSearchParams(location.search).get("now");
  const date = override ? new Date(override) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function readSchedule() {
  const source = document.getElementById("live-schedule");
  if (!source) return null;
  try {
    return JSON.parse(source.textContent).map((s) => ({ ...s, start: new Date(s.start), end: new Date(s.end) }));
  } catch {
    return null;
  }
}

function sessionCard(session) {
  const card = document.createElement(session.url ? "a" : "div");
  card.className = "live-card";
  if (session.url) card.href = session.url;
  // "color" arrives as a resolved CSS value: a palette var or a raw colour.
  card.style.setProperty("--accent", session.color || "var(--df-ink)");

  const meta = document.createElement("span");
  meta.className = "live-card__meta";
  meta.textContent = [`${session.time} — ${session.endTime}`, session.room].filter(Boolean).join(" · ");
  const title = document.createElement("span");
  title.className = "live-card__title";
  title.textContent = session.title;
  card.append(meta, title);

  if (session.speakers) {
    const speakers = document.createElement("span");
    speakers.className = "live-card__speakers";
    speakers.textContent = session.speakers;
    card.append(speakers);
  }
  return card;
}

function initLive() {
  const schedule = readSchedule();
  if (!schedule || schedule.length === 0) return;

  const bar = document.querySelector("[data-live-bar]");
  const nowNext = document.querySelector("[data-now-next]");
  const trackCards = document.querySelector("[data-track-cards]");
  const firstStart = Math.min(...schedule.map((s) => s.start.getTime()));
  const lastEnd = Math.max(...schedule.map((s) => s.end.getTime()));

  const update = () => {
    const now = currentTime();
    const live = schedule.filter((s) => s.start <= now && now < s.end);

    if (bar) {
      bar.hidden = live.length === 0;
      if (live.length) {
        const [only] = live;
        bar.querySelector("[data-live-title]").textContent =
          live.length === 1 ? [only.title, only.room].filter(Boolean).join(" — ") : `${live.length} sessions in progress`;
        if (nowNext) bar.href = "#program";
      }
    }

    if (!nowNext) return;
    // "Now & next" takes over from an hour before doors open until the last session ends.
    const during = now.getTime() >= firstStart - 60 * 60 * 1000 && now.getTime() < lastEnd;
    nowNext.hidden = !during;
    if (trackCards) trackCards.hidden = during;
    if (!during) return;

    const upcoming = schedule.filter((s) => s.start > now);
    const firstStartOf = (list) => (list.length ? Math.min(...list.map((s) => s.start.getTime())) : null);
    const nextStart = firstStartOf(upcoming);
    let next = upcoming.filter((s) => s.start.getTime() === nextStart);
    // When the next slot is only a break, also show the talks that follow it.
    if (next.length && next.every((s) => s.service)) {
      const talks = upcoming.filter((s) => !s.service);
      const talksStart = firstStartOf(talks);
      next = next.concat(talks.filter((s) => s.start.getTime() === talksStart));
    }

    const nowList = nowNext.querySelector("[data-now-list]");
    nowList.closest("div:not([data-now-list])").hidden = live.length === 0;
    nowList.replaceChildren(...live.map(sessionCard));

    const nextBlock = nowNext.querySelector("[data-next-block]");
    nextBlock.hidden = next.length === 0;
    if (next.length) {
      nowNext.querySelector("[data-next-time]").textContent = next[0].time;
      nowNext.querySelector("[data-next-list]").replaceChildren(...next.map(sessionCard));
    }
  };
  update();
  setInterval(update, 60_000);
}

// Home page speakers: a different set of six on every visit.
function initSpeakerShuffle() {
  const grid = document.querySelector("[data-speaker-shuffle]");
  if (!grid) return;
  const cards = [...grid.children];
  if (cards.length <= 6) {
    grid.setAttribute("data-shuffled", "");
    return;
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  cards.forEach((card, i) => { card.hidden = i >= 6; });
  grid.replaceChildren(...cards);
  grid.setAttribute("data-shuffled", "");
}

// Venue maps: tapping a map card opens a fullscreen viewer with pinch-zoom and pan.
// Without JavaScript (or <dialog> support) the cards stay plain links to the image.
function initMapViewer() {
  const cards = document.querySelectorAll("[data-map-card]");
  if (!cards.length || typeof document.createElement("dialog").showModal !== "function") return;

  const viewer = document.createElement("dialog");
  viewer.className = "map-viewer";
  viewer.setAttribute("aria-label", "Map viewer");
  viewer.innerHTML =
    '<div class="map-viewer__bar">' +
    '<div class="map-viewer__title" data-map-title></div>' +
    '<button class="map-viewer__close" type="button">Close</button>' +
    "</div>" +
    '<div class="map-viewer__stage" data-map-stage><img alt="" draggable="false"></div>' +
    '<div class="map-viewer__hint" data-map-hint hidden>Pinch or scroll to zoom — double-tap resets</div>';
  document.body.append(viewer);

  const stage = viewer.querySelector("[data-map-stage]");
  const img = stage.querySelector("img");
  const title = viewer.querySelector("[data-map-title]");
  const hint = viewer.querySelector("[data-map-hint]");
  const MIN = 1, MAX = 6, TAP_SCALE = 2.5;

  let scale = MIN, x = 0, y = 0, baseW = 0, baseH = 0;
  const pointers = new Map();
  let lastX = 0, lastY = 0, lastDist = 0, lastMidX = 0, lastMidY = 0;
  let downX = 0, downY = 0, movedFar = false, lastTap = 0, lastZoomAt = 0;
  let wheelTimer = 0, hintTimer = 0;

  const apply = () => {
    img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    stage.style.cursor = scale > MIN ? "grab" : "zoom-in";
  };

  const clamp = () => {
    const maxX = Math.max(0, (baseW * scale - stage.clientWidth) / 2);
    const maxY = Math.max(0, (baseH * scale - stage.clientHeight) / 2);
    x = Math.min(maxX, Math.max(-maxX, x));
    y = Math.min(maxY, Math.max(-maxY, y));
  };

  // The image sits centered in the stage; measure its fitted size with no transform.
  const measure = () => {
    img.style.transform = "none";
    const rect = img.getBoundingClientRect();
    baseW = rect.width;
    baseH = rect.height;
    clamp();
    apply();
  };

  // Zoom by `factor`, keeping the point (px, py) on the image fixed.
  const zoomAt = (px, py, factor) => {
    const next = Math.min(MAX, Math.max(MIN, scale * factor));
    if (next === scale) return;
    const r = stage.getBoundingClientRect();
    const ix = (px - r.left - r.width / 2 - x) / scale;
    const iy = (py - r.top - r.height / 2 - y) / scale;
    scale = next;
    x = px - r.left - r.width / 2 - ix * scale;
    y = py - r.top - r.height / 2 - iy * scale;
    clamp();
    apply();
  };

  stage.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      downX = lastX = e.clientX;
      downY = lastY = e.clientY;
      movedFar = false;
    } else if (pointers.size === 2) {
      const [a, b] = pointers.values();
      lastDist = Math.hypot(a.x - b.x, a.y - b.y);
      lastMidX = (a.x + b.x) / 2;
      lastMidY = (a.y + b.y) / 2;
    }
    stage.classList.add("dragging");
  });

  stage.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (pointers.size === 1) {
      x += e.clientX - lastX;
      y += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
    } else if (pointers.size >= 2) {
      const [a, b] = pointers.values();
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      if (lastDist > 0) zoomAt(midX, midY, dist / lastDist);
      x += midX - lastMidX;
      y += midY - lastMidY;
      lastDist = dist;
      lastMidX = midX;
      lastMidY = midY;
    }
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) movedFar = true;
    clamp();
    apply();
  });

  const release = (e) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size === 1) {
      const [only] = pointers.values();
      lastX = only.x;
      lastY = only.y;
    } else if (pointers.size === 0) {
      stage.classList.remove("dragging");
      if (e.type !== "pointerup" || movedFar) return;
      if (scale <= MIN) {
        // Tap on the empty area around the image closes; a tap on the image does not.
        const r = img.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
          viewer.close();
          return;
        }
      }
      if (e.pointerType !== "mouse") {
        const now = performance.now();
        if (now - lastTap < 300) {
          lastTap = 0;
          lastZoomAt = now;
          zoomAt(e.clientX, e.clientY, scale > MIN + 0.01 ? MIN / scale : TAP_SCALE);
        } else {
          lastTap = now;
        }
      }
    }
  };
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);

  stage.addEventListener("dblclick", (e) => {
    const now = performance.now();
    if (now - lastZoomAt < 300) return; // already handled as a touch double-tap
    lastZoomAt = now;
    zoomAt(e.clientX, e.clientY, scale > MIN + 0.01 ? MIN / scale : TAP_SCALE);
  });

  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    stage.classList.add("dragging");
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.2 : 1 / 1.2);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => stage.classList.remove("dragging"), 150);
  }, { passive: false });

  stage.addEventListener("contextmenu", (e) => e.preventDefault());

  img.addEventListener("load", () => { if (viewer.open) measure(); });
  window.addEventListener("resize", () => { if (viewer.open) measure(); });

  viewer.querySelector(".map-viewer__close").addEventListener("click", () => viewer.close());

  viewer.addEventListener("close", () => {
    scale = MIN;
    x = 0;
    y = 0;
    apply();
    hint.hidden = true;
    clearTimeout(hintTimer);
  });

  cards.forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      const src = card.dataset.mapSrc;
      title.textContent = card.dataset.mapTitle || "";
      img.alt = card.dataset.mapAlt || "";
      if (img.getAttribute("src") !== src) img.src = src;
      scale = MIN;
      x = 0;
      y = 0;
      apply();
      viewer.showModal();
      if (img.complete && img.naturalWidth) measure();
      hint.hidden = false;
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => { hint.hidden = true; }, 3500);
    });
  });
}

initMenu();
initAgenda();
initLive();
initSpeakerShuffle();
initMapViewer();
