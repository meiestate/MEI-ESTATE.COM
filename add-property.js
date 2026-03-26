(() => {
  "use strict";

  const PROPS_KEY = "mei_properties_v1";
  const DRAFT_KEY = "mei_add_property_draft_v1";

  const $ = (id) => document.getElementById(id);

  function readJSON(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    }catch(e){
      return fallback;
    }
  }

  function writeJSON(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid(){
    try{
      if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    }catch(e){}
    return "id_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function toast(msg){
    const box = $("toast");
    const txt = $("toastMsg");
    txt.textContent = msg;
    box.hidden = false;
    clearTimeout(window.__meiToastTimer);
    window.__meiToastTimer = setTimeout(() => {
      box.hidden = true;
    }, 2200);
  }

  function normalizePhone(v){
    return String(v || "").replace(/[^\d+]/g, "").trim();
  }

  function validatePhone(v){
    const clean = normalizePhone(v);
    return clean.length >= 10;
  }

  function getCurrentUserSafe(){
    try{
      if(typeof getCurrentUser === "function") return getCurrentUser();
    }catch(e){}
    return null;
  }

  function requireAllowedRole(){
    try{
      if(typeof requireRole === "function"){
        requireRole(["admin","broker","seller"]);
      }
    }catch(e){}
  }

  function getFormData(){
    return {
      id: uid(),
      title: $("title").value.trim(),
      type: $("type").value,
      price: $("price").value.trim(),
      city: $("city").value.trim(),
      area: $("area").value.trim(),
      beds: $("beds").value.trim(),
      baths: $("baths").value.trim(),
      description: $("description").value.trim(),
      ownerName: $("ownerName").value.trim(),
      ownerPhone: normalizePhone($("ownerPhone").value),
      source: $("source").value || "Admin",
      featured: $("featured").value === "true",
      notes: $("notes").value.trim(),
      status: "pending",
      createdAt: new Date().toISOString()
    };
  }

  function showError(msg){
    const err = $("formErr");
    err.textContent = msg;
    err.hidden = false;
  }

  function clearError(){
    $("formErr").hidden = true;
    $("formErr").textContent = "";
  }

  function validate(data){
    if(!data.title) return "Property title is required.";
    if(!data.type) return "Property type is required.";
    if(!data.price || Number(data.price) <= 0) return "Valid price is required.";
    if(!data.city) return "City is required.";
    if(!data.area) return "Area / locality is required.";
    if(!data.description) return "Description is required.";
    if(!data.ownerName) return "Owner / contact name is required.";
    if(!data.ownerPhone) return "Phone is required.";
    if(!validatePhone(data.ownerPhone)) return "Valid phone number is required.";
    if(!$("confirmCheck").checked) return "Please confirm property is ready for approval queue.";
    return "";
  }

  function saveProperty(e){
    e.preventDefault();
    clearError();

    const data = getFormData();
    const problem = validate(data);

    if(problem){
      showError(problem);
      return;
    }

    const list = readJSON(PROPS_KEY, []);
    list.unshift(data);
    writeJSON(PROPS_KEY, list);

    localStorage.removeItem(DRAFT_KEY);
    $("propertyForm").reset();

    toast("✅ Property saved successfully");
    
    setTimeout(() => {
      location.href = "dashboard.html";
    }, 700);
  }

  function saveDraft(){
    const data = {
      title: $("title").value,
      type: $("type").value,
      price: $("price").value,
      city: $("city").value,
      area: $("area").value,
      beds: $("beds").value,
      baths: $("baths").value,
      description: $("description").value,
      ownerName: $("ownerName").value,
      ownerPhone: $("ownerPhone").value,
      source: $("source").value,
      featured: $("featured").value,
      notes: $("notes").value,
      confirmCheck: $("confirmCheck").checked
    };
    writeJSON(DRAFT_KEY, data);
    clearError();
    toast("💾 Draft saved");
  }

  function loadDraft(){
    const d = readJSON(DRAFT_KEY, null);
    if(!d) return;

    $("title").value = d.title || "";
    $("type").value = d.type || "";
    $("price").value = d.price || "";
    $("city").value = d.city || "";
    $("area").value = d.area || "";
    $("beds").value = d.beds || "";
    $("baths").value = d.baths || "";
    $("description").value = d.description || "";
    $("ownerName").value = d.ownerName || "";
    $("ownerPhone").value = d.ownerPhone || "";
    $("source").value = d.source || "Admin";
    $("featured").value = d.featured || "false";
    $("notes").value = d.notes || "";
    $("confirmCheck").checked = !!d.confirmCheck;
  }

  function clearForm(){
    $("propertyForm").reset();
    localStorage.removeItem(DRAFT_KEY);
    clearError();
    toast("🧽 Form cleared");
  }

  function init(){
    requireAllowedRole();

    const user = getCurrentUserSafe();
    if(user && user.role === "seller"){
      $("source").value = "Seller";
    } else if(user && user.role === "broker"){
      $("source").value = "Broker";
    }

    loadDraft();

    $("propertyForm").addEventListener("submit", saveProperty);
    $("saveDraftBtn").addEventListener("click", saveDraft);
    $("clearBtn").addEventListener("click", clearForm);
  }

  document.addEventListener("DOMContentLoaded", init);
})();

