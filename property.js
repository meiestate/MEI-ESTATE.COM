(() => {
  "use strict";

  const LOCAL_PROPS_KEY = "mei_properties_v1";

  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const yr = $("yr");
    if (yr) yr.textContent = new Date().getFullYear();

    bindStaticActions();

    const all = readJSON(LOCAL_PROPS_KEY, []).map(normalizeProperty);
    const approved = all.filter(p => p.status === "approved");

    if (!approved.length) {
      renderEmpty(
        "No approved property found",
        "Dashboard-ல் approved listings add பண்ணிய பிறகு இந்த page வேலை செய்யும்."
      );
      return;
    }

    const url = new URL(window.location.href);
    const id = (url.searchParams.get("id") || "").trim();

    let property = null;

    if (id) {
      property = approved.find(p => String(p.id) === id);
    }

    if (!property) {
      property = getLatestProperty(approved);

      if (!id) {
        replaceUrlWithPropertyId(property.id);
        showInfo("Property ID இல்லாததால் latest approved property load செய்யப்பட்டது.");
      } else {
        showInfo("Requested property கிடைக்கவில்லை. Latest approved property காட்டப்படுகிறது.");
      }
    }

    renderProperty(property, approved);
  }

  function bindStaticActions() {
    const backBtns = document.querySelectorAll("[data-back-listings]");
    backBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "listings.html";
      });
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
    if (!t) return "";
    if (t === "apartment") return "Apartment";
    if (t === "house") return "House";
    if (t === "plot") return "Plot";
    if (t === "commercial") return "Commercial";
    if (t === "villa") return "Villa";
    if (t === "office") return "Office";
    if (t === "warehouse") return "Warehouse";
    if (t === "shop") return "Shop";
    if (t === "pg") return "PG";
    return String(type || "").trim();
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
      image: String(p.image || "").trim(),
      status: String(p.status || "").trim().toLowerCase(),
      createdAt: p.created_at || p.createdAt || "",
      featured: Boolean(p.featured),
      brokerName: String(p.broker_name || p.brokerName || "").trim(),
      sellerName: String(p.seller_name || p.sellerName || "").trim(),
      facing: String(p.facing || "").trim(),
      furnishing: String(p.furnishing || "").trim(),
      purpose: String(p.purpose || "").trim(),
      mobile: String(p.mobile || p.phone || "").trim()
    };
  }

  function getLatestProperty(list) {
    return [...list].sort((a, b) => {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    })[0];
  }

  function replaceUrlWithPropertyId(id) {
    if (!id) return;
    const url = new URL(window.location.href);
    url.searchParams.set("id", id);
    window.history.replaceState({}, "", url.toString());
  }

  function showInfo(msg) {
    const info = $("pageInfo");
    if (!info) return;
    info.textContent = msg;
    info.style.display = "block";
  }

  function renderEmpty(title, text) {
    const root = $("propertyRoot");
    if (!root) return;

    root.innerHTML = `
      <section class="emptyState">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(text)}</p>
        <a class="btn primary" href="listings.html">Go to Listings</a>
      </section>
    `;
  }

  function renderProperty(item, approvedList) {
    const root = $("propertyRoot");
    if (!root) return;

    const related = approvedList
      .filter(p => p.id !== item.id)
      .slice(0, 3);

    root.innerHTML = `
      <section class="propertyHero">
        <div class="propertyMedia">
          ${
            item.image
              ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}" />`
              : `<div class="noImage">No Image</div>`
          }
        </div>

        <div class="propertyCard">
          <div class="badgeRow">
            <span class="badge ok">Approved</span>
            ${item.featured ? `<span class="badge featured">Featured</span>` : ""}
            ${item.type ? `<span class="badge soft">${escapeHtml(item.type)}</span>` : ""}
          </div>

          <h1 class="propertyTitle">${escapeHtml(item.title)}</h1>

          <div class="propertyPrice">${formatINR(item.price)}</div>

          <div class="propertyLocation">
            ${escapeHtml(item.area || "Area")}, ${escapeHtml(item.city || "City")}
          </div>

          <div class="chipGrid">
            ${item.bhk ? `<span class="chip">${escapeHtml(item.bhk)}</span>` : ""}
            ${item.sqft ? `<span class="chip">${item.sqft} sqft</span>` : ""}
            ${item.facing ? `<span class="chip">${escapeHtml(item.facing)} Facing</span>` : ""}
            ${item.furnishing ? `<span class="chip">${escapeHtml(item.furnishing)}</span>` : ""}
            ${item.purpose ? `<span class="chip">${escapeHtml(item.purpose)}</span>` : ""}
          </div>

          <div class="contactBox">
            ${item.brokerName ? `<div><strong>Broker:</strong> ${escapeHtml(item.brokerName)}</div>` : ""}
            ${item.sellerName ? `<div><strong>Seller:</strong> ${escapeHtml(item.sellerName)}</div>` : ""}
            ${item.mobile ? `<div><strong>Contact:</strong> ${escapeHtml(item.mobile)}</div>` : ""}
          </div>

          <div class="actionRow">
            <a class="btn" href="listings.html">← Back to Listings</a>
            <a class="btn primary" href="seller.html">Enquire Now</a>
          </div>
        </div>
      </section>

      <section class="detailSection">
        <div class="sectionCard">
          <h2>Description</h2>
          <p>${escapeHtml(item.description || "No detailed description added yet.")}</p>
        </div>
      </section>

      ${
        related.length
          ? `
          <section class="detailSection">
            <div class="sectionCard">
              <h2>Related Properties</h2>
              <div class="relatedGrid">
                ${related.map(cardHtml).join("")}
              </div>
            </div>
          </section>
        `
          : ""
      }
    `;
  }

  function cardHtml(item) {
    return `
      <article class="relatedCard">
        <div class="relatedBody">
          <div class="relatedTop">
            <div class="relatedTitle">${escapeHtml(item.title)}</div>
            <div class="relatedPrice">${formatINR(item.price)}</div>
          </div>
          <div class="relatedMeta">
            ${escapeHtml(item.area || "Area")}, ${escapeHtml(item.city || "City")}
            ${item.sqft ? ` • ${item.sqft} sqft` : ""}
          </div>
          <a class="btn small primary" href="property.html?id=${encodeURIComponent(item.id)}">View</a>
        </div>
      </article>
    `;
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

