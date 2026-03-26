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

  function togglePassword(inputId, btnId) {
    const input = $(inputId);
    const btn = $(btnId);
    if (!input || !btn) return;

    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    btn.textContent = isPassword ? "🙈" : "👁";
    btn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
  }

  function validateForm(data) {
    if (!data.name) {
      return { ok: false, message: "Full name is required." };
    }
    if (!data.email) {
      return { ok: false, message: "Email is required." };
    }
    if (!data.password) {
      return { ok: false, message: "Password is required." };
    }
    if (data.password.length < 4) {
      return { ok: false, message: "Password must be at least 4 characters." };
    }
    if (!data.confirmPassword) {
      return { ok: false, message: "Confirm password is required." };
    }
    if (data.password !== data.confirmPassword) {
      return { ok: false, message: "Passwords do not match." };
    }
    if (!$("agreeTerms")?.checked) {
      return { ok: false, message: "Please agree to the basic account rules." };
    }
    return { ok: true };
  }

  function handleSubmit(e) {
    e.preventDefault();

    const data = {
      name: ($("name")?.value || "").trim(),
      email: ($("email")?.value || "").trim(),
      role: ($("role")?.value || "buyer").trim(),
      password: $("password")?.value || "",
      confirmPassword: $("confirmPassword")?.value || ""
    };

    const registerBtn = $("registerBtn");

    const valid = validateForm(data);
    if (!valid.ok) {
      setMessage(valid.message, "error");
      return;
    }

    if (registerBtn) registerBtn.disabled = true;
    setMessage("Creating account...", "success");

    try {
      const result = registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role
      });

      if (!result || !result.ok) {
        setMessage(result?.message || "Registration failed.", "error");
        if (registerBtn) registerBtn.disabled = false;
        return;
      }

      setMessage("Account created. Logging you in...", "success");

      const loginResult = loginUser(data.email, data.password);

      if (!loginResult || !loginResult.ok) {
        setMessage("Account created. Please login manually.", "success");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 800);
        return;
      }

      setTimeout(() => {
        const role = loginResult.user?.role || "buyer";
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
      console.error("Register submit error:", err);
      setMessage("Something went wrong. Please try again.", "error");
      if (registerBtn) registerBtn.disabled = false;
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

    const form = $("registerForm");
    const togglePasswordBtn = $("togglePassword");
    const toggleConfirmBtn = $("toggleConfirmPassword");

    if (form) form.addEventListener("submit", handleSubmit);

    if (togglePasswordBtn) {
      togglePasswordBtn.addEventListener("click", () => {
        togglePassword("password", "togglePassword");
      });
    }

    if (toggleConfirmBtn) {
      toggleConfirmBtn.addEventListener("click", () => {
        togglePassword("confirmPassword", "toggleConfirmPassword");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

