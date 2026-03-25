(() => {
  "use strict";

  const MEI_KEYS = {
    properties: "mei_properties_v1",
    leads: "mei_leads_v1",
    brokers: "mei_brokers_v1",
    settings: "mei_settings_v1",
    materialLeads: "mei_material_leads_v1",
    serviceLeads: "mei_service_leads_v1",
    sellerLeads: "mei_seller_leads_v1",
    session: "mei_session_v1",
    users: "mei_users_v1"
  };

  const DEMO_FLAG_KEY = "mei_demo_seeded_v1";

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

  function removeKey(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error("removeKey error:", key, err);
    }
  }

  function cleanDigits(value) {
    return String(value || "").replace(/[^\d]/g, "");
  }

  function normalizePhone(value) {
    const digits = cleanDigits(value);
    if (digits.length === 12 && digits.startsWith("91")) return digits;
    if (digits.length === 10) return digits;
    return digits;
  }

  function cleanNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const digits = String(value || "").replace(/[^\d]/g, "");
    return digits ? Number(digits) : 0;
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

  function normalizeStatus(status, fallback = "NEW") {
    const s = String(status || fallback).trim().toUpperCase();
    return s || fallback;
  }

  function normalizePropertyStatus(status) {
    const s = String(status || "pending").trim().toLowerCase();
    if (["pending", "approved", "rejected", "archived"].includes(s)) return s;
    return "pending";
  }

  function normalizeRole(role, fallback = "BROKER") {
    const r = String(role || fallback).trim().toUpperCase();
    if (["ADMIN", "BROKER", "SELLER"].includes(r)) return r;
    return fallback;
  }

  function makeId(prefix = "ID") {
    try {
      if (window.crypto && crypto.randomUUID) {
        return `${prefix}_${crypto.randomUUID()}`;
      }
    } catch (err) {}
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }

  function todayISO() {
    return new Date().toISOString();
  }

  function normalizeProperty(item) {
    const p = Object.assign({}, item || {});
    return {
      id: String(p.id || makeId("PROP")),
      title: String(p.title || p.name || "Untitled Property").trim(),
      city: String(p.city || "").trim(),
      area: String(p.area || p.locality || "").trim(),
      type: normalizeType(p.type),
      bhk: String(p.bhk || "").trim(),
      price: cleanNumber(p.price),
      sqft: cleanNumber(p.sqft || p.areaSqft || p.area_size),
      description: String(p.description || p.desc || p.note || "").trim(),
      image: String(p.image || "").trim(),
      gallery: Array.isArray(p.gallery) ? p.gallery.filter(Boolean) : [],
      sellerName: String(p.sellerName || p.contactName || "").trim(),
      sellerPhone: normalizePhone(p.sellerPhone || p.phone || ""),
      brokerName: String(p.brokerName || "").trim(),
      brokerId: String(p.brokerId || "").trim(),
      status: normalizePropertyStatus(p.status),
      createdAt: p.createdAt || todayISO(),
      approvedAt: p.approvedAt || "",
      featured: Boolean(p.featured)
    };
  }

  function normalizeLead(item) {
    const x = Object.assign({}, item || {});
    return {
      id: String(x.id || makeId("LEAD")),
      propertyId: String(x.propertyId || x.listingId || "").trim(),
      propertyTitle: String(x.propertyTitle || x.listingTitle || "").trim(),
      listingId: String(x.listingId || x.propertyId || "").trim(),
      listingTitle: String(x.listingTitle || x.propertyTitle || "").trim(),
      buyerName: String(x.buyerName || "").trim(),
      buyerPhone: normalizePhone(x.buyerPhone || ""),
      buyerCity: String(x.buyerCity || "").trim(),
      message: String(x.message || "").trim(),
      source: String(x.source || "website").trim(),
      status: normalizeStatus(x.status, "NEW"),
      assignedBrokerId: String(x.assignedBrokerId || "").trim(),
      assignedBrokerName: String(x.assignedBrokerName || "").trim(),
      assignedTo: String(x.assignedTo || x.assignedBrokerName || "").trim(),
      followUp: String(x.followUp || x.followUpDate || "").trim(),
      followUpDate: String(x.followUpDate || x.followUp || "").trim(),
      notes: String(x.notes || "").trim(),
      createdAt: x.createdAt || todayISO(),
      updatedAt: x.updatedAt || ""
    };
  }

  function normalizeBroker(item) {
    if (typeof item === "string") {
      return {
        id: makeId("BRK"),
        name: item.trim(),
        phone: "",
        city: "",
        area: "",
        company: "",
        status: "active",
        joinedAt: todayISO()
      };
    }

    const x = Object.assign({}, item || {});
    return {
      id: String(x.id || makeId("BRK")),
      name: String(x.name || "").trim(),
      phone: normalizePhone(x.phone || ""),
      city: String(x.city || "").trim(),
      area: String(x.area || "").trim(),
      company: String(x.company || "").trim(),
      status: String(x.status || "active").trim(),
      joinedAt: x.joinedAt || todayISO()
    };
  }

  function normalizeSellerLead(item) {
    const x = Object.assign({}, item || {});
    return {
      id: String(x.id || makeId("SEL")),
      createdAt: x.createdAt || todayISO(),
      sellerName: String(x.sellerName || "").trim(),
      phone: normalizePhone(x.phone || ""),
      sellerType: String(x.sellerType || "").trim(),
      propertyType: String(x.propertyType || "").trim(),
      listingTitle: String(x.listingTitle || "").trim(),
      city: String(x.city || "").trim(),
      area: String(x.area || "").trim(),
      expectedPrice: String(x.expectedPrice || "").trim(),
      urgency: String(x.urgency || "").trim(),
      documentsReady: String(x.documentsReady || "").trim(),
      notes: String(x.notes || "").trim(),
      status: normalizeStatus(x.status, "NEW")
    };
  }

  function normalizeMaterialLead(item) {
    const x = Object.assign({}, item || {});
    return {
      id: String(x.id || makeId("MAT")),
      createdAt: x.createdAt || todayISO(),
      name: String(x.name || "").trim(),
      phone: normalizePhone(x.phone || ""),
      materialType: String(x.materialType || "").trim(),
      quantity: String(x.quantity || "").trim(),
      unit: String(x.unit || "").trim(),
      location: String(x.location || "").trim(),
      requiredDate: String(x.requiredDate || "").trim(),
      budget: String(x.budget || "").trim(),
      customerType: String(x.customerType || "").trim(),
      transport: String(x.transport || "").trim(),
      notes: String(x.notes || "").trim(),
      status: normalizeStatus(x.status, "NEW")
    };
  }

  function normalizeServiceLead(item) {
    const x = Object.assign({}, item || {});
    return {
      id: String(x.id || makeId("SER")),
      createdAt: x.createdAt || todayISO(),
      name: String(x.name || "").trim(),
      phone: normalizePhone(x.phone || ""),
      serviceType: String(x.serviceType || "").trim(),
      propertyType: String(x.propertyType || "").trim(),
      location: String(x.location || "").trim(),
      preferredDate: String(x.preferredDate || "").trim(),
      budget: String(x.budget || "").trim(),
      customerType: String(x.customerType || "").trim(),
      priority: String(x.priority || "").trim(),
      siteVisit: String(x.siteVisit || "").trim(),
      notes: String(x.notes || "").trim(),
      status: normalizeStatus(x.status, "NEW")
    };
  }

  function normalizeUser(item) {
    const x = Object.assign({}, item || {});
    return {
      id: String(x.id || makeId("USR")),
      name: String(x.name || x.fullName || x.username || "").trim(),
      fullName: String(x.fullName || x.name || "").trim(),
      username: String(x.username || x.name || "").trim(),
      email: String(x.email || "").trim(),
      phone: normalizePhone(x.phone || ""),
      role: normalizeRole(x.role, "BROKER"),
      company: String(x.company || "").trim(),
      city: String(x.city || "").trim(),
      area: String(x.area || "").trim(),
      password: String(x.password || "").trim(),
      status: String(x.status || "active").trim().toLowerCase(),
      createdAt: x.createdAt || todayISO()
    };
  }

  function normalizeSession(item) {
    if (!item || typeof item !== "object") return null;
    return {
      id: String(item.id || "").trim(),
      name: String(item.name || item.fullName || item.username || "User").trim(),
      fullName: String(item.fullName || item.name || "").trim(),
      username: String(item.username || item.name || "").trim(),
      email: String(item.email || "").trim(),
      phone: normalizePhone(item.phone || ""),
      role: normalizeRole(item.role, "BROKER"),
      company: String(item.company || "").trim(),
      city: String(item.city || "").trim(),
      area: String(item.area || "").trim(),
      loginAt: item.loginAt || todayISO()
    };
  }

  function getAllProperties() {
    return readJSON(MEI_KEYS.properties, []).map(normalizeProperty);
  }

  function saveAllProperties(items) {
    return writeJSON(MEI_KEYS.properties, (items || []).map(normalizeProperty));
  }

  function getApprovedProperties() {
    return getAllProperties().filter((p) => p.status === "approved");
  }

  function getPendingProperties() {
    return getAllProperties().filter((p) => p.status === "pending");
  }

  function getAllLeads() {
    return readJSON(MEI_KEYS.leads, []).map(normalizeLead);
  }

  function saveAllLeads(items) {
    return writeJSON(MEI_KEYS.leads, (items || []).map(normalizeLead));
  }

  function getAllBrokers() {
    return readJSON(MEI_KEYS.brokers, []).map(normalizeBroker).filter((x) => x.name);
  }

  function saveAllBrokers(items) {
    return writeJSON(MEI_KEYS.brokers, (items || []).map(normalizeBroker).filter((x) => x.name));
  }

  function addBroker(nameOrObject) {
    const current = getAllBrokers();
    const broker = normalizeBroker(nameOrObject);
    if (!broker.name) return false;

    const exists = current.some((x) => x.name.toLowerCase() === broker.name.toLowerCase());
    if (exists) return false;

    current.unshift(broker);
    saveAllBrokers(current);
    return true;
  }

  function getSellerLeads() {
    return readJSON(MEI_KEYS.sellerLeads, []).map(normalizeSellerLead);
  }

  function saveSellerLeads(items) {
    return writeJSON(MEI_KEYS.sellerLeads, (items || []).map(normalizeSellerLead));
  }

  function getMaterialLeads() {
    return readJSON(MEI_KEYS.materialLeads, []).map(normalizeMaterialLead);
  }

  function saveMaterialLeads(items) {
    return writeJSON(MEI_KEYS.materialLeads, (items || []).map(normalizeMaterialLead));
  }

  function getServiceLeads() {
    return readJSON(MEI_KEYS.serviceLeads, []).map(normalizeServiceLead);
  }

  function saveServiceLeads(items) {
    return writeJSON(MEI_KEYS.serviceLeads, (items || []).map(normalizeServiceLead));
  }

  function getSettings() {
    return readJSON(MEI_KEYS.settings, {
      whatsappNumber: "",
      companyName: "MEI Estate",
      city: "Bangalore"
    });
  }

  function saveSettings(settings) {
    const current = getSettings();
    const merged = Object.assign({}, current, settings || {});
    return writeJSON(MEI_KEYS.settings, merged);
  }

  function getUsers() {
    return readJSON(MEI_KEYS.users, []).map(normalizeUser).filter((x) => x.name || x.phone || x.email);
  }

  function saveUsers(items) {
    return writeJSON(MEI_KEYS.users, (items || []).map(normalizeUser).filter((x) => x.name || x.phone || x.email));
  }

  function getUserById(id) {
    return getUsers().find((u) => u.id === String(id || "").trim()) || null;
  }

  function findUserByPhone(phone) {
    const norm = normalizePhone(phone);
    if (!norm) return null;
    return getUsers().find((u) => u.phone === norm) || null;
  }

  function findUserByEmail(email) {
    const e = String(email || "").trim().toLowerCase();
    if (!e) return null;
    return getUsers().find((u) => String(u.email || "").toLowerCase() === e) || null;
  }

  function upsertUser(user) {
    const items = getUsers();
    const normalized = normalizeUser(user);
    const idx = items.findIndex((x) => x.id === normalized.id);

    if (idx >= 0) {
      items[idx] = normalized;
    } else {
      items.unshift(normalized);
    }

    saveUsers(items);
    return normalized;
  }

  function getSession() {
    return normalizeSession(readJSON(MEI_KEYS.session, null));
  }

  function saveSession(session) {
    const normalized = normalizeSession(session);
    return writeJSON(MEI_KEYS.session, normalized);
  }

  function clearSession() {
    removeKey(MEI_KEYS.session);
  }

  function seedProperties() {
    const existing = getAllProperties();
    if (existing.length) return;

    const demo = [
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
        featured: true,
        brokerName: "Raj"
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
        featured: false,
        brokerName: "Karthik"
      },
      {
        id: "demo3",
        title: "Residential Plot in Bangalore East",
        city: "Bangalore",
        area: "Hoskote",
        type: "Plot",
        bhk: "",
        price: 2500000,
        sqft: 1500,
        description: "Clear documents • Investment-ready plot",
        image: "",
        status: "approved",
        featured: false,
        brokerName: "Priya"
      },
      {
        id: "demo4",
        title: "3 BHK Villa in Sarjapur",
        city: "Bangalore",
        area: "Sarjapur",
        type: "Villa",
        bhk: "3 BHK",
        price: 14500000,
        sqft: 2100,
        description: "Premium gated villa • Calm layout",
        image: "",
        status: "pending",
        featured: false,
        brokerName: "Raj"
      }
    ];

    saveAllProperties(demo);
  }

  function seedBrokers() {
    const existing = getAllBrokers();
    if (existing.length) return;

    saveAllBrokers([
      { name: "Raj", city: "Bangalore", area: "Whitefield", company: "MEI Associate" },
      { name: "Karthik", city: "Bangalore", area: "Hoodi", company: "MEI Associate" },
      { name: "Priya", city: "Bangalore", area: "Sarjapur", company: "MEI Associate" }
    ]);
  }

  function seedSettings() {
    const current = getSettings();
    if (!current.companyName || !current.city) {
      saveSettings({
        companyName: "MEI Estate",
        city: "Bangalore",
        whatsappNumber: "919999999999"
      });
    }
  }

  function seedUsers() {
    const existing = getUsers();
    if (existing.length) return;

    saveUsers([
      {
        id: "USR_ADMIN_1",
        name: "Admin User",
        fullName: "Admin User",
        username: "admin",
        email: "admin@meiestate.com",
        phone: "9999999999",
        role: "ADMIN",
        company: "MEI Estate",
        city: "Bangalore",
        area: "HQ",
        password: "1234",
        status: "active"
      },
      {
        id: "USR_BROKER_1",
        name: "Raj Broker",
        fullName: "Raj Broker",
        username: "broker",
        email: "broker@meiestate.com",
        phone: "9888888888",
        role: "BROKER",
        company: "MEI Associate",
        city: "Bangalore",
        area: "Whitefield",
        password: "1234",
        status: "active"
      },
      {
        id: "USR_SELLER_1",
        name: "Seller User",
        fullName: "Seller User",
        username: "seller",
        email: "seller@meiestate.com",
        phone: "9777777777",
        role: "SELLER",
        company: "",
        city: "Bangalore",
        area: "Sarjapur",
        password: "1234",
        status: "active"
      }
    ]);
  }

  function seedData() {
    const alreadySeeded = localStorage.getItem(DEMO_FLAG_KEY);
    if (alreadySeeded) return;

    seedProperties();
    seedBrokers();
    seedSettings();
    seedUsers();

    localStorage.setItem(DEMO_FLAG_KEY, "1");
  }

  function clearAllMeiData() {
    removeKey(MEI_KEYS.properties);
    removeKey(MEI_KEYS.leads);
    removeKey(MEI_KEYS.brokers);
    removeKey(MEI_KEYS.settings);
    removeKey(MEI_KEYS.materialLeads);
    removeKey(MEI_KEYS.serviceLeads);
    removeKey(MEI_KEYS.sellerLeads);
    removeKey(MEI_KEYS.session);
    removeKey(MEI_KEYS.users);
    removeKey(DEMO_FLAG_KEY);
  }

  function getPropertyById(id) {
    return getAllProperties().find((p) => p.id === String(id || "").trim()) || null;
  }

  function getApprovedPropertyById(id) {
    return (
      getAllProperties().find(
        (p) => p.id === String(id || "").trim() && p.status === "approved"
      ) || null
    );
  }

  function upsertProperty(property) {
    const items = getAllProperties();
    const normalized = normalizeProperty(property);
    const idx = items.findIndex((x) => x.id === normalized.id);

    if (idx >= 0) items[idx] = normalized;
    else items.unshift(normalized);

    saveAllProperties(items);
    return normalized;
  }

  function upsertLead(lead) {
    const items = getAllLeads();
    const normalized = normalizeLead(lead);
    const idx = items.findIndex((x) => x.id === normalized.id);

    if (idx >= 0) items[idx] = normalized;
    else items.unshift(normalized);

    saveAllLeads(items);
    return normalized;
  }

  window.MEI_KEYS = MEI_KEYS;

  window.readJSON = readJSON;
  window.writeJSON = writeJSON;
  window.makeId = makeId;
  window.cleanDigits = cleanDigits;
  window.cleanNumber = cleanNumber;
  window.normalizePhone = normalizePhone;
  window.normalizeType = normalizeType;
  window.normalizeStatus = normalizeStatus;
  window.normalizeRole = normalizeRole;

  window.getAllProperties = getAllProperties;
  window.saveAllProperties = saveAllProperties;
  window.getApprovedProperties = getApprovedProperties;
  window.getPendingProperties = getPendingProperties;
  window.getPropertyById = getPropertyById;
  window.getApprovedPropertyById = getApprovedPropertyById;
  window.upsertProperty = upsertProperty;

  window.getAllLeads = getAllLeads;
  window.saveAllLeads = saveAllLeads;
  window.upsertLead = upsertLead;

  window.getAllBrokers = getAllBrokers;
  window.saveAllBrokers = saveAllBrokers;
  window.addBroker = addBroker;

  window.getSellerLeads = getSellerLeads;
  window.saveSellerLeads = saveSellerLeads;

  window.getMaterialLeads = getMaterialLeads;
  window.saveMaterialLeads = saveMaterialLeads;

  window.getServiceLeads = getServiceLeads;
  window.saveServiceLeads = saveServiceLeads;

  window.getSettings = getSettings;
  window.saveSettings = saveSettings;

  window.getUsers = getUsers;
  window.saveUsers = saveUsers;
  window.getUserById = getUserById;
  window.findUserByPhone = findUserByPhone;
  window.findUserByEmail = findUserByEmail;
  window.upsertUser = upsertUser;

  window.getSession = getSession;
  window.saveSession = saveSession;
  window.clearSession = clearSession;

  window.seedData = seedData;
  window.clearAllMeiData = clearAllMeiData;
})();