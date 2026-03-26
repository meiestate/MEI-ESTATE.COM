(() => {
  "use strict";

  const REQUESTS_KEY = "mei_visit_requests_v1";
  const $ = (id) => document.getElementById(id);

  let ALL_REQUESTS = [];
  let FILTERED_REQUESTS = [];

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    $("yr").textContent = new Date().getFullYear();

    ALL_REQUESTS = loadRequests();
    bindEvents();
    applyFilters();
  }

  function bindEvents() {
    $("searchInput").addEventListener("input", applyFilters);
    $("statusFilter").addEventListener("change", applyFilters);

    $("clearFiltersBtn").addEventListener("click", () => {
      $("searchInput").value = "";
      $("statusFilter").value = "all";
      applyFilters();
    });

    $("clearAllBtn").addEventListener("click", () => {
      if (!ALL_REQUESTS.length) return;
      const ok = confirm("Are you sure you want to clear all visit requests?");
      if (!ok) return;
      ALL_REQUESTS = [];
      saveRequests(ALL_REQUESTS);
      applyFilters();
    });
  }

  function loadRequests() {
    const raw = readJSON(REQUESTS_KEY, []);
    return raw
      .map(normalizeRequest)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  function saveRequests(list) {
    writeJSON(REQUESTS_KEY, list);
  }

  function readJSON(key, fallback = []) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeRequest(r) {
    return {
      propertyId: String(r.propertyId || "").trim(),
      propertyTitle: String(r.propertyTitle || "Untitled Property").trim(),
      name: String(r.name || "").trim(),
      phone: String(r.phone || "").trim(),
      date: String(r.date || "").trim(),
      note: String(r.note || "").trim(),
      createdAt: String(r.createdAt || "").trim(),
      status: String(r.status || "new").trim().toLowerCase()
    };
  }

  function applyFilters() {
    const q = String($("searchInput").value || "").trim().toLowerCase();
    const status = String($("statusFilter").value || "all").trim().toLowerCase();

    FILTERED_REQUESTS = ALL_REQUESTS.filter((item) => {
      const hay = [
        item.name,
        item.phone,
        item.propertyTitle,
        item.propertyId,
        item.note
      ].join(" ").toLowerCase();

      const matchQuery = !q || hay.includes(q);
      const matchStatus = status === "all" || item.status === status;

      return matchQuery && matchStatus;
    });

    render();
  }

  function render() {
    $("totalCount").textContent = String(ALL_REQUESTS.length);
    $("filteredCount").textContent = String(FILTERED_REQUESTS.length);

    const root = $("requestsRoot");

    if (!ALL_REQUESTS.length) {
      root.innerHTML = `
        <section class="emptyState">
          <h2>No visit requests yet</h2>
          <p>Property page-ல் Schedule a Visit form submit செய்த பிறகு data இங்கே வரும்.</p>
          <a class="btn primary" href="listings.html">Go to Listings</a>
        </section>
      `;
      return;
    }

    if (!FILTERED_REQUESTS.length) {
      root.innerHTML = `
        <section class="emptyState">
          <h2>No matching requests</h2>
          <p>Search அல்லது status filter மாற்றி மீண்டும் check பண்ணுங்க.</p>
          <button class="btn ghost" type="button" id="emptyResetBtn">Reset Filters</button>
        </section>
      `;

      const btn = document.getElementById("emptyResetBtn");
      if (btn) {
        btn.addEventListener("click", () => {
          $("searchInput").value = "";
          $("statusFilter").value = "all";
          applyFilters();
        });
      }
      return;
    }

    root.innerHTML = `
      <section class="tableWrap">
        <table class="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Property</th>
              <th>Visit Date</th>
              <th>Created</th>
              <th>Note</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${FILTERED_REQUESTS.map((item, idx) => renderTableRow(item, idx)).join("")}
          </tbody>
        </table>
      </section>

      <section class="cards">
        ${FILTERED_REQUESTS.map((item, idx) => renderCard(item, idx)).join("")}
      </section>
    `;

    bindRowActions();
  }

  function renderTableRow(item, idx) {
    return `
      <tr>
        <td>
          <div class="cellStrong">${escapeHtml(item.name || "No name")}</div>
          <div class="cellMuted">${escapeHtml(item.phone || "No phone")}</div>
        </td>
        <td>
          <div class="cellStrong">${escapeHtml(item.propertyTitle)}</div>
          <div class="cellMuted">ID: ${escapeHtml(item.propertyId || "-")}</div>
        </td>
        <td>
          <div class="cellStrong">${escapeHtml(formatDate(item.date) || "Not set")}</div>
        </td>
        <td>
          <div class="cellMuted">${escapeHtml(formatDateTime(item.createdAt) || "-")}</div>
        </td>
        <td>
          <div class="cellMuted">${escapeHtml(item.note || "No note")}</div>
        </td>
        <td>
          <div style="display:grid;gap:10px;">
            <span class="badge ${escapeHtml(item.status)}">${escapeHtml(labelStatus(item.status))}</span>
            <select class="statusSelect" data-status-index="${idx}">
              ${statusOptions(item.status)}
            </select>
          </div>
        </td>
        <td>
          <div class="actions">
            <a class="btn small primary" href="property.html?id=${encodeURIComponent(item.propertyId)}">Open Property</a>
            <button class="btn small danger" type="button" data-delete-index="${idx}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderCard(item, idx) {
    return `
      <article class="requestCard">
        <div class="requestCardTop">
          <div>
            <div class="requestName">${escapeHtml(item.name || "No name")}</div>
            <div class="requestMeta">${escapeHtml(item.phone || "No phone")}</div>
          </div>
          <span class="badge ${escapeHtml(item.status)}">${escapeHtml(labelStatus(item.status))}</span>
        </div>

        <div class="requestGrid">
          <div class="mini">
            <div class="miniLabel">Property</div>
            <div class="miniValue">${escapeHtml(item.propertyTitle)}</div>
          </div>
          <div class="mini">
            <div class="miniLabel">Property ID</div>
            <div class="miniValue">${escapeHtml(item.propertyId || "-")}</div>
          </div>
          <div class="mini">
            <div class="miniLabel">Visit Date</div>
            <div class="miniValue">${escapeHtml(formatDate(item.date) || "Not set")}</div>
          </div>
          <div class="mini">
            <div class="miniLabel">Created</div>
            <div class="miniValue">${escapeHtml(formatDateTime(item.createdAt) || "-")}</div>
          </div>
        </div>

        <div class="mini" style="margin-bottom:12px;">
          <div class="miniLabel">Note</div>
          <div class="miniValue">${escapeHtml(item.note || "No note")}</div>
        </div>

        <div class="requestActions">
          <select class="statusSelect" data-status-index="${idx}">
            ${statusOptions(item.status)}
          </select>
          <a class="btn small primary" href="property.html?id=${encodeURIComponent(item.propertyId)}">Open Property</a>
          <button class="btn small danger" type="button" data-delete-index="${idx}">Delete</button>
        </div>
      </article>
    `;
  }

  function bindRowActions() {
    document.querySelectorAll("[data-delete-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-delete-index"));
        deleteRequest(idx);
      });
    });

    document.querySelectorAll("[data-status-index]").forEach((select) => {
      select.addEventListener("change", () => {
        const idx = Number(select.getAttribute("data-status-index"));
        updateStatus(idx, select.value);
      });
    });
  }

  function updateStatus(filteredIndex, nextStatus) {
    const request = FILTERED_REQUESTS[filteredIndex];
    if (!request) return;

    const realIndex = ALL_REQUESTS.findIndex((r) => {
      return (
        r.createdAt === request.createdAt &&
        r.propertyId === request.propertyId &&
        r.phone === request.phone
      );
    });

    if (realIndex === -1) return;

    ALL_REQUESTS[realIndex].status = String(nextStatus || "new").toLowerCase();
    saveRequests(ALL_REQUESTS);
    applyFilters();
  }

  function deleteRequest(filteredIndex) {
    const request = FILTERED_REQUESTS[filteredIndex];
    if (!request) return;

    const ok = confirm("Delete this visit request?");
    if (!ok) return;

    ALL_REQUESTS = ALL_REQUESTS.filter((r) => {
      return !(
        r.createdAt === request.createdAt &&
        r.propertyId === request.propertyId &&
        r.phone === request.phone
      );
    });

    saveRequests(ALL_REQUESTS);
    applyFilters();
  }

  function statusOptions(current) {
    const list = ["new", "contacted", "scheduled", "visited", "closed"];
    return list.map((s) => {
      return `<option value="${s}" ${s === current ? "selected" : ""}>${labelStatus(s)}</option>`;
    }).join("");
  }

  function labelStatus(status) {
    const map = {
      new: "New",
      contacted: "Contacted",
      scheduled: "Scheduled",
      visited: "Visited",
      closed: "Closed"
    };
    return map[status] || "New";
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();

