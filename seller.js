(() => {
  "use strict";

  requireRole(["seller", "admin"]);
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

  function getMySellerLeads() {
    const phone = normalizePhone(currentUser?.phone || "");
    const all = typeof getSellerLeads === "function" ? getSellerLeads() : [];
    if (currentUser?.role === "admin") return all;
    return all.filter(x => normalizePhone(x.phone) === phone);
  }

  function getMyProperties() {
    const phone = normalizePhone(currentUser?.phone || "");
    const all = typeof getAllProperties === "function" ? getAllProperties() : [];
    if (currentUser?.role === "admin") return all;
    return all.filter(x => normalizePhone(x.sellerPhone) === phone);
  }

  function renderStats(leads, properties) {
    const stats = [
      { label: "Seller Leads", value: leads.length },
      { label: "Approved", value: leads.filter(x => normalizeStatus(x.status) === "APPROVED").length },
      { label: "Doc Pending", value: leads.filter(x => normalizeStatus(x.status) === "DOCUMENT_PENDING").length },
      { label: "Properties", value: properties.length }
    ];

    $("statsGrid").innerHTML = stats.map(x => `
      <div class="statCard">
        <div class="statLabel">${esc(x.label)}</div>
        <div class="statValue">${esc(x.value)}</div>
      </div>
    `).join("");
  }

  function renderLeadTable(leads) {
    $("sellerLeadBody").innerHTML = leads.length ? leads.map(x => `
      <tr>
        <td>${esc(fmtDate(x.createdAt))}</td>
        <td><div class="rowTitle">${esc(x.listingTitle || "-")}</div><div class="rowMeta">${esc(x.urgency || "")}</div></td>
        <td>${esc(x.propertyType || "-")}</td>
        <td>${esc([x.city, x.area].filter(Boolean).join(" • ") || "-")}</td>
        <td>${esc(x.expectedPrice ? "₹" + Number(String(x.expectedPrice).replace(/[^\d]/g, "") || 0).toLocaleString("en-IN") : "—")}</td>
        <td>${esc(x.documentsReady || "—")}</td>
        <td>${statusPill(x.status || "NEW")}</td>
      </tr>
      ${x.notes ? `<tr><td></td><td colspan="6" class="rowMeta">📝 ${esc(x.notes)}</td></tr>` : ""}
    `).join("") : `<tr><td colspan="7" class="empty">No seller records found for this account.</td></tr>`;
  }

  function renderSummary(leads, properties) {
    const html = [
      ["Your role", currentUser?.role || "-"],
      ["Phone linked", currentUser?.phone || "-"],
      ["Approved seller leads", leads.filter(x => normalizeStatus(x.status) === "APPROVED").length],
      ["Pending properties", properties.filter(x => String(x.status).toLowerCase() === "pending").length],
      ["Approved properties", properties.filter(x => String(x.status).toLowerCase() === "approved").length]
    ].map(([a, b]) => `<div class="kpiRow"><div class="kpiLabel">${esc(a)}</div><div class="kpiValue">${esc(b)}</div></div>`).join("");

    $("statusSummary").innerHTML = html;
  }

  function renderProperties(properties) {
    $("propertyCards").innerHTML = properties.length ? properties.map(x => `
      <div class="propertyCard">
        <div class="rowTitle">${esc(x.title || "Property")}</div>
        <div class="rowMeta">${esc([x.city, x.area, x.type, x.bhk].filter(Boolean).join(" • ") || "—")}</div>
        <div class="rowMeta">Price: ${esc(x.price ? "₹" + Number(x.price).toLocaleString("en-IN") : "—")}</div>
        <div class="rowMeta">Status: ${statusPill(x.status || "pending")}</div>
      </div>
    `).join("") : `<div class="empty">No properties linked to your account yet.</div>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (currentUser && $("currentUserText")) {
      $("currentUserText").textContent = `${currentUser.name} • ${currentUser.role}`;
    }

    const leads = getMySellerLeads();
    const properties = getMyProperties();

    renderStats(leads, properties);
    renderLeadTable(leads);
    renderSummary(leads, properties);
    renderProperties(properties);
  });
})();

