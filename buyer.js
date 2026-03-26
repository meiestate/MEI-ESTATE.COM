(() => {
  "use strict";

  requireRole(["buyer", "admin"]);
  const currentUser = getCurrentUser();

  const $ = id => document.getElementById(id);

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

  function normalizeStatus(value, fallback = "NEW") {
    return String(value || fallback).trim().toUpperCase();
  }

  function normalizePhone(phone) {
    return String(phone || "").replace(/\D/g, "").slice(-10);
  }

  function statusPill(status) {
    const s = normalizeStatus(status, "NEW");
    return `<span class="status ${esc(s)}">${esc(s)}</span>`;
  }

  function getMyBuyerLeads() {
    const phone = normalizePhone(currentUser?.phone || "");
    const all = typeof getAllLeads === "function" ? getAllLeads() : [];
    if (currentUser?.role === "admin") return all;
    return all.filter(x => normalizePhone(x.buyerPhone) === phone);
  }

  function getApprovedListings() {
    return typeof getApprovedProperties === "function" ? getApprovedProperties() : [];
  }

  function renderStats(leads, listings) {
    const stats = [
      { label: "My Enquiries", value: leads.length },
      { label: "New", value: leads.filter(x => normalizeStatus(x.status) === "NEW").length },
      { label: "Contacted", value: leads.filter(x => normalizeStatus(x.status) === "CONTACTED").length },
      { label: "Live Listings", value: listings.length }
    ];

    $("statsGrid").innerHTML = stats.map(x => `
      <div class="statCard">
        <div class="statLabel">${esc(x.label)}</div>
        <div class="statValue">${esc(x.value)}</div>
      </div>
    `).join("");
  }

  function renderLeadTable(leads) {
    $("buyerLeadBody").innerHTML = leads.length ? leads.map(x => `
      <tr>
        <td>${esc(fmtDate(x.createdAt))}</td>
        <td><div class="rowTitle">${esc(x.listingTitle || "-")}</div><div class="rowMeta">ID: ${esc(x.listingId || "-")}</div></td>
        <td>${esc(x.assignedTo || x.assignedBrokerName || "Unassigned")}</td>
        <td>${statusPill(x.status || "NEW")}</td>
        <td>${esc(x.followUp || "—")}</td>
        <td>${esc(x.notes || x.message || "—")}</td>
      </tr>
    `).join("") : `<tr><td colspan="6" class="empty">No enquiries found for this account.</td></tr>`;
  }

  function renderSummary(leads) {
    const html = [
      ["Your role", currentUser?.role || "-"],
      ["Phone linked", currentUser?.phone || "-"],
      ["Open enquiries", leads.filter(x => !["CLOSED", "ARCHIVED"].includes(normalizeStatus(x.status))).length],
      ["Closed enquiries", leads.filter(x => normalizeStatus(x.status) === "CLOSED").length],
      ["Assigned broker", leads.find(x => x.assignedTo)?.assignedTo || "Not assigned yet"]
    ].map(([a, b]) => `<div class="kpiRow"><div class="kpiLabel">${esc(a)}</div><div class="kpiValue">${esc(b)}</div></div>`).join("");

    $("buyerSummary").innerHTML = html;
  }

  function renderListings(listings) {
    $("approvedListings").innerHTML = listings.length ? listings.slice(0, 6).map(x => `
      <div class="propertyCard">
        <div class="rowTitle">${esc(x.title || "Property")}</div>
        <div class="rowMeta">${esc([x.city, x.area, x.type, x.bhk].filter(Boolean).join(" • ") || "—")}</div>
        <div class="rowMeta">Price: ${esc(x.price ? "₹" + Number(x.price).toLocaleString("en-IN") : "—")}</div>
        <div class="rowMeta">Broker: ${esc(x.brokerName || "—")}</div>
        <div class="rowMeta">Status: ${statusPill(x.status || "approved")}</div>
      </div>
    `).join("") : `<div class="empty">No approved listings available right now.</div>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (currentUser && $("currentUserText")) {
      $("currentUserText").textContent = `${currentUser.name} • ${currentUser.role}`;
    }

    const leads = getMyBuyerLeads();
    const listings = getApprovedListings();

    renderStats(leads, listings);
    renderLeadTable(leads);
    renderSummary(leads);
    renderListings(listings);
  });
})();

