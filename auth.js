(() => {
  "use strict";

  const USERS_KEY = "mei_users_v1";
  const SESSION_KEY = "mei_current_user_v1";

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

  function cleanPhone(value) {
    return String(value || "").replace(/[^\d]/g, "").slice(-10);
  }

  function makeId(prefix = "USR") {
    try {
      if (window.crypto && crypto.randomUUID) {
        return `${prefix}_${crypto.randomUUID()}`;
      }
    } catch (err) {}
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }

  function normalizeRole(role) {
    const r = String(role || "").trim().toLowerCase();
    if (["admin", "broker", "seller", "buyer"].includes(r)) return r;
    return "buyer";
  }

  function getAllUsers() {
    return readJSON(USERS_KEY, []);
  }

  function saveAllUsers(users) {
    return writeJSON(USERS_KEY, users || []);
  }

  function getCurrentUser() {
    return readJSON(SESSION_KEY, null);
  }

  function setCurrentUser(user) {
    return writeJSON(SESSION_KEY, user || null);
  }

  function logoutUser() {
    removeKey(SESSION_KEY);
    window.location.href = "login.html";
  }

  function findUserByEmail(email) {
    const users = getAllUsers();
    return users.find(
      u => String(u.email || "").trim().toLowerCase() === String(email || "").trim().toLowerCase()
    ) || null;
  }

  function registerUser(payload) {
    const users = getAllUsers();

    const name = String(payload?.name || "").trim();
    const phone = cleanPhone(payload?.phone || "");
    const email = String(payload?.email || "").trim().toLowerCase();
    const password = String(payload?.password || "");
    const role = normalizeRole(payload?.role || "buyer");

    if (!name || !phone || !email || !password || !role) {
      throw new Error("எல்லா fields-யும் தேவை");
    }

    const exists = users.some(
      u => String(u.email || "").trim().toLowerCase() === email
    );

    if (exists) {
      throw new Error("இந்த email ஏற்கனவே register ஆகி இருக்கிறது");
    }

    const user = {
      id: makeId("USR"),
      name,
      phone,
      email,
      password,
      role,
      createdAt: new Date().toISOString(),
      status: "active"
    };

    users.unshift(user);
    saveAllUsers(users);
    return user;
  }

  function loginUser(email, password) {
    const user = findUserByEmail(email);

    if (!user) {
      throw new Error("User account கிடைக்கவில்லை");
    }

    if (String(user.password) !== String(password)) {
      throw new Error("Password தவறு");
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      status: user.status
    };

    setCurrentUser(sessionUser);
    return sessionUser;
  }

  function redirectByRole(role) {
    const r = normalizeRole(role);

    if (r === "admin") {
      window.location.href = "dashboard.html";
      return;
    }

    if (r === "broker") {
      window.location.href = "crm.html";
      return;
    }

    if (r === "seller") {
      window.location.href = "seller.html";
      return;
    }

    if (r === "buyer") {
      window.location.href = "buyer.html";
      return;
    }

    window.location.href = "index.html";
  }

  function ensureDemoUsers() {
    const users = getAllUsers();

    const demoUsers = [
      {
        id: makeId("USR"),
        name: "MEI Admin",
        phone: "9999999999",
        email: "admin@mei.com",
        password: "123456",
        role: "admin",
        createdAt: new Date().toISOString(),
        status: "active"
      },
      {
        id: makeId("USR"),
        name: "Raj Broker",
        phone: "9888888888",
        email: "broker@mei.com",
        password: "123456",
        role: "broker",
        createdAt: new Date().toISOString(),
        status: "active"
      },
      {
        id: makeId("USR"),
        name: "Lavanya Seller",
        phone: "9777777777",
        email: "seller@mei.com",
        password: "123456",
        role: "seller",
        createdAt: new Date().toISOString(),
        status: "active"
      },
      {
        id: makeId("USR"),
        name: "Arun Buyer",
        phone: "9666666666",
        email: "buyer@mei.com",
        password: "123456",
        role: "buyer",
        createdAt: new Date().toISOString(),
        status: "active"
      }
    ];

    const existingEmails = new Set(
      users.map(u => String(u.email || "").trim().toLowerCase())
    );

    let changed = false;

    for (const demo of demoUsers) {
      if (!existingEmails.has(demo.email.toLowerCase())) {
        users.unshift(demo);
        changed = true;
      }
    }

    if (changed) {
      saveAllUsers(users);
    }
  }

  function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "login.html";
      return null;
    }
    return user;
  }

  function requireRole(allowedRoles = []) {
    const user = requireAuth();
    if (!user) return null;

    const allowed = (allowedRoles || []).map(normalizeRole);
    if (!allowed.includes(normalizeRole(user.role))) {
      redirectByRole(user.role);
      return null;
    }
    return user;
  }

  function bindRegister() {
    const form = document.getElementById("registerForm");
    if (!form) return;

    form.addEventListener("submit", e => {
      e.preventDefault();

      const payload = {
        name: document.getElementById("regName")?.value.trim() || "",
        phone: document.getElementById("regPhone")?.value.trim() || "",
        email: document.getElementById("regEmail")?.value.trim() || "",
        password: document.getElementById("regPassword")?.value || "",
        role: document.getElementById("regRole")?.value || ""
      };

      if (!payload.name || !payload.phone || !payload.email || !payload.password || !payload.role) {
        alert("எல்லா fields-யும் fill பண்ணுங்கள்");
        return;
      }

      if (payload.password.length < 6) {
        alert("Password குறைந்தது 6 characters இருக்க வேண்டும்");
        return;
      }

      try {
        const user = registerUser(payload);

        setCurrentUser({
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          status: user.status
        });

        alert("Registration success");
        redirectByRole(user.role);
      } catch (err) {
        alert(err.message || "Registration failed");
      }
    });
  }

  function bindLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", e => {
      e.preventDefault();

      const email = document.getElementById("loginEmail")?.value.trim() || "";
      const password = document.getElementById("loginPassword")?.value || "";

      if (!email || !password) {
        alert("Email and password enter பண்ணுங்கள்");
        return;
      }

      try {
        const user = loginUser(email, password);
        alert("Login success");
        redirectByRole(user.role);
      } catch (err) {
        alert(err.message || "Login failed");
      }
    });
  }

  function autoRedirectIfLoggedIn() {
    const user = getCurrentUser();
    const page = (location.pathname.split("/").pop() || "").toLowerCase();

    if (!user) return;

    if (page === "login.html" || page === "register.html" || page === "") {
      redirectByRole(user.role);
    }
  }

  ensureDemoUsers();
  bindRegister();
  bindLogin();
  autoRedirectIfLoggedIn();

  window.getAllUsers = getAllUsers;
  window.saveAllUsers = saveAllUsers;
  window.getCurrentUser = getCurrentUser;
  window.setCurrentUser = setCurrentUser;
  window.loginUser = loginUser;
  window.registerUser = registerUser;
  window.logoutUser = logoutUser;
  window.requireAuth = requireAuth;
  window.requireRole = requireRole;
  window.redirectByRole = redirectByRole;
})();

