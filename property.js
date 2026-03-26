const $ = (id) => document.getElementById(id);
const LOCAL_PROPS_KEY = "mei_properties_v1";

document.addEventListener("DOMContentLoaded", async () => {
  const yr = $("yr");
  if (yr) yr.textContent = new Date().getFullYear();
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

function normalizeProperty(p) {
  return {
    id: String(p.id || "").trim(),
    title: String(p.title || p.name || "Untitled Listing").trim(),
    city: String(p.city || "").trim(),
    area: String(p.area || p.locality || "").trim(),
    type: String(p.type || "").trim(),
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
  return rows.find(p => String(p.id) === String(id) && p.status === "approved") || null;
}

function getLatestProperty(items) {
  return [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0] || null;
}

async function initPage() {
  const root = $("propertyRoot");
  root.innerHTML = `
    <section class="hero">
      <div class="mediaPane"><div class="noImage">Loading...</div></div>
      <div class="detailPane">
        <div class="badgeRow"><span class="badge">Loading</span></div>
        <h2 class="propTitle">Loading property details...</h2>
        <div class="propPrice">Please wait</div>
        <div class="propLocation">Fetching live data</div>
      </div>
    </section>
  `;

  try {
    const urlId = getUrlId();
    const allApproved = await fetchApprovedProperties();

    if (!allApproved.length) {
      renderEmpty("No approved property found", "Approved property data இல்லை.");
      return;
    }

    let selected = null;

    if (urlId) {
      selected = await fetchPropertyById(urlId);
    }

    if (!selected) {
      selected = getLatestProperty(allApproved);

      if (!urlId) {
        showInfo("Property ID இல்லாததால் latest approved property load செய்யப்பட்டது.");
      } else {
        showInfo("இந்த property கிடைக்கவில்லை. Latest approved property காட்டப்படுகிறது.");
      }

      if (selected && selected.id) replaceUrlId(selected.id);
    }

    renderProperty(selected);
  } catch (err) {
    console.error(err);
    renderEmpty("Unable to load property", err.message || "Unknown error");
  }
}

function renderEmpty(title, text) {
  $("propertyRoot").innerHTML = `
    <section class="emptyState">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(text)}</p>
      <a class="btn primary" href="listings.html">Go to Listings</a>
    </section>
  `;
}

function renderProperty(item) {
  if (!item) {
    renderEmpty("Property not found", "This property may be missing or not approved.");
    return;
  }

  $("propertyRoot").innerHTML = `
    <section class="hero">
      <div class="mediaPane">
        ${
          item.image
            ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}">`
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
        <div class="propLocation">${escapeHtml([item.area, item.city].filter(Boolean).join(", ") || "Location not specified")}</div>

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
            ${item.brokerName ? `<div><b>Broker:</b> ${escapeHtml(item.brokerName)}</div>` : ""}
            ${item.sellerName ? `<div><b>Seller:</b> ${escapeHtml(item.sellerName)}</div>` : ""}
            ${item.mobile ? `<div><b>Contact:</b> ${escapeHtml(item.mobile)}</div>` : ""}
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
          <div class="metaItem"><div class="metaLabel">Property ID</div><div class="metaValue">${escapeHtml(item.id || "Not available")}</div></div>
          <div class="metaItem"><div class="metaLabel">Type</div><div class="metaValue">${escapeHtml(item.type || "Not specified")}</div></div>
          <div class="metaItem"><div class="metaLabel">Price</div><div class="metaValue">${escapeHtml(formatINR(item.price))}</div></div>
          <div class="metaItem"><div class="metaLabel">Area</div><div class="metaValue">${escapeHtml(item.sqft ? item.sqft + " sqft" : "Not specified")}</div></div>
          <div class="metaItem"><div class="metaLabel">BHK</div><div class="metaValue">${escapeHtml(item.bhk || "Not specified")}</div></div>
          <div class="metaItem"><div class="metaLabel">Purpose</div><div class="metaValue">${escapeHtml(item.purpose || "Not specified")}</div></div>
        </div>
      </div>
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


