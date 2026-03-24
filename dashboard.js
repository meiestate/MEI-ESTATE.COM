(() => {
  const $ = (id) => document.getElementById(id);

  function getSessionSafe() {
    try {
      if (typeof window.getSession === "function") return window.getSession();
    } catch (e) {}
    try {
      return JSON.parse(localStorage.getItem("mei_session_v1") || "null");
    } catch (e) {
      return null;
    }
  }

  function clearSessionSafe() {
    try {
      if (typeof window.clearSession === "function") {
        window.clearSession();
        return;
      }
    } catch (e) {}
    localStorage.removeItem("mei_session_v1");
  }

  function getPropertiesSafe() {
    try {
      if (typeof window.getAllProperties === "function") return window.getAllProperties();
    } catch (e) {}
    return [];
  }

  function getLeadsSafe() {
    try {
      if (typeof window.getAllLeads === "function") return window.getAllLeads();
    } catch (e) {}
    return [];
  }

  function getBrokersSafe() {
    try {
      if (typeof window.getAllBrokers === "function") return window.getAllBrokers();
    } catch (e) {}
    return [];
  }

  function fmtDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function makeStatus(status) {
    const raw = String(status || "").trim();
    const lower = raw.toLowerCase();
    return `<span class="statusPill ${lower}">${raw || "—"}</span>`;
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function countApproved(properties) {
    return properties.filter((x) => String(x.status || "").toLowerCase() === "approved").length;
  }

  function countPending(properties) {
    return properties.filter((x) => String(x.status || "").toLowerCase() === "pending").length;
  }

  function renderTable(rows, colspan = 4) {
    const body = $("tableBody");
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="${colspan}" class="emptyCell">No data available</td></tr>`;
      return;
    }
    body.innerHTML = rows.join("");
  }

  function buildAdminView(session, properties, leads, brokers) {
    setText("heroBadge", "ADMIN Command Center");
    $("heroTitle").textContent = `Welcome back, ${session.name || "Admin"}`;
    $("heroText").textContent = "This dashboard is your control room for approvals, CRM movement, broker activity and platform flow.";

    setText("profileName", session.name || "Admin");
    setText("profileMeta", `${session.email || ""} ${session.city ? "• " + session.city : ""}`.trim());
    setText("rolePill", "ADMIN");

    setText("miniStat1Value", String(countApproved(properties)));
    setText("miniStat1Label", "Approved Listings");
    setText("miniStat2Value", String(leads.length));
    setText("miniStat2Label", "CRM Leads");
    setText("miniStat3Value", String(brokers.length));
    setText("miniStat3Label", "Brokers");

    setText("stat1Value", String(countApproved(properties)));
    setText("stat1Label", "Approved Listings");
    setText("stat2Value", String(countPending(properties)));
    setText("stat2Label", "Pending Properties");
    setText("stat3Value", String(leads.length));
    setText("stat3Label", "CRM Leads");
    setText("stat4Value", String(brokers.length));
    setText("stat4Label", "Brokers");

    setText("actionSectionTitle", "Admin Quick Actions");
    setText("actionSectionText", "Fast operational paths for approvals, CRM and network oversight.");

    $("actionGrid").innerHTML = `
      <a class="actionCard" href="crm.html">
        <div class="actionIcon">📇</div>
        <div class="actionTitle">Open CRM</div>
        <div class="actionDesc">Review hot leads, move follow-ups and manage lead flow.</div>
      </a>
      <a class="actionCard" href="add-property.html">
        <div class="actionIcon">➕</div>
        <div class="actionTitle">Add Property</div>
        <div class="actionDesc">Create a property record or correct intake quickly.</div>
      </a>
      <a class="actionCard" href="broker-network.html">
        <div class="actionIcon">🤝</div>
        <div class="actionTitle">Broker Network</div>
        <div class="actionDesc">Monitor and strengthen broker-side collaboration.</div>
      </a>
    `;

    setText("tableTitle", "Latest Operational Activity");
    setText("tableText", "Recent leads and property intake that need attention.");

    const recentLeads = leads
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 6)
      .map((lead) => `
        <tr>
          <td>${lead.buyerName || "Lead"}</td>
          <td>${lead.listingTitle || lead.message || "CRM entry"}</td>
          <td>${makeStatus(lead.status || "NEW")}</td>
          <td>${fmtDate(lead.createdAt)}</td>
        </tr>
      `);

    renderTable(recentLeads);

    setText("sideTitle", "Admin Insight");
    setText("sideText", "The platform breathes through approvals, lead response speed and broker reliability.");

    $("insightList").innerHTML = `
      <div class="insightItem"><div class="insightDot"></div><div>${countPending(properties)} properties are currently waiting in pending state.</div></div>
      <div class="insightItem"><div class="insightDot"></div><div>${leads.length} leads are in the CRM pipeline right now.</div></div>
      <div class="insightItem"><div class="insightDot"></div><div>${brokers.length} broker records are available in the network layer.</div></div>
    `;

    $("fastLinks").innerHTML = `
      <a class="linkBtn" href="crm.html">Open CRM</a>
      <a class="linkBtn" href="add-property.html">Add Property</a>
      <a class="linkBtn" href="listings.html">View Listings</a>
      <a class="linkBtn" href="broker-network.html">Broker Network</a>
    `;
  }

  function buildBrokerView(session, properties, leads, brokers) {
    const myName = String(session.name || "").trim().toLowerCase();
    const myProperties = properties.filter((p) => String(p.brokerName || "").trim().toLowerCase() === myName);
    const myLeads = leads.filter((l) => {
      const assigned = String(l.assignedBrokerName || l.assignedTo || "").trim().toLowerCase();
      return assigned === myName || !assigned;
    });

    setText("heroBadge", "BROKER Workspace");
    $("heroTitle").textContent = `Welcome back, ${session.name || "Broker"}`;
    $("heroText").textContent = "This dashboard is tuned for movement — leads, listings, network and next action all in one place.";

    setText("profileName", session.name || "Broker");
    setText("profileMeta", `${session.area || ""} ${session.city ? "• " + session.city : ""}`.trim() || "Broker Workspace");
    setText("rolePill", "BROKER");

    setText("miniStat1Value", String(myProperties.length));
    setText("miniStat1Label", "My Listings");
    setText("miniStat2Value", String(myLeads.length));
    setText("miniStat2Label", "Lead Flow");
    setText("miniStat3Value", String(brokers.length));
    setText("miniStat3Label", "Network");

    setText("stat1Value", String(myProperties.length));
    setText("stat1Label", "My Listings");
    setText("stat2Value", String(countApproved(myProperties)));
    setText("stat2Label", "Approved");
    setText("stat3Value", String(myLeads.length));
    setText("stat3Label", "Lead Flow");
    setText("stat4Value", String(brokers.length));
    setText("stat4Label", "Broker Network");

    setText("actionSectionTitle", "Broker Quick Actions");
    setText("actionSectionText", "Fast paths for follow-up, new inventory and network-driven opportunities.");

    $("actionGrid").innerHTML = `
      <a class="actionCard" href="crm.html">
        <div class="actionIcon">📇</div>
        <div class="actionTitle">Open CRM</div>
        <div class="actionDesc">Move your enquiries and keep the pipeline hot.</div>
      </a>
      <a class="actionCard" href="add-property.html">
        <div class="actionIcon">➕</div>
        <div class="actionTitle">Add Property</div>
        <div class="actionDesc">Push fresh inventory into the system fast.</div>
      </a>
      <a class="actionCard" href="broker-network.html">
        <div class="actionIcon">🤝</div>
        <div class="actionTitle">Broker Network</div>
        <div class="actionDesc">Open collaboration and co-broking paths.</div>
      </a>
    `;

    setText("tableTitle", "Lead & Listing Pulse");
    setText("tableText", "Your nearest live opportunities and visible inventory movement.");

    const rows = [
      ...myLeads.slice(0, 3).map((lead) => `
        <tr>
          <td>${lead.buyerName || "Lead"}</td>
          <td>${lead.listingTitle || lead.message || "Lead enquiry"}</td>
          <td>${makeStatus(lead.status || "NEW")}</td>
          <td>${fmtDate(lead.createdAt)}</td>
        </tr>
      `),
      ...myProperties.slice(0, 3).map((property) => `
        <tr>
          <td>${property.title || "Property"}</td>
          <td>${property.area || property.city || "Listing"}</td>
          <td>${makeStatus(String(property.status || "").toUpperCase())}</td>
          <td>${fmtDate(property.createdAt)}</td>
        </tr>
      `)
    ];

    renderTable(rows);

    setText("sideTitle", "Broker Insight");
    setText("sideText", "Your leverage grows when you keep listings visible and leads moving.");

    $("insightList").innerHTML = `
      <div class="insightItem"><div class="insightDot"></div><div>You currently have ${myProperties.length} listing records connected to your name.</div></div>
      <div class="insightItem"><div class="insightDot"></div><div>${myLeads.length} leads are visible in your current workflow layer.</div></div>
      <div class="insightItem"><div class="insightDot"></div><div>The broker network contains ${brokers.length} broker entries for collaboration.</div></div>
    `;

    $("fastLinks").innerHTML = `
      <a class="linkBtn" href="crm.html">Open CRM</a>
      <a class="linkBtn" href="add-property.html">Add Property</a>
      <a class="linkBtn" href="listings.html">Open Listings</a>
      <a class="linkBtn" href="broker-network.html">Broker Network</a>
    `;
  }

  function buildSellerView(session, properties, leads, brokers) {
    const sellerName = String(session.name || "").trim().toLowerCase();
    const myProperties = properties.filter((p) => String(p.sellerName || "").trim().toLowerCase() === sellerName);
    const visibleProperties = myProperties.length ? myProperties : properties.slice(0, 4);

    setText("heroBadge", "SELLER Workspace");
    $("heroTitle").textContent = `Welcome back, ${session.name || "Seller"}`;
    $("heroText").textContent = "This dashboard keeps the seller journey simple — posting, visibility and public listing awareness.";

    setText("profileName", session.name || "Seller");
    setText("profileMeta", `${session.area || ""} ${session.city ? "• " + session.city : ""}`.trim() || "Seller Workspace");
    setText("rolePill", "SELLER");

    setText("miniStat1Value", String(visibleProperties.length));
    setText("miniStat1Label", "Visible Listings");
    setText("miniStat2Value", String(countApproved(visibleProperties)));
    setText("miniStat2Label", "Approved");
    setText("miniStat3Value", String(brokers.length));
    setText("miniStat3Label", "Broker Reach");

    setText("stat1Value", String(visibleProperties.length));
    setText("stat1Label", "Visible Listings");
    setText("stat2Value", String(countApproved(visibleProperties)));
    setText("stat2Label", "Approved");
    setText("stat3Value", String(countPending(visibleProperties)));
    setText("stat3Label", "Pending");
    setText("stat4Value", String(leads.length));
    setText("stat4Label", "Platform Leads");

    setText("actionSectionTitle", "Seller Quick Actions");
    setText("actionSectionText", "Fast paths for posting property and tracking public-facing visibility.");

    $("actionGrid").innerHTML = `
      <a class="actionCard" href="add-property.html">
        <div class="actionIcon">➕</div>
        <div class="actionTitle">Add Property</div>
        <div class="actionDesc">Create a new seller-side listing entry.</div>
      </a>
      <a class="actionCard" href="listings.html">
        <div class="actionIcon">📋</div>
        <div class="actionTitle">View Listings</div>
        <div class="actionDesc">See how approved properties appear in public space.</div>
      </a>
      <a class="actionCard" href="index.html#lead">
        <div class="actionIcon">📩</div>
        <div class="actionTitle">Post Requirement</div>
        <div class="actionDesc">Use homepage forms to send a fresh requirement.</div>
      </a>
    `;

    setText("tableTitle", "Listing Visibility");
    setText("tableText", "Recent listings related to your seller-side workspace.");

    const rows = visibleProperties.slice(0, 6).map((property) => `
      <tr>
        <td>${property.title || "Property"}</td>
        <td>${property.area || property.city || "Listing"}</td>
        <td>${makeStatus(String(property.status || "").toUpperCase())}</td>
        <td>${fmtDate(property.createdAt)}</td>
      </tr>
    `);

    renderTable(rows);

    setText("sideTitle", "Seller Insight");
    setText("sideText", "The seller journey gets stronger when listings become approved and visible.");

    $("insightList").innerHTML = `
      <div class="insightItem"><div class="insightDot"></div><div>${countApproved(visibleProperties)} listings are currently approved in your visible scope.</div></div>
      <div class="insightItem"><div class="insightDot"></div><div>${countPending(visibleProperties)} listings are still in pending review state.</div></div>
      <div class="insightItem"><div class="insightDot"></div><div>${brokers.length} brokers exist in the platform network that can support reach.</div></div>
    `;

    $("fastLinks").innerHTML = `
      <a class="linkBtn" href="add-property.html">Add Property</a>
      <a class="linkBtn" href="listings.html">View Listings</a>
      <a class="linkBtn" href="index.html#lead">Post Lead</a>
      <a class="linkBtn" href="index.html">Open Homepage</a>
    `;
  }

  function bootstrap() {
    if (typeof window.seedData === "function") {
      window.seedData();
    }

    const session = getSessionSafe();

    if (!session || !session.role) {
      window.location.href = "login.html";
      return;
    }

    const properties = getPropertiesSafe();
    const leads = getLeadsSafe();
    const brokers = getBrokersSafe();
    const role = String(session.role || "").toUpperCase();

    if (role === "ADMIN") {
      buildAdminView(session, properties, leads, brokers);
    } else if (role === "SELLER") {
      buildSellerView(session, properties, leads, brokers);
    } else {
      buildBrokerView(session, properties, leads, brokers);
    }

    $("logoutBtn").addEventListener("click", () => {
      clearSessionSafe();
      window.location.href = "index.html";
    });
  }

  bootstrap();
})();