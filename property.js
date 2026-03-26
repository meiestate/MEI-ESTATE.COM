const $ = (id) => document.getElementById(id);
const LOCAL_PROPS_KEY = "mei_properties_v1";

let ALL_APPROVED = [];
let CURRENT_PROPERTY = null;

document.addEventListener("DOMContentLoaded", async () => {
  $("yr").textContent = new Date().getFullYear();
  setModeBanner();
  await initPage();
});

function setModeBanner() {
  const el = $("modeBanner");
  if (!el) return;

  if (window.hasSupabaseConfig && window.supabase) {
    el.textContent = "Cloud mode active. Property details load from Supabase.";
    el.className = "banner";
  } else {
    el.textContent = "Local fallback mode active. Property details load from browser-approved data.";
    el.className = "banner warn";
  }
}

function readJSON(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
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
  if (t === "apartment") return "Apartment";
  if (t === "house") return "House";
  if (t === "plot") return "Plot";
  if (t === "commercial") return "Commercial";
  if (t === "villa") return "Villa";
  if (t === "office") return "Office";
  if (t === "warehouse") return "Warehouse";
  if (t === "shop") return "Shop";
  if (t === "pg") return "Pg";
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
    image: String(p.image || p.image_url || p.imageUrl || "").trim(),
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

function getUrlId() {
  return String(new URL(window.location.href).searchParams.get("id") || "").trim();
}

function replaceUrlId(id) {
  if (!id) return;
  const url = new URL(window.location.href);
  url.searchParams.set("id", id);
  window.history.replaceState({}, "", url.toString());
}

async function fetchApprovedProperties() {
  if (window.hasSupabaseConfig && window.supabase) {
    const { data, error } = await window.supabase
      .from("properties")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(normalizeProperty);
  }

  return readJSON(LOCAL_PROPS_KEY, [])
    .map(normalizeProperty)
    .filter(p => p.status === "approved")
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

async function fetchPropertyById(id) {
  if (!id) return null;

  if (window.hasSupabaseConfig && window.supabase) {
    const { data, error } = await window.supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    return data ? normalizeProperty(data) : null;
  }

  const rows = readJSON(LOCAL_PROPS_KEY, []).map(normalizeProperty);
  const match = rows.find(p => String(p.id) === String(id) && p.status === "approved");
  return match || null;
}

function getLatestProperty(items) {
  return [...items].sort((a, b) => {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  })[0] || null;
}

async function initPage() {
  const root = $("propertyRoot");
  root.innerHTML = skeletonHtml();

  try {
    const urlId = getUrlId();

    ALL_APPROVED = await fetchApprovedProperties();

    if (!ALL_APPROVED.length) {
      renderEmpty(
        "No approved property found",
        "Dashboard-ல் approved property add செய்த பிறகு இந்த page வேலை செய்யும்."
      );
      return;
    }

    let selected = null;

    if (urlId) {
      selected = await fetchPropertyById(urlId);
    }

    if (!selected) {
      selected = getLatestProperty(ALL_APPROVED);

      if (!urlId) {
        showInfo("Property ID இல்லாததால் latest approved property load செய்யப்பட்டது.");
      } else {
        showInfo("இந்த property public view-ல் கிடைக்கவில்லை. Latest approved property காட்டப்படுகிறது.");
      }

      if (selected?.id) replaceUrlId(selected.id);
    }

    CURRENT_PROPERTY = selected;
    renderProperty(CURRENT_PROPERTY, ALL_APPROVED);
  } catch (err) {
    console.error(err);
    renderEmpty(
      "Unable to load property",
      String(err.message || "Please check your data source configuration.")
    );
  }
}

function skeletonHtml() {
  return `
    <section class="hero">
      <div class="mediaPane"><div class="noImage">Loading...</div></div>
      <div class="detailPane">
        <div class="badgeRow">
          <span class="badge">Loading</span>
        </div>
        <h2 class="propTitle">Loading property details...</h2>
        <div class="propPrice">Please wait</div>
        <div class="propLocation">Fetching live data</div>
      </div>
    </section>
  `;
}

function renderEmpty(title, text) {
  const root = $("propertyRoot");
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
  if (!item) {
    renderEmpty("Property not found", "This property may be missing or not approved for public view.");
    return;
  }

  const related = approvedList
    .filter(p => p.id !== item.id)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 3);

  root.innerHTML = `
    <section class="hero">
      <div class="mediaPane">
        ${
          item.image
            ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}" onerror="this.parentNode.innerHTML='<div class=&quot;noImage&quot;>No Image</div>';">`
            : `<div class="noImage">No Image</div>`
        }
      </div>

      <div class="detailPane">
        <div class="badgeRow">
          <span class="badge ok">Approved</span>
          ${item.featured ? `<span class="badge featured">Featured</span>` : ""}
          ${item.type ? `<span class="badge soft">${escapeHtml(item.type)}</span>` : ""}
        </div>

        <h2 class="propTitle">${escapeHtml(item.title)}</h2>
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

        <div class="contactCard">
          <h3>Contact Details</h3>
          <div class="contactList">
            ${item.brokerName ? `<div class="contactItem"><b>Broker:</b> <span>${escapeHtml(item.brokerName)}</span></div>` : ""}
            ${item.sellerName ? `<div class="contactItem"><b>Seller:</b> <span>${escapeHtml(item.sellerName)}</span></div>` : ""}
            ${item.mobile ? `<div class="contactItem"><b>Contact:</b> <span>${escapeHtml(item.mobile)}</span></div>` : ""}
            ${!item.brokerName && !item.sellerName && !item.mobile ? `<div class="contactItem"><span>Contact details not added yet.</span></div>` : ""}
          </div>
        </div>

        <div class="actionRow">
          <a class="btn" href="listings.html">← Back to Listings</a>
          <a class="btn primary" href="seller.html">Enquire Now</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="sectionCard">
        <h3 class="sectionTitle">Property Overview</h3>
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

    ${
      related.length ? `
      <section class="section">
        <div class="sectionCard">
          <h3 class="sectionTitle">Related Properties</h3>
          <div class="relatedGrid">
            ${related.map(renderRelatedCard).join("")}
          </div>
        </div>
      </section>` : ""
    }
  `;
}

function buildLocation(item) {
  const parts = [item.area, item.city].filter(Boolean);
  return parts.length ? parts.join(", ") : "Location not specified";
}

function metaItem(label, value) {
  return `
    <div class="metaItem">
      <div class="metaLabel">${escapeHtml(label)}</div>
      <div class="metaValue">${escapeHtml(value)}</div>
    </div>
  `;
}

function renderRelatedCard(item) {
  return `
    <article class="relatedCard">
      <div class="relatedThumb">
        ${
          item.image
            ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}" onerror="this.parentNode.innerHTML='No Image';">`
            : `No Image`
        }
      </div>
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


