(() => {
  const $ = (id) => document.getElementById(id);

  function cleanDigits(value) {
    return String(value || "").replace(/[^\d]/g, "");
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function isPhone(value) {
    const digits = cleanDigits(value);
    return digits.length === 10 || (digits.length === 12 && digits.startsWith("91"));
  }

  function normalizeIdentity(value) {
    const raw = String(value || "").trim();
    if (isEmail(raw)) return raw.toLowerCase();
    if (isPhone(raw)) return cleanDigits(raw);
    return raw;
  }

  function showError(msg) {
    $("loginErr").textContent = msg;
    $("loginErr").hidden = false;
    $("loginOk").hidden = true;
  }

  function showSuccess(msg) {
    $("loginOk").textContent = msg;
    $("loginOk").hidden = false;
    $("loginErr").hidden = true;
  }

  function clearMessages() {
    $("loginErr").hidden = true;
    $("loginOk").hidden = true;
    $("loginErr").textContent = "";
    $("loginOk").textContent = "";
  }

  function getUsersSafe() {
    if (typeof window.getUsers === "function") {
      return window.getUsers();
    }
    return [];
  }

  function saveSessionSafe(session) {
    if (typeof window.saveSession === "function") {
      return window.saveSession(session);
    }
    localStorage.setItem("mei_session_v1", JSON.stringify(session));
    return true;
  }

  function findMatchingUser(identity, password) {
    const users = getUsersSafe();
    const normIdentity = normalizeIdentity(identity);
    const normPassword = String(password || "").trim();

    return users.find((user) => {
      const email = String(user.email || "").trim().toLowerCase();
      const phone = cleanDigits(user.phone || "");
      const pass = String(user.password || "").trim();

      const identityMatch =
        (email && normIdentity === email) ||
        (phone && normIdentity === phone);

      return identityMatch && pass === normPassword;
    }) || null;
  }

  function buildSession(user) {
    return {
      id: user.id,
      name: user.name || user.fullName || user.username || "User",
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

  function fillDemo(identity, password) {
    $("identity").value = identity;
    $("password").value = password;
    $("identity").focus();
  }

  function clearForm() {
    $("loginForm").reset();
    clearMessages();
    $("identity").focus();
  }

  function togglePassword() {
    const input = $("password");
    const btn = $("togglePassword");

    if (input.type === "password") {
      input.type = "text";
      btn.textContent = "Hide";
    } else {
      input.type = "password";
      btn.textContent = "Show";
    }
  }

  function handleLogin(e) {
    e.preventDefault();
    clearMessages();

    const identity = $("identity").value.trim();
    const password = $("password").value.trim();
    const rememberMe = $("rememberMe").checked;

    if (!identity) {
      showError("Email or phone is required.");
      $("identity").focus();
      return;
    }

    if (!password) {
      showError("Password is required.");
      $("password").focus();
      return;
    }

    const matchedUser = findMatchingUser(identity, password);

    if (!matchedUser) {
      showError("Invalid login. Check email/phone and password.");
      return;
    }

    if (String(matchedUser.status || "").toLowerCase() !== "active") {
      showError("This account is not active.");
      return;
    }

    const session = buildSession(matchedUser);
    saveSessionSafe(session);

    if (rememberMe) {
      localStorage.setItem("mei_login_remember_identity_v1", normalizeIdentity(identity));
    } else {
      localStorage.removeItem("mei_login_remember_identity_v1");
    }

    showSuccess(`Login successful • Role: ${session.role}`);

    setTimeout(() => {
      window.location.href = "index.html";
    }, 700);
  }

  function loadRememberedIdentity() {
    const remembered = localStorage.getItem("mei_login_remember_identity_v1") || "";
    if (remembered) {
      $("identity").value = remembered;
      $("rememberMe").checked = true;
    }
  }

  function seedIfNeeded() {
    if (typeof window.seedData === "function") {
      window.seedData();
    }
  }

  $("loginForm").addEventListener("submit", handleLogin);
  $("togglePassword").addEventListener("click", togglePassword);
  $("clearForm").addEventListener("click", clearForm);

  $("fillAdmin").addEventListener("click", () => {
    fillDemo("admin@meiestate.com", "1234");
  });

  $("identity").addEventListener("input", clearMessages);
  $("password").addEventListener("input", clearMessages);

  seedIfNeeded();
  loadRememberedIdentity();
})();