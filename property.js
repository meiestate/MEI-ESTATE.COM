(() => {
  "use strict";

  const LOCAL_PROPS_KEY = "mei_properties_v1";
  const DEFAULT_WHATSAPP_NUMBER = "919876543210";
  const FAVORITES_KEY = "mei_favorite_properties_v1";
  const COMPARE_KEY = "mei_compare_properties_v1";
  const VISIT_REQUESTS_KEY = "mei_visit_requests_v1";
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

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function showInfo(msg) {
    const el = $("pageInfo");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(showInfo._t);
    showInfo._t = setTimeout(() => {
      el.style.display = "none";
    }, 2600);
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

  function normalizeGallery(p) {
    const arr = Array.isArray(p.images) ? p.images : [];
    const cleaned = arr.map((v) => String(v || "").trim()).filter(Boolean);
    const image = String(p.image || p.image_url || p.imageUrl || "").trim();
    if (image && !cleaned.includes(image)) cleaned.unshift(image);
    return cleaned;
  }

  function normalizeDocuments(p) {
    const raw = Array.isArray(p.documents) ? p.documents : [];
    if (raw.length) {
      return raw.map((d) => ({
        title: String(d.title || "Document").trim(),
        status: String(d.status || "pending").trim().toLowerCase()
      }));
    }

    return [
      { title: "Title Deed", status: "ok" },
      { title: "EC / Encumbrance", status: "ok" },
      { title: "Tax Receipt", status: "pending" },
      { title: "Approval Copy", status: "ok" }
    ];
  }

  function normalizeAmenities(p) {
    const raw = Array.isArray(p.amenities) ? p.amenities : [];
    if (raw.length) {
      return raw.map((a) => ({
        title: String(a.title || "Amenity").trim(),
        text: String(a.text || "").trim(),
        icon: String(a.icon || "📍").trim()
      }));
    }

    return [
      { title: "School Access", text: "Nearby schools within quick reach.", icon: "🏫" },
      { title: "Hospital", text: "Medical support available in the area.", icon: "🏥" },
      { title: "Transport", text: "Good road and travel connectivity.", icon: "🚌" },
      { title: "Shopping", text: "Daily essentials and stores nearby.", icon: "🛍" }
    ];
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
      images: normalizeGallery(p),
      status: String(p.status || "").trim().toLowerCase(),
      createdAt: p.created_at || p.createdAt || "",
      featured: Boolean(p.featured),
      brokerName: String(p.broker_name || p.brokerName || "").trim(),
      sellerName: String(p.seller_name || p.sellerName || "").trim(),
      facing: String(p.facing || "").trim(),
      furnishing: String(p.furnishing || "").trim(),
      purpose: String(p.purpose || "").trim(),
      mobile: String(p.mobile || p.phone || "").trim(),
      whatsapp: normalizePhone(p.whatsapp || p.mobile || p.phone || ""),
      brochure: String(p.brochure || "").trim(),
      documents: normalizeDocuments(p),
      amenities: normalizeAmenities(p)
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

  function getFavorites() {
    return readJSON(FAVORITES_KEY, []);
  }

  function setFavorites(arr) {
    writeJSON(FAVORITES_KEY, arr);
  }

  function isFavorite(id) {
    return getFavorites().includes(id);
  }

  function toggleFavorite(id) {
    const arr = getFavorites();
    const next = arr.includes(id) ? arr.filter((v) => v !== id) : [...arr, id];
    setFavorites(next);
    return next.includes(id);
  }

  function getCompare() {
    return readJSON(COMPARE_KEY, []);
  }

  function setCompare(arr) {
    writeJSON(COMPARE_KEY, arr);
  }

  function isCompare(id) {
    return getCompare().includes(id);
  }

  function toggleCompare(id) {
    let arr = getCompare();
    if (arr.includes(id)) {
      arr = arr.filter((v) => v !== id);
    } else {
      if (arr.length >= 3) arr.shift();
      arr.push(id);
    }
    setCompare(arr);
    return arr.includes(id);
  }

  function calcEMI(principal, annualRate, months) {
    const p = cleanNumber(principal);
    const r = Number(annualRate) / 12 / 100;
    const n = Number(months);

    if (!p || !n) return { emi: 0, interest: 0, total: 0 };

    if (!r) {
      const total = p;
      const emi = total / n;
      return { emi, interest: 0, total };
    }

    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = emi * n;
    const interest = total - p;
    return { emi, interest, total };
  }

  function saveVisitRequest(payload) {
    const arr = readJSON(VISIT_REQUESTS_KEY, []);
    arr.unshift(payload);
    writeJSON(VISIT_REQUESTS_KEY, arr);
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
            <button class="btn favorite ${isFavorite(item.id) ? "active" : ""}" id="favoriteBtn" type="button">${isFavorite(item.id) ? "❤️ Saved" : "🤍 Save"}</button>
            <button class="btn compare ${isCompare(item.id) ? "active" : ""}" id="compareBtn" type="button">${isCompare(item.id) ? "📊 Added" : "📊 Compare"}</button>
            ${item.brochure ? `<a class="btn ghost" href="${escapeAttr(item.brochure)}" download>📄 Brochure</a>` : `<button class="btn ghost" id="brochureBtn" type="button">📄 Brochure</button>`}
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

      <section class="section">
        <div class="sectionCard">
          <h2 class="sectionTitle">EMI Calculator</h2>
          <div class="emiGrid">
            <div class="emiForm">
              <div class="formRow">
                <label class="formLabel" for="emiPrice">Property Price</label>
                <input class="formInput" id="emiPrice" type="number" value="${cleanNumber(item.price)}" min="0" step="1000" />
              </div>

              <div class="formRow">
                <label class="formLabel" for="emiDownPayment">Down Payment</label>
                <input class="formInput" id="emiDownPayment" type="number" value="${Math.round(cleanNumber(item.price) * 0.2)}" min="0" step="1000" />
              </div>

              <div class="formRow">
                <label class="formLabel" for="emiRate">Interest Rate (%)</label>
                <input class="formInput" id="emiRate" type="number" value="8.5" min="0" step="0.1" />
              </div>

              <div class="formRow">
                <label class="formLabel" for="emiYears">Loan Tenure (Years)</label>
                <select class="formSelect" id="emiYears">
                  <option value="5">5 Years</option>
                  <option value="10">10 Years</option>
                  <option value="15">15 Years</option>
                  <option value="20" selected>20 Years</option>
                  <option value="25">25 Years</option>
                  <option value="30">30 Years</option>
                </select>
              </div>
            </div>

            <div class="emiResult">
              <div>
                <div class="formLabel">Estimated Monthly EMI</div>
                <div class="emiBig" id="emiMonthly">₹0</div>
              </div>

              <div class="emiSmall">
                This is an approximate calculation for planning purposes only.
              </div>

              <div class="emiStat">
                <div class="emiStatLabel">Loan Amount</div>
                <div class="emiStatValue" id="emiLoanAmount">₹0</div>
              </div>

              <div class="emiStat">
                <div class="emiStatLabel">Total Interest</div>
                <div class="emiStatValue" id="emiInterest">₹0</div>
              </div>

              <div class="emiStat">
                <div class="emiStatLabel">Total Payment</div>
                <div class="emiStatValue" id="emiTotal">₹0</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="sectionCard">
          <div class="threeCol">
            <div class="agentCard">
              <h3>Agent Profile</h3>
              <div class="agentTop">
                <div class="agentAvatar">${escapeHtml(getAgentInitial(item))}</div>
                <div>
                  <div class="agentName">${escapeHtml(item.brokerName || item.sellerName || "MEI Advisor")}</div>
                  <div class="agentRole">Property Consultant</div>
                </div>
              </div>

              <div class="agentMeta">
                <div class="agentMetaItem">
                  <div class="agentMetaLabel">Location</div>
                  <div class="agentMetaValue">${escapeHtml(buildLocation(item))}</div>
                </div>
                <div class="agentMetaItem">
                  <div class="agentMetaLabel">Contact</div>
                  <div class="agentMetaValue">${escapeHtml(item.mobile || "Available on enquiry")}</div>
                </div>
                <div class="agentMetaItem">
                  <div class="agentMetaLabel">Speciality</div>
                  <div class="agentMetaValue">${escapeHtml(item.type || "Property Sales")}</div>
                </div>
              </div>
            </div>

            <div class="visitCard">
              <h3>Schedule a Visit</h3>
              <form id="visitForm" class="formGrid">
                <div class="formRow">
                  <label class="formLabel" for="visitName">Full Name</label>
                  <input class="formInput" id="visitName" type="text" placeholder="Enter your name" required />
                </div>

                <div class="formRow">
                  <label class="formLabel" for="visitPhone">Phone Number</label>
                  <input class="formInput" id="visitPhone" type="tel" placeholder="Enter phone number" required />
                </div>

                <div class="formRow">
                  <label class="formLabel" for="visitDate">Preferred Date</label>
                  <input class="formInput" id="visitDate" type="date" required />
                </div>

                <div class="formRow">
                  <label class="formLabel" for="visitNote">Note</label>
                  <textarea class="formTextarea" id="visitNote" placeholder="Any preferred time or note"></textarea>
                </div>

                <button class="btn primary" type="submit">Book Site Visit</button>
              </form>
              <div id="visitSuccess" class="visitSuccess">Visit request saved successfully.</div>
            </div>

            <div class="documentsCard">
              <h3>Property Documents</h3>
              <ul class="documentsList">
                ${item.documents.map(renderDocumentItem).join("")}
              </ul>

              <div class="actionRow" style="margin-top:16px;">
                ${item.brochure ? `<a class="btn ghost" href="${escapeAttr(item.brochure)}" download>📄 Download Brochure</a>` : `<button class="btn ghost" id="brochureBtn2" type="button">📄 Request Brochure</button>`}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="sectionCard">
          <h2 class="sectionTitle">Nearby Amenities</h2>
          <div class="amenityGrid">
            ${item.amenities.map(renderAmenityCard).join("")}
          </div>
        </div>
      </section>

      ${related.length ? `
        <section class="section">
          <div class="sectionCard relatedSectionFix">
            <h2 class="sectionTitle">Related Properties</h2>
            <div class="relatedGrid">
              ${related.map(renderRelatedCard).join("")}
            </div>
          </div>
        </section>
      ` : ""}
    `;

    bindActions(item);
    bindGallery(item);
    bindEMI();
    bindVisitForm(item);
  }

  function getAgentInitial(item) {
    const name = String(item.brokerName || item.sellerName || "M").trim();
    return (name.charAt(0) || "M").toUpperCase();
  }

  function renderHeroMedia(item) {
    if (item.images && item.images.length) {
      return `
        <div class="galleryStage" id="galleryStage">
          ${item.images.map((src, idx) => `
            <div class="gallerySlide ${idx === 0 ? "active" : ""}" data-slide="${idx}">
              <img src="${escapeAttr(src)}" alt="${escapeAttr(item.title)} image ${idx + 1}" onerror="this.parentNode.innerHTML='${escapeForInlineHtml(noImageFallbackHtml(item))}'">
            </div>
          `).join("")}

          ${item.images.length > 1 ? `
            <button class="galleryNav prev" id="galleryPrev" type="button">‹</button>
            <button class="galleryNav next" id="galleryNext" type="button">›</button>
            <div class="galleryThumbs" id="galleryThumbs">
              ${item.images.map((src, idx) => `
                <button class="galleryThumb ${idx === 0 ? "active" : ""}" type="button" data-thumb="${idx}">
                  <img src="${escapeAttr(src)}" alt="thumb ${idx + 1}">
                </button>
              `).join("")}
            </div>
          ` : ""}
        </div>
      `;
    }

    if (item.image) {
      return `
        <div class="galleryStage">
          <div class="gallerySlide active">
            <img
              src="${escapeAttr(item.image)}"
              alt="${escapeAttr(item.title)}"
              onerror="this.parentNode.innerHTML='${escapeForInlineHtml(noImageFallbackHtml(item))}'"
            />
          </div>
        </div>
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

  function renderDocumentItem(doc) {
    const ok = doc.status === "ok";
    return `
      <li class="documentItem">
        <div class="documentLeft">
          <span>📄</span>
          <span>${escapeHtml(doc.title)}</span>
        </div>
        <span class="documentStatus ${ok ? "ok" : "pending"}">${ok ? "Verified" : "Pending"}</span>
      </li>
    `;
  }

  function renderAmenityCard(item) {
    return `
      <div class="amenityCard">
        <div class="amenityIcon">${escapeHtml(item.icon || "📍")}</div>
        <div class="amenityTitle">${escapeHtml(item.title)}</div>
        <div class="amenityText">${escapeHtml(item.text)}</div>
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

  function bindActions(item) {
    const shareBtn = $("sharePropertyBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => shareProperty(item));
    }

    const favoriteBtn = $("favoriteBtn");
    if (favoriteBtn) {
      favoriteBtn.addEventListener("click", () => {
        const active = toggleFavorite(item.id);
        favoriteBtn.classList.toggle("active", active);
        favoriteBtn.textContent = active ? "❤️ Saved" : "🤍 Save";
        showInfo(active ? "Property saved to favorites." : "Property removed from favorites.");
      });
    }

    const compareBtn = $("compareBtn");
    if (compareBtn) {
      compareBtn.addEventListener("click", () => {
        const active = toggleCompare(item.id);
        compareBtn.classList.toggle("active", active);
        compareBtn.textContent = active ? "📊 Added" : "📊 Compare";
        showInfo(active ? "Property added to compare list." : "Property removed from compare list.");
      });
    }

    const brochureBtn = $("brochureBtn");
    if (brochureBtn) {
      brochureBtn.addEventListener("click", () => showInfo("Brochure can be shared during enquiry."));
    }

    const brochureBtn2 = $("brochureBtn2");
    if (brochureBtn2) {
      brochureBtn2.addEventListener("click", () => showInfo("Brochure request noted."));
    }
  }

  function bindGallery(item) {
    if (!item.images || item.images.length <= 1) return;

    const slides = Array.from(document.querySelectorAll("[data-slide]"));
    const thumbs = Array.from(document.querySelectorAll("[data-thumb]"));
    const prev = $("galleryPrev");
    const next = $("galleryNext");
    let index = 0;

    function show(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach((el, idx) => el.classList.toggle("active", idx === index));
      thumbs.forEach((el, idx) => el.classList.toggle("active", idx === index));
    }

    if (prev) prev.addEventListener("click", () => show(index - 1));
    if (next) next.addEventListener("click", () => show(index + 1));
    thumbs.forEach((btn, idx) => btn.addEventListener("click", () => show(idx)));
  }

  function bindEMI() {
    const priceEl = $("emiPrice");
    const downEl = $("emiDownPayment");
    const rateEl = $("emiRate");
    const yearsEl = $("emiYears");

    if (!priceEl || !downEl || !rateEl || !yearsEl) return;

    const monthlyEl = $("emiMonthly");
    const loanAmountEl = $("emiLoanAmount");
    const interestEl = $("emiInterest");
    const totalEl = $("emiTotal");

    function update() {
      const price = cleanNumber(priceEl.value);
      const down = cleanNumber(downEl.value);
      const loanAmount = Math.max(price - down, 0);
      const rate = Number(rateEl.value || 0);
      const months = Number(yearsEl.value || 0) * 12;
      const result = calcEMI(loanAmount, rate, months);

      monthlyEl.textContent = formatINR(Math.round(result.emi));
      loanAmountEl.textContent = formatINR(Math.round(loanAmount));
      interestEl.textContent = formatINR(Math.round(result.interest));
      totalEl.textContent = formatINR(Math.round(result.total));
    }

    [priceEl, downEl, rateEl, yearsEl].forEach((el) => {
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    });

    update();
  }

  function bindVisitForm(item) {
    const form = $("visitForm");
    const success = $("visitSuccess");
    if (!form || !success) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const payload = {
        propertyId: item.id,
        propertyTitle: item.title,
        name: String($("visitName")?.value || "").trim(),
        phone: String($("visitPhone")?.value || "").trim(),
        date: String($("visitDate")?.value || "").trim(),
        note: String($("visitNote")?.value || "").trim(),
        createdAt: new Date().toISOString()
      };

      if (!payload.name || !payload.phone || !payload.date) {
        showInfo("Please fill all required visit details.");
        return;
      }

      saveVisitRequest(payload);
      form.reset();
      success.style.display = "block";
      showInfo("Visit request saved successfully.");

      setTimeout(() => {
        success.style.display = "none";
      }, 2500);
    });
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


