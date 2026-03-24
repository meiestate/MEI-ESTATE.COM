(() => {
  const PROPS_KEY = (window.MEI_KEYS && window.MEI_KEYS.properties) || "mei_properties_v1";
  const LEADS_KEY = (window.MEI_KEYS && window.MEI_KEYS.leads) || "mei_leads_v1";
  const SESSION_KEY = (window.MEI_KEYS && window.MEI_KEYS.session) || "mei_session_v1";

  const DRAFTS = {
    landing: "mei_home_draft_landing_v1",
    broker: "mei_home_draft_broker_v1",
    filters: "mei_home_listing_filters_v1"
  };

  const $ = (id) => document.getElementById(id);

  let TOAST_T = null;
  let TOAST_FN = null;

  function toast(msg, opts = {}) {
    const { actionText = "", actionFn = null, timeout = 3200 } = opts;
    $("toastMsg").textContent = String(msg || "✅ Updated");
    TOAST_FN = typeof actionFn === "function" ? actionFn : null;
    const act = $("toastAct");

    if (actionText && TOAST_FN) {
      act.textContent = actionText;
      act.hidden = false;
    } else {
      act.hidden = true;
    }

    $("toast").hidden = false;

    if (TOAST_T) clearTimeout(TOAST_T);
    TOAST_T = setTimeout(() => {
      $("toast").hidden = true;
      act.hidden = true;
      TOAST_FN = null;
    }, timeout);
  }

  function readJSON(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function cleanDigits(v) {
    return String(v || "").replace(/[^\d]/g, "");
  }

  function normalizePhone(v) {
    const raw = String(v || "").trim();
    const digits = cleanDigits(raw);
    if (digits.length === 10) return digits;
    if (digits.length === 12 && digits.startsWith("91")) return digits;
    return digits;
  }

  function isValidPhone(v) {
    const digits = cleanDigits(v);
    return digits.length === 10 || (digits.length === 12 && digits.startsWith("91"));
  }

  function parsePriceToNumber(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
    const digits = cleanDigits(v);
    return digits ? Number(digits) : NaN;
  }

  function formatINR(v) {
    const n = parsePriceToNumber(v);
    if (!Number.isFinite(n)) return "Price on request";
    return "₹" + n.toLocaleString("en-IN");
  }

  function normalizeType(type) {
    const t = String(type || "").trim().toLowerCase();
    if (!t) return "";
    if (t === "apartment") return "Apartment";
    if (t === "house") return "House";
    if (t === "plot") return "Plot";
    if (t === "commercial") return "Commercial";
    if (t === "villa") return "Villa";
    return String(type || "").trim();
  }

  function normalizeProperty(p) {
    const out = Object.assign({}, p || {});
    out.id = String(out.id || "");
    out.title = String(out.title || out.name || "Untitled Listing").trim();
    out.city = String(out.city || "").trim();
    out.area = String(out.area || out.locality || "").trim();
    out.type = normalizeType(out.type);
    out.bhk = String(out.bhk || "").trim();
    out.price = parsePriceToNumber(out.price);
    out.sqft = parsePriceToNumber(out.sqft || out.areaSqft || out.area_size);
    out.description = String(out.description || out.desc || out.note || "").trim();
    out.image = String(out.image || "").trim();
    out.status = String(out.status || "").trim().toLowerCase();
    out.createdAt = out.createdAt || "";
    out.featured = Boolean(out.featured);
    return out;
  }

  function getAllProperties() {
    try {
      if (typeof window.getAllProperties === "function") {
        return window.getAllProperties().map(normalizeProperty);
      }
    } catch (e) {}
    return readJSON(PROPS_KEY, []).map(normalizeProperty);
  }

  function getApprovedProperties() {
    return getAllProperties().filter((x) => x.status === "approved");
  }

  function getFallbackProperties() {
    return [
      {
        id: "demo1",
        title: "2 BHK Apartment in Whitefield",
        city: "Bangalore",
        area: "Whitefield",
        type: "Apartment",
        bhk: "2 BHK",
        price: 6500000,
        sqft: 1100,
        description: "Near metro • Covered parking • Verified listing",
        image: "",
        status: "approved",
        featured: true
      },
      {
        id: "demo2",
        title: "Commercial Property in Whitefield",
        city: "Bangalore",
        area: "Whitefield",
        type: "Commercial",
        bhk: "",
        price: 6000000,
        sqft: 1500,
        description: "Road-facing commercial space",
        image: "",
        status: "approved",
        featured: false
      },
      {
        id: "demo3",
        title: "Residential Plot in Bangalore East",
        city: "Bangalore",
        area: "Whitefield",
        type: "Plot",
        bhk: "",
        price: 2500000,
        sqft: 1500,
        description: "Clear documents • Investment-ready plot",
        image: "",
        status: "approved",
        featured: false
      }
    ].map(normalizeProperty);
  }

  function getHomepageListings() {
    const live = getApprovedProperties();
    return live.length ? live : getFallbackProperties();
  }

  function safeBgImage(url) {
    const v = String(url || "").trim();
    if (!v) return "";
    return `background-image:url("${v.replace(/"/g, "%22")}");`;
  }

  function createListingCard(item) {
    const tile = document.createElement("article");
    tile.className = "tile";

    const img = document.createElement("div");
    img.className = "tileImg";
    if (item.image) {
      img.style.cssText += safeBgImage(item.image);
    }

    const body = document.createElement("div");
    body.className = "tileBody";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = item.title;

    const meta = document.createElement("div");
    meta.className = "mini";
    meta.textContent = `${item.area || "Area"}, ${item.city || "City"} • ${item.type || "Property"}${item.bhk ? " • " + item.bhk : ""}${Number.isFinite(item.sqft) ? " • " + item.sqft + " sqft" : ""}`;

    const price = document.createElement("div");
    price.className = "price";
    price.textContent = formatINR(item.price);

    const desc = document.createElement("div");
    desc.className = "mini";
    desc.style.marginTop = "8px";
    desc.textContent = item.description || "Approved listing";

    const actions = document.createElement("div");
    actions.className = "actions";

    const viewBtn = document.createElement("a");
    viewBtn.className = "btn small";
    viewBtn.href = `property.html?id=${encodeURIComponent(item.id)}`;
    viewBtn.textContent = "View";

    const interestBtn = document.createElement("a");
    interestBtn.className = "btn primary small";
    interestBtn.href = `property.html?id=${encodeURIComponent(item.id)}`;
    interestBtn.textContent = "I'm Interested";

    actions.appendChild(viewBtn);
    actions.appendChild(interestBtn);

    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(price);
    body.appendChild(desc);
    body.appendChild(actions);

    tile.appendChild(img);
    tile.appendChild(body);

    return tile;
  }

  function saveFilters() {
    writeJSON(DRAFTS.filters, {
      q: $("q").value || "",
      type: $("typeFilter").value || "",
      sort: $("sortFilter").value || "NEWEST"
    });
  }

  function loadFilters() {
    const f = readJSON(DRAFTS.filters, null);
    if (!f) return;
    $("q").value = f.q || "";
    $("typeFilter").value = f.type || "";
    $("sortFilter").value = f.sort || "NEWEST";
  }

  function getFilteredHomepageListings() {
    const source = getHomepageListings();

    const q = ($("q").value || "").trim().toLowerCase();
    const type = ($("typeFilter").value || "").trim();
    const sort = ($("sortFilter").value || "NEWEST").trim();

    let results = source.slice();

    if (q) {
      results = results.filter((item) => {
        const hay = [
          item.title,
          item.city,
          item.area,
          item.type,
          item.bhk,
          item.description
        ].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    if (type) {
      results = results.filter((item) => item.type === type);
    }

    if (sort === "PRICE_LOW") {
      results.sort((a, b) => (Number.isFinite(a.price) ? a.price : Infinity) - (Number.isFinite(b.price) ? b.price : Infinity));
    } else if (sort === "PRICE_HIGH") {
      results.sort((a, b) => (Number.isFinite(b.price) ? b.price : -Infinity) - (Number.isFinite(a.price) ? a.price : -Infinity));
    } else if (sort === "FEATURED") {
      results.sort((a, b) => Number(b.featured) - Number(a.featured));
    } else {
      results.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return results.slice(0, 6);
  }

  function refreshListings() {
    const results = getFilteredHomepageListings();
    $("approvedCount").textContent = String(getHomepageListings().length);

    const grid = $("grid");
    grid.innerHTML = "";

    if (!results.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.innerHTML = `
        <div style="font-weight:900;font-size:18px;">No listings found</div>
        <div class="mini" style="margin-top:8px;">Try clearing search filters or open the full listings page.</div>
      `;
      grid.appendChild(empty);
      return;
    }

    results.forEach((item) => grid.appendChild(createListingCard(item)));
  }

  function resetListingFilters() {
    $("q").value = "";
    $("typeFilter").value = "";
    $("sortFilter").value = "NEWEST";
    saveFilters();
    refreshListings();
  }

  function buildLandingPayload() {
    return {
      id: "LEAD_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
      propertyId: "",
      propertyTitle: "",
      listingId: "",
      listingTitle: "",
      buyerName: $("leadName").value.trim(),
      buyerPhone: normalizePhone($("leadPhone").value),
      buyerCity: "Bangalore",
      message: [
        `LeadType: ${$("leadType").value}`,
        `Locality: ${$("leadLocality").value.trim()}`,
        ($("budgetMin").value || $("budgetMax").value) ? `Budget: ${$("budgetMin").value || "—"} to ${$("budgetMax").value || "—"}` : "",
        $("leadNotes").value.trim()
      ].filter(Boolean).join("\n"),
      source: "website",
      status: "NEW",
      assignedBrokerId: "",
      assignedBrokerName: "",
      assignedTo: "",
      followUp: "",
      followUpDate: "",
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: ""
    };
  }

  function renderLandingLeadPreview() {
    $("landingLeadPreview").textContent = JSON.stringify(buildLandingPayload(), null, 2);
  }

  function saveLandingDraft() {
    writeJSON(DRAFTS.landing, {
      leadName: $("leadName").value,
      leadPhone: $("leadPhone").value,
      leadType: $("leadType").value,
      leadLocality: $("leadLocality").value,
      budgetMin: $("budgetMin").value,
      budgetMax: $("budgetMax").value,
      leadNotes: $("leadNotes").value,
      leadConsent: $("leadConsent").checked
    });
    toast("💾 Landing draft saved");
  }

  function loadLandingDraft() {
    const d = readJSON(DRAFTS.landing, null);
    if (!d) return;
    $("leadName").value = d.leadName || "";
    $("leadPhone").value = d.leadPhone || "";
    $("leadType").value = d.leadType || "BUYER";
    $("leadLocality").value = d.leadLocality || "";
    $("budgetMin").value = d.budgetMin || "";
    $("budgetMax").value = d.budgetMax || "";
    $("leadNotes").value = d.leadNotes || "";
    $("leadConsent").checked = !!d.leadConsent;
  }

  function clearLandingForm() {
    $("landingLeadForm").reset();
    $("landingLeadErr").hidden = true;
    $("landingLeadErr").textContent = "";
    renderLandingLeadPreview();
  }

  function saveLead(lead) {
    if (typeof window.getAllLeads === "function" && typeof window.saveAllLeads === "function") {
      const leads = window.getAllLeads();
      leads.unshift(lead);
      window.saveAllLeads(leads);
      return;
    }
    const leads = readJSON(LEADS_KEY, []);
    leads.unshift(lead);
    writeJSON(LEADS_KEY, leads);
  }

  function submitLandingLead(e) {
    e.preventDefault();

    const name = $("leadName").value.trim();
    const phone = $("leadPhone").value.trim();
    const locality = $("leadLocality").value.trim();
    const consent = $("leadConsent").checked;

    if (!name) {
      $("landingLeadErr").hidden = false;
      $("landingLeadErr").textContent = "Name is required.";
      $("leadName").focus();
      return;
    }
    if (!isValidPhone(phone)) {
      $("landingLeadErr").hidden = false;
      $("landingLeadErr").textContent = "Enter valid 10-digit phone or 91XXXXXXXXXX.";
      $("leadPhone").focus();
      return;
    }
    if (!locality) {
      $("landingLeadErr").hidden = false;
      $("landingLeadErr").textContent = "Locality is required.";
      $("leadLocality").focus();
      return;
    }
    if (!consent) {
      $("landingLeadErr").hidden = false;
      $("landingLeadErr").textContent = "Please confirm consent to be contacted.";
      $("leadConsent").focus();
      return;
    }

    $("landingLeadErr").hidden = true;
    $("landingLeadErr").textContent = "";

    const lead = buildLandingPayload();
    saveLead(lead);

    toast("Lead submitted ✅");
    $("landingLeadForm").reset();
    renderLandingLeadPreview();
  }

  function buildBrokerPayload() {
    return {
      id: "LEAD_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
      propertyId: "",
      propertyTitle: "",
      listingId: "BROKER-KYC",
      listingTitle: "Broker Verification Request",
      buyerName: $("brokerName").value.trim(),
      buyerPhone: normalizePhone($("brokerPhone").value),
      buyerCity: "Bangalore",
      message: [
        "BROKER VERIFICATION REQUEST",
        `Primary Area: ${$("brokerArea").value.trim()}`,
        $("brokerExp").value ? `Experience: ${$("brokerExp").value} years` : "",
        $("brokerCompany").value.trim() ? `Company: ${$("brokerCompany").value.trim()}` : ""
      ].filter(Boolean).join("\n"),
      source: "website",
      status: "NEW",
      assignedBrokerId: "",
      assignedBrokerName: "",
      assignedTo: "",
      followUp: "",
      followUpDate: "",
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: ""
    };
  }

  function renderBrokerPreview() {
    $("brokerPreview").textContent = JSON.stringify(buildBrokerPayload(), null, 2);
  }

  function saveBrokerDraft() {
    writeJSON(DRAFTS.broker, {
      brokerName: $("brokerName").value,
      brokerPhone: $("brokerPhone").value,
      brokerArea: $("brokerArea").value,
      brokerExp: $("brokerExp").value,
      brokerCompany: $("brokerCompany").value,
      brokerConsent: $("brokerConsent").checked
    });
    toast("💾 Broker draft saved");
  }

  function loadBrokerDraft() {
    const d = readJSON(DRAFTS.broker, null);
    if (!d) return;
    $("brokerName").value = d.brokerName || "";
    $("brokerPhone").value = d.brokerPhone || "";
    $("brokerArea").value = d.brokerArea || "";
    $("brokerExp").value = d.brokerExp || "";
    $("brokerCompany").value = d.brokerCompany || "";
    $("brokerConsent").checked = !!d.brokerConsent;
  }

  function clearBrokerForm() {
    $("brokerJoinForm").reset();
    $("brokerErr").hidden = true;
    $("brokerErr").textContent = "";
    renderBrokerPreview();
  }

  function submitBrokerJoin(e) {
    e.preventDefault();

    const name = $("brokerName").value.trim();
    const phone = $("brokerPhone").value.trim();
    const area = $("brokerArea").value.trim();
    const consent = $("brokerConsent").checked;

    if (!name) {
      $("brokerErr").hidden = false;
      $("brokerErr").textContent = "Broker name is required.";
      $("brokerName").focus();
      return;
    }
    if (!isValidPhone(phone)) {
      $("brokerErr").hidden = false;
      $("brokerErr").textContent = "Enter valid 10-digit phone or 91XXXXXXXXXX.";
      $("brokerPhone").focus();
      return;
    }
    if (!area) {
      $("brokerErr").hidden = false;
      $("brokerErr").textContent = "Primary area is required.";
      $("brokerArea").focus();
      return;
    }
    if (!consent) {
      $("brokerErr").hidden = false;
      $("brokerErr").textContent = "Please confirm consent to be contacted.";
      $("brokerConsent").focus();
      return;
    }

    $("brokerErr").hidden = true;
    $("brokerErr").textContent = "";

    const lead = buildBrokerPayload();
    saveLead(lead);

    toast("Broker request submitted ✅");
    $("brokerJoinForm").reset();
    renderBrokerPreview();
  }

  function getSession() {
    try {
      if (typeof window.getSession === "function") {
        return window.getSession();
      }
    } catch (e) {}
    return readJSON(SESSION_KEY, null);
  }

  function clearSession() {
    try {
      if (typeof window.clearSession === "function") {
        window.clearSession();
        return;
      }
    } catch (e) {}
    localStorage.removeItem(SESSION_KEY);
  }

  function applyRoleNavigation() {
    const session = getSession();

    const publicNav = $("publicNav");
    const privateNav = $("privateNav");
    const logoutBtn = $("logoutBtn");
    const navDashboard = $("navDashboard");
    const navCRM = $("navCRM");
    const navAddProperty = $("navAddProperty");
    const navListings = $("navListings");
    const navBrokerNetwork = $("navBrokerNetwork");
    const navSellerPage = $("navSellerPage");
    const navUserLabel = $("navUserLabel");
    const welcomeBar = $("welcomeBar");
    const welcomeText = $("welcomeText");

    if (!session || !session.role) {
      publicNav.hidden = false;
      privateNav.hidden = true;
      welcomeBar.hidden = true;
      return;
    }

    publicNav.hidden = true;
    privateNav.hidden = false;
    welcomeBar.hidden = false;

    const role = String(session.role || "").toUpperCase();
    const name = String(session.name || session.fullName || session.username || "User").trim();

    navUserLabel.textContent = `👤 ${name} (${role})`;
    welcomeText.textContent = `Logged in as ${name} • Role: ${role}`;

    navDashboard.hidden = false;
    navCRM.hidden = false;
    navAddProperty.hidden = false;
    navListings.hidden = false;
    navBrokerNetwork.hidden = false;
    navSellerPage.hidden = false;

    if (role === "ADMIN") {
      navDashboard.href = "dashboard.html";
      navCRM.href = "crm.html";
      navAddProperty.href = "add-property.html";
      navBrokerNetwork.href = "broker-network.html";
      navSellerPage.href = "seller.html";
    } else if (role === "BROKER") {
      navDashboard.href = "dashboard.html";
      navCRM.href = "crm.html";
      navAddProperty.href = "add-property.html";
      navBrokerNetwork.href = "broker-network.html";
      navSellerPage.hidden = true;
    } else if (role === "SELLER") {
      navDashboard.href = "dashboard.html";
      navCRM.hidden = true;
      navAddProperty.href = "add-property.html";
      navBrokerNetwork.hidden = true;
      navSellerPage.href = "seller.html";
    } else {
      navDashboard.href = "dashboard.html";
    }

    logoutBtn.onclick = () => {
      clearSession();
      toast("Logged out successfully");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 500);
    };
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const act = btn.getAttribute("data-action");

    if (act === "saveLandingDraft") saveLandingDraft();
    if (act === "clearLandingForm") clearLandingForm();
    if (act === "saveBrokerDraft") saveBrokerDraft();
    if (act === "clearBrokerForm") clearBrokerForm();
    if (act === "refreshListings") {
      refreshListings();
      toast("Listings refreshed");
    }
    if (act === "clearFilters") resetListingFilters();
  });

  $("toastAct").addEventListener("click", () => {
    if (typeof TOAST_FN === "function") {
      const fn = TOAST_FN;
      $("toast").hidden = true;
      $("toastAct").hidden = true;
      TOAST_FN = null;
      try { fn(); } catch (e) {}
    }
  });

  $("landingLeadForm").addEventListener("submit", submitLandingLead);
  $("brokerJoinForm").addEventListener("submit", submitBrokerJoin);

  ["leadName", "leadPhone", "leadType", "leadLocality", "budgetMin", "budgetMax", "leadNotes", "leadConsent"].forEach((id) => {
    $(id).addEventListener("input", renderLandingLeadPreview);
    $(id).addEventListener("change", renderLandingLeadPreview);
  });

  ["brokerName", "brokerPhone", "brokerArea", "brokerExp", "brokerCompany", "brokerConsent"].forEach((id) => {
    $(id).addEventListener("input", renderBrokerPreview);
    $(id).addEventListener("change", renderBrokerPreview);
  });

  ["q", "typeFilter", "sortFilter"].forEach((id) => {
    $(id).addEventListener("input", () => {
      saveFilters();
      refreshListings();
    });
    $(id).addEventListener("change", () => {
      saveFilters();
      refreshListings();
    });
  });

  $("yr").textContent = new Date().getFullYear();

  if (typeof window.seedData === "function") {
    window.seedData();
  }

  loadLandingDraft();
  loadBrokerDraft();
  loadFilters();

  renderLandingLeadPreview();
  renderBrokerPreview();
  refreshListings();
  applyRoleNavigation();
})();