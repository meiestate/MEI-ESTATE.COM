const leadForm = document.getElementById("leadForm");
const leadTableBody = document.getElementById("leadTableBody");
const searchLead = document.getElementById("searchLead");

const totalLeads = document.getElementById("totalLeads");
const newLeads = document.getElementById("newLeads");
const siteVisits = document.getElementById("siteVisits");
const wonDeals = document.getElementById("wonDeals");

let leads = JSON.parse(localStorage.getItem("crmLeads")) || [];

function saveLeads() {
  localStorage.setItem("crmLeads", JSON.stringify(leads));
}

function statusClass(status) {
  return `status-${status.replace(/\s+/g, "-")}`;
}

function renderStats() {
  totalLeads.textContent = leads.length;
  newLeads.textContent = leads.filter(l => l.status === "New").length;
  siteVisits.textContent = leads.filter(l => l.status === "Site Visit").length;
  wonDeals.textContent = leads.filter(l => l.status === "Won").length;
}

function renderLeads(filteredLeads = leads) {
  leadTableBody.innerHTML = "";

  if (filteredLeads.length === 0) {
    leadTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:#94a3b8;">No leads found</td>
      </tr>
    `;
    return;
  }

  filteredLeads.forEach((lead, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${lead.customerName}</td>
      <td>${lead.phone}</td>
      <td>${lead.city}</td>
      <td><span class="status-badge ${statusClass(lead.status)}">${lead.status}</span></td>
      <td>${lead.assignedBroker || "-"}</td>
      <td>${lead.followUpDate || "-"}</td>
      <td><button class="action-btn" onclick="deleteLead(${index})">Delete</button></td>
    `;
    leadTableBody.appendChild(row);
  });
}

function deleteLead(index) {
  if (confirm("இந்த lead-ஐ delete பண்ணவா?")) {
    leads.splice(index, 1);
    saveLeads();
    renderStats();
    renderLeads();
  }
}

leadForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const lead = {
    customerName: document.getElementById("customerName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim(),
    city: document.getElementById("city").value.trim(),
    budget: document.getElementById("budget").value.trim(),
    propertyLink: document.getElementById("propertyLink").value.trim(),
    assignedBroker: document.getElementById("assignedBroker").value.trim(),
    status: document.getElementById("status").value,
    followUpDate: document.getElementById("followUpDate").value,
    notes: document.getElementById("notes").value.trim()
  };

  leads.unshift(lead);
  saveLeads();
  renderStats();
  renderLeads();
  leadForm.reset();
});

searchLead.addEventListener("input", function () {
  const query = this.value.toLowerCase();

  const filtered = leads.filter(lead =>
    lead.customerName.toLowerCase().includes(query) ||
    lead.city.toLowerCase().includes(query) ||
    (lead.assignedBroker || "").toLowerCase().includes(query)
  );

  renderLeads(filtered);
});

renderStats();
renderLeads();

