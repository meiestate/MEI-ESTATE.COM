(() => {
  "use strict";

  requireRole(["admin"]);
  const currentUser = getCurrentUser();

  const WA_TEMPLATE_KEY = "mei_whatsapp_template_v2";
  let MODAL_LEAD_ID = null;
  let CACHE = { buyer: [], seller: [], material: [], service: [], properties: [], brokers: [] };

  const $ = id => document.getElementById(id);
  const $$ = sel => [...document.querySelectorAll(sel)];

  const localAdapter = {
    async getProperties() { return (typeof getAllProperties === "function" ? getAllProperties() : []).map(x => ({ ...x })); },
    async saveProperties(items) { if (typeof saveAllProperties === "function") saveAllProperties(items); return true; },
    async getBuyerLeads() { return (typeof getAllLeads === "function" ? getAllLeads() : []).map(x => ({ ...x })); },
    async saveBuyerLeads(items) { if (typeof saveAllLeads === "function") saveAllLeads(items); return true; },
    async getSellerLeads() { return (typeof getSellerLeads === "function" ? getSellerLeads() : []).map(x => ({ ...x })); },
    async saveSellerLeads(items) { if (typeof saveSellerLeads === "function") saveSellerLeads(items); return true; },
    async getMaterialLeads() { return (typeof getMaterialLeads === "function" ? getMaterialLeads() : []).map(x => ({ ...x })); },
    async saveMaterialLeads(items) { if (typeof saveMaterialLeads === "function") saveMaterialLeads(items); return true; },
    async getServiceLeads() { return (typeof getServiceLeads === "function" ? getServiceLeads() : []).map(x => ({ ...x })); },
    async saveServiceLeads(items) { if (typeof saveServiceLeads === "function") saveServiceLeads(items); return true; },
    async getBrokers() { return (typeof getAllBrokers === "function" ? getAllBrokers() : []).map(x => ({ ...x })); },
    async saveBrokers(items) { if (typeof saveAllBrokers === "function") saveAllBrokers(items); return true; },
    async seed() { if (typeof seedData === "function") seedData(); return true; },
    async clear() { if (typeof clearAllMeiData === "function") clearAllMeiData(); return true; },
    async addBroker(broker) {
      if (typeof addBroker === "function") {
        const ok = addBroker(broker);
        if (!ok) throw new Error("Broker already exists");
        return true;
      }
      return false;
    }
  };

  const api = window.MEI_API || localAdapter;

  function esc(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString("en-IN");
  }

  function todayYMD() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function tomorrowYMD() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  function normalizeStatus(value, fallback = "NEW") {
    return String(value || fallback).trim().toUpperCase();
  }

  function normalizePhone(phone) {
    return String(phone || "").replace(/\D/g, "").slice(-10);
  }

  function formatWA(phone) {
    const p = normalizePhone(phone);
    return p.length === 10 ? "91" + p : p;
  }

  function cleanNumber(v) {
    return Number(String(v ?? "").replace(/[^\d.]/g, "")) || 0;
  }

  function showToast(msg, type = "success") {
    const stack = $("toastStack");
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateY(6px)"; }, 2200);
    setTimeout(() => el.remove(), 2700);
  }

  function defaultTemplate() {
    return `Hello {buyer},

Thanks for your interest in "{listing}".

This is MEI Estate. Please share your preferred time to discuss today.

- MEI`;
  }

  function getTemplate() { return localStorage.getItem(WA_TEMPLATE_KEY) || defaultTemplate(); }
  function setTemplate(v) { localStorage.setItem(WA_TEMPLATE_KEY, v); }

  function updateTemplatePreview() {
    const tpl = $("waTemplate").value.trim() || defaultTemplate();
    $("waPreview").textContent = tpl
      .replaceAll("{buyer}", "Arun")
      .replaceAll("{listing}", "2BHK Whitefield")
      .replaceAll("{phone}", "9876543210")
      .replaceAll("{date}", new Date().toLocaleDateString("en-IN"));
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (_) { return false; }
  }

  function statusPill(status) {
    const s = normalizeStatus(status, "NEW");
    return `<span class="status ${esc(s)}">${esc(s)}</span>`;
  }

  function openSection(key) {
    $$(".section").forEach(x => x.classList.remove("active"));
    $$(".navBtn[data-section]").forEach(x => x.classList.remove("active"));
    $(`section-${key}`)?.classList.add("active");
    document.querySelector(`.navBtn[data-section="${key}"]`)?.classList.add("active");
  }

  function propertyBits(p) {
    return [p.city, p.area, p.type, p.bhk, p.sqft ? `${p.sqft} sqft` : "", p.price ? `₹${Number(cleanNumber(p.price)).toLocaleString("en-IN")}` : ""]
      .filter(Boolean).join(" • ");
  }

  function isBuyerOverdue(lead) {
    if (["CLOSED", "ARCHIVED"].includes(normalizeStatus(lead.status))) return false;
    if (!lead.followUp) return false;
    return String(lead.followUp) < todayYMD();
  }

  function buildBuyerWA(lead) {
    return getTemplate()
      .replaceAll("{buyer}", lead.buyerName || "")
      .replaceAll("{listing}", lead.listingTitle || "property")
      .replaceAll("{phone}", lead.buyerPhone || "")
      .replaceAll("{date}", new Date().toLocaleDateString("en-IN"));
  }

  async function loadAll() {
    CACHE.properties = await api.getProperties();
    CACHE.buyer = await api.getBuyerLeads();
    CACHE.seller = await api.getSellerLeads();
    CACHE.material = await api.getMaterialLeads();
    CACHE.service = await api.getServiceLeads();
    CACHE.brokers = await api.getBrokers();
  }

  function renderSidebarCounts() {
    $("navPendingCount").textContent = `${CACHE.properties.filter(x => x.status === "pending").length} pending`;
    $("navBuyerCount").textContent = `${CACHE.buyer.length} leads`;
    $("navSellerCount").textContent = `${CACHE.seller.length} leads`;
    $("navMaterialCount").textContent = `${CACHE.material.length} leads`;
    $("navServiceCount").textContent = `${CACHE.service.length} leads`;
  }

  function renderKpis() {
    const kpis = [
      { label: "Pending Properties", value: CACHE.properties.filter(x => x.status === "pending").length, hint: "Need moderation" },
      { label: "Approved Properties", value: CACHE.properties.filter(x => x.status === "approved").length, hint: "Public live" },
      { label: "Buyer Leads", value: CACHE.buyer.length, hint: "Demand side" },
      { label: "Seller Leads", value: CACHE.seller.length, hint: "Supply side" },
      { label: "Materials Leads", value: CACHE.material.length, hint: "Commerce add-on" },
      { label: "Service Leads", value: CACHE.service.length, hint: "Vendor funnel" }
    ];

    $("kpiGrid").innerHTML = kpis.map(k => `
      <div class="card statCard">
        <div class="statTop"><div class="statLabel">${esc(k.label)}</div><span class="delta">${esc(k.hint)}</span></div>
        <div class="statValue">${esc(k.value)}</div>
      </div>
    `).join("");
  }

  function renderDashboard() {
    const pending = CACHE.properties.filter(x => x.status === "pending").slice(0, 6);
    $("dashPendingPill").textContent = CACHE.properties.filter(x => x.status === "pending").length;
    $("dashPendingBody").innerHTML = pending.length ? pending.map(p => `
      <tr>
        <td><div class="rowTitle">${esc(p.title || "Listing")}</div><div class="rowMeta">${esc(propertyBits(p) || "—")}</div></td>
        <td>${statusPill(p.status || "pending")}</td>
        <td><div class="rowActions"><button class="btn small success" data-approve-prop="${esc(p.id)}">Approve</button><button class="btn small warn" data-archive-prop="${esc(p.id)}">Archive</button></div></td>
      </tr>
    `).join("") : `<tr><td colspan="3" class="empty">No pending approvals.</td></tr>`;

    const overdue = CACHE.buyer.filter(isBuyerOverdue).slice(0, 6);
    $("dashOverdueBody").innerHTML = overdue.length ? overdue.map(l => `
      <tr>
        <td><div class="rowTitle">${esc(l.buyerName || "-")}</div><div class="rowMeta">${esc(l.buyerPhone || "-")}</div></td>
        <td>${esc(l.listingTitle || "-")}</td>
        <td>${esc(l.followUp || "—")}</td>
        <td><div class="rowActions"><button class="btn small" data-edit-buyer="${esc(l.id)}">Edit</button><button class="btn small success" data-wa-buyer="${esc(l.id)}">WhatsApp</button></div></td>
      </tr>
    `).join("") : `<tr><td colspan="4" class="empty">No overdue follow-ups.</td></tr>`;

    const health = [
      ["Live brokers", CACHE.brokers.length],
      ["Unassigned buyer leads", CACHE.buyer.filter(x => !x.assignedTo).length],
      ["Approval queue load", CACHE.properties.filter(x => x.status === "pending").length],
      ["Closed buyer leads", CACHE.buyer.filter(x => normalizeStatus(x.status) === "CLOSED").length],
      ["Doc pending sellers", CACHE.seller.filter(x => normalizeStatus(x.status) === "DOCUMENT_PENDING").length],
    ];

    $("healthList").innerHTML = health.map(([label, value]) => `<div class="kpiRow"><div class="kpiLabel">${esc(label)}</div><div class="kpiValue">${esc(value)}</div></div>`).join("");

    const alloc = CACHE.brokers.map(b => ({ name: b.name, count: CACHE.buyer.filter(x => x.assignedTo === b.name).length }));
    $("brokerAllocation").innerHTML = alloc.length ? alloc.map(x => `<div class="kpiRow"><div class="kpiLabel">${esc(x.name)}</div><div class="kpiValue">${esc(x.count)} leads</div></div>`).join("") : `<div class="empty">No brokers added yet.</div>`;
  }

  function populatePropertyCityFilter() {
    const cities = [...new Set(CACHE.properties.map(x => x.city).filter(Boolean))];
    const sel = $("propertyCityFilter");
    const current = sel.value || "ALL";
    sel.innerHTML = `<option value="ALL">All Cities</option>` + cities.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join("");
    if ([...sel.options].some(o => o.value === current)) sel.value = current;
  }

  function renderProperties() {
    populatePropertyCityFilter();
    const q = $("propertySearch").value.trim().toLowerCase();
    const s = $("propertyStatusFilter").value;
    const city = $("propertyCityFilter").value;

    let rows = CACHE.properties.filter(p => [p.title, p.city, p.area, p.type, p.brokerName, p.sellerName, p.sellerPhone].join(" ").toLowerCase().includes(q));
    if (s !== "ALL") rows = rows.filter(p => String(p.status) === s);
    if (city !== "ALL") rows = rows.filter(p => p.city === city);

    $("propertiesPendingCount").textContent = CACHE.properties.filter(x => x.status === "pending").length;
    $("propertiesApprovedCount").textContent = CACHE.properties.filter(x => x.status === "approved").length;

    $("propertiesBody").innerHTML = rows.length ? rows.map(p => `
      <tr>
        <td>
          <div class="rowTitle">${esc(p.title || "Listing")}</div>
          <div class="rowMeta">${esc(propertyBits(p) || "—")}</div>
          <div class="rowMeta">ID: ${esc(p.id)}</div>
        </td>
        <td>
          <div class="rowTitle">${esc(p.brokerName || p.sellerName || "—")}</div>
          <div class="rowMeta">${esc(p.sellerPhone || p.phone || "—")}</div>
        </td>
        <td>${statusPill(p.status || "pending")}</td>
        <td>${esc(fmtDate(p.createdAt))}</td>
        <td>
          <div class="rowActions">
            <button class="btn small success" data-approve-prop="${esc(p.id)}">Approve</button>
            <button class="btn small warn" data-archive-prop="${esc(p.id)}">Archive</button>
            <button class="btn small danger" data-reject-prop="${esc(p.id)}">Reject</button>
            <button class="btn small danger" data-delete-prop="${esc(p.id)}">Delete</button>
          </div>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="5" class="empty">No properties match the current filters.</td></tr>`;
  }

  function syncBrokerOptions() {
    const brokerFilter = $("buyerBrokerFilter");
    const current = brokerFilter.value || "ALL";
    brokerFilter.innerHTML = `<option value="ALL">All Brokers</option><option value="__UNASSIGNED__">Unassigned</option>` + CACHE.brokers.map(b => `<option value="${esc(b.name)}">${esc(b.name)}</option>`).join("");
    if ([...brokerFilter.options].some(o => o.value === current)) brokerFilter.value = current;

    const assigned = $("mAssigned");
    const currentAssigned = assigned.value || "";
    assigned.innerHTML = `<option value="">Unassigned</option>` + CACHE.brokers.map(b => `<option value="${esc(b.name)}">${esc(b.name)}</option>`).join("");
    if ([...assigned.options].some(o => o.value === currentAssigned)) assigned.value = currentAssigned;
  }

  function renderBrokers() {
    $("brokerChips").innerHTML = CACHE.brokers.length ? CACHE.brokers.map(b => `
      <span class="chip">
        <span>${esc(b.name)}</span>
        <span class="rowMeta">${esc([b.city, b.area].filter(Boolean).join(" • "))}</span>
        <button class="btn small danger" data-delete-broker="${esc(b.name)}">✕</button>
      </span>
    `).join("") : `<div class="empty">No brokers added yet.</div>`;
    syncBrokerOptions();
  }

  function renderBuyerLeads() {
    const q = $("buyerSearch").value.trim().toLowerCase();
    const broker = $("buyerBrokerFilter").value;
    const status = $("buyerStatusFilter").value;
    const overdue = $("buyerOverdueFilter").value;

    let rows = CACHE.buyer.filter(l => [l.listingTitle, l.listingId, l.buyerName, l.buyerPhone, l.notes, l.message, l.assignedTo].join(" ").toLowerCase().includes(q));
    rows = rows.filter(l => broker === "ALL" ? true : broker === "__UNASSIGNED__" ? !l.assignedTo : l.assignedTo === broker);
    rows = rows.filter(l => status === "ALL" ? true : normalizeStatus(l.status) === status);
    rows = rows.filter(l => overdue === "ALL" ? true : overdue === "OVERDUE" ? isBuyerOverdue(l) : !isBuyerOverdue(l));
    $("buyerLeadCount").textContent = rows.length;

    $("buyerLeadsBody").innerHTML = rows.length ? rows.map(l => {
      const assignOptions = [`<option value="">Unassigned</option>`]
        .concat(CACHE.brokers.map(b => `<option value="${esc(b.name)}" ${l.assignedTo === b.name ? "selected" : ""}>${esc(b.name)}</option>`))
        .join("");

      return `
        <tr ${isBuyerOverdue(l) ? 'style="background:linear-gradient(90deg, rgba(255,77,122,.10), transparent 50%)"' : ""}>
          <td>${esc(fmtDate(l.createdAt))}</td>
          <td><div class="rowTitle">${esc(l.listingTitle || "Listing")}</div><div class="rowMeta">ID: ${esc(l.listingId || "-")}</div></td>
          <td>${esc(l.buyerName || "-")}</td>
          <td>${esc(l.buyerPhone || "-")}</td>
          <td><select data-assign-buyer="${esc(l.id)}">${assignOptions}</select></td>
          <td>${statusPill(l.status || "NEW")}</td>
          <td>${esc(l.followUp || "—")}</td>
          <td>${esc(l.notes || "—")}</td>
          <td>
            <div class="rowActions">
              <a class="btn small" href="tel:${encodeURIComponent(l.buyerPhone || "")}">📞 Call</a>
              <button class="btn small success" data-wa-buyer="${esc(l.id)}">💬 WhatsApp</button>
              <button class="btn small" data-edit-buyer="${esc(l.id)}">✏ Edit</button>
              <button class="btn small warn" data-status-buyer="${esc(l.id)}" data-next="CONTACTED">Contacted</button>
              <button class="btn small success" data-status-buyer="${esc(l.id)}" data-next="CLOSED">Close</button>
            </div>
          </td>
        </tr>
        ${l.message ? `<tr><td></td><td colspan="8" class="rowMeta">📝 ${esc(l.message)}</td></tr>` : ""}
      `;
    }).join("") : `<tr><td colspan="9" class="empty">No buyer leads match your filters.</td></tr>`;
  }

  function buildSelectOptions(values, first = "All") {
    return `<option value="ALL">${esc(first)}</option>` + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
  }

  function renderSellerFilters() {
    const sellerTypes = [...new Set(CACHE.seller.map(x => x.sellerType).filter(Boolean))];
    const propertyTypes = [...new Set(CACHE.seller.map(x => x.propertyType).filter(Boolean))];
    $("sellerTypeFilter").innerHTML = buildSelectOptions(sellerTypes, "All Seller Types");
    $("sellerPropertyTypeFilter").innerHTML = buildSelectOptions(propertyTypes, "All Property Types");
  }

  function renderSellerLeads() {
    renderSellerFilters();
    const q = $("sellerSearch").value.trim().toLowerCase();
    const s = $("sellerStatusFilter").value;
    const st = $("sellerTypeFilter").value;
    const pt = $("sellerPropertyTypeFilter").value;

    let rows = CACHE.seller.filter(x => [x.sellerName, x.phone, x.sellerType, x.propertyType, x.listingTitle, x.city, x.area, x.notes, x.expectedPrice].join(" ").toLowerCase().includes(q));
    rows = rows.filter(x => s === "ALL" ? true : normalizeStatus(x.status) === s);
    rows = rows.filter(x => st === "ALL" ? true : x.sellerType === st);
    rows = rows.filter(x => pt === "ALL" ? true : x.propertyType === pt);

    $("sellerLeadCount").textContent = rows.length;
    $("sellerLeadsBody").innerHTML = rows.length ? rows.map(x => `
      <tr>
        <td>${esc(fmtDate(x.createdAt))}</td>
        <td><div class="rowTitle">${esc(x.sellerName || "-")}</div><div class="rowMeta">${esc(x.sellerType || "")}</div></td>
        <td>${esc(x.phone || "-")}</td>
        <td><div class="rowTitle">${esc(x.listingTitle || "-")}</div><div class="rowMeta">${esc(x.urgency || "")}</div></td>
        <td>${esc(x.propertyType || "-")}</td>
        <td>${esc([x.city, x.area].filter(Boolean).join(" • ") || "-")}</td>
        <td>${esc(x.expectedPrice ? "₹" + Number(cleanNumber(x.expectedPrice)).toLocaleString("en-IN") : "—")}</td>
        <td>${esc(x.documentsReady || "—")}</td>
        <td>${statusPill(x.status || "NEW")}</td>
        <td>
          <div class="rowActions">
            <a class="btn small" href="tel:${encodeURIComponent(x.phone || "")}">📞 Call</a>
            <a class="btn small success" href="https://wa.me/${formatWA(x.phone)}" target="_blank">💬 WA</a>
            <button class="btn small warn" data-status-seller="${esc(x.id)}" data-next="CONTACTED">Contacted</button>
            <button class="btn small" data-status-seller="${esc(x.id)}" data-next="DOCUMENT_PENDING">Docs</button>
            <button class="btn small" data-status-seller="${esc(x.id)}" data-next="PROPERTY_RECEIVED">Received</button>
            <button class="btn small success" data-status-seller="${esc(x.id)}" data-next="APPROVED">Approve</button>
            <button class="btn small danger" data-status-seller="${esc(x.id)}" data-next="ARCHIVED">Archive</button>
          </div>
        </td>
      </tr>
      ${x.notes ? `<tr><td></td><td colspan="9" class="rowMeta">📝 ${esc(x.notes)}</td></tr>` : ""}
    `).join("") : `<tr><td colspan="10" class="empty">No seller leads match your filters.</td></tr>`;
  }

  function renderMaterialFilters() {
    $("materialTypeFilter").innerHTML = buildSelectOptions([...new Set(CACHE.material.map(x => x.materialType).filter(Boolean))], "All Materials");
    $("materialCustomerFilter").innerHTML = buildSelectOptions([...new Set(CACHE.material.map(x => x.customerType).filter(Boolean))], "All Customer Types");
  }

  function renderMaterialLeads() {
    renderMaterialFilters();
    const q = $("materialSearch").value.trim().toLowerCase();
    const s = $("materialStatusFilter").value;
    const t = $("materialTypeFilter").value;
    const c = $("materialCustomerFilter").value;

    let rows = CACHE.material.filter(x => [x.name, x.phone, x.materialType, x.location, x.notes, x.quantity, x.budget].join(" ").toLowerCase().includes(q));
    rows = rows.filter(x => s === "ALL" ? true : normalizeStatus(x.status) === s);
    rows = rows.filter(x => t === "ALL" ? true : x.materialType === t);
    rows = rows.filter(x => c === "ALL" ? true : x.customerType === c);

    $("materialLeadCount").textContent = rows.length;
    $("materialLeadsBody").innerHTML = rows.length ? rows.map(x => `
      <tr>
        <td>${esc(fmtDate(x.createdAt))}</td>
        <td><div class="rowTitle">${esc(x.name || "-")}</div><div class="rowMeta">${esc(x.customerType || "")}</div></td>
        <td>${esc(x.phone || "-")}</td>
        <td><div class="rowTitle">${esc(x.materialType || "-")}</div><div class="rowMeta">${esc(x.requiredDate || "")}</div></td>
        <td>${esc((x.quantity || "") + (x.unit ? " " + x.unit : ""))}</td>
        <td>${esc(x.location || "-")}</td>
        <td>${esc(x.budget || "—")}</td>
        <td>${statusPill(x.status || "NEW")}</td>
        <td><div class="rowActions"><a class="btn small" href="tel:${encodeURIComponent(x.phone || "")}">📞 Call</a><a class="btn small success" href="https://wa.me/${formatWA(x.phone)}" target="_blank">💬 WA</a><button class="btn small warn" data-status-material="${esc(x.id)}" data-next="CONTACTED">Contacted</button><button class="btn small success" data-status-material="${esc(x.id)}" data-next="CLOSED">Close</button><button class="btn small danger" data-status-material="${esc(x.id)}" data-next="ARCHIVED">Archive</button></div></td>
      </tr>
      ${x.notes ? `<tr><td></td><td colspan="8" class="rowMeta">📝 ${esc(x.notes)}</td></tr>` : ""}
    `).join("") : `<tr><td colspan="9" class="empty">No material leads match your filters.</td></tr>`;
  }

  function renderServiceFilters() {
    $("serviceTypeFilter").innerHTML = buildSelectOptions([...new Set(CACHE.service.map(x => x.serviceType).filter(Boolean))], "All Services");
    $("serviceCustomerFilter").innerHTML = buildSelectOptions([...new Set(CACHE.service.map(x => x.customerType).filter(Boolean))], "All Customer Types");
  }

  function renderServiceLeads() {
    renderServiceFilters();
    const q = $("serviceSearch").value.trim().toLowerCase();
    const s = $("serviceStatusFilter").value;
    const t = $("serviceTypeFilter").value;
    const c = $("serviceCustomerFilter").value;

    let rows = CACHE.service.filter(x => [x.name, x.phone, x.serviceType, x.location, x.notes, x.propertyType, x.budget].join(" ").toLowerCase().includes(q));
    rows = rows.filter(x => s === "ALL" ? true : normalizeStatus(x.status) === s);
    rows = rows.filter(x => t === "ALL" ? true : x.serviceType === t);
    rows = rows.filter(x => c === "ALL" ? true : x.customerType === c);

    $("serviceLeadCount").textContent = rows.length;
    $("serviceLeadsBody").innerHTML = rows.length ? rows.map(x => `
      <tr>
        <td>${esc(fmtDate(x.createdAt))}</td>
        <td><div class="rowTitle">${esc(x.name || "-")}</div><div class="rowMeta">${esc(x.customerType || "")}</div></td>
        <td>${esc(x.phone || "-")}</td>
        <td><div class="rowTitle">${esc(x.serviceType || "-")}</div><div class="rowMeta">${esc(x.priority || "")}</div></td>
        <td>${esc(x.propertyType || "-")}</td>
        <td>${esc(x.location || "-")}</td>
        <td>${esc(x.budget || "—")}</td>
        <td>${statusPill(x.status || "NEW")}</td>
        <td><div class="rowActions"><a class="btn small" href="tel:${encodeURIComponent(x.phone || "")}">📞 Call</a><a class="btn small success" href="https://wa.me/${formatWA(x.phone)}" target="_blank">💬 WA</a><button class="btn small warn" data-status-service="${esc(x.id)}" data-next="CONTACTED">Contacted</button><button class="btn small success" data-status-service="${esc(x.id)}" data-next="CLOSED">Close</button><button class="btn small danger" data-status-service="${esc(x.id)}" data-next="ARCHIVED">Archive</button></div></td>
      </tr>
      ${x.notes ? `<tr><td></td><td colspan="8" class="rowMeta">📝 ${esc(x.notes)}</td></tr>` : ""}
    `).join("") : `<tr><td colspan="9" class="empty">No service leads match your filters.</td></tr>`;
  }

  function renderAll() {
    renderSidebarCounts();
    renderKpis();
    renderDashboard();
    renderBrokers();
    renderProperties();
    renderBuyerLeads();
    renderSellerLeads();
    renderMaterialLeads();
    renderServiceLeads();
    $("waTemplate").value = getTemplate();
    updateTemplatePreview();
  }

  async function savePropertyStatus(id, status) {
    const list = [...CACHE.properties];
    const idx = list.findIndex(x => String(x.id) === String(id));
    if (idx === -1) return;
    list[idx].status = status;
    list[idx].updatedAt = new Date().toISOString();
    if (status === "approved") list[idx].approvedAt = new Date().toISOString();
    await api.saveProperties(list);
    await refresh();
    showToast(`Property ${status}`, status === "approved" ? "success" : "warn");
  }

  async function deleteProperty(id) {
    if (!confirm("இந்த listing permanent delete செய்யவா?")) return;
    const list = CACHE.properties.filter(x => String(x.id) !== String(id));
    await api.saveProperties(list);
    await refresh();
    showToast("Property deleted", "warn");
  }

  async function saveBuyerLead(id, patch) {
    const list = [...CACHE.buyer];
    const idx = list.findIndex(x => String(x.id) === String(id));
    if (idx === -1) return;
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    await api.saveBuyerLeads(list);
    await refresh();
    showToast("Buyer lead updated");
  }

  async function saveSellerLead(id, patch) {
    const list = [...CACHE.seller];
    const idx = list.findIndex(x => String(x.id) === String(id));
    if (idx === -1) return;
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    await api.saveSellerLeads(list);
    await refresh();
    showToast("Seller lead updated");
  }

  async function saveMaterialLead(id, patch) {
    const list = [...CACHE.material];
    const idx = list.findIndex(x => String(x.id) === String(id));
    if (idx === -1) return;
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    await api.saveMaterialLeads(list);
    await refresh();
    showToast("Material lead updated");
  }

  async function saveServiceLead(id, patch) {
    const list = [...CACHE.service];
    const idx = list.findIndex(x => String(x.id) === String(id));
    if (idx === -1) return;
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    await api.saveServiceLeads(list);
    await refresh();
    showToast("Service lead updated");
  }

  function openLeadModal(id) {
    const lead = CACHE.buyer.find(x => String(x.id) === String(id));
    if (!lead) return;
    MODAL_LEAD_ID = id;
    syncBrokerOptions();
    $("modalLeadMeta").textContent = `${lead.listingTitle || "Listing"} • ${lead.buyerName || "-"} • ${lead.buyerPhone || "-"}`;
    $("mFollowUp").value = lead.followUp || "";
    $("mAssigned").value = lead.assignedTo || "";
    $("mStatus").value = normalizeStatus(lead.status, "NEW");
    $("mNotes").value = lead.notes || "";
    $("leadModalBack").hidden = false;
  }

  function closeLeadModal() {
    MODAL_LEAD_ID = null;
    $("leadModalBack").hidden = true;
  }

  async function addBrokerAction() {
    const payload = {
      name: $("brokerName").value.trim(),
      city: $("brokerCity").value.trim(),
      area: $("brokerArea").value.trim(),
      company: $("brokerCompany").value.trim() || "MEI Associate"
    };
    if (!payload.name) {
      alert("Broker name enter பண்ணுங்கள்");
      return;
    }
    try {
      await api.addBroker(payload);
      $("brokerName").value = "";
      $("brokerCity").value = "";
      $("brokerArea").value = "";
      $("brokerCompany").value = "";
      await refresh();
      showToast("Broker added");
    } catch (err) {
      alert(err.message || "Unable to add broker");
    }
  }

  async function deleteBrokerAction(name) {
    if (!confirm(`Delete broker "${name}"?`)) return;
    const next = CACHE.brokers.filter(x => x.name !== name);
    await api.saveBrokers(next);
    const buyers = CACHE.buyer.map(l => l.assignedTo === name ? { ...l, assignedTo: "", assignedBrokerName: "" } : l);
    await api.saveBuyerLeads(buyers);
    await refresh();
    showToast("Broker removed", "warn");
  }

  function exportCSV(filename, rows, mapper) {
    if (!rows.length) { alert("Export செய்ய data இல்லை"); return; }
    const mapped = rows.map(mapper);
    const headers = Object.keys(mapped[0]);
    const csv = [headers.join(","), ...mapped.map(obj => headers.map(h => `"${String(obj[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`CSV exported: ${filename}`);
  }

  async function refresh() {
    await loadAll();
    renderAll();
  }

  function bindNav() {
    $$("[data-section]").forEach(btn => btn.addEventListener("click", () => openSection(btn.dataset.section)));
    $$("[data-goto]").forEach(btn => btn.addEventListener("click", () => openSection(btn.dataset.goto)));
  }

  function bindInputs() {
    ["propertySearch", "propertyStatusFilter", "propertyCityFilter"].forEach(id => $(id).addEventListener("input", renderProperties));
    ["buyerSearch", "buyerBrokerFilter", "buyerStatusFilter", "buyerOverdueFilter"].forEach(id => $(id).addEventListener("input", renderBuyerLeads));
    ["sellerSearch", "sellerStatusFilter", "sellerTypeFilter", "sellerPropertyTypeFilter"].forEach(id => $(id).addEventListener("input", renderSellerLeads));
    ["materialSearch", "materialStatusFilter", "materialTypeFilter", "materialCustomerFilter"].forEach(id => $(id).addEventListener("input", renderMaterialLeads));
    ["serviceSearch", "serviceStatusFilter", "serviceTypeFilter", "serviceCustomerFilter"].forEach(id => $(id).addEventListener("input", renderServiceLeads));
    $("waTemplate").addEventListener("input", updateTemplatePreview);

    $$("[data-insert]").forEach(btn => btn.addEventListener("click", () => {
      const ta = $("waTemplate");
      const insert = btn.dataset.insert;
      const start = ta.selectionStart ?? ta.value.length;
      const end = ta.selectionEnd ?? ta.value.length;
      ta.value = ta.value.slice(0, start) + insert + ta.value.slice(end);
      ta.focus();
      ta.setSelectionRange(start + insert.length, start + insert.length);
      updateTemplatePreview();
    }));

    $("brokerName").addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        addBrokerAction();
      }
    });

    $("leadModalBack").addEventListener("mousedown", e => {
      if (e.target === $("leadModalBack")) closeLeadModal();
    });
  }

  function bindActions() {
    document.addEventListener("click", async e => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (action) {
        if (action === "refresh") await refresh();

        if (action === "syncDemo") {
          await api.seed();
          await refresh();
          showToast("Demo data seeded");
        }

        if (action === "resetDemo") {
          const typed = prompt("RESET என்று type பண்ணுங்கள்");
          if (String(typed || "").trim().toUpperCase() !== "RESET") {
            showToast("Reset cancelled", "warn");
            return;
          }
          await api.clear();
          await api.seed();
          await refresh();
          showToast("Demo data reset", "warn");
        }

        if (action === "seedBrokers") {
          if (CACHE.brokers.length) {
            showToast("Brokers already available", "warn");
            return;
          }
          await api.saveBrokers([
            { name: "Raj", city: "Bangalore", area: "Whitefield", company: "MEI Associate" },
            { name: "Karthik", city: "Bangalore", area: "Hoodi", company: "MEI Associate" },
            { name: "Priya", city: "Bangalore", area: "Sarjapur", company: "MEI Associate" }
          ]);
          await refresh();
          showToast("Demo brokers seeded");
        }

        if (action === "addBroker") await addBrokerAction();

        if (action === "saveTemplate") {
          const val = $("waTemplate").value.trim();
          if (!val) return alert("Template empty ஆக இருக்கக்கூடாது");
          setTemplate(val);
          updateTemplatePreview();
          showToast("Template saved");
        }

        if (action === "resetTemplate") {
          setTemplate(defaultTemplate());
          $("waTemplate").value = getTemplate();
          updateTemplatePreview();
          showToast("Template reset", "warn");
        }

        if (action === "copyTemplatePreview") {
          const ok = await copyText($("waPreview").textContent || "");
          showToast(ok ? "Preview copied" : "Copy failed", ok ? "success" : "danger");
        }

        if (action === "closeLeadModal") closeLeadModal();

        if (action === "saveLeadModal" && MODAL_LEAD_ID) {
          await saveBuyerLead(MODAL_LEAD_ID, {
            followUp: $("mFollowUp").value || "",
            followUpDate: $("mFollowUp").value || "",
            assignedTo: $("mAssigned").value || "",
            assignedBrokerName: $("mAssigned").value || "",
            status: $("mStatus").value || "NEW",
            notes: $("mNotes").value.trim()
          });
          closeLeadModal();
        }

        if (action === "exportBuyer") exportCSV("MEI_Buyer_Leads.csv", CACHE.buyer, x => ({
          createdAt: fmtDate(x.createdAt), listingTitle: x.listingTitle, listingId: x.listingId, buyerName: x.buyerName,
          buyerPhone: x.buyerPhone, assignedTo: x.assignedTo, status: x.status, followUp: x.followUp, notes: x.notes, message: x.message
        }));

        if (action === "exportSeller") exportCSV("MEI_Seller_Leads.csv", CACHE.seller, x => ({
          createdAt: fmtDate(x.createdAt), sellerName: x.sellerName, phone: x.phone, sellerType: x.sellerType, propertyType: x.propertyType,
          listingTitle: x.listingTitle, city: x.city, area: x.area, expectedPrice: x.expectedPrice, urgency: x.urgency,
          documentsReady: x.documentsReady, status: x.status, notes: x.notes
        }));

        if (action === "exportMaterial") exportCSV("MEI_Material_Leads.csv", CACHE.material, x => ({
          createdAt: fmtDate(x.createdAt), name: x.name, phone: x.phone, materialType: x.materialType, quantity: x.quantity,
          unit: x.unit, location: x.location, budget: x.budget, customerType: x.customerType, status: x.status, notes: x.notes
        }));

        if (action === "exportService") exportCSV("MEI_Service_Leads.csv", CACHE.service, x => ({
          createdAt: fmtDate(x.createdAt), name: x.name, phone: x.phone, serviceType: x.serviceType, propertyType: x.propertyType,
          location: x.location, budget: x.budget, customerType: x.customerType, preferredDate: x.preferredDate,
          priority: x.priority, status: x.status, notes: x.notes
        }));

        if (action === "exportProperties") exportCSV("MEI_Properties.csv", CACHE.properties, x => ({
          createdAt: fmtDate(x.createdAt), id: x.id, title: x.title, city: x.city, area: x.area, type: x.type,
          bhk: x.bhk, sqft: x.sqft, price: x.price, brokerName: x.brokerName, sellerPhone: x.sellerPhone,
          status: x.status, approvedAt: fmtDate(x.approvedAt)
        }));

        if (action === "bulkTodayFollowup") {
          const unplanned = CACHE.buyer
            .filter(x => !x.followUp && !["CLOSED", "ARCHIVED"].includes(normalizeStatus(x.status)))
            .map(x => ({ ...x, followUp: todayYMD(), followUpDate: todayYMD() }));

          const closed = CACHE.buyer.filter(x => x.followUp || ["CLOSED", "ARCHIVED"].includes(normalizeStatus(x.status)));
          await api.saveBuyerLeads([...closed, ...unplanned].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
          await refresh();
          showToast("Today follow-up set for open leads");
        }

        if (action === "createPropertyFromSeller") {
          const lead = CACHE.seller.find(x => normalizeStatus(x.status) === "APPROVED");
          if (!lead) { alert("முதல் approved seller lead ஒன்று இருக்க வேண்டும்"); return; }

          const exists = CACHE.properties.some(p => p.sellerLeadId === lead.id);
          if (exists) { alert("இந்த seller lead-க்கு property already create ஆகி விட்டது"); return; }

          const next = [...CACHE.properties, {
            id: "PROP-" + Date.now(),
            sellerLeadId: lead.id,
            title: lead.listingTitle || `${lead.propertyType || "Property"} - ${lead.area || lead.city || ""}`,
            city: lead.city || "",
            area: lead.area || "",
            type: lead.propertyType || "",
            bhk: lead.bhk || "",
            sqft: lead.sqft || "",
            price: lead.expectedPrice || "",
            sellerName: lead.sellerName || "",
            sellerPhone: lead.phone || "",
            brokerName: lead.assignedTo || "",
            status: "pending",
            createdAt: new Date().toISOString()
          }];

          await api.saveProperties(next);
          showToast("Seller lead converted into pending property");
          await refresh();
        }

        if (action === "markMaterialContacted") {
          const target = CACHE.material.find(x => normalizeStatus(x.status) === "NEW");
          if (!target) return alert("NEW material lead இல்லை");
          await saveMaterialLead(target.id, { status: "CONTACTED" });
        }

        if (action === "markServiceContacted") {
          const target = CACHE.service.find(x => normalizeStatus(x.status) === "NEW");
          if (!target) return alert("NEW service lead இல்லை");
          await saveServiceLead(target.id, { status: "CONTACTED" });
        }
      }

      const approve = e.target.closest("[data-approve-prop]")?.dataset.approveProp;
      if (approve) await savePropertyStatus(approve, "approved");

      const archive = e.target.closest("[data-archive-prop]")?.dataset.archiveProp;
      if (archive) await savePropertyStatus(archive, "archived");

      const reject = e.target.closest("[data-reject-prop]")?.dataset.rejectProp;
      if (reject) await savePropertyStatus(reject, "rejected");

      const del = e.target.closest("[data-delete-prop]")?.dataset.deleteProp;
      if (del) await deleteProperty(del);

      const delBroker = e.target.closest("[data-delete-broker]")?.dataset.deleteBroker;
      if (delBroker) await deleteBrokerAction(delBroker);

      const editBuyer = e.target.closest("[data-edit-buyer]")?.dataset.editBuyer;
      if (editBuyer) openLeadModal(editBuyer);

      const waBuyer = e.target.closest("[data-wa-buyer]")?.dataset.waBuyer;
      if (waBuyer) {
        const lead = CACHE.buyer.find(x => String(x.id) === String(waBuyer));
        if (lead && lead.buyerPhone) {
          window.open(`https://wa.me/${formatWA(lead.buyerPhone)}?text=${encodeURIComponent(buildBuyerWA(lead))}`, "_blank");
          await saveBuyerLead(waBuyer, {
            status: "CONTACTED",
            followUp: lead.followUp || tomorrowYMD(),
            followUpDate: lead.followUp || tomorrowYMD()
          });
        }
      }

      const buyerStatus = e.target.closest("[data-status-buyer]");
      if (buyerStatus) {
        const next = buyerStatus.dataset.next;
        await saveBuyerLead(buyerStatus.dataset.statusBuyer, {
          status: next,
          followUp: next === "CONTACTED" ? tomorrowYMD() : undefined,
          followUpDate: next === "CONTACTED" ? tomorrowYMD() : undefined
        });
      }

      const sellerStatus = e.target.closest("[data-status-seller]");
      if (sellerStatus) await saveSellerLead(sellerStatus.dataset.statusSeller, { status: sellerStatus.dataset.next });

      const materialStatus = e.target.closest("[data-status-material]");
      if (materialStatus) await saveMaterialLead(materialStatus.dataset.statusMaterial, { status: materialStatus.dataset.next });

      const serviceStatus = e.target.closest("[data-status-service]");
      if (serviceStatus) await saveServiceLead(serviceStatus.dataset.statusService, { status: serviceStatus.dataset.next });
    });

    document.addEventListener("change", async e => {
      if (e.target.matches("[data-assign-buyer]")) {
        await saveBuyerLead(e.target.dataset.assignBuyer, {
          assignedTo: e.target.value || "",
          assignedBrokerName: e.target.value || ""
        });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (typeof seedData === "function") seedData();

    if (currentUser && $("currentUserText")) {
      $("currentUserText").textContent = `${currentUser.name} • ${currentUser.role}`;
    }

    bindNav();
    bindInputs();
    bindActions();
    await refresh();
  });
})();

