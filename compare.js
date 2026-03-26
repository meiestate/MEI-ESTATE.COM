(() => {
  "use strict";

  const PROPS_KEY = "mei_properties_v1";
  const COMPARE_KEY = "mei_compare_properties_v1";
  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    $("yr").textContent = new Date().getFullYear();
    bindActions();
    renderCompare();
  }

  function bindActions() {
    $("clearCompareBtn").addEventListener("click", () => {
      localStorage.removeItem(COMPARE_KEY);
      renderCompare();
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
      featured: Boolean(p.featured),
      purpose: String(p.purpose || "").trim(),
      facing: String(p.facing || "").trim(),
      furnishing: String(p.furnishing || "").trim(),
      brokerName: String(p.broker_name || p.brokerName || "").trim(),
      sellerName: String(p.seller_name || p.sellerName || "").trim(),
      mobile: String(p.mobile || p.phone || "").trim()
    };
  }

  function removeFromCompare(id) {
    const ids = readJSON(COMPARE_KEY, []).filter((x) => x !== id);
    writeJSON(COMPARE_KEY, ids);
    renderCompare();
  }

  function renderCompare() {
    const root = $("compareRoot");
    const all = readJSON(PROPS_KEY, []).map(normalizeProperty);
    const compareIds = readJSON(COMPARE_KEY, []);
    const items = compareIds
      .map((id) => all.find((p) => p.id === id))
      .filter(Boolean);

    if (!items.length) {
      root.innerHTML = `
        <section class="emptyState">
          <h2>No properties in compare list</h2>
          <p>Property page-ல் Compare button use பண்ணி properties add பண்ணுங்க.</p>
          <a class="btn primary" href="listings.html">Go to Listings</a>
        </section>
      `;
      return;
    }

    root.innerHTML = `
      <section class="compareWrap">
        <table class="compareTable">
          <thead>
            <tr>
              <th class="labelCell">Compare Fields</th>
              ${items.map(renderHeadCell).join("")}
            </tr>
          </thead>
          <tbody>
            ${row("Title", items.map((x) => escapeHtml(x.title)))}
            ${row("Price", items.map((x) => escapeHtml(formatINR(x.price))))}
            ${row("Type", items.map((x) => escapeHtml(x.type || "Not specified")))}
            ${row("Location", items.map((x) => escapeHtml(buildLocation(x))))}
            ${row("Area", items.map((x) => escapeHtml(x.sqft ? x.sqft + " sqft" : "Not specified")))}
            ${row("BHK", items.map((x) => escapeHtml(x.bhk || "Not specified")))}
            ${row("Purpose", items.map((x) => escapeHtml(x.purpose || "Not specified")))}
            ${row("Facing", items.map((x) => escapeHtml(x.facing || "Not specified")))}
            ${row("Furnishing", items.map((x) => escapeHtml(x.furnishing || "Not specified")))}
            ${row("Seller / Broker", items.map((x) => escapeHtml(x.sellerName || x.brokerName || "Not available")))}
            ${row("Contact", items.map((x) => escapeHtml(x.mobile || "Available on enquiry")))}
            ${row("Description", items.map((x) => escapeHtml(x.description || "No description")))}
          </tbody>
        </table>
      </section>
    `;

    items.forEach((item) => {
      const btn = document.getElementById("removeCompare_" + item.id);
      if (btn) {
        btn.addEventListener("click", () => removeFromCompare(item.id));
      }
    });
  }

  function renderHeadCell(item) {
    return `
      <th class="valueCell">
        <div class="compareHead">
          <div class="compareImg">
            ${
              item.image
                ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}" onerror="this.parentNode.innerHTML='No Image';">`
                : `No Image`
            }
          </div>

          <div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
              <span class="badge ok">Approved</span>
              ${item.featured ? `<span class="badge featured">Featured</span>` : ""}
            </div>
            <div class="compareTitle">${escapeHtml(item.title)}</div>
            <div class="comparePrice">${escapeHtml(formatINR(item.price))}</div>
            <div class="compareMeta">${escapeHtml(buildLocation(item))}</div>
          </div>

          <div class="compareActions">
            <a class="btn small primary" href="property.html?id=${encodeURIComponent(item.id)}">View</a>
            <button class="btn small ghost" id="removeCompare_${escapeAttr(item.id)}" type="button">Remove</button>
          </div>
        </div>
      </th>
    `;
  }

  function row(label, values) {
    return `
      <tr>
        <td class="labelCell">${escapeHtml(label)}</td>
        ${values.map((v) => `<td class="valueCell">${v}</td>`).join("")}
      </tr>
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

