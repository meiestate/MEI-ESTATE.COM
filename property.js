(() => {
  "use strict";

  const LOCAL_PROPS_KEY = "mei_properties_v1";
  const DEFAULT_WHATSAPP_NUMBER = "919876543210";
  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const yr = $("yr");
    if (yr) yr.textContent = new Date().getFullYear();

    setModeBanner();

    const all = readJSON(LOCAL_PROPS_KEY, []).map(normalizeProperty);
    const approved = all
      .filter((item) => item.status === "approved")
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (!approved.length) {
      renderEmpty(
        "No approved property found",
        "Dashboard-ல் approved property save செய்த பிறகு இந்த page வேலை செய்யும்."
      );
      return;
    }

    const url = new URL(window.location.href);
    const id = String(url.searchParams.get("id") || "").trim();

    let selected = null;

    if (id) {
      selected = approved.find((item) => String(item.id) === id) || null;
    }

    if (!selected) {
      selected = approved[0] || null;

      if (!id) {
        showInfo("Property ID இல்லாததால் latest approved property load செய்யப்பட்டது.");
      } else {
        showInfo("இந்த property கிடைக்கவில்லை. Latest approved property காட்டப்படுகிறது.");
      }

      if (selected && selected.id) replaceUrlId(selected.id);
    }

    renderProperty(selected, approved);
    bindStickyBar(selected);
  }

  function setModeBanner() {
    const el = $("modeBanner");
    if (!el) return;
    el.textContent = "Local fallback mode active. Property details load from browser-approved data.";
    el.className = "banner warn";
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

  function showInfo(msg) {
    const el = $("pageInfo");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
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

  function normalizePhone(phone) {
    const digits = String(phone || "").replace(/[^\d]/g, "");
    if (!digits) return "";
    if (digits.length === 10) return "91" + digits;
    return digits;
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
      status: String(p.status || "").trim().toLowerCase(),
      createdAt: p.created_at || p.createdAt || "",
      featured: Boolean(p.featured),
      brokerName: String(p.broker_name || p.brokerName || "").trim(),
      sellerName: String(p.seller_name || p.sellerName || "").trim(),
      facing: String(p.facing || "").trim(),
      furnishing: String(p.furnishing || "").trim(),
      purpose: String(p.purpose || "").trim(),
      mobile: String(p.mobile || p.phone || "").trim(),
      whatsapp: normalizePhone(p.whatsapp || p.mobile || p.phone || "")
    };
  }

  function replaceUrlId(id) {
    if (!id) return;
    const url = new URL(window.location.href);
    url.searchParams.set("id", id);
    window.history.replaceState({}, "", url.toString());
  }

  function buildLocation(item) {
    return [item.area, item.city].filter(Boolean).join(", ") || "Location not specified";
  }

  function buildMapsUrl(item) {
    const query = [item.area, item.city].filter(Boolean).join(", ");
    if (!query) return "#";
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
  }

  function buildWhatsAppUrl(item) {
    const number = item.whatsapp || DEFAULT_WHATSAPP_NUMBER;
    const msg = [
      "Hi, I’m interested in this property.",
      "Title: " + (item.title || "-"),
      "Property ID: " + (item.id || "-"),
      "Location: " + buildLocation(item),
      "Price: " + formatINR(item.price),
      "Link: " + window.location.href
    ].join("\n");
    return "https://wa.me/" + encodeURIComponent(number) + "?text=" + encodeURIComponent(msg);
  }

  function copyCurrentLink() {
    const text = window.location.href;
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  function shareProperty(item) {
    const data = {
      title: item.title || "MEI Estate Property",
      text: "Check this property on MEI Estate",
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(data).catch(() => {});
      return;
    }

    copyCurrentLink()
      .then(() => showInfo("Property link copied successfully."))
      .catch(() => showInfo("Unable to copy link. Please copy it manually."));
  }

  function metaItem(label, value) {
    return `
      <div class="metaItem">
        <div class="metaLabel">${escapeHtml(label)}</div>
        <div class="metaValue">${escapeHtml(value)}</div>
      </div>
    `;
  }

  function highlightItem(label, value) {
    return `
      <div class="highlightCard">
        <div class="highlightLabel">${escapeHtml(label)}</div>
        <div class="highlightValue">${escapeHtml(value)}</div>
      </div>
    `;
  }

  function renderEmpty(title, text) {
    const root = $("propertyRoot");
    if (!root) return;

    root.innerHTML = `
      <section class="emptyState">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(text)}</p>
        <a class="btn primary" href="listings.html">Go to Listings</a>
      </section>
    `;
  }

  function renderProperty(item, approvedList) {
    const root = $("propertyRoot");
    if (!root) return;

    if (!item) {
      renderEmpty("Property not found", "This property may be missing or not approved.");
      return;
    }

    const related = approvedList
      .filter((p) => p.id !== item.id)
      .sort((a, b) => Number(b.featured) - Number(a.featured) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 3);

    root.innerHTML = `
      <section class="hero">
        <div class="mediaPane">
          ${renderHeroMedia(item)}
          <div class="imageOverlay">
            ${item.type ? `<div class="overlayChip">🏷 ${escapeHtml(item.type)}</div>` : ""}
            ${item.sqft ? `<div class="overlayChip">📐 ${item.sqft} sqft</div>` : ""}
          </div>
        </div>

        <div class="detailPane">
          <div class="badgeRow">
            <span class="badge ok">Approved</span>
            ${item.featured ? `<span class="badge featured">Featured</span>` : ""}
            ${item.type ? `<span class="badge soft">${escapeHtml(item.type)}</span>` : ""}
          </div>

          <h1 class="propTitle">${escapeHtml(item.title)}</h1>
          <div class="propPrice">${formatINR(item.price)}</div>
          <div class="propLocation">${escapeHtml(buildLocation(item))}</div>

          <div class="chipGrid">
            ${item.bhk ? `<span class="chip">${escapeHtml(item.bhk)}</span>` : ""}
            ${item.sqft ? `<span class="chip">${item.sqft} sqft</span>` : ""}
            ${item.facing ? `<span class="chip">${escapeHtml(item.facing)} Facing</span>` : ""}
            ${item.furnishing ? `<span class="chip">${escapeHtml(item.furnishing)}</span>` : ""}
            ${item.purpose ? `<span class="chip">${escapeHtml(item.purpose)}</span>` : ""}
          </div>

          <p class="desc">${escapeHtml(item.description || "No detailed description added yet.")}</p>

          <div class="actionRow desktopOnly">
            <a class="btn ghost" href="listings.html">← Back to Listings</a>
            <a class="btn primary" href="seller.html">Enquire Now</a>
            <a class="btn whatsapp" href="${escapeAttr(buildWhatsAppUrl(item))}" target="_blank" rel="noopener">🟢 WhatsApp</a>
            <button class="btn share" id="sharePropertyBtn" type="button">🔗 Share / Copy Link</button>
          </div>
        </div>
      </section>

      <section class="highlightsSection">
        <div class="highlightsGrid">
          ${highlightItem("Property Type", item.type || "Not specified")}
          ${highlightItem("Area", item.sqft ? item.sqft + " sqft" : "Not specified")}
          ${highlightItem("Location", buildLocation(item))}
          ${highlightItem("Seller / Broker", item.sellerName || item.brokerName || "Not available")}
        </div>
      </section>

      <section class="section">
        <div class="sectionCard">
          <h2 class="sectionTitle">Property Overview</h2>
          <div class="metaGrid">
            ${metaItem("Property ID", item.id || "Not available")}
            ${metaItem("Type", item.type || "Not specified")}
            ${metaItem("Price", formatINR(item.price))}
            ${metaItem("Area", item.sqft ? item.sqft + " sqft" : "Not specified")}
            ${metaItem("BHK", item.bhk || "Not specified")}
            ${metaItem("Purpose", item.purpose || "Not specified")}
            ${metaItem("Facing", item.facing || "Not specified")}
            ${metaItem("Furnishing", item.furnishing || "Not specified")}
            ${metaItem("City", item.city || "Not specified")}
            ${metaItem("Locality", item.area || "Not specified")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="sectionCard">
          <div class="twoCol">
            <div class="contactCard">
              <h3>Contact Details</h3>
              <div class="contactList">
                ${item.brokerName ? `<div class="contactItem"><b>Broker:</b> <span>${escapeHtml(item.brokerName)}</span></div>` : ""}
                ${item.sellerName ? `<div class="contactItem"><b>Seller:</b> <span>${escapeHtml(item.sellerName)}</span></div>` : ""}
                ${item.mobile ? `<div class="contactItem"><b>Contact:</b> <span>${escapeHtml(item.mobile)}</span></div>` : ""}
                ${!item.brokerName && !item.sellerName && !item.mobile ? `<div class="contactItem"><span>Contact details not added yet.</span></div>` : ""}
              </div>

              <div class="actionRow" style="margin-top:16px;">
                <a class="btn primary" href="seller.html">Enquire Now</a>
                <a class="btn whatsapp" href="${escapeAttr(buildWhatsAppUrl(item))}" target="_blank" rel="noopener">🟢 WhatsApp</a>
              </div>
            </div>

            <div class="mapCard">
              <div class="mapTop">
                <div class="mapTitle">Location & Map</div>
                <a class="btn small ghost" href="${escapeAttr(buildMapsUrl(item))}" target="_blank" rel="noopener">📍 Open in Maps</a>
              </div>

              <div class="mapBox">
                <div class="mapBoxInner">
                  <div class="mapIcon">🗺</div>
                  <div><strong>${escapeHtml(buildLocation(item))}</strong></div>
                  <div class="mapText">
                    Exact pin location can be shared during enquiry.<br>
                    Use the button above to open the area in Google Maps.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      ${related.length ? `
        <section class="section">
          <div class="sectionCard">
            <h2 class="sectionTitle">Related Properties</h2>
            <div class="relatedGrid">
              ${related.map(renderRelatedCard).join("")}
            </div>
          </div>
        </section>
      ` : ""}
    `;

    const shareBtn = $("sharePropertyBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => shareProperty(item));
    }
  }

  function renderHeroMedia(item) {
    if (item.image) {
      return `
        <img
          src="${escapeAttr(item.image)}"
          alt="${escapeAttr(item.title)}"
          onerror="this.parentNode.innerHTML='${escapeForInlineHtml(noImageFallbackHtml(item))}'"
        />
      `;
    }
    return noImageFallbackHtml(item);
  }

  function noImageFallbackHtml(item) {
    return `
      <div class="noImage">
        <div class="noImageCard">
          <div class="noImageIcon">🏠</div>
          <div class="noImageTitle">${escapeHtml(item.type || "Property")} Preview</div>
          <div class="noImageText">
            Image not available right now.<br>
            ${escapeHtml(buildLocation(item))}
          </div>
        </div>
      </div>
    `;
  }

  function renderRelatedCard(item) {
    const thumb = item.image
      ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}" onerror="this.parentNode.innerHTML='No Image';">`
      : `No Image`;

    return `
      <article class="relatedCard">
        <div class="relatedThumb">${thumb}</div>
        <div class="relatedBody">
          <div class="relatedTitle">${escapeHtml(item.title)}</div>
          <div class="relatedPrice">${formatINR(item.price)}</div>
          <div class="relatedMeta">
            ${escapeHtml(buildLocation(item))}
            ${item.sqft ? ` • ${item.sqft} sqft` : ""}
          </div>
          <a class="btn small primary" href="property.html?id=${encodeURIComponent(item.id)}">View Property</a>
        </div>
      </article>
    `;
  }

  function bindStickyBar(item) {
    const bar = $("mobileStickyBar");
    if (!bar || !item) return;

    bar.innerHTML = `
      <div class="mobileStickyInner">
        <a class="btn ghost mobileBtn" href="listings.html">⬅ Back</a>
        <a class="btn whatsapp mobileBtn" href="${escapeAttr(buildWhatsAppUrl(item))}" target="_blank" rel="noopener">WhatsApp</a>
        <a class="btn primary mobileBtn" href="seller.html">Enquire</a>
      </div>
    `;
    bar.style.display = "block";
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

  function escapeForInlineHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/'/g, "\\'")
      .replace(/"/g, "&quot;")
      .replace(/\n/g, "")
      .replace(/\r/g, "");
  }
})();


