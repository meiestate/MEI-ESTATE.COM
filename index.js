(() => {
  const PROPS_KEY = (window.MEI_KEYS && window.MEI_KEYS.properties) || "mei_properties_v1";
  const LEADS_KEY = (window.MEI_KEYS && window.MEI_KEYS.leads) || "mei_leads_v1";
  const SESSION_KEY = (window.MEI_KEYS && window.MEI_KEYS.session) || "mei_session_v1";
  const BROKERS_KEY = (window.MEI_KEYS && window.MEI_KEYS.brokers) || "mei_brokers_v1";

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

  function getAllLeadsSafe() {
    try {
      if (typeof window.getAllLeads === "function") {
        return window.getAllLeads();
      }
    } catch (e) {}
    return readJSON(LEADS_KEY, []);
  }

  function getAllBrokersSafe() {
    try {
      if (typeof window.getAllBrokers === "function") {
        return window.getAllBrokers();
      }
    } catch (e) {}
    return readJSON(BROKERS_KEY, []);
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
    updateSmartStats();
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
    updateSmartStats();
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

  function countApproved() {
    return getApprovedProperties().length;
  }

  function countLeads() {
    return getAllLeadsSafe().length;
  }

  function countBrokers() {
    return getAllBrokersSafe().length;
  }

  function updateSmartStats() {
    const s1 = $("smartStat1Value");
    const s2 = $("smartStat2Value");
    const s3 = $("smartStat3Value");

    if (!s1 || !s2 || !s3) return;

    s1.textContent = String(countApproved());
    s2.textContent = String(countLeads());
    s3.textContent = String(countBrokers());
  }

  function setHeroForPublic() {
    $("heroBadge").textContent = "Real Estate Operating Layer";
    $("heroTitle").innerHTML = "Trust-first Real Estate.<br />Approved listings. Serious leads.";
    $("heroText").textContent = "Browse admin-approved listings, connect with verified brokers, post serious buyer or seller enquiries, and grow inventory through a clean real-estate pipeline.";
    $("publicBenefits").hidden = false;
    $("publicHeroActions").hidden = false;
    $("welcomePanel").hidden = true;
    $("smart-workspace").hidden = true;
    $("quickActionText").textContent = "Choose the path that matches your role in the property journey.";
  }

  function setQuickActionsForRole(role) {
    const grid = $("quickActionGrid");
    const text = $("quickActionText");

    if (role === "ADMIN") {
      text.textContent = "Your homepage now acts like a live control tower for approvals, CRM and operations.";
      grid.innerHTML = `
        <article class="quickCard">
          <div class="quickIcon">🛡️</div>
          <div class="titleText">Admin Dashboard</div>
          <div class="desc">Open the command center for approvals, counts and oversight.</div>
          <a class="btn small primary" href="dashboard.html">Open Dashboard</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">📇</div>
          <div class="titleText">CRM Queue</div>
          <div class="desc">Move leads, update follow-ups and keep the pipeline alive.</div>
          <a class="btn small primary" href="crm.html">Open CRM</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">➕</div>
          <div class="titleText">Add Property</div>
          <div class="desc">Create a property entry directly from your logged-in workspace.</div>
          <a class="btn small primary" href="add-property.html">Add Property</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">🤝</div>
          <div class="titleText">Broker Network</div>
          <div class="desc">Review broker-side movement and build co-broking momentum.</div>
          <a class="btn small primary" href="broker-network.html">Open Network</a>
        </article>
      `;
    } else if (role === "SELLER") {
      text.textContent = "Your homepage now focuses on property publishing and seller-side movement.";
      grid.innerHTML = `
        <article class="quickCard">
          <div class="quickIcon">🏷️</div>
          <div class="titleText">Seller Dashboard</div>
          <div class="desc">Open your workspace and track your property journey.</div>
          <a class="btn small primary" href="dashboard.html">Open Dashboard</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">➕</div>
          <div class="titleText">Post Property</div>
          <div class="desc">Add a new property and send it into the approval flow.</div>
          <a class="btn small primary" href="add-property.html">Add Property</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">📋</div>
          <div class="titleText">View Listings</div>
          <div class="desc">Browse live listings and compare how approved entries appear.</div>
          <a class="btn small primary" href="listings.html">Open Listings</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">📩</div>
          <div class="titleText">Post Requirement</div>
          <div class="desc">Send a lead or update requirement directly from the homepage.</div>
          <a class="btn small primary" href="#lead">Post Lead</a>
        </article>
      `;
    } else {
      text.textContent = "Your homepage now acts like a fast broker entry point for leads, listings and network flow.";
      grid.innerHTML = `
        <article class="quickCard">
          <div class="quickIcon">📇</div>
          <div class="titleText">CRM Workspace</div>
          <div class="desc">Track enquiries, follow-ups and active conversations.</div>
          <a class="btn small primary" href="crm.html">Open CRM</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">➕</div>
          <div class="titleText">Add Property</div>
          <div class="desc">Push a fresh inventory entry into the system in one move.</div>
          <a class="btn small primary" href="add-property.html">Add Property</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">🤝</div>
          <div class="titleText">Broker Network</div>
          <div class="desc">Open network-side collaboration and co-broking opportunities.</div>
          <a class="btn small primary" href="broker-network.html">Open Network</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">📋</div>
          <div class="titleText">All Listings</div>
          <div class="desc">Review live listings and move into property-level actions quickly.</div>
          <a class="btn small primary" href="listings.html">Open Listings</a>
        </article>
      `;
    }
  }

  function setWorkspaceForRole(role) {
    const sub = $("workspaceSubtext");
    const cards = $("workspaceCards");

    if (role === "ADMIN") {
      sub.textContent = "Admin-first shortcuts for approvals, CRM and network-level monitoring.";
      cards.innerHTML = `
        <article class="quickCard">
          <div class="quickIcon">🛡️</div>
          <div class="titleText">Dashboard</div>
          <div class="desc">Monitor listings, leads, brokers and daily flow from one screen.</div>
          <a class="btn small primary" href="dashboard.html">Open Dashboard</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">📇</div>
          <div class="titleText">CRM</div>
          <div class="desc">Take action on buyer and seller enquiries without losing momentum.</div>
          <a class="btn small primary" href="crm.html">Open CRM</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">➕</div>
          <div class="titleText">Property Intake</div>
          <div class="desc">Add fresh inventory or correct a listing entry instantly.</div>
          <a class="btn small primary" href="add-property.html">Add Property</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">🤝</div>
          <div class="titleText">Broker Network</div>
          <div class="desc">Keep the broker graph healthy and responsive.</div>
          <a class="btn small primary" href="broker-network.html">Open Network</a>
        </article>
      `;
    } else if (role === "SELLER") {
      sub.textContent = "Seller-first shortcuts for posting property and tracking visibility.";
      cards.innerHTML = `
        <article class="quickCard">
          <div class="quickIcon">🏷️</div>
          <div class="titleText">Seller Dashboard</div>
          <div class="desc">Jump into your private space and track listing activity.</div>
          <a class="btn small primary" href="dashboard.html">Open Dashboard</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">➕</div>
          <div class="titleText">Add Property</div>
          <div class="desc">Submit another property and move it into the approval layer.</div>
          <a class="btn small primary" href="add-property.html">Add Property</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">📋</div>
          <div class="titleText">Live Listings</div>
          <div class="desc">See how public approved properties are being shown.</div>
          <a class="btn small primary" href="listings.html">View Listings</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">📩</div>
          <div class="titleText">Send Requirement</div>
          <div class="desc">Use the homepage itself to push a new requirement into the system.</div>
          <a class="btn small primary" href="#lead">Post Lead</a>
        </article>
      `;
    } else {
      sub.textContent = "Broker-first shortcuts for leads, listings and network movement.";
      cards.innerHTML = `
        <article class="quickCard">
          <div class="quickIcon">📇</div>
          <div class="titleText">CRM</div>
          <div class="desc">Keep follow-up motion alive and move hot leads faster.</div>
          <a class="btn small primary" href="crm.html">Open CRM</a>
        </article>

        <article class="quickIcon"> </article>
      `;
      cards.innerHTML = `
        <article class="quickCard">
          <div class="quickIcon">📇</div>
          <div class="titleText">CRM</div>
          <div class="desc">Keep follow-up motion alive and move hot leads faster.</div>
          <a class="btn small primary" href="crm.html">Open CRM</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">➕</div>
          <div class="titleText">Add Property</div>
          <div class="desc">Capture fresh inventory directly into your workspace.</div>
          <a class="btn small primary" href="add-property.html">Add Property</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">🤝</div>
          <div class="titleText">Broker Network</div>
          <div class="desc">Move into co-broking and collaboration quickly.</div>
          <a class="btn small primary" href="broker-network.html">Open Network</a>
        </article>

        <article class="quickCard">
          <div class="quickIcon">📋</div>
          <div class="titleText">Listings</div>
          <div class="desc">Scan live inventory and jump into opportunity mode.</div>
          <a class="btn small primary" href="listings.html">Open Listings</a>
        </article>
      `;
    }
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
    const navLoginAs = $("navLoginAs");

    if (!session || !session.role) {
      publicNav.hidden = false;
      privateNav.hidden = true;
      setHeroForPublic();
      return;
    }

    publicNav.hidden = true;
    privateNav.hidden = false;

    const role = String(session.role || "").toUpperCase();
    const name = String(session.name || session.fullName || session.username || "User").trim();

    navLoginAs.textContent = `👤 ${name} (${role})`;

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
    }

    $("heroBadge").textContent = `${role} Workspace Ready`;
    $("heroTitle").innerHTML = `Welcome back, ${name}.<br />Your private workspace is live.`;
    $("heroText").textContent = "This homepage now works as a smart entry layer. Jump into the most relevant workflow for your role and continue the day without friction.";
    $("publicBenefits").hidden = true;
    $("publicHeroActions").hidden = true;

    $("welcomePanel").hidden = false;
    $("smart-workspace").hidden = false;
    $("welcomeTitle").textContent = `Welcome back, ${name} 👋`;
    $("welcomeText").textContent = `Logged in as ${role}. Your next best actions are now surfaced right on the homepage.`;
    $("rolePill").textContent = role;

    updateSmartStats();
    setQuickActionsForRole(role);
    setWorkspaceForRole(role);

    if (role === "ADMIN") {
      $("smartStat1Label").textContent = "Approved Listings";
      $("smartStat2Label").textContent = "CRM Leads";
      $("smartStat3Label").textContent = "Brokers";
      $("smartAction1").textContent = "Open Dashboard";
      $("smartAction1").href = "dashboard.html";
      $("smartAction2").textContent = "Open CRM";
      $("smartAction2").href = "crm.html";
      $("smartAction3").textContent = "Broker Network";
      $("smartAction3").href = "broker-network.html";
    } else if (role === "SELLER") {
      $("smartStat1Label").textContent = "Approved Listings";
      $("smartStat2Label").textContent = "CRM Leads";
      $("smartStat3Label").textContent = "Brokers";
      $("smartAction1").textContent = "Seller Dashboard";
      $("smartAction1").href = "dashboard.html";
      $("smartAction2").textContent = "Add Property";
      $("smartAction2").href = "add-property.html";
      $("smartAction3").textContent = "View Listings";
      $("smartAction3").href = "listings.html";
    } else {
      $("smartStat1Label").textContent = "Approved Listings";
      $("smartStat2Label").textContent = "CRM Leads";
      $("smartStat3Label").textContent = "Brokers";
      $("smartAction1").textContent = "Open CRM";
      $("smartAction1").href = "crm.html";
      $("smartAction2").textContent = "Add Property";
      $("smartAction2").href = "add-property.html";
      $("smartAction3").textContent = "Broker Network";
      $("smartAction3").href = "broker-network.html";
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