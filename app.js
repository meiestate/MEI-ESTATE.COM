(() => {
  "use strict";

  window.MEI_KEYS = {
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

  function getAllProperties() {
    return readJSON(window.MEI_KEYS.properties, []);
  }

  function saveAllProperties(list) {
    writeJSON(window.MEI_KEYS.properties, Array.isArray(list) ? list : []);
  }

  function getAllLeads() {
    return readJSON(window.MEI_KEYS.leads, []);
  }

  function saveAllLeads(list) {
    writeJSON(window.MEI_KEYS.leads, Array.isArray(list) ? list : []);
  }

  function getSession() {
    return readJSON(window.MEI_KEYS.session, null);
  }

  function saveSession(session) {
    writeJSON(window.MEI_KEYS.session, session || null);
  }

  function clearSession() {
    localStorage.removeItem(window.MEI_KEYS.session);
  }

  function getUsers() {
    return readJSON(window.MEI_KEYS.users, []);
  }

  function saveUsers(list) {
    writeJSON(window.MEI_KEYS.users, Array.isArray(list) ? list : []);
  }

  function seedUsers() {
    const existing = getUsers();
    if (existing.length) return;

    const sampleUsers = [
      {
        id: "USR_ADMIN_1",
        name: "Admin User",
        phone: "9999999999",
        role: "ADMIN",
        email: "admin@meiestate.com"
      },
      {
        id: "USR_BROKER_1",
        name: "Broker User",
        phone: "9888888888",
        role: "BROKER",
        email: "broker@meiestate.com"
      },
      {
        id: "USR_SELLER_1",
        name: "Seller User",
        phone: "9777777777",
        role: "SELLER",
        email: "seller@meiestate.com"
      }
    ];

    saveUsers(sampleUsers);
  }

  function seedProperties() {
    const existing = getAllProperties();
    if (existing.length) return;

    const demo = [
      {
        id: "PROP_1",
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
        createdAt: new Date().toISOString()
      },
      {
        id: "PROP_2",
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
        createdAt: new Date().toISOString()
      },
      {
        id: "PROP_3",
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
        featured: false,
        createdAt: new Date().toISOString()
      }
    ];

    saveAllProperties(demo);
  }

  function seedLeads() {
    const existing = getAllLeads();
    if (existing.length) return;

    const demoLeads = [
      {
        id: "LEAD_1",
        buyerName: "Ravi Kumar",
        buyerPhone: "9876543210",
        buyerCity: "Bangalore",
        listingTitle: "2 BHK Apartment in Whitefield",
        message: "Buyer lead for 2 BHK in Whitefield",
        source: "website",
        status: "NEW",
        createdAt: new Date().toISOString()
      }
    ];

    saveAllLeads(demoLeads);
  }

  function seedData() {
    seedUsers();
    seedProperties();
    seedLeads();
  }

  function clearAllMeiData() {
    Object.values(window.MEI_KEYS).forEach((key) => localStorage.removeItem(key));
  }

  window.readJSON = readJSON;
  window.writeJSON = writeJSON;
  window.getAllProperties = getAllProperties;
  window.saveAllProperties = saveAllProperties;
  window.getAllLeads = getAllLeads;
  window.saveAllLeads = saveAllLeads;
  window.getSession = getSession;
  window.saveSession = saveSession;
  window.clearSession = clearSession;
  window.getUsers = getUsers;
  window.saveUsers = saveUsers;
  window.seedData = seedData;
  window.clearAllMeiData = clearAllMeiData;
})();