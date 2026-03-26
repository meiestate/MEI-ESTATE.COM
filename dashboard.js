(() => {
  "use strict";

  requireRole(["admin"]);
  const currentUser = getCurrentUser();

  const KEYS = {
    properties: "mei_properties_v1",
    buyerLeads: "mei_leads_v1",
    sellerLeads: "mei_seller_leads_v1",
    materialLeads: "mei_material_leads_v1",
    serviceLeads: "mei_service_leads_v1",
    brokers: "mei_brokers_v1",
    settings: "mei_settings_v1",
    seeded: "mei_demo_seeded_v1"
  };

  const $ = id => document.getElementById(id);

  const state = {
    properties: [],
    buyerLeads: [],
    sellerLeads: [],
    materialLeads: [],
    serviceLeads: [],
    brokers: []
  };

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (err) {
      console.error("readJSON error:", key, err);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error("writeJSON error:", key, err);
      return false;
    }
  }

  function uid(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[m]);
  }

  function money(value) {
    const n = Number(value || 0);
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0
    }).format(n);
  }

  function addActivity(text) {
    const items = readJSON("mei_recent_activity_v1", []);
    items.unshift({
      id: uid("act"),
      text,
      ts: new Date().toLocaleString()
    });
    writeJSON("mei_recent_activity_v1", items.slice(0, 10));
    renderActivity();
  }

  function renderActivity() {
    const wrap = $("recentActivity");
    const items = readJSON("mei_recent_activity_v1", []);
    if (!items.length) {
      wrap.innerHTML = `<div class="emptyState">No recent activity yet.</div>`;
      return;
    }

    wrap.innerHTML = items.map(item => `
      <div class="listItem">
        <strong>${escapeHtml(item.text)}</strong>
        <div class="muted" style="margin-top:6px;font-size:12px;">${escapeHtml(item.ts)}</div>
      </div>
    `).join("");
  }

  function loadState() {
    state.properties = readJSON(KEYS.properties, []);
    state.buyerLeads = readJSON(KEYS.buyerLeads, []);
    state.sellerLeads = readJSON(KEYS.sellerLeads, []);
    state.materialLeads = readJSON(KEYS.materialLeads, []);
    state.serviceLeads = readJSON(KEYS.serviceLeads, []);
    state.brokers = readJSON(KEYS.brokers, []);
  }

  function saveState() {
    writeJSON(KEYS.properties, state.properties);
    writeJSON(KEYS.buyerLeads, state.buyerLeads);
    writeJSON(KEYS.sellerLeads, state.sellerLeads);
    writeJSON(KEYS.materialLeads, state.materialLeads);
    writeJSON(KEYS.serviceLeads, state.serviceLeads);
    writeJSON(KEYS.brokers, state.brokers);
  }

  function seedData(force = false) {
    const alreadySeeded = readJSON(KEYS.seeded, false);
    if (alreadySeeded && !force) return;

    state.properties = [
      {
        id: uid("prop"),
        title: "Green City Plot",
        location: "Chennai",
        type: "Plot",
        price: 2500000,
        area: 1200,
        status: "Available",
        desc: "Approved residential plot."
      },
      {
        id: uid("prop"),
        title: "Lake View Villa",
        location: "Coimbatore",
        type: "Villa",
        price: 8500000,
        area: 2400,
        status: "Booked",
        desc: "Premium gated villa."
      }
    ];

    state.buyerLeads = [
      { id: uid("buy"), name: "Arun", phone: "9876543210", requirement: "2BHK Apartment", budget: "4500000", location: "Chennai" },
      { id: uid("buy"), name: "Kiran", phone: "9123456780", requirement: "Villa", budget: "9000000", location: "Coimbatore" }
    ];

    state.sellerLeads = [
      { id: uid("sell"), name: "Mohan", phone: "9000011111", propertyType: "Plot", expectedPrice: "3000000", location: "Madurai" },
      { id: uid("sell"), name: "Sathya", phone: "9000022222", propertyType: "Apartment", expectedPrice: "5500000", location: "Trichy" }
    ];

    state.materialLeads = [
      { id: uid("mat"), name: "Vijay Traders", phone: "9888888888", material: "Cement", quantity: "500 Bags", city: "Chennai" }
    ];

    state.serviceLeads = [
      { id: uid("srv"), name: "Ravi", phone: "9777777777", service: "Interior Design", location: "Bangalore", notes: "3BHK full work" }
    ];

    state.brokers = [
      { id: uid("brk"), name: "Suresh", phone: "9666666666", area: "Chennai South", speciality: "Plots" },
      { id: uid("brk"), name: "Prakash", phone: "9555555555", area: "Coimbatore", speciality: "Villas" }
    ];

    saveState();
    writeJSON(KEYS.seeded, true);
    addActivity("Demo data seeded");
  }

  function renderStats() {
    $("statProperties").textContent = state.properties.length;
    $("statBuyerLeads").textContent = state.buyerLeads.length;
    $("statSellerLeads").textContent = state.sellerLeads.length;
    $("statMaterialLeads").textContent = state.materialLeads.length;
    $("statServiceLeads").textContent = state.serviceLeads.length;
    $("statBrokers").textContent = state.brokers.length;
  }

  function propertyRow(item) {
    return `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.location)}</td>
        <td>${escapeHtml(item.type)}</td>
        <td>₹ ${money(item.price)}</td>
        <td>${escapeHtml(item.area)}</td>
        <td><span class="badge">${escapeHtml(item.status)}</span></td>
        <td><button class="btn danger small" data-del="property" data-id="${item.id}">Delete</button></td>
      </tr>
    `;
  }

  function buyerRow(item) {
    return `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.phone)}</td>
        <td>${escapeHtml(item.requirement)}</td>
        <td>₹ ${money(item.budget)}</td>
        <td>${escapeHtml(item.location)}</td>
        <td><button class="btn danger small" data-del="buyer" data-id="${item.id}">Delete</button></td>
      </tr>
    `;
  }

  function sellerRow(item) {
    return `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.phone)}</td>
        <td>${escapeHtml(item.propertyType)}</td>
        <td>₹ ${money(item.expectedPrice)}</td>
        <td>${escapeHtml(item.location)}</td>
        <td><button class="btn danger small" data-del="seller" data-id="${item.id}">Delete</button></td>
      </tr>
    `;
  }

  function materialRow(item) {
    return `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.phone)}</td>
        <td>${escapeHtml(item.material)}</td>
        <td>${escapeHtml(item.quantity)}</td>
        <td>${escapeHtml(item.city)}</td>
        <td><button class="btn danger small" data-del="material" data-id="${item.id}">Delete</button></td>
      </tr>
    `;
  }

  function serviceRow(item) {
    return `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.phone)}</td>
        <td>${escapeHtml(item.service)}</td>
        <td>${escapeHtml(item.location)}</td>
        <td>${escapeHtml(item.notes || "")}</td>
        <td><button class="btn danger small" data-del="service" data-id="${item.id}">Delete</button></td>
      </tr>
    `;
  }

  function brokerRow(item) {
    return `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.phone)}</td>
        <td>${escapeHtml(item.area)}</td>
        <td>${escapeHtml(item.speciality)}</td>
        <td><button class="btn danger small" data-del="broker" data-id="${item.id}">Delete</button></td>
      </tr>
    `;
  }

  function renderTables() {
    $("propertyTable").innerHTML = state.properties.map(propertyRow).join("") || emptyRow(7, "No properties found");
    $("buyerTable").innerHTML = state.buyerLeads.map(buyerRow).join("") || emptyRow(6, "No buyer leads found");
    $("sellerTable").innerHTML = state.sellerLeads.map(sellerRow).join("") || emptyRow(6, "No seller leads found");
    $("materialTable").innerHTML = state.materialLeads.map(materialRow).join("") || emptyRow(6, "No material leads found");
    $("serviceTable").innerHTML = state.serviceLeads.map(serviceRow).join("") || emptyRow(6, "No service leads found");
    $("brokerTable").innerHTML = state.brokers.map(brokerRow).join("") || emptyRow(5, "No brokers found");
  }

  function emptyRow(colspan, text) {
    return `<tr><td colspan="${colspan}" class="muted">${escapeHtml(text)}</td></tr>`;
  }

  function refresh() {
    loadState();
    renderStats();
    renderTables();
    renderActivity();
  }

  function switchTab(tab) {
    document.querySelectorAll(".navLink").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });

    document.querySelectorAll(".view").forEach(view => {
      view.classList.remove("active");
    });

    const target = document.getElementById(`view-${tab}`);
    if (target) target.classList.add("active");

    const labelMap = {
      overview: "Admin Dashboard",
      properties: "Properties",
      buyers: "Buyer Leads",
      sellers: "Seller Leads",
      materials: "Material Leads",
      services: "Service Leads",
      brokers: "Broker Network",
      export: "Export Center"
    };

    $("pageTitle").textContent = labelMap[tab] || "Admin Dashboard";
  }

  function bindNav() {
    document.querySelectorAll(".navLink").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    document.querySelectorAll("[data-jump]").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.jump));
    });
  }

  function bindPropertyForm() {
    $("propertyForm").addEventListener("submit", e => {
      e.preventDefault();

      const item = {
        id: uid("prop"),
        title: $("pTitle").value.trim(),
        location: $("pLocation").value.trim(),
        type: $("pType").value,
        price: $("pPrice").value,
        area: $("pArea").value,
        status: $("pStatus").value,
        desc: $("pDesc").value.trim()
      };

      state.properties.unshift(item);
      saveState();
      $("propertyForm").reset();
      addActivity(`Property added: ${item.title}`);
      refresh();
      switchTab("properties");
    });
  }

  function bindBrokerForm() {
    $("addBrokerBtn").addEventListener("click", () => {
      $("brokerForm").classList.toggle("hidden");
    });

    $("brokerForm").addEventListener("submit", e => {
      e.preventDefault();

      const item = {
        id: uid("brk"),
        name: $("bName").value.trim(),
        phone: $("bPhone").value.trim(),
        area: $("bArea").value.trim(),
        speciality: $("bSpeciality").value.trim()
      };

      state.brokers.unshift(item);
      saveState();
      $("brokerForm").reset();
      $("brokerForm").classList.add("hidden");
      addActivity(`Broker added: ${item.name}`);
      refresh();
    });
  }

  function bindDelete() {
    document.addEventListener("click", e => {
      const btn = e.target.closest("[data-del]");
      if (!btn) return;

      const type = btn.dataset.del;
      const id = btn.dataset.id;

      const maps = {
        property: ["properties", "Property deleted"],
        buyer: ["buyerLeads", "Buyer lead deleted"],
        seller: ["sellerLeads", "Seller lead deleted"],
        material: ["materialLeads", "Material lead deleted"],
        service: ["serviceLeads", "Service lead deleted"],
        broker: ["brokers", "Broker deleted"]
      };

      const config = maps[type];
      if (!config) return;

      const [key, activity] = config;
      state[key] = state[key].filter(item => item.id !== id);
      saveState();
      addActivity(activity);
      refresh();
    });
  }

  function bindSearch() {
    bindSingleSearch("propertySearch", "propertyTable", state.properties, propertyRow, ["title", "location", "type", "status"]);
    bindSingleSearch("buyerSearch", "buyerTable", state.buyerLeads, buyerRow, ["name", "phone", "requirement", "location"]);
    bindSingleSearch("sellerSearch", "sellerTable", state.sellerLeads, sellerRow, ["name", "phone", "propertyType", "location"]);
    bindSingleSearch("materialSearch", "materialTable", state.materialLeads, materialRow, ["name", "phone", "material", "city"]);
    bindSingleSearch("serviceSearch", "serviceTable", state.serviceLeads, serviceRow, ["name", "phone", "service", "location", "notes"]);
  }

  function bindSingleSearch(inputId, tableId, sourceArray, rowRenderer, fields) {
    const input = $(inputId);
    const table = $(tableId);
    if (!input || !table) return;

    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      const filtered = sourceArray.filter(item =>
        fields.some(field => String(item[field] || "").toLowerCase().includes(q))
      );
      const colsMap = {
        propertyTable: 7,
        buyerTable: 6,
        sellerTable: 6,
        materialTable: 6,
        serviceTable: 6
      };
      table.innerHTML = filtered.map(rowRenderer).join("") || emptyRow(colsMap[tableId] || 5, "No matching records");
    });
  }

  function exportJSON(name, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function bindExport() {
    document.querySelectorAll(".exportBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.export;

        if (key === "properties") exportJSON("mei_properties", state.properties);
        if (key === "buyers") exportJSON("mei_buyer_leads", state.buyerLeads);
        if (key === "sellers") exportJSON("mei_seller_leads", state.sellerLeads);
        if (key === "materials") exportJSON("mei_material_leads", state.materialLeads);
        if (key === "services") exportJSON("mei_service_leads", state.serviceLeads);
        if (key === "brokers") exportJSON("mei_brokers", state.brokers);

        if (key === "all") {
          exportJSON("mei_full_backup", {
            properties: state.properties,
            buyerLeads: state.buyerLeads,
            sellerLeads: state.sellerLeads,
            materialLeads: state.materialLeads,
            serviceLeads: state.serviceLeads,
            brokers: state.brokers,
            exportedAt: new Date().toISOString()
          });
        }

        addActivity(`Export created: ${key}`);
      });
    });
  }

  function bindHeaderActions() {
    $("seedBtn").addEventListener("click", () => {
      seedData(true);
      refresh();
    });

    $("refreshBtn").addEventListener("click", () => {
      refresh();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof seedData === "function") {
      // keep external compatibility if another file defines it
    }

    if (currentUser && $("currentUserText")) {
      $("currentUserText").textContent = `${currentUser.name} • ${currentUser.role}`;
    }

    loadState();
    if (!readJSON(KEYS.seeded, false)) {
      seedData();
    }

    bindNav();
    bindPropertyForm();
    bindBrokerForm();
    bindDelete();
    bindSearch();
    bindExport();
    bindHeaderActions();

    refresh();
  });
})();

