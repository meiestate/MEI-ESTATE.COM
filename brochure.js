 (() => {
  "use strict";

  const PROPS_KEY = "mei_properties_v1";
  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindActions();

    const all = readJSON(PROPS_KEY, []).map(normalizeProperty);
    const approved = all
      .filter((item) => item.status === "approved")
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (!approved.length) {
      renderEmpty(
        "No approved property found",
        "Dashboard-ல் approved property save செய்த பிறகு brochure page வேலை செய்யும்."
      );
      return;
    }

    const url = new URL(window.location.href);
    const id = String(url.searchParams.get("id") || "").trim();

    let selected = null;
    if (id) {
      selected = approved.find((item) => item.id === id) || null;
    }

    if (!selected) {
      selected = approved[0] || null;
      if (selected && selected.id) {
        url.searchParams.set("id", selected.id);
        window.history.replaceState({}, "", url.toString());
      }
    }

    renderBrochure(selected);
  }

  function bindActions() {
    const printBtn = $("printBtn");
    if (printBtn) {
      printBtn.addEventListener("click", () => window.print());
    }
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
      { title: "Hospital", text: "Medical support nearby.", icon: "🏥" },
      { title: "Transport", text: "Good travel connectivity.", icon: "🚌" },
      { title: "Shopping", text: "Daily essentials nearby.", icon: "🛍" }
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
      status: String(p.status || "").trim().toLowerCase(),
      createdAt: p.created_at || p.createdAt || "",
      featured: Boolean(p.featured),
      brokerName: String(p.broker_name || p.brokerName || "").trim(),
      sellerName: String(p.seller_name || p.sellerName || "").trim(),
      facing: String(p.facing || "").trim(),
      furnishing: String(p.furnishing || "").trim(),
      purpose: String(p.purpose || "").trim(),
      mobile: String(p.mobile || p.phone || "").trim(),
      brochure: String(p.brochure || "").trim(),
      documents: normalizeDocuments(p),
      amenities: normalizeAmenities(p)
    };
  }

  function buildLocation(item) {
    return [item.area, item.city].filter(Boolean).join(", ") || "Location not specified";
  }

  function getAgentName(item) {
    return item.brokerName || item.sellerName || "MEI Advisor";
  }

  function getAgentInitial(item) {
    const name = getAgentName(item);
    return (name.charAt(0) || "M").toUpperCase();
  }

  function renderBrochure(item) {
    const root = $("brochureRoot");
    if (!item) {
      renderEmpty("Property not found", "This brochure could not be generated.");
      return;
    }

    const openBtn = $("openPropertyBtn");
    if (openBtn) {
      openBtn.href = `property.html?id=${encodeURIComponent(item.id)}`;
    }

    root.innerHTML = `
      <article class="sheet">
        <header class="sheetHeader">
          <div class="headerTop">
            <div class="companyBlock">
              <div class="companyLogo">MEI</div>
              <div>
                <div class="companyName">MEI Estate</div>
                <div class="companyTag">Verified Property Brochure • Trusted Listing Presentation</div>
              </div>
            </div>

            <div class="headerMeta">
              <span class="metaPill">Property ID: ${escapeHtml(item.id || "-")}</span>
              <span class="metaPill">Generated Brochure</span>
              ${item.featured ? `<span class="metaPill">Featured Listing</span>` : ""}
            </div>
          </div>
        </header>

        <section class="sheetBody">
          <section class="hero">
            <div class="heroMedia">
              ${
                item.image
                  ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}" onerror="this.parentNode.innerHTML='${escapeForInlineHtml(mediaFallback(item))}'">`
                  : mediaFallback(item)
              }
            </div>

            <div class="heroInfo">
              <div class="badges">
                <span class="badge ok">Approved</span>
                ${item.featured ? `<span class="badge featured">Featured</span>` : ""}
                ${item.type ? `<span class="badge">${escapeHtml(item.type)}</span>` : ""}
              </div>

              <h1 class="title">${escapeHtml(item.title)}</h1>
              <div class="price">${escapeHtml(formatINR(item.price))}</div>
              <div class="location">${escapeHtml(buildLocation(item))}</div>

              <div class="chipGrid">
                ${item.sqft ? `<span class="chip">${item.sqft} sqft</span>` : ""}
                ${item.bhk ? `<span class="chip">${escapeHtml(item.bhk)}</span>` : ""}
                ${item.facing ? `<span class="chip">${escapeHtml(item.facing)} Facing</span>` : ""}
                ${item.furnishing ? `<span class="chip">${escapeHtml(item.furnishing)}</span>` : ""}
                ${item.purpose ? `<span class="chip">${escapeHtml(item.purpose)}</span>` : ""}
              </div>

              <section class="infoCard">
                <div class="infoCardBody">
                  <p class="desc">${escapeHtml(item.description || "No detailed description added yet.")}</p>
                </div>
              </section>
            </div>
          </section>

          <section class="section">
            <div class="sectionCard">
              <h2 class="sectionTitle">Property Highlights</h2>
              <div class="sectionBody">
                <div class="grid4">
                  ${infoBox("Type", item.type || "Not specified")}
                  ${infoBox("Area", item.sqft ? item.sqft + " sqft" : "Not specified")}
                  ${infoBox("Location", buildLocation(item))}
                  ${infoBox("Purpose", item.purpose || "Not specified")}
                </div>
              </div>
            </div>
          </section>

          <section class="section">
            <div class="sectionCard">
              <h2 class="sectionTitle">Property Overview</h2>
              <div class="sectionBody">
                <div class="grid2">
                  ${infoBox("Property ID", item.id || "-")}
                  ${infoBox("Price", formatINR(item.price))}
                  ${infoBox("BHK", item.bhk || "Not specified")}
                  ${infoBox("Facing", item.facing || "Not specified")}
                  ${infoBox("Furnishing", item.furnishing || "Not specified")}
                  ${infoBox("City / Locality", buildLocation(item))}
                </div>
              </div>
            </div>
          </section>

          <section class="section">
            <div class="grid2">
              <div class="sectionCard">
                <h2 class="sectionTitle">Agent / Contact</h2>
                <div class="sectionBody">
                  <div class="agentCard">
                    <div class="agentAvatar">${escapeHtml(getAgentInitial(item))}</div>
                    <div>
                      <div class="agentName">${escapeHtml(getAgentName(item))}</div>
                      <div class="agentRole">Property Consultant</div>
                    </div>
                  </div>

                  <div class="agentMeta">
                    ${infoBox("Contact Number", item.mobile || "Available on enquiry")}
                    ${infoBox("Property Type", item.type || "Not specified")}
                    ${infoBox("Area Expertise", buildLocation(item))}
                  </div>
                </div>
              </div>

              <div class="sectionCard">
                <h2 class="sectionTitle">Documents Checklist</h2>
                <div class="sectionBody">
                  <ul class="documentList">
                    ${item.documents.map(renderDocument).join("")}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section class="section">
            <div class="sectionCard">
              <h2 class="sectionTitle">Nearby Amenities</h2>
              <div class="sectionBody">
                <div class="grid4">
                  ${item.amenities.map(renderAmenity).join("")}
                </div>
              </div>
            </div>
          </section>

          <section class="section">
            <div class="grid2">
              <div class="sectionCard">
                <h2 class="sectionTitle">Location Note</h2>
                <div class="sectionBody">
                  ${infoBox("Area", buildLocation(item))}
                  <div style="height:14px;"></div>
                  <p class="desc">
                    Exact site pin and full navigation details can be shared during enquiry or scheduled visit.
                  </p>
                </div>
              </div>

              <div class="sectionCard">
                <h2 class="sectionTitle">Scan / Open Listing</h2>
                <div class="sectionBody">
                  <div class="qrBlock">
                    <div class="qrFake"></div>
                    <div class="qrText">
                      Use this brochure together with the online listing for latest updates.<br>
                      Property Page URL: <span class="footerStrong">property.html?id=${escapeHtml(item.id)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div class="footerNote">
            <div>
              <span class="footerStrong">MEI Estate</span> • Printable listing brochure for client presentation and property discussion.
            </div>
            <div>
              <span class="footerStrong">Contact:</span> ${escapeHtml(item.mobile || "Available on enquiry")}
            </div>
          </div>
        </section>
      </article>
    `;
  }

  function mediaFallback(item) {
    return `
      <div class="mediaFallback">
        <div class="mediaFallbackCard">
          <div class="mediaFallbackIcon">🏠</div>
          <div style="font-size:1.15rem;font-weight:1000;margin-bottom:8px;">${escapeHtml(item.type || "Property")} Brochure Preview</div>
          <div style="color:#5b6472;line-height:1.65;">Image not available right now.<br>${escapeHtml(buildLocation(item))}</div>
        </div>
      </div>
    `;
  }

  function infoBox(label, value) {
    return `
      <div class="infoBox">
        <div class="infoLabel">${escapeHtml(label)}</div>
        <div class="infoValue">${escapeHtml(value)}</div>
      </div>
    `;
  }

  function renderDocument(doc) {
    const ok = doc.status === "ok";
    return `
      <li class="documentItem">
        <div class="docLeft">
          <span>📄</span>
          <span>${escapeHtml(doc.title)}</span>
        </div>
        <span class="docStatus ${ok ? "ok" : "pending"}">${ok ? "Verified" : "Pending"}</span>
      </li>
    `;
  }

  function renderAmenity(item) {
    return `
      <div class="amenityCard">
        <div class="amenityIcon">${escapeHtml(item.icon || "📍")}</div>
        <div class="amenityTitle">${escapeHtml(item.title)}</div>
        <div class="amenityText">${escapeHtml(item.text)}</div>
      </div>
    `;
  }

  function renderEmpty(title, text) {
    $("brochureRoot").innerHTML = `
      <section class="emptyState">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(text)}</p>
        <a class="btn primary" href="listings.html">Go to Listings</a>
      </section>
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

  function escapeForInlineHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/'/g, "\\'")
      .replace(/"/g, "&quot;")
      .replace(/\n/g, "")
      .replace(/\r/g, "");
  }
})();

