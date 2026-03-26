(() => {
  "use strict";

  const USERS_KEY = "mei_users_v1";
  const CURRENT_USER_KEY = "mei_current_user_v1";

  // -----------------------------
  // Helpers
  // -----------------------------
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

  function uid() {
    try {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    return "id_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function normalizeRole(role) {
    const r = String(role || "").trim().toLowerCase();
    if (["admin", "buyer", "seller", "broker"].includes(r)) return r;
    return "buyer";
  }

  // -----------------------------
  // User store
  // -----------------------------
  function getUsers() {
    const users = readJSON(USERS_KEY, []);
    return Array.isArray(users) ? users : [];
  }

  function saveUsers(users) {
    return writeJSON(USERS_KEY, users || []);
  }

  function getCurrentUser() {
    return readJSON(CURRENT_USER_KEY, null);
  }

  function setCurrentUser(user) {
    return writeJSON(CURRENT_USER_KEY, user || null);
  }

  function clearCurrentUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  function findUserByEmail(email) {
    const users = getUsers();
    const e = normalizeEmail(email);
    return users.find(u => normalizeEmail(u.email) === e) || null;
  }

  // -----------------------------
  // Default admin seed
  // -----------------------------
  function ensureDefaultAdmin() {
    const users = getUsers();

    const hasAdmin = users.some(u => normalizeRole(u.role) === "admin");
    if (hasAdmin) return;

    users.push({
      id: uid(),
      name: "Admin",
      email: "admin@mei.com",
      password: "admin123",
      role: "admin",
      createdAt: new Date().toISOString(),
      isDefaultAdmin: true
    });

    saveUsers(users);
  }

  // -----------------------------
  // Register
  // -----------------------------
  function registerUser(payload) {
    ensureDefaultAdmin();

    const name = String(payload?.name || "").trim();
    const email = normalizeEmail(payload?.email || "");
    const password = String(payload?.password || "").trim();
    const role = normalizeRole(payload?.role || "buyer");

    if (!name) {
      return { ok: false, message: "Name is required" };
    }
    if (!email) {
      return { ok: false, message: "Email is required" };
    }
    if (!password) {
      return { ok: false, message: "Password is required" };
    }
    if (password.length < 4) {
      return { ok: false, message: "Password must be at least 4 characters" };
    }

    const users = getUsers();

    const exists = users.some(u => normalizeEmail(u.email) === email);
    if (exists) {
      return { ok: false, message: "Email already registered" };
    }

    const user = {
      id: uid(),
      name,
      email,
      password,
      role,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);

    return {
      ok: true,
      message: "Registration successful",
      user
    };
  }

  // -----------------------------
  // Login
  // -----------------------------
  function loginUser(email, password) {
    ensureDefaultAdmin();

    const e = normalizeEmail(email);
    const p = String(password || "");

    if (!e || !p) {
      return { ok: false, message: "Email and password are required" };
    }

    const users = getUsers();
    const user = users.find(
      u => normalizeEmail(u.email) === e && String(u.password || "") === p
    );

    if (!user) {
      return { ok: false, message: "Invalid email or password" };
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      createdAt: user.createdAt || "",
      loginAt: new Date().toISOString()
    };

    setCurrentUser(safeUser);

    return {
      ok: true,
      message: "Login successful",
      user: safeUser
    };
  }

  // -----------------------------
  // Logout
  // -----------------------------
  function logoutUser(redirectUrl = "login.html") {
    clearCurrentUser();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }

  // -----------------------------
  // Role checks
  // -----------------------------
  function isLoggedIn() {
    return !!getCurrentUser();
  }

  function hasRole(allowedRoles = []) {
    const user = getCurrentUser();
    if (!user) return false;

    const role = normalizeRole(user.role);
    const allowed = (allowedRoles || []).map(normalizeRole);

    return allowed.includes(role);
  }

  function requireLogin(redirectUrl = "login.html") {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }

  function requireRole(allowedRoles = [], redirectUrl = "login.html") {
    const user = getCurrentUser();

    if (!user) {
      window.location.href = redirectUrl;
      return false;
    }

    const role = normalizeRole(user.role);
    const allowed = (allowedRoles || []).map(normalizeRole);

    if (!allowed.includes(role)) {
      redirectByRole(role);
      return false;
    }

    return true;
  }

  // -----------------------------
  // Redirect helpers
  // -----------------------------
  function redirectByRole(role) {
    const r = normalizeRole(role);

    if (r === "admin") {
      window.location.href = "dashboard.html";
      return;
    }

    if (r === "buyer") {
      window.location.href = "buyer.html";
      return;
    }

    if (r === "seller") {
      window.location.href = "seller-dashboard.html";
      return;
    }

    if (r === "broker") {
      window.location.href = "broker-dashboard.html";
      return;
    }

    window.location.href = "index.html";
  }

  function redirectCurrentUser() {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    redirectByRole(user.role);
  }

  // -----------------------------
  // Optional page helpers
  // -----------------------------
  function handleRegisterForm(formSelector, options = {}) {
    const form = document.querySelector(formSelector);
    if (!form) return;

    const {
      nameSelector = '[name="name"]',
      emailSelector = '[name="email"]',
      passwordSelector = '[name="password"]',
      roleSelector = '[name="role"]',
      messageSelector = '[data-auth-message]',
      autoLogin = true
    } = options;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const nameEl = form.querySelector(nameSelector);
      const emailEl = form.querySelector(emailSelector);
      const passwordEl = form.querySelector(passwordSelector);
      const roleEl = form.querySelector(roleSelector);
      const msgEl = document.querySelector(messageSelector);

      const result = registerUser({
        name: nameEl ? nameEl.value : "",
        email: emailEl ? emailEl.value : "",
        password: passwordEl ? passwordEl.value : "",
        role: roleEl ? roleEl.value : "buyer"
      });

      if (msgEl) {
        msgEl.textContent = result.message;
        msgEl.style.color = result.ok ? "#00ff96" : "#ff4d7a";
      }

      if (!result.ok) return;

      if (autoLogin) {
        const loginResult = loginUser(
          emailEl ? emailEl.value : "",
          passwordEl ? passwordEl.value : ""
        );

        if (loginResult.ok) {
          redirectByRole(loginResult.user.role);
          return;
        }
      }

      window.location.href = "login.html";
    });
  }

  function handleLoginForm(formSelector, options = {}) {
    const form = document.querySelector(formSelector);
    if (!form) return;

    const {
      emailSelector = '[name="email"]',
      passwordSelector = '[name="password"]',
      messageSelector = '[data-auth-message]'
    } = options;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const emailEl = form.querySelector(emailSelector);
      const passwordEl = form.querySelector(passwordSelector);
      const msgEl = document.querySelector(messageSelector);

      const result = loginUser(
        emailEl ? emailEl.value : "",
        passwordEl ? passwordEl.value : ""
      );

      if (msgEl) {
        msgEl.textContent = result.message;
        msgEl.style.color = result.ok ? "#00ff96" : "#ff4d7a";
      }

      if (!result.ok) return;

      redirectByRole(result.user.role);
    });
  }

  // -----------------------------
  // Init
  // -----------------------------
  ensureDefaultAdmin();

  // -----------------------------
  // Expose globally
  // -----------------------------
  window.MEIAuth = {
    getUsers,
    saveUsers,
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
    registerUser,
    loginUser,
    logoutUser,
    isLoggedIn,
    hasRole,
    requireLogin,
    requireRole,
    redirectByRole,
    redirectCurrentUser,
    handleRegisterForm,
    handleLoginForm,
    ensureDefaultAdmin,
    findUserByEmail
  };

  // direct global helpers for old pages
  window.getUsers = getUsers;
  window.getCurrentUser = getCurrentUser;
  window.registerUser = registerUser;
  window.loginUser = loginUser;
  window.logoutUser = logoutUser;
  window.requireLogin = requireLogin;
  window.requireRole = requireRole;
  window.redirectCurrentUser = redirectCurrentUser;
})();

