(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function setMessage(message, type = "") {
    const msg = $("msg");
    if (!msg) return;
    msg.textContent = message || "";
    msg.classList.remove("success", "error");
    if (type) msg.classList.add(type);
  }

  function togglePasswordVisibility() {
    const input = $("password");
    const btn = $("togglePassword");
    if (!input || !btn) return;

    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    btn.textContent = isPassword ? "🙈" : "👁";
    btn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
  }

  function fillAdminDemo() {
    $("email").value = "admin@mei.com";
    $("password").value = "admin123";
    setMessage("Demo admin credentials filled.", "success");
  }

  function validateForm(email, password) {
    if (!email) {
      return { ok: false, message: "Email is required." };
    }
    if (!password) {
      return { ok: false, message: "Password is required." };
    }
    return { ok: true };
  }

  function handleSubmit(e) {
    e.preventDefault();

    const email = ($("email")?.value || "").trim();
    const password = $("password")?.value || "";
    const loginBtn = $("loginBtn");

    const valid = validateForm(email, password);
    if (!valid.ok) {
      setMessage(valid.message, "error");
      return;
    }

    if (loginBtn) loginBtn.disabled = true;
    setMessage("Logging in...", "success");

    try {
      const result = loginUser(email, password);

      if (!result || !result.ok) {
        setMessage(result?.message || "Login failed.", "error");
        if (loginBtn) loginBtn.disabled = false;
        return;
      }

      setMessage("Login successful. Redirecting...", "success");

      const role = result.user?.role || "buyer";

      setTimeout(() => {
        if (typeof redirectByRole === "function") {
          redirectByRole(role);
        } else {
          if (role === "admin") window.location.href = "dashboard.html";
          else if (role === "buyer") window.location.href = "buyer.html";
          else if (role === "seller") window.location.href = "seller-dashboard.html";
          else if (role === "broker") window.location.href = "broker-dashboard.html";
          else window.location.href = "index.html";
        }
      }, 500);

    } catch (err) {
      console.error("Login submit error:", err);
      setMessage("Something went wrong. Please try again.", "error");
      if (loginBtn) loginBtn.disabled = false;
    }
  }

  function redirectIfAlreadyLoggedIn() {
    try {
      const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
      if (!user) return;

      if (typeof redirectByRole === "function") {
        redirectByRole(user.role);
        return;
      }

      const role = user.role || "buyer";
      if (role === "admin") window.location.href = "dashboard.html";
      else if (role === "buyer") window.location.href = "buyer.html";
      else if (role === "seller") window.location.href = "seller-dashboard.html";
      else if (role === "broker") window.location.href = "broker-dashboard.html";
      else window.location.href = "index.html";
    } catch (err) {
      console.error("redirectIfAlreadyLoggedIn error:", err);
    }
  }

  function init() {
    redirectIfAlreadyLoggedIn();

    const form = $("loginForm");
    const toggleBtn = $("togglePassword");
    const fillAdminBtn = $("fillAdminBtn");

    if (form) form.addEventListener("submit", handleSubmit);
    if (toggleBtn) toggleBtn.addEventListener("click", togglePasswordVisibility);
    if (fillAdminBtn) fillAdminBtn.addEventListener("click", fillAdminDemo);
  }

  document.addEventListener("DOMContentLoaded", init);
})();

