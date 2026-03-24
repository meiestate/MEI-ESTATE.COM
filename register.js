(() => {
  const $ = (id) => document.getElementById(id);

  function cleanDigits(value) {
    return String(value || "").replace(/[^\d]/g, "");
  }

  function normalizePhone(value) {
    const digits = cleanDigits(value);
    if (digits.length === 10) return digits;
    if (digits.length === 12 && digits.startsWith("91")) return digits;
    return digits;
  }

  function isValidPhone(value) {
    const digits = cleanDigits(value);
    return digits.length === 10 || (digits.length === 12 && digits.startsWith("91"));
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function showError(msg) {
    $("registerErr").textContent = msg;
    $("registerErr").hidden = false;
    $("registerOk").hidden = true;
  }

  function showSuccess(msg) {
    $("registerOk").textContent = msg;
    $("registerOk").hidden = false;
    $("registerErr").hidden = true;
  }

  function clearMessages() {
    $("registerErr").hidden = true;
    $("registerOk").hidden = true;
    $("registerErr").textContent = "";
    $("registerOk").textContent = "";
  }

  function getUsersSafe() {
    if (typeof window.getUsers === "function") {
      return window.getUsers();
    }
    return [];
  }

  function findUserByEmailSafe(email) {
    if (typeof window.findUserByEmail === "function") {
      return window.findUserByEmail(email);
    }
    return getUsersSafe().find((u) => String(u.email || "").toLowerCase() === String(email || "").toLowerCase()) || null;
  }

  function findUserByPhoneSafe(phone) {
    if (typeof window.findUserByPhone === "function") {
      return window.findUserByPhone(phone);
    }
    const norm = normalizePhone(phone);
    return getUsersSafe().find((u) => normalizePhone(u.phone || "") === norm) || null;
  }

  function upsertUserSafe(user) {
    if (typeof window.upsertUser === "function") {
      return window.upsertUser(user);
    }
    return user;
  }

  function saveSessionSafe(session) {
    if (typeof window.saveSession === "function") {
      return window.saveSession(session);
    }
    localStorage.setItem("mei_session_v1", JSON.stringify(session));
    return true;
  }

  function normalizeRole(role) {
    const r = String(role || "BROKER").trim().toUpperCase();
    if (["ADMIN", "BROKER", "SELLER"].includes(r)) return r;
    return "BROKER";
  }

  function buildUserPayload() {
    const fullName = $("fullName").value.trim();
    const role = normalizeRole($("role").value);
    const email = $("email").value.trim().toLowerCase();
    const phone = normalizePhone($("phone").value);
    const city = $("city").value.trim();
    const area = $("area").value.trim();
    const company = $("company").value.trim();
    const password = $("password").value.trim();

    return {
      name: fullName,
      fullName,
      username: fullName,
      email,
      phone,
      role,
      city,
      area,
      company,
      password,
      status: "active",
      createdAt: new Date().toISOString()
    };
  }

  function buildSessionFromUser(user) {
    return {
      id: user.id,
      name: user.name || user.fullName || "User",
      fullName: user.fullName || user.name || "",
      username: user.username || user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "BROKER",
      company: user.company || "",
      city: user.city || "",
      area: user.area || "",
      loginAt: new Date().toISOString()
    };
  }

  function togglePassword(id, btnId) {
    const input = $(id);
    const btn = $(btnId);

    if (input.type === "password") {
      input.type = "text";
      btn.textContent = "Hide";
    } else {
      input.type = "password";
      btn.textContent = "Show";
    }
  }

  function clearForm() {
    $("registerForm").reset();
    clearMessages();
    $("fullName").focus();
  }

  function fillBrokerSample() {
    $("fullName").value = "New Broker";
    $("role").value = "BROKER";
    $("email").value = "newbroker@meiestate.com";
    $("phone").value = "9666666666";
    $("city").value = "Bangalore";
    $("area").value = "Whitefield";
    $("company").value = "MEI Associate";
    $("password").value = "1234";
    $("confirmPassword").value = "1234";
    $("agreeTerms").checked = true;
    clearMessages();
  }

  function handleRegister(e) {
    e.preventDefault();
    clearMessages();

    const fullName = $("fullName").value.trim();
    const role = normalizeRole($("role").value);
    const email = $("email").value.trim().toLowerCase();
    const phone = $("phone").value.trim();
    const city = $("city").value.trim();
    const password = $("password").value.trim();
    const confirmPassword = $("confirmPassword").value.trim();
    const agreeTerms = $("agreeTerms").checked;

    if (!fullName) {
      showError("Full name is required.");
      $("fullName").focus();
      return;
    }

    if (!isValidEmail(email)) {
      showError("Enter a valid email address.");
      $("email").focus();
      return;
    }

    if (!isValidPhone(phone)) {
      showError("Enter valid 10-digit phone or 91XXXXXXXXXX.");
      $("phone").focus();
      return;
    }

    if (!city) {
      showError("City is required.");
      $("city").focus();
      return;
    }

    if (password.length < 4) {
      showError("Password must be at least 4 characters.");
      $("password").focus();
      return;
    }

    if (password !== confirmPassword) {
      showError("Password and confirm password do not match.");
      $("confirmPassword").focus();
      return;
    }

    if (!agreeTerms) {
      showError("Please confirm your details before continuing.");
      $("agreeTerms").focus();
      return;
    }

    if (findUserByEmailSafe(email)) {
      showError("This email is already registered.");
      $("email").focus();
      return;
    }

    if (findUserByPhoneSafe(phone)) {
      showError("This phone number is already registered.");
      $("phone").focus();
      return;
    }

    const newUser = buildUserPayload();

    if (role === "ADMIN") {
      showError("Admin registration is restricted. Use an existing admin account.");
      $("role").focus();
      return;
    }

    const savedUser = upsertUserSafe(newUser);
    const session = buildSessionFromUser(savedUser);

    saveSessionSafe(session);
    showSuccess(`Account created successfully • Role: ${session.role}`);

    setTimeout(() => {
      window.location.href = "index.html";
    }, 800);
  }

  function seedIfNeeded() {
    if (typeof window.seedData === "function") {
      window.seedData();
    }
  }

  $("registerForm").addEventListener("submit", handleRegister);
  $("togglePassword").addEventListener("click", () => togglePassword("password", "togglePassword"));
  $("toggleConfirmPassword").addEventListener("click", () => togglePassword("confirmPassword", "toggleConfirmPassword"));
  $("fillBrokerDemo").addEventListener("click", fillBrokerSample);
  $("clearForm").addEventListener("click", clearForm);

  [
    "fullName",
    "role",
    "email",
    "phone",
    "city",
    "area",
    "company",
    "password",
    "confirmPassword",
    "agreeTerms"
  ].forEach((id) => {
    $(id).addEventListener("input", clearMessages);
    $(id).addEventListener("change", clearMessages);
  });

  seedIfNeeded();
})();