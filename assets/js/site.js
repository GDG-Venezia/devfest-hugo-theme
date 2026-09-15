// DevFest Venezia 26 — progressive enhancements. The site works without this script.

const SAVED_KEY = "devfest26:saved";

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
  } catch {
    // Storage unavailable (private mode): saving only lasts for this page view.
  }
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
  const saveButtons = document.querySelectorAll("[data-save]");
  const filterBar = document.querySelector("[data-agenda-filter]");
  let activeFilter = "All";

  const applyFilter = () => {
    if (!filterBar) return;
    let visible = 0;
    document.querySelectorAll("[data-slot]").forEach((slot) => {
      let slotVisible = 0;
      slot.querySelectorAll("[data-session]").forEach((card) => {
        const show =
          activeFilter === "All" ||
          (card.hasAttribute("data-service") && activeFilter !== "saved") ||
          (activeFilter === "saved" ? saved.has(card.dataset.id) : card.dataset.track === activeFilter);
        card.hidden = !show;
        if (show) slotVisible++;
        if (show && !card.hasAttribute("data-service")) visible++;
      });
      slot.hidden = slotVisible === 0;
    });
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
      if (saved.has(id)) saved.delete(id);
      else saved.add(id);
      writeSaved(saved);
      renderSaved();
      if (activeFilter === "saved") applyFilter();
    });
  });

  filterBar?.querySelectorAll("[data-track-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.trackFilter;
      filterBar.querySelectorAll("[data-track-filter]").forEach((b) => {
        b.setAttribute("aria-pressed", String(b === button));
      });
      applyFilter();
    });
  });

  renderSaved();
}

function initLiveBar() {
  const bar = document.querySelector("[data-live-bar]");
  const source = document.getElementById("live-schedule");
  if (!bar || !source) return;

  let schedule;
  try {
    schedule = JSON.parse(source.textContent).map((s) => ({ ...s, start: new Date(s.start), end: new Date(s.end) }));
  } catch {
    return;
  }

  const update = () => {
    const now = new Date();
    const live = schedule.filter((s) => s.start <= now && now < s.end);
    bar.hidden = live.length === 0;
    if (live.length) {
      bar.querySelector("[data-live-title]").textContent = live
        .map((s) => (s.room ? `${s.title} — ${s.room}` : s.title))
        .join(" · ");
    }
  };
  update();
  setInterval(update, 60_000);
}

initMenu();
initAgenda();
initLiveBar();
