 (() => {
  "use strict";

  const PROPS_KEY = "mei_properties_v1";
  const FAVORITES_KEY = "mei_favorite_properties_v1";
  const COMPARE_KEY = "mei_compare_properties_v1";
  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    $("yr").textContent = new Date().getFullYear();
    bindActions();
    renderFavorites();
  }

  function bindActions() {
    $("clearFavoritesBtn").addEventListener("click", () => {
      localStorage.removeItem(FAVORITES_KEY);
      renderFavorites();
    });
  }

  function readJSON(key, fallback = []) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function cleanNumber(val) {
    if (typeof val === "number") return Number.isFinite(val) ? val : 0;
    const cleaned = String(val || "").replace(/[^\d]/g, "");
    return cleaned ? Number(cleaned) : 0;
  }

  function formatINR(n) {
    const num = cleanNumber(n);
    return num ? "₹" + num.toLocaleString("en-IN") : "Price on request";
  }

  function normalizeType(type) {
    const t = String(type || "").trim().toLowerCase();
    const map = {
      apartment: "Apartment",
      house: "House",
      plot: "Plot",
      commercial: "Commercial",
      villa: "Villa",
      office: "Office",
      warehouse: "Warehouse",
      shop: "Shop",
      pg: "PG"
    };
    return map[t] || String(type || "").trim();
  }

  function normalizeProperty(p) {
    return {
      id: String(p.id || "").trim(),
      title: String(p.title || p.name || "Untitled Listing").trim(),
      city: String(p.city || "").trim(),
      area: String(p.area || p.locality || "").trim(),
      type: normalizeType(p.type),
      bhk: String(p.bhk || "").trim(),
      price: cleanNumber(p.price),
      sqft: cleanNumber(p.sqft || p.areaSqft || p.area_size),
      description: String(p.description || p.desc || p.note || "").trim(),
      image: String(p.image || p.image_url || p.imageUrl || "").trim(),
      featured: Boolean(p.featured)
    };
  }

  function getCompare() {
    return readJSON(COMPARE_KEY, []);
  }

  function toggleCompare(id) {
    let arr = getCompare();
    if (arr.includes(id)) {
      arr = arr.filter((x) => x !== id);
    } else {
      if (arr.length >= 3) arr.shift();
      arr.push(id);
    }
    writeJSON(COMPARE_KEY, arr);
    return arr.includes(id);
  }

  function removeFavorite(id) {
    const ids = readJSON(FAVORITES_KEY, []).filter((x) => x !== id);
    writeJSON(FAVORITES_KEY, ids);
    renderFavorites();
  }

  function renderFavorites() {
    const root = $("favoritesRoot");
    const all = readJSON(PROPS_KEY, []).map(normalizeProperty);
    const favoriteIds = readJSON(FAVORITES_KEY, []);
    const items = favoriteIds
      .map((id) => all.find((p) => p.id === id))
      .filter(Boolean);

    if (!items.length) {
      root.innerHTML = `
        <section class="emptyState">
          <h2>No favorite properties yet</h2>
          <p>Property page-ல் Save button use பண்ணி shortlist உருவாக்கலாம்.</p>
          <a class="btn primary" href="listings.html">Go to Listings</a>
        </section>
      `;
      return;
    }

    root.innerHTML = `
      <section class="grid">
        ${items.map(renderCard).join("")}
      </section>
    `;

    items.forEach((item) => {
      const removeBtn = document.getElementById("removeFav_" + item.id);
      const compareBtn = document.getElementById("compareFav_" + item.id);

      if (removeBtn) {
        removeBtn.addEventListener("click", () => removeFavorite(item.id));
      }

      if (compareBtn) {
        compareBtn.addEventListener("click", () => {
          const added = toggleCompare(item.id);
          compareBtn.textContent = added ? "Added to Compare" : "Add to Compare";
        });
      }
    });
  }

  function renderCard(item) {
    return `
      <article class="favCard">
        <div class="favImg">
          ${
            item.image
              ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}" onerror="this.parentNode.innerHTML='No Image';">`
              : `No Image`
          }
        </div>

        <div class="favBody">
          <div class="favTop">
            <div class="favTitle">${escapeHtml(item.title)}</div>
          </div>

          <div class="favPrice">${escapeHtml(formatINR(item.price))}</div>
          <div class="favMeta">${escapeHtml(buildLocation(item))}</div>

          <div class="chips">
            <span class="chip badge ok">Approved</span>
            ${item.featured ? `<span class="chip badge featured">Featured</span>` : ""}
            ${item.type ? `<span class="chip">${escapeHtml(item.type)}</span>` : ""}
            ${item.sqft ? `<span class="chip">${escapeHtml(item.sqft + " sqft")}</span>` : ""}
          </div>

          <div class="favActions">
            <a class="btn small primary" href="property.html?id=${encodeURIComponent(item.id)}">View</a>
            <button class="btn small ghost" id="compareFav_${escapeAttr(item.id)}" type="button">Add to Compare</button>
            <button class="btn small warn" id="removeFav_${escapeAttr(item.id)}" type="button">Remove</button>
          </div>
        </div>
      </article>
    `;
  }

  function buildLocation(item) {
    return [item.area, item.city].filter(Boolean).join(", ") || "Location not specified";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();

