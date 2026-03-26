(() => {
  "use strict";

  const PROPS_KEY = "mei_properties_v1";
  const LEADS_KEY = "mei_leads_v1";
  const BROKERS_KEY = "mei_brokers_v1";
  const CURRENT_USER_KEY = "mei_current_user_v1";
  const LANDING_DRAFT_KEY = "mei_landing_lead_draft_v1";
  const BROKER_DRAFT_KEY = "mei_broker_join_draft_v1";

  const $ = (id) => document.getElementById(id);

  let TOAST_TIMER = null;
  let TOAST_ACTION = null;

  function readJSON(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    }catch(e){
      return fallback;
    }
  }

  function writeJSON(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid(){
    try{
      if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    }catch(e){}
    return "id_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function getCurrentUserSafe(){
    try{
      if(typeof getCurrentUser === "function") return getCurrentUser();
    }catch(e){}
    return readJSON(CURRENT_USER_KEY, null);
  }

  function getProps(){
    return readJSON(PROPS_KEY, []).map(p => ({
      id: p.id || uid(),
      title: p.title || p.name || "Property",
      city: p.city || "",
      area: p.area || "",
      type: p.type || "",
      price: p.price || "",
      description: p.description || p.desc || "",
      status: p.status || "pending",
      featured: !!p.featured,
      createdAt: p.createdAt || new Date().toISOString()
    }));
  }

  function getLeads(){
    return readJSON(LEADS_KEY, []).map(l => ({
      id: l.id || uid(),
      createdAt: l.createdAt || new Date().toISOString(),
      listingTitle: l.listingTitle || "",
      listingId: l.listingId || "",
      buyerName: l.buyerName || l.name || "",
      buyerPhone: l.buyerPhone || l.phone || "",
      assignedTo: l.assignedTo || "",
      status: l.status || "NEW",
      followUp: l.followUp || "",
      notes: l.notes || "",
      message: l.message || ""
    }));
  }

  function saveLeads(leads){
    writeJSON(LEADS_KEY, leads || []);
  }

  function getBrokers(){
    return readJSON(BROKERS_KEY, []);
  }

  function approvedProps(){
    return getProps().filter(p => String(p.status || "").toLowerCase() === "approved");
  }

  function formatPrice(v){
    const n = Number(v || 0);
    if(!n) return "₹ —";
    return "₹ " + n.toLocaleString("en-IN");
  }

  function toast(msg, actionText = "", actionFn = null){
    const box = $("toast");
    const txt = $("toastMsg");
    const act = $("toastAct");
    txt.textContent = msg || "Updated";
    TOAST_ACTION = typeof actionFn === "function" ? actionFn : null;

    if(actionText && TOAST_ACTION){
      act.hidden = false;
      act.textContent = actionText;
    }else{
      act.hidden = true;
    }

    box.hidden = false;
    clearTimeout(TOAST_TIMER);
    TOAST_TIMER = setTimeout(() => {
      box.hidden = true;
      act.hidden = true;
      TOAST_ACTION = null;
    }, 2200);
  }

  function handleToastAction(){
    if(typeof TOAST_ACTION === "function"){
      const fn = TOAST_ACTION;
      $("toast").hidden = true;
      TOAST_ACTION = null;
      fn();
    }
  }

  function yearNow(){
    $("yr").textContent = new Date().getFullYear();
  }

  function renderListings(){
    const grid = $("grid");
    const q = (($("q")?.value || "").trim().toLowerCase());
    const type = ($("typeFilter")?.value || "").trim();
    const sort = ($("sortFilter")?.value || "NEWEST").trim();

    let items = approvedProps();

    if(q){
      items = items.filter(p => {
        const hay = [p.title, p.city, p.area, p.type, p.description].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    if(type){
      items = items.filter(p => String(p.type || "").toLowerCase() === type.toLowerCase());
    }

    if(sort === "PRICE_LOW"){
      items.sort((a,b) => Number(a.price || 0) - Number(b.price || 0));
    }else if(sort === "PRICE_HIGH"){
      items.sort((a,b) => Number(b.price || 0) - Number(a.price || 0));
    }else if(sort === "FEATURED"){
      items.sort((a,b) => Number(b.featured) - Number(a.featured));
    }else{
      items.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    $("approvedCount").textContent = items.length;
    grid.innerHTML = "";

    if(!items.length){
      grid.innerHTML = `
        <div class="card" style="grid-column:1/-1;">
          <div class="muted">No approved listings found for the current filter.</div>
        </div>
      `;
      return;
    }

    items.slice(0, 9).forEach(p => {
      const card = document.createElement("article");
      card.className = "listingCard";
      card.innerHTML = `
        <div class="listingTitle">${escapeHtml(p.title)}</div>
        <div class="listingMeta">
          ${p.city ? `<span class="metaPill">${escapeHtml(p.city)}</span>` : ""}
          ${p.area ? `<span class="metaPill">${escapeHtml(p.area)}</span>` : ""}
          ${p.type ? `<span class="metaPill">${escapeHtml(p.type)}</span>` : ""}
          ${p.featured ? `<span class="metaPill">⭐ Featured</span>` : ""}
        </div>
        <div class="listingPrice">${formatPrice(p.price)}</div>
        <div class="listingDesc">${escapeHtml((p.description || "Approved property listing.").slice(0, 120))}</div>
        <div class="listingActions">
          <a class="btn small primary" href="property.html?id=${encodeURIComponent(p.id)}">View</a>
          <button class="btn small" type="button" data-interest="${p.id}">I'm Interested</button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-interest]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-interest");
        const prop = approvedProps().find(x => x.id === id);
        if(prop){
          $("leadType").value = "BUYER";
          $("leadLocality").value = prop.area || prop.city || "";
          updateLeadPreview();
          location.hash = "#lead";
          toast("Property interest loaded into lead form");
        }
      });
    });
  }

  function escapeHtml(str){
    return String(str || "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

  function validatePhone(v){
    const clean = String(v || "").replace(/[^\d+]/g,"");
    return clean.length >= 10;
  }

  function updateLeadPreview(){
    const txt = {
      name: $("leadName").value.trim(),
      phone: $("leadPhone").value.trim(),
      type: $("leadType").value,
      locality: $("leadLocality").value.trim(),
      budgetMin: $("budgetMin").value.trim(),
      budgetMax: $("budgetMax").value.trim(),
      notes: $("leadNotes").value.trim()
    };

    $("landingLeadPreview").textContent =
`Name: ${txt.name || "-"}
Phone: ${txt.phone || "-"}
Lead Type: ${txt.type || "-"}
Locality: ${txt.locality || "-"}
Budget: ${txt.budgetMin || "-"} to ${txt.budgetMax || "-"}
Notes: ${txt.notes || "-"}`;
  }

  function updateBrokerPreview(){
    const txt = {
      name: $("brokerName").value.trim(),
      phone: $("brokerPhone").value.trim(),
      area: $("brokerArea").value.trim(),
      exp: $("brokerExp").value.trim(),
      company: $("brokerCompany").value.trim()
    };

    $("brokerPreview").textContent =
`Broker Name: ${txt.name || "-"}
Phone: ${txt.phone || "-"}
Primary Area: ${txt.area || "-"}
Experience: ${txt.exp || "-"}
Company: ${txt.company || "-"}`;
  }

  function saveLandingDraft(){
    const data = {
      leadName: $("leadName").value,
      leadPhone: $("leadPhone").value,
      leadType: $("leadType").value,
      leadLocality: $("leadLocality").value,
      budgetMin: $("budgetMin").value,
      budgetMax: $("budgetMax").value,
      leadNotes: $("leadNotes").value,
      leadConsent: $("leadConsent").checked
    };
    writeJSON(LANDING_DRAFT_KEY, data);
    toast("Lead draft saved");
  }

  function loadLandingDraft(){
    const d = readJSON(LANDING_DRAFT_KEY, null);
    if(!d) return;
    $("leadName").value = d.leadName || "";
    $("leadPhone").value = d.leadPhone || "";
    $("leadType").value = d.leadType || "BUYER";
    $("leadLocality").value = d.leadLocality || "";
    $("budgetMin").value = d.budgetMin || "";
    $("budgetMax").value = d.budgetMax || "";
    $("leadNotes").value = d.leadNotes || "";
    $("leadConsent").checked = !!d.leadConsent;
    updateLeadPreview();
  }

  function clearLandingForm(){
    $("landingLeadForm").reset();
    $("landingLeadErr").hidden = true;
    localStorage.removeItem(LANDING_DRAFT_KEY);
    updateLeadPreview();
    toast("Lead form cleared");
  }

  function saveBrokerDraft(){
    const data = {
      brokerName: $("brokerName").value,
      brokerPhone: $("brokerPhone").value,
      brokerArea: $("brokerArea").value,
      brokerExp: $("brokerExp").value,
      brokerCompany: $("brokerCompany").value,
      brokerConsent: $("brokerConsent").checked
    };
    writeJSON(BROKER_DRAFT_KEY, data);
    toast("Broker draft saved");
  }

  function loadBrokerDraft(){
    const d = readJSON(BROKER_DRAFT_KEY, null);
    if(!d) return;
    $("brokerName").value = d.brokerName || "";
    $("brokerPhone").value = d.brokerPhone || "";
    $("brokerArea").value = d.brokerArea || "";
    $("brokerExp").value = d.brokerExp || "";
    $("brokerCompany").value = d.brokerCompany || "";
    $("brokerConsent").checked = !!d.brokerConsent;
    updateBrokerPreview();
  }

  function clearBrokerForm(){
    $("brokerJoinForm").reset();
    $("brokerErr").hidden = true;
    localStorage.removeItem(BROKER_DRAFT_KEY);
    updateBrokerPreview();
    toast("Broker form cleared");
  }

  function submitLandingLead(e){
    e.preventDefault();

    const err = $("landingLeadErr");
    err.hidden = true;
    err.textContent = "";

    const name = $("leadName").value.trim();
    const phone = $("leadPhone").value.trim();
    const type = $("leadType").value;
    const locality = $("leadLocality").value.trim();
    const budgetMin = $("budgetMin").value.trim();
    const budgetMax = $("budgetMax").value.trim();
    const notes = $("leadNotes").value.trim();
    const consent = $("leadConsent").checked;

    if(!name || !phone || !locality){
      err.hidden = false;
      err.textContent = "Name, phone, locality are required.";
      return;
    }
    if(!validatePhone(phone)){
      err.hidden = false;
      err.textContent = "Please enter a valid phone number.";
      return;
    }
    if(!consent){
      err.hidden = false;
      err.textContent = "Please agree to be contacted.";
      return;
    }

    const leads = getLeads();
    leads.unshift({
      id: uid(),
      createdAt: new Date().toISOString(),
      listingTitle: type === "BUYER" ? `Buyer Lead • ${locality}` : `Seller Lead • ${locality}`,
      listingId: "",
      buyerName: name,
      buyerPhone: phone,
      assignedTo: "",
      status: "NEW",
      followUp: "",
      notes: `Lead Type: ${type}
Locality: ${locality}
Budget: ${budgetMin || "-"} to ${budgetMax || "-"}
Notes: ${notes || "-"}`,
      message: `${type} enquiry from homepage`
    });
    saveLeads(leads);

    localStorage.removeItem(LANDING_DRAFT_KEY);
    $("landingLeadForm").reset();
    updateLeadPreview();
    toast("Lead submitted to CRM");
    refreshSmartStats();
  }

  function submitBrokerJoin(e){
    e.preventDefault();

    const err = $("brokerErr");
    err.hidden = true;
    err.textContent = "";

    const name = $("brokerName").value.trim();
    const phone = $("brokerPhone").value.trim();
    const area = $("brokerArea").value.trim();
    const exp = $("brokerExp").value.trim();
    const company = $("brokerCompany").value.trim();
    const consent = $("brokerConsent").checked;

    if(!name || !phone || !area){
      err.hidden = false;
      err.textContent = "Broker name, phone, area are required.";
      return;
    }
    if(!validatePhone(phone)){
      err.hidden = false;
      err.textContent = "Please enter a valid phone number.";
      return;
    }
    if(!consent){
      err.hidden = false;
      err.textContent = "Please agree to be contacted.";
      return;
    }

    const leads = getLeads();
    leads.unshift({
      id: uid(),
      createdAt: new Date().toISOString(),
      listingTitle: `Broker Verification • ${area}`,
      listingId: "",
      buyerName: name,
      buyerPhone: phone,
      assignedTo: "",
      status: "NEW",
      followUp: "",
      notes: `Broker join request
Primary Area: ${area}
Experience: ${exp || "-"}
Company: ${company || "-"}`,
      message: "Broker network request from homepage"
    });
    saveLeads(leads);

    localStorage.removeItem(BROKER_DRAFT_KEY);
    $("brokerJoinForm").reset();
    updateBrokerPreview();
    toast("Broker request saved to CRM");
    refreshSmartStats();
  }

  function setGuestMode(){
    $("publicNav").hidden = false;
    $("privateNav").hidden = true;
    $("welcomePanel").hidden = true;
    $("smart-workspace").hidden = true;
    $("publicBenefits").hidden = false;
    $("publicHeroActions").hidden = false;
    $("heroBadge").textContent = "Real Estate Operating Layer";
    $("heroTitle").innerHTML = 'Trust-first Real Estate.<br />Approved listings. Serious leads.';
    $("heroText").textContent =
      "Browse admin-approved listings, connect with verified brokers, post serious buyer or seller enquiries, and grow inventory through a clean real-estate pipeline.";
  }

  function setPrivateMode(user){
    $("publicNav").hidden = true;
    $("privateNav").hidden = false;
    $("welcomePanel").hidden = false;
    $("smart-workspace").hidden = false;
    $("publicBenefits").hidden = true;
    $("publicHeroActions").hidden = true;

    const role = String(user.role || "buyer").toUpperCase();
    $("rolePill").textContent = role;
    $("navLoginAs").textContent = `👤 ${user.name || "User"}`;

    $("welcomeTitle").textContent = `Welcome back, ${user.name || "User"} 👋`;
    $("welcomeText").textContent = "Your role-aware workspace is ready.";

    if(role === "BUYER"){
      $("heroBadge").textContent = "Buyer Workspace";
      $("heroTitle").innerHTML = 'Find the right property.<br />Move faster, with signal.';
      $("heroText").textContent = "Track approved listings, raise serious buying interest and move through a cleaner enquiry flow.";
      $("smartAction1").textContent = "Browse Listings";
      $("smartAction1").href = "listings.html";
      $("smartAction2").textContent = "Post Buyer Lead";
      $("smartAction2").href = "#lead";
      $("smartAction3").textContent = "My Buyer Page";
      $("smartAction3").href = "buyer.html";
    } else if(role === "SELLER"){
      $("heroBadge").textContent = "Seller Workspace";
      $("heroTitle").innerHTML = 'Bring inventory in.<br />Get seller-side momentum.';
      $("heroText").textContent = "Add new properties, enter approval flow and work the seller pipeline with clarity.";
      $("smartAction1").textContent = "Sell Property";
      $("smartAction1").href = "seller.html";
      $("smartAction2").textContent = "Browse Listings";
      $("smartAction2").href = "listings.html";
      $("smartAction3").textContent = "Post Seller Lead";
      $("smartAction3").href = "#lead";
    } else if(role === "BROKER"){
      $("heroBadge").textContent = "Broker Workspace";
      $("heroTitle").innerHTML = 'Broker network power.<br />More pipeline, less chaos.';
      $("heroText").textContent = "Work enquiries, connect inventory and move faster through broker-led property flow.";
      $("smartAction1").textContent = "Open Broker Network";
      $("smartAction1").href = "broker-network.html";
      $("smartAction2").textContent = "Browse Listings";
      $("smartAction2").href = "listings.html";
      $("smartAction3").textContent = "Post Lead";
      $("smartAction3").href = "#lead";
    } else {
      $("smartAction1").textContent = "Open Dashboard";
      $("smartAction1").href = "dashboard.html";
      $("smartAction2").textContent = "Open CRM";
      $("smartAction2").href = "crm.html";
      $("smartAction3").textContent = "Add Property";
      $("smartAction3").href = "add-property.html";
    }

    refreshSmartStats();
  }

  function refreshSmartStats(){
    const approved = approvedProps().length;
    const leads = getLeads().length;
    const brokers = getBrokers().length;

    $("smartStat1Value").textContent = approved;
    $("smartStat1Label").textContent = "Approved Listings";

    $("smartStat2Value").textContent = leads;
    $("smartStat2Label").textContent = "CRM Leads";

    $("smartStat3Value").textContent = brokers;
    $("smartStat3Label").textContent = "Brokers";
  }

  function bindSmartRole(user){
    const role = String(user?.role || "").toLowerCase();

    if(role === "buyer"){
      $("navDashboard").href = "buyer.html";
      $("navDashboard").textContent = "🏠 Buyer Page";
      $("navCRM").href = "#lead";
      $("navCRM").textContent = "📩 Post Lead";
      $("navAddProperty").href = "listings.html";
      $("navAddProperty").textContent = "📋 Browse Listings";
    } else if(role === "seller"){
      $("navDashboard").href = "seller.html";
      $("navDashboard").textContent = "🏷 Seller Page";
      $("navCRM").href = "#lead";
      $("navCRM").textContent = "📩 Seller Lead";
      $("navAddProperty").href = "seller.html";
      $("navAddProperty").textContent = "➕ Submit Property";
    } else if(role === "broker"){
      $("navDashboard").href = "broker-network.html";
      $("navDashboard").textContent = "🤝 Broker Network";
      $("navCRM").href = "#lead";
      $("navCRM").textContent = "📩 Lead Form";
      $("navAddProperty").href = "add-property.html";
      $("navAddProperty").textContent = "➕ Add Property";
    }
  }

  function clearFilters(){
    $("q").value = "";
    $("typeFilter").value = "";
    $("sortFilter").value = "NEWEST";
    renderListings();
    toast("Filters reset");
  }

  function handleLogout(){
    try{
      if(typeof logoutUser === "function"){
        logoutUser("login.html");
        return;
      }
    }catch(e){}
    localStorage.removeItem(CURRENT_USER_KEY);
    location.href = "login.html";
  }

  function maybeRedirectAdmin(user){
    const role = String(user?.role || "").toLowerCase();
    if(role === "admin"){
      location.href = "dashboard.html";
      return true;
    }
    return false;
  }

  function bindActions(){
    $("toastAct").addEventListener("click", handleToastAction);

    document.querySelectorAll("#landingLeadForm input, #landingLeadForm select, #landingLeadForm textarea")
      .forEach(el => el.addEventListener("input", updateLeadPreview));

    document.querySelectorAll("#brokerJoinForm input, #brokerJoinForm textarea")
      .forEach(el => el.addEventListener("input", updateBrokerPreview));

    $("landingLeadForm").addEventListener("submit", submitLandingLead);
    $("brokerJoinForm").addEventListener("submit", submitBrokerJoin);

    $("q").addEventListener("input", renderListings);
    $("typeFilter").addEventListener("change", renderListings);
    $("sortFilter").addEventListener("change", renderListings);

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if(!btn) return;
      const act = btn.getAttribute("data-action");

      if(act === "refreshListings") renderListings();
      else if(act === "clearFilters") clearFilters();
      else if(act === "saveLandingDraft") saveLandingDraft();
      else if(act === "clearLandingForm") clearLandingForm();
      else if(act === "saveBrokerDraft") saveBrokerDraft();
      else if(act === "clearBrokerForm") clearBrokerForm();
    });

    $("logoutBtn")?.addEventListener("click", handleLogout);
  }

  function init(){
    yearNow();
    updateLeadPreview();
    updateBrokerPreview();
    loadLandingDraft();
    loadBrokerDraft();
    bindActions();
    renderListings();

    const user = getCurrentUserSafe();
    if(user){
      if(maybeRedirectAdmin(user)) return;
      setPrivateMode(user);
      bindSmartRole(user);
    }else{
      setGuestMode();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

