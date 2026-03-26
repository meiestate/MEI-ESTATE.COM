 const $ = (id) => document.getElementById(id);
const LOCAL_PROPS_KEY = "mei_properties_v1";

let APPROVED_PROPERTIES = [];
let FEATURED_ONLY = false;

document.addEventListener("DOMContentLoaded", async () => {
  $("yr").textContent = new Date().getFullYear();
  bindEvents();
  setModeBanner();
  await refreshData(true);
});

function setModeBanner() {
  const el = $("modeBanner");
  if (window.hasSupabaseConfig) {
    el.textContent = "Cloud mode active. Approved listings load from Supabase.";
    el.className = "banner";
  } else {
    el.textContent = "Local fallback mode active. Approved listings load from dashboard-approved browser data.";
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

function showToast(msg, type = "success") {
  const el = $("toast");
  el.className = "toast " + type;
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.style.display = "none", 2400);
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

function safeBgImage(url) {
  const v = String(url || "").trim();
  if (!v) return "";
  return `url("${v.replace(/"/g, "%22")}")`;
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
    id: String(p.id || ""),
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
    sellerName: String(p.seller_name || p.sellerName || "").trim()
  };
}

function skeletonGrid() {
  $("grid").innerHTML = Array.from({ length: 6 }).map(() => `<div class="skeleton"></div>`).join("");
}

async function fetchApprovedPropertiesCloud() {
  const { data, error } = await window.supabaseClient
    .from("properties")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeProperty);
}

function fetchApprovedPropertiesLocal() {
  const raw = readJSON(LOCAL_PROPS_KEY, []);
  return (raw || [])
    .map(normalizeProperty)
    .filter(item => item.status === "approved")
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

async function fetchApprovedProperties() {
  if (window.supabaseClient && window.hasSupabaseConfig) {
    return await fetchApprovedPropertiesCloud();
  }
  return fetchApprovedPropertiesLocal();
}

function fillSelectOptions(data) {
  const citySelect = $("city");
  const localitySelect = $("locality");
  const ptypeSelect = $("ptype");
  const bhkSelect = $("bhk");

  const currentCity = citySelect.value || "";
  const currentLocality = localitySelect.value || "";
  const currentType = ptypeSelect.value || "";
  const currentBhk = bhkSelect.value || "";

  const cities = [...new Set(data.map(x => x.city).filter(Boolean))].sort();
  const localities = [...new Set(data.map(x => x.area).filter(Boolean))].sort();
  const types = [...new Set(data.map(x => x.type).filter(Boolean))].sort();
  const bhks = [...new Set(data.map(x => x.bhk).filter(Boolean))].sort();

  citySelect.innerHTML = `<option value="">All Cities</option>`;
  localitySelect.innerHTML = `<option value="">Any</option>`;
  ptypeSelect.innerHTML = `<option value="">Any</option>`;
  bhkSelect.innerHTML = `<option value="">Any</option>`;

  cities.forEach(v => citySelect.appendChild(new Option(v, v)));
  localities.forEach(v => localitySelect.appendChild(new Option(v, v)));
  types.forEach(v => ptypeSelect.appendChild(new Option(v, v)));
  bhks.forEach(v => bhkSelect.appendChild(new Option(v, v)));

  if ([...citySelect.options].some(o => o.value === currentCity)) citySelect.value = currentCity;
  if ([...localitySelect.options].some(o => o.value === currentLocality)) localitySelect.value = currentLocality;
  if ([...ptypeSelect.options].some(o => o.value === currentType)) ptypeSelect.value = currentType;
  if ([...bhkSelect.options].some(o => o.value === currentBhk)) bhkSelect.value = currentBhk;
}

function updateKpis(data) {
  const approved = data.length;
  const featured = data.filter(x => x.featured).length;
  const cities = [...new Set(data.map(x => x.city).filter(Boolean))].length;
  const avg = approved ? Math.round(data.reduce((sum, x) => sum + cleanNumber(x.price), 0) / approved) : 0;

  $("kpiApproved").textContent = approved;
  $("kpiFeatured").textContent = featured;
  $("kpiCities").textContent = cities;
  $("kpiAvgPrice").textContent = avg ? formatINR(avg) : "₹0";
}

function getFilteredResults() {
  const q = $("search").value.trim().toLowerCase();
  const city = $("city").value;
  const locality = $("locality").value;
  const ptype = $("ptype").value;
  const bhk = $("bhk").value;
  const bmin = cleanNumber($("bmin").value);
  const bmax = cleanNumber($("bmax").value);
  const sort = $("sort").value;

  let results = [...APPROVED_PROPERTIES];

  if (q) {
    results = results.filter(item => {
      const hay = [item.title, item.city, item.area, item.type, item.bhk, item.description, item.brokerName, item.sellerName]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  if (city) results = results.filter(item => item.city === city);
  if (locality) results = results.filter(item => item.area === locality);
  if (ptype) results = results.filter(item => item.type === ptype);
  if (bhk) results = results.filter(item => item.bhk === bhk);
  if (bmin) results = results.filter(item => cleanNumber(item.price) >= bmin);
  if (bmax) results = results.filter(item => cleanNumber(item.price) <= bmax);
  if (FEATURED_ONLY) results = results.filter(item => item.featured);

  if (sort === "price_asc") {
    results.sort((a, b) => cleanNumber(a.price) - cleanNumber(b.price));
  } else if (sort === "price_desc") {
    results.sort((a, b) => cleanNumber(b.price) - cleanNumber(a.price));
  } else if (sort === "area_desc") {
    results.sort((a, b) => cleanNumber(b.sqft) - cleanNumber(a.sqft));
  } else if (sort === "featured") {
    results.sort((a, b) => Number(b.featured) - Number(a.featured) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } else {
    results.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  return results;
}

function createCard(item) {
  const card = document.createElement("article");
  card.className = "listing";

  const img = document.createElement("div");
  img.className = "img";
  if (item.image) img.style.backgroundImage = safeBgImage(item.image);

  const body = document.createElement("div");
  body.className = "body";

  const badges = document.createElement("div");
  badges.className = "meta";
  badges.innerHTML = `
    <span class="badge">Approved</span>
    ${item.featured ? `<span class="badge featured">Featured</span>` : ""}
    ${item.type ? `<span class="mchip">${item.type}</span>` : ""}
  `;

  const price = document.createElement("div");
  price.className = "price";
  price.textContent = formatINR(item.price);

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = item.title;

  const addr = document.createElement("div");
  addr.className = "addr";
  addr.textContent = `${item.area || "Area"}, ${item.city || "City"}${item.bhk ? " • " + item.bhk : ""}${item.sqft ? " • " + item.sqft + " sqft" : ""}`;

  const meta = document.createElement("div");
  meta.className = "meta";
  [item.bhk, item.sqft ? `${item.sqft} sqft` : "", item.brokerName ? `Broker: ${item.brokerName}` : "Live"]
    .filter(Boolean)
    .forEach(text => {
      const chip = document.createElement("span");
      chip.className = "mchip";
      chip.textContent = text;
      meta.appendChild(chip);
    });

  const note = document.createElement("div");
  note.className = "desc";
  note.textContent = item.description || "Verified listing";

  const actions = document.createElement("div");
  actions.className = "cardActions";
  actions.innerHTML = `
    <a class="btn small" href="property.html?id=${encodeURIComponent(item.id)}">View</a>
    <a class="btn small primary" href="property.html?id=${encodeURIComponent(item.id)}">I'm Interested</a>
  `;

  body.appendChild(badges);
  body.appendChild(price);
  body.appendChild(title);
  body.appendChild(addr);
  body.appendChild(meta);
  body.appendChild(note);
  body.appendChild(actions);

  card.appendChild(img);
  card.appendChild(body);
  return card;
}

function renderListings() {
  const results = getFilteredResults();
  const grid = $("grid");
  grid.innerHTML = "";

  if (!results.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.innerHTML = `
      <div style="font-weight:1000;font-size:18px;">No listings found</div>
      <div class="mini" style="margin-top:8px;">Try clearing filters or refreshing data.</div>
    `;
    grid.appendChild(empty);
  } else {
    results.forEach(item => grid.appendChild(createCard(item)));
  }

  $("count").textContent = `${results.length} result${results.length === 1 ? "" : "s"}`;
}

function resetFilters() {
  $("search").value = "";
  $("city").value = "";
  $("locality").value = "";
  $("ptype").value = "";
  $("bhk").value = "";
  $("bmin").value = "";
  $("bmax").value = "";
  $("sort").value = "new";
  FEATURED_ONLY = false;
  renderListings();
}

async function refreshData(showMessage = false) {
  try {
    skeletonGrid();
    APPROVED_PROPERTIES = await fetchApprovedProperties();
    fillSelectOptions(APPROVED_PROPERTIES);
    updateKpis(APPROVED_PROPERTIES);
    renderListings();

    if (showMessage) {
      showToast(window.hasSupabaseConfig ? "Approved listings loaded from cloud" : "Approved listings loaded from local browser data", "success");
    }
  } catch (err) {
    console.error(err);
    $("grid").innerHTML = `<div class="empty"><div style="font-weight:1000;font-size:18px;">Unable to load listings</div><div class="mini" style="margin-top:8px;">${String(err.message || "Please check data source configuration.")}</div></div>`;
    showToast(err.message || "Unable to load listings", "danger");
  }
}

function bindEvents() {
  $("applyBtn").addEventListener("click", renderListings);
  $("refreshBtn").addEventListener("click", () => refreshData(true));
  $("resetBtn").addEventListener("click", resetFilters);
  $("featuredOnlyBtn").addEventListener("click", () => {
    FEATURED_ONLY = true;
    renderListings();
    showToast("Featured-only filter applied", "warn");
  });
  $("clearFeaturedBtn").addEventListener("click", () => {
    FEATURED_ONLY = false;
    renderListings();
  });

  ["search","city","locality","ptype","bhk","sort","bmin","bmax"].forEach(id => {
    $(id).addEventListener("input", renderListings);
    $(id).addEventListener("change", renderListings);
  });
}

