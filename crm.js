(() => {
  "use strict";

  let EDIT_LEAD_ID = null;
  let CACHE = { leads: [], brokers: [] };

  const $ = id => document.getElementById(id);
  const $$ = sel => [...document.querySelectorAll(sel)];

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

  function showToast(msg, type = "success") {
    const stack = $("toastStack");
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateY(6px)"; }, 2200);
    setTimeout(() => el.remove(), 2700);
  }

  function statusPill(status) {
    const s = normalizeStatus(status, "NEW");
    return `<span class="status ${esc(s)}">${esc(s)}</span>`;
  }

  function isOverdue(lead) {
    if (["CLOSED", "ARCHIVED"].includes(normalizeStatus(lead.status))) return false;
    if (!lead.followUp) return false;
    return String(lead.followUp) < todayYMD();
  }

  function isToday(lead) {
    return String(lead.followUp || "") === todayYMD();
  }

  async function loadAll() {
    CACHE.leads = typeof getAllLeads === "function" ? getAllLeads() : [];
    CACHE.brokers = typeof getAllBrokers === "function" ? getAllBrokers() : [];
  }

  function syncBrokerSelects() {
    const options = [`<option value="">Unassigned</option>`]
      .concat(CACHE.brokers.map(b => `<option value="${esc(b.name)}">${esc(b.name)}</option>`))
      .join("");

    $("leadAssignedTo").innerHTML = options;
    $("mAssigned").innerHTML = options;

    const filterOptions = [`<option value="ALL">All Brokers</option>`, `<option value="__UNASSIGNED__">Unassigned</option>`]
      .concat(CACHE.brokers.map(b => `<option value="${esc(b.name)}">${esc(b.name)}</option>`))
      .join("");

    const current = $("filterBroker").value || "ALL";
    $("filterBroker").innerHTML = filterOptions;
    if ([...$("filterBroker").options].some(o => o.value === current)) $("filterBroker").value = current;
  }

  function renderStats() {
    const stats = [
      { label: "Total Leads", value: CACHE.leads.length, hint: "CRM funnel" },
      { label: "New", value: CACHE.leads.filter(x => normalizeStatus(x.status) === "NEW").length, hint: "Fresh enquiry" },
      { label: "Contacted", value: CACHE.leads.filter(x => normalizeStatus(x.status) === "CONTACTED").length, hint: "Spoken" },
      { label: "Visits", value: CACHE.leads.filter(x => normalizeStatus(x.status) === "VISIT_SCHEDULED").length, hint: "Site visits" },
      { label: "Closed", value: CACHE.leads.filter(x => normalizeStatus(x.status) === "CLOSED").length, hint: "Won deals" }
    ];

    $("statsGrid").innerHTML = stats.map(s => `
      <div class="statCard">
        <div class="statTop">
          <div class="statLabel">${esc(s.label)}</div>
          <span class="delta">${esc(s.hint)}</span>
        </div>
        <div class="statValue">${esc(s.value)}</div>
      </div>
    `).join("");
  }

  function renderTodayFocus() {
    const rows = CACHE.leads
      .filter(x => isOverdue(x) || isToday(x) || (!x.followUp && !["CLOSED", "ARCHIVED"].includes(normalizeStatus(x.status))))
      .slice(0, 6);

    $("todayFocusList").innerHTML = rows.length ? rows.map(x => `
      <div class="miniRow">
        <div>
          <div class="rowTitle">${esc(x.buyerName || "-")}</div>
          <div class="miniMeta">${esc(x.listingTitle || "No listing")} • ${esc(x.followUp || "No follow-up")}</div>
        </div>
        <div class="rowActions">
          <button class="btn small" data-edit="${esc(x.id)}">Edit</button>
        </div>
      </div>
    `).join("") : `<div class="empty">No urgent leads right now.</div>`;
  }

  function renderBrokerLoad() {
    const rows = CACHE.brokers.map(b => ({
      name: b.name,
      count: CACHE.leads.filter(x => x.assignedTo === b.name).length
    }));

    $("brokerLoadList").innerHTML = rows.length ? rows.map(x => `
      <div class="miniRow">
        <div>
          <div class="rowTitle">${esc(x.name)}</div>
          <div class="miniMeta">Broker assignment load</div>
        </div>
        <div class="rowTitle">${esc(x.count)} leads</div>
      </div>
    `).join("") : `<div class="empty">No brokers available.</div>`;
  }

  function renderTable() {
    const q = $("searchLeads").value.trim().toLowerCase();
    const broker = $("filterBroker").value;
    const status = $("filterStatus").value;
    const overdue = $("filterOverdue").value;

    let rows = CACHE.leads.filter(l =>
      [l.buyerName, l.buyerPhone, l.listingTitle, l.listingId, l.notes, l.message, l.assignedTo]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );

    rows = rows.filter(l => broker === "ALL" ? true : broker === "__UNASSIGNED__" ? !l.assignedTo : l.assignedTo === broker);
    rows = rows.filter(l => status === "ALL" ? true : normalizeStatus(l.status) === status);

    if (overdue === "OVERDUE") rows = rows.filter(isOverdue);
    if (overdue === "TODAY") rows = rows.filter(isToday);
    if (overdue === "NO_FOLLOWUP") rows = rows.filter(x => !x.followUp);

    $("totalLeadCount").textContent = rows.length;

    $("crmTableBody").innerHTML = rows.length ? rows.map(l => {
      const assignOptions = [`<option value="">Unassigned</option>`]
        .concat(CACHE.brokers.map(b => `<option value="${esc(b.name)}" ${l.assignedTo === b.name ? "selected" : ""}>${esc(b.name)}</option>`))
        .join("");

      return `
        <tr ${isOverdue(l) ? 'style="background:linear-gradient(90deg, rgba(255,77,122,.10), transparent 50%)"' : ""}>
          <td>${esc(fmtDate(l.createdAt))}</td>
          <td><div class="rowTitle">${esc(l.buyerName || "-")}</div><div class="rowMeta">${esc(l.buyerCity || "-")}</div></td>
          <td>${esc(l.buyerPhone || "-")}</td>
          <td><div class="rowTitle">${esc(l.listingTitle || "No listing")}</div><div class="rowMeta">ID: ${esc(l.listingId || "-")}</div></td>
          <td><select data-assign="${esc(l.id)}">${assignOptions}</select></td>
          <td>${statusPill(l.status || "NEW")}</td>
          <td>${esc(l.followUp || "—")}</td>
          <td>${esc(l.notes || "—")}</td>
          <td>
            <div class="rowActions">
              <a class="btn small" href="tel:${encodeURIComponent(l.buyerPhone || "")}">📞 Call</a>
              <a class="btn small success" href="https://wa.me/${formatWA(l.buyerPhone)}" target="_blank">💬 WA</a>
              <button class="btn small" data-edit="${esc(l.id)}">✏ Edit</button>
              <button class="btn small warn" data-status="${esc(l.id)}" data-next="CONTACTED">Contacted</button>
              <button class="btn small success" data-status="${esc(l.id)}" data-next="CLOSED">Close</button>
              <button class="btn small danger" data-status="${esc(l.id)}" data-next="ARCHIVED">Archive</button>
            </div>
          </td>
        </tr>
        ${l.message ? `<tr><td></td><td colspan="8" class="rowMeta">📝 ${esc(l.message)}</td></tr>` : ""}
      `;
    }).join("") : `<tr><td colspan="9" class="empty">No leads match the current filters.</td></tr>`;
  }

  function renderAll() {
    syncBrokerSelects();
    renderStats();
    renderTodayFocus();
    renderBrokerLoad();
    renderTable();
  }

  async function refresh() {
    await loadAll();
    renderAll();
  }

  async function saveLeads(list) {
    if (typeof saveAllLeads === "function") saveAllLeads(list);
    await refresh();
  }

  function buildLeadFromForm() {
    return {
      id: typeof makeId === "function" ? makeId("LEAD") : "LEAD_" + Date.now(),
      buyerName: $("leadBuyerName").value.trim(),
      buyerPhone: $("leadBuyerPhone").value.trim(),
      buyerCity: $("leadBuyerCity").value.trim(),
      source: $("leadSource").value,
      listingTitle: $("leadListingTitle").value.trim(),
      propertyTitle: $("leadListingTitle").value.trim(),
      listingId: $("leadListingId").value.trim(),
      propertyId: $("leadListingId").value.trim(),
      assignedTo: $("leadAssignedTo").value || "",
      assignedBrokerName: $("leadAssignedTo").value || "",
      status: $("leadStatus").value || "NEW",
      followUp: $("leadFollowUp").value || "",
      followUpDate: $("leadFollowUp").value || "",
      message: $("leadMessage").value.trim(),
      notes: $("leadNotes").value.trim(),
      createdAt: new Date().toISOString()
    };
  }

  async function createLead(e) {
    e.preventDefault();

    const payload = buildLeadFromForm();
    if (!payload.buyerName || !payload.buyerPhone) {
      alert("Buyer name and phone required");
      return;
    }

    const next = [payload, ...CACHE.leads];
    await saveLeads(next);
    $("leadForm").reset();
    showToast("Lead saved");
  }

  function openModal(id) {
    const lead = CACHE.leads.find(x => String(x.id) === String(id));
    if (!lead) return;

    EDIT_LEAD_ID = id;
    $("modalLeadMeta").textContent = `${lead.buyerName || "-"} • ${lead.buyerPhone || "-"} • ${lead.listingTitle || "No listing"}`;
    $("mBuyerName").value = lead.buyerName || "";
    $("mBuyerPhone").value = lead.buyerPhone || "";
    $("mBuyerCity").value = lead.buyerCity || "";
    $("mAssigned").value = lead.assignedTo || "";
    $("mStatus").value = normalizeStatus(lead.status, "NEW");
    $("mFollowUp").value = lead.followUp || "";
    $("mListingTitle").value = lead.listingTitle || "";
    $("mMessage").value = lead.message || "";
    $("mNotes").value = lead.notes || "";
    $("leadModalBack").hidden = false;
  }

  function closeModal() {
    EDIT_LEAD_ID = null;
    $("leadModalBack").hidden = true;
  }

  async function saveModal() {
    if (!EDIT_LEAD_ID) return;

    const next = CACHE.leads.map(x => {
      if (String(x.id) !== String(EDIT_LEAD_ID)) return x;
      return {
        ...x,
        buyerName: $("mBuyerName").value.trim(),
        buyerPhone: $("mBuyerPhone").value.trim(),
        buyerCity: $("mBuyerCity").value.trim(),
        assignedTo: $("mAssigned").value || "",
        assignedBrokerName: $("mAssigned").value || "",
        status: $("mStatus").value || "NEW",
        followUp: $("mFollowUp").value || "",
        followUpDate: $("mFollowUp").value || "",
        listingTitle: $("mListingTitle").value.trim(),
        propertyTitle: $("mListingTitle").value.trim(),
        message: $("mMessage").value.trim(),
        notes: $("mNotes").value.trim(),
        updatedAt: new Date().toISOString()
      };
    });

    await saveLeads(next);
    closeModal();
    showToast("Lead updated");
  }

  async function quickStatus(id, status) {
    const next = CACHE.leads.map(x => {
      if (String(x.id) !== String(id)) return x;
      return {
        ...x,
        status,
        followUp: status === "CONTACTED" ? (x.followUp || tomorrowYMD()) : x.followUp,
        followUpDate: status === "CONTACTED" ? (x.followUpDate || tomorrowYMD()) : x.followUpDate,
        updatedAt: new Date().toISOString()
      };
    });
    await saveLeads(next);
    showToast(`Lead marked ${status}`);
  }

  async function assignBroker(id, brokerName) {
    const next = CACHE.leads.map(x => {
      if (String(x.id) !== String(id)) return x;
      return {
        ...x,
        assignedTo: brokerName || "",
        assignedBrokerName: brokerName || "",
        updatedAt: new Date().toISOString()
      };
    });
    await saveLeads(next);
    showToast("Broker assigned");
  }

  async function markTodayFollowup() {
    const next = CACHE.leads.map(x => {
      if (x.followUp || ["CLOSED", "ARCHIVED"].includes(normalizeStatus(x.status))) return x;
      return {
        ...x,
        followUp: todayYMD(),
        followUpDate: todayYMD(),
        updatedAt: new Date().toISOString()
      };
    });

    await saveLeads(next);
    showToast("Today follow-up marked");
  }

  function exportCSV() {
    if (!CACHE.leads.length) {
      alert("Export செய்ய data இல்லை");
      return;
    }

    const rows = CACHE.leads.map(x => ({
      createdAt: fmtDate(x.createdAt),
      buyerName: x.buyerName,
      buyerPhone: x.buyerPhone,
      buyerCity: x.buyerCity,
      listingTitle: x.listingTitle,
      listingId: x.listingId,
      assignedTo: x.assignedTo,
      status: x.status,
      followUp: x.followUp,
      notes: x.notes,
      message: x.message
    }));

    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(obj => headers.map(h => `"${String(obj[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "MEI_CRM_Leads.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("CRM CSV exported");
  }

  async function seedDemo() {
    if (typeof seedData === "function") seedData();
    await refresh();
    showToast("Demo seeded");
  }

  async function resetData() {
    const typed = prompt("RESET என்று type பண்ணுங்கள்");
    if (String(typed || "").trim().toUpperCase() !== "RESET") {
      showToast("Reset cancelled", "warn");
      return;
    }

    if (typeof clearAllMeiData === "function") clearAllMeiData();
    if (typeof seedData === "function") seedData();
    await refresh();
    showToast("Data reset", "warn");
  }

  function bindInputs() {
    ["searchLeads", "filterBroker", "filterStatus", "filterOverdue"].forEach(id => {
      $(id).addEventListener("input", renderTable);
    });

    $("leadForm").addEventListener("submit", createLead);

    $("leadModalBack").addEventListener("mousedown", e => {
      if (e.target === $("leadModalBack")) closeModal();
    });
  }

  function bindActions() {
    document.addEventListener("click", async e => {
      const action = e.target.closest("[data-action]")?.dataset.action;

      if (action) {
        if (action === "refresh") await refresh();
        if (action === "seedDemo") await seedDemo();
        if (action === "resetData") await resetData();
        if (action === "closeModal") closeModal();
        if (action === "saveModal") await saveModal();
        if (action === "markTodayFollowup") await markTodayFollowup();
        if (action === "exportLeads") exportCSV();
      }

      const edit = e.target.closest("[data-edit]")?.dataset.edit;
      if (edit) openModal(edit);

      const st = e.target.closest("[data-status]");
      if (st) await quickStatus(st.dataset.status, st.dataset.next);

      const openModalBtn = e.target.closest("[data-open-modal]");
      if (openModalBtn?.dataset.openModal === "newLead") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        $("leadBuyerName").focus();
      }
    });

    document.addEventListener("change", async e => {
      if (e.target.matches("[data-assign]")) {
        await assignBroker(e.target.dataset.assign, e.target.value || "");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (typeof seedData === "function") seedData();
    bindInputs();
    bindActions();
    await refresh();
  });
})();



