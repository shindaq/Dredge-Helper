"use strict";

const SPECIAL_LOCATIONS = new Set([
  "Infernal Heart",
  "Timelocked Sanctuary",
  "Abyssal Depths",
]);

const MINERAL_NAMES = Object.keys(PROSPECTING_DATA).sort((a, b) =>
  a.localeCompare(b)
);

const MAX_SUGGESTIONS = 10;

function searchMinerals(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = [];
  const contains = [];
  for (const name of MINERAL_NAMES) {
    const lower = name.toLowerCase();
    if (lower.startsWith(q)) starts.push(name);
    else if (lower.includes(q)) contains.push(name);
  }
  return starts.concat(contains);
}

function exactMatch(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return MINERAL_NAMES.find((name) => name.toLowerCase() === q) || null;
}

function resolveMineral(value) {
  const exact = exactMatch(value);
  if (exact) return exact;
  const matches = searchMinerals(value);
  return matches.length === 1 ? matches[0] : null;
}

function formatNumber(n) {
  return Number(n).toLocaleString("en-US");
}

function formatChance(chanceStr) {
  return String(chanceStr).trim();
}

function isMaxCap(cap) {
  return typeof cap === "string" && cap.trim().toUpperCase() === "MAX";
}

function formatCap(cap) {
  if (isMaxCap(cap)) return "MAX";
  const n = Number(cap);
  return Number.isFinite(n) ? n.toLocaleString("en-US") : String(cap);
}

function parseChanceAtLuck(value) {
  if (!value || typeof value !== "object") return [];
  return Object.keys(value)
    .map((k) => [parseFloat(String(k).replace(/[^0-9.]/g, "")), value[k]])
    .filter((pair) => Number.isFinite(pair[0]))
    .sort((a, b) => a[0] - b[0]);
}

function setupCombo(input, list, index, inputs, optimizeBtn) {
  let suggestions = [];
  let activeIndex = -1;
  let open = false;

  function render() {
    list.innerHTML = "";
    if (!open || suggestions.length === 0) {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      return;
    }
    suggestions.slice(0, MAX_SUGGESTIONS).forEach((name, i) => {
      const li = document.createElement("li");
      li.className = "suggestion" + (i === activeIndex ? " active" : "");
      li.id = "sugg-" + index + "-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === activeIndex ? "true" : "false");
      li.textContent = name;
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        select(name);
      });
      list.appendChild(li);
    });
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function openList() {
    suggestions = searchMinerals(input.value);
    activeIndex = -1;
    open = suggestions.length > 0;
    render();
  }

  function closeList() {
    open = false;
    activeIndex = -1;
    render();
  }

  function select(name) {
    input.value = name;
    input.classList.remove("invalid");
    closeList();
    const next = inputs[index + 1];
    if (next) next.focus();
    else optimizeBtn.focus();
  }

  function visibleCount() {
    return Math.min(suggestions.length, MAX_SUGGESTIONS);
  }

  input.addEventListener("input", () => {
    input.classList.remove("invalid");
    openList();
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) openList();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openList();
      if (visibleCount() > 0) {
        activeIndex = Math.min(activeIndex + 1, visibleCount() - 1);
        render();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (visibleCount() > 0) {
        activeIndex = Math.max(activeIndex - 1, 0);
        render();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        select(suggestions[activeIndex]);
        return;
      }
      const matches = searchMinerals(input.value);
      if (matches.length === 1) {
        select(matches[0]);
        return;
      }
      const exact = exactMatch(input.value);
      if (exact) {
        select(exact);
        return;
      }
      if (index === inputs.length - 1) optimizeBtn.click();
    } else if (e.key === "Escape") {
      closeList();
    }
  });

  input.addEventListener("blur", () => setTimeout(closeList, 120));
}

function stat(label, value) {
  const wrap = document.createElement("div");
  wrap.className = "stat";
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  if (value instanceof Node) dd.appendChild(value);
  else dd.textContent = value;
  wrap.append(dt, dd);
  return wrap;
}

function capValueNode(cap) {
  const span = document.createElement("span");
  span.textContent = formatCap(cap);
  if (isMaxCap(cap)) span.className = "cap-max";
  return span;
}

function buildLuckBreakdown(data) {
  const pairs = parseChanceAtLuck(data.chance_at_luck);
  if (pairs.length === 0) return null;

  const wrap = document.createElement("div");
  wrap.className = "luck-breakdown";

  const note = document.createElement("p");
  note.className = "lb-note";
  note.textContent = isMaxCap(data.cap)
    ? "No hard cap - more luck is always better. The chance above is the ceiling; below is the chance at common luck levels:"
    : "Chance at common luck levels:";
  wrap.appendChild(note);

  const rows = document.createElement("div");
  rows.className = "lb-rows";
  pairs.forEach(([luck, chance]) => {
    const row = document.createElement("div");
    row.className = "lb-row";
    const luckEl = document.createElement("span");
    luckEl.className = "lb-luck";
    luckEl.textContent = formatNumber(luck) + " luck";
    const valEl = document.createElement("span");
    valEl.className = "lb-val";
    valEl.textContent = formatChance(String(chance));
    row.append(luckEl, valEl);
    rows.appendChild(row);
  });
  wrap.appendChild(rows);
  return wrap;
}

function buildLocationBlock(tag, locName, data, variant, note) {
  const block = document.createElement("div");
  block.className = "loc loc-" + variant;

  const tagEl = document.createElement("span");
  tagEl.className = "loc-tag";
  tagEl.textContent = tag;
  block.appendChild(tagEl);

  const name = document.createElement("div");
  name.className = "loc-name";
  name.textContent = locName;
  block.appendChild(name);

  const stats = document.createElement("dl");
  stats.className = "stats";
  stats.appendChild(stat("Luck cap", capValueNode(data.cap)));
  stats.appendChild(stat("Chance", formatChance(data.chance)));
  stats.appendChild(stat("Odds", "1 in " + formatNumber(data.one_in)));
  block.appendChild(stats);

  if (note) {
    const n = document.createElement("p");
    n.className = "loc-note";
    n.textContent = note;
    block.appendChild(n);
  }

  const breakdown = buildLuckBreakdown(data);
  if (breakdown) {
    block.appendChild(breakdown);
  } else if (isMaxCap(data.cap)) {
    const n = document.createElement("p");
    n.className = "loc-note";
    n.textContent =
      "Cap is MAX - raise your luck level as high as possible to approach this chance.";
    block.appendChild(n);
  }

  if (data.warning) {
    const w = document.createElement("p");
    w.className = "loc-warning";
    w.textContent = "⚠ " + data.warning;
    block.appendChild(w);
  }

  return block;
}

function buildCard(mineral) {
  const entries = Object.entries(PROSPECTING_DATA[mineral]);
  const card = document.createElement("article");
  card.className = "result-card";

  const heading = document.createElement("h3");
  heading.className = "mineral-name";
  heading.textContent = mineral;
  card.appendChild(heading);

  const [bestLoc, bestData] = entries[0];
  const isSpecial = SPECIAL_LOCATIONS.has(bestLoc);
  const hasBackup = entries.length > 1;

  const bestNote =
    isSpecial && hasBackup
      ? "Premium / hard-to-reach zone - a more accessible backup is shown below."
      : isSpecial && !hasBackup
      ? "Premium zone - no alternative location is available for this mineral."
      : "";

  card.appendChild(
    buildLocationBlock("Best location", bestLoc, bestData, "best", bestNote)
  );

  if (isSpecial && hasBackup) {
    const [backupLoc, backupData] = entries[1];
    card.appendChild(
      buildLocationBlock(
        "Backup location · Top 2",
        backupLoc,
        backupData,
        "backup"
      )
    );
  }

  return card;
}

function renderHint(resultsEl, text, variant) {
  const p = document.createElement("p");
  p.className = "hint" + (variant ? " " + variant : "");
  p.textContent = text;
  resultsEl.appendChild(p);
}

function runOptimize(inputs, resultsEl) {
  const resolved = [];
  const seen = new Set();
  let hasInvalid = false;

  inputs.forEach((input) => {
    const value = input.value.trim();
    if (!value) {
      input.classList.remove("invalid");
      return;
    }
    const name = resolveMineral(value);
    if (name) {
      input.classList.remove("invalid");
      if (!seen.has(name)) {
        seen.add(name);
        resolved.push(name);
      }
    } else {
      hasInvalid = true;
      input.classList.add("invalid");
    }
  });

  resultsEl.innerHTML = "";

  if (resolved.length === 0) {
    renderHint(
      resultsEl,
      hasInvalid
        ? "No matching minerals found. Check the spelling and try again."
        : "Enter at least one mineral name above, then press Optimize."
    );
    return;
  }

  if (hasInvalid) {
    renderHint(
      resultsEl,
      "Some entries didn't match a mineral and were skipped.",
      "warn"
    );
  }

  const grid = document.createElement("div");
  grid.className = "results-grid";
  resolved.forEach((name) => grid.appendChild(buildCard(name)));
  resultsEl.appendChild(grid);
}

document.addEventListener("DOMContentLoaded", () => {
  const inputs = Array.from(document.querySelectorAll(".mineral-input"));
  const lists = Array.from(document.querySelectorAll(".suggestions"));
  const optimizeBtn = document.getElementById("optimize-btn");
  const clearBtn = document.getElementById("clear-btn");
  const resultsEl = document.getElementById("results");

  inputs.forEach((input, i) =>
    setupCombo(input, lists[i], i, inputs, optimizeBtn)
  );

  optimizeBtn.addEventListener("click", () => runOptimize(inputs, resultsEl));

  clearBtn.addEventListener("click", () => {
    inputs.forEach((input) => {
      input.value = "";
      input.classList.remove("invalid");
    });
    resultsEl.innerHTML = "";
    renderHint(resultsEl, "Results will appear here.");
    inputs[0].focus();
  });

  renderHint(resultsEl, "Results will appear here.");
});
